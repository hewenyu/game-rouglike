# Validation evidence and boundaries

## P2 repair verification (2026-10-20)

The repair candidate preserves simulation balance, HP, waves, audio and the
frozen slice behavior. It makes expedition weapon offers exactly three distinct
cards, prevalidates shared rerolls, removes reward-stream mutation from rerolls,
fixes deterministic exact-repeat fallback, and keeps failures atomic. The item
detail path now uses the shared pure proc-preview helper and shows only the
selected item's own readout; held proc outputs are listed only when the selected
item changes `powerFactor`. Mobile family labels are Chinese-only so all three
cards fit at 390px without ellipsis.

| Check | Latest result |
| --- | --- |
| `npm test` | **172/172** |
| `npm run build` | **clean** |
| `git diff --check` | **clean** |
| P2 item integration, server `4194` | **2/2**, keyboard and CDP touch, 0 page errors |
| P2 W3 visuals, server `4194` | **2/2**, keyboard and CDP touch, 0 page errors |
| P2 lifecycle, server `4194` | **6/6**, one real W3 loss, one record, clean retry |

Latest actual successful artifacts:

- `/tmp/p2-repair-items-final4-1792487480/report.json`
  (SHA-256 `a65a9164130455fcfe19b8964e8403baf54a8c412682b4f864896729c3107ebd`)
  records 49 consumed fuel / 98 admitted shots keyboard and 46/92 touch, both
  with 0 rejected shots and matching `queueCounters.popcorn.processed`.
- `/tmp/p2-repair-visuals-final2-1792487579/report.json`
  (SHA-256 `c7f3f796eb8bccb5ecbc376bff6a816d6c509072b77c86c1e79e49e13b176af0`)
  records natural elite `maxHp 360`, `radius 28`, defeat, chest collection,
  frozen two-choice chest and claim in both input modes.
- `/tmp/p2-repair-lifecycle-final2-1792487727/report.json`
  (SHA-256 `5d92e98c798fe55277d1495c5f2c33ca2296238a1bd86caa9ede3e76520ae7ee`)
  records all six lifecycle checks and the W3 loss at 0 HP.

An earlier repair run
`/tmp/p2-repair-items-final3-1792487381/report.json` failed because the fixture
asserted only the W1 detail headline. The failure is preserved, not relabeled;
the fixture was corrected to select the target card before inspecting its
detail, and the passing run above is from the corrected source. These are
author-run headless browser checks, not user acceptance or independent review.
They do not establish a full ordinary-input W20 victory, late-five-route
viability, saturation, physical-phone/Safari behavior, audio-mix acceptance or
perform a review of the new frozen SHA.

## P2 Stage D audiovisual integration (2026-10-20)

Stage D adds an expedition-only presentation path without changing simulation,
combat, RNG, accounting or the frozen slice renderer. `Renderer.render` accepts an
optional `ExpeditionPresentation`; ordinary SLICE calls remain unchanged. At the
base commit `b0a8f14`, elite and chest state existed as simulation data, but the
renderer had no actual path that drew those cues. Stage D now draws:

- the authoritative elite at its real position and HP, with hazard fins, an
  `ELITE` marker and a live HP bar;
- the pre-spawn elite warning banner and countdown;
- physical brass/glass chests at `chestRenderData` coordinates;
- actual S3 `trailPoints` at their real radius and lifetime;
- the H3 aura radius, pressure-state cue, distinct pickup/item bullets and the
  profile-driven saw orbit radius.

Enemy projectiles remain the final world-layer pass, above world effects, blasts
and the chain readout. `src/audio.ts` now gives elite, chest and item-purchase
events distinct synthesized identities; item purchases no longer stack the
legacy weapon-buy chime beneath their cue. The existing mute and voice-cap
machinery remains in force. `src/main.ts` builds presentation values from
read-only simulation state and emits the elite warning cue once per elite wave.
That presentation edge is needed because the simulation event union declares
`elite`, but the current simulation does not emit it.

| Check                     | Result                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| `npm test`                | **166/166**                                                        |
| `npm run build`           | **clean**                                                          |
| `git diff --check`        | **clean**                                                          |
| Existing P2 item fixture  | **2/2**, keyboard and CDP touch, zero page errors                  |
| Stage D W3 visual fixture | **2/2**, keyboard and CDP touch, zero page errors                  |
| W3 elite                  | real `maxHp 360`, `radius 28`, defeated through ordinary combat    |
| W3 chest                  | physical elite chest observed and collected in both modes          |
| W3 rest                   | frozen two-choice chest observed and claimed in both modes         |
| Frozen enemy draw hash    | `4ba5006bbeb0835ae7fc1d9ce8deecf1f41926250d2303ebfe1be15e02d80abf` |

