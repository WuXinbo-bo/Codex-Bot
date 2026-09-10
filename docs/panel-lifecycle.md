# Panel lifecycle contract

## Unified native task board (2026-09-10)

The current native app presents all task lifecycle notifications in `panel`.
The separate `completions` surface is no longer shown; `toast` is reserved for
application update notices, not task events. The earlier multi-window rules below
are historical implementation notes, superseded by `unified-task-board.md`.

Current regression entry points are `test/unified-task-board.pw.js`,
`test/unified-board-motion.pw.js`, `test/task-board.test.cjs`, and the native
smoke test. Older browser scripts expecting a visible `completions` or task
`toast` window describe the retired layout and are not current acceptance gates.

Completion records and window layout have different owners. A completion is
durable until the user explicitly acknowledges its ID. Opening its task does
not acknowledge it. Disabling completion reminders explicitly hides the board
but retains records; enabling the setting restores them. Legacy auto-close
preferences migrate to disabled. No age, task-panel action or drag expires an
unacknowledged completion. A multi-item acknowledgement replaces only the row;
the window exits only when its final record is acknowledged.

## Placement and animation

The layout solver reserves completions first, then persistent attention notices,
the task/settings surface, and transient notices. Each normally uses a 280 px
logical width. Completion controls retain their height. Crowded layouts defer
transient notices and reduce the scrollable task surface before falling back
to a dock. Extreme work areas unable to fit the minimum task surface defer that
surface rather than crop completion controls. Layout never acknowledges data.

The coordinator serializes layout and invalidates obsolete transitions.
Per-window monotonic phase versions reject stale animation messages. Stable
visible surfaces receive a repair signal without replaying their entry animation.
Web Animations owns entry/exit; obsolete CSS entry/exit triggers are removed.
Non-lifecycle animation messages cannot initiate an exit. No per-frame native
window animation is used.

## Notice lane

Starts and joined tasks use a bounded, deduplicated transient queue. A queued
notice expires if it is no longer relevant or becomes too old. Display timers
run only while it is shown. Attention/failure notices are derived from unread
task entries and persist until the state resolves or the user confirms the
reminder; confirmation does not authorize or modify the actual Codex task.
Multiple persistent notices can be paged. Viewing does not confirm. Unknown
or stale entries retain their notice with a status-unverified label.
Updates use the same transient lane with lower priority and retain their own
settings and installation confirmation workflow.

Task lifecycle delivery is independent of optional avatar animation completion;
IDs are deduplicated and mixed event batches are separated by kind. The avatar
still receives lifecycle and panel-phase signals for choreography.

## Verification

Unit tests cover non-expiring completion policy, ranked crowded layouts and
notice arbitration. Browser tests exercise actual coordinator/bridge surfaces,
opacity, button bounds, rapid open/close, settings, multiple acknowledgements,
view without acknowledgement, stale animation rejection and reload restoration.
Existing retention, panel choreography, update and native DPI tests remain
regression gates. Physical multi-monitor behavior still depends on the local
Windows display configuration; pure layout tests include negative coordinates.
