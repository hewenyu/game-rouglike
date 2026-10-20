# Status history

This file preserves the chronological development record through the
`expedition20` candidate. It is historical evidence, not the current status.
Current facts and the active candidate are in `memory/status.md`; the review
sign-offs remain in `docs/reviews.md`. Superseded checkpoints and claims below
are retained deliberately and must not be read as current validation.

Material superseded by the current candidate includes the 87/87 suite count,
the F0/T2 current-checkpoint wording, the two-wave-only scope, and the ordinary
ranged W15 run at baseline `3140ddf`. All remain as history.

## Snapshot of memory/status.md at `ac6bcd9` (2026-10-20, historical)

This is the full `memory/status.md` as it stood when the reviewed P2/P3A release
was merged to `master`. It was replaced by a concise current-state page on
2026-10-20. Sections inside were written as "current" at their own checkpoint;
read them as history. Many evidence paths point to local `/tmp` and may be gone.

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

The evidence repair preserves the original v1 raw trace gzip at
`docs/data/p3-measurement-v2/artifacts/runs-447af10.jsonl.gz` (raw SHA-256
`6df30a864a262b0e858c2d826b18600d22df59eaa03feff90d41d819519f8bc2`) and records
a fresh v2 trace at `docs/data/p3-measurement-v2/generated/artifacts/runs.jsonl`
(SHA-256 `ee531e7d8516f7cffbd8cd7575e9cfd67bb646f99e66649f08082dbaf87b6c1e`).
The v2 harness is
`a1f43dd42131fbfffbd2ff8b7dce2e542973ca7a62d3a8d85d0e9dcc1c4dad43`; its
source manifest is
`148b63298d86f30bf952696723f2e55546fc3008bb0f8becb9710f74db650075`
(file list `04edc9c1fe390df6b0011e0ef6fbb8ac3cd036f3b90dcd32697a51e03b54f79c`,
content `7ba343896f610d805e462c877babc99bc8e44478fb355727f72c8b81a5bc3a92`).
The production source guard compares the exact `git show` file list and bytes at
the frozen commit with the disk tree and requires clean `src` status. The full
batch is observation-only: 22 records matched the original trace after removing
only the newly added observation fields. The final verification tree passes
**178/178** tests (the 173 baseline tests plus five source-guard tests), the
production build is clean, and `git diff --check` is clean.

The old v1 report's reroll and weapon-offer claims are historical and false.
The corrected v2 trace contains **306 accepted rerolls**, all free: weapon-only
seed 1 had 14 accepted/free rerolls across 14 rests. Weapon-only seed 1 ended
with six Tier-II guns, 903 cash and 426 spent; seeds 42/145 ended with five
Tier-II plus one Tier-III gun. None reached Tier-IV. The offer audit found 129
rest endings with six occupied slots and every gun at Tier II or higher.
Fourteen of those rests contained a Tier-I offer; **all 20 such offers were
actually purchased** because an earlier compatible purchase freed a slot before
the row was exhausted. The other 115 rests had no Tier-I offer in either row.
This is an observed full-slot / missing Tier-I partner
condition, not wallet scarcity or a failed DPS check. A future sale or
partner-selection policy is a next three-party design question, not a repair to
this measurement or an authorized production tuning change. Item-led actual
damage attribution remains missing because the public state exposes no per-hit
source ledger; cohort wins and item counts do not prove it. P2 user acceptance
was not given. Full W20 browser play, five late-route viability, render
performance, audio/mobile/Safari behavior and user feel remain open gates.

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
`docs/archive/p2-stage-b-handoff.md`, `docs/archive/p2-stage-c-handoff.md` and
`docs/archive/p2-stage-d-handoff.md`; the obsolete-assertion ledger is
`docs/archive/p2-test-migration.md`. The contract source hash remains
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
`docs/archive/p2-stage-b-handoff.md` and `docs/archive/p2-stage-c-handoff.md`; the obsolete-
assertion ledger is `docs/archive/p2-test-migration.md`. The contract source hash remains
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

### P1 code approved at `db0cd9c` (based on `19a66dd`, 2026-10-19)

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

### Current test checkpoint: `b4c87e3` (2026-10-19)

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

### Simulation/input baseline: `db74a8c` (2026-10-19)

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

#### Current rules

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

#### Evidence for the simulation/input baseline

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

#### Preserved failure evidence

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

#### Portable diagnostics

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

#### Open boundaries

No current evidence establishes a full ordinary-input W20 victory.
Physical-device performance, Safari, mobile ergonomics, rendered-frame rate,
audio mix and user feel remain unverified. The 20-wave candidate has no user
acceptance. No tuning, additional UI, push, merge or deployment is authorized
by this cleanup.

