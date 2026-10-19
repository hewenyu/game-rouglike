import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/sim";
import { DT, BLAST, W, H } from "../src/data";
import { dist } from "../src/math";
import {
  BAG_HP,
  BOSS_STAGES,
  DURATIONS,
  HP_MULT,
  MIX,
  POCKETS,
  POCKET_MIX,
  RATES,
  STOP_AFTER,
  enemyHp,
  gunPrice,
  gunSlotCap,
  rerollPrice,
  tier2Capacity,
  tier2Price,
  waveRecovery,
} from "../src/expedition";
import type { Enemy } from "../src/sim";

const exp = (seed = 123) => new Game(seed, "expedition20");
const step = (g: Game, n: number, x = 0, y = 0) => {
  for (let i = 0; i < n; i++) g.step(DT, { x, y });
};
const empty = () => {
  const g = exp();
  g.enemies = [];
  g.spawnTimer = 999;
  g.expeditionBatches = [];
  return g;
};
const enemy = (
  g: Game,
  x = 600,
  y = 300,
  hp = 20,
  kind: "bag" | "runner" | "can" | "splitter" | "chip" | "spitter" = "bag",
) => {
  g.spawn(kind, { x, y });
  const e = g.enemies.at(-1)!;
  e.born = 0;
  e.hp = hp;
  e.maxHp = hp;
  return e;
};
const scrap = (i: number, value = 1) => ({
  x: 600,
  y: 450,
  id: i,
  value,
  vx: 0,
  vy: 0,
  age: 0,
  heat: 0,
});

test("expedition wave schedule and stops match the approved table", () => {
  assert.equal(DURATIONS.length, 20);
  assert.equal(
    DURATIONS.reduce((a, b) => a + b, 0),
    692,
  );
  assert.deepEqual(
    DURATIONS,
    [
      20, 22, 24, 26, 28, 28, 30, 30, 32, 40, 32, 34, 34, 36, 45, 38, 38, 40,
      40, 75,
    ],
  );
  assert.equal(STOP_AFTER.filter((v) => v === "full").length, 9);
  assert.equal(STOP_AFTER.filter((v) => v === "quick").length, 6);
  assert.equal(STOP_AFTER.filter((v) => v === "auto").length, 4);
  assert.equal(STOP_AFTER[19], "end");
  for (let i = 0; i < 20; i++) {
    assert.equal(MIX[i].length, 5);
    assert.equal(POCKET_MIX[i].length, 5);
    for (const [time] of POCKETS[i]) assert(time < DURATIONS[i]);
  }
  assert.deepEqual(RATES.slice(0, 3), [3.1, 3.4, 3.7]);
});

