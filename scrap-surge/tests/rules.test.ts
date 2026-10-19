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
