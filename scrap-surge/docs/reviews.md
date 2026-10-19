# Three-model collaboration and sign-off record

Astra coordinates, defines architecture boundaries and reviews integration. Opus
reviews gameplay, aesthetics, audiovisual direction and feel. DeepSeek is the only
writer in this directory (implementation, tests, fixes). Astra, Opus and DeepSeek
have equal standing: a decision is implemented only after all three explicitly
agree. Silence, absence or an "approved" note written by one agent is not another
agent's approval.

Actual subagent configurations used by the coordinator:

- opus_design: kiro/claude-opus-5.5
- deepseek_qa: group/auto-deepseek-v4-1-flash

Both were spawned with fork_turns=none. They cannot introspect the provider's
underlying routing; the tool-call configurations and the real returned messages
are the verifiable evidence. This is not one model roleplaying three.

Author self-check is not independent review. The independent DeepSeek review must
run in a separate context against a frozen commit.

## Late-heal decision (2026-10-19)

Astra, Opus and DeepSeek agreed to one bounded recovery change after the f7 ranged
observation reached W18: entering expedition W11-W20 restores 4 health instead of 3.
W1-W10 and all slice entries remain 3. Recovery is selected by the destination wave
through one shared helper used by simulation and UI copy; the W10 stop therefore says 4
and the W9 stop says 3. The cap remains 10, and lost/won states are not resurrected.
This addresses attrition late in the run without changing damage, enemies, waves,
prices, or strategy. It does not promise a W20 victory.

## Explicit sign-off: S1 (feel slice, fixed numbers)

- Astra: agreed.
- Opus: agreed.
- DeepSeek (implementer): explicitly agreed to every fixed number, and specifically
  to `combatPicked` counting only combat pickups (sweep pickups never advance the
  magnet charge), the remainder carrying across waves, the FIFO of 12 blasts per
  tick with no silent drop, and the real chain count.

## Explicit sign-off: S1b (fist remnant, overtime UI, accounting)

- Astra: agreed, with the clarification that a remnant kill gives normal drops,
  can trigger domino and counts as a secondary chain death.
- Opus: agreed to all of S1b plus the same clarification, and added that the
  remnant must not damage the player, must not be targeted, must not occupy the
  180 live-enemy cap, keeps its own cap of 180, and renders dark, translucent,
  eyeless with a trail.
- DeepSeek (implementer): explicitly agreed to the remnant at 0.6s life, 650
  initial speed, decay 7, 30 damage, once per target, no repeated death or drop
  from the remnant itself, and secondary-chain counting; the independent 180 cap
  and no player damage; the 15s overtime countdown; and the count reclamation with
  a real chain peak.

## DeepSeek implementation review: S1c (aesthetics only) — I explicitly agree

I explicitly agree to S1c because each item is presentation-only and cannot alter
combat rules, collision, spawn numbers or timing:

1. Weapon mounts use a metal-grey/ivory base with a dark outline and keep the
   per-weapon identity colour at the muzzle tip, so the fast gun no longer shares
   the crab's teal.
2. The ivory shell gets warm spiral shading so it reads as a hermit-crab shell
   rather than a flat white disc.
3. The thin crossed legs become six short, thick, dark-outlined legs, and the
   ground ring is a complete translucent ellipse.
4. Damage numbers are white with a dark outline, with orange-yellow reserved for
   large damage and real chains. No crit system is invented. Eye outlines are
   thicker.

My reason for agreeing rather than deferring: the reviewer's finding was that the
teal player and teal-ish slinger were still confusable, which is a readability
failure of the S1 colour-separation goal, not a new gameplay decision. Every edit
lives in `src/render.ts`/`src/style.css` only. Opus signed these five items and
their boundary; Astra signed; this is the DeepSeek implementation signature.

## Independent DeepSeek findings raised before the freeze

These were raised by a separate read-only review context and are fixed in this
slice, with regression tests:

- A lethal spring-fist hit removed the enemy before the bowling pass, so the
  promised knockback never landed on the common bag/runner kills. Fixed with the
  S1b remnant.
- The first chain implementation counted the primary root kill and let a
  no-mod rocket radius kill accumulate into the chain counter, and reused one id
  as both allocator and display id. Rewritten to count only real secondary deaths
  with a monotonic id and per-causal-root counts.
