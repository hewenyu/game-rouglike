# P3A natural-simulation measurement (v2 evidence repair)

Status: finite diagnostic evidence; not pass-by-definition, browser play, human
victory, route viability, performance or user acceptance.

This version repairs the prior report's reroll and weapon-offer claims without
changing gameplay or the original raw trace. Source is frozen at
`447af109d4a07d218ae33466c75bc5b1266b092c`; preregistration checkpoint was
`6ba784466e9a3f814a8fb4700438c44f3825d633`. The 21 fixed cohort/seed runs use the same hashed
driver and policy for every cohort. A separate weapon-only/seed-1 replay matched
the complete run record exactly.

## Provenance

- policy SHA-256: `e78ef5512c0a968bde0ebe080f4532bd78cfaf7c0ff08468d2f21de6640e2353`
- driver SHA-256: `e5c398e9658bfc014014c753e2682fcf9e6fabe8019247ddef148ef530a7d202`
- v2 harness SHA-256: `a1f43dd42131fbfffbd2ff8b7dce2e542973ca7a62d3a8d85d0e9dcc1c4dad43`
- original v1 harness SHA-256: `11456c85c3f0b7f50a47951c6c0214fbaaa218ab43b63bcb466d4a0208b1635d`
- production source manifest: `148b63298d86f30bf952696723f2e55546fc3008bb0f8becb9710f74db650075`
- original raw SHA-256: `6df30a864a262b0e858c2d826b18600d22df59eaa03feff90d41d819519f8bc2`
- v2 observed trace SHA-256: `ee531e7d8516f7cffbd8cd7575e9cfd67bb646f99e66649f08082dbaf87b6c1e`
- tracked compact report SHA-256: `b837259bf072dc8520445709d83f2e3f51237d0576c36b76f66a490544801c23`

The original v1 raw is preserved gzip-compressed at
`docs/data/p3-measurement-v2/artifacts/runs-447af10.jsonl.gz`. The new
observer trace is under
`docs/data/p3-measurement-v2/generated/artifacts/runs.jsonl`. Regeneration
accepts `P3_DATA_DIR`/`P3_ARTIFACT_DIR` for measurement and
`P3_GENERATED_DIR`/`P3_REPORT_DATA_DIR` for reporting, with no private
`/tmp` default.

## Compatibility with v1

The v2 observer batch is `22` records. After
removing only observation-only fields, every old and new record matched exactly:
health, cash, guns, acquisitions, waves, bosses, inventory, terminal outcome and
all other measured state. The replay matched its primary record.

Ignored observation-only fields:

`acceptedRerolls, freeAcceptedRerolls, initialWeaponOffers, offerAudit, offerRound, paidAcceptedRerolls, paidRerollSpend, previewAccepted, previewReason, refreshedWeaponOffers, rejectedRerollAttempts, rerollAttempts, rerollNotAttemptedReason, weaponPreviewEvaluations`

## Rerolls

The raw records contain **306 accepted rerolls**, of which
**306 were free**, **0 were
paid**, **0 were rejected calls**, and paid reroll spend
was **0**. All rests reset `shopRerollIndex`, so the
one attempted reroll per rest had price 0. The old `cash.rerolls` field remains
0 and is retained; it is not the total accepted-reroll counter. The money
fields are unchanged.

