# Expedition20 proposal (UNIMPLEMENTED, NOT APPROVED)

Status: **proposal only**. Nothing in this document is implemented, and no part of it is
approved until Astra, Opus and DeepSeek all sign the same text. The current page remains
the two-wave slice at `2746a01`.

This document answers R3 ("form a plan first"). It is written to be implementable
without further design invention: every rule below is either an exact number, an exact
state transition, or an explicitly marked tunable that must be validated by real play.

Technical selection: the project stays TypeScript + Vite + Canvas, which already
satisfies the user's "prefer Go and TypeScript" rule. No Go backend, server or build
rewrite is proposed; there is no server-side need.

## 1. Scope

### 1.1 In scope

- A second game mode, `mode = "expedition20"`: 20 waves, 692s of combat, 9 full shops
  and 6 quick choices.
- Two enemy behaviours (splitter, spitter), four bosses, one gun tier-II step, and
  mod tiers II/III for the three existing mods.
- One two-way permanent branch chosen after wave 5 (航迹 / 余烬).
- Visual work for the items above, records isolation per mode, and a finite validation
  checklist.

### 1.2 Explicitly out of scope

- No third mod slot, no fourth mod, no PARTS, no refine, no meta-progression, no
  seventh gun, no multiplayer, no second currency.
- No production `qaStart` or any debug entry point that grants state. Test helpers may
  exist only inside `tests/` and must not be reachable from the shipped page.
- No acid pool, no new ground hazard entity, no camera overhaul, no external or paid
  assets.
- No 3-star weapons. Tier II is the only weapon upgrade.

### 1.3 Mode isolation

- `new Game(seed)` keeps today's behaviour and means `mode = "slice"`, so the existing
  47 simulation tests and the 23-check + first-shop browser suites keep testing the
  frozen slice unchanged.
- `new Game(seed, "expedition20")` is the new mode. Slice rules are never mutated to
  make expedition work; shared helpers may be parameterized, but every slice number
  stays byte-identical in behaviour.
- The UI defaults to `expedition20` for a normal player. Slice remains reachable by an
  explicit mode selection (URL parameter or a title-screen toggle) so it can still be
  used for teaching and regression.
- Records use separate storage keys: `scrap-surge.records.v2.slice` and
  `scrap-surge.records.v2.expedition20`. Runs, wins, best kills and best time never mix.

## 2. Run structure

### 2.1 Wave durations (fixed)

| W | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| s | 20 | 22 | 24 | 26 | 28 | 28 | 30 | 30 | 32 | 40 |

| W | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| s | 32 | 34 | 34 | 36 | 45 | 38 | 38 | 40 | 40 | 75 |

Total combat time: **692s (11m32s)**. With shops and choices the run is roughly 15
minutes; shop time is never counted against the player and is not capped.

### 2.2 Inter-wave stops

| After wave | Stop | Content |
|---|---|---|
| 1 | quick | first mod (1 of 3), free |
| 2 | full shop | guns, reroll |
| 3 | quick | second mod (1 of 2 remaining), free |
| 4 | full shop | guns, reroll |
| 5 | quick | permanent branch: 航迹 or 余烬 |
| 6 | full shop | guns, reroll |
| 7 | none | slot +1 only, short prompt, then wave 8 |
| 8 | full shop | guns (tier II unlocked), reroll |
| 9 | quick | mod upgrade +1 tier |
| 10 | full shop | guns, reroll |
| 12, 14, 16, 18 | full shop | guns, reroll |
| 13, 17 | quick | mod upgrade +1 tier |
| 11, 15, 19 | none | short prompt, then next wave |
| 20 | end | victory or defeat |

That is **9 full shops** (2,4,6,8,10,12,14,16,18) and **6 quick choices**
(1,3,5,9,13,17). The stop count is 15, not 19: waves 7, 11, 15 and 19 continue
automatically with a short prompt and a reliable pause.

Rules for automatic transitions: the next wave must not start while a key or touch is
held; the prompt always uses the existing pause path so a backgrounded tab cannot skip
it, and it must be dismissible by keyboard and touch.

### 2.3 Mod slots and tiers

- Permanent **2 mod slots** for the whole run. No third slot at any point.
- Wave 1 gives one free mod; wave 3 gives the second from the remaining two.
- Waves 9, 13 and 17 each grant **one tier** to an existing mod below tier III. The
  offer always contains at least one legal choice; if only one mod is below III the
  player must still confirm it explicitly (no silent auto-upgrade).
