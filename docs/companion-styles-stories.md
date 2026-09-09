# Companion styles and stories

## Scope

Four procedural rig styles extend the classic appearance: mime, clay, pixel
and rubber. They change body finish, preferred eyes and shape, motion tempo
or interpolation. Explicit eye and shape choices take precedence. Paper and
doodle art styles have been removed; saved selections return to automatic.
Base body contours use rounded curves; pixel art samples those contours into
square grid steps and retains its blocky finish. The character stays
mouthless. Panel interaction directs gaze and hands toward the native panel;
it does not deform the native window itself.

## Scheduling

Quiet, attentive and playful profiles adjust ambient cadence and movement.
Nine authored segments form five stories: rehearsal and delivery, completion
acknowledgement, hiding and retrieving a cube, leaving and retrieving a letter,
and cleanup after several completions. Session memory expires stored props,
deduplicates completion events and applies story cooldowns. Ambient stories
are gated by status, pointer proximity and the random-animation setting.
Existing long theaters retain their scheduling opportunity before stories.
Turning random animation off also stops an active ambient story.

Real task signals take priority. Stories never invent task events, acknowledge
notifications or delay the native panel transition. Confirmation reactions
follow successful persistence of the user's explicit acknowledgement.

## Automatic Playback

The collection UI, recording, favorites, frequency controls and replay APIs
have been removed. Old collection records are inert and no longer affect the
action scheduler. Existing activities, props, long theaters and story memory
remain available through automatic scheduling and the developer gallery.

## Verification

Unit tests cover style defaults, narrative assets, expiry, preserved registries,
story delivery, confirmation, interruption and quiet-profile behavior.
The companion-upgrade browser test checks real native-coordinator integration,
settings persistence and rejection of removed collection APIs.
Panel-system and catalog-pagination tests cover notification timing, retention,
bounded preview instances, mobile overflow and JavaScript errors.
