# Archive

Historical, one-shot documents moved here on 2026-10-20 (docs/handoff-refresh).
Content is unchanged apart from path references. None of these files describes
the current state; read `memory/status.md` for that.

| File | What it was | Superseded by |
| --- | --- | --- |
| `expedition20-proposal.md` | Approved 20-wave implementation spec frozen at `058951f` (2-to-6 slot ladder, manual Tier II, branches) | P1 six slots + auto-fusion (`6d15c7f`), P2 items (`docs/p2-items-contract.md`) |
| `expedition20-ledger.mjs` | Static economy ledger script for the proposal above | Same as above |
| `growth-items-proposal.md` | Pre-P2 five-route item hypotheses, never approved as numbers | `docs/p2-items-contract.md` and `src/items.ts` |
| `p2-stage-b-handoff.md` | One-shot handoff for P2 Stage B (simulation integration, public sim API list) | Code in `src/sim.ts`; still a useful API index |
| `p2-stage-c-handoff.md` | One-shot handoff for P2 Stage C (rest UI) | Code in `src/main.ts`, `src/style.css` |
| `p2-stage-d-handoff.md` | One-shot handoff for P2 Stage D (elite/chest render + audio) | Code in `src/render.ts`, `src/audio.ts` |
| `p2-repair-handoff.md` | Handoff for the R1-R5 repair and the R5 preview follow-up | Merged at `447af10` / `6ba7844` |
| `p2-test-migration.md` | Ledger mapping obsolete pre-P2 expedition assertions to their replacements | Current tests in `tests/` |

`docs/data/p3-measurement/` (P3A v1 data) stays in place because tooling and
provenance hashes reference it; its "0 accepted rerolls" claim is false and is
superseded by `docs/data/p3-measurement-v2/`.
