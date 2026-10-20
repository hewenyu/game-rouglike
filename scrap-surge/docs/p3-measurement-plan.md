# P3A measurement plan (preregistered)

Status: preregistered before the first P3A cohort run and followed by the recorded
measurement below. This is simulation evidence, not browser play, human victory
or route viability. Production source is frozen at
`447af109d4a07d218ae33466c75bc5b1266b092c`; preregistration checkpoint is
`6ba784466e9a3f814a8fb4700438c44f3825d633`.

## Consent and scope

Astra, actual fresh Opus `p2_opus_preview_final_once` and independent DeepSeek
`p2_ds_preview_final_once` explicitly approved the amended P3A and bounded P2 at
`6ba7844`. P2's accepted scope is 173 tests, clean build and the ordinary
keyboard/CDP-touch W1 shop-before-reward projection through the W2 item purchase.
P3 plan consent is explicit; P2 user acceptance was not given. Full W20 browser
play, five-route late viability, rendered performance, audio/mobile/Safari and
user feel remain open gates.

P3A changes only diagnostics under `tests/`, package scripts and documentation.
It does not change `src/`, tuning, HP, waves, renderer, audio, dependencies or
the public game rules. Missing action APIs must be reported, never patched into
source.

## Finite design

- Mode: real `new Game(seed, "expedition20")`.
- Cohorts: weapon-only, scattered/uncurated, speed, chain, HP/contact,
  item-amplified firepower and pickup feedback.
- Seeds: `1`, `42`, `145`. These 21 runs are fixed diagnostic samples, not a
  win-rate estimate.
- Timestep: fixed `1 / 60`; no clock jumps and no renders.
- Movement: `tests/p3-driver.ts`, hashed once and used unchanged for all seven
  primary cohorts. It reads current player/enemy/bullet/scrap/chest state and
  returns step input only.
- Boss HP: sample at first observation and every 6 steps (`0.1 s`) while the
  real boss exists. Record positive HP decreases only.
- Per-wave step cap:
  `(duration + boss overtime allowance + 1 s sweep + 1 s harness margin) * 60`.
  Boss waves add 15 s; non-boss waves add 0 s. The per-wave caps in
  `tests/p3-policy.ts` are authoritative:
  `1320, 1440, 1560, 1680, 2700, 1800, 1920, 1920, 2040, 3420, 2040, 2160,
  2160, 2280, 3720, 2400, 2400, 2520, 2520, 5520`.
- Whole-run step cap: the sum of those per-wave caps, `47520`. It is a harness
  timeout, never a changed game deadline.
- No injection: no HP, wallet, inventory, enemies, RNG, timers or success.
- All purchases and claims use public APIs. All failures remain in the report.

## Acquisition policies

Every cohort shares the same weapon preference and stat reward priority:

- Weapons: slinger, shotgun, coil, rocket, saw, fist. Prefer an unowned type;
  otherwise prefer the lowest current tier. Keep buying legal affordable offers
  until the current row has none.
- Stats: `hpFlat`, `damage`, `power`, `as`, `move`, `pickup`.
- Cash reserve: zero. Never sell. Free reward first, then stat, then useful
  affordable items, then weapons.
- Rerolls: at most one per rest, only after the initial rows are exhausted and
  no useful legal affordable item remains. Pay the game's actual current price.
  Exhaust useful affordable rows after a successful reroll; never reroll twice
  at the same rest. A rejected reroll stops that rest.

Per-rest item and weapon budgets are the natural finite offer rows plus at most
one shared reroll. There is no artificial one-purchase throttle.

Cohort item priorities and deliberate exclusions:

| Cohort | Core priority | Paid-item priority | Exclusions |
| --- | --- | --- | --- |
| weapon-only | none | none | all items and chests declined |
| scattered | first legal | first legal offer | none beyond legality |
| speed | milestone | worn-sandals, surfboard, tailwind-coil, milestone | none |
| chain | volatile-trash | volatile-trash, wedge-ring, big-bang, short-fuse | none |
| HP/contact | none | thick-shell, undertow-board, spike-shell, pressure-valve | none |
| item-amplified firepower | twin-trigger | scrap-powder, long-barrel, bent-nail, twin-trigger | short-fuse excluded |
| pickup feedback | magnetic-return, then scrap-popcorn | magnetic-return, scrap-popcorn, hooked-tip, siphon-bag | none |

`short-fuse` is excluded from firepower: without a chain proc its weapon-damage
penalty makes the purchase deliberately harmful. It remains a legal chain
support item. Acquisition labels are policy descriptions, not proof that a
route formed or caused damage.

## Required evidence

Each run records source SHA, report-source manifest hash, policy hash, driver
hash and harness hash, plus:

- per-wave kills, combat time, spawns, actual accepted/rejected shots, popcorn
  admitted/rejected shots, event counts, queue deltas and queue end counters;
