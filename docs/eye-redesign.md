# Eye redesign

The registry in `src/appearance.js` contains 18 presets: ten persistent eye
designs and eight contextual looks. Classic and anime retain their neutral
eye dimensions, pupils and anime highlights. The other designs replace the
previous overlay-line implementation; pixel eyes include whites and movable
pupils instead of opaque blocks.

## Ownership

Appearance chooses a base identity. Authored expressions retain gaze, eyelid
intent and symbolic reactions. Automatic context adds an attitude without
randomly selecting an unrelated eye identity. Explicit base selection remains
authoritative; explicit contextual presets use their assigned base. No new
task status is inferred from an eye preset.

`Rig.styleEyes` applies a preset to an unmodified authored pose. Repeated
appearance updates cannot compound dimensions or restart the same animation.
Retired IDs migrate as follows: minimal to bean, neon to glass, ink to manga,
asymmetric to curious. Manga, pixel and sleepy IDs keep compatible names but
use new geometry. Existing special expressions and art styles reference the
new registry.

## Rendering

One eye contour and one eyelid aperture clip the white, iris, pupil, highlights,
ink edge and tear rim together. There are no per-style floating eye overlays.
Ordinary transitions use 250-450 ms for eyes; shy, tender and sleepy presets
use longer transitions. Switching base identities briefly closes the eyes.
Sleepy blinking is slower. Reduced motion renders the final pose immediately.
Eye spacing is constrained during body deformation, and combined eyelids are
bounded to prevent inverted apertures. Masks still own the entire face while
worn and reveal the selected eye design after removal.

## Verification

- Unit matrix: all 149 expressions with all 18 presets, immutable source poses,
  finite geometry, registry migration and classic/anime compatibility.
- Browser matrix: seven expressions per preset, near-closed eye cleanup,
  repeated settings, 18 transitions, all 18 body shapes per eye preset.
- Paged desktop/mobile catalog and real coordinator/settings/lifecycle checks.

The main gallery remains paginated. The eye selector previews a selected
style on existing activities without creating an additional animated gallery.