## Review candidate: expedition20 implemented, not validation-complete (2026-10-19)

Late-heal decision (approved 2026-10-19): entering expedition W1-W10 restores 3
health; entering W11-W20 restores 4. The destination wave decides the amount, so a
W10 stop advertises 4 and a W9 stop advertises 3. Slice recovery remains 3. A shared
`waveRecovery(mode, destinationWave)` helper feeds both simulation entry paths and the
stop/interlude copy. The cap remains the player's maximum 10, and no lost/won state is
revived. This is a bounded recovery change, not evidence that every build or seed can
finish W20.

The source contains a runnable `expedition20` implementation for three-party
code/visual/failure review. It is **not user-accepted and not validation-complete**.
The normal page defaults to `expedition20`; `?mode=slice` keeps the approved two-wave
slice. No balance tuning was made to force a green result.

The candidate now has 87/87 non-browser assertions (the historical 47 slice assertions
unchanged, plus 40 expedition assertions), a clean build, and a preserved review-only
20-wave keyboard harness at `tests/browser-expedition-review.mjs`. The harness has been
run but has not produced a victory. The browser regression gained one check, so its new
denominator is 24 at runtime, not the historical 23. No green claim exists for the
current candidate: a fresh run on `40b3fc0` passed 23/24 and failed only the H
boss-metrics check. The cause was reachability, not just a short window: idle play
stopped at the wave-1 shop, so wave 2 and its boss were never entered. The fixture now
uses ordinary keys to circle radius 210, buys one legal gun plus popcorn + domino at
the real wave-1 shop, clicks next, and isolates the live wave-2 boss immediately. Its
90s cap treats death, timeout, or a missing boss as a real failure. The historical
23/24 result remains recorded and is not relabelled.

Historical ordinary-input browser evidence on baseline
**3140ddf2851e735334112050bfd5de46d10b4555** is a real failure, not a victory. Astra's
run ended lost at wave 15 with 0 hp, 3569 kills, 111 bullet peak and no page errors;
the stage-III boss had been killed (`bossKilled=true`), and the player died with 3.5
seconds remaining in W15 under ordinary enemy pressure. The result was 474.1s
simulated / 478.3s wall, and retry worked. This is a finite observation, not proof
that the game is unwinnable.

An independent DeepSeek fixed-orbit, ordinary-input simulation diagnostic (seed 42)
recorded terminal failure in all six mod-pair/branch cells:

| pair             | branch | terminal                           |
| ---------------- | ------ | ---------------------------------- |
| popcorn + domino | wake   | lost W15, 0 hp, 3347 kills, 463.4s |
| popcorn + domino | ember  | lost W15, 0 hp, 3416 kills, 463.2s |
| popcorn + magnet | wake   | lost W14, 0 hp, 2999 kills, 424.1s |
| popcorn + magnet | ember  | lost W15, 0 hp, 3308 kills, 463.3s |
| domino + magnet  | wake   | lost W10, 0 hp, 1813 kills, 282.8s |
| domino + magnet  | ember  | lost W13, 0 hp, 2591 kills, 382.1s |

These six cells are a diagnostic strategy on one seed, not a proof of impossibility
and not a 20-wave victory. A different strategy or tuning could change the result.

Unverified at this review freeze: no ordinary-input 20-wave victory; no real
ordinary-input `ember` browser run; post-mode-pin regression/mobile expedition
interaction coverage; simulation-CPU fixed-step measurement; physical
touch/audio/user feel. Three earlier development attempts failed before/at wave 10/13:
wave 13 death at 0 hp and two wave-10 boss deadlines. They are development evidence
only; their old `spawnCount` field used timer-only accounting.

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
it was then frozen at **3140ddf2851e735334112050bfd5de46d10b4555**, and the follow-up
freeze containing this section adds the presentation/UI fixes and tests described
below. Magnet III's presentation is a render-only arena-edge-to-player sweep driven
by the existing `magnetPulse`; there is no radius-300 FX or collision radius. Every
real domino pending blast at tier II/III carries the double-ring cue, while the III
special blast keeps its larger/slower form. None of these freezes is user acceptance
or validation completion.

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
is any later tuning or rule change. F0 + T2 were approved by all three parties at
`2746a01`. The approved 20-wave implementation text is frozen in
`docs/archive/expedition20-proposal.md` at `058951f`; the candidate is implemented and remains
under review, not user-accepted or validation-complete.

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
  `shootAcceptedEnemy` counts spawned enemy projectiles admitted before the cap; it does
  not count hits or identify the damage source behind late-wave attrition.
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
