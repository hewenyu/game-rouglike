import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPEDITION_CAPS,
  INCOME_RATE_MILLI,
  ITEM_BY_ID,
  ITEM_CAPS,
  ITEM_CATALOG,
  ITEM_CONSTANTS,
  ITEM_FAMILIES,
  ITEM_IDS,
  QUEUE_CAPS,
  TWIN_TRIGGER_WEAPONS,
  bossRarityWeights,
  canOwnItem,
  coinRateMilli,
  creditRawCash,
  deriveItemStats,
  drawItemOffers,
  eliteRarityWeights,
  itemCountsFromIds,
  itemEligibility,
  itemPrice,
  itemProcPreview,
  perVolleyDps,
  projectileCount,
  purchaseEffectPreview,
  shopRarityWeights,
  weaponItemModifiers,
  wedgeRingRadius,
} from "../src/items";
import { WEAPONS, type WeaponId } from "../src/data";
import { effectiveWeaponProfile } from "../src/expedition";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const allWeapons = Object.keys(WEAPONS) as WeaponId[];

test("catalog is a frozen 20-item matrix across all five families", () => {
  assert.equal(ITEM_CATALOG.length, 20);
  assert.equal(new Set(ITEM_IDS).size, 20);
  assert.deepEqual(Object.keys(ITEM_BY_ID).sort(), [...ITEM_IDS].sort());
  assert(Object.isFrozen(ITEM_CATALOG));

  for (const family of ITEM_FAMILIES) {
    assert.equal(
      ITEM_CATALOG.filter((item) => item.family === family).length,
      4,
    );
  }
  for (const item of ITEM_CATALOG) {
    assert.equal(item.code[0], item.family);
    assert(item.name.length > 0);
    assert(item.description.length > 0);
    assert(item.shape.length > 0);
    assert(ITEM_CAPS[item.id] === item.cap);
    assert(Object.isFrozen(item));
    assert(Object.isFrozen(item.dependencies));
    assert(Object.isFrozen(item.weaponEligibility));
  }
  assert.equal(new Set(ITEM_CATALOG.map((item) => item.shape)).size, 20);
});

test("rarity, cap, uniqueness and dependency metadata match the approved matrix", () => {
  const expectedCaps = {
    "worn-sandals": 5,
    "tailwind-coil": 3,
    milestone: 1,
    surfboard: 3,
    "volatile-trash": 1,
    "wedge-ring": 3,
    "short-fuse": 3,
    "big-bang": 1,
    "thick-shell": 5,
    "undertow-board": 3,
    "spike-shell": 3,
    "pressure-valve": 1,
    "scrap-powder": 10,
    "long-barrel": 5,
    "bent-nail": 3,
    "twin-trigger": 2,
    "magnetic-return": 1,
    "scrap-popcorn": 1,
    "hooked-tip": 3,
    "siphon-bag": 3,
  };
  assert.deepEqual(ITEM_CAPS, expectedCaps);
  assert.deepEqual(
    ITEM_CATALOG.filter((item) => item.unique).map((item) => item.id),
    [
      "milestone",
      "volatile-trash",
      "big-bang",
      "pressure-valve",
      "magnetic-return",
      "scrap-popcorn",
    ],
  );
  assert.deepEqual(
    ITEM_CATALOG.filter((item) => item.rarity === "common").map(
      (item) => item.id,
    ),
    [
      "worn-sandals",
      "short-fuse",
      "thick-shell",
      "scrap-powder",
      "long-barrel",
      "siphon-bag",
    ],
  );
  assert.deepEqual(ITEM_BY_ID["wedge-ring"].dependencies.allOf, [
    "volatile-trash",
  ]);
  assert.deepEqual(ITEM_BY_ID["big-bang"].dependencies.allOf, [
    "volatile-trash",
  ]);
  assert.deepEqual(ITEM_BY_ID["hooked-tip"].dependencies.anyOf, [
    "magnetic-return",
    "scrap-popcorn",
  ]);
  assert.deepEqual(TWIN_TRIGGER_WEAPONS, ["slinger", "shotgun", "rocket"]);
  assert.deepEqual(ITEM_BY_ID["twin-trigger"].weaponEligibility, [
    "slinger",
    "shotgun",
    "rocket",
  ]);
  assert.deepEqual(
    ITEM_CATALOG.filter((item) => item.weaponEligibility.length > 0).map(
      (item) => item.id,
    ),
    ["twin-trigger"],
  );
});

