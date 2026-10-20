# P3A natural-simulation measurement

Status: finite diagnostic evidence; not pass-by-definition, browser play, human
victory, route viability, performance or user acceptance.

Source is frozen at `447af109d4a07d218ae33466c75bc5b1266b092c`; preregistration checkpoint was
`6ba784466e9a3f814a8fb4700438c44f3825d633`. The 21 fixed cohort/seed runs use the same hashed
driver and policy for every cohort. A separate weapon-only/seed-1 replay matched
the complete run record exactly.

## Provenance

- policy SHA-256: `e78ef5512c0a968bde0ebe080f4532bd78cfaf7c0ff08468d2f21de6640e2353`
- driver SHA-256: `e5c398e9658bfc014014c753e2682fcf9e6fabe8019247ddef148ef530a7d202`
- harness SHA-256: `11456c85c3f0b7f50a47951c6c0214fbaaa218ab43b63bcb466d4a0208b1635d`
- production source manifest: `7ba343896f610d805e462c877babc99bc8e44478fb355727f72c8b81a5bc3a92`
- external detail trace: `/tmp/scrap-p3-measurement-447af10/runs.jsonl` (`6df30a864a262b0e858c2d826b18600d22df59eaa03feff90d41d819519f8bc2`)
- tracked compact report SHA-256: `8cd1eabe81f70d132c6edca8b0346cf439321dc5e8fc6e85993b4003ed3cbbbe`

## Results

4/21 runs won. These are fixed samples, not a win-rate estimate.

| terminal outcome | runs |
| --- | ---: |
| lost-deadline | 15 |
| lost-hp | 2 |
| won | 4 |

| cohort | wins | reached waves | avg item copies | avg earned | avg ending cash | avg spent | boss encounters | sampled boss damage lower bound |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| weapon-only | 0/3 | 15, 15, 20 | 0 | 1677 | 1225.666667 | 451.333333 | 9 | 12264.92 |
| scattered | 2/3 | 7, 20, 20 | 35.333333 | 1513 | 207.333333 | 1305.666667 | 9 | 23469.585 |
| speed | 0/3 | 20, 20, 5 | 6.333333 | 1797 | 1309.666667 | 487.333333 | 9 | 16734.96 |
| chain | 0/3 | 5, 20, 20 | 5.333333 | 1880.666667 | 1390.333333 | 490.333333 | 9 | 17846.78 |
| hp-contact | 0/3 | 5, 15, 5 | 4.333333 | 588.333333 | 293.333333 | 295 | 5 | 3728.28 |
| item-amplified-firepower | 0/3 | 15, 20, 20 | 10.333333 | 2360 | 1610.666667 | 749.333333 | 11 | 21937.9125 |
| pickup-feedback | 2/3 | 20, 20, 20 | 6 | 2043 | 1431.666667 | 611.333333 | 12 | 33031.14 |

| cohort | seed | terminal outcome | W | end time | deadline | kills | HP | earned | spent | ending cash | missing core |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| weapon-only | 1 | lost-deadline | 15 | 60.017 | 60 | 3207 | 12/14 | 1329 | 426 | 903 | - |
| weapon-only | 42 | lost-deadline | 15 | 60.017 | 60 | 3425 | 7/12 | 1478 | 464 | 1014 | - |
| weapon-only | 145 | lost-hp | 20 | 45.150 | 90 | 5179 | 0/16 | 2224 | 464 | 1760 | - |
| scattered | 1 | lost-hp | 7 | 25.283 | 30 | 593 | 0/15 | 201 | 151 | 50 | - |
| scattered | 42 | won | 20 | 82.167 | 90 | 6067 | 15/17 | 2098 | 1755 | 343 | - |
| scattered | 145 | won | 20 | 75.017 | 90 | 6243 | 21/21 | 2240 | 2011 | 229 | - |
| speed | 1 | lost-deadline | 20 | 90.017 | 90 | 6042 | 3/12 | 2628 | 695 | 1933 | - |
| speed | 42 | lost-deadline | 20 | 90.017 | 90 | 5992 | 2/11 | 2513 | 615 | 1898 | - |
| speed | 145 | lost-deadline | 5 | 43.017 | 43 | 566 | 11/11 | 250 | 152 | 98 | milestone |
| chain | 1 | lost-deadline | 5 | 43.017 | 43 | 495 | 13/13 | 195 | 110 | 85 | volatile-trash |
| chain | 42 | lost-deadline | 20 | 90.017 | 90 | 6312 | 10/13 | 2745 | 751 | 1994 | - |
| chain | 145 | lost-deadline | 20 | 90.017 | 90 | 6222 | 16/17 | 2702 | 610 | 2092 | - |
| hp-contact | 1 | lost-deadline | 5 | 43.017 | 43 | 510 | 14/14 | 207 | 126 | 81 | - |
| hp-contact | 42 | lost-deadline | 15 | 60.017 | 60 | 3292 | 10/20 | 1351 | 630 | 721 | - |
| hp-contact | 145 | lost-deadline | 5 | 43.017 | 43 | 507 | 15/16 | 207 | 129 | 78 | - |
| item-amplified-firepower | 1 | lost-deadline | 15 | 60.017 | 60 | 3525 | 16/16 | 1478 | 665 | 813 | twin-trigger |
| item-amplified-firepower | 42 | lost-deadline | 20 | 90.017 | 90 | 6339 | 12/13 | 2823 | 888 | 1935 | - |
| item-amplified-firepower | 145 | lost-deadline | 20 | 90.017 | 90 | 6384 | 15/16 | 2779 | 695 | 2084 | - |
| pickup-feedback | 1 | won | 20 | 82.800 | 90 | 5997 | 13/15 | 1926 | 714 | 1212 | - |
| pickup-feedback | 42 | lost-deadline | 20 | 90.017 | 90 | 6313 | 12/13 | 2019 | 611 | 1408 | - |
| pickup-feedback | 145 | won | 20 | 88.650 | 90 | 6235 | 15/16 | 2184 | 509 | 1675 | - |

