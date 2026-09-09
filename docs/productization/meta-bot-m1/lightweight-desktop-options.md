# Lightweight Desktop Options

Research date: 2026-09-08. Analysis only; no packaging or framework migration performed.

## Current Footprint

Local file-length sums: `node_modules/electron/dist` is 356.79 MiB; `src`, `desktop`, `bridge` and `shared` together are 0.24 MiB. These are uncompressed files, not installer sizes, memory measurements or a complete production dependency inventory. Lucide, the native mouse hook and any externally installed Codex runtime are excluded from the source figure.

## Recommendation

Prefer Tauri 2 with the system WebView2 runtime on Windows. Keep the HTML/CSS/SVG renderer, pose library and browser-side interaction director. Replace Electron main/preload APIs with scoped Tauri commands and events; port background services to Rust. Do not bundle Node merely to preserve the existing CommonJS backend if minimizing footprint is the goal.

Tauri documents system-webview reuse and window APIs for positioning, always-on-top and cursor-event passthrough. These API names are not proof of full behavioral equivalence: prototype transparent rendering, no-focus reminders, global mouse capture while passthrough is enabled, tray interaction, mixed-DPI monitor transitions and paired-window following before committing to migration. Windows hook code must replace `uiohook-napi`, which is a Node native addon.

Backend migration includes spawning the user's installed `codex app-server`, JSON-RPC request/response handling, rollout file watching and incremental parsing, polling fallback, reconnect logic, task lifecycle deduplication, completion persistence and task deep links. Preserve the current identity and acknowledgement contracts. A smaller shell alone will not improve status detection latency.

## Alternatives

| Option | Reuse | Tradeoff |
| --- | --- | --- |
| Tauri 2 + Rust + WebView2 | Most browser UI and animation logic | Recommended balance; native backend and global-input adapter must be rewritten |
| Neutralinojs | Browser UI | Lightweight system-webview host, but advanced mouse/window requirements need validation and potentially native extensions; not a drop-in Node backend |
| Native Windows host + WebView2 | Browser UI | Good Windows-only alternative; implement window lifetime, hooks, IPC, deployment and updater integration directly |
| Fully native Windows renderer | Visual design and state contracts | Avoids a web engine but requires rewriting SVG animation/rendering and UI; highest cost and regression risk |

No application-specific size promises are justified without a release build. WebView2 still consumes memory and disk; sharing it avoids bundling a separate browser in every application. Tauri's published minimal-app size is not an estimate for this Bot.

## Deployment Constraints

Use Evergreen runtime detection with an installer bootstrapper when missing. Do not assume an installed Edge browser is sufficient: Microsoft's production requirement is the WebView2 Runtime. For offline deployments, bundling that runtime can restore much of the package weight. Tauri's current documentation lists approximately 127 MB additional size for its offline installer option and 180 MB for a fixed runtime; actual versions vary.

Suggested future sequence: isolated compatibility prototype, backend adapter port with existing regression contracts, desktop/DPI/lifecycle verification, then signed release build and measured comparison of installer size, installed size, idle/active private memory, CPU and startup latency. No such prototype or build is included in this change.

## Official Sources

- Tauri overview and system-webview model: https://v2.tauri.app/start/
- Tauri Windows installers and runtime deployment modes: https://v2.tauri.app/distribute/windows-installer/
- Tauri window API: https://v2.tauri.app/reference/javascript/api/namespacewindow/
- Microsoft WebView2 deployment requirements: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution
- Neutralinojs architecture: https://neutralino.js.org/docs/

Wails was also considered, but its introductory documentation returned HTTP 403 during this research and is not used as verified evidence here.
