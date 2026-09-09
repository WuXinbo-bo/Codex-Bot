# Face mask acceptance

Implementation includes 24 original vector plates, six timeline variations, three materials
(sticker, paper, holographic), and configurable automatic use/frequency. Existing 74 rig poses
and 62 activity clips remain separate; mask variants are not counted as new activity clips.

- `mask-system.test.cjs`: catalog counts, timeline phases, finite values, semantic pools,
  lifecycle deduplication/priority, drag pause/resume, recent-history avoidance, settings,
  reduced motion and removal.
- `mask-review.pw.js`: all eight timeline phases observed in the actual renderer; original
  eyes disappear while wearing; disabling clears the plate; no text/emoji font in mask art.
- `mask-settings.pw.js`: UI settings round-trip through a mock persistence bridge; compact
  panel scrolling keeps controls accessible. This is not a native persistence E2E test.
- `mask-matrix.pw.js`: 24 masks across all 12 shapes and three materials at 128px SVG size.
- Native smoke separately checks connection, movement, settings and completion retention.

Task status selects semantic pools; lifecycle signals use the existing notification director.
Completion inbox persistence is unchanged: a mask performance lasts 5.2 seconds, while the
completion bubble continues to wait for user confirmation according to its existing setting.
Frequency controls ambient/interaction cooldown (12/25/60 seconds); important lifecycle
events may bypass this cooldown. Reduced motion shows a static plate without flips or reach.
The masks are original SVG illustrations, not copied input-method stickers or OS emoji.

Review entry: `src/mask-review.html`, also linked from `test/fixtures/m1-visual.html`.
