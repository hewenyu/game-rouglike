# Status

The P3A finite natural-simulation diagnostic is complete on frozen production
source `447af109d4a07d218ae33466c75bc5b1266b092c`. No `src/`, tuning, HP, wave,
renderer, audio, dependency or rule change was made. The committed `a5997bf`
harness ran 21 primary cohort/seed samples plus one deterministic
weapon-only/seed-1 replay; the replay matched the full canonical record. Outcome:
**4/21 wins, 17 losses**, comprising **15 deadline losses, 2 zero-HP losses and 4
wins**. A positive-HP loss is not "during boss spawn": the 15 such runs crossed
the actual boss-wave `duration + 15 s` limit without killing the boss. Weapon-only
seed 1 was W15 at 60.0167 s, HP 12/14, boss not killed.

P3A provenance is policy `e78ef5512c0a968bde0ebe080f4532bd78cfaf7c0ff08468d2f21de6640e2353`,
driver `e5c398e9658bfc014014c753e2682fcf9e6fabe8019247ddef148ef530a7d202`,
successful harness `11456c85c3f0b7f50a47951c6c0214fbaaa218ab43b63bcb466d4a0208b1635d`,
source manifest `7ba343896f610d805e462c877babc99bc8e44478fb355727f72c8b81a5bc3a92`,
and trace `6df30a864a262b0e858c2d826b18600d22df59eaa03feff90d41d819519f8bc2`.
The first harness attempt failed before any cohort completed with
`TypeError: Cannot read properties of undefined (reading 'everSpawned')`; the
harness-only fix is preserved as commit `a5997bf`, and the failed attempt is not
reported as a cohort result. The tracked compact report is
`docs/data/p3-measurement/report.json`; its bounded summary and detailed
limitations are in `docs/data/p3-measurement/report.md` and
`docs/p3-measurement-plan.md`.

Weapon-only exposed a full-slot / missing Tier-I partner purchase bottleneck
rather than a scarcity conclusion: seed 1 ended with six Tier-II guns, 903 cash,
426 spent and no accepted reroll; seeds 42/145 ended with five Tier-II plus one
Tier-III gun. None reached Tier-IV. A future sale or partner-selection policy is
a next three-party design question, not a repair to this measurement or an
authorized production tuning change. Item-led actual damage attribution remains
missing because the public state exposes no per-hit source ledger; cohort wins
and item counts do not prove it. P2 user acceptance was not given. Full W20
browser play, five late-route viability, render performance, audio/mobile/Safari
behavior and user feel remain open gates.

P2's bounded checkpoint `6ba7844` had independent ordinary keyboard/CDP-touch
preview verification: root 173 tests/build and normal 2/2,
`/tmp/astra-p2-6ba7844/items/report.json`; Opus 173 tests/build and normal 2/2,
`/tmp/opus-6ba-preview/report.json`; independent DeepSeek 173 tests/build and
normal 2/2, `/tmp/ds-6ba-preview/report.json` (SHA-256
`259c119f47084157a1cfe428f88a9d9bf6d6479d6022eaeff4509f1f771d8c82`). This is
bounded P2 evidence, not P3 balance approval or user acceptance.

The current bounded follow-up repairs the three R5 preview defects that fresh
actual Opus and independent DeepSeek reviews found after R1-R4 passed at
`e478497`. Shop sold state now suppresses only its own `.shop-item-section`;
same-index reward and chest cards still project the unclaimed item. `siphon-bag`
uses a separate dimensionless readout (`伤害倍率 ×1.25`) instead of being
rendered as damage `1.3`. Item cards keep one selection instruction, with
concrete deltas where available. The repository's seed-1 ordinary-input browser
fixture buys shop index 0, inspects unclaimed reward index 0 and asserts
projected `magnetic-return` damage/radius plus the siphon multiplier.

