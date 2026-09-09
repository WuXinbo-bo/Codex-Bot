# Contextual Mouse Reactions

Baseline: `3cfb8a9`.

## Behavior

- 62 activity clips and 74 named poses, including 24 new short reactions and 24 asymmetric or expressive poses. Catalog counts are not additive: clips reuse poses.
- Click, approach, dwell, return, hold, release, panel and departure each have a context-filtered reaction pool. Press and drag appearances have separate histories so they do not consume click-response novelty.
- Each pool excludes its last three selections when eligible choices remain. Ordinary/playful/rare tier weights start at 70/25/5; working reduces playful weight and excludes costume surprises and affection. Eligibility, cooldowns and recent-history filtering affect observed proportions.
- Interaction costume surprises have a two-minute cooldown and are excluded in soft/reduced mode. Existing ambient activities retain their own cooldowns.
- Three presses spaced less than 1.6 seconds apart produce an eight-second wary state. Completion produces a twenty-second pleased state. Both decay lazily without extra background timers; no mouse history is persisted or transmitted.
- Drag appearance is selected once per drag. Velocity and edge direction continue controlling physical feedback; telemetry does not repeatedly select random expressions.
- Click responses survive the immediate panel visibility event. Task lifecycle reminders retain priority over social activity. Press/drag can interrupt them with the existing deferred-delivery behavior.
- Reduced mode uses at most 120ms of static response instead of activity playback. Click/open and dragging have no added recognition delay.

## Verification

Results: 133 unit tests passed. All 62 activities passed 869 sampled frames with no invalid geometry, body clipping or mobile horizontal overflow. The twelve-click browser check selected all six work-safe click responses; five interaction chains passed. Native drag/click checks passed at 150% scaling. Real Codex sampling returned 100 tasks, two active tasks and two panel rows with matching renderer status. Injected final completion showed a hidden count, idle indicator and priority-55 animation simultaneously. The native connection test exited with code zero after the input-hook shutdown correction.

`npm test` covers last-three exclusion, short-term memory decay, stable drag faces, lifecycle priority, costume cooldowns/work filtering, reduced-motion timer bounds and the existing source/interaction tests. Existing assertions tied to the old single animation were replaced with assertions for the intended reaction group, priority and eventual restoration.

`test/social-review.pw.js` checks twelve clicks in the actual 128px renderer, six distinct responses, click/panel ordering, finite SVG geometry, frame bounds, memory decay, deferred completion and reduced motion. Six response screenshots are generated in `output/playwright/social-click-*.png`.

`test/m1-activity-review.pw.js` samples every activity at 160ms intervals inside the page while Playwright advances the clock, checks body bounds and geometry, captures all activity strips and checks mobile overflow. `test/m1-interaction-review.pw.js` exercises lift, ambient resumption, return greeting, multi-task lifecycle and real pointer mimicry.

Native checks use `npm run test:interaction` and `METABOT_LIFECYCLE_TEST=1 npm run test:connection` with separate test user-data directories. Test exits now stop the native input hook before destroying the Node environment; verification exposed a shutdown race in the previous direct `app.exit` path.

## Resource Scope

The five character/animation runtime files grew from 75,078 bytes to approximately 84,927 bytes (about 9.6 KiB). No new packages, raster animation sequences, video assets, browser windows or recurring timers were added for social reactions. Test screenshots and development caches are not application payload. These source sizes do not imply that Electron's process memory or installation footprint is reduced.
