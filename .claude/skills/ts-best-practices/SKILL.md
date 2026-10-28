---
name: ts-best-practices
description: TypeScript best practices for Scrap Surge (scrap-surge/src, tests). Use when writing, refactoring or reviewing TS code in this repo - adding constants or tables, touching sim/render/main boundaries, naming, types, module cohesion, or doing a readability / coupling review.
---

# TypeScript best practices - Scrap Surge

Project rules in `scrap-surge/AGENTS.md` and `docs/lessons.md` win over this
file. This skill turns them into concrete TS habits. Toolchain: TS 5.9
`strict`, `moduleResolution: Bundler`, Vite 7, `tsx --test`, Prettier 3.

## 1. One source of truth per number

The most common bug shape in this repo is the same number written twice
(heal "3", HUD literal 10, UI-computed DPS, UI-computed price).

- Every rule number lives in a table module: `data.ts` (weapons, arena),
  `expedition.ts` (waves, bosses, elites, prices), `items.ts`
  (`ITEM_CONSTANTS`, caps, rewards). Sim and UI both import it.
- Every formula has one exported function (`gunPrice`, `rerollPrice`,
  `waveRecovery`, `effectiveWeaponProfile`, `itemProcPreview`,
  `expeditionPurchasePreview`). UI must call it, never re-derive it.
- UI text that states a rule value is built from the table:
  `` `+${Math.round(STAT_REWARD_AMOUNTS.move * 100)}%` ``, not `"+5%"`;
  `ELITE_WAVES.join(" / ")`, not `"3 / 7 / 11"`.
- Before adding a literal, `grep` for it. If it already exists elsewhere, import.

## 2. Constants: naming and shape

- `SCREAMING_SNAKE_CASE` for module-level immutable tables and tuning values;
  `camelCase` for functions and locals. Give a name to any number whose meaning
  is not obvious from one line (`ARENA_CENTER`, `PLAYER_SPEED`), not to `0`,
  `1`, `2`, `Math.PI`.
- Freeze tables and keep literal types:

  ```ts
  export const ELITE_WAVES = [3, 7, 11, 14, 17, 19] as const;
  export const ITEM_IDS = ["...", "..."] as const;
  export type ItemId = (typeof ITEM_IDS)[number];
  export const ITEM_CAPS: Readonly<Record<ItemId, number>> = Object.freeze({...});
  ```

- Prefer `Record<Union, T>` over `Record<string, T>` so a new id fails to
  compile until every table has an entry. Use `satisfies` to check a table
  without widening it: `const X = {...} as const satisfies Record<WeaponId, Spec>`.
- Group related tuning values in one frozen object (`ITEM_CONSTANTS`,
  `QUEUE_CAPS`) rather than scattering loose `const`s.
- One declaration per `const`; no `export const A = 1, B = 2` chains. Name
  globals fully (`ARENA_W`, not `W`).

## 3. Types

- No `any`, no `@ts-ignore`. Use `unknown` + narrowing at boundaries
  (localStorage, URL params, `JSON.parse`) - see `normalizedRecord` in `main.ts`.
- Avoid `!` non-null assertions. Narrow once (`if (!preview) return ...`) and
  use the narrowed value; repeated `preview!.x` is a smell.
- String unions for closed sets (`Phase`, `GameMode`, `DamageSource`), derived
  from a `const` array when the values are also iterated.
- Use exhaustive `switch` with a `never` check for unions that may grow:

  ```ts
  default: { const unreachable: never = kind; throw new Error(unreachable); }
  ```

- `import type` for type-only imports (`render.ts` uses `Game` only as a
  type; shared shapes live in `sim-types.ts`). Keep `readonly` on arrays and props that callers must not mutate.
- Name result objects with a type (`PurchasePreview`, `ItemEligibility`) and
  return reasons as unions (`reason: "no-space" | "money"`), not booleans.

## 4. Cohesion and coupling (module boundaries)

- `sim.ts` owns state and rules. `render.ts` reads `Game` and draws; it never
  mutates or calls RNG. `input.ts` only yields a direction. `audio.ts` only
  consumes `Event`s. `main.ts` owns DOM, lifecycle and persistence.
- Visual code must not change combat; anything that changes combat goes in sim
  and is tested there.
- Mode differences (`slice` vs `expedition20`): `?mode=slice` is frozen. Do not
  add new `if (this.mode === ...)` branches deep in shared methods; put
  expedition-only behavior in its own method/module with optional parameters.
- A new subsystem (spawner, economy, loot, chain/blast, pickup) goes into its
  own module of pure functions over plain data, called from `Game`. Pure
  functions are easier to unit test than methods on a 3000-line class.
- Keep read-only instruments (counters for tests/metrics) separate from rule
  state; never let them influence combat or RNG.

## 5. Functions and readability

- Aim for functions under ~60 lines with one job. Extract when a block needs a
  comment to explain what it does.
- No nested ternaries deeper than two levels; use a small function with early
  returns or a lookup table.
- In HTML-template code, compute values first (named locals), then build the
  string. Do not put rule logic inside `${...}`.
- Names say the unit or meaning: `cooldownSec`, `priceScrap`, `radiusPx`,
  `incomingTier` only if it really is the incoming tier.
- Comments explain _why_ (a reviewed decision, an invariant), not _what_.

## 6. Determinism and transactions

- Combat RNG and reward/shop RNG are separate streams (`SeededStream`). Never
  `Math.random()` in sim; never `sort(() => random() - 0.5)`.
- Keep the number of RNG draws identical on success and rejection paths.
- Purchases: full preflight, then one atomic commit. A rejected action changes
  nothing. Prices are integers.

## 7. Tests and verification

- Refactors must be behavior-neutral: run `npm run test:golden` on the base
  commit and on the change and `diff` the outputs; any digest change means
  behavior changed.

- Unit tests: `tests/*.test.ts` with `node:test` via `tsx`. Test the exported
  formula/table function, not a copy of it.
- Browser fixtures use ordinary input and read-only `window.scrapMetrics`; no
  state injection.
- Before handing off, in `scrap-surge/`: `npm test`, `npm run build`
  (includes `tsc --noEmit`), `npm run format:check`, `git diff --check`.

## Review checklist

When asked to review TS code here, check in this order and cite `file:line`:

1. Duplicated rule numbers/formulas between sim, UI and tables.
2. Boundary leaks (render/UI mutating state, sim touching DOM, RNG misuse).
3. Mode branching added to shared code paths.
4. Type escapes: `any`, `!`, `as` casts, `Record<string, ...>`.
5. Long functions, nested ternaries, unnamed magic numbers.
6. Tests: does a test cover the changed formula through its real export?