- Wave 2 past 35s showed a frozen `00` timer during the invisible overtime.
  Fixed with the explicit overtime countdown.
- `spawnCount` advanced for spawns the 180 cap silently dropped. Now counts
  successful spawns only.
- Documented rather than changed: remaining queued blasts are cancelled at the
  wave boundary, pockets shrink under the enemy cap, and the 420 projectile cap is
  shared between player and enemy bullets.

## Status

That was the state at the time. The frozen slice was later reviewed and approved by
Astra, Opus and an isolated DeepSeek at `8cb0e8f`; the later result supersedes this
pending line (see the two sign-off sections below). Model review and an automated
victory still cannot establish whether this version feels satisfying to the user, and
no user acceptance exists.

## Full review and disposition of the unapproved expansion (2026-10-19)

After the previous implementer was interrupted, the working tree on
`codex/scrap-surge` carried unapproved edits to `src/data.ts`, `src/sim.ts` and
`src/render.ts` on top of source commit `ee53cf8`. Astra, Opus and an independent
DeepSeek review context each ran a full review of that extension. All three
explicitly agreed to the same disposition: **fully isolate the extension as a
draft branch, return the working branch to the committed slice, and review the
extension in phases later.** This is not a delete and not a merge. No party
approved shipping the extension as-is, and no party approved discarding it
wholesale.

Recovery performed under this agreement:

- The three files were committed, without change, to a new branch
  `codex/scrap-surge-expansion-draft` as an explicitly unapproved, unintegrated
  WIP draft. Draft SHA: **8e1542ebd8f8568bcdc9f2301050cd3f85acb6e0**.
- `codex/scrap-surge` was switched back to committed source `ee53cf8`; the
  working tree is clean. The draft commit reproduces the exact pre-recovery file
  contents, so the original hashes stay recoverable.

The audit snapshot at `/tmp/scrap-audit-ofrJ1o` (a patch of the extension plus a
snapshot server) is an auxiliary path only. Any project reproduction must use the
draft branch SHA above; nothing in the project may depend on `/tmp`.

### Blockers recorded (must be resolved before any reuse)

- **B1.** On main the shop still calls `chooseMod`, the UI still has two waves and
  the anchor icon is missing, so the first shop actually errors and cannot advance
  to the next wave. The extension does not fix this; it must not be presented as
  runnable on that path.
- **B2.** In the snapshot `npm test` was 32/36 and `npm run build` failed the
  TypeScript check (a stale Gun-level fixture). That fixture failure does not mean
  every mechanic is broken; it means the extension was never green.
- **B3.** `wave2.hp` of `1.35` moves runner `19 -> 26` and can `75 -> 101`, and
  bossborn `0.65 -> 1.2`. The claim that old numbers are unchanged is false; any
  reuse must restate the real numbers.

### New-mechanism issues recorded

- The barrel `bool` loses multiple volleys.
- The saw's free volley resets the cooldown.
- The echo persistent-cutting text describes more than the single hit it applies.

### Items of value that must be signed off in a separate package

The wave table, weapon merging and the new enemies/feedback mechanisms are worth
keeping, but they are new product scope. They require a fresh, explicit three-party
sign-off before any implementation.

### Other recorded findings

- `qaStart` is not exposed on main, so it is not a cheat backdoor in the shipped
  path.
- The infinite `refine` does not directly require a hard cap; it needs an economy
  review.
- S1d (fast gun `18 -> 20`) was agreed by all three and is now implemented at
  `d6ba6fe`. The recovery package recorded above did not implement it; the S1e
  review below covers `d6ba6fe`.
- `ee53cf8` is the post-palette-restore slice. The pending state recorded here at the
  time was resolved later: `ee53cf8` led through S1d/S1e/T1 to `8cb0e8f`, which Astra,
  Opus and an isolated DeepSeek reviewed and approved (see the sign-off sections
  below). The older `21a18fd` review must still not be reused for this line of SHAs.

## Review of d6ba6fe and the S1e aiming fix (2026-10-19)

All three parties reviewed `d6ba6fe` ("S1d: can-popper damage 18 -> 20").

- Automated: `npm test` 37/37, `npm run build` clean, the author-run browser
  regression 19/19, and a normal-play browser victory at 286 kills.
