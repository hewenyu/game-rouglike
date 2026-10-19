# Status
## Review candidate: expedition20 implemented, unverified (2026-10-19)

The working tree contains a runnable `expedition20` implementation for three-party
code/visual/failure review. It is **not user-accepted and not validation-complete**.
The normal page defaults to `expedition20`; `?mode=slice` keeps the approved two-wave
slice. No balance tuning was made to force a green result.

The candidate now has 84/84 non-browser assertions (the historical 47 slice assertions
unchanged, plus 37 expedition assertions), a clean build, and a preserved review-only
20-wave keyboard harness at `tests/browser-expedition-review.mjs`. That harness has
**not been run** and is not a victory. The browser regression gained two checks, so its
new denominator is **25**, not the historical 23; no 25/25 claim exists until a fresh
run is recorded.

Unverified at this review freeze: no ordinary-input 20-wave victory; no real
ordinary-input `ember` run; post-mode-pin regression/mobile expedition interaction
coverage; simulation-CPU fixed-step measurement; physical touch/audio/user feel.
Three development attempts failed before/at wave 10/13: wave 13 death at 0 hp and two
wave-10 boss deadlines. They are development evidence only; their old `spawnCount`
field used timer-only accounting.

Immutable development attempt directories remain under
`artifacts/expedition-attempts/`, but are intentionally excluded from Git because
screenshots/traces are large. The older attempts predate dirty/fingerprint provenance
and cannot be retroactively pinned to exact source hashes; do not infer them from the
docs-only `058951f` revision. Future attempts record `dirty`, changed paths and
source/test SHA-256 fingerprints in each result.

Approved implementation spec: **058951fc84994abb8ee24a2c587bb9232c1c1ccd**.
Astra, Opus, author DeepSeek and independent DeepSeek explicitly approved this same
text for full `expedition20` implementation. This is approval of the plan, not user
acceptance. The runnable expedition candidate was frozen at
**018f66ed18963870e55578edf97f9c3812a16ad2** for three-party implementation review;
the current working tree adds the presentation/UI fixes and tests described below and
is not yet validation-complete.

User played and rejected Nightfold: not satisfying, wants a Brotato-like roguelike.
The rejected prototype has been deleted under the user's direct authorization.
Current project: Scrap Surge, a scrap-armored hermit crab with automatic multi-weapons.

Product goal lives in memory/goal.md: an original, runnable, replayable single-player
browser auto-combat roguelike targeting a 10-20 minute normal run with genuine
positive-feedback builds. The user's latest goal supersedes the older "stop before
demonstrating" note; the two-wave build is now the first slice toward that goal.

Current state: the two-wave feel-validation slice passed the three-party slice gate at
frozen candidate **8cb0e8f104d4150ceca8f8660ae6a6c62972e208** (see the sign-off
below). The user then played it and set a new highest-priority target: **at least 20
waves**, with the build forming gradually and the over-fast / over-slow build pace
brought under control (see memory/goal.md). The full 10-20 minute goal is **not**
complete; there is **no user acceptance** of the visuals or feel yet - the new
feedback only covers wave count and build-formation pacing. The 20-wave requirement is
the user's explicit goal, not a pending proposal; what still needs three-party approval
is the concrete implementation plan. The current page is still the two-wave slice.
F0 + T2 were approved by all three parties at `2746a01`. The concrete 20-wave plan is
now the draft `docs/expedition20-proposal.md` (**unapproved, unimplemented**; no source,
test or UI change), awaiting same-text three-party sign-off.

An F0 repair package (boss slot reservation, honest boss-spawn flag, read-only
instruments) is implemented on top of the slice. The F0 code checkpoint is commit
**42f4ff8f6163f6565ab4f939de147efa5a7b0564** (see the F0 section below). F0 source and
the T2 test revision at **5db93f97785e1b23e8c1a8723977bffe66d249ee** have completed the
three-party scope review; only the final docs wording awaits review at the new docs-only
SHA. F0 leaves ordinary combat, the waves, the weapons and the popcorn mechanic
untouched.

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
independent review. That "review pending" line is historical: the frozen slice was
subsequently reviewed and approved by Astra, Opus and an isolated DeepSeek at
`8cb0e8f` (see the sign-off below), so it no longer describes the current state.

