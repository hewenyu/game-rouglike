# Nightfold / 折夜

## Chosen experience
Move through a deep-blue drafting field, hold to leave a mint thread, release to
close a polygon and fold its contents. Hostile orange bullets become borrowed
light. The player's route, not an aiming reticle, is the weapon.

A run is a chain of decisions about where to put the next shape. Eight rules
change consequences rather than supplying inventory/stat tiers. Each run drafts
seven different rules out of eight; choices, route and interactions create builds.
There is no promise of never-before-seen mechanics in all existing games.

## Three independent proposals and cross-questioning
Coordinator: hold/release spatial fold, enclosure damage and bullet conversion.
Opus route: dash strings, closed shapes as chords, shape-changing upgrades.
DeepSeek route: steal and order verbs to rewrite a dash.

Opus questioned opaque verb ordering and tiny-loop dominance. DeepSeek questioned
stationary automation, geometric ambiguity and two-finger interference. Decision:
continuous movement, automatic closing preview, minimum path length, explicit
area threshold, line damage fallback, no bullet protection before release.
We dropped precise endpoint snapping, side-count recognition and verb-order UI.
Self-intersections use even-odd filling instead of rejecting a player's gesture.
These are model design judgments, not user approval.

## Rules contract
World: 1200 x 800; deterministic 60 Hz simulation independent of canvas resolution.
Speed: 235 units/sec, normalized diagonals. Player radius 9-10 depending on hazard;
6 health, 1.65 seconds of invulnerability after a hit. No invulnerable dash.
Hold: sample every 11 units; max 4 seconds. Release: minimum traveled length 85;
0.7-second cooldown for valid folds. A max-duration fold requires releasing before
starting another. Cancellation never deals damage.
Enclosure: even-odd test, sampled area >=1200. Segment/closing-edge damage is 55%
of enclosure damage; base enclosure damage is 57 plus 4 per selected rule to match
later enemy health. This small baseline scaling is separate from the rule effects.
Enemy projectiles: capture at release only, max 16 per strike; mirror and constellation
can perform separate bounded captures. Primary effects cannot recursively spawn
other rules. Satellite cap 8; live weave-fields cap 4; enemies 72; projectiles 260.

Eight rules: delayed echo, delayed inward gravity, orbiting borrowed moons, slow
fabric, anchor-centered point reflection, every-third-anchor triangle, an extended
closing-edge beam, and on-primary-kill homing moths. Effects have distinct color,
shape and descriptions. Discovered records are cosmetic, never power upgrades.

## Scope and pacing
Short prelude: drafts at 12 / 32 / 52 seconds; boss appears at 65 seconds, has 95-second
limit. Full voyage: six 95-second chapters; drafts at 20 / 80 / 160 / 250 / 340 / 430 /
520 seconds. Boss at 570 seconds has 150-second limit. Reading choices pauses time,
so a full successful voyage is expected to take about 11-14 minutes, not guaranteed.
Chapter transitions restore 1 health; boss arrival restores 2. Clear win/loss and
same-seed/new-seed retries. Randomness is enemy placement/kinds and rule offers,
not generated maze topology. No claim about all seeds or all builds being beatable.

## Visual / sound direction
Original Canvas vector illustrations: blueprint grid, mint geometric thread,
ivory player, warm orange solid enemies, distinct enemy silhouettes and telegraphs.
Custom SVG rule diagrams, no stock art and no remotely fetched fonts or assets.
Web Audio five-note-derived folding chords, capture arpeggios, contrasting hurt tone.
Chinese serif display typography, restrained Latin monospaced drafting annotations.
Fonts use installed platform families; exact typography varies by platform.

## Controls and lifecycle
Keyboard WASD/arrows + Space; mouse left hold is an alternate fold input (no aim).
Touch: distinct pointer IDs, left drag joystick and right hold/release button.
Pointer cancel, blur, hidden document, and resize pause and clear the in-flight line.
Draft and resume clear held inputs. No unfinished-run persistence. localStorage is
optional, schema-filtered and exception-safe for records/preferences only.

## Deliberate exclusions
No equipment inventory, shop, map traversal, currencies, online account, backend,
leaderboards, multiplayer, persistent power progression, replay export or gamepad.
No public deployment, paid assets, or external analytics.