| cohort | seed | accepted | free | paid | rejected | paid spend |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| weapon-only | 1 | 14 | 14 | 0 | 0 | 0 |
| weapon-only | 42 | 14 | 14 | 0 | 0 | 0 |
| weapon-only | 145 | 19 | 19 | 0 | 0 | 0 |
| scattered | 1 | 6 | 6 | 0 | 0 | 0 |
| scattered | 42 | 19 | 19 | 0 | 0 | 0 |
| scattered | 145 | 19 | 19 | 0 | 0 | 0 |
| speed | 1 | 19 | 19 | 0 | 0 | 0 |
| speed | 42 | 19 | 19 | 0 | 0 | 0 |
| speed | 145 | 4 | 4 | 0 | 0 | 0 |
| chain | 1 | 4 | 4 | 0 | 0 | 0 |
| chain | 42 | 19 | 19 | 0 | 0 | 0 |
| chain | 145 | 19 | 19 | 0 | 0 | 0 |
| hp-contact | 1 | 4 | 4 | 0 | 0 | 0 |
| hp-contact | 42 | 14 | 14 | 0 | 0 | 0 |
| hp-contact | 145 | 4 | 4 | 0 | 0 | 0 |
| item-amplified-firepower | 1 | 14 | 14 | 0 | 0 | 0 |
| item-amplified-firepower | 42 | 19 | 19 | 0 | 0 | 0 |
| item-amplified-firepower | 145 | 19 | 19 | 0 | 0 | 0 |
| pickup-feedback | 1 | 19 | 19 | 0 | 0 | 0 |
| pickup-feedback | 42 | 19 | 19 | 0 | 0 | 0 |
| pickup-feedback | 145 | 19 | 19 | 0 | 0 | 0 |

Weapon-only seed 1 has **14 accepted/free rerolls across 14 rests**. This
contradicts the old report's "no accepted rerolls" statement.

## Weapon-offer observations

Rows are captured when created, before later purchases can change the shop.
Each row records ID, tier, price, affordability at row creation, public preview
acceptance/reason, status and purchase-attempt state.

Totals across all primary runs: initial offers 918, refreshed
offers 918, purchased offers 182,
attempted-rejected offers 0, not-attempted or
unaffordable offers 782, and preview-no-space offers
872. There were
129 rest endings with six occupied slots
and every gun at Tier II or higher; 115
of those rests also had no Tier-I offer in either row.
The remaining 14
rests contained 20 Tier-I offers,
all 20 purchased after an
earlier compatible purchase freed a slot.

Weapon-only observation detail:

| seed | after W | cash start-end | slots | max tier | initial no-space | refreshed no-space | initial Tier I | refreshed Tier I | all T2+ and no T1 offer | rows |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 1 | 26-4 | 2 | 1 | 0 | 0 | 3 | 3 | no | i:shotgun/T1/$22/purchased; i:slinger/T1/$15/not-attempted; i:coil/T1/$25/not-attempted; r:rocket/T1/$26/legal-unaffordable; r:coil/T1/$25/legal-unaffordable; r:saw/T1/$21/legal-unaffordable |
| 1 | 2 | 40-14 | 3 | 1 | 0 | 0 | 3 | 3 | no | i:fist/T1/$22/not-attempted; i:saw/T1/$26/purchased; i:shotgun/T1/$27/not-attempted; r:slinger/T1/$18/legal-unaffordable; r:saw/T1/$26/legal-unaffordable; r:fist/T1/$22/legal-unaffordable |
| 1 | 3 | 48-1 | 4 | 2 | 0 | 0 | 3 | 2 | no | i:fist/T1/$26/purchased; i:shotgun/T1/$31/not-attempted; i:slinger/T1/$21/purchased; r:rocket/T1/$37/legal-unaffordable; r:fist/T1/$26/legal-unaffordable; r:slinger/T2/$21/legal-unaffordable |
| 1 | 4 | 41-1 | 5 | 2 | 0 | 0 | 3 | 2 | no | i:rocket/T1/$42/legal-unaffordable; i:fist/T1/$29/not-attempted; i:coil/T1/$40/purchased; r:slinger/T2/$24/legal-unaffordable; r:rocket/T1/$42/legal-unaffordable; r:shotgun/T1/$36/legal-unaffordable |
| 1 | 5 | 73-26 | 6 | 2 | 0 | 0 | 3 | 3 | no | i:rocket/T1/$47/purchased; i:saw/T1/$38/not-attempted; i:shotgun/T1/$40/not-attempted; r:coil/T1/$45/legal-unaffordable; r:fist/T1/$33/legal-unaffordable; r:shotgun/T1/$40/legal-unaffordable |
| 1 | 6 | 101-9 | 6 | 2 | 0 | 1 | 3 | 2 | no | i:coil/T1/$50/purchased; i:rocket/T1/$52/not-attempted; i:saw/T1/$42/purchased; r:fist/T1/$36/legal-unaffordable; r:rocket/T1/$52/legal-unaffordable; r:saw/T2/$42/unaffordable-preview-rejected-no-space |
| 1 | 7 | 102-13 | 6 | 2 | 1 | 1 | 2 | 2 | no | i:shotgun/T1/$49/purchased; i:rocket/T1/$58/not-attempted; i:coil/T2/$55/preview-rejected-no-space; r:slinger/T2/$33/preview-rejected-no-space; r:rocket/T1/$58/legal-unaffordable; r:fist/T1/$40/purchased |
| 1 | 8 | 107-44 | 6 | 2 | 3 | 2 | 0 | 1 | no | i:fist/T2/$44/preview-rejected-no-space; i:slinger/T2/$36/preview-rejected-no-space; i:coil/T2/$60/preview-rejected-no-space; r:slinger/T2/$36/preview-rejected-no-space; r:rocket/T1/$63/purchased; r:shotgun/T2/$53/preview-rejected-no-space |
| 1 | 9 | 153-153 | 6 | 2 | 3 | 3 | 0 | 0 | yes | i:slinger/T2/$39/preview-rejected-no-space; i:shotgun/T2/$58/preview-rejected-no-space; i:fist/T2/$47/preview-rejected-no-space; r:shotgun/T2/$58/preview-rejected-no-space; r:coil/T2/$65/preview-rejected-no-space; r:rocket/T2/$68/preview-rejected-no-space |
| 1 | 10 | 317-317 | 6 | 2 | 3 | 3 | 0 | 0 | yes | i:fist/T2/$51/preview-rejected-no-space; i:coil/T2/$70/preview-rejected-no-space; i:saw/T2/$59/preview-rejected-no-space; r:saw/T2/$59/preview-rejected-no-space; r:coil/T2/$70/preview-rejected-no-space; r:slinger/T2/$42/preview-rejected-no-space |
| 1 | 11 | 422-422 | 6 | 2 | 3 | 3 | 0 | 0 | yes | i:fist/T2/$54/preview-rejected-no-space; i:slinger/T2/$45/preview-rejected-no-space; i:rocket/T2/$78/preview-rejected-no-space; r:fist/T2/$54/preview-rejected-no-space; r:coil/T2/$75/preview-rejected-no-space; r:slinger/T2/$45/preview-rejected-no-space |
| 1 | 12 | 529-529 | 6 | 2 | 3 | 3 | 0 | 0 | yes | i:coil/T2/$80/preview-rejected-no-space; i:slinger/T2/$48/preview-rejected-no-space; i:saw/T2/$68/preview-rejected-no-space; r:saw/T2/$68/preview-rejected-no-space; r:rocket/T2/$84/preview-rejected-no-space; r:coil/T2/$80/preview-rejected-no-space |
| 1 | 13 | 638-638 | 6 | 2 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$72/preview-rejected-no-space; i:shotgun/T2/$75/preview-rejected-no-space; i:rocket/T2/$89/preview-rejected-no-space; r:fist/T2/$62/preview-rejected-no-space; r:shotgun/T2/$75/preview-rejected-no-space; r:rocket/T2/$89/preview-rejected-no-space |
| 1 | 14 | 765-765 | 6 | 2 | 3 | 3 | 0 | 0 | yes | i:coil/T2/$90/preview-rejected-no-space; i:shotgun/T2/$80/preview-rejected-no-space; i:saw/T2/$76/preview-rejected-no-space; r:coil/T2/$90/preview-rejected-no-space; r:saw/T2/$76/preview-rejected-no-space; r:slinger/T2/$54/preview-rejected-no-space |
| 42 | 1 | 26-1 | 2 | 1 | 0 | 0 | 3 | 3 | no | i:coil/T1/$25/purchased; i:rocket/T1/$26/not-attempted; i:saw/T1/$21/not-attempted; r:coil/T1/$25/legal-unaffordable; r:shotgun/T1/$22/legal-unaffordable; r:fist/T1/$18/legal-unaffordable |
| 42 | 2 | 45-0 | 3 | 2 | 0 | 0 | 3 | 3 | no | i:fist/T1/$22/not-attempted; i:saw/T1/$26/not-attempted; i:shotgun/T1/$27/purchased; r:shotgun/T1/$27/legal-unaffordable; r:fist/T1/$22/legal-unaffordable; r:slinger/T1/$18/purchased |
| 42 | 3 | 50-3 | 5 | 2 | 0 | 0 | 2 | 3 | no | i:slinger/T2/$21/purchased; i:fist/T1/$26/purchased; i:coil/T1/$35/not-attempted; r:fist/T1/$26/legal-unaffordable; r:coil/T1/$35/legal-unaffordable; r:rocket/T1/$37/legal-unaffordable |
| 42 | 4 | 63-5 | 5 | 3 | 0 | 0 | 2 | 3 | no | i:shotgun/T1/$36/not-attempted; i:slinger/T2/$24/purchased; i:saw/T1/$34/purchased; r:fist/T1/$29/legal-unaffordable; r:rocket/T1/$42/legal-unaffordable; r:shotgun/T1/$36/legal-unaffordable |
| 42 | 5 | 84-4 | 6 | 3 | 0 | 2 | 2 | 1 | no | i:fist/T1/$33/purchased; i:rocket/T1/$47/purchased; i:slinger/T3/$27/not-attempted; r:fist/T2/$33/unaffordable-preview-rejected-no-space; r:shotgun/T1/$40/legal-unaffordable; r:slinger/T3/$27/unaffordable-preview-rejected-no-space |
| 42 | 6 | 90-4 | 6 | 3 | 1 | 1 | 2 | 2 | no | i:shotgun/T1/$44/purchased; i:coil/T1/$50/not-attempted; i:slinger/T3/$30/preview-rejected-no-space; r:coil/T1/$50/legal-unaffordable; r:slinger/T3/$30/preview-rejected-no-space; r:saw/T1/$42/purchased |
| 42 | 7 | 91-36 | 6 | 3 | 2 | 2 | 1 | 1 | no | i:saw/T2/$47/preview-rejected-no-space; i:slinger/T3/$33/preview-rejected-no-space; i:coil/T1/$55/purchased; r:fist/T2/$40/unaffordable-preview-rejected-no-space; r:shotgun/T2/$49/unaffordable-preview-rejected-no-space; r:rocket/T1/$58/legal-unaffordable |
| 42 | 8 | 133-133 | 6 | 3 | 3 | 3 | 0 | 0 | no | i:coil/T2/$60/preview-rejected-no-space; i:shotgun/T2/$53/preview-rejected-no-space; i:fist/T2/$44/preview-rejected-no-space; r:saw/T2/$51/preview-rejected-no-space; r:fist/T2/$44/preview-rejected-no-space; r:coil/T2/$60/preview-rejected-no-space |
| 42 | 9 | 244-176 | 6 | 3 | 3 | 2 | 0 | 1 | no | i:slinger/T3/$39/preview-rejected-no-space; i:coil/T2/$65/preview-rejected-no-space; i:fist/T2/$47/preview-rejected-no-space; r:rocket/T1/$68/purchased; r:fist/T2/$47/preview-rejected-no-space; r:shotgun/T2/$58/preview-rejected-no-space |
| 42 | 10 | 350-350 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:coil/T2/$70/preview-rejected-no-space; i:shotgun/T2/$62/preview-rejected-no-space; i:rocket/T2/$73/preview-rejected-no-space; r:coil/T2/$70/preview-rejected-no-space; r:saw/T2/$59/preview-rejected-no-space; r:slinger/T3/$42/preview-rejected-no-space |
| 42 | 11 | 469-469 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$63/preview-rejected-no-space; i:fist/T2/$54/preview-rejected-no-space; i:rocket/T2/$78/preview-rejected-no-space; r:rocket/T2/$78/preview-rejected-no-space; r:coil/T2/$75/preview-rejected-no-space; r:saw/T2/$63/preview-rejected-no-space |
| 42 | 12 | 579-579 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:shotgun/T2/$71/preview-rejected-no-space; i:rocket/T2/$84/preview-rejected-no-space; i:saw/T2/$68/preview-rejected-no-space; r:fist/T2/$58/preview-rejected-no-space; r:rocket/T2/$84/preview-rejected-no-space; r:saw/T2/$68/preview-rejected-no-space |
| 42 | 13 | 701-701 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:rocket/T2/$89/preview-rejected-no-space; i:saw/T2/$72/preview-rejected-no-space; i:slinger/T3/$51/preview-rejected-no-space; r:rocket/T2/$89/preview-rejected-no-space; r:fist/T2/$62/preview-rejected-no-space; r:saw/T2/$72/preview-rejected-no-space |
| 42 | 14 | 846-846 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:rocket/T2/$94/preview-rejected-no-space; i:shotgun/T2/$80/preview-rejected-no-space; i:slinger/T3/$54/preview-rejected-no-space; r:fist/T2/$65/preview-rejected-no-space; r:rocket/T2/$94/preview-rejected-no-space; r:shotgun/T2/$80/preview-rejected-no-space |
| 145 | 1 | 26-1 | 2 | 1 | 0 | 0 | 3 | 3 | no | i:saw/T1/$21/not-attempted; i:coil/T1/$25/purchased; i:fist/T1/$18/not-attempted; r:coil/T1/$25/legal-unaffordable; r:slinger/T1/$15/legal-unaffordable; r:saw/T1/$21/legal-unaffordable |
| 145 | 2 | 46-1 | 3 | 2 | 0 | 0 | 3 | 2 | no | i:saw/T1/$26/not-attempted; i:slinger/T1/$18/purchased; i:shotgun/T1/$27/purchased; r:coil/T1/$30/legal-unaffordable; r:rocket/T1/$32/legal-unaffordable; r:slinger/T2/$18/legal-unaffordable |
| 145 | 3 | 52-5 | 5 | 2 | 0 | 0 | 2 | 3 | no | i:coil/T1/$35/not-attempted; i:slinger/T2/$21/purchased; i:fist/T1/$26/purchased; r:fist/T1/$26/legal-unaffordable; r:shotgun/T1/$31/legal-unaffordable; r:rocket/T1/$37/legal-unaffordable |
| 145 | 4 | 71-8 | 6 | 2 | 0 | 1 | 3 | 3 | no | i:saw/T1/$34/purchased; i:coil/T1/$40/not-attempted; i:fist/T1/$29/purchased; r:coil/T1/$40/legal-unaffordable; r:rocket/T1/$42/unaffordable-preview-rejected-no-space; r:shotgun/T1/$36/legal-unaffordable |
| 145 | 5 | 85-18 | 5 | 3 | 1 | 0 | 2 | 2 | no | i:shotgun/T1/$40/purchased; i:rocket/T1/$47/preview-rejected-no-space; i:slinger/T2/$27/purchased; r:rocket/T1/$47/legal-unaffordable; r:coil/T1/$45/legal-unaffordable; r:shotgun/T2/$40/legal-unaffordable |
| 145 | 6 | 98-4 | 6 | 3 | 0 | 3 | 3 | 0 | no | i:rocket/T1/$52/purchased; i:saw/T1/$42/purchased; i:coil/T1/$50/not-attempted; r:slinger/T3/$30/unaffordable-preview-rejected-no-space; r:saw/T2/$42/unaffordable-preview-rejected-no-space; r:fist/T2/$36/unaffordable-preview-rejected-no-space |
| 145 | 7 | 92-37 | 6 | 3 | 1 | 2 | 2 | 1 | no | i:rocket/T1/$58/not-attempted; i:coil/T1/$55/purchased; i:slinger/T3/$33/preview-rejected-no-space; r:fist/T2/$40/unaffordable-preview-rejected-no-space; r:rocket/T1/$58/legal-unaffordable; r:slinger/T3/$33/preview-rejected-no-space |
| 145 | 8 | 135-135 | 6 | 3 | 3 | 3 | 0 | 0 | no | i:shotgun/T2/$53/preview-rejected-no-space; i:fist/T2/$44/preview-rejected-no-space; i:saw/T2/$51/preview-rejected-no-space; r:slinger/T3/$36/preview-rejected-no-space; r:shotgun/T2/$53/preview-rejected-no-space; r:fist/T2/$44/preview-rejected-no-space |
| 145 | 9 | 246-178 | 6 | 3 | 2 | 3 | 1 | 0 | no | i:rocket/T1/$68/purchased; i:fist/T2/$47/preview-rejected-no-space; i:shotgun/T2/$58/preview-rejected-no-space; r:slinger/T3/$39/preview-rejected-no-space; r:fist/T2/$47/preview-rejected-no-space; r:saw/T2/$55/preview-rejected-no-space |
| 145 | 10 | 376-376 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:fist/T2/$51/preview-rejected-no-space; i:shotgun/T2/$62/preview-rejected-no-space; i:rocket/T2/$73/preview-rejected-no-space; r:rocket/T2/$73/preview-rejected-no-space; r:coil/T2/$70/preview-rejected-no-space; r:saw/T2/$59/preview-rejected-no-space |
| 145 | 11 | 493-493 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:rocket/T2/$78/preview-rejected-no-space; i:fist/T2/$54/preview-rejected-no-space; i:slinger/T3/$45/preview-rejected-no-space; r:saw/T2/$63/preview-rejected-no-space; r:fist/T2/$54/preview-rejected-no-space; r:coil/T2/$75/preview-rejected-no-space |
| 145 | 12 | 597-597 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$68/preview-rejected-no-space; i:shotgun/T2/$71/preview-rejected-no-space; i:coil/T2/$80/preview-rejected-no-space; r:saw/T2/$68/preview-rejected-no-space; r:slinger/T3/$48/preview-rejected-no-space; r:fist/T2/$58/preview-rejected-no-space |
| 145 | 13 | 716-716 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$72/preview-rejected-no-space; i:coil/T2/$85/preview-rejected-no-space; i:rocket/T2/$89/preview-rejected-no-space; r:slinger/T3/$51/preview-rejected-no-space; r:coil/T2/$85/preview-rejected-no-space; r:shotgun/T2/$75/preview-rejected-no-space |
| 145 | 14 | 849-849 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:slinger/T3/$54/preview-rejected-no-space; i:shotgun/T2/$80/preview-rejected-no-space; i:rocket/T2/$94/preview-rejected-no-space; r:fist/T2/$65/preview-rejected-no-space; r:rocket/T2/$94/preview-rejected-no-space; r:coil/T2/$90/preview-rejected-no-space |
| 145 | 15 | 1106-1106 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$80/preview-rejected-no-space; i:fist/T2/$69/preview-rejected-no-space; i:slinger/T3/$57/preview-rejected-no-space; r:coil/T2/$95/preview-rejected-no-space; r:fist/T2/$69/preview-rejected-no-space; r:slinger/T3/$57/preview-rejected-no-space |
| 145 | 16 | 1232-1232 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:shotgun/T2/$88/preview-rejected-no-space; i:saw/T2/$84/preview-rejected-no-space; i:coil/T2/$100/preview-rejected-no-space; r:saw/T2/$84/preview-rejected-no-space; r:slinger/T3/$60/preview-rejected-no-space; r:rocket/T2/$104/preview-rejected-no-space |
| 145 | 17 | 1351-1351 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:fist/T2/$76/preview-rejected-no-space; i:coil/T2/$105/preview-rejected-no-space; i:slinger/T3/$63/preview-rejected-no-space; r:slinger/T3/$63/preview-rejected-no-space; r:saw/T2/$89/preview-rejected-no-space; r:fist/T2/$76/preview-rejected-no-space |
| 145 | 18 | 1493-1493 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$93/preview-rejected-no-space; i:fist/T2/$80/preview-rejected-no-space; i:slinger/T3/$66/preview-rejected-no-space; r:slinger/T3/$66/preview-rejected-no-space; r:saw/T2/$93/preview-rejected-no-space; r:coil/T2/$110/preview-rejected-no-space |
| 145 | 19 | 1656-1656 | 6 | 3 | 3 | 3 | 0 | 0 | yes | i:saw/T2/$97/preview-rejected-no-space; i:coil/T2/$115/preview-rejected-no-space; i:rocket/T2/$120/preview-rejected-no-space; r:slinger/T3/$69/preview-rejected-no-space; r:fist/T2/$83/preview-rejected-no-space; r:saw/T2/$97/preview-rejected-no-space |