The existing item fixture report is `/tmp/p2-stage-d-existing/report.json`. The
final-source visual report is `/tmp/p2-stage-d-final-visuals/report.json`
(SHA-256
`f58178346d3b40adc4c81eabb089663265ed3f89a8d651863682f2edbc27de19`);
screenshots
include `keyboard-w3-elite-warning-desktop.png`,
`keyboard-w3-elite-live-desktop.png`, `keyboard-w3-chest-live-desktop.png`,
`keyboard-w3-chest-choice.png`, and touch equivalents in that directory. The
final tree was also checked by the earlier `/tmp/p2-stage-d-visuals/report.json`
run. Both mobile runs remained at 390px, used real CDP touch, and no visible rest
action measured below 44x44.

The natural milestone seed `2` run at `/tmp/p2-stage-d-trail3/report.json`
completed on desktop and recorded **404 real trail observations**, with
`/tmp/p2-stage-d-trail3/keyboard-w3-trail-desktop.png`. Its touch attempt failed
before W2 because the `.reward-row` disappeared during a browser fixture race;
that is a fixture limitation, not evidence of two-mode real-trail coverage.

These checks do not establish audible quality or mix acceptance, visual
acceptance, physical-phone/Safari behavior, W16-W20 performance, an ordinary-input
W20 victory, cohort balance, item-led late output or independent review. Browser
runs were headless. All browser and renderer evidence is author-run.

## P2 Stage C runnable-UI checkpoint (2026-10-19)

Stage C presents the Stage B contract-v2 item, reward, chest and elite state in
the expedition rest UI. The shop/rest panel now has separate free-reward, weapon,
item, inventory and stat sections; shows all 20 item shapes, rarity frames and
labels, caps/uniqueness/dependencies, prices, wallet shortfalls and projected
central-derived deltas; exposes a selected-item detail area without hover; and
keeps a start-next-wave control at the top as well as in the footer. Item cards
and inventory rows select the in-panel detail, while the hidden per-card detail
source stays out of layout. Owned and offered weapon panels call the same central
item modifiers, including `pellets * shots` projectile counts for F4.

`BASE_URL=http://127.0.0.1:4192 node tests/browser-p2-items.mjs` is the
reproducible integration fixture. On seed `1`, ordinary keyboard and real CDP
touch each played W1, clicked the naturally offered `scrap-popcorn` core, reached
W2 and bought the naturally offered `厚壳` item at the W2 rest. The runs observed
real `queueCounters.popcorn` processing (keyboard 50, touch 46 in the final
verification run), spent 12 scrap, changed max HP 10 -> 12, and changed the
derived move factor 1.00 -> 0.96. Both runs had no page errors. At 390px the
document and overlay widths were 390/390, no item card crossed the viewport, and
every visible P2 rest action measured at least 44x44 CSS pixels. The mobile
footer is intentionally static so it cannot cover lower cards, and touch buys
through the selected-item
detail action. The screenshots and JSON are under `/tmp/p2-items-browser/`; they
are author artifacts, not independent review.

The author suite covers 19 consolidated rests, W1 core choices, item/stat rows,
purchase and eligibility atomicity, chest freeze/decline/loss, reroll rollback and
visible repeat replacement, source cash/fuel and zero-coin collection, shotgun
5x3 firing, H2/H3/pressure, terminal return ordering, elite reservation/escape,
milestone trail, fist remnants, source attribution and bounded queues. It also
pins voluntary rest exit with unclaimed rewards, reroll independence from reward
rows, stale unique-claim rejection, and H3 healing only for actual `contactProc`
aura/contact kills. The migration ledger is `docs/p2-test-migration.md`; the Stage
C handoff is `docs/p2-stage-c-handoff.md`.

The UI checkpoint has no audio event assertion, elite/chest visual acceptance,
ordinary-input W20 victory, full W20 viability, cohort balance, item-led late
output, saturation, physical-device performance or user-feel claim. Author
self-checks are not independent review.

## P1 label, hurt-bar and documentation repair (2026-10-19)

This source changes presentation text/CSS and renderer bars only; it does not
change simulation, RNG, combat, prices or accounting. Cards use the compact
`理论DPS` label, while one shared shop note explains: single-target panel
estimate, all shotgun pellets hitting, saw continuous contact, and no
multi-target gain. The owned-slot heading is `面板数值`; effect tags stay
compact (`5 弹丸`, `环绕`, `范围`). None of these labels changes a rule.

Renderer evidence is a synthetic read-only matrix:

