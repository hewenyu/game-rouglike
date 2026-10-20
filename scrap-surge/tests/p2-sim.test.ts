import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/sim";
import { DT } from "../src/data";
import {
  drawItemOffers,
  ITEM_CONSTANTS,
  creditRawCash,
  itemCountsWith,
  itemPrice,
} from "../src/items";
import type { ItemId } from "../src/items";
import type { Bullet, ChestPickup, Corpse } from "../src/sim";

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
const inventory = (...ids: ItemId[]) =>
  ids.reduce((counts, id) => itemCountsWith(counts, id), empty().inventory);
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
const chest = (g: Game, source: "elite" | "boss" = "elite"): ChestPickup => {
  const e = enemy(g, 500, 300, 1);
  g.spawnChest(e, source);
  return g.chests.at(-1)!;
};
const bonusBullet = (id: number, target = 0): Bullet => ({
  x: 100,
  y: 100,
  id,
  vx: 1,
  vy: 0,
  damage: 1,
  life: 1,
  kind: "bonus",
  target,
  r: 5,
  homing: false,
});

test("P2 W1 has exactly one core row and normal rests have one stat row", () => {
  const w1 = empty();
  w1.openStop();
  assert.equal(w1.phase, "shop");
  assert.equal(w1.pendingRewardChoices.length, 3);
  assert.equal(w1.pendingStatChoices.length, 0);
  assert.equal(new Set(w1.pendingRewardChoices).size, 3);
  w1.nextWave();
  assert.equal(w1.wave, 2);
  assert.equal(w1.phase, "fight");
  assert.equal(w1.pendingRewardChoices.length, 0);
  assert.equal(w1.pendingStatChoices.length, 0);
  assert.equal(w1.frozenChest, null);
  assert.equal(
    w1.events.some((event) => event.type === "chest"),
    false,
  );

  for (let wave = 2; wave <= 19; wave++) {
    const g = empty();
    g.wave = wave;
    g.openStop();
    assert.equal(g.pendingRewardChoices.length, 0);
    assert.equal(
      g.pendingStatChoices.length,
      [5, 10, 15].includes(wave) ? 0 : 3,
    );
    assert.equal(
      new Set(g.pendingStatChoices).size,
      g.pendingStatChoices.length,
    );
  }
});

test("P2 item purchase enforces cap, uniqueness, dependency and exact price", () => {
  const g = empty();
  g.wave = 8;
  g.phase = "shop";
  g.money = 1000;
  g.itemOffers = ["worn-sandals", "milestone", "wedge-ring"];
  g.soldItems.clear();
  const sandalsPrice = itemPrice("worn-sandals", 8, 0);
  assert.equal(g.buyItem(0), true);
  assert.equal(g.money, 1000 - sandalsPrice);
  assert.equal(g.inventory["worn-sandals"], 1);
  assert.equal(g.buyItem(0), false);
  assert.equal(g.money, 1000 - sandalsPrice);

  assert.equal(g.buyItem(1), true);
  assert.equal(g.inventory.milestone, 1);
  assert.equal(g.buyItem(1), false);
  assert.equal(g.inventory.milestone, 1);
  assert.equal(g.buyItem(2), false);
  assert.equal(g.inventory["wedge-ring"], 0);
});

test("P2 F4 offer and purchase require an eligible owned gun and stay inactive after sale", () => {
  const g = empty();
  g.phase = "shop";
  g.wave = 8;
  g.money = 1000;
  g.guns = [{ id: "coil", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 }];
  g.itemOffers = ["twin-trigger"];
  assert.equal(g.itemEligibility("twin-trigger").eligible, false);
  assert.equal(g.buyItem(0), false);

  g.guns.push({
    id: "slinger",
    cooldown: 0,
    angle: 0,
    recoil: 0,
    tier: 1,
    paid: 0,
  });
  assert.equal(g.buyItem(0), true);
  assert.equal(g.inventory["twin-trigger"], 1);
  g.guns = g.guns.filter((gun) => gun.id !== "slinger");
  assert.equal(g.inventory["twin-trigger"], 1);
  assert.equal(g.derivedItemStats().counts["twin-trigger"], 1);
});

