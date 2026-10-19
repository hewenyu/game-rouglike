# Expedition20 proposal (UNIMPLEMENTED, NOT APPROVED)

Status: **proposal only**. No part of this document is implemented or approved until
Astra, Opus and DeepSeek sign the same text. The shipped page remains the two-wave slice
at `2746a01`.

Technical selection: TypeScript + Vite + Canvas stays. That already satisfies the
"prefer Go and TypeScript" rule; there is no server-side need, so no Go backend or build
rewrite is proposed.

## 1. Scope

**In:** a second mode `expedition20` (20 waves, 692s combat, 9 full shops, 6 quick
choices), two enemy behaviours, one boss model with four stages, gun tier II, mod tiers
II/III, one two-way branch, records isolation, visual/audio support, finite validation.

**Out:** third mod slot, fourth mod, PARTS, refine, meta-progression, seventh gun,
second currency, multiplayer, acid pool or any new ground hazard entity, camera
overhaul, external/paid assets, production debug entry, bot lab, 3-star weapons.

### 1.1 Mode isolation

- `new Game(seed)` keeps today's behaviour = `slice`, so the existing 47 rule tests,
  23 regression checks and first-shop suite keep testing the frozen slice untouched.
- `new Game(seed, "expedition20")` is the new mode. Slice numbers are never mutated to
  serve expedition; shared helpers may be parameterized but slice behaviour is
  byte-identical.
- The UI defaults to `expedition20` for a normal player; slice stays reachable by an
  explicit mode selector (URL parameter or title toggle) for teaching and regression.
- **Records:** the slice keeps its existing `scrap-surge.v1` key unchanged, so existing
  local records survive. Expedition20 uses a **new** key
  (`scrap-surge.expedition20.v1`). Mute preference is read from the old key and written
  to both, so a player's audio setting carries over without migrating run counts.

## 2. Run structure

### 2.1 Durations (fixed)

| W | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| s | 20 | 22 | 24 | 26 | 28 | 28 | 30 | 30 | 32 | 40 |

| W | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| s | 32 | 34 | 34 | 36 | 45 | 38 | 38 | 40 | 40 | 75 |

Total combat: **692s (11m32s)**. Shop time is never counted and never capped; "about 15
minutes" is an estimate, not a constraint on the player.

### 2.2 Stops

| After wave | Stop | Content |
|---|---|---|
| 1 | quick | first mod (1 of 3), free |
| 2 | full shop | guns, reroll |
| 3 | quick | second mod (1 of 2 remaining), free |
| 4 | full shop | guns, reroll |
| 5 | quick | permanent branch: 航迹 or 余烬 |
| 6 | full shop | guns, reroll |
| 7 | auto | slot +1, 1.2s interlude |
| 8 | full shop | guns (tier II opens), reroll |
| 9 | quick | mod +1 tier |
| 10, 12, 14, 16, 18 | full shop | guns, reroll |
| 11, 15, 19 | auto | 1.2s interlude |
| 13, 17 | quick | mod +1 tier |
| 20 | end | victory / defeat |

**9 full shops** (2,4,6,8,10,12,14,16,18), **6 quick** (1,3,5,9,13,17), **4 auto**
(7,11,15,19).

Auto transition rule: a **1.2s simulated interlude** during which the run keeps
updating; it is not a dialog and does not require releasing keys or dismissing
anything. A held movement key simply carries into the next wave. Window blur or
visibility loss still triggers the **real pause** path, and resuming clears ghost keys
(input state is reset) so the player never drifts. Any auto transition still respects
pause: if paused, the interlude does not advance.

### 2.3 Mods

- Permanent **2 mod slots**.
- Wave 1: one free mod of three. Wave 3: the second, from the remaining two.
- Waves 9/13/17: one tier each, to an existing mod below III. If only one legal target
  exists the player still confirms explicitly.
- Final spread is intended as one III + one II; III+III is unreachable with 3 upgrades.
- UI: the wave-1 and wave-3 quick choices are mod-only screens. The wave-2 full shop is
  **guns only**. Slice keeps its current combined panel unchanged.

### 2.4 Gun slots

