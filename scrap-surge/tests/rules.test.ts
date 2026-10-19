import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/sim";
import { DT, W, H } from "../src/data";
function step(g: Game, n: number, x = 0, y = 0) {
  for (let i = 0; i < n; i++) g.step(DT, { x, y });
}
function empty() {
  const g = new Game(123);
  g.enemies = [];
  g.spawnTimer = 999;
  return g;
}
function enemy(g: Game, x = 600, y = 300, hp = 17) {
  g.spawn("bag", { x, y });
  const e = g.enemies.at(-1)!;
  e.born = 0;
  e.hp = hp;
  e.maxHp = hp;
  return e;
}

test("automatic weapon gets first kill within five seconds without attack input", () => {
  const g = new Game(42);
  step(g, 300);
  assert(g.kills > 0);
  assert(g.firstKill !== null && g.firstKill <= 5);
  assert(g.shots > 0);
});
test("damage settles each death once, including secondary explosions", () => {
  const g = empty();
  g.mods = ["domino"];
  const e = enemy(g);
  g.hit(e, 30, g.player, "secondary");
  g.hit(e, 30, g.player);
  assert.equal(g.kills, 1);
  assert.equal(g.scraps.length, 1);
  assert.equal(g.pendingBlasts.length, 1);
});
test("explosion kills create further queued explosions, not depth-one decoration", () => {
  const g = empty();
  g.mods = ["domino"];
  enemy(g, 600, 200);
  enemy(g, 650, 200);
  enemy(g, 700, 200);
  g.hit(g.enemies[0], 20, g.player);
  step(g, 1);
  assert.equal(g.kills, 3);
  assert.equal(g.pendingBlasts.length, 0);
});
test("large chain is bounded per frame but its unprocessed work is retained", () => {
  const g = empty();
  g.mods = ["domino"];
  for (let i = 0; i < 70; i++)
    enemy(g, 600 + (i % 10) * 6, 200 + Math.floor(i / 10) * 6);
  g.hit(g.enemies[0], 30, g.player);
  step(g, 1);
  assert.equal(g.kills, 70);
  assert(g.pendingBlasts.length > 0);
  step(g, 8);
  assert.equal(g.pendingBlasts.length, 0);
  assert.equal(g.kills, 70);
  assert.equal(g.scraps.length, 70);
});
test("pickup gives money once and popcorn creates real damaging shots", () => {
  const g = empty();
  g.mods = ["popcorn"];
  enemy(g, 670, 450, 100);
  const s = { x: 600, y: 450, id: 100, value: 2, vx: 0, vy: 0, age: 1 };
  g.collect(s);
  g.collect(s);
  assert.equal(g.money, 2);
  assert.equal(g.picked, 1);
  assert.equal(g.bullets.filter((b) => b.kind === "bonus").length, 2);
  step(g, 15);
  assert(g.enemies[0].hp < 100);
});
test("pickup-to-kill-to-explosion-to-drop feedback closes in simulation", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["popcorn", "domino"];
  enemy(g, 650, 450);
  enemy(g, 680, 450);
  g.scraps.push({ x: 600, y: 450, id: 999, value: 2, vx: 0, vy: 0, age: 1 });
  step(g, 90);
  assert.equal(g.kills, 2);
  assert(g.picked >= 3);
  assert(g.shots >= 2);
});
test("two modifications stack; duplicate and third choices cannot leak through", () => {
  const g = empty();
  g.phase = "shop";
  assert(g.chooseMod("popcorn"));
  assert(g.chooseMod("domino"));
  assert(!g.chooseMod("magnet"));
  assert(!g.chooseMod("popcorn"));
  assert.deepEqual(g.mods, ["popcorn", "domino"]);
});
test("magnet burst happens every eight unique pickups, not every frame", () => {
  const g = empty();
  g.mods = ["magnet"];
  for (let i = 0; i < 8; i++)
    g.collect({ x: 600, y: 450, id: i, value: 1, vx: 0, vy: 0, age: 0 });
  assert.equal(g.bullets.length, 10);
  assert.equal(g.magnetRadius, 300);
  step(g, 1);
  assert.equal(g.bullets.length, 10);
});
test("shop transaction cannot overspend, rebuy sold item, or exceed six slots", () => {
  const g = empty();
  g.phase = "shop";
  assert(!g.buy(0));
  g.money = 500;
  assert(g.buy(0));
  const left = g.money;
  assert(!g.buy(0));
  assert.equal(g.money, left);
  for (let i = 0; i < 8; i++) {
    g.reroll();
    g.buy(0);
  }
  assert.equal(g.guns.length, 6);
  assert(g.money >= 0);
});
test("free reroll once; later rerolls cost six and use isolated seeded stream", () => {
  const a = empty(),
    b = empty();
  a.phase = "shop";
  b.phase = "shop";
  for (let i = 0; i < 50; i++) a.random();
  assert(a.reroll());
  assert(b.reroll());
  assert.deepEqual(a.offers, b.offers);
  assert.equal(a.money, 0);
  assert(!a.reroll());
  a.money = 6;
  assert(a.reroll());
  assert.equal(a.money, 0);
});
test("multiple single-target guns reserve incoming damage instead of overkilling", () => {
  const g = empty();
  enemy(g, 650, 400);
  enemy(g, 550, 400);
  g.guns.push({ id: "slinger", cooldown: 0, angle: 0, recoil: 0 });
  g.guns[0].cooldown = 0;
  g.weapons(DT);
  const targets = g.bullets.map((b) => b.target);
  assert.equal(new Set(targets).size, 2);
});
test("one slinger does not get stuck forever with dead or stale reserved targets", () => {
  const g = empty();
  const e = enemy(g, 600, 300);
  step(g, 100);
  assert(e.hp <= 0);
  enemy(g, 650, 300);
  step(g, 100);
  assert.equal(g.kills, 2);
});
test("pause freezes combat, queued chains and pickups; resume continues", () => {
  const g = empty();
  g.mods = ["domino"];
  enemy(g);
  g.hit(g.enemies[0], 30, g.player);
  g.pause();
  const t = g.time;
  step(g, 1200, 1, 1);
  assert.equal(g.time, t);
  assert.equal(g.pendingBlasts.length, 1);
  g.resume();
  step(g, 1);
  assert.equal(g.pendingBlasts.length, 0);
});
test("diagonal movement normalized and bounds maintained", () => {
  const a = empty(),
    b = empty();
  step(a, 30, 1, 0);
  step(b, 30, 1, 1);
  assert(
    Math.abs(
      Math.hypot(b.player.x - 600, b.player.y - 450) - (a.player.x - 600),
    ) < 0.001,
  );
  step(a, 1000, 1, -1);
  assert(a.player.x <= W - 30 && a.player.y >= 30);
});
test("damage invulnerability, terminal defeat and retry initialization", () => {
  const g = empty();
  g.player.invulnerable = 0;
  g.hurt();
  g.hurt();
  assert.equal(g.player.hp, 9);
  for (let i = 0; i < 9; i++) {
    g.player.invulnerable = 0;
    g.hurt();
  }
  assert.equal(g.phase, "lost");
  const t = g.time;
  step(g, 100);
  assert.equal(g.time, t);
  const n = new Game(g.seed);
  assert.equal(n.player.hp, 10);
  assert.equal(n.guns.length, 1);
  assert.equal(n.mods.length, 0);
});
test("wave sweep collects leftovers exactly once, then shop freezes time", () => {
  const g = empty();
  g.waveTime = 19.99;
  g.scraps = [{ x: 20, y: 20, id: 1, value: 7, vx: 0, vy: 0, age: 0 }];
  step(g, 70);
  assert.equal(g.phase, "shop");
  assert.equal(g.money, 7);
  const t = g.time;
  step(g, 90);
  assert.equal(g.money, 7);
  assert.equal(g.time, t);
});
test("second wave heals, keeps equipment, and has reachable victory condition", () => {
  const g = empty();
  g.phase = "shop";
  g.money = 100;
  g.buy(0);
  g.chooseMod("domino");
  g.chooseMod("popcorn");
  g.player.hp = 3;
  g.nextWave();
  assert.equal(g.player.hp, 6);
  assert.equal(g.guns.length, 2);
  assert.equal(g.mods.length, 2);
  g.waveTime = 34.99;
  g.bossKilled = true;
  step(g, 70);
  assert.equal(g.phase, "won");
});
test("boss deadline reaches defeat rather than infinite overtime", () => {
  const g = empty();
  g.wave = 2;
  g.waveTime = 49.99;
  g.bossSpawned = true;
  step(g, 2);
  assert.equal(g.phase, "lost");
});
test("stress caps and finite coordinates for 20 seeds with 180 hostiles", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const g = new Game(seed);
    g.enemies = [];
    g.mods = ["domino", "popcorn"];
    for (let i = 0; i < 220; i++)
      g.spawn("bag", { x: 40 + g.random() * 1120, y: 40 + g.random() * 720 });
    assert.equal(g.enemies.length, 180);
    for (let i = 0; i < 500; i++) g.shoot(g.player, i, 18);
    assert.equal(g.bullets.length, 420);
    step(g, 120, 1, 0);
    for (const e of [...g.enemies, ...g.bullets, ...g.scraps])
      assert(Number.isFinite(e.x) && Number.isFinite(e.y));
    assert(g.fx.length <= 300);
    assert(g.scraps.length <= 250);
  }
});
test("combat pickups advance magnet charge while sweep pickups do not", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["magnet"];
  const scrap = (i: number) => ({
    x: 600,
    y: 450,
    id: i,
    value: 1,
    vx: 0,
    vy: 0,
    age: 0,
  });
  for (let i = 0; i < 7; i++) g.collect(scrap(i));
  assert.equal(g.combatPicked, 7);
  assert.equal(g.bullets.length, 0);
  g.phase = "sweep";
  for (let i = 0; i < 5; i++) g.collect(scrap(100 + i));
  assert.equal(g.picked, 12);
  assert.equal(g.combatPicked, 7);
  assert.equal(g.bullets.length, 0);
  g.phase = "fight";
  g.collect(scrap(200));
  assert.equal(g.combatPicked, 8);
  assert.equal(g.bullets.length, 10);
});
test("timed enemy pockets spawn at the fixed wave-1 times and count", () => {
  const g = empty();
  g.guns = [];
  assert.deepEqual(g.pocketTimes, [6, 14]);
  assert.equal(g.pocketSize, 12);
  g.waveTime = 5;
  step(g, 61);
  assert.equal(g.pocketIndex, 1);
  assert.equal(g.enemies.length, 12);
  g.waveTime = 13;
  step(g, 61);
  assert.equal(g.pocketIndex, 2);
  assert.equal(g.enemies.length, 24);
});
test("wave-1 base spawn rate matches the fixed 3.1 per second", () => {
  const g = empty();
  g.guns = [];
  g.pocketTimes = [];
  g.player.hp = 9999;
  g.player.maxHp = 9999;
  g.spawnTimer = 0;
  step(g, 60 * 10);
  assert(g.spawnCount >= 30 && g.spawnCount <= 32);
});
test("chain count reports real secondary deaths, not the primary root kill", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  enemy(g, 600, 200);
  enemy(g, 640, 200);
  enemy(g, 680, 200);
  g.hit(g.enemies[0], 30, g.player);
  step(g, 1);
  assert.equal(g.kills, 3);
  // One primary root plus two explosion deaths: only the two secondary deaths
  // are counted, so the peak chain is 2 rather than a faked 3.
  assert.equal(g.chainPeak, 2);
  assert.equal(g.chainCount, 2);
});
test("a lone weapon kill never fabricates a chain", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  const e = enemy(g, 600, 300);
  g.hit(e, 30, g.player);
  step(g, 1);
  assert.equal(g.kills, 1);
  assert.equal(g.chainCount, 0);
  assert.equal(g.chainPeak, 0);
});
test("primary radius damage does not count as a chain", () => {
  const g = empty();
  g.guns = [];
  g.mods = [];
  for (let i = 0; i < 5; i++) enemy(g, 600 + i * 10, 300);
  g.explode({ x: 600, y: 300 }, 92, 30, true);
  step(g, 1);
  assert.equal(g.kills, 5);
  assert.equal(g.chainCount, 0);
  assert.equal(g.chainPeak, 0);
});
test("interleaved chains keep separate per-root counts", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  enemy(g, 200, 200);
  enemy(g, 240, 200);
  enemy(g, 280, 200);
  enemy(g, 900, 600);
  enemy(g, 940, 600);
  enemy(g, 980, 600);
  g.hit(g.enemies[0], 30, g.player);
  g.hit(g.enemies[3], 30, g.player);
  step(g, 1);
  assert.equal(g.kills, 6);
  // Two chains of two secondary deaths each; they must not sum into a fake 4.
  assert.equal(g.chainPeak, 2);
  // chainCounts is a working set of roots with queued work; here every blast
  // drains inside one tick, so it must never hold more roots than existed.
  assert(g.chainCounts.size <= 2);
});
test("finished chain roots are reclaimed during sustained chain activity", () => {
  const g = empty();
  g.guns = [];
  g.mods = [];
  const a1 = enemy(g, 600, 300, 10);
  const a2 = enemy(g, 640, 300, 10);
  g.hit(a1, 30, { x: 500, y: 300 }, "secondary", 0, 7);
  g.hit(a2, 30, { x: 500, y: 300 }, "secondary", 0, 7);
  assert.equal(g.chainCounts.get(7), 2);
  // Keep a second chain busy for longer than the 0.8s decay window.
  for (let i = 0; i < 80; i++) {
    const e = enemy(g, 900, 300, 10);
    g.hit(e, 30, { x: 800, y: 300 }, "secondary", 0, 9);
    step(g, 1);
  }
  assert.equal(g.chainCounts.has(7), false);
  // Chain 9 produced no queued work either, so it is reclaimed on the same tick
  // and its counter restarts instead of accumulating across ticks. The xN readout
  // is kept by the separate decaying scalar, which still holds chain 7's peak.
  assert.equal(g.chainCounts.size, 0);
  assert.equal(g.chainCount, 2);
});
test("a root with queued work survives until its queue drains", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  for (let i = 0; i < 40; i++)
    enemy(g, 600 + (i % 8) * 8, 200 + Math.floor(i / 8) * 8, 10);
  g.hit(g.enemies[0], 30, g.player);
  step(g, 1);
  assert(g.pendingBlasts.length > 0);
  assert(g.chainCounts.size > 0);
  let guard = 0;
  while (g.pendingBlasts.length && guard++ < 600) step(g, 1);
  assert.equal(g.pendingBlasts.length, 0);
  assert.equal(g.chainCounts.size, 0);
});
test("pending blast peak is recorded and the queue drains fully", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  for (let i = 0; i < 40; i++)
    enemy(g, 600 + (i % 8) * 8, 200 + Math.floor(i / 8) * 8);
  g.hit(g.enemies[0], 30, g.player);
  step(g, 1);
  assert(g.pendingPeak > 12);
  let guard = 0;
  while (g.pendingBlasts.length && guard++ < 600) step(g, 1);
  assert.equal(g.pendingBlasts.length, 0);
  assert.equal(g.kills, 40);
});
test("lethal spring-fist hit leaves a remnant that bowls another enemy", () => {
  const g = empty();
  g.guns = [{ id: "fist", cooldown: 0, angle: 0, recoil: 0 }];
  const victim = enemy(g, 700, 450, 17);
  const neighbour = enemy(g, 740, 450, 500);
  step(g, 1);
  assert(victim.hp <= 0);
  assert.equal(g.corpses.length, 1);
  g.guns = [];
  step(g, 60);
  assert.equal(g.corpses.length, 0);
  assert.equal(neighbour.hp, 470);
});
test("remnant never damages the player and is not a live enemy", () => {
  const g = empty();
  g.guns = [{ id: "fist", cooldown: 0, angle: 0, recoil: 0 }];
  g.player.invulnerable = 0;
  enemy(g, 700, 450, 17);
  step(g, 1);
  assert.equal(g.corpses.length, 1);
  g.guns = [];
  const k = g.corpses[0];
  k.x = g.player.x;
  k.y = g.player.y;
  k.vx = 0;
  k.vy = 0;
  const hp0 = g.player.hp;
  step(g, 30);
  assert.equal(g.player.hp, hp0);
  assert(!g.enemies.some((e) => e.id === k.id));
});
test("remnants are capped at 180 and cleared at the wave boundary", () => {
  const g = empty();
  g.guns = [];
  for (let i = 0; i < 200; i++) {
    const e = enemy(g, 100 + (i % 20) * 8, 100 + Math.floor(i / 20) * 8, 17);
    g.spawnCorpse(e, { x: e.x - 10, y: e.y });
  }
  assert.equal(g.corpses.length, 180);
  g.waveTime = 20 - DT;
  step(g, 1);
  assert.equal(g.phase, "sweep");
  assert.equal(g.corpses.length, 0);
});
test("remnant kills drop loot and count as secondary chain deaths", () => {
  const g = empty();
  g.guns = [{ id: "fist", cooldown: 0, angle: 0, recoil: 0 }];
  enemy(g, 700, 450, 17);
  const other = enemy(g, 740, 450, 20);
  step(g, 1);
  g.guns = [];
  step(g, 60);
  assert(other.hp <= 0);
  assert.equal(g.kills, 2);
  const loot = g.earned + g.scraps.reduce((sum, s) => sum + s.value, 0);
  assert(loot >= 4);
  assert.equal(g.chainPeak, 1);
});
test("overtime exposes a live countdown instead of a frozen zero", () => {
  const g = empty();
  g.wave = 2;
  g.waveTime = 34.9;
  g.bossSpawned = true;
  step(g, 30);
  assert(g.overtime);
  assert(g.displaySeconds > 0 && g.displaySeconds <= 15);
  g.bossKilled = true;
  assert(!g.overtime);
});
test("spawnCount counts successful spawns, not cap-rejected attempts", () => {
  const g = empty();
  g.guns = [];
  g.player.hp = 9999;
  g.player.maxHp = 9999;
  for (let i = 0; i < 180; i++)
    g.spawn("bag", { x: 40 + (i % 20) * 6, y: 40 + Math.floor(i / 20) * 6 });
  assert.equal(g.enemies.length, 180);
  const before = g.spawnCount;
  g.spawnTimer = 0;
  step(g, 120);
  assert.equal(g.enemies.length, 180);
  assert.equal(g.spawnCount, before);
});