test("expedition starts with two slots and follows the slot and tier-II ramps", () => {
  assert.equal(gunSlotCap(1), 2);
  assert.equal(gunSlotCap(2), 3);
  assert.equal(gunSlotCap(4), 4);
  assert.equal(gunSlotCap(7), 5);
  assert.equal(gunSlotCap(11), 6);
  assert.deepEqual(
    [8, 10, 12, 14, 16, 18].map(tier2Capacity),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(tier2Capacity(7), 0);
  assert.equal(tier2Capacity(20), 6);
  const g = exp();
  assert.equal(g.guns.length, 1);
  assert.equal(g.slotCap, 2);
  assert.equal(g.guns[0].paid, 0);
  assert.equal(g.guns[0].tier, 1);
});

test("wave recovery is 3 through W10, 4 on expedition W11-W20, and always 3 for slice", () => {
  assert.deepEqual(
    [1, 2, 9, 10, 11, 12, 19, 20].map((wave) =>
      waveRecovery("expedition20", wave),
    ),
    [3, 3, 3, 3, 4, 4, 4, 4],
  );
  assert.deepEqual(
    [1, 2, 10, 11, 20].map((wave) => waveRecovery("slice", wave)),
    [3, 3, 3, 3, 3],
  );
});

test("expedition every wave-entry route uses recovery once, caps at 10, and cannot revive terminal states", () => {
  const quick = empty();
  quick.mods = ["popcorn"];
  quick.modTiers.set("popcorn", 1);
  quick.wave = 9;
  quick.phase = "quick";
  quick.quickPicked = true;
  quick.player.hp = 3;
  quick.nextWave();
  assert.equal(quick.wave, 10);
  assert.equal(quick.player.hp, 6);
  quick.nextWave();
  assert.equal(quick.player.hp, 6);

  const shop = empty();
  shop.wave = 10;
  shop.phase = "shop";
  shop.player.hp = 3;
  shop.nextWave();
  assert.equal(shop.wave, 11);
  assert.equal(shop.player.hp, 7);

  const auto = empty();
  auto.wave = 11;
  auto.phase = "interlude";
  auto.interludeRemaining = DT / 2;
  auto.player.hp = 3;
  step(auto, 1);
  assert.equal(auto.wave, 12);
  assert.equal(auto.player.hp, 7);

  const full = empty();
  full.wave = 10;
  full.phase = "shop";
  full.player.hp = 10;
  full.nextWave();
  assert.equal(full.player.hp, 10);

  const lost = empty();
  lost.phase = "lost";
  lost.player.hp = 0;
  const lostAttempt = lost.nextWave();
  assert.equal(lost.phase, "lost");
  assert.equal(lost.player.hp, 0);
  assert.equal(lostAttempt, undefined);

  const won = empty();
  won.phase = "won";
  won.player.hp = 1;
  const wonAttempt = won.nextWave();
  assert.equal(won.phase, "won");
  assert.equal(won.player.hp, 1);
  assert.equal(wonAttempt, undefined);
});

test("expedition constructor builds and fires both wave-1 pockets", () => {
  const g = exp(0x2a);
  g.guns = [];
  assert.deepEqual(
    g.expeditionBatches.map((b) => [b.time, b.count, b.formation]),
    [
      [6, 12, "ring"],
      [14, 12, "ring"],
    ],
  );
  step(g, 6 * 60 + 1);
  assert.equal(g.pocketBatches.length, 1);
  assert.equal(g.pocketBatches[0].spawned, 12);
  step(g, 8 * 60);
  assert.equal(g.pocketBatches.length, 2);
  assert.equal(g.pocketBatches[1].spawned, 12);
});

test("expedition enemy HP rows and chip fuel cap match the ledger", () => {
  assert.deepEqual(
    [...BAG_HP],
    [
      17, 17, 17, 17, 17, 20, 20, 20, 20, 20, 24, 24, 24, 24, 24, 24, 24, 17,
      17, 24,
    ],
  );
  const chip = [
    8, 8, 9, 10, 12, 13, 14, 15, 17, 18, 20, 22, 23, 24, 24, 24, 24, 17, 17, 24,
  ];
  for (let w = 1; w <= 20; w++) {
    assert.equal(enemyHp("chip", w), chip[w - 1]);
    assert.equal(enemyHp("runner", w), Math.round(19 * HP_MULT[w - 1]));
    assert.equal(enemyHp("can", w), Math.round(75 * HP_MULT[w - 1]));
    assert.equal(enemyHp("splitter", w), Math.round(40 * HP_MULT[w - 1]));
    assert.equal(enemyHp("spitter", w), Math.round(55 * HP_MULT[w - 1]));
  }
});

test("expedition prices, tier-II 144 case and reroll ladder are exact", () => {
  assert.equal(gunPrice("slinger", 8), 36);
  assert.equal(tier2Price("slinger", 8), 144);
  assert.equal(gunPrice("shotgun", 2), 27);
  assert.equal(gunPrice("coil", 2), 30);
  assert.deepEqual([0, 1, 2, 3, 4].map(rerollPrice), [0, 6, 8, 10, 12]);
});

test("expedition shop buys only into current slot capacity and supports selected-slot upgrade/sell", () => {
  const g = empty();
  g.wave = 1;
  g.phase = "shop";
  g.money = 1000;
  g.offers = ["shotgun", "coil", "saw", "rocket"];
  assert(g.buy(0));
  assert.equal(g.guns.length, 2);
  assert(!g.buy(1));
  g.wave = 2;
  assert(g.buy(1));
  assert.equal(g.guns.length, 3);
  g.wave = 8;
  const before = g.money;
  const price = g.upgradePrice(0);
  assert.equal(price, tier2Price("slinger", 8));
  assert(g.upgrade(0));
  assert.equal(g.guns[0].tier, 2);
  assert.equal(g.money, before - price);
  const tierEvent = [...g.events].reverse().find((e) => e.type === "tier");
  assert.equal(tierEvent?.kind, "slinger");
  assert.equal(tierEvent?.tier, 2);
  const refund = g.sellPrice(1);
  const cash = g.money;
  assert(g.sell(1));
  assert.equal(g.money, cash + refund);
  assert.equal(g.guns.length, 2);
});

test("expedition tier-II capacity counts duplicates and blocks no-charge upgrades", () => {
  const g = empty();
  g.wave = 8;
  g.phase = "shop";
  g.money = 1000;
  g.guns = [
    { id: "slinger", cooldown: 0, angle: 0, recoil: 0, tier: 2, paid: 0 },
    { id: "shotgun", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
  ];
  assert.equal(g.tier2Count, 1);
  let spent = 0;
  assert(!g.upgrade(1));
  assert.equal(spent, 0);
  g.guns[0].tier = 1;
  const p8 = g.upgradePrice(0);
  assert(g.upgrade(0));
  spent += p8;
  assert(!g.upgrade(0));
  g.wave = 10;
  const p10 = g.upgradePrice(1);
  assert(g.upgrade(1));
  spent += p10;
  assert.equal(g.tier2Count, 2);
  assert(!g.upgrade(0));
  assert.equal(g.money, 1000 - spent);
});

test("expedition offers always include an unowned type when one exists", () => {
  const g = empty();
  g.wave = 2;
  g.guns = [
    { id: "slinger", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
    { id: "shotgun", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
    { id: "coil", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
    { id: "saw", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
    { id: "rocket", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
  ];
  for (let i = 0; i < 40; i++) {
    g.refillExpeditionOffers();
    assert(g.offers.includes("fist"));
  }
});

test("expedition quick picks are free, permanent and tier upgrades are explicit", () => {
  const g = empty();
  g.mode = "slice";
  g.wave = 2;
  g.phase = "shop";
  g.chooseMod("popcorn");
  g.chooseMod("domino");
  g.mode = "expedition20";
  g.modTiers.set("popcorn", 1);
  g.modTiers.set("domino", 1);
  g.wave = 9;
  g.phase = "quick";
  g.openStop();
  assert.deepEqual(g.quickOptions, ["popcorn", "domino"]);
  assert(g.chooseQuick(0));
  assert.equal(g.modTier("popcorn"), 2);
  assert.equal(g.modTier("domino"), 1);
});

test("expedition delayed popcorn retains credit with no target and drains atomically", () => {
  const g = empty();
  g.mods = ["popcorn"];
  g.modTiers.set("popcorn", 1);
  g.guns = [];
  g.collect(scrap(1));
  assert.equal(g.popcornCredits, 1);
  assert.equal(g.bullets.length, 0);
  enemy(g, 700, 450);
  step(g, 1);
  assert.equal(g.popcornCredits, 0);
  assert.equal(g.bullets.filter((b) => b.kind === "bonus").length, 2);
  for (let i = 0; i < 8; i++) g.collect(scrap(10 + i));
  step(g, 1);
  assert.equal(g.popcornCredits, 4);
  assert.equal(g.bullets.filter((b) => b.kind === "bonus").length, 10);
});

test("expedition tier-III ring is separate, may fire without a target and cancels at wave end", () => {
  const g = empty();
  g.mods = ["popcorn"];
  g.modTiers.set("popcorn", 3);
  g.guns = [];
  for (let i = 0; i < 5; i++) g.collect(scrap(i));
  assert.equal(g.ringPending, 1);
  step(g, 1);
  assert.equal(g.ringPending, 0);
  assert.equal(g.bullets.length, 8);
  assert(
    g.bullets.every(
      (bullet) =>
        bullet.mod === "popcorn" &&
        bullet.tier === 3 &&
        !bullet.homing &&
        bullet.target === 0,
    ),
  );
  g.bullets = [];
  g.enemies = [];
  g.collect(scrap(10));
  g.collect(scrap(11));
  const before = g.popcornPendingCancelled;
  assert(g.popcornCredits >= 2);
  const credits = g.popcornCredits;
  g.phase = "quick";
  g.nextWave();
  assert(g.popcornPendingCancelled >= before + credits);
});

test("expedition splitter death makes two independent chip attempts with 0.65 warning", () => {
  const g = empty();
  g.guns = [];
  g.wave = 6;
  g.enemies = [];
  const splitter = enemy(g, 600, 300, 40, "splitter");
  g.enemies = [splitter];
  g.hit(splitter, 999, g.player);
  assert.equal(g.enemies.filter((v) => v.kind === "chip").length, 2);
  for (const chip of g.enemies.filter((v) => v.kind === "chip")) {
    assert.equal(chip.born, 0.65);
    assert.equal(chip.hp, enemyHp("chip", 6));
  }
  g.enemies = [];
  for (let i = 0; i < 180; i++)
    g.spawn("bag", { x: 40 + (i % 20) * 6, y: 40 + Math.floor(i / 20) * 6 });
  const full = enemy(g, 600, 300, 40, "splitter");
  g.enemies = g.enemies.slice(-1);
  const count = g.enemies.length;
  g.hit(full, 999, g.player);
  assert.equal(g.enemies.length, count);
});

test("expedition successful births cover splitter, pocket and boss paths with death settled once", () => {
  const g = empty();
  g.guns = [];
  g.wave = 12;
  g.enemies = [];
  g.spawnCount = 0;

  const splitter = enemy(g, 600, 300, 40, "splitter");
  g.hit(splitter, 999, g.player);
  g.hit(splitter, 999, g.player);
  assert.equal(g.kills, 1);
  assert.equal(g.enemies.filter((e) => e.kind === "chip").length, 2);
  assert.equal(g.spawnCount, 3);

  const pocketBefore = g.spawnCount;
  g.spawnExpeditionBatch("ring", 4, 75, { x: 900, y: 600 });
  assert.equal(g.spawnCount, pocketBefore + 4);

  const bossBefore = g.spawnCount;
  assert(g.spawn("boss", { x: 300, y: 220 }));
  assert.equal(g.spawnCount, bossBefore + 1);
  assert(g.kills <= g.spawnCount);
});

test("expedition spitter born warning, six-unit cap and bag fallback are explicit", () => {
  const g = empty();
  g.wave = 12;
  g.enemies = [];
  for (let i = 0; i < 6; i++) g.spawn("spitter", { x: 100 + i * 30, y: 100 });
  for (const e of g.enemies) {
    assert.equal(e.kind, "spitter");
    assert.equal(e.born, 0.8);
  }
  const before = g.spitterFallbackToBag;
  assert(g.spawn("spitter", { x: 600, y: 300 }));
  assert.equal(g.spitterFallbackToBag, before + 1);
  assert.equal(g.enemies.at(-1)?.kind, "bag");
});

test("expedition boss reservations, stage HP and overtime defeat are exact", () => {
  assert.equal(BOSS_STAGES[5].hp, 560);
  assert.equal(BOSS_STAGES[10].hp, 1600);
  assert.equal(BOSS_STAGES[15].hp, 3200);
  assert.equal(BOSS_STAGES[20].hp, 6400);
  const g = empty();
  g.wave = 10;
  g.waveTime = DURATIONS[9] - 18;
  g.spawnTimer = 999;
  g.expeditionBatches = [];
  for (let i = 0; i < 179; i++)
    g.spawn("bag", { x: 40 + (i % 20) * 6, y: 40 + Math.floor(i / 20) * 6 });
  step(g, 1);
  assert.equal(g.bossSpawned, true);
  const boss = g.enemies.find((e) => e.kind === "boss")!;
  assert.equal(boss.hp, 1600);
  assert.equal(boss.bossStage, 2);
  g.waveTime = DURATIONS[9] + 15.01;
  step(g, 1);
  assert.equal(g.phase, "lost");
});

test("expedition wake uses collection-time anchor, 30-unit gate, 36/30 and root references", () => {
  const g = empty();
  g.branch = "wake";
  g.guns = [];
  g.wakeAnchor = { x: 600, y: 450 };
  g.collect(scrap(1));
  assert.equal(g.wakePoints.length, 0);
  step(g, 10, 1, 0);
  g.collect(scrap(2));
  assert.equal(g.wakePoints.length, 1);
  const point = g.wakePoints[0];
  assert.equal(point.radius, 36);
  assert.equal(point.damage, 30);
  assert(point.root > 0);
  const target = enemy(g, point.x, point.y, 100);
  step(g, 1);
  assert.equal(target.hp, 70);
  step(g, 70);
  assert.equal(g.wakePoints.length, 0);
});

test("expedition ember locks drops for 1.2s, explodes once, then unlocks without extra value", () => {
  const g = empty();
  g.branch = "ember";
  const e = enemy(g, 600, 300, 1);
  g.hit(e, 99, g.player);
  const s = g.scraps[0];
  assert.equal(s.heat, 1.2);
  const value = s.value;
  g.player.x = s.x;
  g.player.y = s.y;
  step(g, 72);
  assert.equal(g.money, 0);
  assert.equal(g.scraps[0].value, value);
  assert.equal(g.scraps[0].exploded, true);
  step(g, 1);
  assert.equal(g.money, value);
  assert.equal(g.scraps.length, 0);
});

test("expedition root map survives the display timer and no ember uses root zero", () => {
  const g = empty();
  g.guns = [];
  g.branch = "ember";
  g.mods = [];
  const e = enemy(g, 600, 300, 1);
  g.hit(e, 99, g.player);
  const root = g.scraps[0].root!;
  assert(root > 0);
  // Keep the heated ember scrap out of pickup range so the only live reference
  // is the heat-locked object itself, not a newly queued ember blast.
  g.scraps[0].x = 20;
  g.scraps[0].y = 20;
  g.scraps[0].vx = 0;
  g.scraps[0].vy = 0;
  // Simulate a secondary death sharing the ember root, without adding domino
  // work that would keep the root alive after the heat object detonates.
  const other = enemy(g, 660, 300, 1);
  g.hit(other, 99, g.player, "secondary", 0, root);
  assert.equal(g.chainCounts.get(root), 1);
  step(g, 60);
  assert.equal(g.chainTimer, 0);
  assert.equal(g.chainCounts.get(root), 1);
  // Once the heat ends and the reference disappears, the root is reclaimed.
  step(g, 30);
  assert.equal(g.chainCounts.has(root), false);
});

test("expedition wave-end boundary cancels popcorn credits and unlocks ember without blast", () => {
  const g = empty();
  g.wave = 1;
  g.branch = "ember";
  g.mods = ["popcorn"];
  g.modTiers.set("popcorn", 1);
  g.popcornCredits = 3;
  g.phase = "quick";
  g.quickOptions = [];
  g.nextWave();
  assert.equal(g.wave, 2);
  assert.equal(g.popcornCredits, 0);
  g.scraps.push({
    ...scrap(1, 5),
    heat: 1.2,
    root: 2,
    exploded: false,
  });
  g.scraps[0].x = g.player.x;
  g.scraps[0].y = g.player.y;
  g.money = 0;
  g.phase = "fight";
  g.player.x = g.scraps[0].x;
  g.player.y = g.scraps[0].y;
  for (let i = 0; i < 74; i++) g.step(1 / 60, { x: 0, y: 0 });
  assert.equal(g.money, 5);
  assert.equal(g.popcornPendingCancelled, 3);
});

test("expedition boss stage volleys and enemy forms are observable through real simulation", () => {
  const g = empty();
  g.wave = 20;
  g.spawnTimer = 999;
  g.expeditionBatches = [];
  g.waveTime = DURATIONS[19] - 18;
  g.player.hp = 9999;
  g.player.maxHp = 9999;
  step(g, 1);
  const boss = g.enemies.find((e) => e.kind === "boss")!;
  boss.born = 0;
  boss.attack = 0;
  step(g, 1);
  assert.equal(boss.volleys, 1);
  assert(g.shootAcceptedEnemy >= 12);
  assert.equal(BLAST.ring, "#ff8a2a");
});

test("expedition formation scheduler uses bounded unique centres for every sub-batch", () => {
  const g = exp(777);
  g.guns = [];
  g.player.hp = 9999;
  g.player.maxHp = 9999;
  for (let wave = 1; wave <= 20; wave++) {
    g.wave = wave;
    g.waveTime = 0;
    g.enemies = [];
    g.pocketBatches = [];
    g.buildExpeditionPocketSchedule();
    const scheduled = g.expeditionBatches.filter(
      (b) => b.time < DURATIONS[wave - 1],
    );
    assert.equal(
      scheduled.reduce((sum, b) => sum + b.count, 0),
      POCKETS[wave - 1].reduce((sum, p) => sum + p[1], 0),
      `wave ${wave} preserves its total pocket count`,
    );
    for (const b of g.expeditionBatches) {
      assert(b.time < DURATIONS[wave - 1]);
      assert(b.count > 0);
      if (b.formation === "stream") assert.equal(b.group, 0);
      if (b.formation === "two-cluster") assert([0, 1].includes(b.group));
    }
    const streams = g.expeditionBatches.filter((b) => b.formation === "stream");
    for (let i = 0; i < streams.length; i += 3) {
      const group = streams.slice(i, i + 3);
      assert.equal(group.length, 3);
      assert(Math.abs(group[1].time - group[0].time - 0.4) < 1e-9);
      assert(Math.abs(group[2].time - group[1].time - 0.4) < 1e-9);
    }
  }
});

test("expedition two-cluster fallback centres are safe, bounded and 640 apart", () => {
  const g = exp(88);
  g.player.x = 40;
  g.player.y = 400;
  const saved = g.random;
  g.random = () => 0;
  const [a, b] = g.twoClusterCenters();
  g.random = saved;
  assert.equal(a.x, W - 70);
  assert.equal(b.x, W - 70);
  assert.equal(a.y, 80);
  assert.equal(b.y, H - 80);
  assert(dist(a, b) >= 200);
  assert(dist(a, g.player) >= 310);
  assert(dist(b, g.player) >= 310);
});

test("expedition two-cluster uses one shared pair and never plants pair groups on the player", () => {
  const g = empty();
  g.player.x = 600;
  g.player.y = 400;
  g.wave = 12;
  g.expeditionClusterCenters.set(20, [
    { x: 900, y: 80 },
    { x: 900, y: 720 },
  ]);
  const pockets: number[] = [];
  const spawn = g.spawn.bind(g);
  g.spawn = (kind, point) => {
    if (point && dist(point, g.player) < 235) pockets.push(1);
    return spawn(kind, point);
  };
  g.spawnExpeditionBatch("two-cluster", 6, 75, { x: 900, y: 80 });
  g.spawnExpeditionBatch("two-cluster", 6, 75, { x: 900, y: 720 });
  assert.equal(pockets.length, 0);
});

test("expedition each spawn batch records its own cap rejection without compensation", () => {
  const g = empty();
  g.guns = [];
  g.wave = 1;
  g.pocketBatches = [];
  for (let i = 0; i < 174; i++)
    enemy(g, 40 + (i % 20) * 6, 40 + Math.floor(i / 20) * 6);
  assert.equal(g.enemies.length, 174);
  g.spawnExpeditionBatch("ring", 4, 75, { x: 900, y: 600 });
  assert.equal(g.enemies.length, 178);
  assert.equal(g.pocketBatches.at(-1)?.spawned, 4);
  assert.equal(g.pocketBatches.at(-1)?.rejected, 0);
  g.spawnExpeditionBatch("ring", 6, 75, { x: 900, y: 600 });
  assert.equal(g.enemies.length, 180);
  assert.equal(g.pocketBatches.at(-1)?.spawned, 2);
  assert.equal(g.pocketBatches.at(-1)?.rejected, 4);
  const before = g.pocketBatches.length;
  g.spawnExpeditionBatch("ring", 3, 75, { x: 900, y: 600 });
  assert.equal(g.pocketBatches.length, before + 1);
  assert.equal(g.pocketBatches.at(-1)?.spawned, 0);
  assert.equal(g.pocketBatches.at(-1)?.rejected, 3);
  assert.equal(g.enemies.length, 180);
});

test("expedition spitter projectile is a 3.5 second orange enemy bullet", () => {
  const g = empty();
  g.wave = 12;
  g.guns = [];
  g.spawnTimer = 999;
  g.expeditionBatches = [];
  const s = enemy(g, 900, 450, 100, "spitter");
  s.born = 0;
  s.attack = DT;
  for (let i = 0; i < 128 && !g.bullets.some((v) => v.kind === "enemy"); i++)
    step(g, 1);
  const b = g.bullets.find((v) => v.kind === "enemy");
  assert(b);
  assert.equal(Math.round(b.r), 7);
  assert(b.life > 3.4 && b.life <= 3.5);
});

test("expedition wave boundary clears roots and every transient effect together", () => {
  const g = empty();
  g.wave = 4;
  g.guns = [];
  g.branch = "wake";
  g.chainCounts.set(7, 3);
  g.dominoRadius.set(7, 30);
  g.chainCount = 3;
  g.chainTimer = 0.5;
  g.wakePoints = [
    {
      x: 300,
      y: 300,
      id: 1,
      life: 0.9,
      max: 1,
      radius: 36,
      damage: 30,
      root: 7,
      hitIds: new Set<number>(),
    },
  ];
  g.scraps.push({
    ...scrap(1, 5),
    heat: 1.2,
    root: 7,
    exploded: false,
  });
  g.scraps[0].x = 20;
  g.scraps[0].y = 20;
  g.phase = "fight";
  g.waveTime = g.duration - DT;
  step(g, 1);
  assert.equal(g.phase, "sweep");
  assert.equal(g.wakePoints.length, 0);
  assert.equal(g.chainCounts.size, 0);
  assert.equal(g.dominoRadius.size, 0);
  assert.equal(g.chainCount, 0);
  assert.equal(g.scraps[0].heat, 0);
  assert.equal(g.scraps[0].value, 5);
});

test("expedition quick upgrade accepts exactly one tier per stop", () => {
  const g = empty();
  g.mods = ["popcorn", "domino"];
  g.modTiers.set("popcorn", 1);
  g.modTiers.set("domino", 1);
  g.wave = 9;
  g.phase = "quick";
  g.openStop();
  assert(g.chooseQuick(0));
  assert.equal(g.quickPicked, true);
  assert.equal(g.chooseQuick(1), false);
  assert.equal(g.modTier("popcorn"), 2);
  assert.equal(g.modTier("domino"), 1);
  g.nextWave();
  assert.equal(g.wave, 10);
  g.wave = 13;
  g.phase = "quick";
  g.openStop();
  assert.equal(g.quickPicked, false);
  assert(g.chooseQuick(0));
  assert.equal(g.modTier("popcorn"), 3);
  assert.equal(g.chooseQuick(0), false);
});

test("slice boss starts on 1.6s then uses the 2.4s interval", () => {
  const g = new Game(0x2a);
  g.enemies = [];
  g.wave = 2;
  g.waveTime = 18;
  g.guns = [];
  step(g, 1);
  const boss = g.enemies.find((e) => e.kind === "boss")!;
  assert.equal(boss.attack, 1.6);
  boss.born = 0;
  for (let i = 0; i <= Math.ceil(1.6 / DT); i++) step(g, 1);
  assert.equal(boss.volleys, 1);
  assert.equal(boss.attack, 2.4);
});

test("slice timer spawn consumes one RNG draw and keeps the approved W2 mix", () => {
  const draws: number[] = [];
  const rolls = [0.85, 0.61, 0.59, 0.9, 0.2, 0.86];
  const next = () => rolls[draws.length] ?? 0.5;
  const g = new Game(0x2a);
  g.random = () => {
    draws.push(1);
    return next();
  };
  g.enemies = [];
  g.wave = 2;
  g.spawnTimer = 0;
  step(g, 1);
  // Three draws belong to spawn(); the fourth selects this timer spawn's
  // kind. The warning timer alone would hide the enemy until it matures.
  g.enemies.forEach((e) => (e.born = 0));
  assert.equal(draws.length, 4);
  assert.deepEqual(
    g.enemies.map((e) => e.kind),
    ["runner"],
  );
});

test("slice primary domino kills keep no zero-count root and timer expiry still clears", () => {
  const g = new Game(91);
  g.enemies = [];
  g.guns = [];
  g.mods = ["domino"];
  const victim = enemy(g, 600, 300, 1);
  g.hit(victim, 99, g.player);
  assert.equal(g.chainCounts.size, 0);
  assert.equal(g.nextChainId, 1);
  g.chainCounts.set(99, 2);
  g.chainCount = 2;
  g.chainTimer = DT;
  step(g, 1);
  assert.equal(g.chainCounts.size, 0);
});

test("expedition root cleanup removes its domino radius accumulator", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  g.modTiers.set("domino", 2);
  const victims: Enemy[] = [];
  for (let i = 0; i < 4; i++) victims.push(enemy(g, 400 + i * 20, 300, 1));
  for (const victim of victims) g.hit(victim, 5, g.player, "secondary", 0, 42);
  assert.equal(g.chainCounts.get(42), 4);
  assert.equal(g.dominoRadius.get(42), 10);
  step(g, 1);
  assert.equal(g.chainCounts.has(42), false);
  assert.equal(g.dominoRadius.has(42), false);
});

test("expedition prunes dominoRadius when its chainCounts entry is already gone", () => {
  const g = empty();
  g.guns = [];
  g.dominoRadius.set(77, 30);
  step(g, 1);
  assert.equal(g.chainCounts.has(77), false);
  assert.equal(g.dominoRadius.has(77), false);
});

test("expedition wave and W20 boundaries cancel pending credits once", () => {
  const ordinary = empty();
  ordinary.guns = [];
  ordinary.popcornCredits = 3;
  ordinary.ringPending = 1;
  ordinary.ringCueReady = true;
  ordinary.ringCooldown = 1;
  ordinary.phase = "fight";
  ordinary.waveTime = ordinary.duration - DT / 2;
  step(ordinary, 1);
  assert.equal(ordinary.phase, "sweep");
  assert.equal(ordinary.popcornPendingCancelled, 3);
  assert.equal(ordinary.ringPendingCancelled, 1);
  assert.equal(ordinary.ringCueReady, false);
  step(ordinary, 60);
  ordinary.phase = "quick";
  ordinary.nextWave();
  assert.equal(ordinary.popcornPendingCancelled, 3);
  assert.equal(ordinary.ringPendingCancelled, 1);

  const final = empty();
  final.guns = [];
  final.wave = 20;
  final.phase = "fight";
  final.waveTime = final.duration - DT / 2;
  final.bossKilled = true;
  final.popcornCredits = 4;
  final.ringPending = 2;
  final.ringCueReady = true;
  final.ringCooldown = 1;
  step(final, 1);
  assert.equal(final.phase, "sweep");
  assert.equal(final.popcornPendingCancelled, 4);
  assert.equal(final.ringPendingCancelled, 2);
  assert.equal(final.ringCueReady, false);
  step(final, 60);
  assert.equal(final.phase, "won");
  assert.equal(final.popcornPendingCancelled, 4);
  assert.equal(final.ringPendingCancelled, 2);
  assert.equal(final.popcornCredits, 0);
  assert.equal(final.ringPending, 0);
});

test("expedition presentation events fire from real branch, enemy and tier actions", () => {
  const wake = empty();
  wake.branch = "wake";
  wake.player.x = 650;
  wake.collect(scrap(1));
  assert(wake.events.some((e) => e.type === "wake-hit"));

  const ember = empty();
  ember.branch = "ember";
  enemy(ember, 600, 300, 1);
  ember.hit(ember.enemies[0], 99, ember.player);
  ember.enemies = [];
  ember.phase = "fight";
  for (let i = 0; i < 74; i++) step(ember, 1);
  assert(ember.events.some((e) => e.type === "ember-blast"));

  const split = empty();
  const splitter = enemy(split, 600, 300, 1, "splitter");
  split.hit(splitter, 99, split.player);
  assert(split.events.some((e) => e.type === "split"));

  const spitter = empty();
  spitter.wave = 12;
  const shooter = enemy(spitter, 900, 450, 100, "spitter");
  shooter.born = 0;
  shooter.attack = 0;
  for (
    let i = 0;
    i < 20 && !spitter.events.some((e) => e.type === "spitter-tell");
    i++
  )
    step(spitter, 1);
  assert(spitter.events.some((e) => e.type === "spitter-tell"));

  const gun = empty();
  gun.wave = 8;
  gun.guns = [{ id: "slinger", cooldown: 0, angle: 0, recoil: 0, tier: 2 }];
  enemy(gun, 800, 450, 100);
  step(gun, 1);
  assert(
    gun.events.some(
      (e) => e.type === "tier-fire" && e.kind === "slinger" && e.tier === 2,
    ),
  );
});

test("expedition mod tiers reach audio events and tier-II bonus bullets carry their form", () => {
  const g = empty();
  g.wave = 13;
  g.phase = "quick";
  g.mods = ["popcorn", "domino"];
  g.modTiers.set("popcorn", 1);
  g.modTiers.set("domino", 1);
  g.openStop();
  assert(g.chooseQuick("popcorn"));
  const tier = g.events.find((e) => e.type === "tier" && e.mod === "popcorn");
  assert(tier);
  assert.equal(tier.tier, 2);
  assert.equal(tier.value, 2);

  const popcorn = empty();
  popcorn.mods = ["popcorn"];
  popcorn.modTiers.set("popcorn", 2);
  popcorn.guns = [];
  enemy(popcorn, 700, 450, 100);
  popcorn.collect(scrap(1));
  step(popcorn, 1);
  const pop = popcorn.bullets.filter((b) => b.kind === "bonus");
  assert.equal(pop.length, 2);
  assert(
    pop.every((b) => b.mod === "popcorn" && b.tier === 2 && b.pierce === 1),
  );

  const magnet = empty();
  magnet.mods = ["magnet"];
  magnet.modTiers.set("magnet", 2);
  magnet.guns = [];
  const target = enemy(magnet, 800, 450, 100);
  for (let i = 0; i < 8; i++) magnet.collect(scrap(10 + i));
  const homing = magnet.bullets.filter((b) => b.kind === "bonus" && b.homing);
  assert.equal(homing.length, 10);
  assert(
    homing.every(
      (b) =>
        b.mod === "magnet" &&
        b.tier === 2 &&
        b.target === target.id &&
        b.hitIds === undefined,
    ),
  );
});

test("expedition magnet metadata starts at newly spawned bullets and preserves hitIds", () => {
  const g = empty();
  g.mods = ["magnet"];
  g.modTiers.set("magnet", 2);
  g.guns = [];
  const target = enemy(g, 800, 450, 100);
  const old = g.bullets.length;
  g.bullets.push({
    x: 100,
    y: 100,
    id: 999,
    vx: 1,
    vy: 0,
    damage: 1,
    life: 1,
    kind: "bonus",
    target: 0,
    r: 5,
    homing: false,
  });
  const oldBullet = g.bullets[old];
  for (let i = 0; i < 8; i++) g.collect(scrap(10 + i));
  const fresh = g.bullets.slice(old + 1);
  assert.equal(fresh.length, 10);
  assert(
    fresh.every(
      (b) =>
        b.mod === "magnet" &&
        b.tier === 2 &&
        b.target === target.id &&
        b.hitIds === undefined,
    ),
  );
  assert.equal(oldBullet.mod, undefined);
  assert.equal(oldBullet.hitIds, undefined);

  const capped = empty();
  capped.mods = ["magnet"];
  capped.modTiers.set("magnet", 2);
  capped.guns = [];
  enemy(capped, 800, 450, 100);
  capped.combatPicked = 7;
  for (let i = 0; i < 415; i++)
    capped.bullets.push({
      x: 100 + (i % 10),
      y: 100,
      id: 1000 + i,
      vx: 1,
      vy: 0,
      damage: 1,
      life: 1,
      kind: "bonus",
      target: 0,
      r: 5,
      homing: false,
    });
  capped.collect(scrap(20));
  assert.equal(capped.bullets.length, 420);
  assert(
    capped.bullets
      .slice(415)
      .every(
        (b) =>
          b.mod === "magnet" &&
          b.tier === 2 &&
          b.target !== 0 &&
          b.hitIds === undefined,
      ),
  );
  assert(capped.bullets.slice(0, 415).every((b) => !b.mod));
});

test("expedition domino tiers inspect every fourth and eighth secondary kill per root", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  g.modTiers.set("domino", 3);
  const victims: Enemy[] = [];
  for (let i = 0; i < 9; i++) victims.push(enemy(g, 300 + i * 8, 300, 1));
  for (let i = 0; i < 8; i++)
    g.hit(victims[i], 5, g.player, "secondary", 0, 12);
  assert.equal(g.dominoRadius.get(12), 20);
  assert(g.pendingBlasts.some((b) => b.radius === 160 && b.damage === 80));
  step(g, 1);
  assert(
    g.fx.some(
      (f) => f.kind === "domino-blast" && f.life === 0.48 && f.size === 160,
    ),
  );
  assert(
    g.fx.some(
      (f) => f.kind === "domino-ring" && f.life === 0.45 && f.size === 160,
    ),
  );
});

test("expedition tier-II domino marks ordinary pending blasts for a double ring", () => {
  const g = empty();
  g.guns = [];
  g.mods = ["domino"];
  g.modTiers.set("domino", 2);
  const victim = enemy(g, 300, 300, 1);
  g.hit(victim, 5, g.player, "weapon");
  const blast = g.pendingBlasts.find((b) => b.damage === 26);
  assert(blast);
  assert.equal(blast.radius, 75);
  assert.equal(blast.dualRing, true);
  step(g, 1);
  assert(
    g.fx.some(
      (f) => f.kind === "domino-ring" && f.life === 0.45 && f.size === 75,
    ),
  );
});

test("expedition magnet tier III presents a full-arena warm sweep", () => {
  const g = empty();
  g.mods = ["magnet"];
  g.modTiers.set("magnet", 3);
  g.guns = [];
  g.combatPicked = 7;
  enemy(g, 800, 450, 100);
  g.collect(scrap(1));
  assert.equal(g.magnetPulse, 0.6);
  assert(
    g.bullets.every(
      (b) => b.mod === "magnet" && b.tier === 3 && b.hitIds === undefined,
    ),
  );
});

test("expedition tier-II saw orbits a second blade and tier-II fist keeps one doubled hit", () => {
  const saw = empty();
  saw.wave = 8;
  saw.guns = [
    { id: "saw", cooldown: 0, angle: 0, recoil: 0, tier: 2, paid: 0 },
  ];
  const first = enemy(saw, saw.player.x + 83, saw.player.y, 100);
  const second = enemy(saw, saw.player.x - 83, saw.player.y, 100);
  saw.weapons(DT);
  assert(saw.hits >= 2);
  assert(first.hp <= 76);
  assert(second.hp <= 76);

  const fist = empty();
  fist.guns = [
    { id: "fist", cooldown: 0, angle: 0, recoil: 0, tier: 2, paid: 0 },
  ];
  const target = enemy(fist, fist.player.x + 100, fist.player.y, 1000);
  fist.weapons(DT);
  assert.equal(fist.hits, 1);
  assert.equal(target.hp, 904);
});