test("ownership eligibility enforces unique, cap, dependency and weapon gates", () => {
  const empty = itemCountsFromIds([]);
  assert.equal(canOwnItem("scrap-powder", empty), true);
  assert.equal(canOwnItem("wedge-ring", empty), false);
  assert.equal(canOwnItem("big-bang", empty), false);
  assert.equal(canOwnItem("hooked-tip", empty), false);
  assert.equal(canOwnItem("twin-trigger", empty), false);
  assert.equal(canOwnItem("twin-trigger", empty, ["saw"]), false);
  assert.equal(canOwnItem("twin-trigger", empty, ["slinger"]), true);
  assert.equal(canOwnItem("twin-trigger", empty, ["rocket"]), true);
  assert.equal(canOwnItem("bent-nail", empty, ["fist"]), true);

  const milestone = itemCountsFromIds(["milestone"]);
  assert.deepEqual(itemEligibility("milestone", milestone).reasons, [
    "unique-owned",
  ]);
  assert.equal(canOwnItem("milestone", milestone), false);

  const maxPowder = itemCountsFromIds(
    Array.from({ length: 10 }, () => "scrap-powder" as const),
  );
  assert.deepEqual(itemEligibility("scrap-powder", maxPowder).reasons, [
    "cap-reached",
  ]);
  assert.equal(canOwnItem("scrap-powder", maxPowder), false);
  assert.equal(
    canOwnItem(
      "scrap-powder",
      itemCountsFromIds(
        Array.from({ length: 9 }, () => "scrap-powder" as const),
      ),
    ),
    true,
  );

  assert.equal(
    canOwnItem("wedge-ring", itemCountsFromIds(["volatile-trash"])),
    true,
  );
  assert.equal(
    canOwnItem("big-bang", itemCountsFromIds(["volatile-trash"])),
    true,
  );
  assert.equal(
    canOwnItem("hooked-tip", itemCountsFromIds(["magnetic-return"])),
    true,
  );
  assert.equal(
    canOwnItem("hooked-tip", itemCountsFromIds(["scrap-popcorn"])),
    true,
  );
});

test("item prices use the same wave factor as guns and stack copy surcharge", () => {
  assert.equal(itemPrice("worn-sandals", 1, 0), 10);
  assert.equal(itemPrice("tailwind-coil", 1, 0), 16);
  assert.equal(itemPrice("milestone", 1, 0), 26);
  assert.equal(itemPrice("scrap-powder", 6, 0), 20);
  assert.equal(itemPrice("scrap-powder", 6, 1), 23);
  assert.equal(itemPrice("milestone", 11, 0), 78);

  for (const wave of [1, 5, 12, 20]) {
    const factor = (wave + 4) / 5;
    assert.equal(itemPrice("long-barrel", wave, 0), Math.ceil(10 * factor));
  }
});

test("shop, elite and boss rarity tables use constant bands and normalized legal pools", () => {
  assert.deepEqual(shopRarityWeights(1), { common: 70, uncommon: 27, rare: 3 });
  assert.deepEqual(shopRarityWeights(5), { common: 70, uncommon: 27, rare: 3 });
  assert.deepEqual(shopRarityWeights(6), {
    common: 55,
    uncommon: 35,
    rare: 10,
  });
  assert.deepEqual(shopRarityWeights(12), {
    common: 55,
    uncommon: 35,
    rare: 10,
  });
  assert.deepEqual(shopRarityWeights(13), {
    common: 40,
    uncommon: 40,
    rare: 20,
  });
  assert.deepEqual(shopRarityWeights(20), {
    common: 40,
    uncommon: 40,
    rare: 20,
  });

  const elite5 = eliteRarityWeights(5);
  assert.equal(elite5.common, 0);
  assert.equal(elite5.uncommon + elite5.rare, 100);
  assert.equal(elite5.rare, 10);
  assert.deepEqual(bossRarityWeights(5), {
    common: 0,
    uncommon: 60,
    rare: 40,
  });
  assert.deepEqual(bossRarityWeights(10), {
    common: 0,
    uncommon: 45,
    rare: 55,
  });
  assert.deepEqual(bossRarityWeights(15), {
    common: 0,
    uncommon: 30,
    rare: 70,
  });
  assert.throws(() => bossRarityWeights(20), RangeError);
});

