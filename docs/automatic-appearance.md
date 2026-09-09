# Automatic Appearance and Companion Modes

## Preference Contract

`appearance.schemaVersion = 2` persists user intent, not the latest random draw.
The art style and eye drawing default to `auto`, the shape defaults to emotional
`morph`, and the skin remains `lemon`. Any supported preset can be fixed.
`companionMode` is `quiet`, `natural` (default), or `lively`. It derives the legacy
motion and personality fields for existing consumers. `reducedMotion` is a
separate accessibility override; the OS reduced-motion preference still wins.

Migration is idempotent. Old `classic` art settings become automatic because old
releases did not distinguish the saved default from an intentional classic
selection. Other fixed art styles, eyes, shapes and colors survive. Classic can
be fixed again explicitly in the new settings. Legacy low-motion settings survive.

## Runtime Ownership

`appearance.createDirector` owns the resolved visual identity. The expression
controller samples it only at safe expression or activity boundaries and passes
the resolved values to the renderer. The renderer never writes them to settings.
The random stream is separate from action selection, so drawing a new eye style
does not consume the action scheduler's random sequence.

Suggested holds, followed by the next safe boundary:

| Dimension | Hold | Selection |
| --- | --- | --- |
| Art style | 2-5 minutes | Weighted coverage of all four styles |
| Eye drawing | 30-90 seconds | Eight base designs; contextual emotions overlay them |
| Body shape | 10-20 seconds | Emotional pool or all eighteen shapes |
| Skin, when automatic | 3-8 minutes | All eight colors |

Each boundary changes at most one dimension. Recent choices are avoided and
frequent choices lose weight. A style suggests eyes and shapes; it does not lock
them. Full performances retain their visual identity between frames. Dragging,
important task notifications, panel contact and active masks defer automatic
switches. Reduced motion freezes automatic rotation. Explicit settings and
preview commands still work. None of these decisions delays notification delivery
or acknowledges a completion record.

Mask preferences are diffed separately: external appearance updates must not reset
mask cooldowns or remove a manually worn mask. Fixed base eyes retain contextual
expressions; fixed emotion presets intentionally keep their specified attitude.

## Settings Preview

Settings have a separate draft and renderer. Shuffle only changes the preview;
pin copies its current appearance into the draft. Restore automatic keeps the
chosen color. Apply saves preferences, while discard restores the last successful
save. Failed writes leave the draft intact. Fixed controls are revealed only when
needed, and colors use swatches.

The single preview instance runs only while the appearance tab and window are
visible. Its appearance clock runs eight times faster for inspection; movement
durations are not accelerated. Actual desktop rotation uses real elapsed time.
The paginated gallery uses the same preference contract and expression controller.

## Regression Checks

- `test/appearance-director.test.cjs`: migration, time bounds, fixed presets,
  coverage and repeat avoidance, accessibility, real long-performance stability.
- `test/automatic-appearance.pw.js`: real bridge save/restore, independent draft,
  shuffle/pin, native renderer application, modes, failure handling, restart,
  hidden-preview cleanup, active-mask preservation and compact viewport layouts.
- Existing eye matrix, panel lifecycle, task notification and settings tests
  continue to guard geometry, retention and choreography.

Runtime diagnostics: `__metaBotDebug.getPerformanceState().appearance` includes
preferences, current identity, next deadlines, bounded history and coverage counts.
These diagnostics are local and contain no task content.

## Rounded Appearance Revision

Paper, doodle and pixel art styles have been retired. Both old and schema-v2 saved
selections migrate to automatic art; other preferences remain unchanged. Paper
mask materials and paper-related activities are separate features and remain.

All eighteen body outlines share cached periodic smoothing and a closed quadratic
spline with matching endpoint tangents. The same topology is used during morphs.
All supported styles now use the smooth body renderer, including during morphs.
The retired pixel style is absent from settings, previews and automatic pools.

The performance collection UI, bridge endpoints, recording writes and collection
frequency filters are removed. Existing collection data in old config files is
left inert for recovery; it is not read by the scheduler. Automatic coverage,
recent-history avoidance, task priorities and the paginated developer gallery
remain independent of that removed feature.
