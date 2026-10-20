import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/sim";
import { DT } from "../src/data";
import { DURATIONS } from "../src/expedition";

// Synthetic lifecycle fixture. This isolates W20 by placing an untouched
// expedition game just before the boss time boundary and removing ordinary
// spawns, pockets and weapons. It is not a legal/reachable-run or normal-play
// claim.
function w20Boundary() {
  const g = new Game(2, "expedition20");
  g.enterExpeditionWave(20);
  g.enemies = [];
  g.bullets = [];
  g.guns = [];
  g.spawnTimer = Number.POSITIVE_INFINITY;
  g.expeditionBatches = [];
  g.pocketTimes = [];
  // Synthetic test-only clock boundary: this jump is not reachability evidence.
  g.waveTime = DURATIONS[19] - 18 - DT;
  return g;
}

function step(g: Game, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT)
    g.step(DT, { x: 0, y: 0 });
}

function endEvents(g: Game) {
  return g.events.filter((event) => event.type === "end").length;
}

function liveBosses(g: Game) {
  return g.enemies.filter((enemy) => enemy.kind === "boss" && enemy.hp > 0);
}

test("W20 real boss death reaches one sweep and one won end event", () => {
  const g = w20Boundary();
  g.events = [];

  assert.equal(liveBosses(g).length, 0);
  assert.equal(g.phase, "fight");
  step(g, DT);
  assert.equal(liveBosses(g).length, 1);
  const boss = liveBosses(g)[0];
  assert(boss, "W20 boss did not spawn at the 57s boundary");
  assert.equal(g.bossSpawned, true);
  assert.equal(g.bossKilled, false);
  assert.equal(boss.hp, 6400);
  assert.equal(boss.maxHp, 6400);
  assert.equal(boss.bossStage, 4);
  assert.equal(boss.born, 0.65 - DT);

  g.hit(boss, 1, g.player);
  assert.equal(boss.hp, 6400, "real hit must be ignored during born warning");
  assert.equal(g.bossKilled, false);

  step(g, 0.65);
  assert.equal(boss.born, 0);
  const killsBefore = g.kills;
  g.hit(boss, boss.hp, g.player);
  assert.equal(g.kills, killsBefore + 1);
  assert.equal(g.bossKilled, true);
  assert(boss.hp <= 0);
  assert.equal(liveBosses(g).length, 0);
  assert.equal(g.events.filter((event) => event.type === "explode").length, 1);
  assert(
    g.fx.some(
      (fx) => fx.kind === "blast" && fx.color === "#efaa39" && fx.size === 130,
    ),
    "boss death must create the gold 130-unit blast",
  );
  assert.equal(endEvents(g), 0);

  // Synthetic test-only clock boundary: skip ahead to the real sweep boundary;
  // this does not claim the boss fight can be survived or reached normally.
  g.waveTime = DURATIONS[19] - DT;
  assert.equal(g.phase, "fight");
  step(g, DT);
  assert.equal(g.waveTime, DURATIONS[19]);
  assert.equal(g.phase, "sweep");
  assert.equal(endEvents(g), 0);

  step(g, 1);
  assert.equal(g.phase, "won");
  assert.equal(g.stop, "end");
  assert(g.player.hp > 0);
  assert.equal(endEvents(g), 1);

  const hpAfterVictory = g.player.hp;
  const moneyAfterVictory = g.money;
  step(g, 1);
  g.nextWave();
  assert.equal(g.phase, "won");
  assert.equal(g.stop, "end");
  assert.equal(g.player.hp, hpAfterVictory);
  assert.equal(g.money, moneyAfterVictory);
  assert.equal(endEvents(g), 1, "victory must settle exactly once");
});

test("W20 alive boss past 90s reaches one lost end event", () => {
  const g = w20Boundary();
  g.events = [];

  assert.equal(liveBosses(g).length, 0);
  assert.equal(g.phase, "fight");
  step(g, DT);
  assert.equal(liveBosses(g).length, 1);
  const boss = liveBosses(g)[0];
  assert(boss, "W20 boss did not spawn at the 57s boundary");
  assert.equal(g.bossSpawned, true);
  assert.equal(g.bossKilled, false);
  assert.equal(boss.hp, 6400);
  assert.equal(boss.bossStage, 4);

  g.hit(boss, 1, g.player);
  assert.equal(boss.hp, 6400, "real hit must be ignored during born warning");
  assert.equal(g.bossKilled, false);

  step(g, 0.65);
  assert.equal(boss.born, 0);

  // Synthetic test-only clock boundary: jump to the deadline without
  // simulating the intervening fight. This is not normal-play evidence.
  const deadline = DURATIONS[19] + 15;
  g.waveTime = deadline - DT;
  step(g, DT);
  assert.equal(g.phase, "fight");
  assert(g.player.hp > 0);
  assert.equal(liveBosses(g).length, 1);
  assert.equal(endEvents(g), 0);

  step(g, DT);
  assert(g.waveTime > deadline);
  assert.equal(g.phase, "lost");
  assert(
    g.waveTime - deadline <= 3 * DT,
    "deadline loss must resolve within 3 steps",
  );
  assert(g.player.hp > 0);
  assert.equal(endEvents(g), 1);

  step(g, 1);
  assert.equal(g.phase, "lost");
  assert.equal(endEvents(g), 1, "deadline defeat must settle exactly once");
});
