# P2 Stage B simulation handoff

**Obsolete as a current-gap description.** This records the historical Stage B
simulation checkpoint. The normal `expedition20` mode now exposes the
contract-v2 rule/inventory/reward state; Stage C added the shop/rest UI, reward
presentation and browser fixtures, and Stage D added elite and chest rendering
plus audio hooks. The repair documented in `docs/archive/p2-repair-handoff.md` then fixed
the offer count, reroll atomicity, owned-item previews, mobile card text and
popcorn accounting presentation. Full-run acceptance and independent review of
the new frozen SHA remain open.

## Public simulation surface

- Inventory and derivation: `inventory`, `inventoryCounts`, `derivedItemStats()`,
  `itemEligibility(id)`, `itemOfferPrice(index)`, `itemOfferPreview(index)`.
- Offers and purchases: `offers`, `itemOffers`, `statRewardOffers`,
  `buy(index)`, `buyItem(index)`, `sell(index)`, `rerollExpedition()`.
- Rewards: `pendingRewards`, `pendingChestChoices`, `pendingRewardChoices`,
  `pendingStatChoices`, `claimCoreReward(index)`, `claimReward(id)`,
  `claimPendingItem(index)`, `chooseStatReward(index)`, `skipReward()` and
  `declinePendingReward()`.
- Physical rewards: `chests`, `chestRenderData`, `eliteRenderData`,
  `collectChest(chest)`, `eliteSpawned` and `eliteEscaped`.
- Metrics: `rawCash`, `fuelUnits`, `collected`, `sweptFuelUnits`,
  `queueMetrics`, `pendingPeak`, `bulletPeak`, `popcornShotsAdmitted` and
  `popcornShotsRejected`.

All reward/item randomness is isolated in `weaponShopStream`, `itemShopRandom`,
`statRewardRandom` and `lootRandom`. Combat remains on `random`.

## Bounded-work semantics

The queue metrics expose `admitted`, `rejected`, `dropped` and `processed`.
Contract v2's terminology disclosure maps `deferred` to admission rejection:
`rejected` is the internal admission-rejection counter, not hidden future work.
Previously admitted work canceled by a wave boundary or loss increments
`dropped`. For popcorn, `processed` counts consumed fuel units;
`popcornFuelConsumed` exposes that scalar and the shot counters report admitted
and rejected bullets separately.

The shared corpse/trail cap is 180. Physical chests cap at 9 and frozen chest
choices at 3. Pending blasts cap at 512 and drain at most 12 per tick. Popcorn
fuel caps at 1024 units, drains at most four units per tick and emits two shots
per unit subject to the shared 420-bullet cap; rejected shots are counted, not
silently treated as output.

## Historical Stage B gaps (closed or superseded)

- The shop/rest surface and item/stat/chest cards were added in Stage C.
- Elite and chest rendering was added in Stage D; the repair removed nested
  card-label ellipsis and unrelated item-proc readouts from selected details.
- Item/elite/chest audio identities and 390px browser checks were added later.
- No Stage B proof of normal-input W20 completion, cohort balance, item-led late
  output, saturation or physical-device performance was claimed; those remain
  P3/open gaps except where the repair records a bounded browser check.

## Test handoff

`tests/p2-sim.test.ts` covers W1 core rows, normal rest rows, purchase/cap/
unique/dependency atomicity, F4 ownership, chest freeze/decline/loss, reroll
rollback and repeat replacement, reroll/exit independence from unclaimed reward
rows, stale unique-claim rejection, raw cash/fuel merge and zero-coin collection,
shotgun 5x3 firing, H2/H3/pressure, terminal return ordering, elite reservation/
escape, milestone trail, fist remnants, source attribution and bounded queues.
The H3 checks count only real `contactProc` aura/contact kills for healing; trail,
pickup and other item-proc kills remain non-healing.
Rest exit is voluntary even while reward rows or a frozen chest remain; the next
wave discards them with zero compensation. A shared reroll can refresh the shop
rows without resolving a reward row, and stale unique claims fail revalidation
without cash or duplicate substitution.
`tests/items.test.ts` remains the pure catalog/profile suite; all retained P1,
slice and render tests remain unchanged in intent.
