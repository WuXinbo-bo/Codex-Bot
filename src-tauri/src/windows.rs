use serde_json::{json, Value};
use std::sync::OnceLock;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};
use windows_sys::Win32::{
    Foundation::*,
    Graphics::Gdi::*,
    System::{DataExchange::*, LibraryLoader::GetModuleHandleW, Memory::*},
    UI::{Shell::ShellExecuteW, WindowsAndMessaging::*},
};
static APP: OnceLock<AppHandle> = OnceLock::new();

pub struct Instance(HANDLE);
impl Drop for Instance {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}
pub fn single_instance() -> Option<Instance> {
    use std::hash::{Hash, Hasher};
    let mut hash = std::collections::hash_map::DefaultHasher::new();
    crate::services::data_home().hash(&mut hash);
    let name: Vec<u16> = format!("Local\\MetaBot-{:x}", hash.finish())
        .encode_utf16()
        .chain(Some(0))
        .collect();
    unsafe {
        let handle =
            windows_sys::Win32::System::Threading::CreateMutexW(std::ptr::null(), 0, name.as_ptr());
        if handle.is_null() {
            return None;
        }
        if GetLastError() == ERROR_ALREADY_EXISTS {
            CloseHandle(handle);
            return None;
        }
        Some(Instance(handle))
    }
}

pub fn geometry(app: &AppHandle) -> Result<Value, String> {
    let ball = app.get_webview_window("ball").ok_or("Missing ball")?;
    let position = ball.outer_position().map_err(|e| e.to_string())?;
    let size = ball.outer_size().map_err(|e| e.to_string())?;
    let scale = ball.scale_factor().map_err(|e| e.to_string())?;
    let mut area = json!({"x":0,"y":0,"width":1920,"height":1080});
    unsafe {
        let monitor = MonitorFromPoint(
            POINT {
                x: position.x + size.width as i32 / 2,
                y: position.y + size.height as i32 / 2,
            },
            MONITOR_DEFAULTTONEAREST,
        );
        let mut info: MONITORINFO = std::mem::zeroed();
        info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
        if GetMonitorInfoW(monitor, &mut info) != 0 {
            let r = info.rcWork;
            area = json!({"x":r.left,"y":r.top,"width":r.right-r.left,"height":r.bottom-r.top});
        }
    }
    Ok(
        json!({"x":position.x,"y":position.y,"width":size.width,"height":size.height,"scale":scale,"area":area}),
    )
}

