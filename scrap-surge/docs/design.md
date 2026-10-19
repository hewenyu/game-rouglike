# 废潮 / SCRAP SURGE

User decision: completely reject drawing/folding combat. Borrow only Brotato's
experience traits: moving while auto-firing, many simultaneous weapons, readable
swarming enemies, collecting drops and shopping between short waves. Do not borrow
its potato character, weapons artwork, UI layout or world symbols.

Opus proposed a hermit crab wearing beach-scrap weapons and a warm-sand sticker
visual identity. DeepSeek flagged stationary dominance, overkill from simultaneous
auto-targeting, and recursive kill effects. Astra selects this direction and, with
Opus and DeepSeek agreeing, limits the first delivery to two waves and one shop,
about 55 seconds of combat, as a slice toward the 10-20 minute goal.

Current target (user playtest, 2026-10-19): the slice's wave count is too low. The
base flow is now planned around **at least 20 waves**, with the build forming
gradually and the over-fast / over-slow build-formation pace brought under control.
The earlier 12-wave idea is void; the 4-wave build-difference check is an internal
experiment only. The 10-20 minute run target still stands and is reconciled with 20
waves plus shop pacing in a later three-party review, not silently stretched to 30
minutes. This feedback covers only wave count and build pacing - it is not an
aesthetic or feel acceptance of the slice. The 20-wave requirement is the user's
explicit goal, not a pending proposal; the concrete implementation plan is what awaits
three-party review, and no unilateral expansion is authorized. The current page is
still the two-wave slice.

Weapons change attack geometry and rhythm. Free shop modifications alter drops or
kill chains. Weapons are visible on the shell. Left-hand movement is the only
required control; auto-aim and auto-fire are part of the contract, not upgrades.

The old game was technically functional but rejected by actual user play. That
result takes precedence over all model design approval. The user has authorized
autonomous, reversible work while Astra, Opus and DeepSeek explicitly agree on each
step. That authorization is permission to proceed, not user acceptance: it must never
be written up as the user approving the concept, the feel or the visuals.

## User clarification: positive-feedback builds
The user explicitly requires "左脚踩右脚上天": build synergies should break through
the baseline, not be balanced into near-equivalence. Strong completed builds may
clear mobs with little movement; that is not automatically a QA failure.

Two free, stackable shop modifications create real feedback: enemy death -> scrap ->
pickup projectiles -> enemy death and explosions -> more scrap. Secondary kills do
trigger more explosions. Each enemy settles death once; explosion work uses a queue
with a per-frame processing budget (12), retaining remaining work. Limits protect
termination/performance rather than pretending chains happen while disabling them.

Gun roles: rapid cap popper, five-pellet shotgun, orbiting fork, five-target lightning,
homing soda rocket with radius damage, heavy spring fist with enemy bowling.
Auto-targeting reserves expected damage from in-flight targeted projectiles so two
single-target guns do not knowingly spend both shots on the same nearly-dead target.
Unassigned shotgun pellets and area damage can still overkill; no claim of optimal aim.

Safety limits: enemies 180, projectiles 420, drop objects 250 (merge excess value),
visual effects 300. No external assets or backend. Low-level geometry is copied from
our own rejected prototype; no rejected drawing mechanics or UI are reused.

## Frozen slice rules (S1 + S1b)

Player readability: the player is drawn at 1.3x with an ivory shell, teal accents, a
white rim and a complete translucent teal ground ring. Enemies stay orange-red.
Collision geometry is unchanged; only the drawing scales.

Spawn rates: wave 1 spawns a base of 3.1 enemies per second, wave 2 4.2. Wave 1 adds
a pocket of 12 at 6s and 14s; wave 2 adds a pocket of 18 at 5/12/19/26/32s. A pocket
centre spawns at least 310 world units from the player, so an individual enemy in the
ring is still at least 235 units away; every enemy keeps the 0.65s born warning.
Spawn rates are fixed, not matched to player damage.

Magnet accounting: `combatPicked` counts only pickups collected while the phase is
`fight`. Sweep pickups still pay money and still count in `picked`, but they never
advance the magnet charge, and the remainder carries across the wave boundary. No
retroactive burst is granted.

Explosion queue: a kill appends a blast to `pendingBlasts`. At most 12 are processed
per tick; the rest stay queued in FIFO order and are never silently dropped. The
queue peak is recorded in `pendingPeak`. Remaining queued blasts are cancelled at the
wave boundary, which is a documented boundary, not a silent loss.

Explosion palette (approved, recorded here so it cannot drift again): explosions are
saturated orange-yellow - flash core `#FFD24A`, outer shock stroke `#FF8A2A`, plus a
white shock ring and flying debris. Primary weapon blasts and chain (secondary)
blasts use that same family and are told apart by size and lifetime, never by a new
hue. The frozen slice shipped secondary blasts in the player teal `#3FD0A8`; Opus
blocked that and the value is restored to the approved family. The values live in
`BLAST` in `src/data.ts` so simulation and rendering share one source.

Chain counting: a chain is the set of real secondary deaths caused by queued
explosions. `nextChainId` is a monotonic allocator; counts are kept per causal root
in `chainCounts`, so interleaved chains cannot inflate each other. `chainCounts` is a
working set: every step it keeps only roots still referenced by a queued blast or a
live remnant and drops the rest, so a long run cannot accumulate finished roots even
when secondary kills keep refreshing the display timer. The `xN` readout is a
separate scalar that holds the strongest chain reached and decays after 0.8s. A
primary weapon kill, including a rocket's radius damage, never fabricates a chain -
it only starts a new chain id. The HUD shows `xN` only when that peak reached at
least two secondary deaths.

Spring-fist remnant (S1b): a lethal fist hit leaves a remnant for 0.6s with 650
initial speed and decay 7. It deals 30 damage, once per enemy, and does not re-die or
re-drop. Remnant kills give normal drops, can trigger domino and count as secondary
chain deaths. The remnant never damages the player, is never targeted, does not
occupy the 180 live-enemy cap and keeps its own cap of 180.

Overtime: wave 2 runs to 35s; if the boss is still alive the run continues to 50s and
the HUD shows a live 15s "加时 · 击败首领" countdown instead of a frozen zero. No
combat rule changes in overtime.

Fair accounting: `spawnCount` counts successful spawns only, never attempts rejected
by the enemy cap. The 420 projectile cap is shared between player and enemy bullets;
this is documented and recorded rather than changed in this slice.
