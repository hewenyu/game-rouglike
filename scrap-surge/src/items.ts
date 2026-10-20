import type { WeaponId } from "./data";

export const ITEM_FAMILIES = ["S", "C", "H", "F", "P"] as const;
export type ItemFamily = (typeof ITEM_FAMILIES)[number];

export const RARITIES = ["common", "uncommon", "rare"] as const;
export type ItemRarity = (typeof RARITIES)[number];

export const ITEM_IDS = [
  "worn-sandals",
  "tailwind-coil",
  "milestone",
  "surfboard",
  "volatile-trash",
  "wedge-ring",
  "short-fuse",
  "big-bang",
  "thick-shell",
  "undertow-board",
  "spike-shell",
  "pressure-valve",
  "scrap-powder",
  "long-barrel",
  "bent-nail",
  "twin-trigger",
  "magnetic-return",
  "scrap-popcorn",
  "hooked-tip",
  "siphon-bag",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type ItemShape =
  | "sandal"
  | "coil"
  | "milestone"
  | "board"
  | "trash"
  | "ring"
  | "fuse"
  | "burst"
  | "shell"
  | "undertow"
  | "spikes"
  | "valve"
  | "powder"
  | "barrel"
  | "nail"
  | "twin-trigger"
  | "magnet"
  | "popcorn"
  | "hook"
  | "siphon";

export interface ItemStats {
  damage: number;
  as: number;
  hpFlat: number;
  move: number;
  pickup: number;
  power: number;
}

export interface ItemDependencies {
  readonly allOf: readonly ItemId[];
  readonly anyOf: readonly ItemId[];
}

export interface ItemDefinition {
  readonly id: ItemId;
  readonly code:
    | "S1"
    | "S2"
    | "S3"
    | "S4"
    | "C1"
    | "C2"
    | "C3"
    | "C4"
    | "H1"
    | "H2"
    | "H3"
    | "H4"
    | "F1"
    | "F2"
    | "F3"
    | "F4"
    | "P1"
    | "P2"
    | "P3"
    | "P4";
  readonly family: ItemFamily;
  readonly name: string;
  readonly description: string;
  readonly shape: ItemShape;
  readonly rarity: ItemRarity;
  readonly cap: number;
  readonly unique: boolean;
  readonly dependencies: ItemDependencies;
  readonly weaponEligibility: readonly WeaponId[];
}

export type ItemCounts = Readonly<Partial<Record<ItemId, number>>>;

export const STAT_REWARD_IDS = [
  "damage",
  "as",
  "hpFlat",
  "move",
  "pickup",
  "power",
] as const;
export type StatRewardId = (typeof STAT_REWARD_IDS)[number];

export const CORE_ITEM_IDS: readonly ItemId[] = Object.freeze([
  "milestone",
  "volatile-trash",
  "undertow-board",
  "twin-trigger",
  "magnetic-return",
  "scrap-popcorn",
]);

function percent(value: number) {
  const rounded = Math.round(value * 10000) / 100;
  return `${rounded}%`;
}

export const ITEM_CONSTANTS = Object.freeze({
  wornSandalsMove: 0.12,
  wornSandalsHp: -1,
  tailwindMoveShare: 0.5,
  milestoneDistance: 90,
  milestoneRadius: 36,
  milestoneDamage: 30,
  milestoneLifetime: 1,
  surfboardMovingAs: 0.15,
  surfboardStillAs: -0.1,
  volatileTrashRadius: 75,
  volatileTrashDamage: 26,
  wedgeKillsPerStep: 4,
  wedgeRadiusStep: 0.1,
  wedgeCopyCap: 0.2,
  shortFuseWeaponDamage: -0.08,
  shortFusePower: 0.25,
  bigBangKills: 8,
  bigBangRadius: 160,
  bigBangDamage: 80,
  thickShellHp: 2,
  thickShellMove: -0.04,
  undertowRadiusBase: 90,
  undertowRadiusPerCopy: 10,
  undertowDamageBase: 8,
  undertowDamagePerCopy: 4,
  spikeShellInterval: 0.5,
  spikeShellRadius: 40,
  spikeShellDamage: 1.5,
  spikeShellKillHealEvery: 25,
  spikeShellHealPerWave: 3,
  pressureHurtDamage: 1,
  pressureDuration: 4,
  pressureWeaponDamage: 0.6,
  pressureSpikeMultiplier: 2,
  powderDamage: 0.08,
  longBarrelAs: 0.1,
  longBarrelRange: -0.06,
  longBarrelRangeFloor: 0.6,
  bentNailRocketRadius: 0.12,
  bentNailSawContact: 4,
  bentNailFistRange: 0.1,
  twinTriggerDamage: 0.75,
  magnetBaseRadius: 300,
  basePickupRadius: 155,
  magnetFuelEvery: 8,
  magnetCaps: 10,
  magnetDamage: 20,
  popcornShotsPerFuel: 2,
  popcornDamage: 18,
  hookPiercePerCopy: 1,
  siphonPickup: 0.25,
  siphonCoinRateStep: 0.15,
  siphonPickupBulletDamage: 0.25,
  fistRemnantDamage: 30,
} as const);

export const RARITY_BASE_PRICE: Readonly<Record<ItemRarity, number>> =
  Object.freeze({
    common: 10,
    uncommon: 16,
    rare: 26,
  });

export const ITEM_CAPS: Readonly<Record<ItemId, number>> = Object.freeze({
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
});

export const TWIN_TRIGGER_WEAPONS: readonly WeaponId[] = Object.freeze([
  "slinger",
  "shotgun",
  "rocket",
]);

export const QUEUE_CAPS = Object.freeze({
  pendingBlasts: 512,
  popcornFuelPending: 1024,
  corpseTrailShared: 180,
  physicalChests: 9,
  frozenChestChoices: 3,
});

export const EXPEDITION_CAPS = Object.freeze({
  enemies: 180,
  sharedBullets: 420,
  scrapObjects: 250,
  blastsPerTick: 12,
  corpsesAndTrailPoints: 180,
  effects: 300,
  ...QUEUE_CAPS,
});

const NO_DEPENDENCIES: ItemDependencies = Object.freeze({
  allOf: Object.freeze([]),
  anyOf: Object.freeze([]),
});

function dependency(
  allOf: readonly ItemId[] = [],
  anyOf: readonly ItemId[] = [],
): ItemDependencies {
  return Object.freeze({
    allOf: Object.freeze([...allOf]),
    anyOf: Object.freeze([...anyOf]),
  });
}

function item(definition: ItemDefinition): ItemDefinition {
  return Object.freeze({
    ...definition,
    dependencies: definition.dependencies ?? NO_DEPENDENCIES,
    weaponEligibility: Object.freeze([...definition.weaponEligibility]),
  });
}

export const ITEM_CATALOG: readonly ItemDefinition[] = Object.freeze([
  item({
    id: "worn-sandals",
    code: "S1",
    family: "S",
    name: "破凉鞋",
    description: `每份移动速度 ${percent(ITEM_CONSTANTS.wornSandalsMove)}，最大生命 ${ITEM_CONSTANTS.wornSandalsHp}；最多 ${ITEM_CAPS["worn-sandals"]} 份。`,
    shape: "sandal",
    rarity: "common",
    cap: ITEM_CAPS["worn-sandals"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "tailwind-coil",
    code: "S2",
    family: "S",
    name: "顺风线圈",
    description: `移动时每份把正向移动加成的 ${percent(ITEM_CONSTANTS.tailwindMoveShare)} 转化为武器伤害；最多 ${ITEM_CAPS["tailwind-coil"]} 份。`,
    shape: "coil",
    rarity: "uncommon",
    cap: ITEM_CAPS["tailwind-coil"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "milestone",
    code: "S3",
    family: "S",
    name: "里程碑",
    description: `战斗中每实际移动 ${ITEM_CONSTANTS.milestoneDistance} 像素留下持续 ${ITEM_CONSTANTS.milestoneLifetime} 秒、半径 ${ITEM_CONSTANTS.milestoneRadius} 的星痕；每个星痕对每个敌人造成 ${ITEM_CONSTANTS.milestoneDamage}×P，唯一。`,
    shape: "milestone",
    rarity: "rare",
    cap: ITEM_CAPS.milestone,
    unique: true,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "surfboard",
    code: "S4",
    family: "S",
    name: "冲浪板",
    description: `移动时每份攻速 ${percent(ITEM_CONSTANTS.surfboardMovingAs)}，静止时每份攻速 ${percent(ITEM_CONSTANTS.surfboardStillAs)}；最多 ${ITEM_CAPS.surfboard} 份。`,
    shape: "board",
    rarity: "uncommon",
    cap: ITEM_CAPS.surfboard,
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "volatile-trash",
    code: "C1",
    family: "C",
    name: "易爆垃圾",
    description: `每次真实死亡排入半径 ${ITEM_CONSTANTS.volatileTrashRadius}、伤害 ${ITEM_CONSTANTS.volatileTrashDamage}×P 的爆炸；次生击杀可继续触发，唯一。`,
    shape: "trash",
    rarity: "rare",
    cap: ITEM_CAPS["volatile-trash"],
    unique: true,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "wedge-ring",
    code: "C2",
    family: "C",
    name: "楔形环",
    description: `需先拥有易爆垃圾；同一因果根内每 ${ITEM_CONSTANTS.wedgeKillsPerStep} 次次生击杀使后续爆炸半径 +${percent(ITEM_CONSTANTS.wedgeRadiusStep)}，每份上限 ${percent(ITEM_CONSTANTS.wedgeCopyCap)}；最多 ${ITEM_CAPS["wedge-ring"]} 份。`,
    shape: "ring",
    rarity: "uncommon",
    cap: ITEM_CAPS["wedge-ring"],
    unique: false,
    dependencies: dependency(["volatile-trash"]),
    weaponEligibility: [],
  }),
  item({
    id: "short-fuse",
    code: "C3",
    family: "C",
    name: "短引信",
    description: `每份武器伤害 ${percent(ITEM_CONSTANTS.shortFuseWeaponDamage)}，P +${percent(ITEM_CONSTANTS.shortFusePower)}；最多 ${ITEM_CAPS["short-fuse"]} 份。`,
    shape: "fuse",
    rarity: "common",
    cap: ITEM_CAPS["short-fuse"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "big-bang",
    code: "C4",
    family: "C",
    name: "大爆炸",
    description: `需先拥有易爆垃圾；同一因果根内每 ${ITEM_CONSTANTS.bigBangKills} 次次生击杀追加一次半径 ${ITEM_CONSTANTS.bigBangRadius}、伤害 ${ITEM_CONSTANTS.bigBangDamage}×P 的爆炸，唯一。`,
    shape: "burst",
    rarity: "rare",
    cap: ITEM_CAPS["big-bang"],
    unique: true,
    dependencies: dependency(["volatile-trash"]),
    weaponEligibility: [],
  }),
  item({
    id: "thick-shell",
    code: "H1",
    family: "H",
    name: "厚壳",
    description: `每份最大生命 +${ITEM_CONSTANTS.thickShellHp}、移动速度 ${percent(ITEM_CONSTANTS.thickShellMove)}；最多 ${ITEM_CAPS["thick-shell"]} 份。`,
    shape: "shell",
    rarity: "common",
    cap: ITEM_CAPS["thick-shell"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "undertow-board",
    code: "H2",
    family: "H",
    name: "暗流板",
    description: `每份让已接受的致伤接触爆炸半径 +${ITEM_CONSTANTS.undertowRadiusPerCopy}、伤害 +${ITEM_CONSTANTS.undertowDamagePerCopy}×最大生命×P；基础半径 ${ITEM_CONSTANTS.undertowRadiusBase}，最多 ${ITEM_CAPS["undertow-board"]} 份。敌方子弹不触发。`,
    shape: "undertow",
    rarity: "uncommon",
    cap: ITEM_CAPS["undertow-board"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "spike-shell",
    code: "H3",
    family: "H",
    name: "刺壳",
    description: `每 ${ITEM_CONSTANTS.spikeShellInterval} 秒放出半径 ${ITEM_CONSTANTS.spikeShellRadius} 的刺环，每份造成 ${ITEM_CONSTANTS.spikeShellDamage}×最大生命×P；每 ${ITEM_CONSTANTS.spikeShellKillHealEvery} 次直接刺环或暗流接触爆炸击杀回复 1，每波最多 ${ITEM_CONSTANTS.spikeShellHealPerWave}，最多 ${ITEM_CAPS["spike-shell"]} 份。`,
    shape: "spikes",
    rarity: "uncommon",
    cap: ITEM_CAPS["spike-shell"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "pressure-valve",
    code: "H4",
    family: "H",
    name: "压力阀",
    description: `所有已接受的受伤 +${ITEM_CONSTANTS.pressureHurtDamage}；非致命受伤触发 ${ITEM_CONSTANTS.pressureDuration} 秒武器伤害 +${percent(ITEM_CONSTANTS.pressureWeaponDamage)}、刺壳伤害 ×${ITEM_CONSTANTS.pressureSpikeMultiplier}，无敌时间不变，唯一。`,
    shape: "valve",
    rarity: "rare",
    cap: ITEM_CAPS["pressure-valve"],
    unique: true,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "scrap-powder",
    code: "F1",
    family: "F",
    name: "废料火药",
    description: `每份武器伤害 +${percent(ITEM_CONSTANTS.powderDamage)}；最多 ${ITEM_CAPS["scrap-powder"]} 份。`,
    shape: "powder",
    rarity: "common",
    cap: ITEM_CAPS["scrap-powder"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "long-barrel",
    code: "F2",
    family: "F",
    name: "长枪管",
    description: `每份攻速 +${percent(ITEM_CONSTANTS.longBarrelAs)}、射程 ${percent(ITEM_CONSTANTS.longBarrelRange)}，射程最低为 ${percent(ITEM_CONSTANTS.longBarrelRangeFloor)}；最多 ${ITEM_CAPS["long-barrel"]} 份。`,
    shape: "barrel",
    rarity: "common",
    cap: ITEM_CAPS["long-barrel"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "bent-nail",
    code: "F3",
    family: "F",
    name: "弯钉",
    description: `每份让快枪与散弹穿透 +1、电池跳数 +1、火箭半径 +${percent(ITEM_CONSTANTS.bentNailRocketRadius)}、餐叉接触半径 +${ITEM_CONSTANTS.bentNailSawContact}、拳套射程 +${percent(ITEM_CONSTANTS.bentNailFistRange)}；最多 ${ITEM_CAPS["bent-nail"]} 份。`,
    shape: "nail",
    rarity: "uncommon",
    cap: ITEM_CAPS["bent-nail"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "twin-trigger",
    code: "F4",
    family: "F",
    name: "双联扳机",
    description: `仅快枪、散弹和火箭：每份发数 +1、每枚弹丸伤害 ×${ITEM_CONSTANTS.twinTriggerDamage}；最多 ${ITEM_CAPS["twin-trigger"]} 份，需要当前持有至少一把适用武器。`,
    shape: "twin-trigger",
    rarity: "rare",
    cap: ITEM_CAPS["twin-trigger"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: TWIN_TRIGGER_WEAPONS,
  }),
  item({
    id: "magnetic-return",
    code: "P1",
    family: "P",
    name: "磁力回潮",
    description: `拾取基础半径变为 ${ITEM_CONSTANTS.magnetBaseRadius}（再计拾取加成）；每 ${ITEM_CONSTANTS.magnetFuelEvery} 单位燃料发射 ${ITEM_CONSTANTS.magnetCaps} 枚 ${ITEM_CONSTANTS.magnetDamage}×P 瓶盖，唯一。`,
    shape: "magnet",
    rarity: "uncommon",
    cap: ITEM_CAPS["magnetic-return"],
    unique: true,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "scrap-popcorn",
    code: "P2",
    family: "P",
    name: "废料爆米花",
    description: `每单位燃料排入 ${ITEM_CONSTANTS.popcornShotsPerFuel} 发 ${ITEM_CONSTANTS.popcornDamage}×P 的寻敌弹，唯一。`,
    shape: "popcorn",
    rarity: "rare",
    cap: ITEM_CAPS["scrap-popcorn"],
    unique: true,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
  item({
    id: "hooked-tip",
    code: "P3",
    family: "P",
    name: "钩尖",
    description: `需先拥有磁力回潮或废料爆米花；每份让拾取弹穿透 +${ITEM_CONSTANTS.hookPiercePerCopy}，磁力瓶盖获得寻敌；最多 ${ITEM_CAPS["hooked-tip"]} 份。`,
    shape: "hook",
    rarity: "uncommon",
    cap: ITEM_CAPS["hooked-tip"],
    unique: false,
    dependencies: dependency([], ["magnetic-return", "scrap-popcorn"]),
    weaponEligibility: [],
  }),
  item({
    id: "siphon-bag",
    code: "P4",
    family: "P",
    name: "虹吸袋",
    description: `每份拾取 +${percent(ITEM_CONSTANTS.siphonPickup)}、废料钱币转化率 -${percent(ITEM_CONSTANTS.siphonCoinRateStep)}、拾取弹伤害 +${percent(ITEM_CONSTANTS.siphonPickupBulletDamage)}；最多 ${ITEM_CAPS["siphon-bag"]} 份，燃料不受影响。`,
    shape: "siphon",
    rarity: "common",
    cap: ITEM_CAPS["siphon-bag"],
    unique: false,
    dependencies: NO_DEPENDENCIES,
    weaponEligibility: [],
  }),
]);

export const ITEM_BY_ID: Readonly<Record<ItemId, ItemDefinition>> =
  Object.freeze(
    Object.fromEntries(
      ITEM_CATALOG.map((entry) => [entry.id, entry]),
    ) as Record<ItemId, ItemDefinition>,
  );

export function itemCount(owned: ItemCounts, id: ItemId) {
  const value = owned[id] ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function itemCountsFromIds(ids: readonly ItemId[]): ItemCounts {
  const counts: Partial<Record<ItemId, number>> = {};
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return Object.freeze(counts);
}

export function itemCountsWith(
  owned: ItemCounts,
  id: ItemId,
  amount = 1,
): Readonly<Record<ItemId, number>> {
  const counts = Object.fromEntries(
    ITEM_IDS.map((itemId) => [itemId, itemCount(owned, itemId)]),
  ) as Record<ItemId, number>;
  counts[id] += amount;
  return Object.freeze(counts);
}

export type ItemEligibilityReason =
  | "unique-owned"
  | "cap-reached"
  | "missing-dependency"
  | "missing-eligible-weapon";

export interface ItemEligibility {
  readonly id: ItemId;
  readonly eligible: boolean;
  readonly ownedCount: number;
  readonly remaining: number;
  readonly reasons: readonly ItemEligibilityReason[];
}

export function itemEligibility(
  id: ItemId,
  owned: ItemCounts,
  weapons: readonly WeaponId[] = [],
): ItemEligibility {
  const definition = ITEM_BY_ID[id];
  const ownedCount = itemCount(owned, id);
  const remaining = Math.max(0, definition.cap - ownedCount);
  const reasons: ItemEligibilityReason[] = [];

  if (definition.unique && ownedCount > 0) reasons.push("unique-owned");
  else if (ownedCount >= definition.cap) reasons.push("cap-reached");

  const allDependenciesMet = definition.dependencies.allOf.every(
    (required) => itemCount(owned, required) > 0,
  );
  const anyDependencyMet =
    definition.dependencies.anyOf.length === 0 ||
    definition.dependencies.anyOf.some(
      (required) => itemCount(owned, required) > 0,
    );
  if (!allDependenciesMet || !anyDependencyMet)
    reasons.push("missing-dependency");

  if (
    definition.weaponEligibility.length > 0 &&
    !definition.weaponEligibility.some((weapon) => weapons.includes(weapon))
  )
    reasons.push("missing-eligible-weapon");

  return Object.freeze({
    id,
    eligible: reasons.length === 0,
    ownedCount,
    remaining,
    reasons: Object.freeze(reasons),
  });
}

export function canOwnItem(
  id: ItemId,
  owned: ItemCounts,
  weapons: readonly WeaponId[] = [],
) {
  return itemEligibility(id, owned, weapons).eligible;
}

export function itemPrice(id: ItemId, wave: number, copiesOwned: number = 0) {
  const definition = ITEM_BY_ID[id];
  const copies = Number.isFinite(copiesOwned)
    ? Math.max(0, Math.floor(copiesOwned))
    : 0;
  return Math.ceil(
    RARITY_BASE_PRICE[definition.rarity] *
      ((wave + 4) / 5) *
      (1 + 0.15 * copies),
  );
}

export interface RarityWeights {
  readonly common: number;
  readonly uncommon: number;
  readonly rare: number;
}

function weights(
  common: number,
  uncommon: number,
  rare: number,
): RarityWeights {
  return Object.freeze({ common, uncommon, rare });
}

function clampedItemWave(wave: number) {
  return Math.max(1, Math.min(20, Math.floor(wave)));
}

export function shopRarityWeights(wave: number): RarityWeights {
  const normalized = clampedItemWave(wave);
  if (normalized <= 5) return weights(70, 27, 3);
  if (normalized <= 12) return weights(55, 35, 10);
  return weights(40, 40, 20);
}

export function eliteRarityWeights(wave: number): RarityWeights {
  const shop = shopRarityWeights(wave);
  const total = shop.uncommon + shop.rare;
  return weights(0, (shop.uncommon / total) * 100, (shop.rare / total) * 100);
}

const BOSS_RARITY_WEIGHTS: Readonly<Record<5 | 10 | 15, RarityWeights>> =
  Object.freeze({
    5: weights(0, 60, 40),
    10: weights(0, 45, 55),
    15: weights(0, 30, 70),
  });

export function bossRarityWeights(wave: number): RarityWeights {
  const normalized = Math.floor(wave);
  if (normalized !== 5 && normalized !== 10 && normalized !== 15)
    throw new RangeError(
      "Boss item rarity weights exist only for W5, W10 and W15",
    );
  return BOSS_RARITY_WEIGHTS[normalized];
}

export type ItemLootSource = "shop" | "elite" | "boss";

export interface ItemDrawOptions {
  readonly owned: ItemCounts;
  readonly weapons?: readonly WeaponId[];
  readonly count: number;
  readonly source: ItemLootSource;
  readonly wave: number;
  readonly rng: () => number;
}

function rarityWeightsFor(source: ItemLootSource, wave: number): RarityWeights {
  if (source === "shop") return shopRarityWeights(wave);
  if (source === "elite") return eliteRarityWeights(wave);
  return bossRarityWeights(wave);
}

function allowedRarities(source: ItemLootSource): readonly ItemRarity[] {
  return source === "shop" ? RARITIES : (["uncommon", "rare"] as const);
}

function randomUnit(rng: () => number) {
  const value = rng();
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

export function drawItemOffers(options: ItemDrawOptions): readonly ItemId[] {
  const rarities = allowedRarities(options.source);
  const rarityWeights = rarityWeightsFor(options.source, options.wave);
  const available: Record<ItemRarity, ItemId[]> = {
    common: [],
    uncommon: [],
    rare: [],
  };

  for (const definition of ITEM_CATALOG) {
    if (!rarities.includes(definition.rarity)) continue;
    if (!canOwnItem(definition.id, options.owned, options.weapons ?? []))
      continue;
    available[definition.rarity].push(definition.id);
  }

  const picked: ItemId[] = [];
  const count = Number.isFinite(options.count)
    ? Math.max(0, Math.floor(options.count))
    : 0;
  while (picked.length < count) {
    const contenders = rarities.filter(
      (rarity) => available[rarity].length > 0 && rarityWeights[rarity] > 0,
    );
    if (contenders.length === 0) break;

    const totalWeight = contenders.reduce(
      (sum, rarity) => sum + rarityWeights[rarity],
      0,
    );
    let roll = randomUnit(options.rng) * totalWeight;
    let selected = contenders[contenders.length - 1];
    for (const rarity of contenders) {
      roll -= rarityWeights[rarity];
      if (roll < 0) {
        selected = rarity;
        break;
      }
    }

    const group = available[selected];
    const index = Math.min(
      group.length - 1,
      Math.floor(randomUnit(options.rng) * group.length),
    );
    const [id] = group.splice(index, 1);
    if (id) picked.push(id);
  }

  return Object.freeze(picked);
}

function drawDistinct<T>(
  values: readonly T[],
  count: number,
  rng: () => number,
): readonly T[] {
  const pool = [...values];
  const picked: T[] = [];
  const target = Math.max(0, Math.floor(count));
  while (picked.length < target && pool.length > 0) {
    const index = Math.min(
      pool.length - 1,
      Math.floor(randomUnit(rng) * pool.length),
    );
    const [value] = pool.splice(index, 1);
    if (value !== undefined) picked.push(value);
  }
  return Object.freeze(picked);
}

export function drawCoreRewards(
  owned: ItemCounts,
  weapons: readonly WeaponId[],
  count: number,
  rng: () => number,
): readonly ItemId[] {
  const legal = CORE_ITEM_IDS.filter((id) => canOwnItem(id, owned, weapons));
  return drawDistinct(legal, count, rng);
}

export function drawStatRewards(
  count: number,
  rng: () => number,
): readonly StatRewardId[] {
  return drawDistinct(STAT_REWARD_IDS, count, rng);
}

export const STAT_REWARD_AMOUNTS: Readonly<Record<StatRewardId, number>> =
  Object.freeze({
    damage: 0.06,
    as: 0.06,
    hpFlat: 1,
    move: 0.05,
    pickup: 0.15,
    power: 0.08,
  });

export function applyStatReward(
  stats: Partial<ItemStats>,
  reward: StatRewardId,
): Readonly<ItemStats> {
  return Object.freeze({
    damage: statValue(stats.damage),
    as: statValue(stats.as),
    hpFlat: statValue(stats.hpFlat),
    move: statValue(stats.move),
    pickup: statValue(stats.pickup),
    power: statValue(stats.power),
    [reward]: statValue(stats[reward]) + STAT_REWARD_AMOUNTS[reward],
  });
}

export const EMPTY_ITEM_STATS: Readonly<ItemStats> = Object.freeze({
  damage: 0,
  as: 0,
  hpFlat: 0,
  move: 0,
  pickup: 0,
  power: 0,
});

export interface ItemDerivationContext {
  readonly moved?: boolean;
  readonly pressureActive?: boolean;
  readonly weapons?: readonly WeaponId[];
}

export interface ItemHurtExplosion {
  readonly radius: number;
  readonly damage: number;
}

export interface DerivedItemStats {
  readonly stats: Readonly<ItemStats>;
  readonly counts: Readonly<Record<ItemId, number>>;
  readonly moveFactor: number;
  readonly moveBonus: number;
  readonly weaponFactor: number;
  readonly asFactor: number;
  readonly powerFactor: number;
  readonly maxHp: number;
  readonly pickupRadius: number;
  readonly milestoneDamage: number;
  readonly volatileTrashDamage: number;
  readonly bigBangDamage: number;
  readonly hurtExplosion: ItemHurtExplosion;
  readonly spikeShellDamage: number;
  readonly fistRemnantDamage: number;
  readonly pickupBulletPierce: number;
  readonly pickupBulletHoming: boolean;
  readonly pickupBulletDamageMultiplier: number;
  readonly acceptedHurtDamageBonus: number;
}

function statValue(value: number | undefined) {
  return Number.isFinite(value) ? value! : 0;
}

export function deriveItemStats(
  owned: ItemCounts,
  statRewards: Partial<ItemStats> = EMPTY_ITEM_STATS,
  context: ItemDerivationContext = {},
): DerivedItemStats {
  const counts = Object.fromEntries(
    ITEM_IDS.map((id) => [id, itemCount(owned, id)]),
  ) as Record<ItemId, number>;
  const stats: ItemStats = Object.freeze({
    damage: statValue(statRewards.damage),
    as: statValue(statRewards.as),
    hpFlat: statValue(statRewards.hpFlat),
    move: statValue(statRewards.move),
    pickup: statValue(statRewards.pickup),
    power: statValue(statRewards.power),
  });
  const moved = context.moved === true;
  const pressureActive = context.pressureActive === true;
  const s1 = counts["worn-sandals"];
  const s2 = counts["tailwind-coil"];
  const s4 = counts.surfboard;
  const c3 = counts["short-fuse"];
  const h1 = counts["thick-shell"];
  const h2 = counts["undertow-board"];
  const h3 = counts["spike-shell"];
  const f1 = counts["scrap-powder"];
  const f2 = counts["long-barrel"];
  const p1 = counts["magnetic-return"];
  const p4 = counts["siphon-bag"];

  const moveFactor = Math.max(
    0.4,
    1 +
      stats.move +
      ITEM_CONSTANTS.wornSandalsMove * s1 +
      ITEM_CONSTANTS.thickShellMove * h1,
  );
  const moveBonus = moved ? Math.max(0, moveFactor - 1) : 0;
  const weaponFactor = Math.max(
    0.1,
    1 +
      stats.damage +
      ITEM_CONSTANTS.powderDamage * f1 +
      ITEM_CONSTANTS.shortFuseWeaponDamage * c3 +
      ITEM_CONSTANTS.tailwindMoveShare * s2 * moveBonus +
      (pressureActive ? ITEM_CONSTANTS.pressureWeaponDamage : 0),
  );
  const asFactor = Math.max(
    0.2,
    1 +
      stats.as +
      ITEM_CONSTANTS.longBarrelAs * f2 +
      (moved
        ? ITEM_CONSTANTS.surfboardMovingAs
        : ITEM_CONSTANTS.surfboardStillAs) *
        s4,
  );
  const powerFactor = Math.max(
    0.1,
    1 + stats.power + ITEM_CONSTANTS.shortFusePower * c3,
  );
  const maxHp = Math.max(
    3,
    10 + stats.hpFlat + ITEM_CONSTANTS.thickShellHp * h1 - s1,
  );
  const pickupRadius =
    (p1 > 0
      ? ITEM_CONSTANTS.magnetBaseRadius
      : ITEM_CONSTANTS.basePickupRadius) *
    (1 + stats.pickup + ITEM_CONSTANTS.siphonPickup * p4);
  const hurtExplosion = Object.freeze({
    radius:
      ITEM_CONSTANTS.undertowRadiusBase +
      ITEM_CONSTANTS.undertowRadiusPerCopy * h2,
    damage:
      (ITEM_CONSTANTS.undertowDamageBase +
        ITEM_CONSTANTS.undertowDamagePerCopy * h2) *
      maxHp *
      powerFactor,
  });
  const spikeShellDamage =
    ITEM_CONSTANTS.spikeShellDamage *
    maxHp *
    h3 *
    powerFactor *
    (pressureActive ? ITEM_CONSTANTS.pressureSpikeMultiplier : 1);

  return Object.freeze({
    stats,
    counts: Object.freeze(counts),
    moveFactor,
    moveBonus,
    weaponFactor,
    asFactor,
    powerFactor,
    maxHp,
    pickupRadius,
    milestoneDamage: ITEM_CONSTANTS.milestoneDamage * powerFactor,
    volatileTrashDamage: ITEM_CONSTANTS.volatileTrashDamage * powerFactor,
    bigBangDamage: ITEM_CONSTANTS.bigBangDamage * powerFactor,
    hurtExplosion,
    spikeShellDamage,
    fistRemnantDamage: ITEM_CONSTANTS.fistRemnantDamage * weaponFactor,
    pickupBulletPierce: counts["hooked-tip"] * ITEM_CONSTANTS.hookPiercePerCopy,
    pickupBulletHoming: counts["hooked-tip"] > 0,
    pickupBulletDamageMultiplier:
      1 + ITEM_CONSTANTS.siphonPickupBulletDamage * p4,
    acceptedHurtDamageBonus:
      counts["pressure-valve"] * ITEM_CONSTANTS.pressureHurtDamage,
  });
}

export function wedgeRingRadius(
  secondaryKillsInSameRoot: number,
  wedgeCopies: number,
) {
  const kills = Math.max(0, Math.floor(secondaryKillsInSameRoot));
  const copies = Math.max(0, Math.floor(wedgeCopies));
  const growth = Math.min(
    ITEM_CONSTANTS.wedgeCopyCap * copies,
    ITEM_CONSTANTS.wedgeRadiusStep *
      Math.floor(kills / ITEM_CONSTANTS.wedgeKillsPerStep),
  );
  return ITEM_CONSTANTS.volatileTrashRadius * (1 + growth);
}

export interface WeaponItemModifiers {
  readonly damageMultiplier: number;
  readonly attackSpeedMultiplier: number;
  readonly rangeMultiplier: number;
  readonly extraProjectiles: number;
  readonly extraPierce: number;
  readonly extraJumps: number;
  readonly rocketRadiusMultiplier: number;
  readonly sawContactRadiusBonus: number;
}

export function weaponItemModifiers(
  weaponId: WeaponId,
  derived: DerivedItemStats,
): WeaponItemModifiers {
  const f2 = derived.counts["long-barrel"];
  const f3 = derived.counts["bent-nail"];
  const f4 = derived.counts["twin-trigger"];
  const twinTriggerEligible = TWIN_TRIGGER_WEAPONS.includes(weaponId);
  const rangeMultiplier = Math.max(
    ITEM_CONSTANTS.longBarrelRangeFloor,
    1 +
      ITEM_CONSTANTS.longBarrelRange * f2 +
      (weaponId === "fist" ? ITEM_CONSTANTS.bentNailFistRange * f3 : 0),
  );

  return Object.freeze({
    damageMultiplier:
      derived.weaponFactor *
      (twinTriggerEligible
        ? Math.pow(ITEM_CONSTANTS.twinTriggerDamage, f4)
        : 1),
    attackSpeedMultiplier: derived.asFactor,
    rangeMultiplier,
    extraProjectiles: twinTriggerEligible ? f4 : 0,
    extraPierce: weaponId === "slinger" || weaponId === "shotgun" ? f3 : 0,
    extraJumps: weaponId === "coil" ? f3 : 0,
    rocketRadiusMultiplier:
      weaponId === "rocket" ? 1 + ITEM_CONSTANTS.bentNailRocketRadius * f3 : 1,
    sawContactRadiusBonus:
      weaponId === "saw" ? ITEM_CONSTANTS.bentNailSawContact * f3 : 0,
  });
}

export interface VolleyProfile {
  readonly damage: number;
  readonly interval: number;
  readonly pellets: number;
  readonly shots: number;
}

export function projectileCount(profile: VolleyProfile) {
  return profile.pellets * profile.shots;
}

export function perVolleyDps(profile: VolleyProfile) {
  return (profile.damage * projectileCount(profile)) / profile.interval;
}

export const INCOME_RATE_MILLI = Object.freeze([200, 170, 140, 110] as const);

export function coinRateMilli(siphonCopies: number) {
  const copies = Number.isFinite(siphonCopies)
    ? Math.max(0, Math.floor(siphonCopies))
    : 0;
  return Math.max(10, 100 - 15 * copies) * 2;
}

export interface IncomeCredit {
  readonly wallet: number;
  readonly remainder: number;
  readonly earned: number;
  readonly rateMilli: number;
}

export function creditRawCash(
  wallet: number,
  remainder: number,
  rawCash: number,
  siphonCopies: number = 0,
  curseMultiplier: number = 1,
): IncomeCredit {
  const safeWallet = Math.max(0, Math.floor(wallet));
  const safeRemainder = Math.max(0, Math.floor(remainder)) % 1000;
  const units = Math.max(0, Math.floor(rawCash));
  const multiplier =
    Number.isFinite(curseMultiplier) && curseMultiplier > 0
      ? Math.floor(curseMultiplier)
      : 1;
  const rateMilli = coinRateMilli(siphonCopies) * multiplier;
  const accumulated = safeRemainder + units * rateMilli;
  const earned = Math.floor(accumulated / 1000);
  return Object.freeze({
    wallet: safeWallet + earned,
    remainder: accumulated % 1000,
    earned,
    rateMilli,
  });
}

export interface ItemPurchasePreview {
  readonly itemId: ItemId;
  readonly copyNumber: number;
  readonly cap: number;
  readonly unique: boolean;
  readonly effect: string;
}

export function purchaseEffectPreview(
  id: ItemId,
  copiesOwned: number = 0,
): ItemPurchasePreview {
  const definition = ITEM_BY_ID[id];
  const count = Number.isFinite(copiesOwned)
    ? Math.max(0, Math.floor(copiesOwned))
    : 0;
  return Object.freeze({
    itemId: id,
    copyNumber: Math.min(definition.cap, count + 1),
    cap: definition.cap,
    unique: definition.unique,
    effect: definition.description,
  });
}
