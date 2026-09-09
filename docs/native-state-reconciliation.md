# Native Codex state reconciliation

## Incident

The native UI could report a successful connection and zero active tasks while
Codex Desktop was running. A live rollout was about 48 MB, with the active turn's
start about 10 MB before EOF. The old reader seeded only the last 8 MB and never
recovered that lifecycle marker on subsequent incremental polls.

## Repair

- Search backward in 256 KiB chunks, with an 8 MiB per-call budget, preserving
  progress across calls. There is no fixed total-history cutoff. Replay forward
  from the recovered lifecycle; publish uncertainty until replay reaches EOF.
- A newly created JavaScript reader explicitly resets its native cursor. Windows
  path aliases share one JavaScript reader. Conflicting rollout paths are selected
  by file modification time rather than database row or notification order.
- Database idle/notLoaded is not allowed to overwrite direct rollout evidence.
  Explicit live notifications remain a separate, time-limited source of evidence.
- Background hydration advances beyond the first 25 records in the current page.
- A refresh performs at most two consecutive passes before yielding. Remaining
  invalidations schedule an immediate next pass instead of starving initialization.
- Source health reports pending replay and unknown task counts independently of
  transport connectivity. The panel does not present an unresolved zero as final.

## Verification

`npm test` includes native regressions for reader recreation, Windows aliases,
conflicting paths, delayed hydration, continuous invalidation, stale database idle,
and partial replay. Rust tests exercise restart, truncation, partial JSON, and a
lifecycle more than 8 MiB before EOF.

`node scripts/preview-native.cjs --live` opens an isolated real-source build on
CDP port 9225. `test/native-live-review.pw.js` captures real task identifiers before
and after a WebView reload and manual refresh without injecting synthetic tasks.
Run native smoke and live preview sequentially: WebView2's default profile is
shared by this application identifier, even when application data homes differ.

Verified on 2026-09-08: 149 JavaScript tests and the Rust regression test passed.
The real-source window preserved both active task IDs and turn IDs across reload
and manual refresh; Codex Desktop independently reported those same tasks active.
The native smoke test passed connection, completion retention, settings, and
movement at 150% display scaling. See `output/playwright/native-live-reloaded.png`.

## Frozen Modification Time Follow-Up

A live Windows rollout grew from 52,349,864 to 56,083,906 bytes while its mtime
remained 2026-09-08T07:39:59.307Z. It contained a new turn start at 11:29:09.230Z
and subsequent events. Assigning mtime to `growthAt` made that newly observed turn
quiet immediately, so it never acquired `observedRunningTurn` and stayed unknown.

The native log cursor now tracks the previously observed file size separately
from the read offset. `appended` means the file grew since the last observation;
`growth` only means unread bytes remain. Cold replay cannot manufacture liveness.
The reader derives activity from valid event timestamps and real append receipt
time, never mtime. Native filtering returns the final record timestamp even when
the record itself is not a lifecycle event. Compatibility reads follow the same
timestamp/append distinction. Future timestamps beyond clock tolerance are ignored.

Verification: 155 JavaScript tests passed, including fresh starts with old mtime,
historical backlog, actual append recovery, completion, and subsequent turns.
The Rust regression preserves mtime after a real append and asserts `appended`
is true, while cold replay and backlog chunks keep it false.
Read-only replay of the incident's actual final turn also passed: with mtime still
07:39:59Z, events from 11:29:09Z through 11:40:57Z yielded running (not quiet),
followed by completed when its terminal event was consumed. The replay clock was
set to the event observation time; no original Codex logs were modified.
Release smoke passed connection, retained completion, movement, and settings at
150% display scaling. After deployment, the one active Desktop task matched the
Bot's running task; completed tasks remained terminal. The incident task's stored
activity time became 11:40:58.050Z, independent of its unchanged 07:39:59Z mtime.

## Boundaries

Quiet output is separate from lifecycle state. A previously observed running turn
stays running with `quiet: true` after two minutes without output; completion still
requires a terminal event. Cold unobserved old starts remain uncertain. Persisted
same-turn active evidence can restore a quiet task after restart. The UI describes
local-log freshness, not authoritative Desktop runtime synchronization.

The standard Node and Electron entry points launch the same native executable.
Explicit legacy mode defaults to a separate data home. There is no verified public
Desktop runtime subscription configured here; independent app-server idle state
must not terminate a task observed through a different Codex process.

Quiet-state follow-up verification: 151 JavaScript tests passed, including
same-turn quiet recovery, no duplicate lifecycle reminders, and launcher routing.
The 348 x 326 panel screenshot is `output/playwright/quiet-panel.png`.
Native smoke passed at 150% scaling. Launching `electron .` was verified to exit
the compatibility launcher and leave only `dist/native/MetaBot.exe` running;
the persisted source health identified `Tauri 0.2.0`.

This is a local rollout observer, not a subscription to Codex Desktop's private
UI state. Missing files, silent unobserved turns, or records outside the current
catalog cannot be presented as confirmed idle. Known quiet active turns retain
their tracked-active evidence. Historical pages remain available through load more.