test("seeded item draws are deterministic, distinct and honor legal filters", () => {
  const empty = itemCountsFromIds([]);
  const draw = () =>
    drawItemOffers({
      owned: empty,
      weapons: ["slinger"],
      count: 3,
      source: "shop",
      wave: 5,
      rng: seeded(42),
    });
  assert.deepEqual(draw(), draw());
  const first = draw();
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);

  const all = drawItemOffers({
    owned: empty,
    weapons: ["slinger"],
    count: 20,
    source: "shop",
    wave: 20,
    rng: seeded(7),
  });
  assert.equal(new Set(all).size, all.length);
  assert.equal(all.length, 17);

  const ownedUnique = itemCountsFromIds(["milestone", "volatile-trash"]);
  const afterUnique = drawItemOffers({
    owned: ownedUnique,
    weapons: ["slinger"],
    count: 20,
    source: "shop",
    wave: 20,
    rng: seeded(11),
  });
  assert(!afterUnique.includes("milestone"));
  assert(!afterUnique.includes("volatile-trash"));
  assert(afterUnique.includes("wedge-ring"));
  assert(afterUnique.includes("big-bang"));

  const boss = drawItemOffers({
    owned: empty,
    weapons: [],
    count: 3,
    source: "boss",
    wave: 10,
    rng: seeded(3),
  });
  assert.equal(new Set(boss).size, 3);
  assert(
    boss.every(
      (id) =>
        ITEM_BY_ID[id].rarity === "uncommon" ||
        ITEM_BY_ID[id].rarity === "rare",
    ),
  );
  assert(!boss.includes("twin-trigger"));
});

test("draw renormalizes around owned caps and unique filtering", () => {
  const counts = Object.fromEntries(ITEM_IDS.map((id) => [id, 0])) as Record<
    (typeof ITEM_IDS)[number],
    number
  >;
  for (const item of ITEM_CATALOG) {
    if (item.rarity === "common" || item.rarity === "rare")
      counts[item.id] = item.cap;
  }
  const drawn = drawItemOffers({
    owned: counts,
    weapons: ["slinger"],
    count: 20,
    source: "shop",
    wave: 20,
    rng: seeded(9),
  });
  assert(drawn.length > 0);
  assert(drawn.every((id) => ITEM_BY_ID[id].rarity !== "common"));
  const ownedEverything = Object.fromEntries(
    ITEM_IDS.map((id) => [id, ITEM_CAPS[id]]),
  );
  assert.equal(
    drawItemOffers({
      owned: ownedEverything,
      weapons: ["slinger"],
      count: 3,
      source: "boss",
      wave: 5,
      rng: () => 0.25,
    }).length,
    0,
  );
});