This is a feel-validation slice, not a claim of a finished 10-20-minute game.
User acceptance of this version is still pending.

## Frozen candidate under review

The current source on branch codex/scrap-surge is baseline **ee53cf8** (the
post-palette-restore slice) plus S1d (slinger damage 18 -> 20), S1e (weapon aim fix)
and T1 (read-only `enemyPositions` metrics plus a forced-defeat browser fixture). The
candidate reviewed and approved by all three parties is
**8cb0e8f104d4150ceca8f8660ae6a6c62972e208**; the prior freezes are
**d6ba6fef5e117d342f1ac594d7d9ff2858b6bfd1** (S1d) and
**03ff521d8da70584751b3fc1192425e12f82ccc7** (S1e). The F0 repair package sits on top
of that approved candidate at the checkpoint recorded below.

The earlier frozen slice **21a18fd66f782c8239ec6511897c66da9c58fe5a**
("scrap-surge: freeze S1/S1b/S1c feel slice", parent c502295) is historical. The
21a18fd review does **not** apply to ee53cf8 or later: the explosion palette changed
at ee53cf8, the slinger damage at d6ba6fe, the aim geometry at 03ff521 and the metrics
API at T1. That "must review the current T1 source commit" requirement is historical
and has since been completed: Astra, Opus and an isolated DeepSeek reviewed and
approved `8cb0e8f` (the T1 commit) as recorded in the sign-off below.

Scope is exactly S1 + S1b + S1c + S1d + S1e + T1. No other product scope is
authorized; expansion beyond the two-wave slice still needs its own review.

## Three-party slice-gate sign-off (2026-10-19)

Frozen candidate **8cb0e8f104d4150ceca8f8660ae6a6c62972e208** (S1 + S1b + S1c + S1d +
S1e + T1). Astra, Opus and the independent DeepSeek each reviewed this exact SHA and
explicitly approved the slice scope. Each ran its own session; the death samples below
are registered per party and must **not** be merged into one "3/3" claim.

- Astra: `npm test` 40/40, `npm run build` clean, `npm run test:browser:first-shop`
  keyboard 3/3 + touch 3/3, `npm run test:browser:regression` 23/23. G fixture: 2a
  reached the shop, 17 and 91 lost (2 deaths), retry reset normally. Normal browser run
  won at 308 kills, hp 9, chain peak 18, pending peak 14, no page errors. Environment
  Chrome 155, macOS 26.6.2, Apple M4, 1440x960 DPR1; raw rAF final 1800 samples median
  and p95 16.7ms - a headless frame-interval measurement, not GPU, phone or peak-load
  acceptance.
- Opus: same SHA approved. `npm test` 40/40, `tsc` clean, regression 23/23. G fixture:
  2a and 91 reached the shop, 17 lost (1 death). H copy-isolation passed. Its `03ff521`
  visual check is inherited as valid because the render/css/sim/data blobs are
  unchanged at this SHA, so no new screenshots were taken; earlier ordinary play won
  four runs.
- Independent DeepSeek: same SHA approved, no blocker. `npm test` 40/40, `build`
  clean, first-shop 6/6, regression 23/23. G fixture: 2a and 17 reached the shop, 91
  lost (1 death). H passed.

Gate reading: the group gate is "at least one real loss at 0 hp", a limited
reachability check. It is not proof that every seed loses, and it is not a difficulty
measurement. The whole group could still end with zero deaths on an unlucky timing run;
that instability is recorded, not hidden.

Slice gate outcome: **passed** for the two-wave feel-validation slice. This is not the
full 10-20 minute goal, which is **not** complete. There is **no user acceptance** of
this or any version yet, and **no expansion beyond the slice is authorized**.

## F0 repair package (2026-10-19)

