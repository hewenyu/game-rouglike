# 折夜 NIGHTFOLD

**把危险，折成星光。** An original, single-player browser roguelike about drawing
space instead of aiming a weapon. Hold a thread, move, release to fold. Enclose
hostiles; steal their projectiles; draft rules that change what a fold does.

## Play locally

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4178**. Select **先试一页** for the ~2-minute prelude, or
**开始一场夜航** for a ~12-minute full voyage. This is a local entry, not a public
hosted release. Node.js 22.12+ recommended. No accounts, backend or external assets.

- WASD / arrow keys: move.
- Hold Space or left mouse: draw a line. Release: close the gold dotted edge.
- A real loop deals more damage than a line. Standing clicks do not attack.
- Enclose orange bullets at release to turn them into homing shots.
- P / Escape: pause. Draft choices freeze time; 1 / 2 / 3 or click to choose.
- Touch: drag the left joystick with one finger; hold/release the right button with
  another. Both portrait and landscape layouts exist. Physical phone QA is pending.

Resize, leave the tab or lose focus: automatic pause and safe line cancellation.
Refreshing returns to the title. Only discoveries, completed-run records and settings
persist locally. A storage-disabled browser can still play.

## Engineering

```sh
npm test                 # deterministic rules / geometry / combinations
npm run build            # strict TypeScript plus Vite production bundle
npm run test:browser      # normal keyboard + emulated dual-touch, needs dev server
npm run preview -- --port 4179
```

Browser tests use local Google Chrome on macOS by default. Set `CHROME_PATH` to your
Chromium executable and `TEST_URL` to another served URL. Tests take roughly 2 minutes;
a run may lose or win, and the report distinguishes the result. `artifacts/` stores
screenshots and JSON evidence, not acceptance guarantees.

`dist/` is a static build with relative asset paths: serve its contents at a root or
subdirectory using any HTTP static server. Do not open index.html through file://.
See docs/deployment.md for a reproducible nested-path check. Nothing was deployed.

## Project map

- src/sim.ts: fixed-step rules, seeded randomness, waves, damage and run states.
- src/math.ts and src/data.ts: geometry and authored rules/content.
- src/render.ts: presentation only; low quality never changes the simulation.
- src/input.ts: keyboard, Pointer Events, dual-touch joystick.
- src/audio.ts: original Web Audio synthesis, no sound files or licensing ambiguity.
- src/main.ts: interface, lifecycle, optional records and read-only profiling.
- AGENTS.md / CLAUDE.md / memory/: shared maintenance instructions and live facts.

## Verification boundaries

Build success does not mean correct mechanics; tests do not mean the game is fun.
The three-model workflow is recorded in docs/reviews.md. Model reviews are not user
acceptance. Physical phones, Safari and exhaustive build balancing require further
playtests. See docs/testing.md for measured results and known gaps.
