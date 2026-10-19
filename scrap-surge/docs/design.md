# 废潮 / SCRAP SURGE

User decision: completely reject drawing/folding combat. Borrow only Brotato's
experience traits: moving while auto-firing, many simultaneous weapons, readable
swarming enemies, collecting drops and shopping between short waves. Do not borrow
its potato character, weapons artwork, UI layout or world symbols.

Opus proposed a hermit crab wearing beach-scrap weapons and a warm-sand sticker
visual identity. DeepSeek flagged stationary dominance, overkill from simultaneous
auto-targeting, and recursive kill effects. Coordinator selects this direction and
limits the first delivery to two waves and one shop, about 55 seconds of combat.

Weapons change attack geometry and rhythm. Free shop modifications alter drops or
kill chains. Weapons are visible on the shell. Left-hand movement is the only
required control; auto-aim and auto-fire are part of the contract, not upgrades.

The old game was technically functional but rejected by actual user play. That
result takes precedence over all model design approval. This slice must be shown
for new user feedback before claiming the concept works or expanding its scope.

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
