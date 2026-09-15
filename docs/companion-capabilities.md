# Companion capabilities

Baseline: `5b611b0`. Work branch: `codex/companion-capabilities`.

## Delivery batches

1. Work companion and useful props: once-per-day preparation, task-type work,
   waiting/rest, completion review and recovery, explicit pack-up; per-turn notes,
   focus lamp, persistent hourglass timer, recent-task box, priority flag,
   connection magnifier and copy-link plane.
2. Mouse and living space: approach, head petting, repeated taps, orbit, fast
   pass, lift/land and edge reactions; stool, mat, lamp, box, plant and tray.
3. Twelve short playable activities: catch, hidden star, mirror, balance,
   stretch, trace, high five, rhythm, sorting, stacking, watering and paper plane.
   Task cards receive/stamp/file/fold in the existing panel lifecycle.

## Contracts

No mouth, new system windows, global keyboard monitoring, sound, remote service,
or autonomous task execution. Keep task status truthful. No interaction delays
opening or acknowledging tasks. Completed cards clear on acknowledgement or
successful open; failed actions retain them. Games last 15–30 seconds and yield
to task lifecycle events. Focus mode suppresses optional play, not notifications.
All controls have an entry in the companion tab, including keyboard alternatives.
Only one game, one countdown and a bounded local history are retained. Closing
the companion view ends its game. Reduced motion removes optional choreography.

## Verification

Pure state tests cover restart, expiry, task identity, note delivery, game rules,
bounded state and interruptions. Browser checks exercise production bridge,
controls, robot effects, game inputs and panel state. The gallery loads this
production integration in one bounded instance rather than mounting every game.
