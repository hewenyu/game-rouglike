import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/sim";
import { DT } from "../src/data";
import { DURATIONS } from "../src/expedition";

// Synthetic lifecycle fixture. This isolates W20 by placing an untouched
// expedition game at the boss time boundary and removing ordinary spawns,
// pockets and weapons. It is not a legal/reachable-run or normal-play claim.
function w20Boundary() {
  const g = new Game(2, "expedition20");
  g.enterExpeditionWave(20);
  g.enemies = [];
  g.bullets = [];
  g.guns = [];
  g.spawnTimer = Number.POSITIVE_INFINITY;
  g.expeditionBatches = [];
  g.pocketTimes = [];
  g.waveTime = DURATIONS[19] - 18;
  return g;
}

function step(g: Game, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT)
    g.step(DT, { x: 0, y: 0 });
}

function endEvents(g: Game) {
  return g.events.filter((event) => event.type === "end").length;
}

test("W20 real boss death reaches one sweep and one won end event", () => {
  const g = w20Boundary();
  g.events = [];

  step(g, DT);
  const boss = g.enemies.find((enemy) => enemy.kind === "boss");
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
  assert.equal(endEvents(g), 0);

  step(g, DURATIONS[19] - g.waveTime + DT);
  assert.equal(g.phase, "sweep");
  assert.equal(endEvents(g), 0);

  step(g, 1 + DT);
  assert.equal(g.phase, "won");
  assert.equal(g.stop, "end");
  assert.equal(endEvents(g), 1);

  step(g, 1);
  assert.equal(g.phase, "won");
  assert.equal(endEvents(g), 1, "victory must settle exactly once");
});

test("W20 alive boss past 90s reaches one lost end event", () => {
  const g = w20Boundary();
  g.events = [];

  step(g, DT);
  const boss = g.enemies.find((enemy) => enemy.kind === "boss");
  assert(boss, "W20 boss did not spawn at the 57s boundary");
  assert.equal(g.bossSpawned, true);
  assert.equal(g.bossKilled, false);
  assert.equal(boss.hp, 6400);

  step(g, 0.65);
  assert.equal(boss.born, 0);
  g.hit(boss, 1, g.player);
  assert.equal(boss.hp, 6399);
  assert.equal(g.bossKilled, false);

  step(g, DURATIONS[19] + 15 - g.waveTime + 2 * DT);
  assert.equal(g.phase, "lost");
  assert.equal(endEvents(g), 1);

  step(g, 1);
  assert.equal(g.phase, "lost");
  assert.equal(endEvents(g), 1, "deadline defeat must settle exactly once");
});