This is a presentation/test repair only. It changes no formula, combat,
simulation, HP, wave, reward RNG, renderer, audio, CSS, balance, dependency or
frozen-slice behavior and injects no state, timer or invulnerability. The old
172-test and browser evidence remains attributed to `e478497`; exact final-tree
evidence is **173/173** tests, clean build and clean diff check, plus the
ordinary-input browser fixture **2/2** with zero page errors. The frozen
follow-up source SHA is `447af109d4a07d218ae33466c75bc5b1266b092c`. Fresh Opus
and independent DeepSeek review of that SHA, root integration review and user
acceptance remain open.

The frozen P2 repair candidate replaces the Stage D checkpoint with the bounded
R1-R5 repair agreed by Astra, Opus and independent DeepSeek on `27c3503`.
`src/sim.ts` now generates exactly three distinct expedition weapon offers and
makes shared rerolls atomic, exact-set based and independent of reward RNG.
`src/items.ts` exposes a pure central proc preview; `src/main.ts` uses readable
mechanism language, puts full selected-item detail directly after its group,
keeps `厚壳` focused on its own derived change, and no longer shows item codes or
unexplained `P`. The 390px card row keeps all three family labels visible.
Popcorn `processed` is explicitly consumed fuel units; actual admitted and
rejected shots remain separately observable. Balance, HP, waves, audio and the
frozen slice renderer are unchanged.

At the repair verification checkpoint, `npm test` passes **172/172**,
`npm run build` is clean and `git diff --check` is clean. On dev server `4194`,
the P2 item fixture passes **2/2** keyboard/CDP touch with zero page errors and
real popcorn shots (49/98 keyboard, 46/92 touch; 0 rejected). The W3 visual
fixture passes **2/2** in both modes with a natural 360 HP / radius 28 elite,
physical chest, frozen two-choice chest and claim. The lifecycle fixture passes
6/6: pause, resize pause, refresh/mute, a real W3 0 HP loss, one completion
record and clean retry. Latest reports and hashes are recorded in
`docs/testing.md`; these are author-run headless evidence, not independent review.

The frozen `27c3503` review is blocked by the R1-R5 findings. Fresh Opus and
independent DeepSeek review of this repair SHA is still required, as is root
integration review. The earlier P1 popcorn "combat defect" was rejected by fresh
adjudication rather than reported as fixed: the approved behavior consumes fuel
at the 420-shot cap, and only its naming/tests/docs were repaired. No ordinary
input W20 victory, W16-W20 saturation, late five-route viability, physical
phone/Safari behavior, audio-mix acceptance, independent review or user
acceptance is established.

Stage D of P2 connects the existing elite, chest, trail and item simulation data
to the expedition renderer and audio. `src/render.ts` now accepts an optional
`ExpeditionPresentation`, draws the real elite position/HP and warning, physical
chests and trail points, and preserves the frozen default enemy draw path.
`src/audio.ts` gives elite, chest and item purchases distinct cues, and
`src/main.ts` routes the elite warning once from read-only state because the
simulation currently does not emit its declared `elite` event.

Stage D is an implementation checkpoint only. P2 is not complete or independently
reviewed; P3 balance, five-route viability, full-run behavior, performance and
user feel remain pending. The stage handoffs are
`docs/p2-stage-b-handoff.md`, `docs/p2-stage-c-handoff.md` and
`docs/p2-stage-d-handoff.md`; the obsolete-assertion ledger is
`docs/p2-test-migration.md`. The contract source hash remains
`9e1097315911b3e6fb9b7c14900cc3fae1b92f24b3b3b1e1bcb9a7b8cbf84cde`.

At this checkpoint `npm test` passes **166/166**, `npm run build` is clean and
`git diff --check` is clean. Existing `tests/browser-p2-items.mjs` and the new
`tests/browser-p2-visuals.mjs` each pass **2/2** on server `4192` with ordinary
keyboard and real CDP touch and no page errors. Both visual runs reached W3,
observed an elite with `maxHp 360` and `radius 28`, killed it through combat,
collected the physical elite chest, and reached the frozen two-choice rest.
Artifacts are `/tmp/p2-stage-d-existing/report.json`,
`/tmp/p2-stage-d-visuals/report.json` and the final-tree rerun
`/tmp/p2-stage-d-final-visuals/report.json`.