- expedition bag, runner and chip draw the new small bar only when HP is below
  max; their enemy objects are unchanged before and after rendering;
- can, splitter and spitter draw exactly their prior two rectangles in both
  modes and are likewise non-mutating;
- bag, runner and chip with default/missing mode keep frozen slice draw-op
  SHA-256 `4ba5006bbeb0835ae7fc1d9ce8deecf1f41926250d2303ebfe1be15e02d80abf`
  and draw no new bar.

This is renderer-level equivalence for that fixture, not screenshot acceptance
or proof over every state. The author checks are `npm test` **105/105** and a
clean `npm run build`. Normal-input browser first-shop/merge fixtures were not
run as part of the final documentation edit, so their earlier 6/6 and 2/2 results
remain historical and are not relabelled.

The final repair merge report is `/tmp/p1-compact-qa4-4192/report.json`, with
desktop/touch before/after screenshots alongside it. Both modes completed with
no page errors. At 390px the final screenshot confirms the shared DPS note and
compact labels; DOM checks measured `documentScrollWidth === viewportWidth ===
390`, no card overflow, and every weapon-summary row at
`scrollWidth == clientWidth` (131px four-card rows, 61px owned row). The fixture
also observed the unchanged 18-scrap I-to-II fusion and damage 40. This is a
bounded presentation/merge check, not full screenshot acceptance or a W20 run.

The first-shop 6/6, lifecycle 7/7, earlier merge 2/2 and three-seed comparator
below are carried evidence from predecessor `c674b4f`. They were not rerun after
this repair and are not relabelled as current-source evidence.

The slice comparator covers **3 seeds x 3,422 steps** only, with no weapon
purchases. Its loadout is the starting slinger plus magnet and popcorn; it does
not cover all loadouts, arbitrary inputs, item builds or browser behavior. The
old next gate of waiting for user feedback is superseded by the user-authorized
redesign. No full W20 victory, item-led late output or current performance claim
follows.

The simulation/input baseline is
**db74a8cc95806976bcdaf6896b79a4ccdb48afcc**. Its three-party PLAYTEST review
is historical evidence only. A render-order fix follows `3305687`; that fix is
**01a9bf13a69ceaeeca9263ec9def1d2ba212622a**, with a completed three-party
PLAYTEST-only review. That model review is not user acceptance or goal completion,
and `?mode=slice` retains the approved two-wave behavior.

The frozen slice reviewed at **8cb0e8f104d4150ceca8f8660ae6a6c62972e208**, the F0
code checkpoint **42f4ff8f6163f6565ab4f939de147efa5a7b0564**, and the tests-only T2
revision **5e050b221775f57744e39bfd20f5fbc4499360a6** remain historical evidence in
`docs/reviews.md` and `docs/status-history.md`; they are not the current render fix.
All repository reproduction commands below run from this repository and do not
depend on a `/tmp` path. `/tmp` paths appear only as raw evidence locations.

## P1 freeze validation (candidate based on `19a66dd`, 2026-10-19)

This candidate implements six expedition slots, automatic same-ID/same-tier
merging through IV, damage-only tier profiles, atomic purchase previews and
committed purchase-result display. It is a structural P1 freeze candidate only.
P2 item rules and their expedition UI now exist, but the combined candidate is
not independently reviewed, balance-tuned over 20 waves, or user-accepted.

| Check                                      | Result                                   |
| ------------------------------------------ | ---------------------------------------- |
| `npm test`                                 | **105/105**                              |
| `npm run build`                            | **clean**                                |
| First-shop on `4190`                       | **6/6**, no page errors                  |
| Input lifecycle on `4190`                  | **7/7**, no page errors                  |
| Paired desktop/touch browser merge fixture | **2/2**, no page errors                  |
| Full slice comparator vs `19a66dd`         | **0 differences**, 3,422 steps × 3 seeds |

The added unit groups are deliberately separate:

- A six-slot cascade buys an incoming I through an equal I, II and III arm to
  IV, checks summed paid value and max cooldown, and preserves the equal arm
  not consumed. It does not claim six I items collapse into one IV.
- A rejected full-slot purchase leaves guns, offers, `sold`,
  `purchaseRecords`, money and events untouched.
- Twenty legal buy/sell cycles use genuine `0.35 * paid` refunds and prove no
  scrap creation or duplicate card.
- A tier-IV weapon fires a real projectile with damage 160 and a real
  collision settles the hit. The profile-only test remains separate.

Run the browser fixture with:

```sh
BASE_URL=http://127.0.0.1:4190 node tests/browser-first-shop.mjs
BASE_URL=http://127.0.0.1:4190 node tests/browser-input-lifecycle.mjs
BASE_URL=http://127.0.0.1:4190 node tests/browser-merge-purchase.mjs
```

