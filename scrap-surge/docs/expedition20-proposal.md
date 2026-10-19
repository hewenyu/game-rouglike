# Expedition20 approved implementation spec

Status: **implemented candidate, not user-accepted and not validation-complete**.
Astra, Opus, author DeepSeek and independent DeepSeek approved implementation text
**058951fc84994abb8ee24a2c587bb9232c1c1ccd**. The normal page now defaults to
`expedition20`; `?mode=slice` preserves the two-wave slice. Any later tuning or
rule change needs three-party agreement.

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
  the then-23 regression checks and first-shop suite keep testing the frozen slice
  untouched.
- `new Game(seed, "expedition20")` is the new mode. Slice numbers are never mutated to
  serve expedition; shared helpers may be parameterized but slice behaviour is
  byte-identical.
- The UI defaults to `expedition20` for a normal player; slice stays reachable by an
  explicit mode selector (URL parameter or title toggle) for teaching and regression.
- With no mode selector, the UI explicitly constructs `new Game(seed, "expedition20")`.
- **Records:** the slice keeps its existing `scrap-surge.v1` key unchanged, so existing
  local records survive. Expedition20 uses a **new** key
  (`scrap-surge.expedition20.v1`). Mute preference is read from the old key and written
  to both. When the old key is written, **only `muted`** may change; every other old
  field and unknown field is preserved, so a player's audio setting carries over
  without migrating or rewriting run records.

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
counts every currently held tier-II slot separately (two copies of the same type count
as two), selling a tier-II gun frees capacity immediately, and no extra currency is
involved. Upgrading an already-owned selected slot is allowed whenever capacity is
available. At the capacity limit the upgrade button is disabled and deducts nothing.

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

Reference: slinger tier II at W8 uses B=15 and the wave factor
`(8 + 4) / 5 = 2.4`: `ceil(15*4*12/5) = 144`. The test must assert **144**.

### 3.2 Buying and upgrading (two explicit actions)

- Four random cards are **new-gun purchases only**. Buying a card creates a tier-I
  stack of that card's type if a gun slot is available.
- Upgrade and sell are **independent buttons on each owned slot**. They do not require
  that type to appear in the current four offers.
- Upgrade targets the slot the player selected - **not** the lowest tier.
- A full 6-slot loadout can still upgrade an owned slot.
- Duplicate purchase is optional; nothing forces buying all six types.
- At tier-II capacity, the upgrade button is disabled with the next opening wave number
  (for example, "opens after wave N"), or "capacity max" after W18, and **no money is
  deducted**.

### 3.3 Selling

- Sell the **selected slot**, not the lowest tier.
- Refund = `floor(0.35 * cumulative_paid_for_that_slot)`.
- The last remaining gun cannot be sold; the action is disabled and rejects with no
  money movement.
- Selling is only available in a full shop.

### 3.4 Offers and rerolls

- 4 new-gun cards per shop.
- Composition: if any gun type is still unowned, the set contains at least one unowned
  type. It need not contain an owned type, because slot upgrades are independent.
  This is a composition constraint only: it never guarantees affordability and never
  creates a negative or zero price.
- The constraint is an existence check; it is not a promise that a specific weapon
  appears.
- Rerolls use the shop RNG stream: first free, then 6, 8, 10, 12, … (the slice's 6 is
  unchanged for slice).

### 3.5 Static ledger (estimate, not a promise)

`docs/expedition20-ledger.mjs` is the reproducible calculator for the table in §4 and the
shop ledger below. All figures are **static estimates under stated assumptions**, not
measurements:

- collection of 70%, 85% or 100% of the static spawned drop value, including the chip
  assumption below;
- each splitter is assumed to produce both chips, so their value is included; a
  cap-rejected chip and a cap-overflow spitter that falls back to a bag are **not**
  modelled;
- no boss drops counted;
- no overkill or area-damage modelling;
- the legal build route below; its shop timing is fixed, while the four offered cards
  and any rerolls remain seed-dependent.

