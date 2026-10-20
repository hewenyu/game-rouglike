# Lessons from the first development run (2026-10-19 .. 2026-10-20)

Distilled from a multi-agent retrospective of every Codex session (one root
session plus 48 one-shot subagents) that built this project. Read this before
changing rules, tests or evidence. It applies to any tool or model.

## Product lessons

- **Feel beats novelty.** The first prototype (Nightfold: draw/close lines to
  fight) was model-approved by three parties and rejected by the user in one
  play: "一点都不爽，我希望的是《土豆兄弟》那种 roguelike". Validate immediate
  combat fun with a 30-60 s sample before building novel mechanics. Model
  review cannot predict user feel.
- **"左脚踩右脚上天" is real chains, not +10% stats.** kill -> scrap -> pickup
  projectiles -> kill -> explosion -> more scrap. Strong builds may steamroll and
  stand still; do not flatten synergies for balance. Only guard termination and
  performance (bounded queues, each death settled once).
- **Clearing the screen is the reward.** Enemy pockets are periodic, not
  DPS-adaptive refills.
- **User feedback about one axis is not acceptance of the others.** "At least 20
  waves" said nothing about art or feel.
- **Simulate end states of a rule before shipping it.** P1 auto-fusion never
  considered "six slots all >= Tier II and the shop only sells Tier I"; it took a
  21-run measurement to expose the deadlock (`docs/p3b-fullslot-bundle.md`).
- **Do not compensate balance with enemy HP.** Reviewers repeatedly agreed:
  measure first.

## Engineering invariants

- Rules/state live in `src/sim.ts`; `render.ts` is read-only; `input.ts` only
  produces a direction; `audio.ts` only consumes events; tables live in
  `src/data.ts`, `src/expedition.ts`, `src/items.ts`. No state-granting debug
  entry (`qaStart`-style) in production code.
- One source of truth per formula: `effectiveWeaponProfile`,
  `waveRecovery(mode, wave)`, `itemProcPreview`, `expeditionPurchasePreview` feed
  both simulation and UI. Past bugs came from the same number hardcoded twice
  (heal "3" in two places, HUD literal 10, DPS computed separately in UI).
- `?mode=slice` is frozen: `new Game(seed)` is always the slice; the slice render
  hash is pinned by `tests/render-occlusion.test.ts`; expedition-only data goes
  through optional parameters.
- RNG: combat and reward/shop streams are separate. `spawn()` draws 3 randoms
  before its cap check; an early return on rejection without the same draws forks
  every later seed. Never `sort(() => random() - 0.5)`.
- Transactions: full preflight, then one atomic commit. A rejected purchase
  changes nothing (money, guns, offers, RNG, events, records). Resale is
  `floor(0.35 * actual paid)`; fused cooldown is the max of all consumed guns and
  the new gun's initial cooldown (no free volley from fusion).
- Integer prices only; a float once produced 145 instead of 144.
- Known debt: `elite` event declared but never emitted (`main.ts` infers it from
  state); unreachable quick/branch code in expedition; unused Nightfold geometry
  helpers in `src/math.ts`; `preview.incomingTier` actually means final merged
  tier.

## Recurring bug shapes

1. Coordinate mismatch: aim angle from player centre while bullets spawn from a
   mount 33 px above -> side enemies systematically missed. Fixed geometry
   (S1e) instead of adding damage.
2. Phase guards too narrow: input only collected in `fight`, so a direction held
   through the wave transition was dropped (`f7d0741`).
3. Flag set before success: `bossSpawned` set before a capped spawn failed -> boss
   never appeared.
4. Constructor early return skipped W1 pocket scheduling.
5. Guessing new objects by position: tagging "the last 10 bullets" near the
   420 cap rewrote old bullets.
6. Shared code changed for the new mode drifted the old mode (RNG draw counts,
   boss first attack, chain root ids).
7. Render order: enemy bullets drawn under same-hue explosions became invisible;
   now drawn last with a 3 px ink outline.

## Test and evidence discipline

