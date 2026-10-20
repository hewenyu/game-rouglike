import { WEAPONS, type ModId, type WeaponId } from "./data";
import type { WeaponItemModifiers } from "./items";

export type Formation = "ring" | "stream" | "two-cluster";
export type Stop = "full" | "quick" | "auto" | "end";
export type QuickKind = "mod-1" | "mod-2" | "branch" | "mod-upgrade";
export type ExpeditionBranch = "wake" | "ember";

export const EXPEDITION_MODES = ["slice", "expedition20"] as const;
export type GameMode = (typeof EXPEDITION_MODES)[number];

export const DURATIONS = [
  20, 22, 24, 26, 28, 28, 30, 30, 32, 40, 32, 34, 34, 36, 45, 38, 38, 40, 40,
  75,
] as const;

export const RATES = [
  3.1, 3.4, 3.7, 4, 4.4, 4.6, 4.8, 5, 5.2, 5.4, 5.6, 5.8, 6, 6.2, 6.4, 6.6, 6.8,
  7, 7.4, 7.8,
] as const;

export const POCKETS: readonly (readonly [number, number, Formation][])[] = [
  [
    [6, 12, "ring"],
    [14, 12, "ring"],
  ],
  [
    [5, 13, "ring"],
    [12, 13, "ring"],
    [18, 13, "ring"],
  ],
  [
    [6, 14, "ring"],
    [14, 14, "ring"],
    [21, 14, "ring"],
  ],
  [
    [6, 14, "ring"],
    [13, 14, "ring"],
    [20, 14, "ring"],
  ],
  [
    [5, 15, "ring"],
    [12, 15, "ring"],
    [19, 15, "ring"],
    [25, 15, "ring"],
  ],
  [
    [6, 15, "stream"],
    [13, 15, "stream"],
    [20, 15, "stream"],
  ],
  [
    [6, 16, "stream"],
    [14, 16, "stream"],
    [22, 16, "stream"],
  ],
  [
    [5, 16, "stream"],
    [13, 16, "stream"],
    [21, 16, "stream"],
    [27, 16, "stream"],
  ],
  [
    [6, 17, "stream"],
    [14, 17, "stream"],
    [22, 17, "stream"],
    [29, 17, "stream"],
  ],
  [
    [6, 17, "ring"],
    [14, 17, "ring"],
    [22, 17, "ring"],
    [30, 17, "ring"],
    [36, 17, "ring"],
  ],
  [
    [8, 12, "stream"],
    [12, 12, "stream"],
    [16, 12, "stream"],
    [20, 12, "stream"],
    [24, 12, "stream"],
    [28, 12, "stream"],
  ],
  [
    [8, 12, "two-cluster"],
    [20, 12, "two-cluster"],
    [28, 18, "two-cluster"],
  ],
  [
    [7, 18, "two-cluster"],
    [14, 18, "two-cluster"],
    [21, 18, "two-cluster"],
    [28, 18, "two-cluster"],
  ],
  [
    [8, 12, "stream"],
    [11.5, 12, "stream"],
    [15, 12, "stream"],
    [18.5, 12, "stream"],
    [22, 12, "stream"],
    [25.5, 12, "stream"],
    [29, 12, "stream"],
  ],
  [
    [6, 20, "two-cluster"],
    [14, 20, "two-cluster"],
    [22, 20, "two-cluster"],
    [30, 20, "two-cluster"],
    [38, 20, "two-cluster"],
  ],
  [
    [8, 12, "stream"],
    [12, 12, "stream"],
    [16, 12, "stream"],
    [20, 12, "stream"],
    [24, 12, "stream"],
    [28, 12, "stream"],
    [32, 12, "stream"],
    [35, 12, "stream"],
  ],
  [
    [6, 20, "two-cluster"],
    [24, 20, "two-cluster"],
  ],
  [
    [6, 18, "ring"],
    [20, 18, "ring"],
    [32, 18, "two-cluster"],
  ],
  [
    [5, 16, "ring"],
    [10, 10, "stream"],
    [15, 16, "ring"],
    [20, 10, "stream"],
    [25, 16, "ring"],
    [30, 10, "stream"],
    [35, 16, "ring"],
  ],
  [
    [6, 12, "ring"],
    [20, 12, "ring"],
    [34, 12, "ring"],
    [50, 12, "ring"],
    [66, 12, "ring"],
  ],
];

