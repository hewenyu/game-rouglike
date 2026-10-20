# P2 Stage C handoff

Stage C turns the Stage B simulation surface into a runnable expedition rest
interface. It is an implementation checkpoint, not a balance result, user
acceptance or independent review.

## What changed

- `src/main.ts` now renders separate W1 core, normal stat, frozen chest, weapon,
  item, inventory and owned-weapon sections in the `phase === "shop"` rest panel.
- The 20-item catalog has distinct SVG silhouettes, family labels, rarity text
  and C/U/R frame treatments. Cards list cap or uniqueness, dependencies,
  complete effect text, price/wallet shortfall and a projected central-derived
  delta. The panel also exposes an inventory detail area that does not depend on
  hover.
- Item purchases and reward claims use the existing Stage B methods. The UI does
  not calculate combat values independently: offered and owned weapon profiles
  call `weaponItemModifiers`; F4 projectile counts use `pellets * shots`.
- Offered, reward and chest cards select the same in-panel detail as owned items;
  the per-card detail source is hidden from layout and the mobile detail action is
  wired to the same purchase or claim transaction.
- The top sticky strip and a second control near the top of the panel can start
  the next wave. The footer remains available when the user scrolls through all
  cards and stays in normal document flow on mobile so it cannot obscure them.
- `#overlay.shop-open` lets a long rest page scroll naturally rather than being
  vertically centered. `src/style.css` supplies desktop, tablet and 390px layouts
  with visible controls at least 44 CSS pixels.

## Evidence

| Check | Result |
| --- | --- |
| Unit suite | **156/156** |
| Production build | **clean** |
| `tests/browser-p2-items.mjs`, seed `1` | **2/2** ordinary keyboard and CDP touch |
| W1 natural core | `scrap-popcorn` claimed through the actual reward button |
| W2 real proc | popcorn processed **50** keyboard / **46** touch at the item-rest read |
| W2 natural item | `厚壳` bought for **12**, max HP **10 -> 12**, move factor **1.00 -> 0.96** |
| 390px layout | document/overlay **390/390**, no card overflow |
| Mobile P2 footer | **static**, no overlap over selectable cards |
| P2 rest actions | every visible action at least **44x44** |
| Page errors | **0** |

Artifacts: `/tmp/p2-items-browser/report.json`, with keyboard/touch before and
after screenshots in the same directory. These are author-run artifacts. Runtime
counts vary with real browser timing; the assertions require positive actual
processing, not an exact count.

## Known gaps

- Elite and chest simulation data now have a render/UI presentation path, but this
  checkpoint does not establish aesthetic acceptance for those cues.
- Existing audio event identities are reused; no new item/elite/chest synthesis
  identity or mix acceptance is claimed.
- No ordinary-input W20 victory, W16-W20 performance, physical phone/Safari,
  saturation, cohort balance or item-led late-output claim follows.
- Independent review of the frozen Stage C commit is still required.

## Reproduction

```sh
npm test
npm run build
npm run dev -- --port 4192
BASE_URL=http://127.0.0.1:4192 \
  OUTPUT_DIR=/tmp/p2-items-browser \
  npm run test:browser:p2-items
```

The fixture uses only ordinary keyboard/touch input and read-only
`window.scrapMetrics`/DOM data. It does not inject combat state, HP, timers or
invulnerability.