test("P2 chest freezes source/rarity choices and decline or loss discards atomically", () => {
  const g = empty();
  g.phase = "fight";
  const elite = chest(g, "elite");
  const lootState = g.lootRandom.state();
  assert.equal(g.collectChest(elite), true);
  assert.equal(g.frozenChest?.source, "elite");
  assert.equal(g.frozenChest?.itemIds.length, 2);
  assert.equal(g.pendingChestChoices.length, 2);
  assert.equal(g.lootRandom.state() !== lootState, true);
  const frozen = [...g.frozenChest!.itemIds];
  assert.equal(g.collectChest(elite), false);
  assert.deepEqual(g.frozenChest?.itemIds, frozen);
  assert.equal(g.phase, "fight");
  assert.equal(g.claimPendingItem(0), false);
  g.phase = "shop";
  assert.equal(g.declinePendingReward(), true);
  assert.equal(g.frozenChest, null);
  assert.equal(g.pendingChestChoices.length, 0);

  const loss = empty();
  loss.wave = 10;
  const boss = chest(loss, "boss");
  loss.collectChest(boss);
  assert.equal(loss.frozenChest?.itemIds.length, 3);
  loss.settleExpeditionLoss();
  assert.equal(loss.phase, "lost");
  assert.equal(loss.frozenChest, null);
  assert.equal(loss.pendingChestChoices.length, 0);
});

test("P2 chest loss clears pending rows, drops and queues once", () => {
  const g = empty();
  g.phase = "fight";
  g.pendingBlasts.push({
    p: { x: 10, y: 10 },
    radius: 1,
    damage: 1,
    chain: 0,
    source: "chain",
  });
  g.popcornCredits = 4;
  g.corpses.push({
    x: 10,
    y: 10,
    id: 1,
    vx: 0,
    vy: 0,
    life: 1,
    max: 1,
    r: 5,
    chain: 0,
    hitIds: new Set(),
  });
  g.pendingRewardChoices = ["milestone"];
  g.chests.push({
    x: 10,
    y: 10,
    id: 2,
    source: "elite",
    wave: 3,
    vx: 0,
    vy: 0,
    age: 0,
  });
  g.settleExpeditionLoss();
  assert.equal(g.phase, "lost");
  assert.equal(g.pendingBlasts.length, 0);
  assert.equal(g.popcornCredits, 0);
  assert.equal(g.corpses.length, 0);
  assert.equal(g.pendingRewardChoices.length, 0);
  assert.equal(g.chests.length, 0);
  assert.equal(g.queueMetrics.pendingBlasts.dropped, 1);
  assert.equal(g.queueMetrics.popcorn.dropped, 4);
  assert.equal(g.queueMetrics.corpseTrail.dropped, 1);
  assert.equal(g.queueMetrics.chests.dropped, 1);
  g.settleExpeditionLoss();
  assert.equal(g.queueMetrics.chests.dropped, 1);
});

test("P2 reroll is independent of pending rewards and rolls back on failure", () => {
  const g = empty();
  g.phase = "shop";
  g.wave = 8;
  g.money = 0;
  g.shopRerollIndex = 1;
  const states = [
    g.weaponShopStream.state(),
    g.itemShopRandom.state(),
    g.statRewardRandom.state(),
    g.lootRandom.state(),
  ];
  const before = {
    offers: [...g.offers],
    items: [...g.itemOffers],
    stats: [...g.statRewardOffers],
    index: g.shopRerollIndex,
    events: g.events.length,
  };
  assert.equal(g.rerollExpedition(), false);
  assert.deepEqual(
    [
      g.weaponShopStream.state(),
      g.itemShopRandom.state(),
      g.statRewardRandom.state(),
      g.lootRandom.state(),
    ],
    states,
  );
  assert.deepEqual(g.offers, before.offers);
  assert.deepEqual(g.itemOffers, before.items);
  assert.deepEqual(g.statRewardOffers, before.stats);
  assert.equal(g.shopRerollIndex, before.index);
  assert.equal(g.events.length, before.events);

  g.money = 100;
  g.pendingStatChoices = ["damage"];
  assert.equal(g.rerollExpedition(), true);
  assert.deepEqual(g.pendingStatChoices, ["damage"]);
  assert.equal(g.money < 100, true);
});

