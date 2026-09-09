# Fifteen-Second Theaters

Twenty composed stories extend the short activity registry without replacing it.
Each source timeline is exactly 15,000 ms; the production director varies tempo
from 0.96 to 1.04 (14.4 to 15.6 seconds). Frames use existing rig poses and assets.

| Context | Stories |
| --- | --- |
| Running | Notes, insight, sorting, investigation, pen, workstation, companionship |
| Queued | Hourglass |
| Paused | Nap |
| Idle/offline | Pretend work, flattening, exercise, airplane, balance, painting, magic, masks, sunglasses |
| Visible unacknowledged completion, otherwise idle | Pride, restrained impatience |

## Scheduling

- First automatic eligibility is after 45 seconds, not immediately on startup.
- At an eligible ambient slot, a 30% draw selects a context-compatible theater.
- Global cooldown is 75-120 seconds after its expected finish; per-story cooldown is five minutes.
- Ordinary short activities retain their own pools and family balancing.
- No automatic theater starts during pointer interaction, an open primary panel,
  another transient, or reduced motion. Random-off disables automatic theaters.
- Retained-completion stories are limited to two per visible-panel visit. They
  never acknowledge or hide tasks and never run from the ordinary idle pool.
- Lifecycle notifications and direct interactions interrupt theaters. Interrupted
  stories are discarded rather than resumed after the context has changed.
- Mask dressing contains two explicit mask moments. Production honors mask
  preferences; interruption removes the mask immediately. Normal manual mask
  removal retains its existing animated exit.
- Every timeline ends with clean accessories and no synthetic task-status effects.

## Verification

`npm test` covers registry validity, exact duration, prop isolation, cleanup,
context routing, global/per-story cooldown, accessibility, bounded retained
behavior, and lifecycle/drag interruption. `test/theaters.pw.js` checks all twenty
storyboard/playback entries, samples real fifteen-second playback, checks mask
replacement, and captures a contact sheet under `output/playwright/`.

The visual fixture exposes all stories in its existing activity selector:
`test/fixtures/m1-visual.html`. These are composed sequences, not twenty new
standalone face assets; the original expression count remains unchanged.