- Start with **2 slots**: the slinger plus **one empty slot**.
- Slot growth **+1 after waves 2, 4, 7, 11** → 2,3,4,5,6.
- The first full shop (after wave 2) therefore has **3 slots** and can buy two guns.
- A slot is capacity, not a free gun.

### 2.5 Tier II capacity ramp

Tier II is not all unlocked at once. The number of tier-II guns the run may hold grows by
shop: **W8 = 1, W10 = 2, W12 = 3, W14 = 4, W16 = 5, W18 = 6**. This is a live capacity
for the current wave, not a one-time voucher: it reads from the wave number each shop,
selling a tier-II gun frees capacity immediately, and no extra currency is involved.
Upgrading an already-owned selected slot is allowed whenever capacity is available.

## 3. Economy

Single currency (scrap). Drop values unchanged: bag 2, runner 2, can 4, splitter 3,
chip 1, spitter 4, boss 15/30/45/60 at W5/10/15/20.

### 3.1 Integer price formula

All prices are integers via `ceil(B * mult * (w + 4) / 5)`, with `B` = weapon base price
and `w` = current wave. There is no floating-point factor anywhere in the price path.

| Purchase | mult |
|---|---|
| new gun | 1 |
| tier II | 4 |

Reference: slinger tier II at W8 = `ceil(20*4*12/5)`… using B=15 gives
`ceil(15*4*12/5) = 144`. The earlier 145 came from a floating-point 1.4 factor and is
withdrawn; the test must assert **144**.

### 3.2 Buying and upgrading (two explicit actions)

- The shop has two explicit actions per offer: **buy as a new stack** and **upgrade a
  selected owned slot**. Neither is implied by the other and the UI never silently
  guesses.
- If the type is already owned, "upgrade selected slot" targets the slot the player
  selected - **not** the lowest tier.
- A full 6-slot loadout can still upgrade an owned slot.
- Duplicate purchase is optional; nothing forces buying all six types.
- At tier II the action is disabled with a stated reason and **no money is deducted**.

### 3.3 Selling

- Sell the **selected slot**, not the lowest tier.
- Refund = `floor(0.35 * cumulative_paid_for_that_slot)`.
- The last remaining gun cannot be sold; the action is disabled and rejects with no
  money movement.
- Selling is only available in a full shop.

### 3.4 Offers and rerolls

- 4 gun cards per shop.
- Composition: at least one already-owned offer, and - if any type is still unowned - at
  least one unowned offer. This is a composition constraint only: it never guarantees
  affordability and never creates a negative or zero price.
- If every type is owned at tier II, the constraint degrades to "at least one owned";
  no synthetic filler is invented.
- Rerolls use the shop RNG stream: first free, then 6, 8, 10, 12, … (the slice's 6 is
  unchanged for slice).

### 3.5 Static ledger (estimate, not a promise)

`docs/expedition20-ledger.mjs` is the reproducible calculator for the table in §4 and the
income column. All figures are **static estimates under stated assumptions**, not
measurements:

- 100% of spawned value collected;
- no boss drops counted;
- no overkill or area-damage modelling;
- purchases spread as one new gun before W18 and tier II at the capacity waves.

Cash is expected to be **left over**, not tight. This plan explicitly does **not**
claim "money never limits anything" or "2-3 items per shop"; the ledger shows the
estimate, and the real per-seed shop ledger is measured during implementation
validation. Sensitivity is reported at 70% / 85% / 100% collection by reading the
cumulative-income column.

### 3.6 Affordability check (the independent-review concern)

The concern was that income runs far ahead of a full tier-II build, so the later shops
go idle. Static estimate from the ledger script:

| cumulative cash | 70% | 85% | 100% |
|---|---|---|---|
| by W10 | 3057 | 3712 | 4367 |
| by W18 | 7891 | 9581 | 11272 |
| by W20 | 9951 | 12083 | 14215 |

A full 6-gun tier-II build (new guns at W2/4/7/10/12/14 + tier II at the capacity waves
8/10/12/14/16/18) costs **2073** at integer prices: 18.4% of W18 income at 100%
collection, 26.3% at 70%. Cash is therefore expected to be **far ahead** of what a
coherent build needs, even in the pessimistic 70% case.