F0 is the three-party-approved repair + instrument package (full scope and approval in
docs/reviews.md). It changes no ordinary combat rule: the waves, the weapons, the
popcorn mechanic, the camera and the visuals are untouched, and the expansion draft
`8e1542e` is not merged.

- Boss slot honesty: `bossSpawned` and the `wave` event are set only when the boss
  really spawns. While wave 2 is past the 18s trigger and the boss is pending,
  `spawn()` holds one slot for it on both the timer and pocket paths (the three RNG
  draws keep their old order). A full arena waits for a real death instead of deleting
  an enemy or raising the 180 cap, and a rejected attempt retries on the next step.
- Read-only instruments, all per run (reset on a new `Game`, never advancing while
  paused): `shootAcceptedPlayer`, `shootAcceptedEnemy`, `shootRejectedPlayer`,
  `shootRejectedEnemy`, `bulletPeak`, `popcornBudgetSkippedPickups`. `shots` keeps its
  success-only meaning. The popcorn skip counter fires only for a real target pickup
  whose per-step 8-bullet budget is already spent; it draws no RNG, does not sort and
  does not change target choice. `scrapMetrics` exports these as scalars only.
- Author evidence at the F0 checkpoint: `npm test` 47/47 (40 original + 7 new F0
  tests), `npm run build` clean, `npm run test:browser:first-shop` keyboard 3/3 +
  touch 3/3, `npm run test:browser:regression` 23/23 (incl. the H `enemyPositions`
  copy check and the G death-path group). Raw logs (auxiliary) in
  `/tmp/f0-logs-final-20261019T072230/`; the commands themselves are reproducible from
  this repository.
- F0 code checkpoint: `42f4ff8f6163f6565ab4f939de147efa5a7b0564` (this entry ships with
  it; the frozen tip adds only this SHA record).
- Three-party review of `a434f12` has since returned: Astra (47/47, build clean, normal
  victory 287 kills hp 10 chain 13 pending 14, first-shop 6/6, three fixed-seed hashes
  identical to `6780128`), Opus (47/47, `tsc` clean, first-shop 6/6, but regression
  **22/23 exit 1** - all three G seeds ended at the first shop with 0 deaths, a real
  retained failure), and independent DeepSeek (47/47, build clean, ordinary run's five
  checks passed, first-shop 6/6, regression 23/23 with one real 0 hp death). All three
  approved the F0 source and flagged the same documentation gaps, which the T2 package
  repairs. Per-party evidence is in docs/reviews.md.
- The F0 instrument sample on Astra's normal run was 598 accepted player + 8 accepted
  enemy shots = 606, 0/0 rejected, projectile peak 60, popcorn skips 0. That is a
  limited sample, not a performance or budget-sufficiency result.
- The G fixture is probabilistic and timing-sensitive: 22/23 and 23/23 are two honest
  samples of the same check set, and neither is a stability claim. None of this is user
  acceptance.

## T2 browser-fixture revision (tests-only, 2026-10-19)

T2 is a tests-only package agreed by Astra, Opus and DeepSeek. It changes only the G
block of `tests/browser-regression.mjs`; A-F and H are untouched, and no source,
package, data or visual file changes.

The old G fixture treated the first shop as terminal, so it only ever covered wave 1
and its "at least one 0 hp death" gate depended on luck. T2 keeps the same strategy
(70ms poll, +-6px deadzone, nearest-enemy charge from read-only `enemyPositions`) for
fixed seeds 2a/17/91, one run each, but makes the shop non-terminal: buy **no weapon**,
take exactly `magnet` + `popcorn`, then keep charging through wave 2 under a single
100s wall cap (normal play is at most 20 + 1 + 50 + 1 = 72s), with no per-phase timer.

