# P2 Stage B simulation handoff

This is a Stage B simulation checkpoint, not a playable P2 delivery. The normal
`expedition20` mode now exposes the contract-v2 rule/inventory/reward state, but
Stage C still owns the shop/rest UI, reward presentation, elite and chest
rendering, audio hooks, browser behavior and full-run acceptance. No W20
viability, performance, user-feel or balance claim follows from these tests.

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
`dropped`. `processed` counts only work actually emitted or credited.

The shared corpse/trail cap is 180. Physical chests cap at 9 and frozen chest
choices at 3. Pending blasts cap at 512 and drain at most 12 per tick. Popcorn
fuel caps at 1024 units, drains at most four units per tick and emits two shots
per unit subject to the shared 420-bullet cap; rejected shots are counted, not
silently treated as output.

## Known integration gaps

- The shop/rest surface still renders the P1 weapon flow; Stage C must render
  item cards, stat rewards, chest choices, rarity/unique/cap/dependency text,
  prices and the full effect preview without moving rules into rendering.
- Elite and chest visuals are exposed as data only. The renderer must add the
  unmistakable elite silhouette/marker/HP cue and real chest cue without altering
  collision, RNG or simulation order.
- Item/elite/chest audio identities and mobile 390px layouts are not implemented
  or browser-verified in Stage B.
- There is no Stage B proof of normal-input W20 completion, cohort balance,
  item-led late output, saturation, or physical-device performance.

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
