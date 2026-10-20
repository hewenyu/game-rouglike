# 废潮 / SCRAP SURGE

> Status note (2026-10-20): P1 (six slots, auto-fusion) and P2 (20 items, rarity,
> elites, chests, rest screen) are implemented and merged. Sections below that
> were written before P2 have been annotated; item numbers live in
> `docs/p2-items-contract.md`, current state in `memory/status.md`, and the next
> designed change in `docs/p3b-fullslot-bundle.md`.

User decision: completely reject drawing/folding combat. Borrow only Brotato's
experience traits: moving while auto-firing, many simultaneous weapons, readable
swarming enemies, collecting drops and shopping between short waves. Do not borrow
its potato character, weapons artwork, UI layout or world symbols.

Opus proposed a hermit crab wearing beach-scrap weapons and a warm-sand sticker
visual identity. DeepSeek flagged stationary dominance, overkill from simultaneous
auto-targeting, and recursive kill effects. Astra selects this direction and, with
Opus and DeepSeek agreeing, limits the first delivery to two waves and one shop,
about 55 seconds of combat, as a slice toward the 10-20 minute goal.

Current target (user playtest, 2026-10-19): the slice's wave count is too low. The
base flow is now planned around **at least 20 waves**, with the build forming
gradually and the over-fast / over-slow build-formation pace brought under control.
The earlier 12-wave idea is void; the 4-wave build-difference check is an internal
experiment only. The 10-20 minute run target still stands and is reconciled with 20
waves plus shop pacing in a later three-party review, not silently stretched to 30
minutes. This feedback covers only wave count and build pacing - it is not an
aesthetic or feel acceptance of the slice. The 20-wave requirement is the user's
explicit goal, not a pending proposal. The implemented candidate follows approved spec
`058951fc84994abb8ee24a2c587bb9232c1c1ccd`; the normal page defaults to `expedition20`,
while `?mode=slice` preserves the approved two-wave slice. This is implementation
approval, not user acceptance or validation victory. Any later tuning or rule change
needs three-party agreement rather than unilateral expansion.

Weapons change attack geometry and rhythm. Free shop modifications alter drops or
kill chains. Weapons are visible on the shell. Left-hand movement is the only
required control; auto-aim and auto-fire are part of the contract, not upgrades.

The old game was technically functional but rejected by actual user play. That
result takes precedence over all model design approval. The user has authorized
autonomous, reversible work while Astra, Opus and DeepSeek explicitly agree on each
step. That authorization is permission to proceed, not user acceptance: it must never
be written up as the user approving the concept, the feel or the visuals.

Current P1 starts with **six weapon slots** and automatically fuses equal same-ID
weapons of the same tier through tier IV. P1's `1/2/4/8` tier ladder is structural,
not approved late balance. The five growth sketches and every provisional number
were non-approved hypotheses in `docs/archive/growth-items-proposal.md`, since
superseded by the implemented P2 contract `docs/p2-items-contract.md`.

## User clarification: positive-feedback builds

The user explicitly requires "左脚踩右脚上天": build synergies should break through
the baseline, not be balanced into near-equivalence. Strong completed builds may
clear mobs with little movement; that is not automatically a QA failure.

### Weapon baseline, item-led late game (three-party decision, 2026-10-19)

Weapons are the baseline output that bridges the early inability to kill. Items must
amplify weapons (attack speed, pierce, multishot, conversions and similar effects)
and add real proc damage. Late-game output must be item-led; weapons alone are not
sufficient. A "firepower build" therefore means a coordinated set of item-amplified
weapons, not six Tier-IV guns by themselves.

P1's `1/2/4/8` Tier-I-IV damage ladder is a provisional foundation, not approved
late balance. Astra, Opus and independent DeepSeek explicitly agree on this reading.
Opus's W1-W5 weapon-viability, W6-W12 item-assembly and W13-W20 item-led pacing is a
working hypothesis, not fixed difficulty. The theoretical risk that six Tier-IV
guns provide 48 baseline guns' worth of output still needs economic-feasibility and
actual-DPS checks. Do not raise enemy HP merely to suppress a dominant gun-only route,
and do not add content as an unapproved substitute for measurement.