test("default derivation and every stat/reward channel stay distinct", () => {
  const base = deriveItemStats({});
  assert.deepEqual(base.stats, {
    damage: 0,
    as: 0,
    hpFlat: 0,
    move: 0,
    pickup: 0,
    power: 0,
  });
  assert.equal(base.moveFactor, 1);
  assert.equal(base.moveBonus, 0);
  assert.equal(base.weaponFactor, 1);
  assert.equal(base.asFactor, 1);
  assert.equal(base.powerFactor, 1);
  assert.equal(base.maxHp, 10);
  assert.equal(base.pickupRadius, 155);
  assert.equal(base.milestoneDamage, 30);
  assert.equal(base.volatileTrashDamage, 26);
  assert.equal(base.bigBangDamage, 80);
  assert.deepEqual(base.hurtExplosion, { radius: 90, damage: 80 });
  assert.equal(base.spikeShellDamage, 0);
  assert.equal(base.fistRemnantDamage, 30);
  assert.equal(base.pickupBulletPierce, 0);
  assert.equal(base.pickupBulletHoming, false);
  assert.equal(base.pickupBulletDamageMultiplier, 1);
  assert.equal(base.acceptedHurtDamageBonus, 0);

  const rewarded = deriveItemStats(
    {},
    {
      damage: 0.1,
      as: 0.2,
      hpFlat: 3,
      move: 0.04,
      pickup: 0.3,
      power: 0.4,
    },
  );
  assert.equal(rewarded.weaponFactor, 1.1);
  assert.equal(rewarded.asFactor, 1.2);
  assert.equal(rewarded.maxHp, 13);
  assert.equal(rewarded.moveFactor, 1.04);
  assert.equal(rewarded.pickupRadius, 155 * 1.3);
  assert.equal(rewarded.powerFactor, 1.4);
  assert.equal(rewarded.milestoneDamage, 42);
});

test("appendix item factors, HP, pickup, pressure and proc powers match constants", () => {
  const counts = itemCountsFromIds([
    "worn-sandals",
    "tailwind-coil",
    "short-fuse",
    "thick-shell",
    "undertow-board",
    "undertow-board",
    "spike-shell",
    "spike-shell",
    "scrap-powder",
    "long-barrel",
    "magnetic-return",
    "siphon-bag",
  ]);
  const moving = deriveItemStats(counts, {}, { moved: true });
  assert.equal(moving.moveFactor, 1.08);
  assert(Math.abs(moving.moveBonus - 0.08) < 1e-12);
  assert(Math.abs(moving.weaponFactor - 1.04) < 1e-12);
  assert.equal(moving.asFactor, 1.1);
  assert.equal(moving.powerFactor, 1.25);
  assert.equal(moving.maxHp, 11);
  assert.equal(moving.pickupRadius, 300 * 1.25);
  assert.equal(moving.hurtExplosion.radius, 110);
  assert.equal(moving.hurtExplosion.damage, 16 * 11 * 1.25);
  assert.equal(moving.spikeShellDamage, 1.5 * 11 * 2 * 1.25);
  assert.equal(moving.pickupBulletPierce, 0);
  assert.equal(moving.pickupBulletDamageMultiplier, 1.25);

  const still = deriveItemStats(counts, {}, { moved: false });
  assert.equal(still.moveBonus, 0);
  assert.equal(still.asFactor, 1.1);
  assert.equal(still.weaponFactor, 1);

  const pressured = deriveItemStats(
    itemCountsFromIds(["spike-shell", "pressure-valve"]),
    {},
    { pressureActive: true },
  );
  assert.equal(pressured.weaponFactor, 1.6);
  assert.equal(pressured.spikeShellDamage, 1.5 * 10 * 2);
  assert.equal(pressured.acceptedHurtDamageBonus, 1);

  const floor = deriveItemStats(
    itemCountsFromIds([
      "thick-shell",
      "thick-shell",
      "thick-shell",
      "worn-sandals",
      "worn-sandals",
    ]),
  );
  assert.equal(floor.maxHp, 14);
  assert.equal(deriveItemStats(itemCountsFromIds(["worn-sandals"])).maxHp, 9);
  assert.equal(deriveItemStats({}, { hpFlat: -99 }).maxHp, 3);
});