The merge fixture writes a fresh report and desktop/touch before/after
screenshots under `artifacts/merge-purchase-<timestamp>/` by default, or to
`OUTPUT_DIR`. It drives W1/W2 with ordinary keyboard or CDP touch and clicks
the offered copy of the starting slinger. It asserts the pre-buy
`合成至 II / 攻击 40`, the post-buy committed `合成 II / 攻击 40`, the one
owned II weapon, the 18-scrap spend and the `攻击 40` owned profile. The
authored run is at `/tmp/astra-growth-merge-1792469184/`; its report and four
screenshots are author evidence, not independent review.

The `19a66dd` comparator is outside the repository at
`/tmp/astra-19a66dd-compare/compare.ts`, with raw output in
`result.jsonl`. It loads the old checkout's `Game` and the candidate `Game`
side by side, drives the fixed orbit input through the full slice, applies the
same two quick choices, and compares phase, wave, time, player, enemies,
bullets, scrap, pending blasts, chain state, events and combat/shop draw
counts on every step. Seeds 42/23/145 each matched for 3,422 steps and ended
`won`; kills were 280/280, 289/289 and 290/290, HP 4/4 on all three, and
combat draws were 2105, 2124 and 2123. This is fixed-input simulation evidence,
not an arbitrary-input, browser or human equivalence proof.

The first-shop and lifecycle runs above were repeated on stable dev server
`4190` after the source stopped changing. An earlier lifecycle run was
invalidated by an HMR reload (`Execution context was destroyed`); the later
stable run is the bounded 7/7 result. No full ordinary-input W20 victory,
item-led boss cohort, physical-device performance, Safari, audio-mix or user
acceptance is established by these checks.

## Automated rules

Current `npm test` at test checkpoint
**b4c87e3340c654f89a2807edf7fde197eeb28fec** runs **93/93**: the original
**89/89** rules assertions across `tests/rules.test.ts` and
`tests/expedition.test.ts`, plus 2 render-order tests in
`tests/render-occlusion.test.ts` and 2 W20 lifecycle tests in
`tests/w20-victory.test.ts`. Source is unchanged from
**fdfabaee278c9e0f16f76737328e176a3aefbf43**. The prior **91/91** result at
that source checkpoint and the **89/89** result on `851cd13` remain dated
historical counts; their logs and evidence are not rewritten.

The 2 W20 tests use explicitly marked synthetic clock jumps. They check the
57-second boss spawn and warning gate, real lethal-hit settlement and one sweep,
and the deadline branch at `90s`; they do **not** establish a normal-play W20
victory, final-boss completion, difficulty, reachability or user acceptance.
The preceding **9e2ac556cfc0d095f3e8637ad094905775fef1db** loss fixture was a
false-positive lifecycle check: its stationary run reached HP 0 at
`waveTime 74.18333333333236`, before `90s`, so `lost` alone did not prove the
deadline branch. The corrected fixture requires phase `fight`, HP above zero and
a live boss at exactly `90s` with no `end` event, then one `lost` and one `end`
step past `90s`. The bounded revision at `b4c87e3` completed three-party
approval for these tests. No new pending test-review claim is needed; this
docs-only revision was to be reviewed after its commit froze. Its old next gate
of user feedback from a full run is historical and was superseded by the
user-authorized redesign; it is not the current action.

The original rules assertions cover automatic first kill,
one-time death settlement, multigeneration explosions, budgeted queue retention,
pickup uniqueness, pickup -> kill -> explosion -> drop feedback, stacked mod
validation, shop transactions, isolated shop RNG, incoming-damage reservations,
stale targets, pause, movement, loss/retry, end-of-wave sweep, victory/deadline and
20 seeded stress simulations with 180 enemies and 420 initial bullets.

Slice-specific tests added for S1/S1b:

- combat pickups advance the magnet charge while sweep pickups do not, and the
  remainder carries (7 combat + 5 sweep + 1 combat fires the burst on the 8th
  combat pickup);
- wave-1 pockets spawn at the fixed 6s/14s times with 12 enemies each;
- the wave-1 base spawn rate matches the fixed 3.1 per second;
- the chain counter reports real secondary deaths, not the primary root kill;
- a lone weapon kill never fabricates a chain;
- primary radius damage does not count as a chain;
- interleaved chains keep separate per-root counts;
- the pending-blast peak is recorded and the queue drains fully;
- a lethal spring-fist hit leaves a remnant that bowls another enemy for exactly 30;
- the remnant never damages the player and is not a live enemy;
- remnants are capped at 180 and cleared at the wave boundary;
- remnant kills drop loot and count as secondary chain deaths;
- overtime exposes a live countdown instead of a frozen zero;
- `spawnCount` counts successful spawns, not cap-rejected attempts.
- finished chain roots are reclaimed during sustained chain activity, so a long run
  cannot accumulate completed roots while the display timer keeps refreshing;