Cash is expected to be **left over**, not tight. This plan explicitly does **not**
claim "money never limits anything" or "2-3 items per shop"; the ledger shows the
estimate, and the real per-seed shop ledger is measured during implementation
validation. These are not upper bounds: boss drops, boss-spawned chips, cap rejection,
fallback composition changes and area/overkill effects can move actual income in either
direction.

### 3.6 Affordability check (the independent-review concern)

The concern was that income runs far ahead of a full tier-II build, so the later shops
go idle. The starting slinger costs 0. This legal route buys five new guns, makes one
tier-II upgrade in each of W8/10/12/14/16/18, and keeps W6 as a no-purchase full shop:

`income` is cumulative collection through the wave immediately before the shop;
`balance` is that income after the listed purchases.

| shop | purchases | cost | income 70/85/100% | balance 70/85/100% |
|---|---|---|---|---|
| W2 | shotgun + coil | 57 | 301 / 366 / 430 | 244 / 309 / 373 |
| W4 | rocket | 42 | 753 / 915 / 1076 | 654 / 816 / 977 |
| W6 | none | 0 | 1401 / 1702 / 2002 | 1302 / 1603 / 1903 |
| W8 | saw + slinger II | 195 | 2207 / 2680 / 3152 | 1913 / 2386 / 2858 |
| W10 | shotgun II | 247 | 3315 / 4025 / 4735 | 2774 / 3484 / 4194 |
| W12 | fist + coil II | 378 | 4340 / 5271 / 6201 | 3421 / 4352 / 5282 |
| W14 | rocket II | 375 | 5623 / 6828 / 8033 | 4329 / 5534 / 6739 |
| W16 | saw II | 336 | 7300 / 8864 / 10428 | 5670 / 7234 / 8798 |
| W18 | fist II | 317 | 8751 / 10627 / 12502 | 6804 / 8680 / 10555 |

The route costs **1,947** in total, after the free initial slinger. At W18 the balance
is still 6,804 at 70% collection and 10,555 at 100%; cash is therefore expected to be
**far ahead** of what this coherent build needs, even in the pessimistic case.

This plan does not hide that: it says the late shops are likely to be slack, and that is
a **known risk to the pacing goal**, not a claim that the economy is tense. If real play
confirms it, the response is fewer shops or higher prices - **not** a new currency and
not a claim that money never limits anything.

## 4. Wave table (exact)

Rules: `rate` spawns/s (timer = `1/rate`); pockets are `[time, count, formation]`;
`mix` is bag/runner/can/splitter/spitter percent; HP column is
**bag/runner/can/splitter/spitter/chip** integer values. Every pocket and sub-pocket
must fire with `time < duration`, and every batch records its own cap-rejected
remainder; rejection never adds value or moves work to a later batch.

Pocket safety and geometry:

- A pocket centre is chosen at least **310** units from the player. Individual
  enemies remain at least **235** units away.
- Every enemy, including a splitter chip, keeps the **0.65s `born` warning**, except
  the spitter at **0.8s** per §5.2. The chip offset is the one exception to centre
  placement, so its 0.65s warning is the guarantee that makes the ±60 offset dodgeable.
- Placement makes at most **8 seeded attempts**, then uses a deterministic fallback;
  there is no unbounded retry loop. The single-centre fallback is the arena edge
  opposite the player's horizontal half at `x=70` or `x=W-70`,
  `y=clamp(player.y,80,H-80)`. For `two-cluster`, if no second candidate is both safe
  and ≥200 from the first centre, use the same opposite-half edge at `y=80` and
  `y=H-80` for the two clusters. Both are ≥530 horizontally from the player, so the
  individual-enemy **235** guarantee still applies, and the pair is **640** apart.
- `ring` - one count at once, placed on a circle of radius up to **75** around one
  safe centre.
- `stream` - split one scheduled count into `ceil(n/3)`, `ceil((n-ceil(n/3))/2)` and
  the remainder. The three small-ring batches fire at `t`, `t+0.4`, `t+0.8`; each
  batch picks a new safe centre and uses radius up to **45**. This changes cadence,
  not the total count of a scheduled pocket; each batch's cap rejection is recorded
  independently.
