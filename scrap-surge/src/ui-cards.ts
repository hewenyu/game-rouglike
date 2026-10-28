// Pure markup helpers for shop and rest cards: SVG art, labels and stat
// summaries. They read rule tables but never touch Game or the DOM.
import { MODS, WEAPONS, type ModId, type WeaponId } from "./data";
import {
  BAG_HP,
  BOSS_STAGES,
  ELITE_WAVES,
  HP_MULT,
  clampedWave,
  modTierLabel,
  type EffectiveWeaponProfile,
} from "./expedition";
import {
  STAT_REWARD_AMOUNTS,
  perVolleyDps,
  projectileCount,
  type ItemDefinition,
  type StatRewardId,
} from "./items";

export function icon(id: WeaponId) {
  const shapes: Record<WeaponId, string> = {
    slinger:
      '<rect x="22" y="28" width="44" height="28" rx="8"/><rect x="61" y="35" width="36" height="14" rx="3" fill="#ecdeb8"/><path d="M35 32v20M45 32v20M38 56l-5 15h19l5-15"/>',
    shotgun:
      '<path d="m25 45-9 20 19 7 17-28" fill="#bb8355"/><rect x="35" y="28" width="62" height="14" rx="3" fill="#b6c4ad"/><rect x="35" y="43" width="62" height="14" rx="3" fill="#809c8f"/><path d="M48 25v35"/>',
    rocket:
      '<rect x="18" y="26" width="78" height="33" rx="14"/><ellipse cx="95" cy="42" rx="6" ry="14" fill="#273b35"/><path d="M30 22v41M39 22v41M49 34h28"/><path d="m49 60-4 13h18l3-13" fill="#e8c696"/>',
    coil: '<rect x="23" y="26" width="34" height="34" rx="6"/><path d="M62 20v46m10-46v46m10-46v46"/><circle cx="95" cy="42" r="11" fill="#d6f3c2"/><path d="m39 30-8 15h13l-8 12" fill="none"/>',
    saw: '<path d="M60 12v60m-30-30h60M39 21l42 42M81 21 39 63" stroke-width="7"/><circle cx="60" cy="42" r="24" fill="#b5c7b7"/><circle cx="60" cy="42" r="9" fill="#edac54"/>',
    fist: '<path d="m12 42 9-13 9 26 9-26 9 26 9-13" fill="none"/><rect x="53" y="23" width="44" height="40" rx="12"/><path d="M60 43h30M65 26v12m11-12v12m10-12v12"/>',
  };
  return `<svg viewBox="0 0 120 85" aria-hidden="true" fill="${WEAPONS[id].color}" stroke="#273b35" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${shapes[id]}</svg>`;
}
export const ITEM_FAMILY_LABEL: Record<ItemDefinition["family"], string> = {
  S: "移动",
  C: "连锁",
  H: "壳甲",
  F: "火力",
  P: "拾取",
};
export const RARITY_LABEL: Record<ItemDefinition["rarity"], string> = {
  common: "普通",
  uncommon: "罕见",
  rare: "稀有",
};
export const STAT_REWARD_LABEL: Record<
  StatRewardId,
  { name: string; detail: string }
> = {
  damage: { name: "武器伤害", detail: `+${statPercent("damage")}` },
  as: { name: "攻击速度", detail: `+${statPercent("as")}` },
  hpFlat: {
    name: "壳甲上限",
    detail: `+${STAT_REWARD_AMOUNTS.hpFlat} 并回复 ${STAT_REWARD_AMOUNTS.hpFlat}`,
  },
  move: { name: "移动速度", detail: `+${statPercent("move")}` },
  pickup: { name: "拾取范围", detail: `+${statPercent("pickup")}` },
  power: {
    name: "机制强度",
    detail: `+${statPercent("power")}（影响爆炸、星痕与拾取弹伤害）`,
  },
};
// Labels read the reward table so the card can never drift from the rule.
export function statPercent(id: StatRewardId) {
  return `${Math.round(STAT_REWARD_AMOUNTS[id] * 100)}%`;
}
// Derived once from the wave tables so the shop note cannot drift from them.
export const BOSS_WAVES_TEXT = Object.keys(BOSS_STAGES)
  .map(Number)
  .sort((a, b) => a - b)
  .join(" / ");