Weapon-only finished with six Tier-II guns on seed 1 and five Tier-II plus one
Tier-III gun on seeds 42/145; none reached Tier-IV. Under the no-sales policy,
six occupied slots with every gun at Tier II or higher cannot admit a Tier-I
weapon because no Tier-I merge is possible and no slot is free. Rows with no
Tier-I offer cannot supply the missing partner regardless of cash or future
luck. Seed 1's later rows contained no Tier-I helper.
This is an observed full-slot / no-Tier-I-partner condition, not proof of wallet
scarcity or a failed DPS check. Whether to add sales or partner selection is a
later design decision; no production or balance change is made here.

## Results

4/21 runs won. These are fixed samples, not a
win-rate estimate.

| terminal outcome | runs |
| --- | ---: |
| lost-deadline | 15 |
| lost-hp | 2 |
| won | 4 |

| cohort | wins | reached waves | avg item copies | avg earned | avg ending cash | avg spent | accepted rerolls | boss encounters | sampled boss damage lower bound |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| weapon-only | 0/3 | 15, 15, 20 | 0 | 1677 | 1225.666667 | 451.333333 | 47 | 9 | 12264.92 |
| scattered | 2/3 | 7, 20, 20 | 35.333333 | 1513 | 207.333333 | 1305.666667 | 44 | 9 | 23469.585 |
| speed | 0/3 | 20, 20, 5 | 6.333333 | 1797 | 1309.666667 | 487.333333 | 42 | 9 | 16734.96 |
| chain | 0/3 | 5, 20, 20 | 5.333333 | 1880.666667 | 1390.333333 | 490.333333 | 42 | 9 | 17846.78 |
| hp-contact | 0/3 | 5, 15, 5 | 4.333333 | 588.333333 | 293.333333 | 295 | 22 | 5 | 3728.28 |
| item-amplified-firepower | 0/3 | 15, 20, 20 | 10.333333 | 2360 | 1610.666667 | 749.333333 | 52 | 11 | 21937.9125 |
| pickup-feedback | 2/3 | 20, 20, 20 | 6 | 2043 | 1431.666667 | 611.333333 | 57 | 12 | 33031.14 |

