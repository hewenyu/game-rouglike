# Status
User played and rejected Nightfold: not satisfying, wants a Brotato-like roguelike.
The rejected prototype has been deleted under the user's direct authorization.
Current project: Scrap Surge, a scrap-armored hermit crab with automatic multi-weapons.

Product goal lives in memory/goal.md: an original, runnable, replayable single-player
browser auto-combat roguelike targeting a 10-20 minute normal run with genuine
positive-feedback builds. The user's latest goal supersedes the older "stop before
demonstrating" note; the two-wave build is now the first slice toward that goal.

## Roles
Astra coordinates, owns architecture boundaries and integration review; Opus reviews
gameplay/aesthetics/feel; DeepSeek is the sole writer here (implementation, tests,
fixes). All three have equal standing and must explicitly agree before a decision is
implemented. Silence is not approval. Author self-check is not independent review;
the independent DeepSeek review runs in a separate context against a frozen commit.

## Slice S1 (approved by Astra, Opus and DeepSeek)
Feel-validation slice: 20-second wave 1, shop, 35-second wave 2 with boss, real touch
movement. Approved revision package: player ivory+teal color separation at 1.3x with
white outline and teal ground ring; visible weapon blocks; fixed wave spawn rates
(3.1/s and 4.2/s) plus timed enemy pockets; high-saturation explosion FX with a real
chain count and number merging; non-blocking HUD; high-contrast shop feedback-loop
diagram; title-sticker clipping fix; and the combatPicked / FIFO boundary rules.
Also agreed: S1b (spring-fist remnant, overtime countdown, per-root chain accounting,
success-only spawn counting) and S1c (presentation-only readability fixes). The
explicit per-agent sign-off text lives in docs/reviews.md.

S1 + S1b + S1c are implemented and frozen on branch codex/scrap-surge at the commit
recorded below. Evidence at that freeze: `npm test` 35/35 (the suite has since grown
to 37 with S1d, below), `npm run build` clean,
`npm run test:browser` victory (283 kills, hp 1, chain peak 19, pending peak 14, no
page errors) and an author-run `npm run test:browser:regression` 19/19 including the
idle-play defeat path and the arena-vs-HUD geometry checks. The checks were drafted by a
separate agent, but the implementer ran them, so that is author evidence, not
independent review. Frozen slice review by Astra, Opus and an isolated DeepSeek
reviewer is pending and must run against the frozen source commit.

This is a feel-validation slice, not a claim of a finished 10-20-minute game.
User acceptance of this version is still pending.

## Current source under review

The current source on branch codex/scrap-surge is baseline **ee53cf8** (the
post-palette-restore slice) plus S1d (slinger damage 18 -> 20), S1e (weapon aim fix)
and T1 (read-only `enemyPositions` metrics plus a forced-defeat browser fixture). The
prior freezes are **d6ba6fef5e117d342f1ac594d7d9ff2858b6bfd1** (S1d) and
**03ff521d8da70584751b3fc1192425e12f82ccc7** (S1e); T1 is the commit whose subject
begins "T1:" (see the T1 section below).

The earlier frozen slice **21a18fd66f782c8239ec6511897c66da9c58fe5a**
("scrap-surge: freeze S1/S1b/S1c feel slice", parent c502295) is historical. The
21a18fd review does **not** apply to ee53cf8 or later: the explosion palette changed
at ee53cf8, the slinger damage at d6ba6fe, the aim geometry at 03ff521 and the metrics
API at T1. Astra, Opus and an isolated DeepSeek reviewer must review the current T1
source commit.

Scope is exactly S1 + S1b + S1c + S1d + S1e + T1. No other product scope is
authorized.

## Recovery of the unapproved expansion (2026-10-19)

The previous implementer was interrupted while `src/data.ts`, `src/sim.ts` and
`src/render.ts` carried unapproved, uncommitted edits on `codex/scrap-surge` on top
of source `ee53cf8`. Astra, Opus and an independent DeepSeek review context each
performed a full review and all three explicitly agreed to isolate the extension as
a draft branch, return the working branch to the committed slice, and review the
extension in phases later. The extension is neither merged as-is nor discarded.

Disposition carried out:

- The three files were committed unchanged to branch
  `codex/scrap-surge-expansion-draft` as an explicitly unapproved, unintegrated WIP
  draft. **Draft SHA: 8e1542ebd8f8568bcdc9f2301050cd3f85acb6e0.**
- `codex/scrap-surge` is back on committed source `ee53cf8` with a clean working
  tree. The draft commit reproduces the exact pre-recovery contents, so the original
  file hashes remain recoverable:
  data.ts `501bc2e0…dd688ef3`, sim.ts `4bcd7bdb…8cb75c498`, render.ts `75426d4d…08ca488913`.
- `/tmp/scrap-audit-ofrJ1o` (extension patch + snapshot server) is auxiliary only;
  project reproduction must use the draft SHA, never `/tmp`.

Blockers and open items are recorded in docs/reviews.md: B1 (main shop `chooseMod`,
two-wave UI and missing anchor icon still make the first shop error and block the
next wave), B2 (snapshot `npm test` 32/36 and a TypeScript build failure from a stale
Gun-level fixture), B3 (`wave2.hp` 1.35 really moves runner 19->26 / can 75->101 and
bossborn 0.65->1.2), the barrel/saw/echo new-mechanism issues, the valuable wave
table / weapon merging / new enemies that need a separate sign-off package, the
`qaStart` non-cheat note, the `refine` economy review, and the three-party-agreed S1d
fast gun 18->20 (now implemented; see below). `ee53cf8` is the post-palette-restore
slice; the old `21a18fd` review does not apply to this SHA.

