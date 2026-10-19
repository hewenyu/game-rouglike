# USER-REJECTED CONCEPT — STOPPED

The user played this game and explicitly rejected its core feel. Do not resume
polishing Nightfold without renewed authorization. The replacement is scrap-surge/.
The following is historical implementation state, not acceptance.

# Current state

- Project isolated in nightfold/; parent README untouched. Branch codex/nightfold.
- Coordinator is the only writer. The two actual subagent tool configurations were
  kiro/claude-opus-5.5 and group/auto-deepseek-v4-1-flash with fork_turns=none.
  Their agents cannot introspect the provider's underlying execution identity.
- Three proposals and one cross-questioning round completed; see docs/design.md.
- Initial playable implementation includes short prelude, provisional full voyage,
  8 rules, three regular enemy kinds, boss, keyboard/mouse and dual-touch inputs.
- Slice checkpoint is pending independent review. No user playtest approval.
- First rule tests caught a bounded-field cleanup bug; fixed. 20 tests currently pass.
- Browser testing uses ordinary inputs and read-only metrics, not gameplay cheats.
- Development port is 4178. Port 5173 belonged to a separate IPv6 local app; that
  app was not modified/stopped. Use http://127.0.0.1:4178 to avoid ambiguity.
- Physical phone/Safari, subjective audio balance, long-run balancing and user's
  assessment of surprise/fun remain unverified. See docs/testing.md as it develops.
