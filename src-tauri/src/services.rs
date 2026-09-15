use notify::{RecursiveMode, Watcher};
use serde_json::{json, Value};
use std::os::windows::process::CommandExt;
use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{mpsc, Mutex},
    time::{Duration, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};

pub fn home() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .expect("Windows user profile")
}
pub fn data_home() -> PathBuf {
    std::env::var_os("METABOT_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| home().join(".metabot"))
}
pub fn read_json(file: &Path) -> Value {
    fs::read(file)
        .ok()
        .and_then(|v| serde_json::from_slice(&v).ok())
        .unwrap_or(Value::Null)
}
pub fn config() -> Value {
    read_json(&data_home().join("config.json"))
}
pub fn codex_home() -> PathBuf {
    config()["codex"]["codexHome"]
        .as_str()
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("CODEX_HOME").map(PathBuf::from))
        .unwrap_or_else(|| home().join(".codex"))
}
pub fn executable() -> PathBuf {
    if let Some(value) = config()["codex"]["executable"]
        .as_str()
        .filter(|v| !v.trim().is_empty() && *v != "codex")
    {
        return value.into();
    }
    if let Some(value) = std::env::var_os("CODEX_CLI_PATH").filter(|v| Path::new(v).exists()) {
        return value.into();
    }
    let bin = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| home().join("AppData/Local"))
        .join("OpenAI/Codex/bin");
    let mut files: Vec<_> = fs::read_dir(bin)
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path().join("codex.exe"))
        .filter(|p| p.is_file())
        .collect();
    files.sort_by_key(|p| std::cmp::Reverse(fs::metadata(p).and_then(|m| m.modified()).ok()));
    files
        .into_iter()
        .next()
        .or_else(|| std::env::var_os("PATH").and_then(|v| std::env::split_paths(&v).map(|p| p.join("codex.exe")).find(|p| p.is_file())))
        .unwrap_or_else(|| "codex.exe".into())
}

// Deliberately excludes auth files, task titles, identifiers and raw log/errors.
pub fn environment() -> Value {
    let exe = executable();
    let folder = codex_home();
    json!({"executable":exe,"codexHome":folder,
        "executableFound":exe.is_file(),"homeExists":folder.is_dir(),
        "homeReadable":fs::read_dir(&folder).is_ok(),
        "sessionsPresent":folder.join("sessions").is_dir(),
        "platform":"windows-x64","version":env!("CARGO_PKG_VERSION")})
}

pub fn validate_paths(value: &Value) -> Result<Value, String> {
    for key in ["executable", "codexHome"] {
        let text = value[key].as_str().ok_or("路径必须是文本")?.trim();
        if text.is_empty() { continue; }
        let path = Path::new(text);
        if !path.is_absolute() { return Err("请选择绝对路径".into()); }
        if key == "executable" {
            if !path.is_file() || !path.extension().is_some_and(|v| v.eq_ignore_ascii_case("exe")) {
                return Err("请选择可信 Codex 安装目录内的 codex.exe，不是桌面快捷方式".into());
            }
        } else if fs::read_dir(path).is_err() {
            return Err("Codex 数据目录不存在或不可读取；请先打开 Codex 完成初始化".into());
        }
    }
    Ok(json!(true))
}