test("P2 stale unique reward choices fail revalidation without substitution", () => {
  const g = empty();
  g.phase = "shop";
  g.pendingRewardChoices = ["milestone"];
  g.inventory = inventory("milestone");
  const before = {
    events: g.events.length,
    money: g.money,
    pending: [...g.pendingRewardChoices],
  };
  assert.equal(g.claimCoreReward(0), false);
  assert.equal(g.inventory.milestone, 1);
  assert.equal(g.events.length, before.events);
  assert.equal(g.money, before.money);
  assert.deepEqual(g.pendingRewardChoices, before.pending);
});

test("P2 voluntary rest exit discards unclaimed rows and frozen choices", () => {
  const g = empty();
  g.wave = 8;
  g.openStop();
  const frozen = chest(g, "elite");
  assert.equal(g.collectChest(frozen), true);
  assert.equal(g.pendingStatChoices.length, 3);
  assert.notEqual(g.frozenChest, null);
  g.nextWave();
  assert.equal(g.wave, 9);
  assert.equal(g.phase, "fight");
  assert.deepEqual(g.pendingRewardChoices, []);
  assert.deepEqual(g.pendingStatChoices, []);
  assert.equal(g.frozenChest, null);
});

test("P2 exact-repeat reroll replacement is visible without mutating prior rows", () => {
  const g = empty();
  g.phase = "shop";
  g.wave = 8;
  g.money = 100;
  g.shopRerollIndex = 1;
  g.weaponShopStream.setState(0);
  g.itemShopRandom.setState(0);
  g.statRewardRandom.setState(0);
  g.refillExpeditionOffers();
  g.refillExpeditionItems();
  g.weaponShopStream.setState(0);
  g.itemShopRandom.setState(0);
  g.statRewardRandom.setState(0);
  const oldWeapons = Object.freeze([...g.offers]);
  const oldItems = Object.freeze([...g.itemOffers]);
  const oldStats = Object.freeze([...g.statRewardOffers]);
  const first = g.rerollExpedition();
  assert.equal(first, true);
  const firstWeapons = [...g.offers];
  const firstItems = [...g.itemOffers];
  const firstStats = [...g.statRewardOffers];
  assert.equal(g.money, 94);
  assert.notDeepEqual(firstWeapons, oldWeapons);
  assert.notDeepEqual(firstItems, oldItems);
  assert.deepEqual(firstStats, oldStats);
  assert.equal(oldWeapons.length, 4);
});

test("P2 raw source cash and fuel survive cap merges and convert once", () => {
  const g = empty();
  g.phase = "fight";
  g.spawnTimer = 999;
  g.scraps = [];
  const first = scrap(1, 2);
  g.scraps.push({
    ...first,
    rawCash: 2,
    fuelUnits: 1,
    collected: false,
  });
  assert.equal(g.rawCash, 0);
  g.collect(g.scraps[0]);
  assert.equal(g.collected, 1);
  assert.equal(g.money, 0);
  assert.equal(g.coinAccumulator, 400);

  g.scraps = [];
  for (let i = 0; i < 250; i++)
    g.scraps.push({
      ...scrap(10 + i),
      rawCash: 1,
      fuelUnits: 1,
      collected: false,
    });
  g.hit(enemy(g, 600, 300, 1, "can"), 99, g.player);
  const merged = g.scraps.find((s) => s.collected !== true && s.rawCash === 5);
  assert.equal(g.scraps.length, 250);
  assert.equal(merged?.rawCash, 5);
  assert.equal(merged?.fuelUnits, 2);
  const fuelBefore = g.fuelUnits;
  g.picked = 0;
  g.collected = 0;
  g.collect(merged!);
  assert.equal(g.fuelUnits, fuelBefore);
  assert.equal(g.collected, 2);
});

