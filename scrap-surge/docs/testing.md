# Validation evidence and boundaries

Current source baseline: **851cd13faa17f930cbeb9cbf28eff3eeafe17073**, plus this
approved docs/header/portable-diagnostic cleanup. This is the runnable 20-wave
`expedition20` candidate for user playtesting. It is not user-accepted or
validation-complete, the full goal is not complete, and same-SHA final review
remains required. `?mode=slice` retains the approved two-wave behavior.

The frozen slice reviewed at **8cb0e8f104d4150ceca8f8660ae6a6c62972e208**, the F0
code checkpoint **42f4ff8f6163f6565ab4f939de147efa5a7b0564**, and the tests-only T2
revision **5e050b221775f57744e39bfd20f5fbc4499360a6** remain historical evidence in
`docs/reviews.md` and `docs/status-history.md`; they are not the current candidate.
All repository reproduction commands below run from this repository and do not
depend on a `/tmp` path. `/tmp` paths appear only as raw evidence locations.

## Automated rules

Current `npm test` runs **89/89** non-browser assertions across
`tests/rules.test.ts` and `tests/expedition.test.ts`: automatic first kill,
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

Current candidate evidence on `851cd13`:

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