// bag / runner / can / splitter / spitter percentages
export const MIX: readonly (readonly [
  number,
  number,
  number,
  number,
  number,
])[] = [
  [87, 13, 0, 0, 0],
  [62, 26, 12, 0, 0],
  [62, 24, 14, 0, 0],
  [56, 26, 18, 0, 0],
  [52, 26, 22, 0, 0],
  [46, 24, 18, 12, 0],
  [44, 24, 18, 14, 0],
  [42, 24, 18, 16, 0],
  [40, 24, 18, 18, 0],
  [38, 24, 18, 20, 0],
  [40, 22, 22, 16, 0],
  [34, 20, 18, 12, 16],
  [32, 20, 18, 14, 16],
  [30, 20, 18, 16, 16],
  [28, 20, 18, 18, 16],
  [26, 20, 18, 20, 16],
  [24, 20, 18, 22, 16],
  [30, 20, 16, 20, 14],
  [32, 20, 16, 18, 14],
  [26, 20, 16, 22, 16],
];

export const POCKET_MIX: readonly (readonly [
  number,
  number,
  number,
  number,
  number,
])[] = [
  [58, 42, 0, 0, 0],
  [56, 28, 16, 0, 0],
  [56, 28, 16, 0, 0],
  [54, 26, 20, 0, 0],
  [50, 26, 24, 0, 0],
  [42, 24, 22, 12, 0],
  [40, 24, 22, 14, 0],
  [38, 24, 22, 16, 0],
  [36, 24, 22, 18, 0],
  [34, 24, 22, 20, 0],
  [38, 22, 24, 16, 0],
  [32, 20, 20, 12, 16],
  [30, 20, 20, 14, 16],
  [28, 20, 20, 16, 16],
  [26, 20, 20, 18, 16],
  [24, 20, 20, 20, 16],
  [24, 20, 18, 22, 16],
  [24, 20, 18, 24, 14],
  [24, 20, 18, 24, 14],
  [20, 20, 18, 26, 16],
];

export const BAG_HP = [
  17, 17, 17, 17, 17, 20, 20, 20, 20, 20, 24, 24, 24, 24, 24, 24, 24, 17, 17,
  24,
] as const;
export const HP_MULT = [
  1, 1, 1.15, 1.3, 1.45, 1.6, 1.75, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.15, 3.4,
  3.7, 4, 4.35, 4.7, 5.1,
] as const;
export const BASE_HP = {
  bag: 17,
  runner: 19,
  can: 75,
  splitter: 40,
  chip: 8,
  spitter: 55,
} as const;
export type ExpeditionEnemyKind =
  "bag" | "runner" | "can" | "splitter" | "chip" | "spitter";
export const MIX_KINDS: readonly ExpeditionEnemyKind[] = [
  "bag",
  "runner",
  "can",
  "splitter",
  "spitter",
];
export type GunTier = 1 | 2 | 3 | 4;
export type EffectiveWeaponProfile = {
  tier: GunTier;
  damage: number;
  interval: number;
  range: number;
  pellets: number;
  jumps: number;
  jumpRange: number;
  shots: number;
  saws: number;
  blastRadius: number;
  sawOrbitRadius: number;
  sawContactRadius: number;
  pierce?: number;
};
export type PurchasePreview = {
  accepted: boolean;
  reason: "no-space" | null;
  tier: GunTier;
  incomingTier: GunTier;
  merged: boolean;
};

export const STOP_AFTER: readonly (Stop | null)[] = [
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "full",
  "end",
];

export const ELITE_WAVES = [3, 7, 11, 14, 17, 19] as const;
export const ELITE_TIMER_SHARE = 0.35;
export const ELITE_STATS: Readonly<
  Record<number, { hp: number; speed: number; radius: number; contact: number }>
> = Object.freeze({
  3: Object.freeze({ hp: 360, speed: 71.4, radius: 28, contact: 1 }),
  7: Object.freeze({ hp: 900, speed: 71.4, radius: 28, contact: 1 }),
  11: Object.freeze({ hp: 1500, speed: 71.4, radius: 28, contact: 1 }),
  14: Object.freeze({ hp: 2000, speed: 71.4, radius: 28, contact: 1 }),
  17: Object.freeze({ hp: 2800, speed: 71.4, radius: 28, contact: 1 }),
  19: Object.freeze({ hp: 3400, speed: 71.4, radius: 28, contact: 1 }),
});