- a root with queued work survives until its queue drains.

Repair-package (F0) tests added on top:

- a full arena never fakes `bossSpawned` or the `wave` event, and a lethal hit
  (`born` cleared, real `hit()` settlement) frees a slot so the boss spawns on the
  next step, with never more than one boss;
- the pending boss holds its slot against the timer and the whole 12-strong pocket
  path (`spawnCount` proves the timer spawn was rejected) and then takes the last
  slot;
- a full arena that never frees a slot still loses at the 50s deadline;
- a real boss volley counts 8 accepted enemy bullets while `shots` stays
  success-only;
- the popcorn skip counter is RNG-neutral (two identical seeds still agree after the
  skip branch runs) and every instrument resets on a new `Game`;
- shoot counters split player and enemy bullets, keep `shots` success-only and track
  the projectile peak;
- popcorn skips count only real target pickups past the per-step 8-bullet budget
  (no target and sweep pickups add nothing).

The current late-recovery tests also pin W1-W10 at 3 health, expedition W11-W20 at
4, slice entries at 3, the 10-health cap, one application per entry, and no revival
from lost/won states. The full chronological F0/T2 history is in
`docs/status-history.md`.

These are finite samples, not a proof over all builds or seeds. The stress test
establishes bounded, finite state, not real-device frame-rate fitness.

## Enemy-projectile occlusion

Enemy projectiles are now drawn after world effects and the real chain readout,
while player projectiles remain in the original world pass. The enemy bullet
keeps its orange trail, red fill, glint, radius and rotation; its outer stroke is
3px `#273b35`. The opaque `BLAST.core` fill previously covered the lethal red
hitbox when both occupied the same point.

`tests/render-occlusion.test.ts` uses a synthetic recording-canvas matrix: two
enemy bullets (r6 oval and r7 circle) each draw once after sweep text, blast,
domino/ember effects and chain text; cap, bonus and rocket each draw once in the
original world pass. Both enemy shapes retain their geometry with a 3px `#273b35`
outline. This is render-order coverage, not a visual acceptance or gameplay
balance result. A separate bounded check compares rendered and control
simulations for the **first 60 steps** on seeds 42/23/145 in both modes. It is
nonmutation evidence for that one-second window, not full slice equivalence.

`tests/browser-render-occlusion.mjs` runs the same synthetic overlap fixture at
1440x960 and 390x844 and checks for visible red centre and dark-ring pixels. The
pre-fix checkout `3305687` produced 0 red / 0 ink pixels in both fixtures; the
fixed checkout produced 56/115 at desktop and 14/18 at 390x844 (pixels are a
focused fixture check, not a gameplay statistic). `syntheticOnly` is true by
default; disabling normal capture leaves `normalCaptureReached` null. Its optional
ordinary-input slice mode (`RUN_NORMAL=1`) waits for `shootAcceptedEnemy` to
increase and preserves sequential canvas frames. Enabling it without any captured
frame, including a lost/deadline/failed run, fails the harness. The report always
marks `visualCoexistence: "requires-manual-review"`; the counter alone never
proves visual coexistence. Reviewers must inspect the frames.

## Browser method

`npm run test:browser` (normal play) and `npm run test:browser:regression`
(`tests/browser-regression.mjs`) drive real Chrome over the dev server or a static
host. Both use ordinary keys, taps and buttons and read only `window.scrapMetrics`
plus DOM geometry; no HP, timer or entity writes, and no invulnerability.
`CHROME_PATH`, `TEST_URL`/`BASE_URL` and `DIST_DIR` are configurable.

`npm run test:browser:lifecycle` (`tests/browser-input-lifecycle.mjs`) is a separate
ordinary-input lifecycle check and does not change the 24-check regression
denominator. Independent keyboard and real-CDP-touch runs progress normally to the
W7 interlude, release the old direction, press a new one during the interlude, and
require immediate movement in W8. The keyboard run also checks that quick, shop and
paused phases reject movement and that pause/resume leaves no ghost key.

The review-only `tests/browser-expedition-review.mjs` is a separate full-run harness
adapted from Astra's review script. It requires an explicit `REVIEW_SHA` and a fresh
`OUTPUT_DIR`, defaults to `http://127.0.0.1:4190`, and preserves each attempt's JSON,
JSONL trace and screenshots. It is deliberately not in an npm script or the frozen
regression denominator. A copied but unrun script is not a victory result.

