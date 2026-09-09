# Base Emotion System

## Registry

`src/base-emotions.js` owns 24 families, four authored scores per family,
and 12 mixed thoughts: 108 new base scores. Existing 149 rig identifiers remain
valid for the 435 activities, 44 ambient theaters and lifecycle performances. The rig
now exposes 257 identifiers, with the 108 base scores in the base gallery and
the legacy 149 in the other-pose gallery. These are not 108 additional activities.

Every score declares eyelids, gaze, body weight, optional arms, one brief micro
gesture (sometimes a second), and explicit accent intensity. No base score owns
task effects, accessories, a face mask or a mouth. Sources are deeply frozen;
the rig merges copies before applying drawing presets.

## Scheduling

The production expression controller selects a legal family for the real task
state, then a variant within that family. Independent seeded randomness avoids
perturbing existing action/prop selection. Families hold for 18-36 seconds;
individual base scores hold 6-12 seconds in natural mode, scaled by companion
pace. A base score is not a 2.3-second transient and does not schedule its own
restore callback. Earlier scheduler deadlines cannot shorten a new score's hold.
Real lifecycle, dragging, direct interaction and scheduled activities may preempt.

Selection uses family coverage weights, tone-neighbor transitions, least-played
variants and a recent-three exclusion. Mixed thoughts enter the variant pool
with a 16 percent opportunity, not a guarantee. A completion's emotional
afterglow influences selection without pinning the face to a single smug pose.
History is bounded to 12 IDs and 100 diagnostic events. There is no disk recording
or resurrected collection feature. Diagnostics are available under
`__metaBotDebug.getPerformanceState().base` with counts and selection reasons.

Running work permits focus, thought, curiosity, doubt and confidence. It cannot
randomly become tired, angry, sad or triumphant. Sleep needs inactivity; pride
requires completion context or satisfied afterglow. Sulking requires recent wary
interaction and expires with that interaction mood. Unacknowledged completion
does not itself authorize blame, failure effects or dismissal of the task notice.

## Rendering

The 18 accents are blush, blush lines, heat, waterline, held tear, soft shine,
sweat, sliding sweat, fine sweat, hesitation, pressure, rounded annoyance,
cool shade, tired marks, warmth, glint, question and pause. The legacy stress
accent remains an alias for old scores. There is no name-based automatic blush.
All accents follow body transforms and use smooth contours.
Transient marks fade; heat ramps gently. Particles off hides all emotion accents.
Reduced motion renders a static pose and disables micro gestures and accent travel.

Base scores own emotional eyelids and gaze. A fixed or automatic eye preset
changes drawing geometry, not the score's mood. Eye fitting accounts for the
screen-space separation of rotated base poses. Static partial-closure poses
use eyelids or solid arcs, avoiding translucent blink remnants.
Masks remain available to existing performances and explicit previews; automatic
mask overlays cannot cover a base score's authored face.

## Gallery And Verification

The gallery lazily instantiates 12 base poses per page. Family filtering,
mixed-thought filtering and individual play buttons do not start the entire
catalog. The 18 accents have a separate two-page catalog. Individual playback
uses the main preview and has a unique performance ID to support replay.

`test/base-emotions.test.cjs` covers registry integrity, full contextual coverage,
state gates, drawing preservation, repeat avoidance, timer holds and priority.
`test/base-emotions.pw.js` checks every gallery page, 1,620 eye combinations,
1,944 shape combinations, 432 art combinations, 108 micro scores, accessibility,
mobile layout and the actual native-coordinator rendering path. Existing catalog,
panel, appearance and native smoke suites remain required release gates.