## Findings

- All 15 positive-HP losses crossed the real boss-wave deadline
  (`duration + 15 s`) with no boss kill, so they are classified as deadline
  losses rather than deaths during boss spawn. This includes weapon-only seed 1
  at W15 (60.0167 s, HP 12/14, boss not killed).
- Weapon-only finished with six Tier-II guns on seed 1 and five Tier-II plus
  one Tier-III gun on seeds 42/145; none reached Tier-IV. Seed 1 entered the
  W9-W14 rests with six occupied slots, 153-765 cash and 0 accepted rerolls.
  The observed rows offered no useful full-slot partner progression. This is a
  full-slot / missing Tier-I partner purchase bottleneck under the frozen policy,
  not evidence of cash scarcity or a failed Tier-IV DPS check. Whether to add a
  sales or partner-selection policy belongs to a later three-party design gate;
  no production/balance change is made here.
- Item-acquisition runs commonly exhausted useful affordable offers early and
  accumulated cash later. Ending cash alone is not treated as proof of scarcity;
  per-rest cash, spend split, offers and transactions are in the report.
- Scattered seed 42/145 acquired most legal items and won, which proves only
  that this acquisition policy can produce wins on those seeds. It does not
  prove a coordinated route or item-led damage attribution.
- Boss windows distinguish not encountered, encountered without observed
  damage, observed damage and killed. Deadline losses are reported separately
  and are not labelled failed DPS merely because the boss wave ended.
- Boss damage is reported as a **sampled lower bound**, not exact actual damage.
  `lastLiveObservedHp` is the last sampled HP while the boss was alive, so it can
  remain positive on a win because the terminal zero occurred after that sample.
  `actualBossKilledFlag` is the separate game-owned result. The winning W20
  bosses were actually killed even where the last live sample was positive;
  actual cumulative damage is at least their 6400 max HP. No synthetic death
  sample was added, and no exact final hit, overkill or source is claimed.
- The public action APIs used are real: `claimCoreReward`,
  `claimPendingItem`, `chooseStatReward`, `skipReward`, the shop methods and
  `nextWave`. The first harness attempt failed before cohort completion with
  `TypeError: Cannot read properties of undefined (reading 'everSpawned')`;
  commit `a5997bf` fixed the boss bucket indexing, and that failed attempt is
  preserved rather than treated as a cohort result. Missing per-hit item damage
  attribution remains unpatched and reported as missing.

The detailed trace is preserved byte-for-byte, including the successful harness's
raw `terminalReason`. That raw field gave positive-HP boss-wave losses
boss-spawn precedence; this report classifies them from the source deadline rule
instead and keeps `traceTerminalReason` beside the corrected
`terminalOutcome`.

## Winning-boss observation detail

| cohort | seed | last live sampled HP | sampled damage lower bound | actual boss killed flag | boss max HP |
| --- | ---: | ---: | ---: | --- | ---: |
| scattered | 42 | 101.56000000000054 | 6298.439999999993 | yes | 6400 |
| scattered | 145 | 4.454999999996858 | 6395.54500000001 | yes | 6400 |
| pickup-feedback | 1 | 24.47999999999216 | 6375.520000000017 | yes | 6400 |
| pickup-feedback | 145 | 13.679999999991196 | 6386.320000000017 | yes | 6400 |

Positive last-live HP does not mean the run won with the boss alive. It means the
later killing event was not sampled as a live HP observation.

## P2 approval context

P2 was independently checked at committed checkpoint `6ba7844` for the bounded
preview repair only: 173 tests and clean build, plus ordinary keyboard and real
CDP-touch W1 shop-before-reward projection through the W2 item purchase.

- root evidence: 173/build, normal 2/2,
  `/tmp/astra-p2-6ba7844/items/report.json`
- Opus evidence: 173 + normal 2/2, `/tmp/opus-6ba-preview/report.json`
- independent DeepSeek: 173/build + normal 2/2,
  `/tmp/ds-6ba-preview/report.json`,
  SHA-256 `259c119f47084157a1cfe428f88a9d9bf6d6479d6022eaeff4509f1f771d8c82`

P2 user acceptance was not given. Full W20 browser play, five late routes,
render performance, audio/mobile/Safari and user feeling remain gates.

## Attribution boundary

The production source exposes projectile/item metadata and damage-source
parameters, but no per-hit source ledger. A win, item count or cohort difference
does not prove item-led actual damage. A bounded observer would need a later,
separate approved instrumentation change; none is made here.
