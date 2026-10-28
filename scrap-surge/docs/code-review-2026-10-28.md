# Code review: readability, cohesion/coupling, constants (2026-10-28)

Requested by a playtester through the project bot. Scope: `src/*.ts` at
`b6c9e13` (~8,500 lines). Read-only review plus three behavior-preserving
fixes on branch `claude/code-review-ts-skill`. Companion skill:
`.claude/skills/ts-best-practices/SKILL.md`.

## Size map

| File | Lines | Notes |
| --- | ---: | --- |
| `sim.ts` | 3212 | `Game` class: ~130 public mutable fields, `step()` ~570 lines, `hurt()` ~230, `weapons()` ~165 |
| `render.ts` | 1507 | read-only drawing; palette named at top |
| `main.ts` | 1442 | DOM, HTML-string templates, persistence, `window.scrapMetrics` |
| `items.ts` | 1361 | best-structured module: `as const` ids, frozen tables, pure functions |
| `expedition.ts` | 578 | wave/boss/elite/price tables + formula functions |
| `audio.ts`, `input.ts`, `data.ts`, `math.ts` | <170 each | small, single-purpose |

## What is good

- Layer boundaries hold: `render.ts` uses `Game` only as a type (the import
  could become `import type`) and calls no rule methods; `audio.ts` only consumes `Event`; `input.ts` only yields a `Vec`.
- `items.ts` is the model to copy: ids as `const` arrays with derived union
  types, `Readonly<Record<ItemId, ...>>` tables, `Object.freeze`, pure
  `deriveItemStats` / `itemProcPreview` shared by sim and UI.
- Separate seeded RNG streams for combat, weapon shop, item shop, stats, loot.
- No `any`, no `@ts-ignore` in `src`; `strict` is on.

## Findings

### F1 Duplicated rule numbers in UI (fixed)

The repo's top recurring bug shape (`docs/lessons.md`). Values matched today,
so nothing visible was wrong, but each was one table edit away from drifting:

- `main.ts` expedition shop priced guns with its own
  `Math.ceil((w.price * (g.wave + 4)) / 5)` from `WEAPONS.price`, while the sim
  charges `gunPrice()` from `WEAPON_BASE_PRICE`. Now calls `gunPrice`.
- Stat-reward cards hard-coded `"+6%"`, `"+5%"`, `"+15%"`, `"+8%"`, `"+1"`.
  Now built from `STAT_REWARD_AMOUNTS`.
- Rest screen hard-coded "首领在 5 / 10 / 15 / 20 波；精英在 3 / 7 / 11 / 14 / 17 / 19 波".
  Now built from `BOSS_STAGES` and `ELITE_WAVES`.

Remaining: `WEAPONS[id].price` (`data.ts`) and `WEAPON_BASE_PRICE`
(`expedition.ts`) hold the same six numbers. Decide whether they are meant to
diverge (slice vs expedition); if not, derive one from the other.

### F2 Dead mode branches in `Game.hurt()` (fixed)

After the slice `return`, `hurt()` still tested `mode === "expedition20"`,
used `derived!` and fell back to a literal `10` max HP that could never run.
Simplified to a direct `derivedItemStats()` call. A few further
`derived?.` / `mode === "expedition20" &&` guards below remain redundant.

### F3 `sim.ts` cohesion: one 3,200-line class (open, high)

`Game` mixes rule state, spawning, economy/shop, loot, chain/blast queues,
pickups, boss logic and ~20 read-only instrument counters, all as public
mutable fields. `step()` alone is ~570 lines. There are **88**
`mode === "expedition20"/"slice"` branches in `sim.ts`, which is why every
change risks the frozen slice.

Suggested direction (incremental, slice hash pinned by
`tests/render-occlusion.test.ts` must stay unchanged):

1. Move instrument counters into one `metrics` object (read-only to rules).
2. Extract pure-function modules over plain data: `spawner`, `economy`
   (purchase preview/commit, reroll), `loot`, `blast/chain`, `pickup`.
3. Isolate expedition-only behavior behind its own methods instead of inline
   mode checks in shared paths.

Do this as its own planned piece of work with review, not mixed with P3B.

### F4 `main.ts` readability (open, medium)

- Shop / rest screens are long HTML template literals with rule logic and up
  to 4-level nested ternaries inside `${...}` (21 lines with nested ternaries;
  e.g. weapon card `previewText`, slice shop line ~330).
- 13 non-null assertions, mostly `preview!.x` repeated; narrow once instead.
- Module-level mutable state (`game`, `record`, `quickPickedId`, ...).
- Suggested split: `ui/icons.ts` (SVG art tables), `ui/shop.ts`,
  `ui/hud.ts`, `metrics.ts` (`window.scrapMetrics`); compute a view-model
  first, then render strings.

### F5 Magic numbers (open, medium)

- Arena centre `600, 450` appears ~10 times in `sim.ts`
  (`player`, `lastMilestone`, `wakeAnchor`, wave reset). Note `H = 800`, so
  the start y is not `H / 2`; it deserves a named `PLAYER_START`.
- Boss spawn `x: player.x < 600 ? 900 : 300, y: 220` repeated three times.
- Player speed `230`, wall margin `30`, pull speeds `200/260 + min(900, age*300)`,
  slice spawn rates `1 / 3.1`, `1 / 4.2` and kind thresholds inline in `step()`.
- `main.ts` `g.wave >= 19` encodes the 20-wave length.
- Many of these are inside the frozen slice path; name them without changing
  values, and confirm the slice render hash test still passes.

### F6 Naming and style (open, low)

- Exported globals `W`, `H`, `DT` and comma-chained `const` declarations
  (`data.ts`, `render.ts`, `main.ts`). Prefer `ARENA_W` etc. for new code.
- `preview.incomingTier` means the final merged tier (known debt).
- 9 files drift from Prettier (`npx prettier --check src tests vite.config.ts`);
  fix in one formatting-only commit and add `format:check` / `typecheck`
  scripts.
- `elite` event declared but never emitted; unreachable quick/branch code in
  expedition (both already listed in `memory/status.md`).

## Verification of the fixes

- Derived strings equal the old literals: boss `5 / 10 / 15 / 20`, elite
  `3 / 7 / 11 / 14 / 17 / 19`, stats `6% 6% 5% 15% 8%`, hp `+1`; old UI price
  formula equals `gunPrice` for all six weapons, W1-W20.
- `npm test` 178/178, `npm run build` clean, `browser-p2-items` 2/2
  (keyboard + CDP touch, dev server 127.0.0.1:4188).
- Not verified: phones, Safari, feel.