This plan does not hide that: it says the late shops are likely to be slack, and that is
a **known risk to the pacing goal**, not a claim that the economy is tense. If real play
confirms it, the response is fewer shops or higher prices - **not** a new currency and
not a claim that money never limits anything.

## 4. Wave table (exact)

Rules: `rate` spawns/s (timer = `1/rate`); pockets are `[time, count, formation]` with
`ring` / `stream` / `split` semantics; `mix` is bag/runner/can/splitter/spitter percent;
HP column is **bag/runner/can/splitter/spitter/chip** integer values.

- `ring` - one full circle at once (burst; rewards area damage).
- `stream` - many small pockets on a short cadence (sustained pressure; rewards
  consistent DPS).
- `split` - heavy splitter pockets (cascades into chip swarms).

| W | dur | rate | pockets | mix | pocket mix | HP |
|---|---|---|---|---|---|---|
| 1 | 20 | 3.1 | 6:12 ring, 14:12 ring | 87/13/0/0/0 | 58/42/0/0/0 | 17/19/75/40/55/8 |
| 2 | 22 | 3.4 | 5:13 ring, 12:13 ring, 18:13 ring | 62/26/12/0/0 | 56/28/16/0/0 | 17/19/75/40/55/8 |
| 3 | 24 | 3.7 | 6:14 ring, 14:14 ring, 21:14 ring | 62/24/14/0/0 | 56/28/16/0/0 | 17/22/86/46/63/9 |
| 4 | 26 | 4.0 | 6:14 ring, 13:14 ring, 20:14 ring | 56/26/18/0/0 | 54/26/20/0/0 | 17/25/98/52/72/10 |
| 5 | 28 | 4.4 | 5:15 ring, 12:15 ring, 19:15 ring, 25:15 ring | 52/26/22/0/0 | 50/26/24/0/0 | 17/28/109/58/80/12 |
| 6 | 28 | 4.6 | 6:15 stream, 13:15 stream, 20:15 stream | 46/24/18/12/0 | 42/24/22/12/0 | 20/30/120/64/88/13 |
| 7 | 30 | 4.8 | 6:16 stream, 14:16 stream, 22:16 stream | 44/24/18/14/0 | 40/24/22/14/0 | 20/33/131/70/96/14 |
| 8 | 30 | 5.0 | 5:16 stream, 13:16 stream, 21:16 stream, 27:16 stream | 42/24/18/16/0 | 38/24/22/16/0 | 20/36/143/76/105/15 |
| 9 | 32 | 5.2 | 6:17 stream, 14:17 stream, 22:17 stream, 29:17 stream | 40/24/18/18/0 | 36/24/22/18/0 | 20/40/158/84/116/17 |
| 10 | 40 | 5.4 | 6:17 ring, 14:17 ring, 22:17 ring, 30:17 ring, 36:17 ring | 38/24/18/20/0 | 34/24/22/20/0 | 20/44/173/92/126/18 |
| 11 | 32 | 5.6 | 8:12 stream, 12:12 stream, 16:12 stream, 20:12 stream, 24:12 stream, 28:12 stream | 40/22/22/16/0 | 38/22/24/16/0 | 24/48/188/100/138/20 |
| 12 | 34 | 5.8 | 8:12 split, 20:12 split, 28:18 split | 34/20/18/12/16 | 32/20/20/12/16 | 24/51/203/108/149/22 |
| 13 | 34 | 6.0 | 7:18 split, 14:18 split, 21:18 split, 28:18 split | 32/20/18/14/16 | 30/20/20/14/16 | 24/55/218/116/160/23 |
| 14 | 36 | 6.2 | 8:12 stream, 11.5:12 stream, 15:12 stream, 18.5:12 stream, 22:12 stream, 25.5:12 stream, 29:12 stream | 30/20/18/16/16 | 28/20/20/16/16 | 24/60/236/126/173/25 |
| 15 | 45 | 6.4 | 6:20 split, 14:20 split, 22:20 split, 30:20 split, 38:20 split | 28/20/18/18/16 | 26/20/20/18/16 | 24/65/255/136/187/27 |
| 16 | 38 | 6.6 | 8:12 stream, 12:12 stream, 16:12 stream, 20:12 stream, 24:12 stream, 28:12 stream, 32:12 stream, 35:12 stream | 26/20/18/20/16 | 24/20/20/20/16 | 24/70/278/148/204/30 |
| 17 | 38 | 6.8 | 6:20 split, 24:20 split | 24/20/18/22/16 | 24/20/18/22/16 | 24/76/300/160/220/32 |
| 18 | 40 | 7.0 | 6:18 ring, 20:18 ring, 32:18 split | 30/20/16/20/14 | 24/20/18/24/14 | 17/83/326/174/239/35 |
| 19 | 40 | 7.4 | 5:16 ring, 10:10 stream, 15:16 ring, 20:10 stream, 25:16 ring, 30:10 stream, 35:16 ring | 32/20/16/18/14 | 24/20/18/24/14 | 17/89/353/188/259/38 |
| 20 | 75 | 7.8 | 6:12 ring, 20:12 ring, 34:12 ring, 50:12 ring, 66:12 ring | 26/20/16/22/16 | 20/20/18/26/16 | 24/97/383/204/281/41 |