pub fn pick_path(kind: &str) -> Result<Value, String> {
    let dialog = rfd::FileDialog::new().set_title("选择可信的 Codex 安装文件或数据目录");
    let selected = match kind {
        "executable" => dialog.add_filter("Codex executable", &["exe"]).pick_file(),
        "codexHome" => dialog.pick_folder(),
        _ => return Err("Invalid path kind".into()),
    };
    Ok(json!(selected))
}
pub fn store(name: &str, value: &Value) -> Result<Value, String> {
    if ![
        "config.json",
        "task-notices.json",
        "completion-inbox.json",
        "companion.json",
        "window-state.json",
        "cache/snapshot.json",
    ]
    .contains(&name)
    {
        return Err("Invalid storage key".into());
    }
    let file = data_home().join(name);
    fs::create_dir_all(file.parent().unwrap()).map_err(|e| e.to_string())?;
    let tmp = file.with_extension("native.tmp");
    let mut output = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    output
        .write_all(&serde_json::to_vec(value).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    output.sync_all().map_err(|e| e.to_string())?;
    fs::rename(tmp, file).map_err(|e| e.to_string())?;
    Ok(json!(true))
}

pub struct Rpc {
    child: Child,
    rx: mpsc::Receiver<Value>,
    next: u64,
}
impl Drop for Rpc {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}
impl Rpc {
    fn start(app: &AppHandle) -> Result<Self, String> {
        if fs::read_dir(codex_home()).is_err() {
            return Err("Codex 数据目录不存在或不可读取。请先在 Codex 中完成初始化，或在连接向导中修正目录。".into());
        }
        let mut child = Command::new(executable())
            .arg("app-server")
            .current_dir(codex_home())
            .env("CODEX_HOME", codex_home())
            .creation_flags(0x08000000)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Codex launch: {e}"))?;
        let stdout = child.stdout.take().unwrap();
        let (tx, rx) = mpsc::channel();
        let app = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if let Ok(value) = serde_json::from_str::<Value>(&line) {
                    if value.get("method").is_some() {
                        let _ = app.emit_to("ball", "native:codex", value);
                    } else if tx.send(value).is_err() {
                        break;
                    }
                }
            }
        });
        let mut rpc = Self { child, rx, next: 0 };
        rpc.request(
            "initialize",
            json!({"clientInfo":{"name":"meta-bot","title":"Meta Bot","version":"0.2.0"}}),
        )?;
        writeln!(
            rpc.child.stdin.as_mut().unwrap(),
            "{}",
            json!({"method":"initialized","params":{}})
        )
        .map_err(|e| e.to_string())?;
        Ok(rpc)
    }
    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        self.next += 1;
        let id = self.next;
        writeln!(
            self.child.stdin.as_mut().ok_or("Codex closed")?,
            "{}",
            json!({"id":id,"method":method,"params":params})
        )
        .map_err(|e| e.to_string())?;
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        loop {
            let message = self
                .rx
                .recv_timeout(deadline.saturating_duration_since(std::time::Instant::now()))
                .map_err(|e| format!("Codex {method}: {e}"))?;
            if message["id"].as_u64() != Some(id) {
                continue;
            }
            if !message["error"].is_null() {
                return Err(message["error"].to_string());
            }
            return Ok(message["result"].clone());
        }
    }
}