Future validation compares three cohorts on the same frozen source and seeds:
weapon-only, items without coordinated synergy, and a coordinated item build. Each
must record actual boss encounter windows, damage, survival and engagement, not just
the terminal win/loss. This is a validation contract. P3A ran a first version of
it (7 cohorts, 21 runs); see `memory/status.md`.

Weapons are the early baseline, scattered items form the middle game and coherent
items must lead the late game. The three cohorts above are validation controls,
not three mandatory player classes. Items are mixable tags, not exclusive classes.
P2 implemented the item system at `447af10`; balance remains unmeasured.

### Item rarity and repeatability (three-party decision, 2026-10-19)

The newest user requirement establishes that repeated purchases of the same item are
sometimes correct and sometimes wrong: common stackable items should be able to
repeat, while certain advanced or unique items must not. Rarity must describe a real
drop and shop distribution, not merely tint an icon. Boss rewards must give better
item chances than ordinary elite rewards.

Rarity and stackability are separate metadata. Common does not automatically mean
stackable, and advanced does not automatically mean unique. Each item must state its
own repeat rule and, when stackable, any meaningful acquisition or effect cap. The
old proposal that classified every mechanism or core item as unique is superseded;
that blanket rule is not approved.

A unique item that is already owned is filtered out before future shop or chest offers
are generated. It cannot reappear and must not be replaced by a compensation claim or
a cash substitute. A stackable item can appear repeatedly within its explicit cap.

Shops and boss chests draw items from the same shared nonweapon pool. Boss chests
apply higher rarity weights than ordinary elite rewards. Shops apply a wave-adjusted
rarity distribution that improves late-game item chances; this is not yet an arbitrary
per-wave guarantee. Boss chests do not become a second weapon shop.

Rarity effects must differ in more than color or label. Their intended distinctions
can include proc strength, support breadth or build-defining interaction, but the
specific effects and numbers remain to be reviewed. P2 implemented this
direction with prototype numbers; exact rates still need measurement before they
count as balance.

Offer generation respects the actual legal pool after filtering. If fewer than three
eligible items remain, show only those items; do not manufacture duplicates merely to
fill a three-card row. A paid reroll that cannot produce a useful legal offer is
disabled or skipped without charging. Free or demonstrably useful rerolls are handled
separately so a valid free action is not removed by the guard.

W5, W10 and W15 grant meaningful nonweapon item rewards, not only currency or a
weapon. W20 is terminal and may end on the victory summary alone; no final shop,
mandatory chest choice or meta-progression is required unless a later three-party
decision adds it. Item resale and curse removal are not approved and must not appear
as side effects of the P2 work.

Boss rewards at W5, W10 and W15 use higher-quality weights from the same
nonweapon pool. Elites at W3, W7, W11, W14, W17 and W19 use lower-quality
weights and real kills, drops, pickups and a sweep. W20 is terminal. Rarity and
repeatability are orthogonal: items may be repeatable or unique by definition,
and some proc effects may stack. Items are mixable tags, not exclusive classes.

Reward and economy randomness use their own seeded stream, separate from combat
randomness. Rarity draws, shop rerolls, elite/boss rewards and chest selections must
not alter spawns, targeting, collisions or projectile outcomes. The current P1
storefront's isolated stream is the precedent. Future reward work must add a paired-
seed test that changes one stream's consumption without moving the other.

The 19 consolidated rest screens contain a weapon row, an item row and a
stat-or-mechanic choice, with chest handling inside that rest surface rather than
an extra modal. Income, drop and elite-rarity rates remain unapproved seeds for a
seeded ledger to be measured. They authorize no confiscation, curse-only money,
fake counters, hard six-generation cap or arbitrary boss-HP inflation. Positive
feedback must use finite actual enemies, settle each death once and retain queued
per-frame work budgets rather than assuming loop gain below one.

P2 tests (implemented in `tests/p2-sim.test.ts` and `tests/items.test.ts`):

- the same seed yields the same reward offers across different combat RNG consumption,
  while adding shop/reward draws leaves combat unchanged;
- owned uniques are filtered without a cash substitute or forced duplicate;
- legal pools smaller than three show only the available cards, and an incapable paid
  reroll does not spend currency;
- repeatable items obey their cap and unique items never repeat;
- W5/W10/W15 draw meaningful nonweapon item rewards, and W20 requires no extra reward
  interaction to complete.