export const BRANCHES: Record<
  ExpeditionBranch,
  { name: string; en: string; desc: string; icon: string }
> = {
  wake: {
    name: "航迹",
    en: "WAKE",
    desc: "战场拾取时，若离上次锚点至少 30，就留下 1 秒星痕：半径 36，伤害 30。星痕会自己接入连锁。",
    icon: "✦",
  },
  ember: {
    name: "余烬",
    en: "EMBER",
    desc: "每份掉落先锁定 1.2 秒，不能拾取；随后原地爆出半径 55、伤害 25 的火花，再恢复可拾取。",
    icon: "✧",
  },
};

export const WEAPON_BASE_PRICE: Record<WeaponId, number> = {
  slinger: 15,
  shotgun: 22,
  saw: 21,
  coil: 25,
  rocket: 26,
  fist: 18,
};

export type BossStage = 1 | 2 | 3 | 4;
export const BOSS_STAGES: Record<
  number,
  {
    stage: BossStage;
    hp: number;
    value: number;
    interval: number;
    radial: number;
    armor: string;
    core: string;
    name: string;
    en: string;
  }
> = {
  5: {
    stage: 1,
    hp: 560,
    value: 15,
    interval: 2.4,
    radial: 8,
    armor: "#68726e",
    core: "#ef8d4d",
    name: "罐头大王 I",
    en: "CAN KING I",
  },
  10: {
    stage: 2,
    hp: 1600,
    value: 30,
    interval: 2.1,
    radial: 10,
    armor: "#435353",
    core: "#e9ad52",
    name: "罐头大王 II",
    en: "CAN KING II",
  },
  15: {
    stage: 3,
    hp: 3200,
    value: 45,
    interval: 1.9,
    radial: 12,
    armor: "#52636d",
    core: "#fff0a1",
    name: "罐头大王 III",
    en: "CAN KING III",
  },
  20: {
    stage: 4,
    hp: 6400,
    value: 60,
    interval: 1.75,
    radial: 12,
    armor: "#263536",
    core: "#fffaf0",
    name: "罐头大王 IV",
    en: "CAN KING IV",
  },
};

export const GUN_TIER_DAMAGE_MULT = [1, 2, 4, 8] as const;
const WEAPON_BEHAVIOR = {
  slinger: {
    pellets: 1,
    jumps: 0,
    jumpRange: 0,
    shots: 1,
    saws: 1,
    blastRadius: 0,
    sawOrbitRadius: 0,
    sawContactRadius: 0,
  },
  shotgun: {
    pellets: 5,
    jumps: 0,
    jumpRange: 0,
    shots: 1,
    saws: 1,
    blastRadius: 0,
    sawOrbitRadius: 0,
    sawContactRadius: 0,
  },
  saw: {
    pellets: 1,
    jumps: 0,
    jumpRange: 0,
    shots: 1,
    saws: 1,
    blastRadius: 0,
    sawOrbitRadius: 83,
    sawContactRadius: 24,
  },
  coil: {
    pellets: 1,
    jumps: 4,
    jumpRange: 170,
    shots: 1,
    saws: 1,
    blastRadius: 0,
    sawOrbitRadius: 0,
    sawContactRadius: 0,
  },
  rocket: {
    pellets: 1,
    jumps: 0,
    jumpRange: 0,
    shots: 1,
    saws: 1,
    blastRadius: 92,
    sawOrbitRadius: 0,
    sawContactRadius: 0,
  },
  fist: {
    pellets: 1,
    jumps: 0,
    jumpRange: 0,
    shots: 1,
    saws: 1,
    blastRadius: 0,
    sawOrbitRadius: 0,
    sawContactRadius: 0,
  },
} as const satisfies Record<
  WeaponId,
  {
    pellets: number;
    jumps: number;
    jumpRange: number;
    shots: number;
    saws: number;
    blastRadius: number;
    sawOrbitRadius: number;
    sawContactRadius: number;
  }
>;

export function gunTier(tier?: number): GunTier {
  return Math.max(1, Math.min(4, Math.floor(tier ?? 1))) as GunTier;
}

