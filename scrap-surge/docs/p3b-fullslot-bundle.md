# P3B: full-slot component bundle (design approved, not implemented)

Status (2026-10-20): **design approved by all three parties (V2), no code.** The
implementation agent was stopped before writing when the user paused development
and asked for the reviewed `b045332` release to be merged. Nothing in `src/`
implements this. This file is the repository copy of the only prior record,
`/tmp/scrap-fullslot-proposal.txt`, rewritten for readability; the rules are
unchanged.

## Problem found by P3A

A new weapon always enters at Tier I and only fuses with a same-ID Tier I. Once
all six slots hold Tier II or higher guns and no Tier I partner exists, every
Tier I purchase is rejected regardless of cash. In P3A, weapon-only seed 1 sat on
six Tier-II guns with 153-765 cash across the W9-W14 rests, and 129 rest endings
had six occupied slots with every gun at Tier II or higher. Free rerolls do not
help. Selling frees a slot but makes a manual chore of what should be smooth
automatic growth. This, not wallet scarcity, is why "money is always scarce" did
not hold in measurement.

## Rule (V2)

- Applies only to the expedition weapon shop. `?mode=slice` is unchanged.
- An ordinary purchase that has a free slot, or that fuses with an existing
  same-ID Tier I gun, stays exactly as today (incoming Tier I, ordinary price).
  If an ordinary Tier I path exists, never use a bundle.
- Only when the ordinary Tier I purchase would be rejected **solely** because six
  slots are occupied: look for existing same-ID guns at Tier II or III. Pick the
  **lowest** such tier; ties follow stable existing gun order.
- The incoming weapon is a **bundle at that tier**, equal to `2^(tier-1)` Tier I
  component units (x2 for Tier II, x4 for Tier III). Charge the current wave's
  `gunPrice * componentQuantity`, once.
- The bundle immediately fuses through the existing equal-ID/equal-tier cascade.
  Example: slots `A-II B-II C-II D-II E-II F-II`, buy A -> incoming `A-II` costs
  2x base -> `A-II + A-II = A-III` -> final `A-III B-II C-II D-II E-II F-II`. It does
  **not** need two pre-existing Tier II guns.
- Before authorizing, the central preview must actually build the deterministic
  cascade, consume the bundle, prove at least one pre-existing same-ID gun
  reaches a strictly higher tier, conserve component units and actual paid, and
  end with `<= 6` slots. If no concrete upward merge exists, reject atomically.
- If no same-ID gun exists, or all matching guns are Tier IV, keep the rejection.
  The Tier IV cap is unchanged.
- Paid aggregation is preserved: the bundle's actual paid is the full charged
  amount; resale stays `floor(35% of actual paid)`. Any eligibility or
  affordability failure leaves money, guns, RNG, events, offers and records
  untouched.
- No storage inventory, random-tier shop, manual crafting, free upgrade,
  retroactive refund, reserve slot or new resource.

## Preview / UI contract

- One central pure preview resolves bundle tier, component quantity, total price,
  cascade, result tier, damage and availability/rejection. The simulation uses
  exactly that preview.
- **Existing trap:** `preview.incomingTier` today means the *final merged* tier,
  despite its name. Either keep it as a compatibility alias or migrate every
  consumer. Add explicit `bundleTier`, `componentQuantity`, `totalPrice` and
  `resultTier` (owned `A-II` + bundle `A-II` -> `bundleTier 2`, `resultTier 3`).
- Preview, display, affordability, deduction, paid, records and merge events must
  all use the actual total price and final result tier. Never report II after a
  III merge.
- The card shows the real price and an explicit label such as
  `自动补件 ×2：II → III` or `×4：III → IV`, with before/after attack.
- Weapon buys stay separate from items; the three distinct weapon offers and
  their RNG are unaffected.

## Out of scope

No change to enemy HP, waves, income, items, drops, procs, weapon damage
multipliers, fire rates, rendering or audio core. This smooths existing weapon
progression; it does not claim guns should carry the late game.

## Required tests

Unit:

1. Six distinct Tier II plus a same-ID bundle -> Tier III, still six slots, spends
   2x base, paid correct.
2. Full six with natural II/III cascade, never over capacity.
3. Next Tier III bundle -> Tier IV at 4x base.
4. All matching Tier IV / unowned ID / insufficient cash -> atomic rejection.
5. Free slot and Tier I merge keep the original behavior.
6. Current-wave price and resale of arbitrary actual paid.
7. No RNG movement.
8. Source gun profile and actual projectile damage of the result.

Existing tests migrate only where semantics explicitly change; never weaken
accounting or slice guards.

Browser: ordinary keyboard and real CDP touch reach full slots through legitimate
purchases (finite fixture, no state injection), inspect the stated bundle price,
buy, then validate the committed result, cash and UI.

Measurement: rerun the same P3 driver/policy/21 seeds against the new source with
an explicit new freeze (update `FROZEN_SOURCE` in `tests/p3-measure.ts` and
`tests/p3-policy.ts`; do not disable the source guard). Compare actual spending,
tier progress and boss windows. If a new weapon ceiling becomes reachable, that
needs a later balance proposal; do **not** raise enemy HP to force item
dependence.

## Review record

- Original proposal approved as written by Opus (`p3_opus_slot_design_once`).
- DeepSeek (`p3_ds_slot_design_once`) asked for the concrete upward-merge guard but
  also wrote contradictory wording; retired without inferred approval.
- V2 clarification above was explicitly approved by root Astra, a fresh Opus
  (`p3_opus_slot_v2_consent_once`) and a fresh independent DeepSeek
  (`p3_ds_slot_v2_adjudicate_once`), 2026-10-20. The earlier DeepSeek
  contradiction was adjudicated as a misreading, not a defect.

## Review-raised balance risks (for after implementation)

- The 1/2/4/8 tier ladder (about 48x baseline at six Tier IV) may dominate once
  reachable.
- 4x bundle prices after W14 compete with the item budget.
- Pickup routes are weak against bosses; 10 base HP is fragile with
  spiked-shell/pressure-valve style items; total run time approaches 20 minutes.

Reviewers agreed: measure first; do not compensate with enemy HP.
