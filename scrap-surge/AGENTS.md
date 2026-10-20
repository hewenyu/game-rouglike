# Scrap Surge collaboration
Read memory/goal.md, memory/status.md, docs/design.md and this file before edits.
The normal build is the runnable 20-wave `expedition20` candidate; `?mode=slice`
preserves the approved two-wave feel slice. The candidate is not user-accepted or
validation-complete. Current evidence and open gaps belong in memory/status.md and
docs/testing.md; chronological historical material belongs in docs/status-history.md
and must be marked as historical rather than deleted.
Role split while it remains active: Astra coordinates, defines architecture
boundaries and reviews integration but writes no implementation; Opus reviews
gameplay, aesthetics, audiovisual direction and feel; DeepSeek is the sole writer
in this directory (implementation, tests, fixes). Astra, Opus and DeepSeek have
equal standing: a decision is implemented only after all three explicitly agree,
and silence or absence is not approval. Author self-checks are not independent
review; independent review runs in a separate context against a named commit.
One-shot agents start with `fork_turns=none`, receive one bounded assignment and
do not follow up after their final answer. An independent DeepSeek reviewer is
not the author of the reviewed change. Current project documents are the shared
source of truth; chat history is context, not authoritative project state.
The rejected nightfold/ prototype has been deleted under the user's direct
authorization; do not recreate it. Do not modify the parent README.
Simulation, rendering, input/lifecycle and audio remain separate. Visual quality
must never alter combat rules. Tests use normal inputs, not invulnerability cheats.
This replaces a user-rejected geometric game. Prioritize immediate automatic combat,
multi-weapon differentiation, readable enemy pressure and pickup feedback. No novel
gesture prerequisite for dealing damage. User feel acceptance is not model review.
The goal targets a full 10-20 minute replayable run. The 20-wave implementation
spec is approved, but every later tuning or rule change still needs its own review.
The approved two-wave slice must retain its behavior inside the 20-wave candidate.
No paid services, publication, push or merge without explicit user authorization.
