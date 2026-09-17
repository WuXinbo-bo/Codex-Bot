# Unified Task Board

## Ownership

The native app uses one task surface: `panel`. `TaskCenter` owns actual task
status and unread attention records; `CompletionInbox` owns durable completion
acknowledgements; `TaskBoard` owns transient presentation, not task execution.
The old completion webview remains hidden for host compatibility. Application
update notices retain their existing independent update/installation workflow.
The optional legacy Electron debug shell is not the production native path.

Card identity is source + task. Turn and event IDs version actions, not rows.
Completion changes the same card to pale green and changes its actions from
copy/open to acknowledge/open. If the same conversation starts again before
confirmation, that card returns to its live state as a normal transient
continuation card. It no longer inherits completion persistence. Authoritative
continuation supersedes the old inbox record; a later completion becomes the
only new pending completion. The same rule applies after confirmation.
Distinct tasks and sources never merge, even when their titles match.
Successfully opening a completed task acknowledges that task's pending completion, just
like its checkmark. Opening an active, failed or attention task does not acknowledge
it. Failed opens or acknowledgement saves retain the completion for retry.
The completion toggle hides records
without deleting them; re-enabling it restores them. Restart restores the same
durable inbox. Legacy arrays are consolidated by source/task on startup and saved
in the same file format. The newest event time (or received time for old records)
wins. Superseded turn IDs are retained in task notice metadata, bounded to 32 per
task, so delayed older snapshots cannot replace a known newer turn.

## Visibility

- Started, joined, resumed, queued and paused events create/coalesce transient
  cards. Only actual visible, unpaused time consumes their four-second budget.
- Hover, keyboard focus, outstanding actions and robot/board dragging pause
  presentation. Offscreen cards do not consume the budget.
- Manual expansion keeps active rows visible after transient presentation ends.
- Collapse removes manual expansion and temporary cards, not pending records.
- Unacknowledged completion, failure and stopped cards remain. Attention cards
  remain until resolved or explicitly snoozed for five minutes.
- Settings retain the pending cards above the settings content. Routine task
  output and poll timestamps cannot restart card animations.
- Known unread attention is retained when live evidence becomes inconclusive.

The width is 280 logical pixels; rows are 48 pixels with four pixels separation.
The normal viewport holds up to three rows and then scrolls. Settings reserve
up to two pending rows above their own scrollable area. Existing visible row
order stays stable during pointer/keyboard interaction; idle reconciliation
places pending work first. Long titles truncate with the full title on hover.
Task controls use icons and accessible names. No panel shadows are added.
The task list scrolls vertically without visible scrollbar tracks; wheel,
touchpad and keyboard focus still reach offscreen rows. Horizontal overflow is
clipped. Card transforms are contained by the list, and row buttons use native
title tooltips so empty toolbar tooltip boxes cannot change scroll geometry.

## Motion And Safety

Entry is 220 ms, exit 160 ms, with no pre-entry sleep. The robot receives the
same native panel-phase and lifecycle events used by the production renderer.
Card state changes animate locally on the compositor; card acknowledgement has
a 140 ms receipt gesture. Optional animation never gates notification delivery.
Resumed events use `performance_companion_panel_resume`: pick up the existing
card and continue. They cancel superseded completion gestures for that task.
Queued and paused events keep existing arrival/settling performances. Reused
rows animate their badge; only newly mounted rows play an entrance transform.

Nudges target the completed card, not the whole window, and acknowledge their
actual playback to the coordinator. Existing stage/cooldown caps remain in force.
Reduced motion and disabled board animations suppress these effects. Board
pointer moves coalesce before IPC; robot dragging retains the unified surface.

Action requests carry card and event identities. Obsolete controls are rejected;
late attention acknowledgements cannot acknowledge a newer task turn. Completion
actions revalidate after opening Codex and after saving. If execution restarts
during a save, the latest inbox snapshot is saved; the superseded completion is
not restored and no new-turn confirmation or filing gesture is emitted.
Completion save failures retain the in-memory reminder and
retry the latest inbox snapshot through the serialized action queue. Persisted
acknowledgements precede UI removal. Lifecycle persistence runs before replacing
a running card with its terminal state, preventing a brief hide between them.

## Verification

Run `node --test test/*.test.cjs` and `node scripts/build-tauri.cjs`.
Against the local static server, run these scripts using Playwright CLI
`run-code --filename`:

- `test/unified-task-board.pw.js`: real coordinator and bridge, inline controls,
  timed expiry, manual retention, completion retention, settings, multiple turns,
  individual acknowledgement, four corners, board drag, restart restoration,
  snooze/resume, hover pause, and rapid start-to-completion.