- The former `split` name is replaced by **`two-cluster`**. At `t`, the count is split
  into `ceil(n/2)` and `floor(n/2)` at two independently chosen safe centres with
  centre separation **≥200**. Each group is a radius-up-to-**75** ring and both use
  `PMIX`; `two-cluster` does **not** force splitters or create a second enemy type.
  Each cluster uses the same `PMIX` as all other pocket members; `two-cluster` changes
  geometry, not spawn type. There is no separate splitter-only pocket.
  The two batches have separate cap rejection; neither is compensated by the other.

`PMIX` is the per-spawn-type mix for pocket members; `two-cluster` only changes where
and when those members appear. It is not a hidden spawn table.

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
| 12 | 34 | 5.8 | 8:12 two-cluster, 20:12 two-cluster, 28:18 two-cluster | 34/20/18/12/16 | 32/20/20/12/16 | 24/51/203/108/149/22 |
| 13 | 34 | 6.0 | 7:18 two-cluster, 14:18 two-cluster, 21:18 two-cluster, 28:18 two-cluster | 32/20/18/14/16 | 30/20/20/14/16 | 24/55/218/116/160/23 |
| 14 | 36 | 6.2 | 8:12 stream, 11.5:12 stream, 15:12 stream, 18.5:12 stream, 22:12 stream, 25.5:12 stream, 29:12 stream | 30/20/18/16/16 | 28/20/20/16/16 | 24/60/236/126/173/24 |
| 15 | 45 | 6.4 | 6:20 two-cluster, 14:20 two-cluster, 22:20 two-cluster, 30:20 two-cluster, 38:20 two-cluster | 28/20/18/18/16 | 26/20/20/18/16 | 24/65/255/136/187/24 |
| 16 | 38 | 6.6 | 8:12 stream, 12:12 stream, 16:12 stream, 20:12 stream, 24:12 stream, 28:12 stream, 32:12 stream, 35:12 stream | 26/20/18/20/16 | 24/20/20/20/16 | 24/70/278/148/204/24 |
| 17 | 38 | 6.8 | 6:20 two-cluster, 24:20 two-cluster | 24/20/18/22/16 | 24/20/18/22/16 | 24/76/300/160/220/24 |
| 18 | 40 | 7.0 | 6:18 ring, 20:18 ring, 32:18 two-cluster | 30/20/16/20/14 | 24/20/18/24/14 | 17/83/326/174/239/17 |
| 19 | 40 | 7.4 | 5:16 ring, 10:10 stream, 15:16 ring, 20:10 stream, 25:16 ring, 30:10 stream, 35:16 ring | 32/20/16/18/14 | 24/20/18/24/14 | 17/89/353/188/259/17 |
| 20 | 75 | 7.8 | 6:12 ring, 20:12 ring, 34:12 ring, 50:12 ring, 66:12 ring | 26/20/16/22/16 | 20/20/18/26/16 | 24/97/383/204/281/24 |

### 4.1 Bag "fuel" schedule

Bags are the low-HP fuel that keeps fixed damage from feeling like scraping:

- W1-5: **17**
- W6-10: **20**
- W11-17: **24**
- W18-19: **17** (deliberate dip: dense low-HP tide, see below)
- W20: **24**

There is no automatic second damage source that grows with the wave. Chip HP follows
the table above and is also capped at the same wave's bag HP:

| W | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| chip | 8 | 8 | 9 | 10 | 12 | 13 | 14 | 15 | 17 | 18 |

| W | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| chip | 20 | 22 | 23 | 24 | 24 | 24 | 24 | 17 | 17 | 24 |

These are the values already shown in the HP column; the formula is
`min(bag HP, round(8 * wave multiplier))`.

### 4.2 Special-enemy introduction

Splitter and spitter do **not** debut together early; W1-5 stay bag/runner/can so the
basic loop is learned. **Splitter enters at W6** and **spitter enters at W12**, each well
after its counterplay exists. W12+ mixes shift away from bags, so pressure changes
shape rather than only HP.