pub fn window(app: &AppHandle, args: &Value) -> Result<Value, String> {
    let label = args["label"].as_str().ok_or("Missing window label")?;
    if !["ball", "panel", "completions", "toast", "menu"].contains(&label) {
        return Err("Invalid window".into());
    }
    let win = app.get_webview_window(label).ok_or("Window not found")?;
    match args["action"].as_str().unwrap_or("") {
        "raise" => unsafe {
            SetWindowPos(win.hwnd().map_err(|e| e.to_string())?.0 as HWND, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        },
        "hide" => win.hide().map_err(|e| e.to_string())?,
        "show" => {
            win.set_focusable(args["focus"] == true)
                .map_err(|e| e.to_string())?;
            win.show().map_err(|e| e.to_string())?;
            if args["focus"] == true {
                win.set_focus().map_err(|e| e.to_string())?;
            }
        }
        "passthrough" => win
            .set_ignore_cursor_events(args["value"] == true)
            .map_err(|e| e.to_string())?,
        "bounds" => {
            let n = |name: &str| {
                args[name]
                    .as_f64()
                    .filter(|v| v.is_finite())
                    .ok_or_else(|| format!("Invalid {name}"))
            };
            let x = n("x")?.round() as i32;
            let y = n("y")?.round() as i32;
            if args.get("width").is_some() {
                let width = n("width")?.clamp(1.0, 4096.0).round() as u32;
                let height = n("height")?.clamp(1.0, 4096.0).round() as u32;
                // One native call prevents fractional-DPI size drift and activation.
                unsafe {
                    SetWindowPos(
                        win.hwnd().map_err(|e| e.to_string())?.0 as HWND,
                        std::ptr::null_mut(),
                        x,
                        y,
                        width as i32,
                        height as i32,
                        SWP_NOACTIVATE | SWP_NOZORDER,
                    );
                }
            } else {
                win.set_position(PhysicalPosition::new(x, y))
                    .map_err(|e| e.to_string())?;
            }
        }
        _ => return Err("Invalid window operation".into()),
    }
    if label == "ball" {
        geometry(app)
    } else {
        Ok(json!(true))
    }
}

unsafe extern "system" fn mouse(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let event = &*(lparam as *const MSLLHOOKSTRUCT);
        let kind = match wparam as u32 {
            WM_MOUSEMOVE => Some("move"),
            WM_LBUTTONDOWN => Some("down"),
            WM_LBUTTONUP => Some("up"),
            WM_RBUTTONDOWN => Some("right-down"),
            WM_RBUTTONUP => Some("right-up"),
            _ => None,
        };
        if let (Some(kind), Some(app)) = (kind, APP.get()) {
            // Never block the OS hook on IPC, disk access or webview rendering.
            if let Some(sender) = INPUT.get() {
                let _ = sender.send((kind, event.pt.x, event.pt.y));
            }
            let _ = app;
        }
    }
    CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
}
static INPUT: OnceLock<std::sync::mpsc::Sender<(&'static str, i32, i32)>> = OnceLock::new();
pub fn start_input(app: &AppHandle) {
    let _ = APP.set(app.clone());
    let (tx, rx) = std::sync::mpsc::channel();
    let _ = INPUT.set(tx);
    let app = app.clone();
    std::thread::spawn(move || {
        let mut last = std::time::Instant::now();
        for (kind, x, y) in rx {
            if kind == "move" && last.elapsed().as_millis() < 16 {
                continue;
            }
            if kind == "move" {
                last = std::time::Instant::now();
            }
            let _ = app.emit_to(
                "ball",
                "native:mouse",
                json!({"kind":kind,"x":x,"y":y,"button":if kind.starts_with("right") {2} else {1}}),
            );
        }
    });
    std::thread::spawn(|| unsafe {
        let hook = SetWindowsHookExW(
            WH_MOUSE_LL,
            Some(mouse),
            GetModuleHandleW(std::ptr::null()),
            0,
        );
        if hook.is_null() {
            if let Some(app) = APP.get() {
                let _ = app.emit_to(
                    "ball",
                    "native:input-error",
                    "Global mouse hook unavailable",
                );
            }
            return;
        }
        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
        UnhookWindowsHookEx(hook);
    });
}

pub fn open(url: &str) -> Result<Value, String> {
    let parsed = reqwest::Url::parse(url).map_err(|e| e.to_string())?;
    let valid_codex = parsed.scheme() == "codex"
        && parsed.host_str() == Some("threads")
        && parsed.query().is_none()
        && parsed.fragment().is_none()
        && parsed
            .path()
            .trim_start_matches('/')
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        && parsed.path().len() > 1;
    let valid_workbench = if ["http", "https"].contains(&parsed.scheme()) {
        let cfg = crate::services::config();
        let configured = cfg["workbench"]["webUrl"]
            .as_str()
            .or(cfg["workbench"]["baseUrl"].as_str())
            .and_then(|s| reqwest::Url::parse(s).ok());
        configured.is_some_and(|v| v.origin() == parsed.origin())
            || (parsed.host_str() == Some("127.0.0.1")
                && parsed.query_pairs().any(|(k, _)| k == "session"))
    } else {
        false
    };
    if !(valid_codex || valid_workbench) {
        return Err("Unsupported task target".into());
    }
    let wide: Vec<u16> = url.encode_utf16().chain(Some(0)).collect();
    let verb: Vec<u16> = "open".encode_utf16().chain(Some(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            wide.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    } as isize;
    if result <= 32 {
        Err(format!("System could not open task ({result})"))
    } else {
        Ok(json!({"ok":true}))
    }
}
pub fn clipboard(text: &str) -> Result<Value, String> {
    if text.len() > 16384 {
        return Err("Clipboard value too long".into());
    }
    let wide: Vec<u16> = text.encode_utf16().chain(Some(0)).collect();
    unsafe {
        if OpenClipboard(std::ptr::null_mut()) == 0 {
            return Err("Clipboard busy".into());
        }
        let memory = GlobalAlloc(GMEM_MOVEABLE, wide.len() * 2);
        if memory.is_null() {
            CloseClipboard();
            return Err("Clipboard allocation failed".into());
        }
        let data = GlobalLock(memory) as *mut u16;
        if data.is_null() {
            GlobalFree(memory);
            CloseClipboard();
            return Err("Clipboard lock failed".into());
        }
        std::ptr::copy_nonoverlapping(wide.as_ptr(), data, wide.len());
        GlobalUnlock(memory);
        EmptyClipboard();
        let result = SetClipboardData(13, memory);
        CloseClipboard();
        if result.is_null() {
            GlobalFree(memory);
            return Err("Clipboard write failed".into());
        }
    }
    Ok(json!(true))
}
