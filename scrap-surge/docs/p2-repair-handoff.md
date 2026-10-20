# P2 R1-R5 repair handoff

This is the bounded repair of the frozen `27c3503` Stage D candidate. Astra,
Opus and independent DeepSeek consented to the R1-R5 scope before the repair
writer started; the consent record is in `docs/reviews.md`. The changes do not
alter balance, HP, waves, audio or the frozen slice renderer. This is not P3
balance validation, user acceptance or independent review of the new SHA.

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

## Verification

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
```

The browser fixtures use ordinary keyboard or real CDP touch input and read-only
metrics/DOM data; they inject no combat state, HP, timers or invulnerability.

## Open gates

- Fresh Opus and independent DeepSeek review of the new frozen repair SHA.
- Root integration review on that same SHA.
- Ordinary-input W20 completion, W16-W20 saturation/performance, late
  five-route viability, physical phone/Safari and audio-mix checks.
- User acceptance. No model review substitutes for it.