test("P2 sweep counts each collected fuel once and zero-value objects survive in expedition", () => {
  const g = empty();
  g.phase = "sweep";
  g.sweepTime = 0;
  g.scraps = [
    { ...scrap(1, 0), rawCash: 0, fuelUnits: 5, collected: false },
    { ...scrap(2, 7), rawCash: 7, fuelUnits: 1, collected: false },
  ];
  g.player.x = 1100;
  g.player.y = 700;
  step(g, 1);
  assert.equal(g.sweptFuelUnits, 6);
  assert.equal(g.collected, 6);
  assert.equal(g.money, 1);
  assert.equal(g.scraps.length, 0);

  const late = empty();
  late.phase = "sweep";
  late.sweepTime = 0.5;
  late.scraps = [
    { ...scrap(3, 0), rawCash: 0, fuelUnits: 2, collected: false },
  ];
  late.player.x = 1100;
  late.player.y = 700;
  step(late, 1);
  assert.equal(late.scraps.length, 1);
  late.scraps.push({ ...scrap(5, 0), rawCash: 0, fuelUnits: 2 });
  late.scraps = late.scraps.filter((s) => s.id !== 3);
  step(late, 1);
  assert.equal(late.scraps.length, 1);
  assert.equal(late.scraps[0].value, 0);
  assert.notEqual(late.scraps[0].collected, true);

  const slice = new Game(123, "slice");
  slice.scraps = [{ ...scrap(4, 0), collected: true }];
  slice.waveTime = slice.duration - DT / 2;
  step(slice, 1);
  assert.equal(slice.scraps.length, 0);
});

test("P2 fight-boundary chests are collected once without a false drop", () => {
  const g = empty();
  const e = enemy(g, 500, 300, 1);
  g.spawnChest(e, "elite");
  g.waveTime = g.duration - DT / 2;
  g.spawnTimer = 999;
  step(g, 1);
  assert.equal(g.phase, "sweep");
  assert.equal(g.chests.length, 0);
  assert.equal(g.frozenChest?.source, "elite");
  assert.equal(g.queueMetrics.chests.processed, 1);
  assert.equal(g.queueMetrics.chests.dropped, 0);
});

test("P2 zero-coin siphon still increments cash, fuel and collection exactly once", () => {
  const g = empty();
  g.inventory = inventory("siphon-bag", "siphon-bag", "siphon-bag");
  g.wave = 8;
  const s = { ...scrap(1, 1), rawCash: 1, fuelUnits: 1, collected: false };
  g.collect(s);
  assert.equal(s.collected, true);
  assert.equal(g.collected, 1);
  assert.equal(g.fuelUnits, 0);
  assert.equal(g.rawCash, 0);
  assert.equal(g.money, 0);
  assert.equal(g.coinAccumulator, 110);
  g.collect(s);
  assert.equal(g.collected, 1);
});

test("P2 source cash totals increment on admitted drops independent of collection", () => {
  const g = empty();
  g.phase = "fight";
  g.scraps = [];
  const victim = enemy(g, 400, 300, 1, "runner");
  g.hit(victim, 99, g.player);
  assert.equal(g.rawCash, 2);
  assert.equal(g.fuelUnits, 1);
  assert.equal(g.collected, 0);
  assert.equal(g.scraps.length, 1);
});