The natural milestone seed `2` run completed on desktop with **404 real trail
observations** (`/tmp/p2-stage-d-trail3/report.json`). Its touch attempt failed at
W1 because `.reward-row` disappeared during a fixture race, so only desktop
real-trail browser evidence is claimed. The frozen enemy draw hash remains
`4ba5006bbeb0835ae7fc1d9ce8deecf1f41926250d2303ebfe1be15e02d80abf`.

No Stage D evidence establishes audible quality or mix acceptance, visual
acceptance, an ordinary-input W20 victory, W16-W20 or physical-device
performance, cohort balance or item-led late output. Browser runs were headless,
and the stage commit still needs independent review on its frozen SHA.

P1 documentation commit `6d15c7f6f335809773bf3bdd051851a9328cbe45` completed
fresh Opus and DeepSeek review. Stage A of P2 contract v2 implements the pure
20-item catalog and rule layer in `src/items.ts`. Stage B integrates the rules
into the expedition simulation: inventory, stat rewards, core/item offers,
purchases, chests, elites, item procs, source fuel/cash accounting and bounded
queues. Stage C now gives those systems a runnable rest interface with separate
reward, weapon, item, inventory and stat sections, all 20 item silhouettes,
rarity/unique/cap/dependency text, prices and central-derived previews.

Stage C is an implementation checkpoint only. P2 is not complete or independently
reviewed; P3 balance over 20 waves, five-route viability, full-run browser
behavior, performance and user feel remain pending. The stage handoffs are
`docs/p2-stage-b-handoff.md` and `docs/p2-stage-c-handoff.md`; the obsolete-
assertion ledger is `docs/p2-test-migration.md`. The contract source hash remains
`9e1097315911b3e6fb9b7c14900cc3fae1b92f24b3b3b1e1bcb9a7b8cbf84cde`.

At this checkpoint `npm test` passes **156/156**, `npm run build` is clean and
`git diff --check` is clean. The ordinary-input `tests/browser-p2-items.mjs` run
on dev server `4192` passed keyboard and real-CDP touch: each claimed the natural
W1 `scrap-popcorn`, observed actual W2 popcorn queue processing (50 keyboard / 46
touch at the W2 rest read), then bought the natural W2 `厚壳` for 12 scrap. Max HP
went 10 -> 12 and the central derived move factor went 1.00 -> 0.96. At 390px the
document and overlay remained 390 wide, no item card overflowed and visible P2
rest actions measured at least 44x44. The mobile P2 footer stays static so lower
cards remain fully reachable, and touch buys through the selected-item detail.
No page errors occurred. Artifacts are in `/tmp/p2-items-browser/`; exact counts
vary with browser timing.

No Stage C evidence establishes elite/chest visual acceptance, new item audio
identities, an ordinary-input W20 victory, W16-W20 or physical-device performance,
cohort balance or item-led late output. The stage commit still needs independent
review on its frozen SHA. The UI was authored in `src/main.ts` and `src/style.css`;
the browser fixture is `tests/browser-p2-items.mjs`, exposed as
`npm run test:browser:p2-items`.

P1 code at `db0cd9c71e66584515e634a9e55298255710e26e` is approved by root, the
fresh actual Opus task `p1_opus_final_once` and the fresh actual independent
DeepSeek task `p1_deepseek_final_once` for foundation/presentation only. The docs
repair now needs a fresh read-only final review. Original `4188`/`19a66dd` remains
unchanged; runtime `4190` is the ROOT static `db0` build. No performance claim.

P1 current structure: six weapon slots from W1, automatic same-ID/same-tier
fusion through IV and damage-only tier scaling. The starting gun is paid 0; an
18-scrap purchase is paid 18; two paid 30-scrap coils merge into one paid-60
weapon with money charged once. No accounting change is required. Because an
incoming weapon either occupies an empty slot or fuses positively, the state
cannot exceed six slots: `6 + 1 - 1 <= 6`. The claimed over-capacity-after-fusion
defect is rejected by this fresh adjudication. The next design questions are P2
items and their measured role, not changes to this accounting.