- pickup/fuel totals and per-wave bullet-count peak (sampled from live bullets,
  not inferred from the historical maximum);
- boss first spawn/observation time and HP, engagement window, positive-HP-drop
  samples, observed damage, last HP, kill/survival and encounter classification;
- start/end wallet, income, raw generated cash, spend split, refunds, rerolls,
  useful affordable offers, six-slot/tier progression and inventory;
- health, items acquired with wave/source, missing core/support and terminal
  outcome/cause;
- actual combat events, enemy output and end-of-wave queue saturation.

The public API does not expose a per-hit damage-source ledger. Item-led actual
damage attribution is therefore **missing**, and a win alone never proves it.

Terminal cause follows the game's actual rule: a boss wave lost with positive HP
after crossing `duration + 15 s`, without a boss kill, is a deadline loss. A
non-boss or pre-deadline zero-HP terminal is an HP loss. Boss-wave proximity alone
is not called "during boss spawn", and a boss that was not encountered is not a
failed DPS check.

## Preregistered checks

1. Run exactly the 21 fixed cohort/seed pairs in listed order.
2. Run one separate weapon-only/seed-1 deterministic replay and compare the
   canonical complete run records and hashes.
3. Assert `git diff 447af10..HEAD -- src` is empty and the production source
   manifest stays unchanged during the batch.
4. Assert no negative wallet/HP, no HP revival after zero, item caps, legal
   purchases, non-negative queue counters and per-rest cash conservation.
5. Preserve any failure; no strategy iteration and no redefined success.

The first harness attempt failed before any cohort completed with
`TypeError: Cannot read properties of undefined (reading 'everSpawned')` from
incorrect boss-bucket indexing. Commit
`a5997bf` (`test(p3): fix boss bucket indexing before first run`) fixed only the
harness, after which the frozen policy and driver were run once. The failed
attempt remains recorded and is not treated as a cohort result.

## Outputs

- `docs/data/p3-measurement/report.json`: concise machine report and policy.
- `docs/data/p3-measurement/provenance.json`: hashes and artifact locations.
- `docs/data/p3-measurement/report.md`: human-readable bounded summary.
- Detailed trace in `/tmp/scrap-p3-measurement-447af10/runs.jsonl`, with its
  path and SHA-256 recorded in tracked provenance.

The batch does not establish normal-input W20 victory, user play, route
viability, render performance, phone/Safari support, audio mix or acceptance.

## Recorded batch

The original successful harness is the committed `a5997bf` version, SHA-256
`11456c85c3f0b7f50a47951c6c0214fbaaa218ab43b63bcb466d4a0208b1635d`.
It produced 21 primary runs plus one deterministic weapon-only/seed-1 replay;
the replay matched the complete canonical record. All 21 primary runs completed
without harness integrity failures or step-cap termination. The v2
observation-only harness SHA-256 is
`a1f43dd42131fbfffbd2ff8b7dce2e542973ca7a62d3a8d85d0e9dcc1c4dad43`; its fresh
trace is `docs/data/p3-measurement-v2/generated/artifacts/runs.jsonl` (SHA-256
`ee531e7d8516f7cffbd8cd7575e9cfd67bb646f99e66649f08082dbaf87b6c1e`). No policy
or driver byte changed.

Primary outcome: 4 won and 17 lost. Of the losses, 15 are deadline losses
(positive HP at the boss-wave `duration + 15 s` limit, boss not killed) and two
are zero-HP losses (weapon-only seed 145 and scattered seed 1).

Weapon-only finished with six Tier-II guns on seed 1 and five Tier-II plus one
Tier-III gun on seeds 42/145. It did not reach Tier-IV. Seed 1 had six occupied
slots, 153-765 cash across the W9-W14 rests, and **14 accepted/free rerolls
across 14 rests**. The earlier "no accepted rerolls" claim is a preserved v1
reporting error; the corrected all-run total is 306 accepted rerolls, all free.
Of 129 rest endings with six occupied slots and every gun at Tier II or higher,
115 had no Tier-I offer in either row. In those states a different-ID Tier-I
weapon cannot merge and has no empty slot. The other 14 such rests contained 20
Tier-I offers, and all 20 were purchased after an earlier compatible purchase
freed a slot. The 115 rows with no Tier-I helper remain the observed
full-slot / missing partner condition under the no-sales policy, not evidence of
wallet scarcity or a failed DPS check. Adding a sale or partner-selection policy
is a later three-party design question, not a current data repair or production
change.

Item-acquisition cohorts commonly spent useful affordable offers early and held
cash later. Ending cash alone is not proof of scarcity; the report retains
per-rest cash, offers, transactions, rerolls, acquisitions and boss windows.
Route labels are acquisition-policy labels, not proof that a route formed or
caused output. Scattered wins on seeds 42/145 do not establish coordinated route
viability, and no run establishes item-led actual damage attribution.
