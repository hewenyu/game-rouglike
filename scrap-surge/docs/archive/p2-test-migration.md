# P2 test migration ledger

This ledger records only expedition assertions made obsolete by contract v2.
Slice tests, P1 fusion/refund/transaction tests, render tests and two-argument
weapon-profile tests are retained rather than migrated.

| Old assertion | Replacement coverage |
| --- | --- |
| Nine full shops, six quick choices and four automatic interludes | `expedition wave schedule and stops match the approved table`: exactly 19 full rests and W20 terminal; `expedition-old-quick-picks test covered by every rest using item/stat rows` opens every rest |
| W1/W3 mod picks and W5 branch pick | `P2 W1 has exactly one core row and normal rests have one stat row`: W1 has three distinct core-item choices, W2-W19 have one stat row except W5/W10/W15; branch mechanics are absent from expedition |
| W9/W13/W17 mod-tier upgrades | `old quick tier-upgrade coverage replaced by one consolidated rest surface` and the item/stat rest test: all 19 rests use the consolidated shop/reward surface |
| Four weapon offers as the expedition rest shape | Rest tests assert three distinct weapon offers plus three distinct item offers on the independent rows |
| Two mod slots and their tier-II/tier-III effects | `items.test.ts` item caps/dependencies, `P2 item purchase enforces cap, uniqueness, dependency and exact price`, and item-trigger tests in `p2-sim.test.ts`; old expedition mod tiers are not reconstructed |
| Wake branch proximity trail | `S3 milestone uses actual displacement, 36 radius, 30xP and a root` and `P2 milestone trail uses real displacement and consumes one shared cap` |
| Ember branch heat lock/explosion | `old ember branch coverage replaced by rain cash conversion`, zero-cash/source-cash tests, and `P2 raw source cash and fuel survive cap merges and convert once` |
| Popcorn tier-II pierce and tier-III ring | Fuel-bound tests: `scrap popcorn admits fuel and drains at most four units per fixed step`, `old tier-III popcorn ring coverage replaced by bounded fuel admission`, wave-end cancellation, and `P2 zero-coin siphon still increments cash, fuel and collection exactly once` |
| Domino tier-II radius growth and tier-III eighth-kill blast | `C2 root-local kill growth expires without leaking across roots`, `C1/C4 use real secondary deaths, C2 radius and fixed C4 radius`, and `C1 queues a real death blast with C2 copied growth` |
| Magnet tier-II homing and tier-III arena cue | `popcorn and magnet item procs keep their distinct bullet metadata`, `magnet metadata starts at newly spawned bullets and respects the shared cap`, and `P1 magnet uses eight fuel units and emits ten real caps` |
| Branch-specific presentation events | `presentation events still fire for real enemy and tier actions`; new elite/chest/item events remain Stage B instrumentation for Stage C rendering/audio |

The ledger intentionally does not convert old quick-choice assertions into
coverage for rewards that were never implemented. It records the replacement
surface and the exact tests that now pin it.