Cards use the compact nominal label `理论DPS`, with one shared shop note stating
single-target, all-pellets and saw-contact qualifications. The owned-slot
heading is `面板数值`; shotgun, saw and rocket effect tags are `5 弹丸`, `环绕`
and `范围`. Labels wrap without forcing a two-character vertical column. Enemy
hurt bars are render-only additions for expedition bag/runner/chip; can,
splitter and spitter retain their exact previous bars, and the default slice
renderer remains frozen.

Render-order fix after `3305687` at
`01a9bf13a69ceaeeca9263ec9def1d2ba212622a`, with completed three-party
PLAYTEST-only review: every enemy projectile draws once above blasts and the chain
readout with unchanged geometry, 3px INK outline. Tests cover a synthetic shape
matrix and the first 60 rendered steps; this is bounded nonmutation evidence, not
full slice equivalence.

## P1 code approved at `db0cd9c` (based on `19a66dd`, 2026-10-19)

This is the bounded P1 structural candidate, not an item-system implementation,
late-balance approval or user acceptance. It changes expedition weapons to six
slots from W1, same-ID/same-tier automatic merging through IV, damage-only tier
scaling, atomic full-slot purchase previews, committed purchase-result records,
and the associated storefront/HUD presentation. Slice behavior remains separate
and is pinned by the comparator below. P2 item rarity, stackability, chests, boss
item rewards and economy assertions are recorded in `memory/goal.md` and
`docs/design.md`, but no P2 item code, third mod slot, HP tuning or content
expansion is part of this freeze.

P1 repair evidence for the approved code:

| Check                             | Result                                |
| --------------------------------- | ------------------------------------- |
| Unit suite                        | **105/105**                           |
| Production build                  | **clean**                             |
| Merge fixture on isolated `4192`  | **2/2**, no page errors               |
| 390px layout after compact labels | **no document/card/summary overflow** |
| Diff hygiene                      | `git diff --check` clean              |

The repair's final merge report is
`/tmp/p1-compact-qa4-4192/report.json`, with desktop/touch before/after
screenshots in the same directory. Keyboard and touch completed with no page
errors, the I-to-II slinger purchase spent 18 scrap and displayed damage 40, and
the final 390px screenshot confirms the shared DPS note plus compact labels fit.
The DOM check also measured `documentScrollWidth === viewportWidth === 390`, no
card overflow, and every summary row at equal `scrollWidth`/`clientWidth`
(131px four-card rows, 61px owned row). This is a bounded presentation/merge
check, not screenshot acceptance over every state or a full W20 run.

The following prior evidence belongs to predecessor `c674b4f`, not to repairs
made after it. It was not rerun after the final repair and is not relabelled:

| Carried evidence from `c674b4f`           | Result                                            |
| ----------------------------------------- | ------------------------------------------------- |
| First-shop ordinary input on `4190`       | **6/6** (keyboard 3/3, touch 3/3), no page errors |
| Input lifecycle on `4190`                 | **7/7** (keyboard 4/4, touch 3/3), no page errors |
| Earlier first-merge desktop/touch fixture | **2/2**, no page errors                           |
| Full slice comparator vs `19a66dd`        | **0 differences**, 3,422 steps per seed 42/23/145 |

The four grouped invariant additions requested before freeze are present as
distinct tests: atomic cascade behavior with paid aggregation, rejection that
leaves guns/offers/sold/events/records/money untouched, repeated buy/sell with
no scrap creation or duplicate card, and a real IV projectile collision. The
existing profile test is not relabeled as satisfying actual IV firing. The
cascade is a six-slot scenario whose incoming I merges through one equal arm
to IV while preserving the other equal arms; it is not a claim that six I
items collapse into one IV.

Author artifacts:

- First-shop: stdout from
  `BASE_URL=http://127.0.0.1:4190 node tests/browser-first-shop.mjs`; all six
  runs reached `shop` with empty `errors`.