test("P2 combat RNG and reward RNG remain isolated in paired seeded runs", () => {
  const rewardStates = (g: Game) => [
    g.weaponShopStream.state(),
    g.itemShopRandom.state(),
    g.statRewardRandom.state(),
    g.lootRandom.state(),
  ];

  const control = exp();
  const rewardsAdvancing = exp();
  const controlRewards = rewardStates(control);
  const rewardsBefore = rewardStates(rewardsAdvancing);
  const expectedCombat = Array.from({ length: 25 }, () => control.random());
  const actualCombat: number[] = [];
  for (let i = 0; i < expectedCombat.length; i++) {
    rewardsAdvancing.refillExpeditionOffers();
    rewardsAdvancing.refillExpeditionItems();
    rewardsAdvancing.lootRandom.next();
    actualCombat.push(rewardsAdvancing.random());
  }
  assert.deepEqual(actualCombat, expectedCombat);
  assert.deepEqual(rewardStates(control), controlRewards);
  assert.notDeepEqual(rewardStates(rewardsAdvancing), rewardsBefore);

  const combatAdvancing = exp();
  const combatRewards = rewardStates(combatAdvancing);
  for (let i = 0; i < expectedCombat.length; i++) combatAdvancing.random();
  assert.deepEqual(rewardStates(combatAdvancing), combatRewards);
});

