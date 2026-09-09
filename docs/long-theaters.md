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
- At the first available ambient slot after the deadline, select a compatible theater (no repeated probability rejection).
- Global cooldown begins on actual completion: running 90-150 seconds, other states 45-90 seconds. Per-story completed cooldown is five minutes.
- Among eligible stories, prioritize the lowest completion count before family balancing. Thus small families cannot monopolize the stage. Interrupted stories receive a 15-second retry delay and no completion credit.
- Ordinary short activities retain their own pools and family balancing.
- Passive pointer proximity and an open panel allow theaters. Pointer observation
  controls gaze without interrupting the timeline. Other transients and reduced
  motion block automatic starts. Random-off clears pending automatic resumption.
- Retained-completion stories are limited to two per visible-panel visit. They
  never acknowledge or hide tasks and never run from the ordinary idle pool.
- Click reactions can resume the same frame and remaining time within 15 seconds,
  including while the panel is open. Drag, lifecycle, task changes and reduced
  motion discard stale performances. Notifications always retain priority.
- Mask dressing contains two explicit mask moments. Production honors mask
  preferences; interruption removes the mask immediately. Normal manual mask
  removal retains its existing animated exit.
- Every timeline ends with clean accessories and no synthetic task-status effects.
- Intermediate short-clip reset frames are trimmed before composing chapters.
  Three bounded acting variants vary gaze and body tilt without replacing props;
  consecutive starts of a story avoid the previous variant. All remain 15 seconds.
- During a theater the production renderer suppresses unrelated automatic masks,
  mask hover reactions and random shape selection. Scripted masks retain ownership
  and restore correctly after a brief click interruption.
- `getState().theater` exposes completed counts, next deadline, blocking state and
  the latest 100 start/resume/completion/interruption events. The visual fixture's
  interactive director displays coverage and cooldown; force-play is still only
  an asset preview, not evidence of automatic scheduling.

## Verification

`npm test` covers registry validity, exact duration, prop isolation, cleanup,
context routing, global/per-story cooldown, accessibility, bounded retained
behavior, and lifecycle/drag interruption. `test/theaters.pw.js` checks all twenty
storyboard/playback entries, samples real fifteen-second playback, checks mask
replacement, and captures a contact sheet under `output/playwright/`.

The seeded 30-minute regression keeps the primary panel open and moves the
pointer near for five seconds every twenty seconds. Seed 42 completes 11 running
stories covering all seven, and 16 idle stories covering all nine; per-story
completion counts differ by at most one. These are deterministic virtual-clock
measurements, not a guarantee under continuous dragging or task notifications.
Queued, paused and retained routes have separate completion and routing tests.
The browser check also runs the production controller with pointer proximity,
asserts the scripted mask appears, and checks completion and cleanup after 16s.

The visual fixture exposes all stories in its existing activity selector:
`test/fixtures/m1-visual.html`. These are composed sequences, not twenty new
standalone face assets; the original expression count remains unchanged.