- Lifecycle: stdout from
  `BASE_URL=http://127.0.0.1:4190 node tests/browser-input-lifecycle.mjs`;
  keyboard and touch both reached W7 interlude/W8 movement.
- Merge fixture: `/tmp/astra-growth-merge-1792469184/report.json`, with
  `keyboard-shop-before.png`, `keyboard-shop-after.png`,
  `touch-shop-before.png` and `touch-shop-after.png` in the same directory.
  It uses ordinary inputs and verifies the sold card's committed
  `合成 II / 攻击 40`, the owned II profile, and the 18-scrap transaction.
- Slice comparator: `/tmp/astra-19a66dd-compare/compare.ts` and
  `/tmp/astra-19a66dd-compare/result.jsonl`. Each seed matched on every
  observed state/event/RNG field for 3,422 steps and ended `won`; old/new
  kills were 280/280, 289/289 and 290/290, HP 4/4 on all three, and combat
  draw counts 2105, 2124 and 2123. This is fixed-input simulation evidence,
  not a browser or human sample.

No P1 evidence establishes a full ordinary-input W20 victory, current
item-led late output (items are not implemented), boss-window/damage/survival
cohorts, physical-device performance, Safari compatibility, audio-mix acceptance
or user feel. Independent review of this exact commit remains required; author
runs do not satisfy it.

The comparator covers **3 seeds x 3,422 steps** only, with no weapon purchases.
Its loadout is the starting slinger plus magnet and popcorn; it does not
represent all loadouts, arbitrary input or browser play. The old next gate of
waiting for user feedback is superseded by the currently authorized bounded
redesign/repair. No current performance or W20 victory claim follows.

## Current test checkpoint: `b4c87e3` (2026-10-19)

`npm test` passes **93/93**: 89 original rules assertions, 2 render-order
checks and 2 W20 lifecycle checks. Source is unchanged from
`fdfabaee278c9e0f16f76737328e176a3aefbf43`. The 2 W20 tests use explicitly
marked synthetic clock boundaries and prove only the spawn/warning, real boss
death, one-sweep victory and >90-second deadline lifecycle; they do not prove a
normal 20-wave win, a completed final-boss fight, difficulty or user acceptance.

The earlier `9e2ac556cfc0d095f3e8637ad094905775fef1db` loss fixture reached
HP 0 at `waveTime 74.18333333333236`, before `90s`, so its `lost` result was a
false-positive for deadline coverage. The corrected
`b4c87e3340c654f89a2807edf7fde197eeb28fec` fixture first proves no boss before
57s, then proves the spawn and warning behavior, then checks that `90s` remains
`fight` with HP above zero and a live boss; the next step crosses the deadline
and settles exactly one `lost` / `end`. Prior **89/89** and **91/91** counts
remain historical and their logs are unchanged. Three-party bounded approval
for the `b4c87e3` tests is complete, with no pending test-review claim. This
docs-only checkpoint required review after freeze. Its old next gate of user
feedback from a full run is historical after the user's authorized redesign and
is not the current action.

## Simulation/input baseline: `db74a8c` (2026-10-19)

This is the final 20-wave simulation/input baseline for user playtesting. It is
runnable and **not user-accepted, validation-complete or goal-complete**. The
normal page opens `expedition20`; `?mode=slice` preserves the approved two-wave
feel slice. The completed three-party review is historical PLAYTEST-only
evidence, not review of the render-order fix or final goal acceptance. Its
bounded evidence is in `docs/reviews.md`.

The historical test and diagnostic baseline is
**851cd13faa17f930cbeb9cbf28eff3eeafe17073** plus its cleanup commit. The
subsequent render-order fix changes rendering only; it does not change
simulation, input, collision, waves, economy or recovery rules, so the historical
rule, input and slice-equivalence evidence remains attributed to those recorded
baselines. The model review is not user acceptance or goal completion.

### Current rules

- The expedition has 20 waves, with 19 consolidated rests and no quick-choice
  stops; rest rows contain the mechanism, stat or chest reward, weapon, item and
  inventory surfaces.
