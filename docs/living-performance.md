# Living Performance System

This upgrade adds 15 authored expressions and 23 original task scores to the
existing rig. Existing 20 theaters remain available; their source clips are not
used to construct the new task scores. Assets are still shared vector geometry.

## Content

- 15 named special expressions with individual accents and motion signatures.
- Nine eye styles including classic; auto follows the score, fixed styles are
  persisted through the existing appearance settings API.
- Five start, six working, seven completion, three attention and two failure
  scores. Each has four explicit hand/object poses and a clean exit.
- Scores last 4.32 seconds. They use 400-700 ms transitions with holds, rather
  than stretching old short clips. The prior long theaters remain about 15s.
- Three primary-panel gesture variants, chosen without consecutive repetition.
- Behind-body prop staging is actually occluded by the body; it moves to the
  front layer when presented. Existing permanently rear-layer props stay behind.

## Coordination

Lifecycle events select authored scores before legacy clips. Selection rotates
least-used variants, then prefers a different prop family and eye style. Task
emotion memory influences remaining ties and decays over 60 seconds. Diagnostic
history is bounded to 32 entries in `__metaBotDebug.getPerformanceState()`.
Cold joins share the start-score rotation while retaining their distinct joined
notification semantics. Native panel gesture selection runs on entering, not on
the zero-duration preparing event which the application intentionally skips.

Task state is authoritative: acting never creates a completion/error/input
signal, acknowledges a task or closes its panel. Toast choreography cannot erase
the lifecycle performance that caused it. Notifications still appear promptly;
the robot's settling gesture does not extend native panel animation durations.

Passive hover follows gaze without interrupting original scores. Drag and task
events take priority. Automatic masks yield during a score; manual eye selection
and motion accessibility preferences remain authoritative. Completion nudges now
use the controller instead of writing directly to the renderer.

The renderer crossfades eye designs, lets the eyes lead the body, eases hands,
and runs one motion envelope per activity rather than restarting at each frame.
Changing appearance preserves the current authored pose and prop.

## Verification

Unit checks cover registry geometry, score routing, per-event variant coverage,
panel non-interruption, nudge priority, cleanup and reduced motion. Browser checks
in `test/living-performance.pw.js` exercise actual lifecycle playback, eye galleries
and settings persistence across panel reload. All 23 scores have five rendered
key poses checked for finite geometry, prop visibility, rear layering and clean
exits. `test/panel-system-review.pw.js` additionally requires production task
events to reach the new start and completion scores, not just a visible toast.
Run alongside the existing panel, theater and mask regressions. Native smoke
is required before replacing the desktop binary.

Validated on Windows x64 on 2026-09-09: 215 unit tests passed, along with
living-performance, production panel-system, settings-layout, theater, mask and
eye-closure browser checks. Native smoke at 150% DPI confirmed a connected Codex
source with one live task, movement, reminder retention and settings. Release
configuration and tracked-file credential checks passed. These checks use the
local development build; no new remote release is part of this change.

These are lightweight, deterministic rig animations, not generated video or an
LLM emotion engine. Randomness only varies context-compatible choices.