### 4.3 W17-20: the payoff tide

- W17: two heavy two-cluster pockets, cascade setup from the existing splitter
  share in `PMIX`; the formation itself does not force splitters.
- **W18/W19: bag share rises back to 30-32%** and pockets are explicit ring/stream
  alternation, so the board is a dense low-HP tide: the formed build visibly clears
  screens. This is the shape payoff the user asked for, not just more HP.
- W20: the boss wave with five ring pockets before the 75s end.

Justification for the 6/12 introduction: introducing splitters at W3 (before area
damage and mod tiers) and spitters at W4 (before the second mod) makes early waves read
as unfair chip damage. 6/12 gives each behaviour a readable counterplay window while
still appearing in more than half the run.

### 4.4 Bosses (one model, four stages)

A single CAN KING model with four visibly distinct stages. All stages use the same
silhouette and inherit the slice boss movement at **32 units/s**; the player may stand
still when the build is formed, so boss motion does not force permanent movement.

| W | Stage | HP | Armor / core colours | Attack pattern |
|---|---|---|---|---|
| 5 | CAN KING I | 560 | rust-grey armor with an orange core | 8-way radial every 2.4s |
| 10 | CAN KING II | 1600 | dark steel armor with an amber core | 10-way radial every 2.1s; every 3rd volley is a **3-bullet aimed spread** |
| 15 | CAN KING III | 3200 | slate armor with a yellow-white core; visible side pods | 12-way radial every 1.9s; every 3rd volley spawns **3 runners** |
| 20 | CAN KING IV | 6400 | near-black armor with a white-hot core and exposed seams | 12-way radial every 1.75s; every 3rd volley is an aimed spread; every 4th volley spawns **4 chips** |

- All spawn at `duration - 18`, must die by `duration`, and all get **+15s overtime**
  with the existing live countdown.
- Missing the overtime deadline is a real defeat at hp > 0.
- The F0 slot reservation applies to every boss wave (179 while pending, real death
  frees the last slot, failed attempt retries next step).
- Each stage has its own short sound cue and its own armor/core visual pair; they
  cannot be distinguished by ring count or speed alone.

## 5. New enemies (max 2)

### 5.1 Splitter 裂壳蟹

- Stats: 40 base HP (scaled per §4), r 20, speed 50, drop 3, born 0.65, contact only.
- On death spawns **2 chips** at ±60 units from the death point on a seeded angle. The
  chip batches are independent `spawn()` attempts, so each applies the cap and boss
  reservation separately.
- A chip rejected by the cap simply does not exist: no deferred queue, no replacement
  attempt and no extra value.
- Chip HP is `min(bag HP for that wave, round(8 * wave multiplier))`; this caps fuel at
  or below the same wave's bag and leaves the other four enemy types to carry threat.
  r 10, speed 118, drop 1, born 0.65, contact only.
- A full split is worth 3 + 2×1 = 5 in three pickups; the 250 merge rule still applies.

### 5.2 Spitter 吐酸罐

- Stats: 55 base HP, r 19, speed 34, drop 4, **born 0.8**, and the unit counts toward
  the live cap while born.
- Simultaneous spitter cap is **6, including units still in `born`**. An over-cap
  spitter spawn attempt becomes a bag through the normal spawn path, and increments a
  separate `spitterFallbackToBag` counter; if that bag is cap-rejected, no enemy or
  value is created.
- Holds at 320 units and fires a slow aimed projectile: speed 190, damage 1, life 3.5s,
  radius 7, every 2.2s, with a **0.8s visible tell**.
- The projectile is a filled **orange-red circle**, visually distinct from the wake's
  star marks and ember's fragment marks.
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
- Within one step, process any ready popcorn tier-III ring first (8 free slots, atomic,
  0.5s cooldown), then normal popcorn pairs (max 4 credits), and then the ordinary guns
  in their existing order; all consume the same shared 420 slots. If fewer than 8 free
  slots remain, the ring stays pending without blocking that step's normal pairs, which
  still need their own 2 free slots.

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
- A heat-locked scrap is **stationary**. It cannot be absorbed or collected by any
  pickup path, including magnet III's arena pulse, and contact with the player does not
  collect it.