- Entering W1-W10 restores 3 health; entering expedition W11-W20 restores 4.
  Slice entries still restore 3. The destination wave decides the amount, and
  recovery is capped at 10. Lost and won states cannot be revived.
- Movement input is accepted in `fight`, `sweep` and `interlude`, so a direction
  pressed during the automatic transition moves immediately in the next wave.
  Rest, legacy quick-choice and paused phases still reject movement.
- `shootAcceptedEnemy` counts enemy projectiles admitted before the shared
  420-projectile cap. It does not count hits or attribute player injury.

### Evidence for the simulation/input baseline

| Check                                     | Result                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| Unit suite                                | **89/89**                                                      |
| Production build                          | **clean**                                                      |
| Browser regression on `851cd13`           | **24/24**, root-reported                                       |
| Input lifecycle on `f7d0741`              | **7/7 author**, independent DeepSeek **7/7**                   |
| Three-seed slice equivalence on `851cd13` | **0 differences**                                              |
| Simulation CPU diagnostic                 | W1-W15 only; p95 **0.060041 ms**, max **1.301042 ms**          |
| Ordinary ranged run on `851cd13`          | **lost W20 during boss spawn; boss fight unobserved**, 0 HP    |
| Seed-42 paired diagnostic on `db74a8c`    | **40,860/40,860 equal**, 45 accepted, W20 loss at **39.917 s** |

The paired diagnostic is one fixed simulation body, not a browser or human
sample. It matched control and observed state, events, RNG values and cumulative
RNG counts on every step; damage was 45 accepted (contact 3, enemy bullet 42)
and 32 ignored. It does not prove one cause of all W20 damage or establish boss
balance, shooter identity or human difficulty. Method, W20 timeline and artifact
hashes are in `docs/testing.md`.

The unit, build, slice-equivalence and browser-regression checks ran on
`851cd13`. The named 7/7 input-lifecycle log is the **author DeepSeek** run on the
parent `f7d0741`, before the recovery-only change. The separate root-verified
independent DeepSeek artifact is
`/tmp/astra-f7d-review.B5iCbP/f7/scrap-surge/artifacts/input-lifecycle-results.json`
with SHA-256
`241fea027757a430d2088b5f5776c1a1f9904738524c4853b82f434836f1a6f3`;
it records 7/7 with keyboard and touch runs completed. These are finite checks,
not a W20 acceptance claim.

The lifecycle log is
`/tmp/astra-input-f7d0741-evidence/lifecycle-f7d0741.log`. It separately covers
keyboard and real-CDP touch: normal progression to the W7 interlude, a newly
held direction moving immediately in W8, rejection in quick/shop/pause, and no
page errors.

The slice-equivalence log is `/tmp/astra-851cd13-slice-equivalence.log`. Against
the approved pre-expansion slice at
`058951fc84994abb8ee24a2c587bb9232c1c1ccd`, all three seeds finished with zero
per-step differences:

| Seed | Outcome | Kills |  HP | Chain peak |
| ---- | ------- | ----: | --: | ---------: |
| 42   | won     |   307 |  10 |         20 |
| 23   | won     |   308 |   7 |         18 |
| 145  | won     |   307 |  10 |         18 |

This is evidence that the late recovery change did not alter the slice. It is not
new coverage of the expedition.

The CPU diagnostic is `/tmp/astra-851cd13-perf.json`. It measures only
`Game.step` for seed 42 through W1-W15 on an Apple M4 with Node 26. It is **not**
FPS, W16-W20, mobile, render, audio, GPU or peak-load evidence. The run ended
lost in W15.

The fresh `851cd13` browser regression log is
`/tmp/astra-851cd13-regression.log`: 24/24, including two real W1 deaths and the
wave-2 live-boss metrics check.

The final heal post-analysis, `/tmp/astra-851cd13-heal-trace.json` (mirrored as
`/tmp/astra-851cd13-heal-trace-final.json`), passed **19/19** entries through W20:
3 recovery through W10, 4 from W11, and the 10-health cap. The earlier 12/12 W13
read was an intermediate state, not a separate final artifact.

