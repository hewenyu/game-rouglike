# Growth paths and item hypothesis

Status: **design hypothesis only, not implemented and not approved balance.**
This document records five possible growth paths for later P2 work. It does not
approve item code, numbers, rarity weights, economy rates, elite frequencies,
combat tuning or a third mod slot. It does not implement P2 and does not deny
the already-implemented P1 six weapon slots. P1 production code remains live.

The latest user direction is explicit: the P1 result merges six slots from W1 with
automatic same-ID/same-tier fusion through tier IV. Because a bought item either
occupies an empty slot or merges and therefore does not increase the slot count,
`six slots + one - positive fusion <= six`; "over-capacity after fusion" is
mathematically impossible and is not treated as a defect. Accounting remains
free gun paid 0 plus an 18-scrap purchase paid 18; two paid 30-scrap coils
merge into paid 60 with money charged once.

## Shared constraints

- Items are **mixable tags, not exclusive classes**. A run may combine speed,
  chain, contact, firepower and pickup tags.
- Weapons are the early baseline. Items must amplify weapons and add real proc
  damage; late output must become item-led. The three validation cohorts remain
  weapon-only, scattered items and coherent items.
- Each item has explicit repeatability metadata independent of rarity. Some
  procs stack; not every core item is unique.
- Boss rewards at W5, W10 and W15 are higher-quality draws from the same
  nonweapon item pool used by ordinary rewards. Elite rewards use the same pool
  at lower-quality weights.
- Income and drop rates below are **unapproved seeds for a measured ledger**, not
  balance targets. No confiscation, curse-only money, fake counters, hard
  six-generation cap or arbitrary boss-HP inflation.
- Positive feedback must use finite actual enemies. Each enemy settles death
  once, and queued work has a per-frame budget rather than a loop that claims
  `gain < 1` while still expanding.
- The P2 implementation phases remain **pending and not done**.

## Five hypotheses

Each path lists three or four provisional items plus its intended curse. Values
left unstated are explicitly **UNAPPROVED HYPOTHESES**, not current balance.

### 1. Speed: distance feeds damage

Tags: `speed`, `damage`, `distance`

1. **Torn Sandal**: maximum HP `-30%`, movement speed `+25%`. Measures whether
   movement can buy survival without trivializing contact pressure.
2. **Tailwind Coil**: movement speed above the normal cap converts into weapon
   damage. Rate and cap are UNAPPROVED HYPOTHESES.
3. **Mile Marker**: distance travelled wakes a short-lived damage trail. Radius,
   interval and damage are UNAPPROVED HYPOTHESES.
4. **Slipstream**: optional fourth slot; proc frequency, if any, is an
   UNAPPROVED HYPOTHESIS.

Curse: `HP -30%`, while the build's upside depends on continuous movement rather
than a passive damage multiplier.

### 2. Chain: deaths become area damage

Tags: `chain`, `blast`, `projectile`

1. **Dead Battery**: each real enemy death releases a small blast. Blast damage
   is an UNAPPROVED HYPOTHESIS.
2. **Wedged Ring**: blast radius grows with each real chained death. Growth per
   link, starting radius and cap are UNAPPROVED HYPOTHESES.
3. **Short Fuse**: projectile damage `-25%`, blast damage `+60%`. This rewards
   actual death chains instead of raw projectile output.
4. **Forked Conductor**: real kills may launch another chained proc. Projectile
   count, cooldown and chain depth are UNAPPROVED HYPOTHESES.

Curse: primary projectile output drops `25%`, and the payoff requires real
secondary deaths.

### 3. HP/contact: durability converts into contact pressure

Tags: `hp`, `contact`, `proc`

1. **Thick Shell**: maximum HP `+8`, movement speed `-10%`.
2. **Undertow Plate**: when the player accepts a real hurt, release a contact
   blast scaled from maximum HP. Radius, scaling and cooldown are UNAPPROVED
   HYPOTHESES.
3. **Pressure Valve**: each additional incoming damage point raises the next
   contact blast. Incoming `+1` is a hypothesis; blast growth is UNAPPROVED.
4. **Bent Rivet**: a bounded number of contact kills can heal. Amount, cap and
   cooldown are UNAPPROVED HYPOTHESES.

Curse: `HP +8`, movement speed `-10%`, and a bounded contact-kill heal rather than
unlimited sustain.

### 4. Firepower: stack damage and alter weapon geometry

Tags: `damage`, `range`, `pierce`, `weapon`

1. **Scrap Powder**: stack weapon damage.
2. **Long Barrel**: attack speed `+35%`, weapon range `-25%`; the tradeoff is
   explicit and provisional.
3. **Bent Nail**: add pierce to eligible projectiles. Pierce count and
   eligibility are UNAPPROVED HYPOTHESES.
4. **Tier Badge**: tier-based weapon bonus. Per-tier values are UNAPPROVED
   HYPOTHESES and must not silently replace the P1 `1/2/4/8` profile.

Curse: range drops `25%` on the attack-speed-oriented item; the `+35%` and `-25%`
values remain UNAPPROVED HYPOTHESES, not a runtime change.

### 5. Pickup A/B: collection becomes firepower

Tags: `pickup`, `seek`, `chain`, `pierce`, `income`

1. **Lucky Hook**: pickups gain a chance to become seeking bullets. Chance,
   damage and proc cap are UNAPPROVED HYPOTHESES.
2. **Chain Magnet**: seeking bullets must hit real enemies, then normal drops
   and more pickups may follow. This closes the loop on actual enemy deaths, not
   fabricated counts.
3. **Scrap Siphon**: broader pickup radius, with `scrap income -40%` and more
   pickup-triggered fire. The tradeoff is provisional and unapproved.
4. **Hooked Tine**: seeking bullets gain pierce support. Pierce count and proc
   stacking are UNAPPROVED HYPOTHESES.

Curse: `income -40%` on the magnet variant, offset only by real pickup-driven
damage rather than a cash refund or fake counter.

## Rewards, stops and validation

- W5, W10 and W15 are higher-quality nonweapon item rewards from the same pool;
  elite rewards use lower-quality weights from that pool. W20 is terminal and
  requires no extra reward interaction.
- Planned elite waves are W3, W7, W11, W14, W17 and W19, with real kills, drops,
  pickups and a sweep boundary. Frequencies remain unapproved.
- The planned 19 consolidated rest screens keep the weapon row, item row and a
  stat-or-mechanic choice. Chests stay in the rest surface; no extra modal is
  implied.
- Boss and elite quality, shop curves and income rates must be seeded and
  measured. They are not approved balance.
- P2 TODO: write tests only after the scope is approved. The current P1 suite
  does not test items, rarity, chests or these numbers.

Cross-references: [design](design.md), [testing](testing.md), [current
status](../memory/status.md), [goal](../memory/goal.md).