- `test/task-card-continuation.pw.js`: three repeated runs on the same DOM card,
  actual continuation gesture, expiring/collapsible running card, legacy duplicate migration,
  restart after confirmation, delayed open/save races, old completion rejection,
  persistence retry and distinct tasks with matching titles.
- `test/task-card-ack-failure.pw.js`: failure acknowledgement save errors allow
  retry without restoring a superseded completion.
- `test/task-card-resume-retention.pw.js`: same-turn resumption, independent
  completion retention, failed cleanup retries, startup repair, and delayed
  completion writes cannot make a running card persistent.
- `test/unified-board-motion.pw.js`: actual start/completion performance state,
  changed robot screenshot pixels, nudge playback, reduced motion, stale phase
  and action rejection, entry/exit phases, and bounded native layout calls.
- `test/unified-board-errors.pw.js`: pause/resume, retained failure and stopped
  reminders, injected open/save failures, retry, and 360 x 420 work-area bounds.
  Action errors stay inline so they cannot squeeze confirmation controls.
- `test/task-list-scroll.pw.js`: one, three and ten long-title rows, repeated
  clicks, stable scroll geometry during card motion, wheel scrolling, keyboard
  access and preserving the scroll position when clicking the final row.

Native verification: `node scripts/tauri.cjs build --no-bundle`, then
`node scripts/test-native.cjs --dpi` and
`node scripts/test-native.cjs --onboarding`. These run isolated test homes and do
not confirm or alter the user's Codex tasks. Browser data are simulated; the
native smoke test separately checks the installed Codex connection.

Visual inspection artifacts are under ignored `output/playwright/unified-*`.
The integration demo is `test/fixtures/panel-system.html`; it loads bounded
production renderer instances and does not connect to the user's Codex account.

## Results (2026-09-10)

- 284 unit tests passed, including eight new board/lifecycle regression cases.
- All three unified-board browser suites passed. Pixel comparisons confirmed
  actual robot movement; task surfaces used 15 native bounds calls across the
  motion scenario, not per-frame window movement.
- Screenshots were inspected for completed cards, settings retention, actual
  task acting/nudges, and a 360 x 420 work area at a 390-pixel browser viewport.
- Native live-connection smoke passed at 150% scale, with pending retention,
  board movement, manual collapse and preference migration checked.
- Isolated missing-Codex/new-machine onboarding smoke passed.

Physical mixed-DPI multi-monitor hardware was not available for this run;
existing layout tests still cover negative coordinates and constrained areas.
No GitHub release, version bump, installer publication or remote push is part
of this change.

## Task-card continuation verification (2026-09-17)

The original running-card retention behavior in this section is superseded by
the completion-only retention correction below.

- All 308 Node tests pass, including task identity, old-turn rejection,
  same-turn continuation, legacy inbox consolidation and persistence rollback.
- Browser checks pass three repeated runs on one DOM node, the production
  continuation gesture, retention beyond the transient timeout, confirmation
  and open races, restart migration, save retry, and equal-title task separation.
- Task-board retention, failure recovery, start/completion pixel motion and
  1/3/10-row scroll regressions pass. Screenshots for the running and completed
  versions of the same card were inspected under `output/playwright/continued-*`.
- Confirming a failure with an older pending completion now rolls back both
  acknowledgement records if the second save fails, then supports a clean retry.
- The release build and native 150% DPI smoke pass. The native test verifies
  one reused card and one latest persisted completion across a rerun; the live
  Codex connection is healthy and reports one active task in this run.
- Isolated missing-Codex / uninitialized-home onboarding smoke passes.

## Completion-only retention correction (2026-09-17)

- Pending completion persistence belongs to the completed state, not the task
  identity. Resuming in either the same turn or a new turn uses the same DOM
  card, returns to the four-second visible-time budget, and allows collapse.
- Manually expanded active tasks remain until collapsed. Unread failures,
  stopped tasks and attention reminders keep their separate persistence rules.
- Superseded completion records are removed using authoritative saved task
  state, including during bootstrap. Missing/offline/unknown evidence alone
  never dismisses a completion. Newer completions remain until acknowledged.
- Queued obsolete completion callbacks are rejected. Inbox flushes compare
  their saved snapshot to current memory so a concurrent state change still
  receives a subsequent save; failed saves retain the retry flag.
- Verified: 312 unit tests; continuation, resume-retention, acknowledgement
  failure and unified-board browser suites; release configuration check;
  native release build and 150% DPI live-connection smoke. The native smoke
  also explicitly collapses the resumed task before completing it again.
