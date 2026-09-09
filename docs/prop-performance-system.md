# Prop Performance System

## Inventory

The runtime has 45 accessories and 255 activities. This revision adds 21 props,
21 short scores, 12 independent fifteen-second stories and 11 task performances.
The total theater count is 32; task performances total 34. Scarf, headband and
headphones were removed before delivery. Pixel art is retired separately and
saved selections migrate to automatic art without changing supported eyes/skins.

## Ownership

`prop-scores.js` authors expression, hand, gaze, object and articulation beats.
Every new score prepares, uses, stows and exits. The open, extend and turn channels
interpolate with the existing rig clock. Three acting variants redistribute brief
pauses and adjust hand/gaze intent without changing the duration or task semantics.
Each new score uses one main object; the brooch is a wearable. Automatic masks
yield to occupied hands/props and explicit masks hide the whole prop layer.

Accessory SVG nodes are created only when visible and released on exit. Bounds
include articulated parts and feed the existing native-window fitting calculation.
Body-held objects have support hands; hand-held props follow the contacting hand
when a task panel enters from the opposite side.

## Scheduling

Existing state pools, activity cooldowns, family rotation, task priority and
accessibility gates remain authoritative. New play/rest props do not enter running
work. Lifecycle information is dispatched before animation, never after it.

The native renderer accumulates visible milliseconds (opacity above 0.5), excluding
masked/hidden frames. Large RAF gaps are capped so suspended windows cannot claim
hours of exposure. The director combines family selection with inverse exposure
weights and divides duplicate scores sharing one prop, avoiding card-count bias.
Headless tests use measured elapsed score time, not requested full clip duration.
Diagnostics expose `props.exposure`, `props.source` and the bounded followup.

Completed short puzzle, note and yoyo routines can request a matching followup
after 45 seconds, at the next eligible boundary. That request expires after ten
minutes and never plays in an incompatible task state. Ordinary interaction can
resume the current routine; a changed task context invalidates stale resumptions.

New completion deliveries remember their prop by task and turn, bounded to 128
entries. Explicit confirmation can use it in the existing acknowledgement score.
This visual memory neither persists nor acknowledges task records itself. The
completion panel remains owned by the completion inbox, not animation timers.

## Verification

Unit tests cover registries, routed playback, clean exits, articulation values,
variant timing, exposure weighting, priority interruptions, followups and delivery
confirmation. Browser checks cover all new frames across all supported styles,
animated joints, viewport bounds, lazy node cleanup and paginated desktop/mobile
previews. Existing lifecycle, retention, appearance and native smoke suites remain
release gates.
