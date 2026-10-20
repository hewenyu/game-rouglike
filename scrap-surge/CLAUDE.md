# Scrap Surge - Claude Code guide

Read `AGENTS.md`: its **Reading order** and **Shared project rules** apply to
Claude Code. Its **Codex workflow** section does not.

## How Claude Code works here (user decision, 2026-10-20)

- Develop directly. No Astra/Opus/DeepSeek roles, no three-party approval, no
  write lease. You may write code, tests and docs yourself.
- Start from `memory/status.md` -> "Next steps"; if the user gives new feedback,
  it overrides that list. Record new user requirements in `memory/goal.md`.
- For a change to rules, balance or the shop, run a fresh-context review subagent
  on the committed diff before calling it done; for small fixes, tests are
  enough. Subagents only when they add value or the user asks.
- Verify before claiming: `npm test`, `npm run build`, `git diff --check`, plus the
  relevant browser fixture with `BASE_URL` set (dev server is
  `http://127.0.0.1:4188`). Report results honestly, including failures and what
  was not verified (feel, phones, Safari, audio).
- Commit on a feature branch. Push, merge to `master` and deploy only when the
  user asks.
- When you finish a unit of work, update `memory/status.md` in place so a Codex
  session can pick up from the files alone.
- Reply to the user in Chinese.