- Tier order is I → II → III. The final intended spread is **one III and one II**;
  reaching III+III is impossible because only three upgrades exist and each upgrade
  raises one mod by one tier.

UI split (the slice must not change): today's shop panel offers both mods in one
screen. Expedition20 splits that into two screens - the wave-1 quick choice offers one
of three, the wave-3 quick choice offers one of the remaining two. The wave-2 full shop
shows **guns only**, with no mod cards. Slice keeps its current combined panel and its
"pick both" rule; these are separate code paths, not a rewritten shop.

### 2.4 Gun slots

- Start with **2 gun slots**: the initial slinger plus **one empty slot**. A player
  enters wave 1 with one slinger and one empty slot (see open question 3 - whether that
  empty slot should instead be a free gun is a separate pacing decision).
- Slot count grows by 1 after waves **2, 4, 7 and 11**: 2 → 3 → 4 → 5 → 6.
- Therefore the **first full shop (after wave 2) already has 3 slots** and can buy two
  guns.
- A gun slot is a capacity, not a free gun. Empty slots stay visible.

## 3. Economy

Single currency (scrap). Drop values are unchanged from the slice: bag 2, runner 2,
can 4, splitter 3, chip 1, spitter 4, boss 15/30/45/60 at waves 5/10/15/20.

### 3.1 Prices (exact formulas)

Let `B` be the weapon's base price and `w` the current wave number.

- New gun: `ceil(B * (1 + 0.2 * (w - 1)))`.
- Tier II upgrade: `ceil(B * 4 * (1 + 0.2 * (w - 1)))`.
- Tier III: **not offered** in expedition20 (reserved formula `B * 12 * factor`, unused).

Reference values at wave 1 / 9 / 18: slinger 15 / 39 / 66; rocket 26 / 68 / 115;
slinger tier II at wave 8 is 145, rocket tier II at wave 8 is 250.

### 3.2 Buying a duplicate

- The shop may offer a weapon already owned. Buying it is **optional**, never forced.
- If bought, it upgrades the **lowest-tier owned stack of that type**, not the newest.
- At tier II the offer is shown disabled with the reason, and **no money may be
  deducted**. The same applies to a full slot list: the button is disabled, the click is
  rejected, and money is untouched.
- There is no automatic merge and no hidden conversion between types.

### 3.3 Selling and refunds

- Any gun except the last remaining one can be sold.
- Refund is `floor(0.35 * cumulative_paid_for_that_stack)`; the stack's cumulative paid
  is tracked across its new-buy and tier-II purchase.
- Selling removes one stack; if two stacks of the same type exist the lowest tier is
  sold first, matching the upgrade rule.
- Selling is only available in a full shop, never mid-wave.

### 3.4 Offers and rerolls

- Offer set has 4 gun cards.
- The set must contain **at least one already-owned gun** and, if any gun type is still
  unowned, **at least one unowned gun**. This is a composition constraint, never a
  guarantee that the player can afford them and never a negative or zero price.
- If all types are owned at tier II, the constraint degrades to "at least one owned
  gun"; no synthetic filler item may be invented.
- First reroll in each shop is free; afterwards 6, 8, 10, 12, ... (increments of 2).
- Rerolls use the shop RNG stream only and never touch the combat RNG.

### 3.5 Why the economy still allows "上天"

The intent is that money is never the thing that stops a coherent build. The limiting
factors are slot count (6), mod tiers, and player survival. Concretely:

- A full shop should let the player buy 2-3 meaningful things, not 0-1.
- Prices scale slower than late-wave income because drop values are fixed while spawn
  rate rises, so late shops stay affordable.
- Choice comes from "what to buy", not "can I afford anything".
- Validation includes a ledger check that a normal 20-wave path ends with a coherent
  6-gun build and at least one tier-II gun, and that no shop is fully unaffordable.

## 4. Wave table (exact)

### 4.1 Rules

- `rate` is the base spawns per second; the timer spawns at `1 / rate`.
- `pockets` are `[time, count]` ring spawns at least 310 world units from the player.
- `hp` is a per-wave multiplier applied per enemy class and **rounded**; the table below
  gives the resulting integer HP per class so implementation cannot drift.
- Spawn mix weights are per-spawn rolls; a pocket uses the `pocket` mix.
- `born` warning stays 0.65s for bag/runner/can/splitter/chip and 0.8s for spitter.
- Live-enemy cap stays 180. Once a boss is pending, ordinary spawns stop at 179 until
  the boss really spawns (the F0 rule, generalized to every boss wave).