- Astra's first-shop review **failed**: normal keyboard input reached the first shop
  on 0/3 seeds and touch on 2/3 seeds. That is the blocking result for this build.
- Opus: the visual work passed, but Opus blocked the build overall because of the
  first-shop failure.
- Independent DeepSeek: confirmed the root cause is the weapon aim geometry. The gun
  aimed from the player centre while the bullet leaves a mount offset from it, so a
  target level with the player on the mount's left or right was shot straight past and
  never hit. This is a long-standing S1 defect, **not** introduced by S1d, which only
  changed the damage number.

Three-party decision (S1e): fix exactly that aim geometry and nothing else. Each shot
now aims from the mount toward the same predicted point, with the lead factor, target
selection, range, damage, fire rate, spawn and economy all unchanged, and the muzzle
still at `mount + direction * 24`. The coil/fist direct-hit rules and the saw are
untouched; no anchor or draft code is involved.

S1e result on `codex/scrap-surge`: `npm test` 40/40 (three new tests: left/right 140px
same-row enemies are hit and killed within two seconds through the real weapon path, a
single gun reaches all eight fixed directions, and multi-slot mounts keep every
direction covered), `npm run build` clean, the first-shop review now passes (keyboard
3/3, touch 3/3, no page errors), and, per Astra's own run on `03ff521`, a normal-play
browser victory at 309 kills, hp 9. The earlier author figure of 287 kills was not
re-executed and is not adopted.

Retraction: the S1e author first wrote "browser regression 19/19", but that number
came from a stale `artifacts/browser-regression-results.json` (a pre-S1e run), not a
fresh run. The fresh regression on `03ff521` was 18/19: A2 required idle play to die,
and after S1e an idle/ordinary run can win, so the death path was no longer covered.
That claim is withdrawn; T1 replaces the idle-death assertion with an explicit
forced-defeat fixture (below).

The first-shop gate counts three seeds per input mode. n = 3 is only a smoke test, not
a statistical claim; a passing run does not prove every seed works.

## Package T1: read-only metrics and a forced-defeat fixture (2026-10-19)

T1 was approved by all three parties and changes no simulation, rendering, numbers or
shop logic.

- `src/main.ts` exposes `scrapMetrics.enemyPositions`: a fresh array of fresh `{x, y}`
  copies for every enemy with `hp > 0`, including the warning-outline enemies already
  drawn on screen. No live enemy reference leaves the getter and there is no setter.
- `tests/browser-regression.mjs` keeps the ordinary idle terminal/record/retry checks
  but no longer requires idle play to die or to win. The defeat path is now an explicit
  G fixture: an ordinary keyboard charge toward the nearest enemy from
  `enemyPositions`, fixed seeds 2a/17/91, one run each. A run ends at a loss or at the
  wave-1 shop; a shop end is not a death and a 40s timeout fails. The group must
  contain at least one real loss at 0 hp with the failure UI and a working retry. An H
  check proves the `enemyPositions` snapshot cannot mutate live state.

This T1 G description is historical and **superseded by T2**: the 40s cap and the
wave-1 shop as a terminal end are old rules only. The current fixture keeps the shop
non-terminal, uses a single 100s cap, and classifies
`death` / `deadline` / `won` / `timeout` as described in the T2 section.

At least one loss proves the defeat path is reachable; it is not a claim that every
seed loses, and it is not a difficulty or acceptance judgement. The T1 evidence on the
T1 commit: `npm test` 40/40, `npm run build` clean,
`npm run test:browser:regression` 23/23 (the charge fixture lost all three fixed seeds
2a/17/91 at 0 hp; the ordinary A-run won normally at 305 kills) and
`npm run test:browser:first-shop` keyboard 3/3 + touch 3/3. The earlier S1e "19/19"
number is not reused.

## Three-party slice-gate sign-off: 8cb0e8f (2026-10-19)

Frozen candidate **8cb0e8f104d4150ceca8f8660ae6a6c62972e208** (S1 + S1b + S1c + S1d +
S1e + T1). Astra, Opus and the independent DeepSeek each reviewed this exact SHA and
explicitly approved the slice scope. Each ran its own session; the death samples are
registered per party and must **not** be merged into one "3/3" claim.