- At the end of heat it explodes in place with **radius 55, damage 25**, then becomes
  collectible at its normal drop value. Ember itself adds no scrap: the "25" is the
  explosion damage, not a new value.
- **One explosion per object.** Merged objects keep the merged value; merging does **not**
  re-start heat and does **not** add another explosion.
- Cap **250 merged objects**; value merging unchanged; ember adds no extra value.
- At the wave boundary pending heat is **unlocked without exploding**, and the value is
  retained for the normal sweep.
- **Root selection for every expedition death:** use the inherited `chain > 0` root
  when present; otherwise allocate one new root. The domino blast and every ember
  scrap from that same death share that one root; a death with neither effect leaves
  the root immediately reclaimable. Ember never uses root 0 or loses the chain when no
  domino was present.

### 7.3 Chain-root correctness (must-fix)

Current code clears `chainCounts` when `chainTimer` hits 0. With a 1.2s heat window a
live root can still be referenced well after the 0.8s display timer.

- `chainTimer` expires the **display scalar only**; it must never clear the causal map.
- Roots are reclaimed **only by reference**. The live-reference set is exactly:
  pending blasts, live corpses, live wake points, and heat-locked ember scraps.
- A wake point always allocates a **new root**. A heat-locked ember scrap carries its
  death's shared root, as does that death's domino blast. Popcorn and magnet bullets
  keep today's weapon-source behaviour and **do not** mint or queue new roots; there is
  no unbounded root queue.
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

Concrete tier presentation:

| mod | tier II form / short sound | tier III form / short sound |
|---|---|---|
| popcorn | trailing spark + thicker card border / high paper "tick" | orange-white 8-ray star burst / deeper star "pop" |
| domino | double ring pulse on chain blasts / low double pulse | larger, slower 160-radius blast / heavier boom |
| magnet | visibly curved bullet paths / rising short hum | full-arena sweep arc / short sweep whoosh |

The HUD shows each mod's tier number and a small tier pip. All cues route through the
existing audio limiter; no audio refactor.

## 9. Gun tier II

- Opens at the **wave-8 shop**, gated by the capacity ramp in §2.5.
- One tier only. Interval is never changed.
- Damage multiplier is **×1.0** for guns whose tier II doubles projectiles/hit points and
  **×1.4** for shotgun and coil; the effective output lands near ×2 for the doubling
  guns.

| Gun | Tier II | Effective output |
|---|---|---|
| slinger | 2 bullets; paired silver muzzle flash | 160 DPS = ×2.0 |
| shotgun | 7 pellets; wider orange fan | 173 DPS = ×1.96 |
| saw | 2 hit points; dual orbit sparks | 229 DPS = ×2.0 |
| coil | 7 chain targets; thicker zig-zag arc | 40.25 single-target; 281.75 DPS across 7 targets = ×1.96 group multiplier |
| rocket | 2 rockets; paired smoke trails | 75 DPS = ×2.0 |
| fist | **one hit**, damage ×2, force 800, remnant r ×1.25; larger impact ring | 160 DPS = ×2.0 |

The tier-II rule is: doubling the output (slinger, saw, rocket) keeps damage ×1.0;
shotgun and coil use ×1.4 because their tier-II behaviour multiplies hits; fist keeps
**one hit** but doubles damage to ×2.0. Slinger tier II is therefore **160** DPS at
×2.0, not 256 and not 128 - the 256/×3.2 line in an earlier draft double-counted the
multiplier.

Coil I is **28.75** single-target and **143.75** across 5 targets. Coil II is **40.25**
single-target and **281.75** across 7 targets. The applicable group multiplier is
**1.96**, not single-target ×9.8. All other figures are nominal single-target. The
reproducible source is `docs/expedition20-ledger.mjs`. Every tier-II form also gets a
distinct short cue through the existing audio limiter; no audio refactor.

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

