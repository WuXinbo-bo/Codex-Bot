# Production completion-board acceptance

Runtime verified: Tauri/WebView2. One card 280×50 DIP; queue 280×76 DIP.
Default retains indefinitely; optional 1/5/15/30 minute auto-hide never deletes records.
Disable auto-hide to restore hidden cards. View does not acknowledge; confirm does.
Escalation thresholds: 2/5/10/20 minutes; gentle caps at 1, standard at 3, angry at 4.
Stages fire once per task per process with at least 60 seconds cooldown. No infinite shake.
Legacy records without receivedAt start counting at load. New records persist the timestamp.
Robot mask response respects mask-disable and does not supersede failed/input state.

Title drag changes board offset; robot following remains active. Double-click title resets
the offset. HTML card deal-in/rebound is an animation, not a rigid-body simulation or a
shared 3D hand/card rig. The compact board does not expose arbitrary task mutation.

Evidence: 167 Node tests; policy timestamp/boundary tests; Playwright 280×76 screenshot,
view retention, finite nudge and drag dispatch; native smoke real connection, auto-hide
and recovery without deletion, 150% DPI board drag, ball following and retention.

Codex audit: read-only log/app-server observer; tests cover frozen mtime, large logs,
refresh coalescing, stale cache, disconnect and lifecycle precedence. This is not a
subscription to the desktop private runtime and cannot guarantee zero detection lag.
Workbench production polling is disabled without an injected adapter; see
native/WORKBENCH-ADAPTER.md. Legacy Electron is compatibility-only: this delivery's
new policy/drag integration is validated in Tauri, not claimed for legacy Electron.