| cohort | seed | terminal outcome | W | end time | deadline | kills | HP | rerolls | earned | spent | ending cash | missing core |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| weapon-only | 1 | lost-deadline | 15 | 60.017 | 60 | 3207 | 12/14 | 14 | 1329 | 426 | 903 | - |
| weapon-only | 42 | lost-deadline | 15 | 60.017 | 60 | 3425 | 7/12 | 14 | 1478 | 464 | 1014 | - |
| weapon-only | 145 | lost-hp | 20 | 45.150 | 90 | 5179 | 0/16 | 19 | 2224 | 464 | 1760 | - |
| scattered | 1 | lost-hp | 7 | 25.283 | 30 | 593 | 0/15 | 6 | 201 | 151 | 50 | - |
| scattered | 42 | won | 20 | 82.167 | 90 | 6067 | 15/17 | 19 | 2098 | 1755 | 343 | - |
| scattered | 145 | won | 20 | 75.017 | 90 | 6243 | 21/21 | 19 | 2240 | 2011 | 229 | - |
| speed | 1 | lost-deadline | 20 | 90.017 | 90 | 6042 | 3/12 | 19 | 2628 | 695 | 1933 | - |
| speed | 42 | lost-deadline | 20 | 90.017 | 90 | 5992 | 2/11 | 19 | 2513 | 615 | 1898 | - |
| speed | 145 | lost-deadline | 5 | 43.017 | 43 | 566 | 11/11 | 4 | 250 | 152 | 98 | milestone |
| chain | 1 | lost-deadline | 5 | 43.017 | 43 | 495 | 13/13 | 4 | 195 | 110 | 85 | volatile-trash |
| chain | 42 | lost-deadline | 20 | 90.017 | 90 | 6312 | 10/13 | 19 | 2745 | 751 | 1994 | - |
| chain | 145 | lost-deadline | 20 | 90.017 | 90 | 6222 | 16/17 | 19 | 2702 | 610 | 2092 | - |
| hp-contact | 1 | lost-deadline | 5 | 43.017 | 43 | 510 | 14/14 | 4 | 207 | 126 | 81 | - |
| hp-contact | 42 | lost-deadline | 15 | 60.017 | 60 | 3292 | 10/20 | 14 | 1351 | 630 | 721 | - |
| hp-contact | 145 | lost-deadline | 5 | 43.017 | 43 | 507 | 15/16 | 4 | 207 | 129 | 78 | - |
| item-amplified-firepower | 1 | lost-deadline | 15 | 60.017 | 60 | 3525 | 16/16 | 14 | 1478 | 665 | 813 | twin-trigger |
| item-amplified-firepower | 42 | lost-deadline | 20 | 90.017 | 90 | 6339 | 12/13 | 19 | 2823 | 888 | 1935 | - |
| item-amplified-firepower | 145 | lost-deadline | 20 | 90.017 | 90 | 6384 | 15/16 | 19 | 2779 | 695 | 2084 | - |
| pickup-feedback | 1 | won | 20 | 82.800 | 90 | 5997 | 13/15 | 19 | 1926 | 714 | 1212 | - |
| pickup-feedback | 42 | lost-deadline | 20 | 90.017 | 90 | 6313 | 12/13 | 19 | 2019 | 611 | 1408 | - |
| pickup-feedback | 145 | won | 20 | 88.650 | 90 | 6235 | 15/16 | 19 | 2184 | 509 | 1675 | - |