`endReason` is `death` (lost at 0 hp - the only death coverage), `deadline` (lost with
hp > 0, boss alive at the 50s limit - recorded as not covered), `won`, or `timeout`
(still fighting at 100s - a real failure). Only runs that actually reach the shop
assert the exact mods and gun contract (exactly `magnet` + `popcorn`,
`gunsAtShop === 1`, `gunsAtWave2 === 1`); no page errors applies to all runs. A 0 hp
death also requires the failure UI and a retry reset to fight / 10 hp / 0 kills / 1 gun
/ 0 mods. The group still requires at least one real 0 hp loss. The fixture remains
probabilistic and timing-sensitive - a green group run covers these three seeds only
and is not a stability claim.

Historic diagnostics are kept as history, not as T2 passes: Opus's `/tmp` 95s run
produced 2 deaths and 1 win without the mod/gun assertions (seed 91 reached wave 2 and
won, a finite observation only), and an independent diagnostic had all three seeds die
in wave 1 without reaching the new shop branch.

The first author run of this fixture was a defective revision and is retained as such:
it failed a real wave-1 death (seeds 17/91, both genuine 0 hp losses with working
retries) because the shop assertions were applied unconditionally, and its
`waitForFunction` passed the options object as the `arg` parameter so the 5s timeout was
never applied. Both were fixed before freeze (shop contract only when a shop was
reached; `waitForFunction(fn, undefined, { timeout })` with no swallowed error; `won`
records "death path not covered"). The raw log of the defective run is
`/tmp/t2-logs-20261019T074132/browser-regression.log`; the corrected run is a new
verification, not a re-run chosen for a pass.

Corrected T2 author run (once, no retry): **23/23, exit 0**
(`/tmp/t2-fixed-20261019T074505/browser-regression.log`). Seeds 2a and 17 reached the
shop, took exactly magnet + popcorn, kept one gun, entered wave 2 and died at 0 hp
(203 kills / 45.1s and 217 kills / 47.8s). Seed 91 died at 0 hp in wave 1 (68 kills /
19.0s) and correctly recorded the shop path as not covered instead of failing. All
three deaths showed the failure UI and a retry that reset to fight / 10 hp / 0 kills /
1 gun / 0 mods, with no page errors; the group gate counted 3/3 real 0 hp deaths. This
is one three-seed sample of a probabilistic, timing-sensitive fixture, not a stability
claim and not user acceptance.

Three-party single independent runs of the same source (`42f4ff8`) + T2 test revision
(`5db93f9`) all passed 47/47 rules, a clean build and 23/23 regression, but diverged in
G: Astra saw 2a wave-2 won hp 4, 17 wave-1 lost hp 0 (retry OK), 91 wave-2 won hp 3
(1 death); Opus saw 2a wave-2 lost with 17 and 91 wave-1 lost (3 deaths); independent
DeepSeek saw all three wave-2 lost (2a 188 kills / 42.1s, 17 202 / 41.7s,
91 238 / 49.1s) with strict shop mod/gun matches, no page errors and normal retry. The
divergence is recorded, not smoothed over: the fixture stays probabilistic and
timing-sensitive, and this does not overwrite Opus's earlier genuine 22/23 failure on
the slice-era G. Model review is not user acceptance.

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
page errors), and, per Astra's own run on `03ff521`, a normal-play browser victory at
309 kills, hp 9. The earlier author figure of 287 kills was not re-executed and is not
adopted.

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

This T1 description of the G fixture is historical and **superseded by T2**: the
40s cap and the wave-1 shop as a terminal end are old rules only. The current fixture
is non-terminal at the shop, uses a single 100s cap, and classifies
`death` / `deadline` / `won` / `timeout` as described in the T2 section above.

At least one loss proves the defeat path is reachable. It does not prove every seed
loses, and it is not a difficulty or acceptance judgement.

T1 evidence (fresh runs on the T1 commit, no reused artifacts): `npm test` 40/40,
`npm run build` clean, `npm run test:browser:regression` 23/23 - the G charge fixture
lost all three fixed seeds 2a/17/91 at 0 hp with the failure UI and a working retry,
while the ordinary A-run won normally (305 kills, hp 7) - and
`npm run test:browser:first-shop` keyboard 3/3 plus touch 3/3.