## Slice S1d (approved by Astra, Opus and DeepSeek) - implemented 2026-10-19

S1d changes exactly one number: the initial can-popper (`slinger`) damage 18 -> 20 in
`src/data.ts`. No other value, mechanic, UI or draft code changed.

Numeric impact on the current two-wave build:

- A wave-1 runner has 19 hp, so one slinger hit now kills it (20 >= 19). At 18 damage
  it needed two hits. Wave-2 runners also have 19 hp, so the same one-hit kill holds
  there.
- A can has 75 hp, so it now dies in four slinger hits instead of five
  (`ceil(75/20) = 4` vs `ceil(75/18) = 5`).

Evidence: `npm test` 37/37. A new test pins `WEAPONS.slinger.damage === 20`, the
one-hit runner kill (exactly one hit, one kill) and the can's three-hits-alive /
four-hits-dead boundary. `npm run build` is clean. Astra's first-shop browser review
is saved into the repo as `tests/browser-first-shop.mjs`
(`npm run test:browser:first-shop`) for reproducibility; the browser matrix and the
independent review run after this freeze, not here.

This is still a two-wave feel-validation slice. There is **no user playtest
acceptance** of this or any version yet.

## Slice S1e (approved by Astra, Opus and DeepSeek) - implemented 2026-10-19

S1e fixes one real bug and nothing else: the weapon aim geometry. The gun aimed from
the player centre while the bullet leaves a mount offset from it, so a target level
with the player on the mount's left or right was shot straight past and never hit.
Each shot now aims from the mount toward the same predicted point; the lead factor,
target selection, range, damage, fire rate, spawn and economy are unchanged, and the
muzzle is still `mount + direction * 24`. The coil/fist direct-hit rules and the saw
are untouched, and no anchor or draft code is involved.

Review of the prior freeze `d6ba6fe` (S1d):

- `npm test` 37/37, `npm run build` clean, the browser regression 19/19 and a
  normal-play browser victory at 286 kills.
- Astra's first-shop review failed: keyboard reached the first shop on 0/3 seeds and
  touch on 2/3. Opus passed the visual work but blocked the build overall on that
  result.
- Independent DeepSeek confirmed the aiming defect and that it is a long-standing S1
  bug, not introduced by S1d.

S1e evidence on the current source: `npm test` 40/40 (left/right 140px same-row
enemies hit and killed within two seconds through the real weapon path, a single gun
reaching all eight fixed directions, and multi-slot mounts covering every direction),
`npm run build` clean, the first-shop review now passing (keyboard 3/3, touch 3/3, no
page errors) and a normal-play browser victory at 287 kills.

Correction: the S1e author first reported "browser regression 19/19", but that number
came from a stale `artifacts/browser-regression-results.json` (a pre-S1e run), not a
fresh run. The fresh regression on `03ff521` was 18/19: A2 required idle play to die,
and after S1e an idle/ordinary run can win, so the death path was no longer covered.
That stale claim is retracted; T1 replaces the idle-death assertion with an explicit
forced-defeat fixture.

The first-shop gate runs three seeds per input mode. n = 3 is only a smoke test, not a
statistical claim; a passing run does not prove every seed works. No user playtest
acceptance of any version yet.

## Package T1 (approved by Astra, Opus and DeepSeek) - implemented 2026-10-19

T1 adds one read-only observability field and one browser fixture. It changes no
simulation, rendering, numbers or shop logic.

- `src/main.ts`: `scrapMetrics.enemyPositions` returns a fresh array of fresh `{x, y}`
  copies of every enemy with `hp > 0`, including the warning-outline enemies that are
  already drawn on screen. No live enemy reference escapes the getter and there is no
  setter, so a caller cannot mutate game state through it. The existing `enemies`
  count is unchanged.
- `tests/browser-regression.mjs`: the A-run keeps the ordinary idle terminal state,
  record and retry checks but no longer requires idle play to die or to win (the old
  A2 is removed). The forced defeat path moved to a new G fixture: an ordinary
  keyboard charge toward the nearest enemy read from `enemyPositions` for fixed seeds
  2a/17/91, one run each. A run ends at a loss or at the wave-1 shop; a shop end means
  the death path was not covered (never a death) and a run still fighting at 40s is a
  real timeout that fails. The group must contain at least one real loss at 0 hp with
  the failure UI visible and a working retry. A new H check proves the returned
  `enemyPositions` snapshot is a copy that cannot mutate live state.

At least one loss proves the defeat path is reachable. It does not prove every seed
loses, and it is not a difficulty or acceptance judgement.

T1 evidence (fresh runs on the T1 commit, no reused artifacts): `npm test` 40/40,
`npm run build` clean, `npm run test:browser:regression` 23/23 - the G charge fixture
lost all three fixed seeds 2a/17/91 at 0 hp with the failure UI and a working retry,
while the ordinary A-run won normally (305 kills, hp 7) - and
`npm run test:browser:first-shop` keyboard 3/3 plus touch 3/3.