`tests/astra-ranged-run.mjs` (`npm run test:astra:ranged`) preserves Astra's fixed
ordinary keyboard ranged strategy: seed 2a, 80ms polling, a 0.32 deadzone, the
210/170 center/boss orbit and 105-unit nearest-enemy avoidance, with legal shop
clicks only. It requires `SOURCE_SHA` and supports `CHROME_PATH`, `BASE_URL` and
`OUTPUT_DIR`. A loss stays an assertion failure with its terminal state, JSON,
JSONL trace and screenshots; the harness never retries to force a pass. Without
`OUTPUT_DIR`, it creates a unique path under the system temporary directory and
refuses to overwrite an existing target.

For the ranged and CPU diagnostics, `SOURCE_SHA` is an explicit provenance label
only. It does not independently prove that the executed checkout matched it.

`tests/astra-perf.ts` (`npm run test:astra:perf`) is a diagnostic simulation CPU
benchmark, not a browser or frame-rate test. It requires `SOURCE_SHA`, accepts
`OUTPUT_FILE`, and writes the complete JSON there (or to a unique file under the
system temporary directory by default). It measures only `Game.step(1/60)`, with
input and event draining excluded, after 3000 warm-up ticks.

`tests/astra-heal-trace.cjs` (`npm run test:astra:heal-trace -- <run-dir>`) is a
read-only post-analysis of a ranged run's JSONL trace. It compares the final
prior-wave sweep/stop/interlude HP with the first observed HP in the next fight,
checks 3 recovery through W10, 4 from W11, and the 10 cap. It writes nothing.

Environment: Google Chrome 155.0.8059.80, headless Playwright, macOS 26.6.2 /
Apple M4, 1440x960, DPR 1, seed 0x2a.

Historical simulation-baseline evidence on `851cd13`:

- `npm test`: **89/89**; `npm run build`: **clean**.
- Fresh browser regression on `851cd13`: **24/24**, log
  `/tmp/astra-851cd13-regression.log`.
- Input lifecycle on `f7d0741`: **author DeepSeek 7/7**, log
  `/tmp/astra-input-f7d0741-evidence/lifecycle-f7d0741.log`. The separate
  root-verified independent DeepSeek 7/7 artifact is
  `/tmp/astra-f7d-review.B5iCbP/f7/scrap-surge/artifacts/input-lifecycle-results.json`
  (SHA-256 `241fea027757a430d2088b5f5776c1a1f9904738524c4853b82f434836f1a6f3`);
  its keyboard and touch runs completed.
- Ordinary ranged run on `f7d0741`: lost W18 at 0 hp, 4,781 kills, simulated
  `594.7166666664544s`, wall `599.635s`, no page errors; raw result in
  `/tmp/astra-f7d0741-ranged/result.json`.
- Final preregistered domino diagnostic on `f7d0741`: lost W15 with 3,455 kills,
  using the registered seed 42/ranged-guns/105-input variant, domino at W9/W13
  and popcorn at W17, with domino second
  (`/tmp/astra-f7d0741-domino-diagnostic.json`). The preserved file contains the
  diagnostic CPU result and terminal outcome, not a full browser stop trace. No
  further strategy variants.
- Slice equivalence on `851cd13` against the approved pre-expansion slice at
  `058951fc84994abb8ee24a2c587bb9232c1c1ccd`: **0 step differences** for seeds
  42/23/145; all won, with kills 307/308/307, HP 10/7/10 and chain peaks
  20/18/18 (`/tmp/astra-851cd13-slice-equivalence.log`).
- Simulation CPU diagnostic on `851cd13`: W1-W15 only, p95 `0.060041ms`, max
  `1.301042ms`, Apple M4 / Node 26 (`/tmp/astra-851cd13-perf.json`). This is
  neither FPS nor W20/mobile/render/audio/GPU evidence.
- Ordinary ranged run on `851cd13`: **death at W20 during boss spawn**, 0 hp,
  5,965 kills at wave time `57.583333333331346s`; no final boss fight was
  observed and the boss was untouched at 6,400 hp. Simulated
  `698.6666666663599s`, wall `703.349s`, no page errors, all 12 functional checks
  passed, and the victory assertion failed as intended. Raw result:
  `/tmp/astra-851cd13-ranged/result.json`.
- Final read-only heal trace: **19/19 through W20** at
  `/tmp/astra-851cd13-heal-trace.json` (also mirrored as
  `/tmp/astra-851cd13-heal-trace-final.json`). The earlier 12/12 W13 read was an
  intermediate state, not a separate final artifact.