export function gunTierLabel(tier?: number) {
  return ["", "I", "II", "III", "IV"][gunTier(tier)];
}

// One read-only profile is used by simulation, rendering and the shop UI.
// Tier changes damage only. Rate, range and per-shot/count geometry stay fixed.
export function effectiveWeaponProfile(
  id: WeaponId,
  tier?: number,
  modifiers?: WeaponItemModifiers,
): EffectiveWeaponProfile {
  const normalized = gunTier(tier);
  const base = WEAPONS[id];
  const behavior = WEAPON_BEHAVIOR[id];
  const baseline: EffectiveWeaponProfile = {
    tier: normalized,
    damage: base.damage * GUN_TIER_DAMAGE_MULT[normalized - 1],
    interval: base.interval,
    range: base.range,
    ...behavior,
  };
  if (!modifiers) return baseline;

  const profile: EffectiveWeaponProfile = {
    ...baseline,
    damage: baseline.damage * modifiers.damageMultiplier,
    interval: baseline.interval / modifiers.attackSpeedMultiplier,
    range: baseline.range * modifiers.rangeMultiplier,
    shots: baseline.shots + modifiers.extraProjectiles,
    jumps: baseline.jumps + modifiers.extraJumps,
    blastRadius: baseline.blastRadius * modifiers.rocketRadiusMultiplier,
    sawContactRadius:
      baseline.sawContactRadius + modifiers.sawContactRadiusBonus,
  };
  if (modifiers.extraPierce > 0) profile.pierce = modifiers.extraPierce;
  return profile;
}

export function enemyHp(kind: ExpeditionEnemyKind, wave: number) {
  const i = clampedWave(wave);
  const mult = HP_MULT[i];
  if (kind === "bag") return BAG_HP[i];
  if (kind === "chip") return Math.min(BAG_HP[i], Math.round(8 * mult));
  return Math.round(BASE_HP[kind] * mult);
}

export function gunPrice(id: WeaponId, wave: number) {
  return Math.ceil((WEAPON_BASE_PRICE[id] * (wave + 4)) / 5);
}

export function rerollPrice(index: number) {
  return index === 0 ? 0 : 4 + index * 2;
}

export function gunSlotCap(wave: number) {
  return wave >= 1 ? 6 : 0;
}

export function waveRecovery(mode: GameMode, destinationWave: number) {
  return mode === "expedition20" &&
    destinationWave >= 11 &&
    destinationWave <= 20
    ? 4
    : 3;
}

export function stopAfter(wave: number): Stop | null {
  return STOP_AFTER[clampedWave(wave)] ?? null;
}

export function quickKind(wave: number): QuickKind | null {
  return null;
}

export function isEliteWave(wave: number) {
  return ELITE_WAVES.includes(wave as (typeof ELITE_WAVES)[number]);
}

export function eliteForWave(wave: number) {
  return ELITE_STATS[wave];
}

export function bossForWave(wave: number) {
  return BOSS_STAGES[wave];
}

export function isBossWave(wave: number) {
  return bossForWave(wave) !== undefined;
}

export function modTierLabel(tier: number) {
  return ["", "I", "II", "III"][Math.max(0, Math.min(3, tier))];
}

export function nextModDescription(id: ModId, tier: number) {
  const descriptions: Record<ModId, readonly string[]> = {
    popcorn: [
      "每次战场拾取积攒 1 份延迟弹幕；每份发射一对寻敌弹。",
      "延迟弹幕的子弹可穿透 1 个额外敌人。",
      "每 5 次战场拾取，还会排入一圈 8 发星爆弹。",
    ],
    domino: [
      "击杀排入半径 75、伤害 26 的爆炸。",
      "同一连锁根内，每 4 次次生击杀让后续爆炸半径 +10%，最多 +60%。",
      "同一连锁根内，每 8 次次生击杀追加半径 160、伤害 80 的大爆炸。",
    ],
    magnet: [
      "吸附半径 300；每 8 次战场拾取发射 10 发瓶盖。",
      "这 10 发瓶盖改为寻敌。",
      "每次磁力爆发还会拉动全场地上的废料，0.6 秒最多一次。",
    ],
  };
  return descriptions[id][Math.max(0, Math.min(2, tier - 1))];
}

export function clampedWave(wave: number) {
  return Math.max(0, Math.min(19, Math.floor(wave) - 1));
}