Slice: all 47 existing tests unchanged. New tests, one per rule (or one table test with
one assertion per row where stated):

- wave table: 20 rows, durations sum to 692, 9 full / 6 quick / 4 auto;
- every pocket/sub-pocket has `time < duration`; `ring` uses one safe centre and
  radius ≤75; each `stream` batch uses a new centre and radius ≤45 at `t/t+0.4/t+0.8`;
  `two-cluster` centres are ≥200 apart with radius ≤75 each; all centres are ≥310 from
  the player with the individual-enemy ≥235 guarantee and a bounded fallback;
- each pocket or sub-pocket records its own `pocketRejected` remainder when the 180 cap
  blocks it (never deleting enemies, never adding value, never deferring to another
  batch);
- price formula and tier-II group-DPS helpers match the doc (fist one hit at ×2, coil
  single/group split, slinger II at 144);
- boss on 5/10/15/20: reservation, 179 hold, retry, +15s overtime, hp>0 defeat;
- splitter → 2 independent chip attempts; each cap rejection makes no value or
  replacement; chips keep 0.65s born warning and use the min fuel-HP table;
- spitter born 0.8 counts to the 6-unit cap; an over-cap attempt falls back to a bag
  and increments `spitterFallbackToBag`; each over-cap attempt is independent (a
  rejected fallback bag is not retried);
- tier-II capacity ramp 1..6 counts currently held tier-II slots (including duplicate
  types), upgrading a selected slot, capacity-limit no charge, selling frees capacity,
  refund 35%, last gun unsellable;
- offers satisfy the unowned-type constraint when one exists and do not require an
  owned type; reroll 0/6/8/10;
- price integer formula and the **144** slinger tier-II case;
- mod tiers and per-root counters;
- wake: collect-time anchor, ≥30 gate, 1.0s/36/30, cap 180, root stays live;
- ember: 1.2s stationary lock (uncollectable by contact or magnet III), radius 55 /
  damage 25 (ember adds no value), one explosion per object, cap 250 with merge not
  re-heating, wave-end unlock-without-explosion retains value;
- chain-root survival across the 1.2s heat window; same-death drops share one root,
  a non-secondary death allocates one new root, and no ember uses root 0;
- popcorn: credits accumulate with no target; atomic 2-bullet pair only with 2 free
  slots; 4 credits/step; ring 8 bullets/0.5s as a separate budget; both cancel counters;
- records isolation: the expedition key is new, and writing the old key changes only
  `muted`, preserving every other field including unknown fields.

The historical 23 regression checks remain unchanged except for fixture wiring that
appends `mode=slice` to every existing browser test URL. No rule assertion may be
removed or weakened by that change; the 47 slice assertions stay byte-for-byte the
same. The current candidate adds two read-only boss-metrics checks, making the new
browser-regression denominator 25; the earlier 23/23 results must not be relabelled as
25/25.

### 12.2 Browser (real input only)

- **At least one ordinary-input run that reaches and completes all 20 waves (victory)**,
  with a per-shop ledger. An early death does not satisfy this.
- **Separately, at least one ordinary-input failure run** (0 hp or overtime) showing the
  failure UI and a working retry.
- If ordinary-input tuning cannot produce that victory, record the failed attempt and
  the observed cause; do not inject state or call the run a win. A tuning change or a
  documented ordinary-player strategy may be proposed only after three-party approval.
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
| boss HP | 560/1600/3200/6400 | finale too easy/hard; ±25% |
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

1. Split-quota 360/60 is withdrawn from this batch; revisit only with starvation
   evidence.
2. Boss HP remain tunables with the validation contract above.

## 15. Implementation order

1. Mode plumbing, data tables, records keys, slice regression unchanged.
2. Wave engine: 20 waves, stops, auto interlude, boss reservation/overtime.
3. Economy: slots, integer prices, tier II ramp, selected-slot upgrade/sell, offers.
4. Mod tiers and the two popcorn budgets.
5. Branch systems and the chain-root reference fix.
6. New enemies and boss stages.
7. Visual/audio pass.
8. Validation, then freeze for three-party review.