### 4.2 Per-wave data

`mix` is written bag/runner/can/splitter/spitter; `pocket` is the same order. Every row
keeps a non-zero bag share so the swarm never becomes a pure special-enemy wave.

HP values are bag / runner / can / splitter / chip / spitter.

| W | dur | rate | pockets | mix | pocket | HP |
|---|---|---|---|---|---|---|
| 1 | 20 | 3.1 | 6:12, 14:12 | 87/13/0/0/0 | 58/42/0/0/0 | 17/19/75/40/8/55 |
| 2 | 22 | 3.4 | 5:13, 12:13, 18:13 | 62/26/12/0/0 | 56/28/16/0/0 | 17/19/75/40/8/55 |
| 3 | 24 | 3.7 | 6:14, 14:14, 21:14 | 54/22/12/12/0 | 46/24/14/16/0 | 20/22/86/46/9/63 |
| 4 | 26 | 4.0 | 6:14, 13:14, 20:14 | 48/24/12/12/4 | 40/24/14/16/6 | 22/25/98/52/9/72 |
| 5 | 28 | 4.4 | 5:15, 12:15, 19:15, 25:15 | 44/24/12/14/6 | 36/24/14/18/8 | 25/28/109/58/10/80 |
| 6 | 28 | 4.6 | 6:15, 13:15, 20:15 | 40/22/14/14/10 | 34/22/14/18/12 | 27/30/120/64/10/88 |
| 7 | 30 | 4.8 | 6:16, 14:16, 22:16 | 38/22/14/16/10 | 32/22/14/20/12 | 30/33/131/70/10/96 |
| 8 | 30 | 5.0 | 5:16, 13:16, 21:16, 27:16 | 36/22/14/16/12 | 30/22/14/20/14 | 32/36/143/76/11/105 |
| 9 | 32 | 5.2 | 6:17, 14:17, 22:17, 29:17 | 34/22/14/18/12 | 28/22/14/22/14 | 36/40/158/84/11/116 |
| 10 | 40 | 5.4 | 6:17, 14:17, 22:17, 30:17, 36:17 | 32/22/14/18/14 | 26/22/14/22/16 | 39/44/173/92/12/126 |
| 11 | 32 | 5.6 | ring: 6:18, 12:18, 18:18, 24:18, 30:18 | 30/20/14/20/16 | 24/20/14/24/18 | 43/48/188/100/12/138 |
| 12 | 34 | 5.8 | stream: 10x6 starting 4s, every 3s | 28/20/16/20/16 | 22/20/16/24/18 | 46/51/203/108/12/149 |
| 13 | 34 | 6.0 | ring: 7:18, 14:18, 21:18, 28:18 | 28/20/16/20/16 | 22/20/16/26/16 | 49/55/218/116/13/160 |
| 14 | 36 | 6.2 | stream: 12x6 starting 4s, every 2.7s | 26/20/16/20/18 | 22/20/16/26/16 | 54/60/236/126/13/173 |
| 15 | 45 | 6.4 | ring: 6:20, 14:20, 22:20, 30:20, 40:20 | 26/20/16/22/16 | 20/20/16/28/16 | 58/65/255/136/14/187 |
| 16 | 38 | 6.6 | stream: 13x6 starting 4s, every 2.5s | 24/20/18/22/16 | 20/20/18/26/16 | 63/70/278/148/14/204 |
| 17 | 38 | 6.8 | split: 8x10 at 6s and 24s | 24/20/16/24/16 | 20/20/16/30/14 | 68/76/300/160/14/220 |
| 18 | 40 | 7.0 | split: 10x10 at 6s, 20s and 32s | 22/20/18/24/16 | 18/20/18/30/14 | 74/83/326/174/15/239 |
| 19 | 40 | 7.4 | ring+stream: 8x12 at 5s/18s/30s | 22/20/18/24/16 | 18/20/18/30/14 | 80/89/353/188/15/259 |
| 20 | 75 | 7.8 | ring: 8x14 at 6s/20s/34s/50s/66s | 20/20/18/26/16 | 16/20/18/32/14 | 87/97/383/204/16/281 |

Formation meanings:

- `ring` - one full circle at once, a burst that rewards area damage.
- `stream` - many small pockets on a short cadence, a sustained pressure test that
  rewards consistent DPS rather than one big blast.
- `split` - two or three heavy pockets of splitters, which then produce chip swarms.

