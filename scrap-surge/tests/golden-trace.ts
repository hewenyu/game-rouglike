// Behavior lock for refactors. Runs whole headless games (slice and
// expedition20) with a fixed movement bot and a fixed shop policy, hashing a
// state snapshot every step. Two source trees with equal output produce the same
// game for these seeds, so a pure refactor must leave the digest unchanged.
//
//   npx tsx tests/golden-trace.ts > /tmp/before.json   # on the base commit
//   npx tsx tests/golden-trace.ts > /tmp/after.json    # on the refactor
//   diff /tmp/before.json /tmp/after.json
//
// Uses only public Game actions (no state injection). Not a balance measurement.
import { createHash } from "node:crypto";
import { DT, type ModId } from "../src/data";
import { Game } from "../src/sim";
import { movementInput } from "./p3-driver";

const SEEDS = [1, 42, 145, 2024];
const STEP_CAP = 60 * 60 * 25;

// Every scalar field on Game (counters, timers, flags), so a refactor that
// drifts any instrument shows up too.
function scalars(g: Game) {
  return Object.entries(g).filter(
    ([, v]) => v === null || ["number", "string", "boolean"].includes(typeof v),
  );
}

function snapshot(g: Game) {
  return {
    scalars: scalars(g),
    phase: g.phase,
    wave: g.wave,
    time: g.time,
    waveTime: g.waveTime,
    player: g.player,
    money: g.money,
    earned: g.earned,
    kills: g.kills,
    picked: g.picked,
    shots: g.shots,
    hits: g.hits,
    damageTaken: g.damageTaken,
    chainPeak: g.chainPeak,
    guns: g.guns,
    mods: g.mods,
    inventory: g.inventory,
    statRewards: g.statRewards,
    offers: g.offers,
    itemOffers: g.itemOffers,
    enemies: g.enemies.map((e) => [e.kind, e.x, e.y, e.hp]),
    bullets: g.bullets.map((b) => [b.kind, b.x, b.y]),
    scraps: g.scraps.map((s) => [s.x, s.y]),
    chests: g.chests.map((c) => [c.x, c.y]),
    corpses: g.corpses.map((c) => [c.x, c.y]),
    fx: g.fx.map((f) => [f.kind, f.x, f.y, f.life, f.color, f.text]),
    trail: g.trailPoints.length,
    pending: g.pendingBlasts.length,
    events: g.events.map((e) => e.type),
    queueMetrics: g.queueMetrics,
    purchaseRecords: [...g.purchaseRecords],
  };
}

// "buyer" buys everything it can (and sells now and then); "idle" stands
// still and buys nothing, so it loses and covers the death paths.
type Policy = "buyer" | "idle";

function rest(g: Game, policy: Policy) {
  if (g.mode === "slice") {
    for (const id of ["popcorn", "domino", "magnet"] as ModId[])
      if (g.mods.length < 2) g.chooseMod(id);
    if (policy === "buyer") for (let i = 0; i < g.offers.length; i++) g.buy(i);
    g.nextWave();
    return;
  }
  if (policy === "idle") {
    g.nextWave();
    return;
  }
  if (g.pendingRewardChoices.length) g.claimCoreReward(0);
  if (g.frozenChest) {
    g.claimPendingItem(0);
    if (g.frozenChest) g.skipReward();
  }
  if (g.pendingStatChoices.length)
    g.chooseStatReward(g.wave % g.pendingStatChoices.length);
  if (g.wave % 4 === 0) g.sell(g.guns.length - 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < g.offers.length; i++) g.buyExpedition(i);
    for (let i = 0; i < g.itemOffers.length; i++) g.buyItem(i);
    if (pass === 0) g.rerollExpedition();
  }
  g.nextWave();
}

function run(seed: number, mode: "slice" | "expedition20", policy: Policy) {
  const g = mode === "slice" ? new Game(seed) : new Game(seed, mode);
  const hash = createHash("sha256");
  let steps = 0;
  while (steps < STEP_CAP && g.phase !== "won" && g.phase !== "lost") {
    if (g.phase === "shop") rest(g, policy);
    else if (g.phase === "quick") g.chooseQuick(g.wave % 2);
    else g.step(DT, policy === "idle" ? { x: 0, y: 0 } : movementInput(g));
    hash.update(JSON.stringify(snapshot(g)));
    g.drain();
    steps++;
  }
  return {
    seed,
    mode,
    policy,
    steps,
    phase: g.phase,
    wave: g.wave,
    money: g.money,
    kills: g.kills,
    digest: hash.digest("hex"),
  };
}

const results = [];
for (const policy of ["buyer", "idle"] as const)
  for (const mode of ["slice", "expedition20"] as const)
    for (const seed of SEEDS) results.push(run(seed, mode, policy));
console.log(JSON.stringify(results, null, 2));
