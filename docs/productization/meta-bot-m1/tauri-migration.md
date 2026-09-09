# Tauri Migration

## Scope

Windows x64 host migration from Electron to Tauri 2, Rust and the system WebView2 runtime. Baseline: `9edb11a`; migration branch: `codex/tauri-lightweight`. The existing Electron entry remains available as `npm run start:electron`. No Electron or Node executable is included in the native distribution.

The M1 SVG renderer, activities, expression director, task lifecycle rules, acknowledgement identities and interaction state machine are reused. They run as bundled JavaScript in WebView2. Rust owns privileged operations; JavaScript is not given a Node filesystem or shell. The ball webview coordinates shared in-memory state and calls narrowly scoped native commands for persistence and OS operations. This is intentionally not a complete rewrite of the proven state machines in Rust.

## Ownership

| Component | Responsibility |
| --- | --- |
| `native/bridge.js` | Preload-compatible frontend API, readiness handshake, request/reply correlation |
| `native/coordinator.js` | Task center integration, separate completion inbox, paired-window layout and lifecycle delivery |
| `native/source-poller.js` | Independent source scheduling, in-flight invalidation and disconnect backoff |
| `native/codex.js` | Codex normalization, runtime/log evidence merging and retained active catalog |
| `src-tauri/src/services.rs` | Read-only Codex app-server transport, incremental bounded log reads, file watching, workbench HTTP and atomic storage |
| `src-tauri/src/windows.rs` | Physical-pixel window movement, monitor work areas, mouse hook, clipboard, task URL handoff and per-data-directory instance guard |
| `src-tauri/src/main.rs` | Window lifecycle, tray, local navigation restrictions and caller checks |

The global mouse hook hands events to a separate thread and never waits for IPC or disk. Existing press/hold/drag rules consume physical coordinates; scale factors are applied to geometry and motion telemetry. Completion positioning uses applied native ball bounds. Reminder windows are shown without automatically taking focus; the task panel can receive focus on an explicit user command.

Window visibility remains owned by Tauri. Direct Win32 show/hide calls must not be mixed with its cached visibility flags: doing so can cause later passthrough updates to hide an apparently visible window. Only atomic positioning uses Win32 directly.

## Compatibility And Storage

Configuration and persisted notices continue using `METABOT_HOME` or `%USERPROFILE%/.metabot`. Existing task notices, completion inbox and snapshot formats are retained. Native saved positions include physical coordinates plus the legacy logical fields. Do not run Electron and Tauri concurrently against the same data directory. Native duplicate launches against one directory are prevented by a Windows named mutex.

Codex queries are read-only. Task links are resolved from known task identities, then validated again natively. Only the ball coordinator can invoke privileged native operations; the panel and completion windows are restricted to their own authenticated request types. No arbitrary process launch or arbitrary filesystem path API is exposed. Codex log reads are constrained to the configured Codex home and JSONL files. HTTP requests for the workbench use its configured/discovered endpoint and do not follow redirects with the authentication token.

Source scheduling is independent: a slow workbench query does not delay subsequent Codex polls. Configuration keys `intervalMs`, `idleIntervalMs` and `maxOfflineIntervalMs` remain supported. A watcher notification invalidates the Codex query specifically. Manual refresh waits for a newer pass when another request arrives during an in-flight query.

## Build And Verification

Prerequisites: Windows x64, Rust MSVC, C++ Build Tools, Windows SDK, WebView2 and Node/npm for development only. `scripts/tauri.cjs` adds the user's Cargo bin directory to its child process environment without modifying the system PATH.

Commands:

```text
npm test
npm run check:native
npm run build:native
npm run test:native
cargo test --release --manifest-path src-tauri/Cargo.toml
```

Browser checks use the existing Playwright CLI scripts: `native-ui-review.pw.js` validates the new bridge with a controlled native transport; `native-cdp-review.pw.js` attaches to a test-only WebView2 debugging port and validates real window movement, one-row reminders, actual renderer acknowledgement and rejection of privileged commands from the task panel. The default application does not open a remote debugging port.

The desktop smoke test uses an isolated `.runtime/native-test-*` directory and the installed Codex for a real read-only connection, then injects synthetic task transitions only into the Bot's test state. It checks the active count, lifecycle retention, twelve native positions, window visibility, panel hiding, settings and acknowledgement. The physical screen used for native acceptance has 150% DPI; geometry is 192x192 physical pixels and 128x128 logical pixels. Real mixed-DPI multi-monitor hardware and additional Windows versions have not been exhaustively tested.

The Rust storage test covers allowed storage keys, replacement writes, incremental partial JSON lines, reset on truncation and log path restrictions. Shared JavaScript tests and new native-adapter/source-poller tests cover lifecycle evidence and source independence. Evidence screenshots are generated under `output/playwright/tauri-*.png` and `output/playwright/native-*.png`.

## Distribution

Release artifacts are produced under `src-tauri/target/release/`. The NSIS installer uses WebView2's online bootstrapper when the runtime is missing; the standalone EXE assumes WebView2 is already installed. Windows system libraries and the user's Codex installation remain external prerequisites. Native import inspection found Windows system DLLs, not Electron, Node or an application-local browser DLL.

The installer and EXE are unsigned local release builds. SmartScreen may warn; no signing credential has been configured. Installer generation is verified, but an unattended installer was not run against the user's normal installation registry during this migration.

Size measurements count actual file lengths, not development caches or process memory. Compare the old uncompressed Electron runtime directory with the new native EXE, not with the compressed installer as though they were the same metric. System WebView2 disk use and runtime memory are not included. The final measured bytes and SHA-256 values are recorded in the release measurement artifact generated by `scripts/measure-native.cjs`.

## Acceptance Record

2026-09-08: 143 JavaScript tests passed; the Rust scoped-storage/incremental-log test passed; Rust formatting and release compilation passed. Real Codex smoke tests passed on the 150% DPI desktop. Playwright verified both the mocked bridge and the real four-WebView application, including completion following, native visibility consistency, individual acknowledgement, reloading a completion window, settings checkbox persistence and caller isolation. The EXE also ran from an isolated directory containing no application source assets. Use `node scripts/preview-native.cjs` for the isolated test-only CDP preview, followed by `test/native-cdp-review.pw.js`; the preview is not the production launcher.

Measured EXE: 4,854,272 bytes (4.629 MiB). NSIS installer: 1,950,495 bytes (1.860 MiB). Previous uncompressed Electron runtime: 374,121,515 bytes (356.790 MiB). Native EXE reduction relative to that runtime directory: 98.70%. Copy-ready delivery files are in `dist/native/`; checksums are in `output/release/size-report.json`. This does not imply a proportional reduction in running memory.