Slice only (the expedition replaced mods with items): two free, stackable shop
modifications create real feedback: enemy death -> scrap ->
pickup projectiles -> enemy death and explosions -> more scrap. Secondary kills do
trigger more explosions. Each enemy settles death once; explosion work uses a queue
with a per-frame processing budget (12), retaining remaining work. Limits protect
termination/performance rather than pretending chains happen while disabling them.

Gun roles: rapid cap popper, five-pellet shotgun, orbiting fork, five-target lightning,
homing soda rocket with radius damage, heavy spring fist with enemy bowling.
Auto-targeting reserves expected damage from in-flight targeted projectiles so two
single-target guns do not knowingly spend both shots on the same nearly-dead target.
Unassigned shotgun pellets and area damage can still overkill; no claim of optimal aim.

Safety limits: enemies 180, projectiles 420, drop objects 250 (merge excess value),
visual effects 300. No external assets or backend. Some low-level geometry was copied from
our own rejected prototype; its unused polygon helpers were removed from
`src/math.ts` on 2026-10-20.

## Frozen slice rules (S1 + S1b)

Player readability: the player is drawn at 1.3x with an ivory shell, teal accents, a
white rim and a complete translucent teal ground ring. Enemies stay orange-red.
Collision geometry is unchanged; only the drawing scales.

Spawn rates: wave 1 spawns a base of 3.1 enemies per second, wave 2 4.2. Wave 1 adds
a pocket of 12 at 6s and 14s; wave 2 adds a pocket of 18 at 5/12/19/26/32s. A pocket
centre spawns at least 310 world units from the player, so an individual enemy in the
ring is still at least 235 units away; every enemy keeps the 0.65s born warning.
Spawn rates are fixed, not matched to player damage.

Magnet accounting: `combatPicked` counts only pickups collected while the phase is
`fight`. Sweep pickups still pay money and still count in `picked`, but they never
advance the magnet charge, and the remainder carries across the wave boundary. No
retroactive burst is granted.

Explosion queue: a kill appends a blast to `pendingBlasts`. At most 12 are processed
per tick; the rest stay queued in FIFO order and are never silently dropped. The
queue peak is recorded in `pendingPeak`. Remaining queued blasts are cancelled at the
wave boundary, which is a documented boundary, not a silent loss.

Explosion palette (approved, recorded here so it cannot drift again): explosions are
saturated orange-yellow - flash core `#FFD24A`, outer shock stroke `#FF8A2A`, plus a
white shock ring and flying debris. Primary weapon blasts and chain (secondary)
blasts use that same family and are told apart by size and lifetime, never by a new
hue. The frozen slice shipped secondary blasts in the player teal `#3FD0A8`; Opus
blocked that and the value is restored to the approved family. The values live in
`BLAST` in `src/data.ts` so simulation and rendering share one source.

Chain counting: a chain is the set of real secondary deaths caused by queued
explosions. `nextChainId` is a monotonic allocator; counts are kept per causal root
in `chainCounts`, so interleaved chains cannot inflate each other. `chainCounts` is a
working set: every step it keeps only roots still referenced by a queued blast or a
live remnant and drops the rest, so a long run cannot accumulate finished roots even
when secondary kills keep refreshing the display timer. The `xN` readout is a
separate scalar that holds the strongest chain reached and decays after 0.8s. A
primary weapon kill, including a rocket's radius damage, never fabricates a chain -
it only starts a new chain id. The HUD shows `xN` only when that peak reached at
least two secondary deaths.

Spring-fist remnant (S1b): a lethal fist hit leaves a remnant for 0.6s with 650
initial speed and decay 7. It deals 30 damage, once per enemy, and does not re-die or
re-drop. Remnant kills give normal drops, can trigger domino and count as secondary
chain deaths. The remnant never damages the player, is never targeted, does not
occupy the 180 live-enemy cap and keeps its own cap of 180.

Overtime: wave 2 runs to 35s; if the boss is still alive the run continues to 50s and
the HUD shows a live 15s "加时 · 击败首领" countdown instead of a frozen zero. No
combat rule changes in overtime.

Fair accounting: `spawnCount` counts successful spawns only, never attempts rejected
by the enemy cap. The 420 projectile cap is shared between player and enemy bullets;
this is documented and recorded rather than changed in this slice.
