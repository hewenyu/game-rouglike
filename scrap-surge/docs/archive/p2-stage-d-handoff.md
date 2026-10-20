# P2 Stage D audiovisual handoff

Stage D connects the Stage B elite, chest, trail and item state to expedition
rendering and audio. It is an implementation checkpoint based on
`b0a8f1499083f9336a80e2bee338a94c8f963e2f`, not a balance result, visual
acceptance, user acceptance or independent review.

## Correction to Stage C

At `b0a8f14`, elite and chest values existed in the simulation, but the renderer
had no actual presentation path for them. Stage C's handoff wording could be read
as claiming that path already existed. Stage D creates it through an optional
expedition presentation object and leaves the normal SLICE call path unchanged.
Stage C's reused audio identities are likewise superseded by the new elite,
chest and item-purchase cues in this stage.

## What changed

- `src/render.ts` now accepts optional `ExpeditionPresentation` data. It draws the
  real elite position/HP with hazard fins, marker and HP bar; the pre-spawn warning
  banner; physical chests at `chestRenderData` coordinates; real S3 trail points at
  their actual radius/lifetime; the H3 radius; pressure and pickup/item cues; and
  the profile-driven saw orbit radius.
- Enemy bullets still draw last, above player bullets, world FX, blast cores and
  chain text. The frozen default enemy draw hash remains
  `4ba5006bbeb0835ae7fc1d9ce8deecf1f41926250d2303ebfe1be15e02d80abf`.
- `src/audio.ts` adds distinct elite, chest and item-purchase synthesis, with
  short per-identity voice caps. Item purchases no longer layer the legacy
  weapon-buy chime beneath their cue. Mute and global voice limiting are retained.
- `src/main.ts` exposes read-only elite warning, wave stats, chest and trail data
  through `window.scrapMetrics`, builds the renderer presentation from existing
  state, and calls the elite cue once when a warning state first appears. The
  simulation currently declares but does not emit an `elite` event, so this
  presentation edge is the explicit routing point.

## Files

- `src/render.ts`
- `src/audio.ts`
- `src/main.ts`
- `tests/render-p2-visuals.test.ts`
- `tests/audio-p2.test.ts`
- `tests/browser-p2-visuals.mjs`
- `docs/testing.md`
- `docs/archive/p2-stage-d-handoff.md`
- `memory/status.md`
- `README.md`

`package.json`, `src/sim.ts`, `src/items.ts`, `src/expedition.ts` and
`src/data.ts` are intentionally unchanged.

## Evidence

| Check                                 | Result                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| Unit suite                            | **166/166**                                                        |
| Production build                      | **clean**                                                          |
| `git diff --check`                    | **clean**                                                          |
| Existing `tests/browser-p2-items.mjs` | **2/2**, keyboard and CDP touch                                    |
| `tests/browser-p2-visuals.mjs`        | **2/2**, keyboard and CDP touch                                    |
| W3 elite                              | natural spawn, `maxHp 360`, `radius 28`, natural defeat            |
| W3 chest                              | physical elite chest observed, collected, frozen at rest, claimed  |
| W3 rest                               | two available chest choices                                        |
| Page errors                           | **0** in successful browser runs                                   |
| Frozen enemy draw hash                | `4ba5006bbeb0835ae7fc1d9ce8deecf1f41926250d2303ebfe1be15e02d80abf` |

The existing item report is `/tmp/p2-stage-d-existing/report.json`. The final
source visual report is `/tmp/p2-stage-d-final-visuals/report.json` (SHA-256
`f58178346d3b40adc4c81eabb089663265ed3f89a8d651863682f2edbc27de19`); the
earlier authoritative Stage D visual report is
`/tmp/p2-stage-d-visuals/report.json`.
Screenshots include `keyboard-w3-elite-warning-desktop.png`,
`keyboard-w3-elite-live-desktop.png`, `keyboard-w3-chest-live-desktop.png`,
`keyboard-w3-chest-choice.png`, and touch equivalents. Both visual runs used
ordinary keyboard or real CDP touch, with no state, HP, clock or invulnerability
injection.

The natural milestone seed `2` proof is
`/tmp/p2-stage-d-trail3/report.json`: desktop completed with **404 real trail
observations**, and the screenshot is
`/tmp/p2-stage-d-trail3/keyboard-w3-trail-desktop.png`. The touch attempt failed
at W1 because `.reward-row` disappeared during a fixture race; no two-mode
real-trail claim is made.

## Known gaps

- The browser runs were headless. They prove routing and observable timing, not
  audible quality, mix balance or visual acceptance.
- Only the desktop natural milestone run proves real trail rendering in browser
  execution; the paired touch attempt hit a fixture race.
- The elite warning cue is plumbed in presentation code, but no DOM-level unit
  harness directly asserts that call. `tests/audio-p2.test.ts` proves the cue
  identity, not audible perception.
- No ordinary-input W20 victory, W16-W20 performance, cohort balance, five-route
  viability, late item-led output, physical-device performance or user-feel claim
  follows.
- Independent review of this frozen commit remains required.

## Reproduction

```sh
npm test
npm run build
BASE_URL=http://127.0.0.1:4192 \
  OUTPUT_DIR=/tmp/p2-stage-d-existing \
  node tests/browser-p2-items.mjs
BASE_URL=http://127.0.0.1:4192 \
  OUTPUT_DIR=/tmp/p2-stage-d-visuals \
  node tests/browser-p2-visuals.mjs
```

The fixture uses ordinary keyboard/touch input and read-only
`window.scrapMetrics`/DOM data; it does not inject combat state, HP, timers or
invulnerability.
