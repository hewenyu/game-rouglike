# Scrap Surge - agent guide

This file has two parts. **Shared project rules** apply to every tool and model.
**Codex workflow** applies only to Codex sessions. Claude Code follows
`CLAUDE.md` instead of the Codex workflow (user decision, 2026-10-20).

## Reading order

1. `memory/status.md` - one page of current facts, next steps, open gates.
2. `memory/goal.md` - the user's product goal and design contracts.
3. `docs/lessons.md` - retrospective of the first run: pitfalls and invariants.
4. `docs/design.md` (slice rules, art direction) and `docs/p2-items-contract.md`
   (item numbers) when touching gameplay; `docs/testing.md` for test method.
5. `docs/p3b-fullslot-bundle.md` before working on the weapon shop.

`docs/reviews.md` and `docs/status-history.md` are append-only history;
`docs/archive/` holds superseded one-shot documents. Chat history is context,
not project state: the files above are the shared source of truth.

## Shared project rules

Product

- Original browser auto-combat roguelike, 20 waves, 10-20 minute runs, real touch
  input. Brotato is an experience reference only; copy no character, world, art,
  UI layout or symbols. The rejected `nightfold/` prototype stays deleted.
- The core is a real, readable positive-feedback loop ("左脚踩右脚上天"). Strong
  builds may steamroll; do not flatten synergies, only guard termination and
  performance. Immediate automatic combat comes first; no novel gesture is
  required to deal damage.
- Weapons are early baseline output; items amplify weapons and carry the late
  game. Do not raise enemy HP to force item dependence.
- Model review is never user acceptance. Say plainly what was and was not
  verified; the user has not accepted feel, art or balance.

Engineering

- Simulation (`src/sim.ts`), rendering (`render.ts`), input (`input.ts`), audio
  (`audio.ts`) and lifecycle/UI (`main.ts`) stay separate. Visual quality must
  never alter combat rules. Tables live in `data.ts`, `expedition.ts`,
  `items.ts`; one central function per formula feeds both sim and UI.
- `?mode=slice` is frozen: keep its behavior and render hash unchanged inside the
  20-wave build.
- Combat RNG and reward/shop RNG stay separate. Purchases are atomic: a rejected
  action changes nothing.
- Tests use ordinary inputs (keyboard and real CDP touch) and read-only
  `window.scrapMetrics`; no HP, timer, invulnerability or state injection.
  Synthetic clock jumps in unit tests must be labelled synthetic.
- Before handing off: `npm test`, `npm run build`, `git diff --check`; add the
  relevant browser fixture (see `README.md`) for UI or flow changes.
- Record evidence with the SHA, command, result and a unique output directory.
  Never cite an old artifact as a new run; keep failures as failures.
- Update `memory/status.md` in place when the state changes; move superseded
  text to `docs/status-history.md`.

Authority

- No push, merge to `master`, deployment, publication or paid service without the
  user's explicit request in the current conversation. Work on a branch.
- Do not merge `codex/scrap-surge-expansion-draft`.
- The user prefers TS/Go and communicates in Chinese.

## Codex workflow (Codex sessions only)

The user wants Codex to run as a three-model team.

- Create the goal before starting work ("创建目标，开始干活"). If the goal card
  text cannot be edited, record revisions in `memory/goal.md`.
- **Astra** (the root Codex model) coordinates, sets architecture boundaries and
  reviews integration; Astra writes no production code.
- **Opus** reviews gameplay, aesthetics, audiovisual direction and feel, from the
  start of every design, not after the code.
- **DeepSeek** is the only writer in this directory: implementation, tests,
  fixes. Independent review uses a different, fresh DeepSeek in a separate
  context; an author self-check is not independent review.
- Astra, Opus and DeepSeek have equal standing. A decision is implemented only
  after all three explicitly agree; silence or absence is not approval.
- Actually invoke the subagents; never role-play another model.
- Subagents are one-shot: start with `fork_turns=none`, give one bounded task,
  the frozen SHA, the shared docs and acceptance criteria; never follow up after
  the final answer (`send_message` does not wake a completed agent). Fixes and
  re-reviews use new agents.
- One writer at a time. Grant writing with the literal `WRITE LEASE GRANTED`; the
  writer freezes a commit, reports SHA/files/evidence and states
  `WRITE LEASE RELEASED`. Review and follow-up default to read-only. The lease is
  a convention, not an OS lock.
- Review a frozen SHA via `git archive` into a temp dir on its own port; never on
  a shared dev server with HMR. Reproduce disputed findings before acting.
- Proceed with reversible work on three-party consensus; do not repeatedly ask
  the user for approval or block on internal process questions.
- Commits made by Claude Code sessions are user-authorized baseline. Review them
  at the next checkpoint if a change matters, but do not revert them for lacking
  three-party sign-off.