- Astra: `npm test` 40/40, `npm run build` clean, first-shop keyboard 3/3 + touch 3/3,
  regression 23/23. G fixture: 2a reached the shop, 17 and 91 lost (2 deaths), retry
  reset normally. Normal browser run won at 308 kills, hp 9, chain peak 18, pending
  peak 14, no page errors. Environment Chrome 155, macOS 26.6.2, Apple M4, 1440x960
  DPR1; raw rAF final 1800 samples median and p95 16.7ms - a headless frame-interval
  measurement, not GPU, phone or peak-load acceptance.
- Opus: same SHA approved. `npm test` 40/40, `tsc` clean, regression 23/23. G fixture:
  2a and 91 reached the shop, 17 lost (1 death). H copy-isolation passed. Its `03ff521`
  visual check is inherited as valid because the render/css/sim/data blobs are
  unchanged at this SHA, so no new screenshots were taken; earlier ordinary play won
  four runs.
- Independent DeepSeek: same SHA approved, no blocker. `npm test` 40/40, build clean,
  first-shop 6/6, regression 23/23. G fixture: 2a and 17 reached the shop, 91 lost (1
  death). H passed.

Gate reading: the group gate is "at least one real loss at 0 hp", a limited
reachability check. It is not proof that every seed loses, and it is not a difficulty
measurement. The whole group could still end with zero deaths on an unlucky timing run;
that instability is recorded, not hidden.

Outcome: the two-wave feel-validation slice **passes** the three-party slice gate. This
is not the full 10-20 minute goal, which is **not** complete. There is **no user
acceptance** yet, and **no expansion beyond the slice is authorized**.

## F0 approval and scope: repair + minimal-build feasibility (2026-10-19)

After a full read-only review, **all three parties rejected the original whole-package
E1** (12 waves + 3-star upgrades + 3 mods delivered together). The rejection and the
standing constraints are:

- **R1** the frozen slice stays frozen at `6780128`; its two-wave behaviour must not drift.
- **R2** the full 10-20 minute goal is unchanged and is **not** user-accepted.
- **R3** the next step is only a necessary-repair package plus a minimal build-difference
  feasibility check; implementation stays unauthorized until the three parties agree.
- **R4** once agreed, DeepSeek is the only writer and an independent reviewer checks it in
  a separate context.

**F0 was then agreed by Astra, Opus and DeepSeek** (this entry registers DeepSeek's
explicit agreement). F0 is a repair + instrument package only:

1. Docs converge the current facts and history, register the E1 rejection and R1-R4, and
   remove the stale "pending" / "the user must play before anything moves" wording. The
   user's own text allows autonomous, reversible progress while the three parties agree;
   that permission must never be written up as user acceptance.
2. `bossSpawned` is set, and the `wave` event is fired, only when the boss really spawns.
   While wave 2 is past the 18s boss trigger and the boss is still pending, ordinary
   spawns stop one short of the 180 live-enemy cap so a slot is always reserved for the
   boss. The check sits in `spawn()`, so it covers both the timer and the pocket paths,
   and the three RNG draws keep their old order. If the arena is already full the boss
   waits for a real death; the cap is unchanged and nothing is deleted to make room. A
   failed attempt is retried on the next step.
3. Read-only instruments, all per run (a new `Game` starts them at zero, and a paused
   phase never steps): `shootAcceptedPlayer` / `shootAcceptedEnemy`,
   `shootRejectedPlayer` / `shootRejectedEnemy`, `bulletPeak`, and
   `popcornBudgetSkippedPickups`. They are exposed as scalars on `scrapMetrics` and never
   change combat, RNG, target choice or the bullet budget, and they do not claim the
   budget is fixed or that enemy bullets are starved.
   `shootAcceptedEnemy` counts enemy projectiles admitted into the bullet array before the
   420 cap; it is **not** a player-hit or injury counter. The available evidence does not
   establish which damage source caused the late-wave attrition.
4. Unit tests for the boss reject / release-then-spawn / uniqueness path and for the
   reject-bullet and popcorn-budget counters, while the 40 simulation tests and the slice
   browser gates stay green.