## Findings and boundaries

- All 15 positive-HP losses crossed the real boss-wave deadline
  (`duration + 15 s`) with no boss kill. They are classified as deadline losses,
  not deaths during boss spawn. Weapon-only seed 1 lost W15 at 60.016667 s with
  HP 12/14 and no boss kill.
- Item-acquisition runs commonly exhausted useful affordable offers early and
  accumulated cash later. Ending cash alone is not proof of scarcity; the report
  retains per-rest cash, offer rows, transactions, rerolls and acquisitions.
- Scattered seed 42/145 acquired most legal items and won. This proves only that
  this acquisition policy can produce wins on those seeds; it does not prove a
  coordinated route or item-led damage attribution.
- Boss windows distinguish not encountered, encountered without observed damage,
  observed damage and killed. Deadline losses are not labelled failed DPS merely
  because the boss wave ended.
- Boss damage is a sampled lower bound, not exact actual damage.
  `lastLiveObservedHp` can remain positive on a win because the terminal zero
  occurred after the sample; `actualBossKilledFlag` is the separate game-owned
  result. No synthetic death sample or exact final-hit/source claim is made.
- The public action APIs used are real: `claimCoreReward`,
  `claimPendingItem`, `chooseStatReward`, `skipReward`, the shop methods and
  `nextWave`. The first harness attempt failed before cohort completion with
  `TypeError: Cannot read properties of undefined (reading 'everSpawned')`;
  commit `a5997bf` fixed the boss bucket indexing. The failed attempt remains a
  harness failure, distinct from the later successful harness.
- Missing per-hit item damage attribution remains unpatched and reported as
  missing. These are author-run finite simulation diagnostics, not independent
  review, browser play, performance or user acceptance.

## Winning-boss observation detail

| cohort | seed | last live sampled HP | sampled damage lower bound | actual boss killed flag | boss max HP |
| --- | ---: | ---: | ---: | --- | ---: |
| scattered | 42 | 101.56000000000054 | 6298.439999999993 | yes | 6400 |
| scattered | 145 | 4.454999999996858 | 6395.54500000001 | yes | 6400 |
| pickup-feedback | 1 | 24.47999999999216 | 6375.520000000017 | yes | 6400 |
| pickup-feedback | 145 | 13.679999999991196 | 6386.320000000017 | yes | 6400 |

Positive last-live HP does not mean the run won with the boss alive. It means the
later killing event was not sampled as a live HP observation.

## Attribution boundary

The production source exposes projectile/item metadata and damage-source
parameters, but no per-hit source ledger. A win, item count or cohort difference
does not prove item-led actual damage. A bounded observer would need a separate
approved instrumentation change; none is made here.