This is the answer to "why wave 11+ is not a repeat": from wave 11 the pressure changes
shape every few waves (burst ring → sustained stream → splitter cascade), enemies gain
class variety, and the mix shifts away from bags. HP growth alone is never the only
change.

### 4.3 Pressure curve (sanity check, not a balance proof)

Nominal party DPS (one target, no overkill, no rockets' area damage):

| weapon | tier I | tier II |
|---|---|---|
| slinger | 80 | 128 |
| shotgun | 88 | 141 |
| saw | 114 | 183 |
| coil | 144 | 230 |
| rocket | 38 | 60 |
| fist | 80 | 128 |

At the first full shop (after wave 2) the player has 3 slots: one slinger plus two
bought guns ≈ 206 DPS at tier I. Wave 2 needs about 127 EHP/s, so the player is ahead
early - deliberate, because the build must feel like it is climbing.

Six tier-II guns total ≈ 870 DPS plus mod chains. Wave 15-20 demand roughly 1100-2700
EHP/s by this nominal accounting, so raw weapon DPS alone is **not** enough late - the
late game is carried by mod tiers and chains, which is the intended "step on your own
foot" shape. This also means a player who spreads purchases thin will fall behind; that
is the meaningful choice, not affordability.

These numbers ignore overkill, area damage, homing and chain generation, so they are a
directional check only. They are the reason the HP column above stops at ×5.1 rather
than the earlier ×9. Spawn count is also an upper bound, not throughput: the 180 live
cap binds long before the big pockets, so the effective demand is lower than the raw
table suggests (see the note below on `pocketRejected`).

Important qualification: the 180 live-enemy cap binds well before the largest pocket
sizes, so the late-wave "demand" numbers are upper bounds on spawn intent, not real
throughput. A pocket that would exceed the cap must spawn only the available headroom
and record the rejected remainder as `pocketRejected`; it must never silently pretend
the enemies exist, and it must never delete live enemies to make room. The practical
difficulty therefore comes from kill throughput and survival, not from unbounded spawn
volume.

### 4.3 Bosses and overtime

| Wave | Boss | HP | Behaviour |
|---|---|---|---|
| 5 | 罐头大王 CAN KING | 560 | 8-way radial volley every 2.4s |
| 10 | 铁壳督军 SCRAP WARLORD | 1600 | 10-way volley every 2.1s + 3-shot aimed spread |
| 15 | 废铁母舰 THE LEVIATHAN | 3200 | 12-way volley every 1.9s + spawns 3 runners every 3rd volley |
| 20 | 潮汐核 TIDE CORE | 6400 | 12-way volley every 1.7s + aimed spread every 3rd volley + 4 chips every 4th volley |

- Every boss spawns at `duration - 18` and must die by `duration`; all four waves then
  allow **+15s overtime**, with the same live countdown HUD as the slice.
- Failing to kill the boss by the end of overtime is a real defeat with hp > 0.
- The successful-spawn flag and the 179 reservation apply to all four boss waves; a
  cap-rejected boss retries the next step.
- Boss HP values are initial tunables: the contract is "killable with a coherent build
  inside overtime, threatening enough to require movement", verified by real play.

## 5. New enemy behaviours (max 2)

### 5.1 Splitter 裂壳蟹

- hp 40 base, r 20, speed 50, drop value 3, born 0.65s, contact only.
- On death it spawns **2 chips**, at the splitter's position ±60 world units along a
  seeded angle. Spawn uses the normal `spawn()` path, so the 180 cap and the pending
  boss reservation apply.
- If a chip spawn is rejected by the cap, that chip simply does not exist. There is no
  deferred queue and no extra drop to compensate - rejection never creates value.
- Chips: hp 8 base, r 10, speed 118, drop value 1, contact only.
- Total value of a splitter chain is 3 + 2×1 = 5, in three separate pickups; the merge
  rule (250 objects) still applies.

### 5.2 Spitter 吐酸罐

- hp 55 base, r 19, speed 34, drop value 4, born 0.8s.
- Stops at 320 units from the player and fires a **slow aimed projectile**: speed 190,
  damage 1, life 3.5s, radius 7, every 2.2s, with a **0.8s tell** (a visible charge
  before the shot).
- It aims at the player's position at fire time with no lead, so steady movement can
  dodge it. If line of sight is not modelled (it is not today), the projectile still
  travels as a real bullet and collides with the player only.
- No acid pool, no ground hazard, no new entity type.
- Enemy bullets use the existing `kind: "enemy"` path and the same shared 420 cap.

## 6. Bullet quota (shared cap and popcorn compression)

### 6.1 Slice

The slice keeps today's single shared 420 cap and its existing F0 counters. Nothing in
this section changes slice behaviour.

### 6.2 Expedition quota proposal (needs approval, do not treat as agreed)

Problem: with six guns, mod chains and compressed popcorn, player bullets can fill the
shared 420 cap and starve enemy bullets. Enemy bullets are gameplay-critical (they are
the only ranged threat), so starving them silently changes difficulty.

Proposal:

- Expedition uses a **split quota**: 360 player + 60 enemy, both counted against the
  same underlying array. Enemy shots may use their 60 even when player bullets are at
  360; player shots may use their 360 even when enemy bullets are at 60. Total is still
  420.
- Rejections are counted per side and per kind, so `shootRejectedEnemy` now has a real
  meaning in expedition.
- Instrumentation must report peak per side as well as the combined peak.
- This is a proposal, not an approved rule. It must be validated by observation before
  it can be signed: measure enemy-shot rejections under a maximum-chaos build, and only
  adopt the split if enemy starvation is real.

### 6.3 Popcorn compression (replaces "skip the pickup")

Today a pickup beyond the 4-batch (8-bullet) per-step budget is skipped, and F0 only
counts it. In expedition that loses real feedback during a chain, which is exactly when
the player wants it.

Proposed rule:

- Keep a single scalar `popcornPendingCredits`. **One credit = one pickup = 36 damage =
  two 18-damage homing bullets.** It is a number, not an array or queue: O(1) memory.
- Each step, spend **at most 4 credits** (4 batches × 2 bullets = the existing 8-bullet
  budget).
- If the player bullet quota is exhausted, **do not consume the credit**; it stays
  pending and retries next step.
- Pickups beyond the per-step budget add to pending instead of being dropped.
- `popcornPendingCredits` is cancelled explicitly at the wave boundary and counted as
  `popcornPendingCancelled`, so nothing disappears silently.
- The card text and the bullet visual describe compression honestly ("picked-up scrap
  is queued into the next volley"), never "every pickup always fires its own two
  bullets immediately".

Why this instead of averaging credits across four batches (the alternative that was
floated):

- Averaging keeps total damage but raises per-bullet damage, e.g. 6 credits over 4
  batches → 27-damage bullets. Higher per-bullet damage reduces overkill and is a
  stealth buff, and it can one-shot late enemies.
- The pending scalar keeps damage per bullet at **18** forever, keeps the two-bullet
  visual contract, conserves total damage exactly, and bounds memory at O(1).
- Drain rate is bounded (4 credits/step ≈ 240 credits/s), which is far above realistic
  inflow, so normal play never feels queued. A synthetic worst case (250 collected
  objects in one step) drains in about 63 steps, just over one second.

This is the recommended option; it is not approved.

### 6.4 Options considered and rejected

| Option | Total damage | Memory | Verdict |
|---|---|---|---|
| A. Pending credit scalar (recommended) | conserved exactly | O(1) | meets every constraint |
| B. Average credits across 4 batches | conserved numerically, but raises per-bullet damage | O(1) | rejected: bullet damage becomes 18×k, so 6 credits over 4 batches gives 27-damage bullets; less overkill and a stealth buff |
| C. Clamp pending at 24 and drop the excess | **lost** | O(1) | rejected: silently swallows exactly the big-pickup feedback the rule exists to preserve |

Option B keeps total **damage** but not total **effect**: higher per-bullet damage
changes one-shot thresholds and overkill, which is a real balance change dressed up as
bookkeeping. Option C fails the requirement outright. Option A is the only one that
conserves damage, keeps 18-damage bullets, bounds memory, and never drops feedback.

One arithmetic correction to a circulating version of this rule: from the slice's
behaviour, 10 qualifying pickups mean 20 bullets of intent, of which the per-step budget
fires 8. The deferred amount is therefore **12 bullets = 6 credits**, not 4 and not 24.
The scalar counts pickups/credits, and the drain is 4 credits per step, so this case
drains in two steps with no loss.

## 7. Branch: 航迹 vs 余烬

Chosen after wave 5, permanent for the run, and mutually exclusive.

### 7.1 航迹 (Wake)

- Trigger: **a battlefield collect event**, evaluated at the moment of collection, at
  the player's current position - not a timer, not every 30 units travelled.
- Condition: the player's current position is **≥30 units** from the last successful
  anchor point.
- Effect: leave a static wake point for **1.0s**, radius **36**, damage **30**, each
  enemy hit at most once per point.
- Cap: **180** points. At the cap the oldest is removed (FIFO), matching the corpse
  policy.
- Anchor state: at branch selection and at every wave start, `anchor = player
  position`. Standing still therefore never creates a first point, and the first point
  requires 30 units of movement after the anchor.
- Wake damage is secondary-caused damage and uses the normal chain root accounting.

### 7.2 余烬 (Ember)

- Every scrap drop becomes **static-hot for 1.2s**, then explodes in place with radius
  **55** and damage **20**, then becomes collectible.
- Each dropped object explodes at most once; the heat timer starts at drop time.
- Cap: **250 merged objects**, unchanged value merging. Ember adds **no** extra value or
  burst worth of scrap; it only delays and converts the existing drop.
- At the wave boundary, pending heat is cancelled and the scrap value is retained
  (sweep collects it normally).
- Ember explosions that kill are secondary deaths and start/continue chain roots like
  any other secondary blast.

### 7.3 Chain-root correctness (must-fix counterexample)

Current code clears `chainCounts` when `chainTimer` reaches 0. With a 1.2s heat delay,
a live ember object can still own a chain root after the 0.8s display timer has expired.
Clearing the map would then lose causal continuity and under-count later secondary
deaths.

Required semantics:

- `chainTimer` expires the **display scalar only** (`chainCount`); it must not clear the
  live causal map.
- Roots are reclaimed **only by reference**: a root is deleted when no pending blast,
  live corpse and live ember references it. This is already the shape of the existing
  reclaim loop; ember references must be added to its `live` set.
- Wave boundary clears all roots together with pending blasts, corpses and heat.

No claim is made that a cap proves an infinite chain loop must terminate. Validation is
limited to finite scenarios and wave-boundary termination.

### 7.4 Branch validation

- Both branches must be visibly distinct on the ground: wake uses star-shaped marks,
  ember uses ember/fragment marks, both inside the approved warm beach palette.
- Six-cell finite comparison: 3 mod pairs × 2 branches, checking that neither branch
  makes a build unplayable. Ember's 1.2s delay can postpone popcorn/magnet pickups; that
  must be measured, not asserted away.

## 8. Mod tiers II/III

Only the three existing mods gain tiers. No fourth mod.

### 8.1 废料爆米花 popcorn

- I: current behaviour - each qualifying pickup fires 2 homing bullets.
- II: those bullets **pierce 1 enemy** (hit up to 2 enemies each, each enemy once per
  bullet).
- III: every **5 battlefield pickups**, additionally fire **8 radial bullets** (one
  volley, 18 damage, 0.5s cooldown so it cannot stack per step).
- Budget interaction: all popcorn output goes through the pending-credit /
  compression rule in §6.3, including the III radial volley.

### 8.2 易爆垃圾 domino

- I: every kill queues a blast, radius 75, damage 26.
- II: within a chain root, every **4th secondary kill** increases that root's subsequent
  blast radius by **10%**, capped at **+60%**.
- III: within a chain root, every **8th secondary kill** additionally explodes for
  **radius 160, damage 80**.
- Counters are per root and die with the root; they never leak between chains.

### 8.3 磁力回潮 magnet

- I: pickup radius 300; every 8 combat pickups fires 10 capped bullets.
- II: those 10 bullets become **homing** (they seek the nearest live target).
- III: every burst also triggers a **0.6s full-arena attraction pulse** that can
  re-trigger while pickups continue; the pulse moves real scraps, not a visual-only
  effect.
- Re-trigger cooldown is 0.6s; there is no per-frame trigger.

## 9. Gun tier II

- Unlocked at the **wave 8 shop** and later.
- One tier only, no III, no per-weapon alternate forms beyond the list below.
- Behaviour changes are visible in shape and audible with a distinct short sound; the
  existing audio limiter is reused, no audio refactor.

| Gun | Tier II behaviour |
|---|---|
| slinger 罐头快枪 | 2 bullets per shot |
| shotgun 瓶盖散弹 | 7 pellets |
| saw 旋转餐叉 | 2 hit points on the orbit |
| coil 漏电电池 | 7 chain targets |
| rocket 汽水火箭 | 2 rockets per shot |
| fist 弹簧拳套 | force 800, remnant radius ×1.25, damage 30 × multiplier |

Damage multiplier per tier is `[1, 1.6]` (tier I, tier II); attack interval is never
changed by tiers. Tier II price and duplicate rules are in §3.

## 10. Visual and audio scope

- Keep the warm beach / sticker identity. No palette rework.
- Can enemies become **rust grey** (distinct from the orange-red bag/runner family).
- Boss nameplate must not overlap the sound button; it moves below the top bar and is
  verified at 1440×960, 390×844 and 560×760.
- Splitter, chip and spitter each need a readable silhouette difference; wake points
  and ember drops must be distinguishable from ordinary scrap.
- Map colour bands, if used, are presentation-only and must never alter collision,
  spawn or targeting.
- No camera overhaul. Touch must remain fully usable; no hover-only affordances.
- Sound: one short distinct cue per new behaviour (tier II shot, split pop, spitter
  tell, wake pulse, ember blast, boss stages), routed through the existing limiter.

### 10.1 Mod tiers must be visible, not just numeric

Each tier change needs a visible form change and a distinct short sound; the existing
audio limiter is reused, and no full audio rework is proposed:

| mod | tier II form | tier III form |
|---|---|---|
| popcorn | bullets get a trailing spark, card border thickens | radial volley draws an 8-ray star burst |
| domino | chain blasts gain a ring pulse | the 8th-kill blast is visibly larger and slower |
| magnet | bullets curve visibly toward targets | a brief arena-wide sweep arc is drawn |

Tier chains that emit no visible change (e.g. a hidden +10% radius) are not acceptable.
The HUD must show each mod's tier number and the small tier pip on the card.

## 11. Architecture boundaries

- `sim.ts` owns rules and state only; no DOM, no rendering, no audio.
- `render.ts` reads state and draws; it never mutates simulation state.
- `input.ts` maps keys/touch to a movement vector; it never reads or writes game
  internals beyond the active/inactive callback.
- `audio.ts` consumes drained events; it never changes simulation.
- Mode-specific constants live in a data module, not scattered magic numbers.
- `scrapMetrics` stays read-only and scalar/copy-only; new instruments follow the F0
  rules (per-run reset, no live references, no behaviour change).

## 12. Validation checklist (finite, no bot lab)

### 12.1 Automated (fast)

- All existing 47 simulation tests still pass unmodified for slice mode.
- New unit tests, one per rule:
  - wave table integrity: 20 rows, durations sum to 692, 9 full shops, 6 quick stops;
  - pocket spawns record `pocketRejected` when the 180 cap blocks the remainder, and a
    rejected pocket never deletes live enemies or creates drop value;
  - every boss wave ends at +15s overtime with a real defeat at hp > 0;
  - boss slot reservation on all four boss waves;
  - splitter → 2 chips, chip cap rejection creates no value;
  - spitter tell → shot → damage 1;
  - gun tier II per weapon, price, duplicate upgrade, full-tier no-charge;
  - refund 35%, last gun cannot be sold;
  - offer composition constraints, reroll sequence 0/6/8/10;
  - mod tiers II/III per mod, counters per root;
  - both branches: anchor rule, ≥30 condition, wake cap 180, ember heat 1.2s, cap 250,
    value preservation, wave-boundary cancellation;
  - chain-root survival across the 1.2s heat window (the counterexample test);
  - popcorn pending credits: conservation, 4/step drain, quota deferral, wave-end
    cancellation counter;
  - records isolation per mode.

### 12.2 Browser (real input only)

- Normal 20-wave path: at least one full run to victory or defeat, with a shop ledger
  recorded per stop (money in, purchases, money out).
- Failure path: 0 hp death shows the failure UI and retry resets correctly; boss
  overtime loss at hp > 0 does not report a 0 hp death.
- Touch: 560×760 and 390×844, movement, shop purchase, quick choice, pause.
- Refresh mid-fight returns to title without resuming; pause freezes simulation.
- Sub-path deployment (existing E1 check) still runs.
- Branch trigger: at least one real run per branch where the branch actually fires.

### 12.3 Performance

- Measure **simulation CPU** with a fixed-step harness (worst wave, peak entities),
  reported as step median/p95. Do not use rAF frame intervals as the performance gate.
- Separately observe browser long frames descriptively; they are diagnostic, not a
  pass/fail threshold.

### 12.4 Explicitly not claimed

- A finite simulation does not prove boundedness of an arbitrary chain.
- A green three-seed run does not prove stability.
- Model review is not user acceptance.

## 13. Initial tunables (expected to change after play)

| Parameter | Initial | Range to try |
|---|---|---|
| wave durations | fixed table | last two waves ±10s |
| spawn rate | 3.1 → 7.8 | ±15% |
| hp multiplier | 1.0 → 5.1 | ±20% at waves 11+ |
| boss HP | 560/1600/3200/6400 | ±25% |
| boss overtime | 15s | 12-20s |
| gun tier II price factor | 4× base | 3×-5× |
| refund | 35% | 30%-50% |
| popcorn drain | 4 credits/step | 3-6 |
| wake radius/damage | 36/30 | ±20% |
| ember radius/damage/delay | 55/20/1.2s | ±20% |
| player/enemy quota | 360/60 | only if observation shows starvation |

## 14. Open questions and known disagreements

These are not approved and must be resolved in the same-text review:

1. **Split bullet quota (360/60)** is a proposal. It is only justified if observation
   shows enemy bullets being starved. Until then the shared 420 cap stays.
2. **Popcorn compression** is a proposal; the recommended pending-credit scalar is
   described above, but it needs explicit approval because it changes the per-pickup
   feedback contract from "immediate" to "queued".
3. **Second gun at wave 1**: the spec says 2 slots at start. This proposal leaves the
   second slot **empty**, which means wave 1 is played with one gun. If Opus wants a
   free second gun instead, that is a separate decision and changes early pacing.
4. **Boss HP** values are placeholders with a validation contract, not final numbers.
5. **Wave 7 / 11 / 15 / 19 auto-continue prompts**: the exact prompt duration and
   dismissal affordance need UI agreement.
6. **Ember vs popcorn/magnet pacing**: the 1.2s delay may suppress feedback loops. This
   is a measured risk in the six-cell comparison, not a settled claim.
7. **Records schema v2**: renaming the storage key means existing local records will not
   carry over (mute preference must be preserved separately).
8. **Pocket headroom rule**: whether a blocking pocket should spawn what fits and record
   the remainder (`pocketRejected`), or be skipped entirely. This proposal recommends
   "spawn what fits, record the rest"; it needs approval because it changes late-wave
   pressure shape.
9. **Splitter cap interaction**: chips go through the normal `spawn()` path, so they can
   be rejected. This is deliberate (no phantom value), but it means a split at the cap
   looks visually smaller. Acceptance needs to confirm that reads clearly rather than
   as a bug.
10. **Mod-pair balance with 2 slots**: popcorn/domino, popcorn/magnet and domino/magnet
    are three genuinely different loops, but tier upgrades must be spread across only
    two mods. If one pair dominates every branch at every tier, the answer is tuning
    the tier effects, **not** adding a third slot or a fourth mod.
11. **Wave 1 gun count**: listed above; unresolved on purpose.

## 14.1 Unresolved risk register

| Risk | Impact | Mitigation in this plan |
|---|---|---|
| Popcorn pending scalar feels laggy | feedback feels delayed | 4 credits/step is far above realistic inflow; card copy says "queued" |
| 180 cap makes late pockets meaningless | late waves feel flat | formation changes (ring/stream/split) plus mix shift; `pocketRejected` makes it measurable |
| Tier II price (4× base) is too steep | players never upgrade | price is a tunable; validation includes a ledger check |
| Ember 1.2s delay starves popcorn/magnet | build feels broken | six-cell comparison; delay is a tunable |
| Chain root cleared too early | under-counted chains | must-fix reference reclaim + dedicated test |
| Split quota starves either side | hidden difficulty shift | treat as unapproved; observe first |
| Boss HP 6400 trivial for a full build | weak finale | ±25% tunable with a real-play check |
| Visual tier changes not readable | upgrades invisible | form + sound requirement per tier |

## 14.2 Explicitly not proposed

To prevent scope creep during review: no third mod slot, no fourth mod, no PARTS, no
refine, no meta-progression, no seventh gun, no new currency, no acid pool or ground
hazard, no camera overhaul, no external assets, no production debug entry, no bot lab.

## 15. Implementation order (after approval)

1. Mode plumbing, data tables, records isolation, slice regression unchanged.
2. Wave engine (20 waves, stops, boss reservation/overtime).
3. Economy (slots, prices, tier II, refund, offer composition, rerolls).
4. Mod tiers and the popcorn credit rule.
5. Branch systems and the chain-root fix.
6. New enemies and boss stages.
7. Visual/audio pass.
8. Validation, then freeze for three-party review.