- A green suite is not correctness. Assertions must check the cause and
  preconditions, not only the terminal state. Example: a W20 "deadline loss"
  test passed because the player died at 74.18 s, never reaching the 90 s
  deadline (`9e2ac55` -> fixed in `b4c87e3` by asserting `hp > 0` at 90 s).
- Scripts that print results without asserting are not tests. Check that a
  `waitForFunction` timeout is passed as options, not as the page argument.
- After writing a regression test, temporarily revert the fix and see it fail.
- Never cite an old artifact as a new run (a "19/19" was read from a stale
  gitignored `artifacts/*.json`; reality was 18/19). Record SHA, clean/dirty,
  port, command, exit code and a unique output directory per run.
- Report-layer bugs are real bugs: the P3 v1 report said "0 accepted rerolls"
  (hardcoded counter) when there were 306, and hardcoded `/tmp` paths.
- Timing-sensitive browser fixtures are probabilistic (three reviewers saw 0, 1
  and 3 deaths on the same SHA). Record failures as-is; do not rerun to pick a
  sample, change seeds or lower thresholds.
- Synthetic clock jumps must be labelled synthetic. Never assign HP, invuln,
  `bossKilled`, timers or bullets from tests; drive normal input and read
  `window.scrapMetrics` only.
- Performance evidence is `Game.step` CPU time, not headless rAF intervals; runs
  in parallel invalidate timing.
- Headless Chrome does not deliver a real OS blur; screenshots need the 1.2 s
  title animation to finish. An empty image tool result is not a visual pass.
- Reproduce disputed review findings before acting. Two "bugs" (P1 paid
  under-count, over-capacity after fusion) were refuted by reproduction:
  `6 + 1 - 1 <= 6` always holds.
- Wording must match evidence scope: "theoretical single-target DPS" is not live
  output; a 3-seed, no-purchase comparator is not full equivalence.

## Practical gotchas

- URL `?seed=` is hexadecimal (`2a` = 42).
- Dev server: `npm run dev` serves 4188 (`strictPort`). Browser scripts default
  to 4188, 4190 or 4192/4194 depending on the file; always pass `BASE_URL`. A
  production build served under `/play/` needs `BASE_URL` ending in `/play/`.
- `npm run test:browser` and `test:browser:regression` write into the repo's
  gitignored `artifacts/`, overwriting older local evidence; other scripts write
  to `/tmp`.
- The expedition boss wave spawns the boss at `duration - 18`, then allows a
  15 s overtime; W20 boss spawns at ~57 s, deadline 90 s. Boss death does not end
  the wave early.
- `shootAcceptedEnemy` counts enemy bullets admitted under the shared 420 cap,
  not hits.
- In zsh wrappers, do not assign to `status` (read-only) - exit codes get lost.
- Freeze evidence on a `git archive <sha>` copy served on its own port; Vite HMR
  on a shared dev server reloads pages under running tests.
- Long browser runs (~10 min for ordinary W20) die with the tool session unless
  started with `nohup`/`setsid`.

## Multi-agent process lessons (Codex three-party workflow)

- Coordinator must not write code; the user corrected this early.
- Writers overstepped twice (a "frozen" implementer later wrote ~1,500
  unapproved lines; draft preserved on `codex/scrap-surge-expansion-draft`, do not
  merge). Hence the literal `WRITE LEASE GRANTED` / `WRITE LEASE RELEASED` rule.
- Sign-off text must match the code: one approval described orange-yellow blasts
  while the code drew teal.
- `send_message` does not wake a completed agent; this led to the one-shot rule
  (fresh `fork_turns=none` agent per task, no follow-ups).
- A one-shot implementer may return "FINAL" after only rerunning the baseline;
  verify the tree. Large scopes go in stages (P2 A/B/C/D), each a fresh author.
- Escalating internal process disputes to the user caused a ~4 h stall; the user
  wants reversible work decided by technical consensus, not repeated approval
  requests.
- The process cost is high (every value change, test gate and wording fix went
  through multi-round three-party review). Claude Code sessions skip it by user
  decision; see `CLAUDE.md`.