#[derive(Default)]
struct LogCursor {
    offset: u64,
    observed_size: u64,
    modified: u64,
    partial: Vec<u8>,
    metadata: Value,
    seeded: bool,
    search_end: u64,
    search_suffix: Vec<u8>,
}
#[derive(Default)]
pub struct Services {
    rpc: Mutex<Option<Rpc>>,
    logs: Mutex<HashMap<PathBuf, LogCursor>>,
    watcher: Mutex<Option<notify::RecommendedWatcher>>,
}
impl Services {
    pub fn stop(&self) {
        self.rpc.lock().unwrap().take();
        self.watcher.lock().unwrap().take();
        self.logs.lock().unwrap().clear();
    }
    pub fn rpc(&self, app: &AppHandle, method: &str, params: Value) -> Result<Value, String> {
        if !["thread/list", "thread/read"].contains(&method) {
            return Err("Read-only RPC method required".into());
        }
        let mut slot = self.rpc.lock().unwrap();
        if slot.is_none() {
            *slot = Some(Rpc::start(app)?);
        }
        let result = slot.as_mut().unwrap().request(method, params);
        if result.is_err() {
            slot.take();
        }
        result
    }
    pub fn watch(&self, app: &AppHandle) -> Result<Value, String> {
        let mut slot = self.watcher.lock().unwrap();
        if slot.is_some() {
            return Ok(json!(true));
        }
        let app = app.clone();
        let mut watcher =
            notify::recommended_watcher(move |event: Result<notify::Event, notify::Error>| {
                if let Ok(event) = event {
                    if !matches!(event.kind, notify::EventKind::Access(_)) {
                        let paths: Vec<_> = event
                            .paths
                            .iter()
                            .filter(|p| p.extension().is_some_and(|e| e == "jsonl"))
                            .map(|p| p.to_string_lossy().to_string())
                            .collect();
                        if !paths.is_empty() {
                            let _ = app.emit_to("ball", "native:logs", paths);
                        }
                    }
                }
            })
            .map_err(|e| e.to_string())?;
        watcher
            .watch(&codex_home().join("sessions"), RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;
        *slot = Some(watcher);
        Ok(json!(true))
    }
    pub fn log(&self, file: &str, restart: bool) -> Result<Value, String> {
        let path = fs::canonicalize(file).map_err(|e| e.to_string())?;
        let base = fs::canonicalize(codex_home()).map_err(|e| e.to_string())?;
        if !path.starts_with(base) || path.extension().is_none_or(|e| e != "jsonl") {
            return Err("Log outside Codex home".into());
        }
        let mut handle = fs::File::open(&path).map_err(|e| e.to_string())?;
        let stat = handle.metadata().map_err(|e| e.to_string())?;
        let modified = stat
            .modified()
            .unwrap_or(UNIX_EPOCH)
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let mut readers = self.logs.lock().unwrap();
        let cursor = readers.entry(path).or_default();
        let reset = restart || cursor.modified == 0
            || stat.len() < cursor.offset.max(cursor.search_end)
            || (cursor.seeded && stat.len() == cursor.offset && modified != cursor.modified);
        let growth = stat.len() > cursor.offset;
        let appended = !reset && stat.len() > cursor.observed_size;
        if reset {
            *cursor = LogCursor::default();
            cursor.search_end = stat.len();
        }
        cursor.observed_size = stat.len();
        if cursor.metadata["id"].is_null() {
            let mut line = Vec::new();
            BufReader::new((&mut handle).take(512 * 1024))
                .read_until(b'\n', &mut line)
                .map_err(|e| e.to_string())?;
            cursor.metadata = serde_json::from_slice::<Value>(&line)
                .ok()
                .map(|v| json!({"id":v["payload"]["id"],"cwd":v["payload"]["cwd"]}))
                .unwrap_or(Value::Null);
        }
        let metadata = cursor.metadata.clone();
        // Search backward with a per-call budget, never a total-history cutoff.
        // Once found, replay the latest lifecycle forward to the current end.
        let mut budget = 8 * 1024 * 1024u64;
        while !cursor.seeded && cursor.search_end > 0 && budget > 0 {
            let length = cursor.search_end.min(256 * 1024).min(budget);
            let start = cursor.search_end - length;
            handle.seek(SeekFrom::Start(start)).map_err(|e| e.to_string())?;
            let mut chunk = vec![0; length as usize];
            handle.read_exact(&mut chunk).map_err(|e| e.to_string())?;
            chunk.extend(std::mem::take(&mut cursor.search_suffix));
            let first = if start > 0 { chunk.iter().position(|b| *b == b'\n').map(|i| i + 1).unwrap_or(chunk.len()) } else { 0 };
            let mut position = first;
            for line in chunk[first..].split(|b| *b == b'\n') {
                if let Ok(v) = serde_json::from_slice::<Value>(line) {
                    if v["type"] == "event_msg" && ["task_started", "task_complete", "turn_aborted", "task_failed"].contains(&v["payload"]["type"].as_str().unwrap_or("")) {
                        cursor.offset = start + position as u64;
                        cursor.seeded = true;
                    }
                }
                position += line.len() + 1;
            }
            cursor.search_suffix = chunk[..first].to_vec();
            if cursor.search_suffix.len() > 16 * 1024 * 1024 {
                cursor.search_suffix.clear();
            }
            cursor.search_end = start;
            budget -= length;
        }
        if cursor.search_end == 0 && !cursor.seeded {
            cursor.seeded = true;
        }
        if !cursor.seeded {
            cursor.modified = modified;
            return Ok(json!({"reset":reset,"entries":[],"metadata":metadata,"modified":modified,"growth":growth,"appended":appended,"pending":true}));
        }
        cursor.search_suffix.clear();
        let start = cursor.offset;
        handle
            .seek(SeekFrom::Start(start))
            .map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        handle
            .take(8 * 1024 * 1024)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        cursor.offset = start + bytes.len() as u64;
        cursor.modified = modified;
        let mut joined = std::mem::take(&mut cursor.partial);
        joined.extend(bytes);
        let last = joined
            .iter()
            .rposition(|b| *b == b'\n')
            .map(|i| i + 1)
            .unwrap_or(0);
        cursor.partial = joined[last..].to_vec();
        if cursor.partial.len() > 16 * 1024 * 1024 {
            cursor.partial.clear();
        }
        let mut latest_event_at = Value::Null;
        let entries: Vec<Value> = joined[..last].split(|b| *b == b'\n').filter_map(|line| serde_json::from_slice::<Value>(line).ok()).filter_map(|v| {
            if v["timestamp"].is_string() { latest_event_at = v["timestamp"].clone(); }
            let p = &v["payload"]; let kind = p["type"].as_str().unwrap_or("");
            if v["type"] == "event_msg" && ["task_started","task_complete","turn_aborted","task_failed","request_user_input","approval_requested","user_input_received","approval_resolved"].contains(&kind) { return Some(v); }
            if v["type"] == "response_item" && ["function_call","custom_tool_call","function_call_output","custom_tool_call_output"].contains(&kind) { return Some(json!({"type":"response_item","timestamp":v["timestamp"],"payload":{"type":kind,"name":p["name"],"call_id":p["call_id"]}})); }
            None
        }).collect();
        Ok(
            json!({"reset":reset,"entries":entries,"metadata":metadata,"modified":modified,"growth":growth,"appended":appended,"latestEventAt":latest_event_at,"pending":cursor.offset < stat.len()}),
        )
    }
}

pub fn workbench() -> Result<Value, String> {
    let cfg = config();
    let mut base = cfg["workbench"]["baseUrl"]
        .as_str()
        .unwrap_or("")
        .to_owned();
    if base.is_empty() {
        let folder = cfg["workbench"]["dataHome"]
            .as_str()
            .map(PathBuf::from)
            .unwrap_or_else(|| home().join(".metacode"));
        if let Some(port) = read_json(&folder.join("desktop/runtime.json"))["port"].as_u64() {
            base = format!("http://127.0.0.1:{port}");
        }
    }
    let url = reqwest::Url::parse(&base).map_err(|_| "Workbench is not paired")?;
    if !["http", "https"].contains(&url.scheme()) {
        return Err("Invalid workbench URL".into());
    }
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;
    let get = |part: &str| -> Result<Value, String> {
        let mut request = client.get(url.join(part).map_err(|e| e.to_string())?);
        if let Some(token) = cfg["workbench"]["token"].as_str() {
            request = request.header("X-MetaCode-Api-Token", token);
        }
        request
            .send()
            .and_then(|r| r.error_for_status())
            .and_then(|r| r.json())
            .map_err(|e| e.to_string())
    };
    Ok(json!({"sessions":get("/api/sessions")?,"bootstrap":get("/api/bootstrap")?,"baseUrl":base}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_storage_and_incremental_logs_are_scoped_and_atomic() {
        let folder = std::env::current_dir()
            .unwrap()
            .join("../.runtime")
            .join(format!("rust-unit-{}", std::process::id()));
        fs::create_dir_all(folder.join("sessions")).unwrap();
        std::env::set_var("METABOT_HOME", &folder);
        std::env::set_var("CODEX_HOME", &folder);
        assert!(store("../outside.json", &json!({})).is_err());
        store(
            "config.json",
            &json!({"notifications":{"retainCompletions":false}}),
        )
        .unwrap();
        store(
            "config.json",
            &json!({"notifications":{"retainCompletions":true}}),
        )
        .unwrap();
        assert_eq!(config()["notifications"]["retainCompletions"], true);
        let file = folder.join("sessions/log.jsonl");
        fs::write(&file, b"{\"type\":\"session_meta\",\"payload\":{\"id\":\"a\",\"cwd\":\"project\"}}\n{\"type\":\"event_msg\",\"payload\":{\"type\":\"task_started\",\"turn_id\":\"one\"}}\n{\"type\":").unwrap();
        let services = Services::default();
        let first = services.log(file.to_str().unwrap(), false).unwrap();
        assert_eq!(first["metadata"]["id"], "a");
        assert_eq!(first["entries"].as_array().unwrap().len(), 1);
        assert_eq!(first["appended"], false);
        let original_time = fs::metadata(&file).unwrap().modified().unwrap();
        let mut output = fs::OpenOptions::new().append(true).open(&file).unwrap();
        output
            .write_all(
                b"\"event_msg\",\"payload\":{\"type\":\"task_complete\",\"turn_id\":\"one\"}}\n",
            )
            .unwrap();
        drop(output);
        fs::OpenOptions::new().write(true).open(&file).unwrap().set_times(fs::FileTimes::new().set_modified(original_time)).unwrap();
        let second = services.log(file.to_str().unwrap(), false).unwrap();
        assert_eq!(second["modified"], first["modified"]);
        assert_eq!(second["appended"], true);
        assert_eq!(second["reset"], false);
        assert_eq!(second["entries"][0]["payload"]["type"], "task_complete");
        assert!(services
            .log(file.with_extension("txt").to_str().unwrap(), false)
            .is_err());
        fs::write(&file,b"{\"type\":\"event_msg\",\"payload\":{\"type\":\"task_started\",\"turn_id\":\"two\"}}\n").unwrap();
        let truncated = services.log(file.to_str().unwrap(), false).unwrap();
        assert_eq!(truncated["reset"], true);
        assert_eq!(truncated["entries"][0]["payload"]["turn_id"], "two");
        let replay = services.log(file.to_str().unwrap(), true).unwrap();
        assert_eq!(replay["reset"], true);
        assert_eq!(replay["appended"], false);
        assert_eq!(replay["entries"][0]["payload"]["turn_id"], "two");

        let mut large = b"{\"type\":\"event_msg\",\"payload\":{\"type\":\"task_started\",\"turn_id\":\"long\"}}\n".to_vec();
        large.extend(vec![b'\n'; 10 * 1024 * 1024]);
        fs::write(&file, large).unwrap();
        let first_chunk = services.log(file.to_str().unwrap(), true).unwrap();
        assert_eq!(first_chunk["pending"], true);
        let recovered = services.log(file.to_str().unwrap(), false).unwrap();
        assert_eq!(recovered["entries"][0]["payload"]["turn_id"], "long");
        assert_eq!(recovered["appended"], false);
        let final_chunk = services.log(file.to_str().unwrap(), false).unwrap();
        assert_eq!(final_chunk["reset"], false);
        assert_eq!(final_chunk["pending"], false);
        assert_eq!(final_chunk["appended"], false);
        assert!(validate_paths(&json!({"executable":"","codexHome":""})).is_ok());
        assert!(validate_paths(&json!({"executable":"relative.exe","codexHome":""})).is_err());
        assert!(validate_paths(&json!({"executable":"","codexHome":folder.join("missing")})).is_err());
        let unicode = folder.join("中文 directory");
        fs::create_dir_all(&unicode).unwrap();
        let fake_exe = unicode.join("codex.exe");
        fs::write(&fake_exe, b"fixture only; never executed").unwrap();
        assert!(validate_paths(&json!({"executable":fake_exe,"codexHome":unicode})).is_ok());
        store("config.json", &json!({"codex":{"executable":fake_exe,"codexHome":unicode}})).unwrap();
        assert_eq!(environment()["homeReadable"],true);
        assert_eq!(environment()["executableFound"],true);
        services.stop();
        assert!(services.logs.lock().unwrap().is_empty());
    }
}
