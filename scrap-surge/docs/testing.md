# Validation evidence and boundaries

## Automated rules

`npm test` runs 40 simulation tests (`tests/rules.test.ts`): automatic first kill,
one-time death settlement, multigeneration explosions, budgeted queue retention,
pickup uniqueness, pickup -> kill -> explosion -> drop feedback, stacked mod
validation, shop transactions, isolated shop RNG, incoming-damage reservations,
stale targets, pause, movement, loss/retry, end-of-wave sweep, victory/deadline and
20 seeded stress simulations with 180 enemies and 420 initial bullets.

Slice-specific tests added for S1/S1b:

- combat pickups advance the magnet charge while sweep pickups do not, and the
  remainder carries (7 combat + 5 sweep + 1 combat fires the burst on the 8th
  combat pickup);
- wave-1 pockets spawn at the fixed 6s/14s times with 12 enemies each;
- the wave-1 base spawn rate matches the fixed 3.1 per second;
- the chain counter reports real secondary deaths, not the primary root kill;
- a lone weapon kill never fabricates a chain;
- primary radius damage does not count as a chain;
- interleaved chains keep separate per-root counts;
- the pending-blast peak is recorded and the queue drains fully;
- a lethal spring-fist hit leaves a remnant that bowls another enemy for exactly 30;
- the remnant never damages the player and is not a live enemy;
- remnants are capped at 180 and cleared at the wave boundary;
- remnant kills drop loot and count as secondary chain deaths;
- overtime exposes a live countdown instead of a frozen zero;
- `spawnCount` counts successful spawns, not cap-rejected attempts.
- finished chain roots are reclaimed during sustained chain activity, so a long run
  cannot accumulate completed roots while the display timer keeps refreshing;
- a root with queued work survives until its queue drains.

These are finite samples, not a proof over all builds or seeds. The stress test
establishes bounded, finite state, not real-device frame-rate fitness.

## Browser method

`npm run test:browser` (normal play) and `npm run test:browser:regression`
(`tests/browser-regression.mjs`) drive real Chrome over the dev server or a static
host. Both use ordinary keys, taps and buttons and read only `window.scrapMetrics`
plus DOM geometry; no HP, timer or entity writes, and no invulnerability.
`CHROME_PATH`, `TEST_URL`/`BASE_URL` and `DIST_DIR` are configurable.

Environment: Google Chrome 155.0.8059.80, headless Playwright, macOS 26.6.2 /
Apple M4, 1440x960, DPR 1, seed 0x2a.

Normal-play run: automatic first kill at 1.45s, ordinary movement plus weapon
purchases plus two stacked mods, then a boss victory. Repeated runs land around
280-310 kills at 4-9/10 health with chain peak 18-21 and pending-blast peak 13-16;
the exact numbers depend on rAF timing, so the assertions check the outcome, not the
totals. No uncaught page errors. A 390x844 DPR2 touch context moved, auto-fired,
cancelled a touch and resumed with no ghost movement.

Author-run regression using separately authored checks
(`tests/browser-regression.mjs`). The checks were drafted by a separate agent, but
this execution was run by the implementer, so it is not independent review. The
formal independent review runs after the freeze against the frozen commit. The
current check set:

- A1 an ordinary-input run reaches a terminal state (win or loss). The A-run no
  longer requires idle play to die or to win: after S1e an ordinary run can
  legitimately win, so requiring a loss here would be wrong.
- G the forced defeat path: an ordinary keyboard charge toward the nearest enemy
  (read only from the read-only `enemyPositions`) for fixed seeds 2a/17/91, one run
  each. Each run ends at a loss or at the wave-1 shop; a shop end means the death
  path was not covered, never a death, and a run still fighting at 40s is a real
  timeout that fails. The group must contain at least one real loss at 0 hp with the
  failure UI visible and a working retry (back to fight / 10 hp / 0 kills / 1 gun /
  0 mods). At least one loss proves the defeat path is reachable; it does not prove
  every seed loses and it is not a difficulty judgement.
- H the read-only metrics API: `enemyPositions` returns a fresh array of fresh
  `{x,y}` copies, and mutating a returned snapshot does not change the next read.
- A3-A6 the end panel offers retry, the record is written once, retry resets
  immediately (10 health, 0 kills, 1 gun, 0 mods) and the record is not
  double-counted.
- B1-B3 a mid-fight refresh returns to the title without resuming, the record
  survives, and there are no page errors.
- C1-C2 the drawn arena starts below the edge bar and ends above the bottom HUD
  band, i.e. the HUD is outside the play field, not merely restyled over it.
- D1-D2 blur pauses and freezes simulation time, and after resume a released key
  produces 0px of drift.
- E1 the production `dist/` build runs from a `/sub/` subdirectory with relative
  paths and no 4xx responses.
- F1-F5 at 390x844 DPR2 with real touch: no HUD element overflows the viewport
  width, the document has no horizontal scroll, the edge bar and bottom band are
  fully visible, and the arena keeps a usable size (632x422) clear of both the
  edge bar and the joystick.

The phone checks exist because a read-only review found the arena squeezed to a
small strip and the loadout/wallet overflowing: conflicting narrow-screen media
rules enlarged the bottom bar, and `layout()` mixed `window.innerHeight` (1046 on
that device) with the canvas CSS height (844). The fix uses the canvas rect as the
single coordinate frame and clamps the narrow bottom bar to the viewport width.

## Frame intervals

The normal-play run reports median 16.7ms and p95 16.7ms over the final samples,
from raw rAF timestamps. This is headless desktop execution, not GPU profiling and
not a peak-load or midrange-phone claim.

## Known unverified

- No physical-device performance or Safari measurement. Midrange-phone frame rate
  is unmeasured.
- Headless cannot confirm a real window blur; the regression dispatches a synthetic
  blur and records that boundary explicitly (`realBlurDeliveredHeadless: false`).
- The 420 shared projectile cap is documented and instrumented but not yet observed
  as actually reached in a normal wave-2 run.
- Physical touch ergonomics, the audible mix and user enjoyment remain unverified.
- This is a two-wave feel slice, not the finished 10-20 minute roguelike, and it has
  no user acceptance yet.
