# Persistent Panel Behavior

Opening the primary panel does not acknowledge or dismiss a completion. Dragging the robot preserves the visibility of every expanded panel. Existing explicit close/toggle actions and user-enabled completion auto-close preferences remain unchanged.

The normal layout searches for non-overlapping positions beside the robot. If no candidate exists, it docks the requested panel group against the work-area edge, reducing spacing before reducing height. This never converts a placement failure into a hidden window. On extremely small work areas where the robot and all panels cannot fit simultaneously, the dock may share the robot's area; the panels remain visible and do not overlap each other.

Primary panel: 280 x 154 logical pixels. Completion: 280 x 50 (76 with multiple items). Start toast: 280 x 82. All three surfaces have matching 5-pixel outer padding. Onboarding uses a compact 360 x 430 layout. Task lists and settings keep their internal scrolling.

## Regression Checks

- Unit layout cases: crowded work areas, all corners, negative monitor coordinates, no hidden panels, no panel-to-panel overlap.
- `test/panel-retention.pw.js`: genuine coordinator mouse input, completion followed by primary panel open, four-corner drag, zero hide operations, matching visible surface widths, viewing without acknowledgement, confirmation without closing the primary panel.
- `test/panel-system-review.pw.js`: lifecycle phases, short transition duration budget, multiple completion handoff.
- Native smoke: opening the primary panel and entering/exiting drag preserve both native windows. Run at 150% scaling before replacing the desktop binary.