Opus's four final conditions are part of the spec: `shots` keeps its success-only
meaning and is pinned by a test; a full arena still loses at the 50s deadline and the HUD
boss prompt only appears after a real spawn; the fifth same-step pickup with a target is
8 bullets + 1 skip while a target-less or sweep pickup adds nothing and no RNG or budget
changes; `scrapMetrics` exports scalars only.

F0 does **not** change the popcorn mechanic, the camera, the visuals, the weapons or the
waves, and it does not merge the expansion draft `8e1542e`.

F0 code checkpoint: **42f4ff8f6163f6565ab4f939de147efa5a7b0564** (docs-only follow-up
commit records this SHA; the code is identical).

### Per-party review of `a434f12` (F0)

Each party ran its own session against `a434f12`. The source was approved by all three;
the documentation blockers found here are the same items repaired in the T2 package.

- **Astra**: `npm test` 47/47, `npm run build` clean, ordinary browser run reached
  victory at 287 kills, hp 10, chain peak 13, pending peak 14, no page errors;
  first-shop keyboard 3/3 + touch 3/3. Three fixed-seed (`2a`/`17`/`91`) per-step state
  and event hashes were identical to baseline `6780128`, so these finite normal
  trajectories show no combat drift. F0 instruments on the normal run read 598 accepted
  player shots + 8 accepted enemy shots = 606, 0 rejected player / 0 rejected enemy,
  projectile peak 60, popcorn skips 0 - limited samples, not a performance result.
- **Opus**: `npm test` 47/47, `tsc` clean, first-shop 6/6. Regression was **22/23,
  exit 1**: all three G seeds ended at the first shop (hp 5 / 1 / 3, deaths 0), so the
  slice-era "at least one 0 hp death" gate genuinely failed. That failure is a real
  result - it is retained, not re-run until it passes. Fifteen limited simulation
  trajectories matched `6780128`.
- **Independent DeepSeek**: `npm test` 47/47, `npm run build` clean, ordinary browser
  run passed its five checks (chain peak 19, pending peak 10; kill and hp were not
  reported, so they are not guessed here), first-shop 6/6, regression 23/23 (G: seed 2a
  shop hp 4, seed 17 lost at hp 0, seed 91 shop hp 1 - one real death). Source approved
  at this SHA; the documentation gaps matched the ones under repair. T2 agreed,
  including its timing risk.

Gate reading: the G fixture is probabilistic and timing-sensitive. A green group run
means the death path was reachable on those seeds in that run; it is not a stability
claim, and the 22/23 and 23/23 results are two honest samples of the same fixture.

### T2 fixture revision (tests-only, agreed by all three)

T2 keeps the old G strategy (70ms poll, +-6px deadzone, charge the nearest enemy) but
makes the first shop non-terminal. The final spec, agreed by Astra, Opus and DeepSeek:

- The run buys **no weapon**, takes exactly `magnet` + `popcorn`, then continues through
  wave 2 to a real outcome.
- A **single 100s wall limit**, no per-phase timer (normal play tops out at
  20 + 1 + 50 + 1 = 72s).
- `endReason` is `death` / `deadline` / `won` / `timeout`. `death` means lost at 0 hp and
  is the only outcome that counts toward the group gate; `deadline` means lost with
  hp > 0 (boss alive at the 50s limit) and is recorded as not covered; `timeout` fails.
- Only runs that actually reach the shop assert the exact mods and gun contract
  (`mods === [magnet, popcorn]`, `gunsAtShop === 1`, `gunsAtWave2 === 1`); no page
  errors applies to all runs. A 0 hp death requires the failure UI plus a retry that
  resets to fight / 10 hp / 0 kills / 1 gun / 0 mods.
- Three fixed seeds, one run each; nothing is retried to force a result.

Historical diagnostics from this period are kept but are **not** T2 passes: Opus's
`/tmp` single 95s run produced 2 deaths and 1 win without the mod or gun-count
assertions (seed 91 did go shop -> wave 2 -> won, a finite observation that the new path
works, not a final T2 pass); an independent diagnostic had all three seeds die in wave 1
and never reach the new shop branch, which is no stability claim either.

### T2 author defect found before freeze (2026-10-19)

The first author run of the T2 G block is recorded here as a **defective revision**, not
as a T2 result. It produced 21/23 with two failures that were the fixture's fault, not
the game's:

- The pass condition required `shopReached` unconditionally, so a genuine wave-1 death
  (seeds 17 and 91, both real `lost` at 0 hp with a working retry) was failed. The
  agreed spec never required every seed to reach the shop. The shop contract
  (exactly `magnet` + `popcorn`, `gunsAtShop === 1`, `gunsAtWave2 === 1`) applies only
  once a shop was actually reached. Fixed to
  `errors.length === 0 && !timedOut && (!shopReached || shopContractOk)`.
- `page.waitForFunction(fn, { timeout: 5000 })` passed the options object as
  Playwright's second argument, which is `arg`, so the timeout was never applied. Fixed
  to `waitForFunction(fn, undefined, { timeout: 5000 })` and the `.catch()` removed, so
  a failure to leave the shop fails the run instead of being swallowed.
- `won` now records `death path not covered` in its detail, alongside `deadline`.

Raw log of the defective run: `/tmp/t2-logs-20261019T074132/browser-regression.log`.
Everything else in it passed: A1/A3-A6, B1-B3, C1-C2, D1-D2, E1, F1-F5, G seed 2a
(shop -> wave 2 -> won at hp 1, exactly magnet+popcorn and one gun), the group death
gate (2 real 0 hp deaths) and H. The strategy, seeds and combat rules are unchanged by
the fix; the corrected run is a new verification, not a re-run selected for a pass.

Corrected T2 verification, run once with no retry: **23/23, exit 0**
(`/tmp/t2-fixed-20261019T074505/browser-regression.log`).

- seed 2a: shop reached (money 146, 1 gun, exactly `magnet`+`popcorn`), wave 2,
  **death** at 0 hp after 203 kills, 45.1s; failure UI visible, retry reset to
  fight / 10 hp / 0 kills / 1 gun / 0 mods; no page errors.
- seed 17: shop reached (money 144, 1 gun, exactly `magnet`+`popcorn`), wave 2,
  **death** at 0 hp after 217 kills, 47.8s; same retry reset and no page errors.
- seed 91: **death in wave 1** at 0 hp after 68 kills, 19.0s; the shop branch was not
  reached, which is explicitly valid for a genuine death, and the detail records
  "shop path not covered" rather than failing on shop-only assertions. Retry reset
  verified, no page errors.
- Group: 3/3 real 0 hp deaths, so the death gate is covered on these seeds in this run.

This is a single three-seed sample of a probabilistic, timing-sensitive fixture. It is
not a stability claim, not a difficulty measurement and not user acceptance.

T2 freeze checkpoint: **5e050b221775f57744e39bfd20f5fbc4499360a6** (tests + docs only).

### Per-party single independent runs of `5db93f9`

Each party ran its own session once against the same source (`42f4ff8`) and the same
T2 test revision (`5db93f9`). The runs diverged - the fixture is probabilistic - and the
divergence is recorded rather than smoothed over:

| party | `npm test` | build | regression | G seeds |
| --- | --- | --- | --- | --- |
| Astra | 47/47 | clean | 23/23 | 2a wave-2 **won** hp 4; 17 wave-1 **lost** hp 0 with working retry; 91 wave-2 **won** hp 3. deaths = 1 |
| Opus | 47/47 | clean | 23/23 | 2a wave-2 **lost**; 17 wave-1 **lost**; 91 wave-1 **lost**. deaths = 3 |
| independent DeepSeek | 47/47 | clean | 23/23 | all three wave-2 **lost**: 2a 188 kills / 42.1s, 17 202 kills / 41.7s, 91 238 kills / 49.1s |

In the independent DeepSeek run the shop mod and gun assertions matched strictly, there
were no page errors, and retry behaved normally in every run. All three parties passed
the 23/23 regression and the 47/47 rule suite on this exact source + test pair.

Reading: the G result varies by seed and by run - one party saw a wave-2 win and one
death, another saw three wave-1 deaths, a third saw three wave-2 deaths. That is the
fixture's known probabilistic, timing-sensitive character. A 23/23 here is **not** a
stability claim, and it does not overwrite Opus's earlier genuine 22/23 failure on the
slice-era G (all three seeds stopped at the shop with 0 deaths). Model review is also
not user acceptance.
