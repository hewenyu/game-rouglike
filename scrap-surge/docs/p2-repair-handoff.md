# P2 R1-R5 repair handoff

This handoff has two checkpoints. The first is the bounded repair of frozen
`27c3503`. The second is the explicitly authorized R5 follow-up on `e478497`,
after new Opus and independent DeepSeek reviews found only three preview defects
and passed R1-R4. Both changes avoid balance, HP, waves, audio and the frozen
slice renderer. Neither checkpoint is P3 balance validation, user acceptance or
independent review of its new SHA.

## Scope and changes

- **R1, offers and rerolls:** expedition simulation now generates exactly three
  distinct weapon offers. The shared reroll prevalidates affordability plus a
  legal alternate before RNG or spending, compares offered ID sets rather than
  order, never draws or rewrites stat/core/chest rewards, and uses one
  deterministic weapon-first exact-repeat fallback. Failure is atomic across
  money, streams, rows, purchase state, counters, rewards and events.
- **R2, popcorn units:** combat behavior is unchanged. A fuel unit is consumed
  even when the shared 420-bullet cap rejects one or both shots.
  `popcornFuelConsumed` exposes the consumed-unit scalar, and
  `queueCounters.popcorn.processed` is explicitly documented/tested as consumed
  fuel units. `popcornShotsAdmitted` and `popcornShotsRejected` carry shot-level
  accounting.
- **R3, onboarding:** player-facing title and guide text now describe 19 rests,
  W1 free core choice, three weapons plus three items at each rest, repeatable
  versus unique items, six-slot automatic fusion, real elite chests, better boss
  chest rarity, manual next/skip behavior, and refresh semantics. Obsolete
  wake/ember, automatic-wave and shop-only-guns instructions are removed.
- **R4, mobile and selected detail:** the 390px shop retains three compact cards
  per row with readable title, label and metadata sizes. The full selected
  detail appears immediately after its reward, item or inventory group, with a
  chest-first default. Mobile actions stay at least 44px and the outer rest
  scroll remains the only scroll container.
- **R5, previews and copy:** `itemProcPreview` is a pure helper using the same
  central derived values and constants as combat. The selected card shows its
  own current/projected readout, plus held proc outputs only when the selected
  item changes `powerFactor`. Player copy says `机制强度`, uses live values and
  replaces item codes, `×P`, `F4`, “因果根” and engineering prose.

### Authorized post-`e478497` preview repair

Root, fresh actual Opus task `p2_opus_repaired_review_once` and fresh actual
independent DeepSeek task `p2_ds_repaired_review_once` explicitly agreed that
only three R5 defects remained after R1-R4 passed. The bounded follow-up:

- scopes sold-item suppression to `.shop-item-section`, so a shop purchase at
  index N cannot suppress an independent reward or chest card at index N;
- gives `siphon-bag`'s readout a separate dimensionless `multiplier` field
  (`伤害倍率 ×1.25`) instead of treating it as damage `1.25`/`1.3`;
- removes the repeated selection instruction, leaving one `点选查看效果` per
  card, optionally followed by concrete deltas.

The ordinary-input browser regression is in the repository and covers seed 1:
buy shop index 0 (`siphon-bag`), inspect still-unclaimed reward index 0
(`magnetic-return`), and verify projected `伤害 25`, pickup `194 → 375` and
`伤害倍率 ×1.25` on the siphon card. It does not inject HP, timers, combat state,
invulnerability or cheats. No formula, combat, simulation, renderer, audio, CSS,
balance or dependency change is part of this follow-up.

## Files

- `src/sim.ts`
- `src/items.ts`
- `src/main.ts`
- `src/style.css`
- `tests/p2-sim.test.ts`
- `tests/items.test.ts`
- `tests/browser-p2-items.mjs`
- `tests/browser-p2-visuals.mjs`
- `tests/browser-p2-lifecycle.mjs`
- `package.json`
- `README.md`
- `docs/testing.md`
- `docs/reviews.md`
- `docs/p2-items-contract.md`
- `docs/p2-stage-b-handoff.md`
- `docs/p2-repair-handoff.md`
- `memory/status.md`

## Verification at `e478497`

| Check | Result |
| --- | --- |
| Unit suite | **172/172** |
| Production build | **clean** |
| `git diff --check` | **clean** |
| P2 item fixture | **2/2** keyboard / CDP touch, 0 page errors |
| P2 W3 visual fixture | **2/2** keyboard / CDP touch, 0 page errors |
| P2 lifecycle fixture | **6/6**, one real W3 0 HP loss, one record, retry reset |

Latest actual successful artifacts and SHA-256 hashes are recorded in
`docs/testing.md`. The failed `p2-repair-items-final3` attempt remains on disk
as fixture evidence; it is not relabeled as a pass. Author headless runs are not
independent review and do not establish physical-device, Safari, audio-mix,
performance, late-build, full-W20 or user-feel acceptance.

## Follow-up verification on the new frozen SHA

At the exact follow-up tree, the unit suite passes **173/173**, the production
build is clean and `git diff --check` is clean. The repository browser fixture
passes **2/2** in ordinary keyboard and real CDP touch with zero page errors,
testing the seed-1 same-index shop/reward sequence and then the prior W1/W2
flow. The successful report is `/tmp/ds-e478-r5-final2/report.json` (SHA-256
`c281ca0620b69dc8a424d4a9b7ca256e1796d736e180e371052e9b5dff8f0067`). The earlier
`/tmp/ds-e478-r5-final/report.json` failed on radius display and remains
unrelabeled. Full evidence and boundaries are in `docs/testing.md`.

The repository fixture is the reproducibility source; temporary diagnostics are
evidence only, never runtime dependencies. The 172-test result remains attributed
to `e478497`; this follow-up adds focused unit/browser coverage.

## Reproduction

```sh
npm test
npm run build
BASE_URL=http://127.0.0.1:4194 \
  OUTPUT_DIR=/tmp/p2-repair-items \
  npm run test:browser:p2-items
BASE_URL=http://127.0.0.1:4194 \
  OUTPUT_DIR=/tmp/p2-repair-visuals \
  npm run test:browser:p2-visuals
BASE_URL=http://127.0.0.1:4194 \
  OUTPUT_DIR=/tmp/p2-repair-lifecycle \
  npm run test:browser:p2-lifecycle
BASE_URL=http://127.0.0.1:4194 \
  OUTPUT_DIR=/tmp/p2-preview-follow-up \
  npm run test:browser:p2-items
```

The browser fixtures use ordinary keyboard or real CDP touch input and read-only
metrics/DOM data; they inject no combat state, HP, timers or invulnerability.

## Open gates

- Fresh Opus and independent DeepSeek review of the new frozen follow-up SHA, in
  separate contexts from the author and the prior `e478497` review.
- Root integration review on that same SHA.
- Ordinary-input W20 completion, W16-W20 saturation/performance, late
  five-route viability, physical phone/Safari and audio-mix checks.
- User acceptance. No model review substitutes for it.