### 4.1 Bag "fuel" schedule

Bags are the low-HP fuel that keeps fixed damage from feeling like scraping:

- W1-5: **17**
- W6-10: **20**
- W11-17: **24**
- W18-19: **17** (deliberate dip: dense low-HP tide, see below)
- W20: **24**

There is no automatic second damage source that grows with the wave.

### 4.2 Special-enemy introduction

Splitter and spitter do **not** debut together early; W1-5 stay bag/runner/can so the
basic loop is learned. **Splitter enters at W6** and **spitter enters at W12**, each well
after its counterplay exists. W12+ mixes shift away from bags, so pressure changes
shape rather than only HP.

### 4.3 W17-20: the payoff tide

- W17: two heavy splitter pockets, cascade setup.
- **W18/W19: bag share rises back to 30-32%** and pockets are explicit ring/stream
  alternation, so the board is a dense low-HP tide: the formed build visibly clears
  screens. This is the shape payoff the user asked for, not just more HP.
- W20: the boss wave with five ring pockets before the 75s end.

Justification for the 6/12 introduction: introducing splitters at W3 (before area
damage and mod tiers) and spitters at W4 (before the second mod) makes early waves read
as unfair chip damage. 6/12 gives each behaviour a readable counterplay window while
still appearing in more than half the run.

### 4.4 Bosses (one model, four stages)

A single boss archetype with escalating stages; the player may stand still when the
build is formed, so no boss forces permanent movement.

| W | Boss | HP | Behaviour |
|---|---|---|---|
| 5 | 罐头大王 CAN KING | 560 | 8-way radial, 2.4s |
| 10 | 铁壳督军 SCRAP WARLORD | 1600 | 10-way radial, 2.1s |
| 15 | 废铁母舰 THE LEVIATHAN | 3000 | 12-way radial, 1.9s |
| 20 | 潮汐核 TIDE CORE | 5000 | 12-way radial, 1.75s |

- All spawn at `duration - 18`, must die by `duration`, and all get **+15s overtime**
  with the existing live countdown.
- Missing the overtime deadline is a real defeat at hp > 0.
- The F0 slot reservation applies to every boss wave (179 while pending, real death
  frees the last slot, failed attempt retries next step).

## 5. New enemies (max 2)

### 5.1 Splitter 裂壳蟹

- Stats: 40 base HP (scaled per §4), r 20, speed 50, drop 3, born 0.65, contact only.
- On death spawns **2 chips** at ±60 units from the death point on a seeded angle, via
  the normal `spawn()` path (so cap and boss reservation apply).
- A chip rejected by the cap simply does not exist: no deferred queue, no extra value.
- Chip: 8 base HP, r 10, speed 118, drop 1, contact only.
- A full split is worth 3 + 2×1 = 5 in three pickups; the 250 merge rule still applies.

### 5.2 Spitter 吐酸罐

- Stats: 55 base HP, r 19, speed 34, drop 4, **born 0.8 counts toward the cap** (it
  occupies a live slot like every warning-outline enemy).
