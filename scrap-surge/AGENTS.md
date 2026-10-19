# Scrap Surge collaboration
Read memory/goal.md, memory/status.md, docs/design.md and this file before edits.
Role split while it remains active: Astra coordinates, defines architecture
boundaries and reviews integration but writes no implementation; Opus reviews
gameplay, aesthetics, audiovisual direction and feel; DeepSeek is the sole writer
in this directory (implementation, tests, fixes). Astra, Opus and DeepSeek have
equal standing: a decision is implemented only after all three explicitly agree,
and silence or absence is not approval. Author self-checks are not independent
review; independent review runs in a separate context against a named commit.
The rejected nightfold/ prototype has been deleted under the user's direct
authorization; do not recreate it. Do not modify the parent README.
Simulation, rendering, input/lifecycle and audio remain separate. Visual quality
must never alter combat rules. Tests use normal inputs, not invulnerability cheats.
This replaces a user-rejected geometric game. Prioritize immediate automatic combat,
multi-weapon differentiation, readable enemy pressure and pickup feedback. No novel
gesture prerequisite for dealing damage. User feel acceptance is not model review.
The goal targets a full 10-20 minute replayable run; the current two-wave build is
an approved feel-validation slice, and expansion beyond it needs its own review.
No paid services, publication, push or merge without explicit user authorization.
