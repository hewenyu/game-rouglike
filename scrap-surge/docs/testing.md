# Validation evidence and boundaries

## Automated rules
19 tests cover automatic first kill, one-time death settlement, multigeneration
explosions, budgeted queue retention, pickup uniqueness, pickup->kill->explosion->drop
feedback, stacked mod validation, magnetic burst counting, shop transactions, isolated
shop RNG, incoming-damage reservations, stale targets, pause, movement, loss/retry,
end-of-wave sweep, victory/deadline and 20 seeded stress simulations with 180 enemies
and 420 initial bullets. These are finite samples, not a proof of all builds/seeds.
The stress test establishes bounds/finite state, not real-device frame-rate fitness.

## Browser method and first observation
Installed Google Chrome 155.0.8059.80, headless Playwright, macOS 26.6.2 / Apple M4,
1440x960, DPR 1. Normal WASD movement, visible shop purchases, two visible mod choices.
Only read-only metrics were inspected; no HP/timer/entity writes or invulnerability.
Seed 0x2a: first kill at 1.23s, first pickup at 3.43s. Normal victory at simulation time
57.02s (20+35 seconds and two 1-second sweeps), 266 kills, 709 spawned projectiles,
4/10 health. Equipment: popper/rocket/coil/shotgun/saw; popcorn+domino mods.

Pause, resize, reset and a genuine emulated touch stream were exercised. A 390x844
DPR2 Chrome mobile context moved and auto-fired, then cancelled a touch and resumed
without ghost movement. This is not physical phone testing. Browser errors: none.

Frame intervals: final 1800 active samples, median 16.7ms, p95 16.7ms in this headless
run. Measurements use raw rAF timestamps (not capped simulation delta). They include
normal browser execution but are neither GPU profiling nor peak-load/mobile claims.
No physical-device performance measurement yet. Target: 60fps desktop; midrange phone
budget needs real-device evidence. "Capped arrays" is not a performance benchmark.

## Current test scope
This is a two-wave loop and a user-feel checkpoint. The next most valuable test is
whether the user can feel the second-wave feedback build taking over, not adding
more waves before the core is accepted. Physical phone ergonomics, Safari, actual
audible mix and user enjoyment remain unverified. No user acceptance of this version.