test("C2 growth is root-local math, C4 stays fixed, and H3 values are exposed", () => {
  assert.equal(wedgeRingRadius(0, 1), 75);
  assert.equal(wedgeRingRadius(3, 1), 75);
  assert.equal(wedgeRingRadius(4, 1), 82.5);
  assert.equal(wedgeRingRadius(40, 1), 90);
  assert.equal(wedgeRingRadius(1000, 3), 120);
  assert.equal(ITEM_CONSTANTS.bigBangRadius, 160);
  const h3 = deriveItemStats(itemCountsFromIds(["spike-shell"]));
  assert.equal(h3.spikeShellDamage, 15);
  assert.equal(ITEM_CONSTANTS.spikeShellKillHealEvery, 25);
  assert.equal(ITEM_CONSTANTS.spikeShellHealPerWave, 3);
});

test("F3 modifies all six weapon classes through their own channels", () => {
  const derived = deriveItemStats(
    itemCountsFromIds(["bent-nail", "bent-nail"]),
  );
  const profiles = Object.fromEntries(
    allWeapons.map((id) => [
      id,
      effectiveWeaponProfile(id, 1, weaponItemModifiers(id, derived)),
    ]),
  ) as Record<WeaponId, ReturnType<typeof effectiveWeaponProfile>>;

  assert.equal(profiles.slinger.pierce, 2);
  assert.equal(profiles.shotgun.pierce, 2);
  assert.equal(profiles.coil.jumps, 6);
  assert.equal(profiles.coil.jumpRange, 170);
  assert.equal(profiles.rocket.blastRadius, 92 * 1.24);
  assert.equal(profiles.saw.sawContactRadius, 32);
  assert.equal(profiles.fist.range, 145 * 1.2);
});

test("F4 changes only slinger, shotgun and rocket, using pellets times shots", () => {
  const derived = deriveItemStats(
    itemCountsFromIds(["twin-trigger", "twin-trigger"]),
  );
  for (const id of allWeapons) {
    const modifiers = weaponItemModifiers(id, derived);
    const profile = effectiveWeaponProfile(id, 1, modifiers);
    if (id === "slinger" || id === "rocket") {
      assert.equal(modifiers.extraProjectiles, 2);
      assert.equal(profile.shots, 3);
      assert.equal(
        profile.damage,
        effectiveWeaponProfile(id, 1).damage * 0.75 ** 2,
      );
    } else if (id === "shotgun") {
      assert.equal(modifiers.extraProjectiles, 2);
      assert.equal(profile.pellets, 5);
      assert.equal(profile.shots, 3);
      assert.equal(
        profile.damage,
        effectiveWeaponProfile(id, 1).damage * 0.75 ** 2,
      );
    } else {
      assert.equal(modifiers.extraProjectiles, 0);
      assert.equal(profile.damage, effectiveWeaponProfile(id, 1).damage);
      assert.equal(profile.shots, 1);
    }
  }

  const shotgun = effectiveWeaponProfile(
    "shotgun",
    1,
    weaponItemModifiers("shotgun", derived),
  );
  assert.equal(projectileCount(shotgun), 15);
  assert.notEqual(projectileCount(shotgun), Math.max(5, 3));
  assert.equal(perVolleyDps(shotgun), (shotgun.damage * 15) / shotgun.interval);
  assert.equal(
    perVolleyDps(shotgun) / perVolleyDps(effectiveWeaponProfile("shotgun", 1)),
    1.6875,
  );

  const melee = deriveItemStats(itemCountsFromIds(["twin-trigger"]));
  assert.equal(
    effectiveWeaponProfile("saw", 1, weaponItemModifiers("saw", melee)).saws,
    effectiveWeaponProfile("saw", 1).saws,
  );
});

test("two-argument weapon profiles preserve the exact P1 baseline including slice", () => {
  for (const id of allWeapons) {
    for (const tier of [1, 2, 3, 4] as const) {
      const baseline = effectiveWeaponProfile(id, tier);
      assert.deepEqual(effectiveWeaponProfile(id, tier, undefined), baseline);
      assert.deepEqual(Object.keys(baseline), [
        "tier",
        "damage",
        "interval",
        "range",
        "pellets",
        "jumps",
        "jumpRange",
        "shots",
        "saws",
        "blastRadius",
        "sawOrbitRadius",
        "sawContactRadius",
      ]);
    }
  }
  assert.equal(ITEM_CONSTANTS.fistRemnantDamage, 30);
  assert.equal(
    deriveItemStats(itemCountsFromIds(["scrap-powder"]), {
      damage: 0.2,
    }).fistRemnantDamage,
    30 * 1.28,
  );
});

