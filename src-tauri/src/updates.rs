use serde_json::{json, Value};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Default)]
pub struct UpdateState(tauri::async_runtime::Mutex<Option<(Update, Option<Vec<u8>>)>>);

fn config() -> Value {
    serde_json::from_str(include_str!("../../release/update.json")).expect("Invalid release configuration")
}

pub async fn operation(app: &tauri::AppHandle, op: &str) -> Result<Value, String> {
    let cfg = config();
    let repository = cfg["repository"].as_str().unwrap_or("");
    let public_key = cfg["pubkey"].as_str().unwrap_or("");
    if op == "update-info" {
        return Ok(json!({"currentVersion":app.package_info().version.to_string(),"configured":!repository.is_empty()&&!public_key.is_empty(),"repository":repository}));
    }
    if repository.is_empty() || public_key.is_empty() {
        return Err("此构建尚未配置更新发布源".into());
    }
    let state = app.state::<UpdateState>();
    let mut cache = state.0.lock().await;
    match op {
        "update-check" => {
            let endpoint = format!("https://github.com/{repository}/releases/latest/download/latest.json");
            let mut builder = app.updater_builder().pubkey(public_key)
                .endpoints(vec![endpoint.parse().map_err(|_| "Invalid update endpoint")?])
                .map_err(|e| e.to_string())?.timeout(Duration::from_secs(30));
            if std::env::var("METABOT_NATIVE_TEST").as_deref() == Ok("updater") {
                builder = builder.version_comparator(|_, _| true);
            }
            let updater = builder.build().map_err(|e| e.to_string())?;
            let update = updater.check().await.map_err(|e| format!("检查更新失败：{e}"))?;
            if let Some(update) = update {
                let url = &update.download_url;
                let prefix = format!("/{repository}/releases/download/");
                if url.scheme() != "https" || url.host_str() != Some("github.com") || !url.path().starts_with(&prefix) {
                    return Err("更新包不属于已配置的发布仓库".into());
                }
                let result = json!({"version":update.version,"notes":update.body,"currentVersion":update.current_version});
                *cache = Some((update, None));
                Ok(result)
            } else {
                *cache = None;
                Ok(Value::Null)
            }
        }
        "update-download" => {
            let (update, bytes) = cache.as_mut().ok_or("请先检查更新")?;
            if bytes.is_none() {
                let mut received = 0u64;
                let mut last = Instant::now() - Duration::from_secs(1);
                let data = update.download(|chunk, total| {
                    received += chunk as u64;
                    if last.elapsed() >= Duration::from_millis(150) {
                        last = Instant::now();
                        let _ = app.emit_to("ball", "update:progress", json!({"received":received,"total":total}));
                    }
                }, || {}).await.map_err(|e| format!("下载或签名验证失败：{e}"))?;
                *bytes = Some(data);
            }
            Ok(json!({"verified":true,"bytes":bytes.as_ref().map(Vec::len)}))
        }
        "update-install" => {
            if std::env::var("METABOT_NATIVE_TEST").is_ok() {
                return Err("测试模式禁止执行安装器".into());
            }
            let (update, bytes) = cache.as_ref().ok_or("请先检查更新")?;
            let bytes = bytes.as_ref().ok_or("请先下载并验证更新包")?;
            // Only bytes verified by the official updater are ever passed to its installer.
            update.install(bytes).map_err(|e| format!("安装启动失败：{e}"))?;
            Ok(json!({"ok":true}))
        }
        _ => Err("Unknown update operation".into()),
    }
}
