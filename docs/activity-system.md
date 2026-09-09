# Contextual Activity System

## Inventory

The activity expansion adds 180 authored timelines to the 255 retained activities:

| Type | Added | Duration in natural mode | Production route |
| --- | ---: | --- | --- |
| Emotion activity | 96 | 8.8-10.2 seconds | Legal idle/work/queued/paused pools |
| Task performance | 36 | 5.95 seconds | Six per lifecycle/running category |
| Panel interaction | 16 | 1.3 seconds | Enter, switch, confirm, move |
| Mouse interaction | 16 | 3.95 seconds | Hover, click, hold, release |
| Mixed-emotion theater | 12 | About 15 seconds | Context-specific ambient selection |
| Contextual continuation | 4 | About 15 seconds | Earlier activity or explicit confirmation |

The totals are 435 activities, 70 task performances, 44 ambient theaters and four
conditional continuations. These categories overlap the activity total; they are
not additional facial assets. All 108 base expressions and all 45 retained props
are used. The original eight special-eye symbols, 15 eye styles, four art styles,
18 rounded shapes and 24 masks remain unchanged. Retired content stays retired.

`src/activity-scores.js` is the authoritative catalog for the new timelines,
labels, routes, families and followups. The visual fixture provides all 435
activities, search, type filters and one storyboard per page. Only that page owns
its renderers; collapsed embedded demos do not load their frames.

## Authorship

Each activity has preparation, four or six meaningful operations, stowing and a
clean exit. The ordered operations specify gaze, posture, support hands, object
position and articulated channels. Examples include remeasuring from another
origin, correcting a crooked stamp, catching an early-returning yoyo, opening a
folder before inspecting it and looking away after showing a drawing.

The 24 emotion families each receive four scenes: calm, trust, focus, thought,
curiosity, doubt, expectation, happiness, satisfaction, confidence, pride,
surprise, wariness, anxiety, hesitation, shyness, embarrassment, sadness,
frustration, sulking, boredom, sleepiness, care and playfulness. Twelve longer
scenes use mixed thoughts such as restrained happiness and considerate closeness.

Three delivery variants preserve the authored sequence and clean exit. A turning
point can become a minor correction or a glance toward the observer. Variants
never mutate the source timeline. They are counted as delivery variations, not
as three times as many independent activities.

Body-held objects compute supporting hand positions from their bounds. Hand-held
props move with their grip; mirrored panel performances mirror that binding.
Open, extension and rotation channels persist across subsequent beats until an
operation changes them. Notebook pages and the gift lid now have actual joints.
An exit returns to an accessory-free pose. There is never more than one prop in
a new score, and no score synthesizes task success/error/input indicators.

## Clock and Ownership

The renderer has a whole-performance clock and a frame-local beat clock. The
first controls the acting envelope; the second starts each base emotion's small
eye/body gesture even late in a 15-second timeline. An appearance-only update
preserves the current beat. Resumption keeps the chosen variant, frame sequence,
appearance and remaining stage duration; its micro gesture restarts on re-entry.

An activity holds resolved appearance through its frames so a random style change
does not interrupt the scene. Masks yield while a new score owns the performance.
Reduced motion cancels activity playback and leaves a static state response.
Disabling random activities stops ambient scores without disabling task feedback.

## Scheduling

All new entries use the existing production controller, not a separate gallery
player. The controller retains task-state pools, recent-family avoidance,
per-activity cooldowns, nonrepeating variants and inverse prop-exposure weighting.
Duplicate timelines using the same prop do not gain extra exposure merely because
that prop has more catalog entries.

Autonomous activity uses a rolling five-minute time budget: 90 seconds during
work and 150 seconds otherwise. The gate reserves the next score's duration;
accounting records only elapsed segments, including interrupted segments. Explicit
mouse interactions, panel gestures and actual task notifications are not blocked
by this ambient budget. Quiet/natural/lively pacing remains the single pace control.

Passive mouse movement cannot truncate an emotion activity or a long story.
Direct pressing, dragging and real lifecycle events retain priority. Eligible
low-priority scenes can resume after a brief interaction only in the same task
context and within the existing 15-second resume window.

Three continuations wait at least 45 seconds after their source activity, expire
after ten minutes and require a matching task context, legal route, free pointer,
closed panel and available budget. The fourth continuation requires explicit
completion confirmation and reuses the recorded delivery prop. Story settings,
reduced motion and controller shutdown clear pending continuations.

## Panel Contract

The new entry, switch, confirmation and movement variants affect the robot only.
Native panel transitions retain their 220 ms maximum and never wait for the
robot's timeline to finish. A native `visible` event cannot truncate entry acting.
An incoming task lifecycle event preempts panel/confirmation acting immediately.

Completion navigation and notice switching send a bounded `panel-switch` event.
Board drag start/reset sends `panel-move`; dragging the robot with its panel open
uses a support pose. These events never acknowledge tasks, remove completion
records or hide panels. Only the existing explicit confirmation path removes an
unread completion. Backend window allowlists still validate every bridge action.

## Verification Contract

`test/activity-scores.test.cjs` verifies all new entries, immutable variants,
resource coverage, legal routes, production lifecycle/mouse/panel reachability,
late-beat settings, cleanup, interruption and bounded contextual followups.
Existing activity, lifecycle, appearance and retention suites remain mandatory.

`test/activity-scores.pw.js` checks every new frame across three variants and four
art styles at the native 128 px size, plus late-beat motion, reduced motion and
desktop/mobile screenshots. `catalog-pagination.pw.js` checks every page, type
filter and bounded renderer count. `panel-system-review.pw.js` and
`panel-retention.pw.js` drive the production coordinator and bridge in the browser
fixture. `living-performance.pw.js` checks all 70 task performances using one
reused renderer. Native build and DPI smoke tests are the final local gates.

Diagnostics at `__metaBotDebug.getPerformanceState()` expose activity start,
completion, interruption and elapsed-time counts, rolling ambient time, prop
exposure, selection history and pending continuation. These are session-local
debug data; they do not recreate the removed collection feature.

## Local Verification, 2026-09-09

- `npm test`: 273 passed, zero failed.
- New visual matrix: 15,504 frame/variant/style combinations passed, including
  separate confirmation-prop replacement and notebook/gift joint checks.
- Pagination: all 435 activity pages and all other categories traversed; no
  accumulating renderers or desktop/mobile horizontal overflow.
- All 70 task performances rendered; 44 ambient theater storyboards checked.
- Production coordinator fixture: lifecycle, automatic appearance, completion
  navigation, four-corner dragging and explicit confirmation passed.
- Release configuration and tracked-file credential scan passed.
- Final native release build and 150% DPI smoke passed: live task, movement,
  renderer dimensions, settings and retained completion checks.

These are local automated and representative visual checks, not a claim that
every subjective animation choice has been manually reviewed on every machine.
