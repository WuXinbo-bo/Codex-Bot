# Companion styles and stories

## Scope

Six procedural rig styles extend the classic appearance: mime, clay, paper,
doodle, pixel and rubber. They change body finish, default eyes and shape,
motion tempo or interpolation. Explicit eye and shape choices take precedence.
These are not six separately redrawn prop collections. The character stays
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

## Collection

The native config stores only validated activity identifiers, encounter and
completion counts, favorites and normal/less frequency. It stores no task text.
The settings list renders eight rows per page without animated previews.
Replay requires an encountered item and is blocked during active tasks, drag
or reduced motion. Replay cannot generate task completion notifications.
Reduced frequency affects ambient selection, not urgent notifications.

## Verification

Unit tests cover style defaults, narrative assets, expiry, library validation,
story delivery, confirmation, interruption and quiet-profile replay safety.
The companion-upgrade browser test checks real native-coordinator integration,
settings persistence, favorite/low-frequency controls and replay guards.
Panel-system and catalog-pagination tests cover notification timing, retention,
bounded preview instances, mobile overflow and JavaScript errors.
