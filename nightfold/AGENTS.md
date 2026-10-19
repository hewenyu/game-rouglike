# Nightfold collaboration

Read this file, memory/status.md, then docs/design.md before changing rules.
Coordinator is the sole file writer. Opus and DeepSeek review read-only. Explicitly
stop and hand off before changing writers. Reviews apply to a named git commit.
Keep simulation (src/sim.ts), geometry/data, rendering, input/lifecycle and audio separate.
Rendering quality must never change rules. Do not modify the parent project.
No paid services, public deployment, push or merge without user authorization.
Run npm test and npm run build after rule changes; browser tests use normal inputs.
Update memory/status.md when facts change; do not copy chat transcripts.