test("F2 range and attack-speed multipliers remain orthogonal and floor correctly", () => {
  const derived = deriveItemStats(
    itemCountsFromIds([
      "long-barrel",
      "long-barrel",
      "long-barrel",
      "long-barrel",
      "long-barrel",
    ]),
  );
  const slinger = effectiveWeaponProfile(
    "slinger",
    1,
    weaponItemModifiers("slinger", derived),
  );
  const fist = effectiveWeaponProfile(
    "fist",
    1,
    weaponItemModifiers("fist", derived),
  );
  assert.equal(slinger.range, 450 * 0.7);
  assert.equal(fist.range, 145 * 0.7);
  assert.equal(slinger.interval, 0.25 / 1.5);

  const forcedFloor = weaponItemModifiers(
    "slinger",
    deriveItemStats(
      itemCountsFromIds(Array.from({ length: 10 }, () => "long-barrel")),
    ),
  );
  assert.equal(forcedFloor.rangeMultiplier, 0.6);
});

test("pickup projectile count and DPS helpers are authoritative products", () => {
  assert.equal(
    projectileCount({ damage: 10, interval: 1, pellets: 5, shots: 3 }),
    15,
  );
  assert.equal(
    perVolleyDps({ damage: 10, interval: 2, pellets: 5, shots: 3 }),
    75,
  );
  assert.equal(
    projectileCount({ damage: 10, interval: 1, pellets: 1, shots: 1 }),
    1,
  );
});

test("milli income helper preserves integer zero, fractional remainder and siphon curse", () => {
  assert.deepEqual(INCOME_RATE_MILLI, [200, 170, 140, 110]);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(coinRateMilli),
    [200, 170, 140, 110, 80],
  );
  assert.deepEqual(creditRawCash(5, 800, 0, 0), {
    wallet: 5,
    remainder: 800,
    earned: 0,
    rateMilli: 200,
  });
  assert.deepEqual(creditRawCash(5, 800, 1, 0), {
    wallet: 6,
    remainder: 0,
    earned: 1,
    rateMilli: 200,
  });
  assert.deepEqual(creditRawCash(5, 999, 1, 0), {
    wallet: 6,
    remainder: 199,
    earned: 1,
    rateMilli: 200,
  });
  assert.deepEqual(creditRawCash(5, 950, 1, 1), {
    wallet: 6,
    remainder: 120,
    earned: 1,
    rateMilli: 170,
  });
  assert.deepEqual(creditRawCash(0, 0, 1, 3, 2), {
    wallet: 0,
    remainder: 220,
    earned: 0,
    rateMilli: 220,
  });
});

test("catalog purchase previews derive cap, uniqueness and live constants", () => {
  const twin = purchaseEffectPreview("twin-trigger", 1);
  assert.equal(twin.copyNumber, 2);
  assert.equal(twin.cap, 2);
  assert.equal(twin.unique, false);
  assert.equal(twin.effect, ITEM_BY_ID["twin-trigger"].description);
  assert(twin.effect.includes("×0.75"));
  assert(twin.effect.includes("发数 +1"));

  const milestone = purchaseEffectPreview("milestone");
  assert.equal(milestone.copyNumber, 1);
  assert.equal(milestone.unique, true);
  assert(milestone.effect.includes("90"));
  assert(milestone.effect.includes("半径 36"));
  assert(milestone.effect.includes("30 × 机制强度"));
  assert(ITEM_BY_ID["worn-sandals"].description.includes("12%"));
  assert(ITEM_BY_ID["short-fuse"].description.includes("-8%"));
  assert(ITEM_BY_ID["siphon-bag"].description.includes("-15%"));
});