export const ELITE_WAVES_TEXT = ELITE_WAVES.join(" / ");
export const SHAPE_ART: Record<ItemDefinition["shape"], string> = {
  sandal:
    '<path d="M23 26c-8 10-9 25 0 31 9 5 35 0 45-6 8-6 5-17-5-21l-25-9c-4-1-9-1-15 5Z"/><path d="M34 31c15 1 24 7 24 15M38 61h15"/>',
  coil: '<path d="M27 23c18-11 46 0 45 17-1 15-30 12-38 2-8-11 7-18 19-12 11 7 2 17-9 20"/><path d="M22 54h51M28 62h35"/>',
  milestone:
    '<path d="M39 57V29h28l7 10-7 10H39"/><path d="M29 66h45"/><path d="m68 17 5 9 10 1-8 7 2 10-9-5-9 5 2-10-8-7 10-1Z"/>',
  board:
    '<path d="M19 47c7-17 23-26 40-23 13 2 22 10 21 22-1 12-14 17-31 15-17-2-30-3-30-14Z"/><path d="M27 44c17 2 27-6 42-9M58 35l5 13"/>',
  trash:
    '<path d="m34 27 27-6 5 10-21 12Z"/><path d="m29 49 22-11 26 13-18 14Z"/><path d="m57 37 19-8 9 13-9 8Z"/><path d="m62 19-4-9 11 2 3-7"/>',
  ring: '<path d="M31 28 66 17l8 14-30 19Z"/><path d="m31 28 13 22 30-19"/><path d="M35 40c9 1 20 7 23 18"/>',
  fuse: '<rect x="28" y="31" width="46" height="24" rx="8"/><path d="M38 29v28M55 29v28M74 34c12-2 9-13 18-13"/><path d="m89 16 4 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  burst:
    '<path d="m58 16 7 15 16-4-8 13 13 9-16 2 1 16-12-11-12 11 1-16-16-2 13-9-8-13 16 4Z"/>',
  shell:
    '<path d="M28 52c0-20 11-30 29-30 17 0 26 12 23 29-3 15-16 22-31 18-13-3-21-8-21-17Z"/><path d="M37 31c10 2 14 9 12 18M48 25c13 5 18 15 13 29"/>',
  undertow:
    '<rect x="26" y="23" width="48" height="42" rx="9"/><path d="M31 43c8 3 10 8 12 14M42 37c8 4 12 9 13 17M55 35c9 6 13 12 14 21M31 57h44"/>',
  spikes:
    '<circle cx="56" cy="43" r="22"/><path d="m56 10 5 15m-5 36 5 15M23 43l15-5m36 10 15-5M32 19l11 11m26 26 11 11M80 19 69 30M43 67 32 78"/>',
  valve:
    '<circle cx="54" cy="42" r="24"/><path d="M54 18v48M30 42h48M38 26l32 32M70 26 38 58"/><path d="M78 30h15v20H79"/>',
  powder:
    '<path d="m28 57 17-32 21 5-4 37Z"/><path d="M43 22c3-5 9-6 12-2l4 6"/><path d="m55 20 6-11M67 24l12-7M72 37l13 1"/>',
  barrel:
    '<path d="M23 31h55v26H23Z"/><path d="M30 31v26M38 31v26M78 36h17v16H78Z"/><path d="m63 39 9 4-9 4"/>',
  nail: '<path d="M27 62 75 21l11 12-43 41Z"/><path d="m32 48 16 15M74 21l12-7 8 9-8 10"/>',
  "twin-trigger":
    '<path d="M28 31h49v28H28Z"/><path d="M31 36h45M35 31v-9m22 9v-9m14 9v-9"/><path d="m38 63 8-5m8 7 8-5m8 7 8-5"/>',
  magnet:
    '<path d="M30 28v27c0 21 33 21 33 0V28H49v27c0 8 9 8 9 0V28"/><path d="M50 23h21M25 23h21"/>',
  popcorn:
    '<path d="m26 52 11-17 12 9 9-16 12 10 10-7 8 22-20 14-28-3Z"/><path d="m36 35-6-9 11 3 3-12 8 10 10-3-2 10M62 19l8-7 2 11 11 2-7 7"/>',
  hook: '<path d="M33 31v24c0 17 22 20 29 5 4-9-5-17-13-12-6 4-3 11 3 10"/><path d="M33 31h-12m12 0h12M77 20l8 8-8 8"/>',
  siphon:
    '<path d="M31 25h47l-9 44H40Z"/><path d="M27 25h55M42 37h25M44 48h20"/><path d="M82 35c12 2 13 17 2 20"/>',
};
export function itemIcon(definition: ItemDefinition) {
  return `<svg class="item-icon" viewBox="0 0 112 86" aria-hidden="true"><path d="M5 13h20v6H11v54h14v6H5Z" fill="#273b35" opacity=".15"/><g fill="${rarityColor(definition.rarity)}" stroke="#273b35" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${SHAPE_ART[definition.shape]}</g></svg>`;
}
const RARITY_COLOR: Record<ItemDefinition["rarity"], string> = {
  common: "#f7e6bd",
  uncommon: "#b8d3a7",
  rare: "#f0b85e",
};
export function rarityColor(rarity: ItemDefinition["rarity"]) {
  return RARITY_COLOR[rarity];
}
export function weaponStats(profile: EffectiveWeaponProfile) {
  const projectiles = projectileCount(profile);
  const dps = perVolleyDps(profile);
  const extra = weaponReachMarkup(profile);
  return `<div class="weapon-summary"><span>单发 <b>${profile.damage.toFixed(1)}</b></span><span class="weapon-dps">理论DPS <b>${dps.toFixed(1)}</b></span><span class="weapon-effect">${weaponEffectLabel(profile)}</span></div><div class="weapon-stats"><span>每轮 ${projectiles} 发</span><span>间隔 ${profile.interval.toFixed(2)}s</span><span>射程 ${Math.round(profile.range)}</span>${extra}</div>`;
}
function weaponReachMarkup(profile: EffectiveWeaponProfile) {
  if (profile.blastRadius > 0)
    return `<span>爆炸半径 <b>${profile.blastRadius}</b></span>`;
  if (profile.jumpRange > 0)
    return `<span>跳距 <b>${profile.jumpRange}</b></span>`;
  if (profile.sawOrbitRadius > 0)
    return `<span>环绕 <b>${profile.sawOrbitRadius}</b> / 接触 <b>${profile.sawContactRadius}</b></span>`;
  return "";
}
export function waveHpLabel(wave: number) {
  const index = clampedWave(wave);
  return `装甲敌人 HP ×${HP_MULT[index]} · 垃圾袋 HP ${BAG_HP[index]}`;
}
export function weaponEffectLabel(profile: EffectiveWeaponProfile) {
  if (profile.pellets > 1) return `${profile.pellets} 弹丸`;
  if (profile.shots > 1) return `${profile.shots} 发`;
  if (profile.saws > 1) return `${profile.saws} 片锯`;
  if (profile.jumps > 0) return `链 ${profile.jumps + 1} 目标`;
  if (profile.sawOrbitRadius > 0) return "环绕";
  if (profile.blastRadius > 0) return "范围";
  return "单体";
}
export function modIcon(id: ModId, tier = 1) {
  const extra = modTierBadge(tier);
  return `<svg viewBox="0 0 92 72" aria-hidden="true"><text x="30" y="32" text-anchor="middle" font-size="28" font-weight="900" fill="#273b35">${MODS[id].icon}</text><text x="18" y="59" font-size="24" font-weight="900" fill="#273b35">${modTierLabel(tier)}</text>${extra}</svg>`;
}
function modTierBadge(tier: number) {
  if (tier >= 3)
    return '<circle cx="68" cy="20" r="9" fill="#fff4a6" stroke="#273b35" stroke-width="3"/>';
  if (tier >= 2)
    return '<path d="M66 18l7 7M73 18l-7 7" stroke="#273b35" stroke-width="3"/>';
  return "";
}
