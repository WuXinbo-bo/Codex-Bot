#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod services;
mod windows;
mod updates;
use serde_json::{json, Value};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn client_request(
    window: tauri::WebviewWindow,
    action: String,
    id: u64,
    args: Value,
) -> Result<(), String> {
    if !["ball", "panel", "completions", "toast"].contains(&window.label()) {
        return Err("Invalid caller".into());
    }
    window
        .emit_to(
            "ball",
            "native:request",
            json!({"from":window.label(),"action":action,"id":id,"args":args}),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn native_op(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    op: String,
    args: Value,
) -> Result<Value, String> {
    if window.label() != "ball" {
        return Err("Coordinator only".into());
    }
    match op.as_str() {
        "update-info" | "update-check" | "update-download" | "update-install" => updates::operation(&app, &op).await,
        "geometry" => windows::geometry(&app),
        "inspect" => {
            let mut result = serde_json::Map::new();
            for label in ["ball", "panel", "completions", "toast"] {
                if let Some(win) = app.get_webview_window(label) {
                    let p = win.outer_position().map_err(|e| e.to_string())?;
                    let s = win.outer_size().map_err(|e| e.to_string())?;
                    result.insert(label.into(),json!({"x":p.x,"y":p.y,"width":s.width,"height":s.height,"visible":win.is_visible().unwrap_or(false)}));
                }
            }
            Ok(Value::Object(result))
        }
        "window" => windows::window(&app, &args),
        "publish" => {
            let target = args["target"].as_str().ok_or("Missing target")?;
            if !["ball", "panel", "completions", "toast"].contains(&target) {
                return Err("Invalid target".into());
            }
            app.emit_to(target, "bridge:event", &args)
                .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "reply" => {
            let target = args["target"].as_str().ok_or("Missing target")?;
            if !["ball", "panel", "completions", "toast"].contains(&target) {
                return Err("Invalid target".into());
            }
            app.emit_to(target, "bridge:reply", &args)
                .map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "quit" => {
            app.state::<services::Services>().stop();
            app.exit(0);
            Ok(Value::Null)
        }
        "input" => {
            windows::start_input(&app);
            Ok(Value::Null)
        }
        "bootstrap" => {
            let folder = services::data_home();
            let names = [
                "config.json",
                "task-notices.json",
                "completion-inbox.json",
                "window-state.json",
                "cache/snapshot.json",
            ];
            let mut stored = serde_json::Map::new();
            for name in names {
                stored.insert(name.into(), services::read_json(&folder.join(name)));
            }
            Ok(
                json!({"stored":stored,"executable":services::executable(),"codexHome":services::codex_home(),"testMode":std::env::var("METABOT_NATIVE_TEST").ok()}),
            )
        }
        _ => tauri::async_runtime::spawn_blocking(move || {
            let services = app.state::<services::Services>();
            match op.as_str() {
                "environment" => Ok(services::environment()),
                "validate-paths" => services::validate_paths(&args),
                "pick-path" => services::pick_path(args["kind"].as_str().unwrap_or("")),
                "rpc" => services.rpc(
                    &app,
                    args["method"].as_str().unwrap_or(""),
                    args["params"].clone(),
                ),
                "watch" => services.watch(&app),
                "log" => services.log(args["file"].as_str().unwrap_or(""), args["reset"].as_bool().unwrap_or(false)),
                "store" => services::store(args["name"].as_str().unwrap_or(""), &args["value"]),
                "stop-source" => {
                    services.stop();
                    Ok(json!(true))
                }
                "workbench" => services::workbench(),
                "open" => windows::open(args["url"].as_str().unwrap_or("")),
                "copy" => windows::clipboard(args["text"].as_str().unwrap_or("")),
                "test-report" if std::env::var("METABOT_NATIVE_TEST").is_ok() => {
                    services::store("cache/snapshot.json", &args)?;
                    Ok(json!(true))
                }
                _ => Err("Unknown native operation".into()),
            }
        })
        .await
        .map_err(|e| e.to_string())?,
    }
}
fn main() {
    let Some(_instance) = windows::single_instance() else {
        return;
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updates::UpdateState::default())
        .manage(services::Services::default())
        .invoke_handler(tauri::generate_handler![client_request, native_op])
        .setup(|app| {
            for (label, page, width, height) in [
                ("panel", "panel.html", 320.0, 190.0),
                ("completions", "completions.html", 320.0, 52.0),
                ("toast", "lifecycle-toast.html", 260.0, 82.0),
                ("ball", "index.html", 128.0, 128.0),
            ] {
                let win = WebviewWindowBuilder::new(app, label, WebviewUrl::App(page.into()))
                    .title("Meta Bot")
                    .inner_size(width, height)
                    .decorations(false)
                    .transparent(true)
                    .shadow(false)
                    .resizable(false)
                    .always_on_top(true)
                    .skip_taskbar(true)
                    .visible(false)
                    .focused(false)
                    .on_navigation(|url| {
                        url.host_str() == Some("tauri.localhost")
                            || (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
                    })
                    .build()?;
                win.on_window_event({
                    let app = app.handle().clone();
                    let label = label.to_owned();
                    move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let _ = app.emit_to("ball", "native:tray", "hide");
                        }
                        if label == "ball"
                            && matches!(
                                event,
                                tauri::WindowEvent::ScaleFactorChanged { .. }
                                    | tauri::WindowEvent::Moved(_)
                            )
                        {
                            let _ = app.emit_to("ball", "native:geometry", ());
                        }
                    }
                });
            }
            let menu = tauri::menu::Menu::with_items(
                app,
                &[
                    &tauri::menu::MenuItem::with_id(app, "show", "Show tasks", true, None::<&str>)?,
                    &tauri::menu::MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?,
                    &tauri::menu::MenuItem::with_id(
                        app,
                        "quit",
                        "Quit Meta Bot",
                        true,
                        None::<&str>,
                    )?,
                ],
            )?;
            let mut pixels = vec![0u8; 32 * 32 * 4];
            for y in 0..32 {
                for x in 0..32 {
                    if (x as i32 - 16).pow(2) + (y as i32 - 16).pow(2) < 210 {
                        let i = (y * 32 + x) * 4;
                        pixels[i..i + 4].copy_from_slice(&[0, 177, 79, 255]);
                    }
                }
            }
            tauri::tray::TrayIconBuilder::new()
                .icon(tauri::image::Image::new_owned(pixels, 32, 32))
                .tooltip("Meta Bot")
                .menu(&menu)
                .on_menu_event(|app, e| {
                    if e.id.as_ref() == "quit" {
                        app.state::<services::Services>().stop();
                        app.exit(0);
                    } else {
                        let _ = app.emit_to("ball", "native:tray", e.id.as_ref());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Meta Bot initialization failed")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                app.state::<services::Services>().stop();
            }
        });
}