test("P2 shotgun F4 fires pellets times volleys and tags every admitted projectile", () => {
  const g = empty();
  g.inventory = inventory("twin-trigger");
  g.guns = [
    { id: "shotgun", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
  ];
  enemy(g, g.player.x, g.player.y + 120, 1000);
  g.weapons(DT);
  assert.equal(g.bullets.length, 10);
  const fired = [...g.bullets];
  assert.equal(new Set(fired.map((b) => b.id)).size, fired.length);
});

test("P2 expedition movement applies derived moveFactor and slice movement stays frozen", () => {
  const expedition = empty();
  expedition.inventory = inventory(
    "worn-sandals",
    "worn-sandals",
    "worn-sandals",
    "worn-sandals",
    "worn-sandals",
  );
  expedition.enemies = [];
  step(expedition, 1, 1, 0);
  assert.ok(Math.abs(expedition.player.x - 600 - 230 * 1.6 * DT) < 1e-9);
  assert.ok(Math.abs(expedition.derivedItemStats().moveFactor - 1.6) < 1e-12);

  const slice = new Game(123, "slice");
  slice.enemies = [];
  slice.spawnTimer = 999;
  step(slice, 1, 1, 0);
  assert.ok(Math.abs(slice.player.x - 600 - 230 * DT) < 1e-9);
});

test("P2 C4 fires every eight secondary kills with C1 only", () => {
  const g = empty();
  g.inventory = inventory("volatile-trash", "big-bang");
  g.wave = 8;
  for (let i = 0; i < 8; i++) {
    const e = enemy(g, 400 + i * 10, 300, 1);
    g.hit(e, 99, g.player, "secondary", 0, 91);
  }
  assert.equal(g.inventory["wedge-ring"], 0);
  assert.equal(g.chainCounts.get(91), 8);
  assert.equal(
    g.pendingBlasts.filter((blast) => blast.tier3 && blast.radius === 160)
      .length,
    1,
  );
});

test("P2 pierce tagging only mutates admitted new bullets at the shared cap", () => {
  const g = empty();
  g.inventory = inventory("bent-nail", "twin-trigger");
  g.guns = [
    { id: "slinger", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
  ];
  enemy(g, g.player.x, g.player.y + 120, 1000);
  for (let i = 0; i < 419; i++)
    g.bullets.push({ ...bonusBullet(5000 + i), pierce: 0 });
  const prior = g.bullets[418];
  g.weapons(DT);
  assert.equal(g.bullets.length, 420);
  assert.equal(prior.pierce, 0);
  assert.equal(g.bullets.at(-1)?.pierce, 1);

  const shotgun = empty();
  shotgun.inventory = inventory("bent-nail", "twin-trigger");
  shotgun.guns = [
    { id: "shotgun", cooldown: 0, angle: 0, recoil: 0, tier: 1, paid: 0 },
  ];
  enemy(shotgun, shotgun.player.x, shotgun.player.y + 120, 1000);
  for (let i = 0; i < 415; i++)
    shotgun.bullets.push({ ...bonusBullet(9000 + i), pierce: 0 });
  shotgun.weapons(DT);
  assert.equal(shotgun.bullets.length, 420);
  assert.equal(shotgun.bullets[414].pierce, 0);
  assert.equal(shotgun.bullets.slice(415).filter((b) => b.pierce === 1).length, 5);
});

test("P2 H2 only triggers on accepted nonlethal contact and pressure changes both channels", () => {
  const g = empty();
  g.inventory = inventory("undertow-board", "pressure-valve");
  g.phase = "fight";
  g.player.invulnerable = 0;
  const hp = g.player.hp;
  g.hurt(1, "contact");
  assert.equal(g.player.hp, hp - 2);
  assert.equal(g.pressureTimer, 4);
  assert.equal(g.pendingBlasts.length, 1);
  assert.equal(g.pendingBlasts[0].source, "contactProc");

  g.player.invulnerable = 0;
  g.hurt(1, "bullet");
  assert.equal(g.pendingBlasts.length, 1);
  assert.equal(g.pressureTimer, 4);
});

test("P2 terminal hurt returns before item procs, drops, pickups and later enemies", () => {
  const g = empty();
  g.inventory = inventory("undertow-board", "spike-shell", "pressure-valve");
  g.phase = "fight";
  g.player.hp = 1;
  g.player.invulnerable = 0;
  const shooter = enemy(g, g.player.x + 10, g.player.y, 1);
  const far = enemy(g, 900, 700, 1);
  g.hurt(2, "contact");
  assert.equal(g.phase, "lost");
  assert.equal(g.pendingBlasts.length, 0);
  assert.equal(g.scraps.length, 0);
  assert.equal(g.events.filter((e) => e.type === "end").length, 1);
  assert.equal(shooter.hp, 1);
  assert.equal(far.hp, 1);
});

test("P2 H3 aura interval and direct/contact heal budget are source-specific", () => {
  const g = empty();
  g.inventory = inventory("spike-shell", "spike-shell", "spike-shell");
  const target = enemy(g, g.player.x + 20, g.player.y, 1000);
  g.updateSpikeAura(0.49);
  assert.equal(target.hp, 1000);
  g.updateSpikeAura(0.02);
  assert(target.hp < 1000);
  g.enemies = [];
  target.hp = 0;
  g.player.hp = 5;
  for (let i = 0; i < 25; i++) {
    const e = enemy(g, g.player.x + 20, g.player.y, 1);
    g.updateSpikeAura(0.5);
    assert.equal(e.hp <= 0, true);
  }
  assert.equal(g.player.hp, 6);
  assert.equal(g.waveKillHeals, 1);

  const nonAura = empty();
  nonAura.inventory = inventory("spike-shell", "spike-shell", "spike-shell");
  nonAura.directContactKills = 24;
  nonAura.player.hp = 5;
  const bulletKill = enemy(nonAura, 800, 100, 1);
  nonAura.hit(
    bulletKill,
    1,
    nonAura.player,
    "secondary",
    0,
    0,
    false,
    "itemProc",
  );
  const trailKill = enemy(nonAura, 800, 100, 1);
  nonAura.trailPoints.push({
    kind: "milestone",
    x: trailKill.x,
    y: trailKill.y,
    id: 999,
    life: 1,
    max: 1,
    radius: 36,
    damage: 1,
    root: 1,
    hitIds: new Set(),
  });
  nonAura.updateMilestoneTrail(0);
  assert.equal(trailKill.hp <= 0, true);
  assert.equal(nonAura.directContactKills, 24);
  assert.equal(nonAura.waveKillHeals, 0);
  assert.equal(nonAura.player.hp, 5);
});

test("P2 elite reservation uses one real slot and escape leaves no chest", () => {
  const g = empty();
  g.wave = 3;
  g.waveTime = g.duration * 0.35;
  g.spawnTimer = 999;
  for (let i = 0; i < 179; i++)
    g.spawn("bag", {
      x: 40 + (i % 20) * 6,
      y: 40 + Math.floor(i / 20) * 6,
    });
  step(g, 1);
  assert.equal(g.eliteSpawned, true);
  const elite = g.enemies.find((e) => e.elite)!;
  assert.equal(elite.maxHp, 360);
  assert.equal(elite.r, 28);
  assert.equal(g.enemies.length, 180);

  const escaped = empty();
  escaped.wave = 3;
  escaped.waveTime = escaped.duration - DT / 2;
  escaped.eliteSpawned = false;
  escaped.eliteEscaped = true;
  escaped.spawnTimer = 999;
  step(escaped, 1);
  assert.equal(escaped.eliteEscaped, true);
  assert.equal(escaped.chests.length, 0);
});

test("P2 milestone trail uses real displacement and consumes one shared cap", () => {
  const g = empty();
  g.inventory = inventory("milestone");
  g.guns = [];
  step(g, 1, 0, 0);
  assert.equal(g.trailPoints.length, 0);
  step(g, 24, 1, 0);
  assert.equal(g.trailPoints.length, 1);
  const point = g.trailPoints[0];
  assert.equal(point.radius, 36);
  assert.equal(point.damage, ITEM_CONSTANTS.milestoneDamage);
  assert(point.root > 0);
});

test("P2 fist remnant applies weapon factor without tier or power", () => {
  const g = empty();
  g.phase = "fight";
  g.spawnTimer = 999;
  g.enemies = [];
  g.inventory = inventory(
    "scrap-powder",
    "scrap-powder",
    "short-fuse",
    "short-fuse",
  );
  g.guns = [{ id: "fist", cooldown: 0, angle: 0, recoil: 0, tier: 2, paid: 0 }];
  const corpse: Corpse = {
    x: g.player.x,
    y: g.player.y + 90,
    id: 999,
    vx: 0,
    vy: 500,
    life: 1,
    max: 1,
    r: 12,
    chain: 0,
    hitIds: new Set(),
  };
  g.hit(enemy(g, 500, 300, 1), 99, g.player, "weapon", 75, 0, true);
  g.corpses[0].damage = undefined;
  const victim = enemy(g, g.player.x, g.player.y + 100, 1000);
  g.corpses.push(corpse);
  g.guns = [];
  step(g, 1);
  const expected = g.derivedItemStats().fistRemnantDamage;
  assert.equal(victim.hp, 1000 - expected);
});

test("P2 chest item draws never return duplicate IDs", () => {
  const ids = drawItemOffers({
    owned: inventory(),
    weapons: ["slinger"],
    count: 3,
    source: "boss",
    wave: 5,
    rng: (() => {
      let state = 1;
      return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
      };
    })(),
  });
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
});

test("P2 shared corpse/trail cap rejects without synthetic requests", () => {
  const g = empty();
  g.phase = "fight";
  for (let i = 0; i < 179; i++)
    g.corpses.push({
      x: 100,
      y: 100,
      id: 1000 + i,
      vx: 0,
      vy: 0,
      life: 10,
      max: 10,
      r: 5,
      chain: 0,
      hitIds: new Set(),
    });
  g.trailPoints.push({
    kind: "milestone",
    x: 100,
    y: 100,
    id: 999,
    life: 10,
    max: 10,
    radius: 36,
    damage: 30,
    root: 1,
    hitIds: new Set(),
  });
  const before = g.corpses.length + g.trailPoints.length;
  g.inventory = inventory("milestone");
  g.lastMilestone = { x: g.player.x - 200, y: g.player.y };
  step(g, 1, 1, 0);
  assert.equal(g.corpses.length + g.trailPoints.length, before);
  assert.equal(g.queueMetrics.corpseTrail.rejected, 1);
});

test("P2 milestone points hit each enemy once per point", () => {
  const g = empty();
  g.inventory = inventory("milestone");
  const target = enemy(g, 500, 300, 100);
  g.trailPoints.push({
    kind: "milestone",
    x: 500,
    y: 300,
    id: 3,
    life: 1,
    max: 1,
    radius: 36,
    damage: 10,
    root: 1,
    hitIds: new Set(),
  });
  step(g, 1);
  assert.equal(target.hp, 90);
  step(g, 1);
  assert.equal(target.hp, 90);
  assert.equal(g.trailPoints[0].hitIds.has(target.id), true);
});

test("P2 pressure active weapon factor uses one central profile", () => {
  const g = empty();
  g.inventory = inventory("pressure-valve");
  g.pressureTimer = 4;
  assert.equal(g.derivedItemStats().weaponFactor, 1.6);
  g.pressureTimer = 0;
  assert.equal(g.derivedItemStats().weaponFactor, 1);
  g.statRewards = { ...g.statRewards, damage: 0.06, power: 0.08 };
  g.pressureTimer = 4;
  assert.ok(Math.abs(g.derivedItemStats().weaponFactor - 1.66) < 1e-12);
  assert.ok(Math.abs(g.derivedItemStats().powerFactor - 1.08) < 1e-12);
});

test("P2 no post-death hit can heal through H3", () => {
  const g = empty();
  g.inventory = inventory("spike-shell");
  g.phase = "lost";
  g.player.hp = 0;
  g.directContactKills = 24;
  const e = enemy(g, 500, 300, 1);
  g.hit(e, 1, g.player, "secondary", 0, 0, false, "itemProc");
  assert.equal(g.player.hp, 0);
  assert.equal(g.waveKillHeals, 0);
});

test("P2 chest cap admits nine physical pickups and rejects the tenth", () => {
  const g = empty();
  for (let i = 0; i < 10; i++) g.spawnChest(enemy(g, 100 + i, 100, 1), "elite");
  assert.equal(g.chests.length, 9);
  assert.equal(g.queueMetrics.chests.admitted, 9);
  assert.equal(g.queueMetrics.chests.rejected, 1);
});

test("P2 bullet metadata fixtures preserve true hit IDs", () => {
  const g = empty();
  g.enemies = [];
  const first = enemy(g, 500, 300, 100);
  const second = enemy(g, 550, 300, 100);
  const bullet: Bullet = {
    ...bonusBullet(1),
    x: 520,
    y: 300,
    vx: 0,
    vy: 0,
    damage: 10,
    pierce: 1,
    hitIds: new Set(),
  };
  g.bullets.push(bullet);
  step(g, 1);
  assert.equal(bullet.hitIds?.size, 1);
  assert.equal(first.hp + second.hp, 190);
});

test("P2 explicit old chest fixture metadata is not reused", () => {
  const g = empty();
  const existing = bonusBullet(777);
  g.bullets.push(existing);
  assert.equal(existing.mod, undefined);
  assert.equal(existing.hitIds, undefined);
  const source = empty();
  const target = enemy(source, 800, 300, 100);
  source.inventory = inventory("scrap-popcorn");
  source.guns = [];
  source.collect({ ...scrap(1), rawCash: 1, fuelUnits: 1 });
  step(source, 1);
  assert.equal(source.bullets.length, 2);
  assert(
    source.bullets.every((b) => b.mod === "popcorn" && b.target === target.id),
  );
});

test("P2 creditRawCash is floor-safe, deterministic and independent of fuel", () => {
  assert.deepEqual(creditRawCash(0, 0, 0, 0), {
    wallet: 0,
    remainder: 0,
    earned: 0,
    rateMilli: 200,
  });
  assert.deepEqual(creditRawCash(0, 900, 1, 0), {
    wallet: 1,
    remainder: 100,
    earned: 1,
    rateMilli: 200,
  });
  assert.equal(creditRawCash(0, 0, 1, 3).rateMilli, 110);
});
