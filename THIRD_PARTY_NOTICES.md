# Third-Party Notices

The Apache-2.0 license covers this project's own code and assets. It does not
replace dependency licenses or grant rights to third-party trademarks.

| Dependency | License | Use |
| --- | --- | --- |
| Tauri and updater plugin | MIT OR Apache-2.0 | Native desktop and signed updates |
| Lucide | ISC | Interface icons |
| events | MIT | Shared event implementation |
| esbuild | MIT | Build tool |
| Electron | MIT | Optional legacy development runtime, not shipped in native installer |
| uiohook-napi | MIT | Optional legacy input adapter |

Rust transitive dependencies are pinned in `src-tauri/Cargo.lock`; JavaScript
dependencies are pinned in `package-lock.json`. Their license notices remain
applicable. Microsoft WebView2 and Codex are separately installed products,
not relicensed or distributed as project-owned code.

README reference: https://github.com/sam70361/aora-bot . Its artwork and code
have separate restrictions; this project does not incorporate them through
the README reference or claim to relicense them under Apache-2.0.