Normal-play run: automatic first kill at 1.45s, ordinary movement plus weapon
purchases plus two stacked mods, then a boss victory. Repeated runs land around
280-310 kills at 4-9/10 health with chain peak 18-21 and pending-blast peak 13-16;
the exact numbers depend on rAF timing, so the assertions check the outcome, not the
totals. No uncaught page errors. A 390x844 DPR2 touch context moved, auto-fired,
cancelled a touch and resumed with no ghost movement.

Author-run regression using separately authored checks
(`tests/browser-regression.mjs`). The checks were drafted by a separate agent, but
this execution was run by the implementer, so it is not independent review. That
"independent review runs after the freeze" line is historical: the slice went on to be
reviewed at `8cb0e8f`, and that result supersedes it. The check set below describes the
slice-era fixture; the T2 revision of G is documented further down.

- A1 an ordinary-input run reaches a terminal state (win or loss). The A-run no
  longer requires idle play to die or to win: after S1e an ordinary run can
  legitimately win, so requiring a loss here would be wrong.
- G the forced defeat path: an ordinary keyboard charge toward the nearest enemy
  (read only from the read-only `enemyPositions`) for fixed seeds 2a/17/91, one run
  each. This bullet describes the **slice-era** fixture (shop was terminal, 40s cap).
  The current **T2** fixture keeps the same 70ms poll, +-6px deadzone and nearest-enemy
  charge, but the first shop is no longer terminal: the run buys **no weapon**, takes
  exactly `magnet` + `popcorn`, then keeps charging through wave 2 to a real outcome
  under a **single 100s wall cap** (normal play tops out at 20 + 1 + 50 + 1 = 72s) with
  no per-phase timer. `endReason` is `death` / `deadline` / `won` / `timeout`:
  - `death` - lost at 0 hp; the only outcome counted as death coverage, requiring the
    failure UI and a working retry (fight / 10 hp / 0 kills / 1 gun / 0 mods).
  - `deadline` - lost with hp > 0 because the boss was not killed in time; recorded as
    "not covered", never counted as a death.
  - `won` - normal victory.
  - `timeout` - still fighting at 100s; a real failure, never retried.
    Only runs that actually reach the shop assert the exact mods and gun contract
    (`mods === [magnet, popcorn]`, `gunsAtShop === 1`, `gunsAtWave2 === 1`); no page
    errors applies to all runs. The group must still contain at least one real 0 hp loss.
    This fixture remains probabilistic and timing-sensitive; a green run is evidence for
    these three fixed seeds only, not a stability or difficulty claim.
- H the read-only metrics API: `enemyPositions` returns a fresh array of fresh
  `{x,y}` copies, and mutating a returned snapshot does not change the next read.
- A3-A6 the end panel offers retry, the record is written once, retry resets
  immediately (10 health, 0 kills, 1 gun, 0 mods) and the record is not
  double-counted.
- B1-B3 a mid-fight refresh returns to the title without resuming, the record
  survives, and there are no page errors.
- C1-C2 the drawn arena starts below the edge bar and ends above the bottom HUD
  band, i.e. the HUD is outside the play field, not merely restyled over it.
- D1-D2 blur pauses and freezes simulation time, and after resume a released key
  produces 0px of drift.
- E1 the production `dist/` build runs from a `/sub/` subdirectory with relative
  paths and no 4xx responses.
- F1-F5 at 390x844 DPR2 with real touch: no HUD element overflows the viewport
  width, the document has no horizontal scroll, the edge bar and bottom band are
  fully visible, and the arena keeps a usable size (632x422) clear of both the
  edge bar and the joystick.

The phone checks exist because a read-only review found the arena squeezed to a
small strip and the loadout/wallet overflowing: conflicting narrow-screen media
rules enlarged the bottom bar, and `layout()` mixed `window.innerHeight` (1046 on
that device) with the canvas CSS height (844). The fix uses the canvas rect as the
single coordinate frame and clamps the narrow bottom bar to the viewport width.

## Frame intervals

The normal-play run reports median 16.7ms and p95 16.7ms over the final samples,
from raw rAF timestamps. This is headless desktop execution, not GPU profiling and
not a peak-load or midrange-phone claim.

## Known unverified

- No physical-device performance or Safari measurement. Midrange-phone frame rate
  is unmeasured.
- Headless cannot confirm a real window blur; the regression dispatches a synthetic
  blur and records that boundary explicitly (`realBlurDeliveredHeadless: false`).
