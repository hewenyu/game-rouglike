# Status

Single page of current facts. Update this page in place at each checkpoint;
move superseded text to `docs/status-history.md` instead of stacking new
"current" sections. Last refreshed 2026-10-28 after the code-review refactor merge.

## Where things are

- 2026-10-28: branch `claude/code-review-ts-skill` (behavior-neutral refactor
  from `docs/code-review-2026-10-28.md` plus the TS skill
  `.claude/skills/ts-best-practices/SKILL.md`) is pushed and ready to merge. A
  playtester asked for the merge through the project bot (Discord), but merging
  to `master` auto-deploys through Cloudflare Pages, so it waits for the
  maintainer's approval. `master` = `b6c9e13` (`ac6bcd9` plus doc/cleanup
  commits).
- Gameplay is unchanged since `447af10` (P2 repair). The 2026-10-28 refactor
  changes `src` structure only: `npm run test:golden` (16 headless full games)
  gives digests identical to `b6c9e13`. New modules: `sim-types.ts`,
  `economy.ts` (`planGunPurchase`, formerly inside
  `expeditionPurchasePreview`), and `ui-cards.ts`. `step()` is now a list of
  named sub-steps. `W`/`H` were renamed to `ARENA_W`/`ARENA_H`.
- Verified on the branch head before merge: `npm test` 178/178, `npm run build`,
  `format:check` clean, golden equal. Browser (dev server 4188, keyboard + CDP
  touch): first-shop, p2-items, p2-visuals, p2-lifecycle, render-occlusion,
  regression 24/24 and a full expedition run pass. `browser-input-lifecycle`
  (waits for a W7 interlude) and `browser-merge-purchase` ("did not reach the
  W2 shop") fail the same way on `b6c9e13`. They are stale since P2 (every
  wave now opens the rest screen) and need rewriting.
- Branches: only `master` plus `codex/scrap-surge-expansion-draft` (`8e1542e`), an
  unapproved WIP draft with known defects; do not merge. The merged `codex/*`
  branches and the Codex `scrap-growth` worktree were removed on 2026-10-20.
- Deployment (user-run, Cloudflare Pages): production branch `master`, framework
  None, root directory `scrap-surge`, build `npm run build`, output `dist`,
  env `NODE_VERSION=22`. `vite.config.ts` uses `base: "./"`; no backend.

## What the game is now

The normal page is the 20-wave `expedition20`; `?mode=slice` keeps the approved
two-wave feel slice byte-for-byte.

- P1 weapons (`6d15c7f`): six slots from W1, free starting slinger; same-ID
  same-tier guns auto-fuse I->II->III->IV; damage-only tier ladder 1/2/4/8
  (provisional). Cards show ATK and panel `理论DPS`; enemies show hurt bars;
  bosses show HP.
- P2 items (`6ba7844`, source `447af10`): 20 items in `src/items.ts`, five mixable
  families (speed S, chain C, HP/contact H, firepower F, pickup P); rarity
  (common/uncommon/rare) independent of stack limits; owned uniques are filtered;
  shop rarity improves by wave band; elites at W3/7/11/14/17/19 drop physical
  chests (items only); boss chests at W5/10/15 use higher rare weights; one
  consolidated rest screen per wave (3 weapons, 3 items, a stat or reward
  choice); separate reward RNG. Contract: `docs/p2-items-contract.md`.
- Heal on entering W1-W10 is 3, W11-W20 is 4, capped at 10.

## Latest measurement (P3A, `b045332`)

21 preregistered simulated runs (7 cohorts x seeds 1/42/145) on frozen `447af10`:
**4 wins / 17 losses** (15 boss-wave deadline losses with HP left, 2 zero-HP).
This is a diagnostic with one shared movement bot, not a win rate or proof that
routes are unviable. Authoritative data: `docs/data/p3-measurement-v2/`
(`report.md`, `report.json`, `provenance.json`); method and hashes in
`docs/p3-measurement-plan.md` and `docs/testing.md`. The v1 directory
`docs/data/p3-measurement/` is kept but its "0 accepted rerolls" is false (306,
all free).

Key finding: once all six slots are Tier II+ and no Tier I partner exists, every
weapon purchase is rejected and cash piles up unused. The fix is designed and
approved, **not implemented**: `docs/p3b-fullslot-bundle.md`.

## Next steps (in order, unless the user redirects)

1. Collect the user's / playtesters' feedback on the deployed build; it overrides
   the plan below.
2. Implement P3B full-slot component bundle exactly as in
   `docs/p3b-fullslot-bundle.md`, with unit tests and an ordinary-input browser
   fixture (keyboard + CDP touch) for x2 (II->III) and x4 (III->IV).
3. Re-run the P3 measurement on the new source with a new explicit freeze
   (update `FROZEN_SOURCE`; do not disable the source guard). Check that cash gets
   spent, guns keep growing after W9, and weapon-only does not become dominant.
4. Balance phase: item-led late game, five-route comparison
   (weapon-only / scattered items / coordinated build), boss windows. Do not raise
   enemy HP to force item dependence.
5. Hygiene (any time, small commits): rewrite the stale
   `browser-input-lifecycle` and `browser-merge-purchase` fixtures for the
   per-wave rest screen, unify browser-test default ports, emit the declared
   `elite` event, remove unreachable quick/branch code.
6. Remaining structure debt (`docs/code-review-2026-10-28.md`, "Resolution"):
   group instrument counters into one `metrics` object, more `sim.ts` subsystem
   modules, `main.ts` shop/rest templates, spawn-clamp literals. Check every
   refactor with `npm run test:golden` against its base commit.
   TS conventions for Claude: `.claude/skills/ts-best-practices/SKILL.md`.
   P3B will touch `src/economy.ts` (`planGunPurchase`) instead of
   `Game.expeditionPurchasePreview`.

## Open gates (none established yet)

- User acceptance of feel, aesthetics or any build. Model review is not user
  acceptance.
- An ordinary-input W20 victory in a browser (best old run died at W20 ~57.6 s as
  the boss spawned).
- Late-game viability of the five routes; "weapons only give base output, items
  carry late game" is a design contract with no measurement behind it.
- "Money is always scarce" (blocked by the full-slot deadlock above).
- W16-W20 render performance, physical phones, Safari, audio mix.

## Known non-blocking debt

`elite` event never emitted; trail (S3) browser evidence is desktop-only; 8 px
card labels at 1440 px; `metrics.gunProfiles` ignores item modifiers (displayed
`profiles` are correct); "物品 X / 20" denominator is the catalog size; corpses and
trail share a 180 cap.
