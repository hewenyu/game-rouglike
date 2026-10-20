# Current goal

This file records the user's directly specified goal and the design contracts
derived from it. It is authoritative over any tool's built-in goal card (the
Codex goal card text still reads "two-wave slice" and is stale). Implementation
state lives in `memory/status.md`, not here.

## Product goal

Build an original, runnable, replayable, single-player browser auto-combat
roguelike in this directory. A normal run should target 10-20 minutes. It must
support real touch input. Brotato is a reference for the play experience only:
do not copy its character, world, art, UI layout or symbols.

The central experience is a genuine positive-feedback loop ("left foot steps on
right foot and goes to the sky"): deaths, drops, pickups, weapons and explosions
must feed each other in a real, readable chain rather than being simulated by
fake counters or reduced to numeric stat inflation.

## User requirements, verbatim (2026-10-20, 03:14-04:07)

- "我希望武器是自动升级的……两把武器自动合成一把……一开始就开放6个武器槽，这样子不会钱多得花不出去,理论上，钱应该是永远紧缺的才对"
- "明确要标好武器的攻击力和怪物的生命力，要有合适的成长曲线"
- "我觉得它没有'肉鸽'的味道……精英怪会掉宝箱，宝箱里会给物品。这些物品不包括武器，只包括商店的物品。商店物品可能有特殊 build，也可能有负面效果，但是有些 build 就是靠这些负面效果来实现的"
- "至少给我规划 5 种不一样的成长路线,都能直接爽玩到后期的build,不要雷同" - e.g. speed-for-output, chain reaction, collision explosion (raise HP, explode on contact), strong firepower, and "左脚踩右脚" (A triggers B, B triggers A).
- "武器只能提供基础输出，各种物品可以提供额外的武器加成输出，以及额外的特效输出……后期单纯靠武器已经输出不够了，而是需要各种物品的 build 来实现"
- "相同的物品可以重复购买，而且有些是高级物品、唯一物品，是不能重复购买的……商店刷新和爆率的稀有度，以及 Boss 可以爆更好的物品"

Implemented in P1/P2 (see `memory/status.md`): six slots, auto-fusion, ATK/DPS/HP
labels, 20 items in five families, rarity vs stackability, elite chests, boss
chests. **Not yet achieved:** a tuned growth curve, measured item-led late game,
late viability of all five routes, and money scarcity (blocked by the full-slot
deadlock, `docs/p3b-fullslot-bundle.md`).

## Current P1 structure (explicit goal)

The latest user direction is six weapon slots from W1 with automatic
same-ID/same-tier fusion through IV. The P1 accounting is frozen: the starting
gun is free and paid 0, an 18-scrap purchase is paid 18, and two paid 30-scrap
coils merge into one paid-60 weapon with the money charged once. No accounting
change is required. The operation is `six slots + one incoming - positive fusion
<= six`; a purported over-capacity-after-fusion defect is impossible.

Presentation labels are panel estimates, not live combat measurements: cards
use compact `理论DPS` plus one shared note for single-target/all-pellets/saw
contact qualifications. The owned heading uses `面板数值`; shotgun, saw and
rocket effect tags are `5 弹丸`, `环绕` and `范围`. These labels do not alter
formulas or rules, and they must wrap without becoming a two-character vertical
column on mobile.

Expedition bag, runner and chip draw small read-only hurt bars. Can, splitter
and spitter keep their existing bars, while default renderer calls retain the
frozen slice behavior. No bar feeds back into combat or RNG.

P1 approved structure and presentation only. It does not approve item numbers,
late balance or user feel.

## Wave-count target (user playtest, 2026-10-19)

The user played the slice and gave the latest, highest-priority requirement: the
level count is too low and there must be **at least 20 levels/waves**. The build
should take shape gradually across those 20 waves. The current build-formation pace
varies too much: sometimes it forms too fast, sometimes too slow; the causes remain
to be measured. 20 waves is the pace the user wants.

So the base flow is now planned around **20 waves**. The earlier 12-wave idea is
void, and the 4-wave build-difference check is an internal experiment only, never a
delivery target. The original 10-20 minute run target still stands and must be
reconciled with 20 waves plus shop pacing in a later three-party review; it must not
silently stretch to 30 minutes.

This playtest feedback is only about wave count and build-formation pacing. It is
**not** an aesthetic or feel acceptance of the current slice, and it must never be
recorded as user acceptance of the visuals or of any other part of the build.

## Growth contract (three-party decision, 2026-10-19)

The latest user direction is explicit and higher priority than the provisional P1
weapon ladder: weapons are the **baseline output** that bridges the early inability
to kill. Items must provide weapon bonuses and extra proc damage; late-game output
must come from coordinated item amplification and interactions, because weapons
alone are insufficient.

Therefore "firepower build" means item-amplified weapons - attack speed, pierce,
multishot, conversions and similar interactions - **not** six Tier-IV guns alone.
P1's `1/2/4/8` Tier-I-IV damage multiplier is a provisional foundation and is not
approved late balance. Do not silently raise enemy HP or add content to suppress a
dominant gun-only route.

Astra, Opus and independent DeepSeek explicitly agree on this interpretation.
Opus proposes, as a hypothesis rather than fixed difficulty, that W1-W5 establish
weapon viability, W6-W12 assemble items and W13-W20 become item-led. The risk that
six theoretical Tier-IV guns produce 48 baseline guns' worth of output requires
economic-feasibility and actual-DPS validation; it must not be handled by raising HP.

Future validation must compare three cohorts on the same frozen source and seeds:

1. weapon-only;
2. items without coordinated synergy;
3. a coordinated item build.

Each cohort must record actual boss encounter windows, damage, survival and whether
the boss was engaged, not merely final win/loss. This contract records direction,
not implementation approval for a new item system or a balance claim.

## Item rarity and repeatability (three-party decision, 2026-10-19)

The user's newest requirement is that identical items must be repeat-buyable when
their definition allows it, while some advanced or unique items cannot repeat. Shop
refresh rarity and drop rarity must be real systems, not color labels. Boss rewards
must have genuinely better item chances than ordinary elite rewards.

The agreed interpretation is:

- Rarity and stackability are separate metadata. A common item can be stackable
  without being classified by rarity, and an advanced item can be either stackable
  or unique according to its own definition.
- Every item's repeat rule is explicit. Stackable items may repeat; any cap must be
  meaningful and stated. Unique items cannot be acquired twice. Do not classify all
  mechanism or core items as unique by default.
- Once a unique item is owned, it is filtered out of future shop and chest offers.
  It must not be offered again in exchange for compensation or a cash substitution.
- Boss chests draw from the same nonweapon item pool as ordinary rewards but use
  higher rarity weights. They do not grant weapons through that chest path. Elite
  rewards use the same shared nonweapon pool with lower rarity weights. A late-wave
  shop also improves its rarity distribution over time.
- Rarity must affect outcomes, not only color. Distinct rarity treatment may include
  proc strength, support breadth, build-defining interactions or other approved
  effects. This is a direction for item design, not approval of arbitrary raw-stat
  inflation.

This contract was implemented in P2 (`6ba7844`, source `447af10`) with the
prototype values in `docs/p2-items-contract.md`. Those rarity weights, caps, stack
formulas, elite frequencies and shop curves are approved for prototype only, not
as measured balance.

Offer generation respects the actual legal pool. If fewer than three eligible items
remain after unique ownership filtering, show only those items; do not force
duplicates merely to fill a three-card row. A paid reroll that cannot produce a useful
legal offer is disabled or skipped without charging. Free or demonstrably useful
rerolls remain a separate UI case.

The boss milestones at W5, W10 and W15 contain meaningful nonweapon item rewards, not
only currency or a weapon. W20 is terminal and may end on the victory summary alone;
no final shop, mandatory chest selection or meta-progression is required unless a
later three-party decision adds one. Item resale, curse removal and similar economy
actions are not approved and must not be introduced as side effects.

Reward and economy randomness must use a separate seeded stream from combat
randomness. Shop rerolls, item rarity, elite/boss drops and chest selection must not
change spawns, targeting, projectile outcomes or any combat result. The existing P1
storefront stream is the precedent; future reward work must prove this separation
with paired-seed tests.

P2 tests covering the following now exist in `tests/p2-sim.test.ts` and
`tests/items.test.ts`:

- reward offers with a fixed seed stay unchanged when combat consumes a different
  number of random values, while shop/reward draws leave combat unchanged;
- owned uniques are removed from future offers without cash substitution or forced
  duplicates;
- a legal pool smaller than three shows only the available cards, and an incapable
  paid reroll does not spend currency;
- repeatable items respect their explicit caps while unique items never repeat;
- W5/W10/W15 draw meaningful nonweapon items with improved rarity weights, and W20
  completes without requiring another reward interaction.

Items are mixable tags, not classes. The five candidate paths - speed, chain,
HP/contact, firepower and pickup A/B - are recorded with provisional numbers and
curses in `docs/archive/growth-items-proposal.md`. Every omitted value there is an
UNAPPROVED HYPOTHESIS, not approved balance. Some procs may stack, and it must not
be assumed that every core item is unique. Rarity and repeatability remain
orthogonal.

Boss rewards at W5/W10/W15 draw higher-quality items from the same nonweapon
pool; elites at W3/W7/W11/W14/W17/W19 use lower-quality weights and real
kills/drops/pickups/sweeps. W20 is terminal. The 19 consolidated rest screens
contain a weapon row, an item row and a stat-or-mechanic choice; chests do not
add another modal. (All implemented in P2.)

Income, drop and elite rates remain unapproved and must be seeded in a measured
ledger. There is no confiscation, curse-only money, fake counter, hard
six-generation cap or arbitrary boss-HP inflation. Positive feedback operates on
finite actual enemies, settles each death once and uses bounded per-frame queue
budgets, not a claimed sub-one loop gain. Weapons are the early baseline,
scattered items form the middle and coherent items lead late.

Scope stays gated: no one may unilaterally implement a 20-wave expansion. The
20-wave requirement itself is the user's explicit goal, not a pending proposal. The
approved implementation spec is `058951fc84994abb8ee24a2c587bb9232c1c1ccd`, and a
runnable `expedition20` candidate now exists. The normal page defaults to that mode;
`?mode=slice` preserves the approved two-wave slice. This is implementation approval
only, not user acceptance or validation victory. Any later tuning or rule change needs
agreement (three-party for Codex sessions; see `AGENTS.md` / `CLAUDE.md`). Mods
now exist only in the slice; the expedition uses items and mechanism rewards
instead.

## Collaboration and ownership

How agents collaborate is defined in `AGENTS.md` (shared rules and the Codex
three-model workflow) and `CLAUDE.md` (Claude Code develops directly). The user
set this split on 2026-10-20. The current project documents are the shared source
of truth; chat history is context, not authoritative project state.

## Delivery gates

- Codex sessions create the goal before starting work.
- Review the exact frozen commit before calling a candidate done.
- The original seven acceptance sections of the user's first prompt remain in
  force. User acceptance is still pending.
- The rejected `nightfold/` prototype has been deleted under the user's direct
  authorization.
- Do not push, merge, deploy, publish or use paid services without explicit user
  authorization. (The user authorized the 2026-10-20 merge/push of `b045332`.)