- The 420 shared projectile cap is documented and instrumented but not yet observed
  as actually reached in a normal slice run. The W20 ranged artifact's
  `bulletPeak` is 144; `shootAcceptedEnemy` is 549 admitted enemy projectiles,
  neither a rejection count nor an injury attribution.
- Physical touch ergonomics, the audible mix and user enjoyment remain unverified.
- The 20-wave candidate has no ordinary-input victory on `851cd13`; its one
  completed ordinary ranged run died during the W20 boss spawn without the boss
  fight being observed. There is no physical device or Safari performance
  measurement, and no user acceptance. W16-W20 were not part of the CPU sample.

## Seed-42 paired injury diagnostic

This is one fixed-seed simulation diagnostic, not a browser replay, human
difficulty sample, FPS result or win-rate estimate. It reused the previously
registered `expedition20` input and panel strategy; that strategy was not
changed or re-evaluated here. It used seed 42, `dt = 1/60`, and a 90,000-tick
cap. Held input was polled at steps 0, 5, 10, ... The script is a single fixed
body that avoids enemy bodies but does not actively dodge bullets.

Control and observed instances ran the same panels, input policy and steps.
Every step compared complete nonfunction state hashes, drained-event hashes,
the original `random` and `shopRandom` value streams, and their cumulative draw
counts. The observed `hurt()` override classified only the immediate source
line: contact at `src/sim.ts:1786:51` or enemy bullet at `src/sim.ts:1889:18`.
It does not establish shooter identity, entity identity or geometry.

Result: **pass**, 40,860 paired steps (0 through 40,859), with 40,860/40,860
matches for state, events, RNG values and cumulative RNG counts. Damage was
45 accepted hits (contact 3, enemy bullet 42) and 32 ignored hits (contact 26,
enemy bullet 6). The run ended lost on W20 at HP 0 and wave time
`39.916666666665684s`, before the W20 boss appeared around 57s. It does **not**
show that one source caused all W20 damage, and it makes no boss-balance claim.

W20 accepted-hit timeline:

|   Step | Wave time | Source       |     HP |
| -----: | --------: | ------------ | -----: |
| 38,877 |    6.883s | enemy bullet | 6 -> 5 |
| 38,955 |    8.183s | enemy bullet | 5 -> 4 |
| 39,278 |   13.567s | contact      | 4 -> 3 |
| 40,207 |   29.050s | enemy bullet | 3 -> 2 |
| 40,474 |   33.500s | enemy bullet | 2 -> 1 |
| 40,859 |   39.917s | enemy bullet | 1 -> 0 |

This differs from the browser run on `851cd13`, which died at W20 wave time
`57.583333333331346s` during boss spawn. The two runs used different execution
methods and are separate samples. This diagnostic does not propose a gameplay
change and does not call the earlier strategy stale.

Selected artifacts:

| Artifact                                                                   | SHA-256                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Harness `/tmp/astra-db74a8c-hurt-diagnostic/harness.ts`                    | `0201fab7fdf6df3e16c3ade7b22693d0bf2bb5dbf715fb9e0883e06d6b9f8c7b` |
| Report `/tmp/astra-db74a8c-hurt-diagnostic/paired-full/report.json`        | `a341e3d79675d0a5dc5258712291b56af6226b13ce022103d2a5f76a85183797` |
| Steps `/tmp/astra-db74a8c-hurt-diagnostic/paired-full/steps.jsonl`         | `7ccb122d19c946e8fcaa72ebacd98a12e36c8fb00e62be47af35dd76064eab49` |
| Stdout `/tmp/astra-db74a8c-hurt-diagnostic/execution.stdout.txt`           | `6f75d0d4550c04f494c9652a8e18a888f374745590f72572154b47d0f1027798` |
| Stderr `/tmp/astra-db74a8c-hurt-diagnostic/execution.stderr.txt`           | `e8e0f4293947f9c466ee195e0c524587ae350f0abcd314ad788a5c4024b4ee6f` |
| Environment `/tmp/astra-db74a8c-hurt-diagnostic/execution.environment.txt` | `6202c61a9694113854a769d960a55c0419a871d5a56e87248819de2d466f8a2e` |

The authorized harness was executed once. It completed with a pass report and
all 40,860 step records; the surrounding zsh wrapper then failed while assigning
the read-only shell variable `status`, so no shell exit status was captured.
After `execution.stderr.txt` was closed, the wrapper made no changes to
`harness.ts`, `paired-full/report.json`, `paired-full/steps.jsonl`,
`execution.stdout.txt` or `execution.stderr.txt`. `execution.summary.json` and
`execution.post-hashes.txt` were produced later by read-only inspection.