- Holds at 320 units and fires a slow aimed projectile: speed 190, damage 1, life 3.5s,
  radius 7, every 2.2s, with a **0.8s visible tell**.
- Aims at the player's position at fire time with no lead; steady movement dodges it.
- No acid pool, no ground hazard, no new entity.
- Enemy bullets use `kind: "enemy"` and the shared 420 cap.

## 6. Bullet quotas and popcorn

### 6.1 This batch uses the shared 420 cap

Decision: **this implementation keeps the existing shared 420 cap** for both modes. The
split 360/60 idea is withdrawn from this batch; no "decide at implementation time"
ambiguity. New F0-style counters still split accepted/rejected by side, so enemy
starvation is measurable. If real play shows enemy bullets being starved, a split quota
becomes a separate, separately-approved change.

### 6.2 Popcorn: delayed firing, not compression

Two **separate budgets**, each with its own counter:

| Budget | Rule |
|---|---|
| normal pair | max **4 credits per step**; one credit = one pickup = one atomic **2-bullet pair** |
| tier III ring | max **8 bullets per 0.5s**; independent `ringPending` scalar |

Normal pairs:

- Every fight-phase pickup with popcorn adds exactly **1 credit**, whether or not a
  target exists at that moment.
- Drain requires **2 free player-bullet slots**; the pair is atomic - it fires both
  bullets or neither.
- No target at drain time: the credit is **retained**, not discarded.
- If the player quota is exhausted, credits are retained and retried next step.
- `popcornPendingCredits` is unbounded in value but O(1) in memory (a scalar). At the
  wave boundary it is cancelled, counted as `popcornPendingCancelled`.
- **250 is not a pending cap.** It is only the scrap-object merge cap from the slice.
  Pending credits are bounded in memory by being one integer, never by object count.
- Bullets stay at **18 damage**; there is no per-bullet rescaling.

Tier III ring:

- Every 5 qualifying pickups adds 1 to `ringPending` (independent of normal credits).
- Ring firing requires **8 free player-bullet slots** and is atomic; it does not consume
  normal credits.
- It may fire with no target (radial pattern), and it has its own 0.5s cooldown.
- At the wave boundary `ringPending` is cancelled and counted.
- Both budgets spend from the **same shared 420 player slots**; the ring's 8 and the
  normal pairs' 8 are separate allowances, but neither bypasses the cap.

Honesty requirements:

- This is **delayed firing**, not "compression". The card and bullet visuals say the
  volley is queued, not that every pickup fires immediately.
- The plan claims **intent-count conservation** (credits are not silently dropped while
  the run continues), **not** "actual damage is conserved" and **not** "feedback is
  never lost": wave-end cancellation is an explicit, counted loss.

## 7. Branch: 航迹 / 余烬

Chosen after wave 5, permanent, mutually exclusive.

### 7.1 航迹 (Wake)

- Trigger: a **battlefield collect event**, evaluated at the moment of collection, at the
  player's position then - not a timer, not per 30 units travelled.
- Condition: current position is **≥30 units** from the last successful anchor.
- Effect: a static point for **1.0s**, radius **36**, damage **30**, each enemy once per
  point.
- Cap **180**, oldest removed FIFO.
- At branch selection and at every wave start `anchor = player position`, so standing
  still creates no first point.
- Wake points are **secondary damage sources and start their own chain roots**; those
  roots stay live while any wake point referencing them exists.

### 7.2 余烬 (Ember)

- Every scrap drop is **heat-locked for 1.2s**: it cannot be collected during that time.
- At the end of heat it explodes in place with **radius 55, damage 25**, then becomes
  collectible at its normal drop value. Ember itself adds no scrap: the "25" is the
  explosion damage, not a new value.
- **One explosion per object.** Merged objects keep the merged value; merging does **not**
  re-start heat and does **not** add another explosion.
- Cap **250 merged objects**; value merging unchanged; ember adds no extra value.
- At the wave boundary pending heat is cancelled and the value retained for sweep.
- Ember explosions are secondary kills and **inherit the chain root of the object that
  created the drop**; they do not mint a fresh root.

### 7.3 Chain-root correctness (must-fix)