The ordinary ranged run on `851cd13` is a real failure, not a victory or deadline.
It entered W20 with 8 health. The boss was first observed around `57.05 s`, while
player health was 1; at wave time `57.583333333331346 s`, still during boss spawn,
health reached 0. No final boss fight was observed and no boss damage was dealt
(boss still at 6,400 hp). The result recorded 5,965 kills, simulated
`698.6666666663599 s`, wall `703.349 s`, six Tier-II guns, popcorn III plus
domino II, chain peak 21, no page errors, all 12 functional checks passed, and a
working terminal retry; the full-victory assertion failed as intended. Raw
evidence is `/tmp/astra-851cd13-ranged/result.json` with the JSONL trace alongside
it.

### Preserved failure evidence

Historical failures remain failure evidence. They are not overwritten by later
green checks.

- **Input lifecycle, `f7`:** the preserved
  `/tmp/astra-input-f7d0741-evidence/lifecycle-f7d0741.log` is the **author
  DeepSeek 7/7** run. The root-verified independent DeepSeek 7/7 artifact is
  `/tmp/astra-f7d-review.B5iCbP/f7/scrap-surge/artifacts/input-lifecycle-results.json`
  (SHA-256 `241fea027757a430d2088b5f5776c1a1f9904738524c4853b82f434836f1a6f3`),
  with keyboard and touch runs completed. The shared
  `tests/browser-input-lifecycle.mjs` remains the reproducible ordinary-input
  check.
- **Ordinary ranged on `f7d0741`:** lost in W18 at 0 hp, 4,781 kills, simulated
  `594.7166666664544 s`, wall `599.635 s`, no page errors. The result and trace
  are in `/tmp/astra-f7d0741-ranged/`.
- **Final approved domino diagnostic on `f7d0741`:** lost in W15 with 3,455
  kills. The registered variant kept the ranged guns and 105 nearest-enemy
  avoidance input, took domino at W9/W13 and popcorn at W17, and put domino
  second. The preserved result file contains the diagnostic CPU measurement and
  terminal outcome, not a full browser stop trace. Raw result:
  `/tmp/astra-f7d0741-domino-diagnostic.json`. This is the final
  preregistered strategy variant; no further strategy variants are planned.
- **Historical W15 run on `3140`:** lost at 0 hp with 3,569 kills. The stage-III
  boss had already been killed, but the player died with 3.5 seconds remaining
  in W15. This corrects the earlier ambiguous "about 3.5s later" wording.

The full chronological record remains in `docs/status-history.md`, including
earlier red regression runs, the F0/T2 checkpoints, expired suite counts and
superseded review state. Those entries are explicitly historical.

### Portable diagnostics

`tests/astra-ranged-run.mjs` reproduces the ordinary ranged strategy through a
real browser. `tests/astra-perf.ts` reproduces the single-CPU simulation timing
diagnostic. `tests/astra-heal-trace.cjs` reads the ranged trace after a run and
checks first-fight HP against the 3/4 recovery and 10 cap. None changes game state
or is part of `npm test`.

The browser and CPU diagnostics require `SOURCE_SHA` as an explicit provenance
label. It is not independently verified, so artifacts must be checked against
their run setup. Optional settings:

- Ranged: `CHROME_PATH`, `BASE_URL`, `OUTPUT_DIR`. A loss remains an assertion
  failure and its JSON, trace, screenshots and terminal state are preserved.
- CPU: `OUTPUT_FILE`.
- Heal trace: pass the ranged run directory as the sole argument to
  `npm run test:astra:heal-trace -- /abs/path/to/run`.

Without an explicit output path, each run creates a unique directory or file
under the system temporary directory (`astra-ranged/` or `astra-perf/`). Existing
evidence is never overwritten; the chosen path is printed.

### Open boundaries

No current evidence establishes a full ordinary-input W20 victory.
Physical-device performance, Safari, mobile ergonomics, rendered-frame rate,
audio mix and user feel remain unverified. The 20-wave candidate has no user
acceptance. No tuning, additional UI, push, merge or deployment is authorized
by this cleanup.