test("proc previews report current and projected existing-derived values", () => {
  const current = itemProcPreview(
    itemCountsFromIds(["milestone", "undertow-board", "spike-shell"]),
  );
  const after = itemProcPreview(
    itemCountsFromIds([
      "milestone",
      "undertow-board",
      "undertow-board",
      "spike-shell",
    ]),
  );
  assert.equal(current.readoutsByItem.milestone?.damage, 30);
  assert.equal(after.readoutsByItem.milestone?.damage, 30);
  assert.equal(current.readoutsByItem["undertow-board"]?.radius, 100);
  assert.equal(after.readoutsByItem["undertow-board"]?.radius, 110);
  assert.equal(current.readoutsByItem["undertow-board"]?.damage, 12 * 10);
  assert.equal(after.readoutsByItem["undertow-board"]?.damage, 16 * 10);
  assert.equal(current.readoutsByItem["spike-shell"]?.damage, 15);
  assert.equal(current.readoutsByItem["spike-shell"]?.interval, 0.5);

  const pressured = itemProcPreview(
    itemCountsFromIds(["spike-shell", "pressure-valve"]),
    {},
    { pressureActive: true },
  );
  assert.equal(pressured.readoutsByItem["spike-shell"]?.damage, 30);
  assert.deepEqual(
    itemProcPreview(
      itemCountsFromIds(["spike-shell", "pressure-valve"]),
      {},
      { pressureActive: true },
    ).readoutsByItem["spike-shell"],
    {
      damage: 30,
      radius: 40,
      interval: 0.5,
    },
  );
});

test("proc previews keep damage dimensions separate from multipliers", () => {
  const oneSiphon = itemProcPreview(itemCountsFromIds(["siphon-bag"]));
  assert.deepEqual(oneSiphon.readoutsByItem["siphon-bag"], {
    multiplier: 1.25,
    radius: 193.75,
  });

  const twoSiphons = itemProcPreview(
    itemCountsFromIds(["siphon-bag", "siphon-bag"]),
  );
  assert.deepEqual(twoSiphons.readoutsByItem["siphon-bag"], {
    multiplier: 1.5,
    radius: 232.5,
  });

  const projectedMagnet = itemProcPreview(
    itemCountsFromIds(["siphon-bag", "magnetic-return"]),
  );
  assert.deepEqual(projectedMagnet.readoutsByItem["magnetic-return"], {
    damage: 25,
    radius: 375,
    threshold: 8,
    count: 10,
  });
});

test("proc preview separates owned values from inactive dependency and weapon copies", () => {
  const h2 = itemProcPreview(itemCountsFromIds(["undertow-board"]));
  assert.equal(h2.activeByItem["undertow-board"], true);
  assert.equal(h2.readoutsByItem["undertow-board"]?.damage, 12 * 10);

  const wedgeWithoutRoot = itemProcPreview(itemCountsFromIds(["wedge-ring"]));
  assert.equal(wedgeWithoutRoot.activeByItem["wedge-ring"], false);
  assert.equal(wedgeWithoutRoot.readoutsByItem["wedge-ring"]?.radius, 75);

  const twinWithoutGun = itemProcPreview(
    itemCountsFromIds(["twin-trigger"]),
    {},
    { weapons: ["saw"] },
  );
  assert.equal(twinWithoutGun.activeByItem["twin-trigger"], false);
  assert.equal(twinWithoutGun.readoutsByItem["twin-trigger"]?.count, 1);
});

test("approved queue, combat and wave caps are exported constants", () => {
  assert.deepEqual(QUEUE_CAPS, {
    pendingBlasts: 512,
    popcornFuelPending: 1024,
    corpseTrailShared: 180,
    physicalChests: 9,
    frozenChestChoices: 3,
  });
  assert.deepEqual(EXPEDITION_CAPS, {
    enemies: 180,
    sharedBullets: 420,
    scrapObjects: 250,
    blastsPerTick: 12,
    corpsesAndTrailPoints: 180,
    effects: 300,
    pendingBlasts: 512,
    popcornFuelPending: 1024,
    corpseTrailShared: 180,
    physicalChests: 9,
    frozenChestChoices: 3,
  });
});