Current code clears `chainCounts` when `chainTimer` hits 0. With a 1.2s heat window a
live root can still be referenced well after the 0.8s display timer.

- `chainTimer` expires the **display scalar only**; it must never clear the causal map.
- Roots are reclaimed **only by reference**. The live-reference set is exactly:
  pending blasts, live corpses, live wake points, and heat-locked ember scraps.
- Causal roots are attached to wake points and heat-locked ember scraps. Popcorn and
  magnet bullets keep today's weapon-source behaviour and do **not** mint or queue new
  roots; there is no unbounded root queue.
- Wave boundary clears all roots together with blasts, corpses, wake points and heat.

No claim is made that a cap proves an infinite loop terminates; validation is finite
scenarios plus wave-boundary termination.

### 7.4 Branch validation

Six-cell finite comparison: 3 mod pairs × 2 branches. Ember's 1.2s lock can delay
popcorn/magnet pickups, so that is **measured**, not asserted away. Visuals: wake uses
star marks, ember uses fragment marks, both in the warm palette.

## 8. Mod tiers II/III

Each tier needs a visible form change and a distinct short sound (existing audio limiter
reused, no audio refactor).

### 8.1 popcorn

- I: each qualifying pickup fires a 2-bullet homing pair (18 damage each).
- II: those bullets **pierce 1 enemy** (each enemy once per bullet).
- III: every 5 qualifying pickups also queues the 8-bullet ring per §6.2.
- Card shows the tier and states the queued-pair behaviour.

### 8.2 domino

- I: every kill queues radius 75 / damage 26.
- II: within a root, every 4th secondary kill adds +10% radius to that root's later
  blasts, capped at +60%.
- III: within a root, every 8th secondary kill also explodes radius 160 / damage 80.
- Counters are per root and die with the root.

### 8.3 magnet

- I: radius 300; every 8 combat pickups fires 10 capped bullets.
- II: those 10 bullets become homing.
- III: each burst also triggers a 0.6s full-arena attraction pulse; real scraps move, and
  it can re-trigger no faster than every 0.6s.

## 9. Gun tier II

- Opens at the **wave-8 shop**, gated by the capacity ramp in §2.5.
- One tier only. Interval is never changed.
- Damage multiplier is **×1.0** for guns whose tier II doubles projectiles/hit points and
  **×1.4** for shotgun and coil; the effective output lands near ×2 for the doubling
  guns.

| Gun | Tier II | Effective output |
|---|---|---|
| slinger | 2 bullets | 160 DPS = ×2.0 |
| shotgun | 7 pellets | 173 DPS = ×1.96 |
| saw | 2 hit points | 229 DPS = ×2.0 |
| coil | 7 chain targets | 282 DPS single-target = ×9.8 (multi-target by design) |
| rocket | 2 rockets | 75 DPS = ×2.0 |
| fist | force 800, remnant r ×1.25, damage ×1.0 | 160 DPS = ×2.0 |

The tier-II rule agreed with Opus is: doubling the output (slinger, saw, rocket, fist)
keeps damage ×1.0, while shotgun and coil use the ×1.4 damage multiplier because their
tier-II behaviour multiplies hits rather than doubling projectiles. Slinger tier II is
therefore **160** DPS at ×2.0, not 256 and not 128 - the 256/×3.2 line in an earlier draft
double-counted the multiplier.

All figures are nominal single-target except coil, which is explicitly a multi-target
weapon. The reproducible source is `docs/expedition20-ledger.mjs`.

## 10. Visual and audio

- Keep warm beach / sticker identity; no palette rework.
- Cans become **rust grey**, distinct from orange-red bags/runners.
- Boss nameplate moves below the top bar so it never overlaps the sound button; verified
  at 1440×960, 390×844 and 560×760.
- Splitter/chip/spitter need readable silhouettes; wake vs ember drops must be
  distinguishable from ordinary scrap.
- Map colour bands are presentation only; they never affect collision, spawn or
  targeting.
- No camera overhaul; touch stays fully usable; no hover-only affordances.
- Mod tier and gun tier II changes need visible form + a distinct short cue.

## 11. Architecture

- `sim.ts`: rules and state only - no DOM, rendering or audio.
- `render.ts`: reads state, never mutates it.
- `input.ts`: maps keys/touch to a movement vector only.
- `audio.ts`: consumes drained events only.
- Mode constants live in a data module, not as scattered magic numbers.
- `scrapMetrics` stays read-only, scalar/copy-only, with per-run reset.

## 12. Validation

### 12.1 Rules (fast)

Slice: all 47 existing tests unchanged. New tests, one per rule:

- wave table: 20 rows, durations sum to 692, 9 full / 6 quick / 4 auto;
- pocket `[time,count,formation]` fires correctly and records `pocketRejected` when the
  180 cap blocks the remainder (never deleting enemies, never adding value);
- boss on 5/10/15/20: reservation, 179 hold, retry, +15s overtime, hp>0 defeat;
- splitter → 2 chips; chip cap rejection makes no value; spitter born 0.8 counts to cap;
- tier-II capacity ramp 1..6, upgrade selected slot, max-tier no charge, sell selected
  slot, refund 35%, last gun unsellable;
- offer composition, reroll 0/6/8/10;
- price integer formula and the **144** slinger tier-II case;
- mod tiers and per-root counters;
- wake: collect-time anchor, ≥30 gate, 1.0s/36/30, cap 180, root stays live;
- ember: 1.2s lock (not collectible), radius 55 / damage 25 (ember adds no value), one
  explosion per object, cap 250 with merge not re-heating, wave-end cancel retains value;
- chain-root survival across the 1.2s heat window;
- popcorn: credits accumulate with no target; atomic 2-bullet pair only with 2 free
  slots; 4 credits/step; ring 8 bullets/0.5s as a separate budget; both cancel counters;
- records isolation.

### 12.2 Browser (real input only)

- **At least one ordinary-input run that reaches and completes all 20 waves (victory)**,
  with a per-shop ledger. An early death does not satisfy this.
- **Separately, at least one ordinary-input failure run** (0 hp or overtime) showing the
  failure UI and a working retry.
- Touch at 560×760 and 390×844: movement, purchase, quick choice, pause.
- Refresh mid-fight returns to title without resuming; blur pauses; resume clears ghost
  keys.
- Sub-path deployment (existing E1) still passes.
- At least one real run per branch where the branch actually fires.

### 12.3 Performance

Measure **simulation CPU** with a fixed-step harness at the worst wave: report step
median/p95. rAF frame intervals are diagnostic only, never a gate.

### 12.4 Not claimed

Finite simulation does not prove arbitrary chain boundedness; one green seed set is not
stability; model review is not user acceptance.

## 13. Tunables and risks

| Parameter | Initial | Risk |
|---|---|---|
| HP multiplier | 1.0 → 5.1 | late spikes; tune ±20% |
| boss HP | 560/1600/3000/5000 | finale too easy/hard; ±25% |
| tier II price | 4× | upgrades skipped; 3×-5× |
| refund | 35% | sell/rebuy abuse; 30%-50% |
| popcorn drain | 4 credits/step | feels laggy |
| ring budget | 8 / 0.5s | burst feel |
| wake 36/30 | ±20% | low value |
| ember 55/25/1.2s | ±20% | lock suppresses feedback |
| auto interlude | 1.2s | feels abrupt |

Known risk: cash may be far ahead of a full build (§3.6). If real play confirms, reduce
shops or raise prices; do not add currency.

## 14. Open items

1. Whether the empty second slot at wave 1 should instead start with a free gun (pacing
   decision; this proposal keeps it empty).
2. Exact auto-interlude presentation (text/visual) within the 1.2s.
3. Split-quota 360/60 is withdrawn from this batch; revisit only with starvation
   evidence.
4. Boss HP remain tunables with the validation contract above.

## 15. Implementation order

1. Mode plumbing, data tables, records keys, slice regression unchanged.
2. Wave engine: 20 waves, stops, auto interlude, boss reservation/overtime.
3. Economy: slots, integer prices, tier II ramp, selected-slot upgrade/sell, offers.
4. Mod tiers and the two popcorn budgets.
5. Branch systems and the chain-root reference fix.
6. New enemies and boss stages.
7. Visual/audio pass.
8. Validation, then freeze for three-party review.
