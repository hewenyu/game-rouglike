import "./style.css";
import { Game } from "./sim";
import { Renderer, type ExpeditionPresentation } from "./render";
import { Input } from "./input";
import { Sound } from "./audio";
import { DT, WEAPONS, MODS, type WeaponId, type ModId } from "./data";
import {
  ITEM_BY_ID,
  ITEM_IDS,
  ITEM_CONSTANTS,
  STAT_REWARD_AMOUNTS,
  applyStatReward,
  deriveItemStats,
  itemCount,
  itemCountsWith,
  itemProcPreview,
  perVolleyDps,
  projectileCount,
  weaponItemModifiers,
  type DerivedItemStats,
  type ItemDefinition,
  type ItemId,
  type ItemStats,
  type StatRewardId,
} from "./items";
import {
  BAG_HP,
  BOSS_STAGES,
  BRANCHES,
  HP_MULT,
  ELITE_STATS,
  ELITE_TIMER_SHARE,
  ELITE_WAVES,
  bossForWave,
  clampedWave,
  effectiveWeaponProfile,
  gunPrice,
  gunTierLabel,
  isEliteWave,
  modTierLabel,
  nextModDescription,
  quickKind,
  rerollPrice,
  stopAfter,
  waveRecovery,
  type ExpeditionBranch,
  type EffectiveWeaponProfile,
  type GameMode,
} from "./expedition";
const params = new URLSearchParams(location.search);
const requestedMode = params.get("mode");
const gameMode: GameMode = requestedMode === "slice" ? "slice" : "expedition20";
const recordKey =
  gameMode === "expedition20"
    ? "scrap-surge.expedition20.v1"
    : "scrap-surge.v1";
const legacyKey = "scrap-surge.v1";
const app = document.querySelector<HTMLDivElement>("#app")!;
if (gameMode === "expedition20") document.body.classList.add("expedition20");
app.innerHTML = `<canvas id="arena" aria-label="废潮自动战斗场地；WASD 或方向键移动，武器自动攻击"></canvas><header><a class="brand" href="#" id="brand">SCRAP<span>SURGE</span><b>废潮</b></a><div class="header-tools"><span class="version">${gameMode === "expedition20" ? "EXPEDITION / 20" : "FEEL TEST / 01"}</span><button id="sound" class="small-button" aria-label="关闭声音">声音 ON</button><button id="pause" class="small-button" hidden aria-label="暂停">Ⅱ</button></div></header>
<section id="title" class="title"><div class="title-copy"><div class="kicker"><span></span> 一只小蟹。六把破烂。一整片怪潮。</div><h1>废<span>潮</span><i>!</i></h1><h2>捡的是垃圾。<br>打出来的是<span>火力。</span></h2><p>只管走位，让壳上的家伙自动开火。<br>捡废料、挂武器，把一场混战滚成连锁反应。</p><div class="start-row"><button class="primary" id="start">下海，开火 <b>↗</b></button><button id="how" class="outline">怎么玩？</button></div><small>${gameMode === "expedition20" ? "20 波潮线 · 19 次整备 · 4 场首领战" : "两波战斗 + 一次改装商店 · 约 1 分钟战斗体验"}</small></div><div class="sticker">不用瞄准<br><strong>自动开火！</strong><span>JUST KEEP MOVING</span></div><div class="title-bottom"><div><b>01</b><p>走位活下来<small>WASD / 方向键 · 触屏摇杆</small></p></div><div><b>02</b><p>往壳上挂火力<small>六格武器，同款同阶自动合成</small></p></div><div><b>03</b><p>让连锁自己滚起来<small>击杀 → 掉落 → 火力 → 更多击杀</small></p></div></div><div class="bottom-tape">TRASH INTO TREASURE · TREASURE INTO TROUBLE · TRASH INTO TREASURE · TREASURE INTO TROUBLE</div></section>
<section id="hud" hidden><div class="edge-timer" id="edge"><i id="edge-fill"></i><span id="wave-label">第一波 / 02</span><strong id="timer">20</strong><small id="wave-note">自动开火，别被围住</small></div><div class="hud-bottom" id="hud-bottom"><div class="health"><strong id="hp-label">10 / 10</strong><div id="hp"></div><small>壳还很硬</small></div><div id="loadout" class="loadout"></div><div class="wallet"><span>废料</span><strong id="money">0</strong><small id="kill-count">0 击败</small></div></div><div id="boss" hidden><span>罐头大王 / DON'T GET CANNED</span><div><i></i></div></div><div class="kill-banner" id="kill-banner"></div><div id="mod-strip"></div><p id="hint" class="hint">只需要移动，武器会自动找目标。</p><div id="joystick" role="group" aria-label="触屏移动摇杆"><i></i><span>移动</span></div></section><div id="overlay" hidden></div><div id="toast" role="status"></div>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const renderer = new Renderer($<HTMLCanvasElement>("arena")),
  sound = new Sound();
let game: Game | null = null,
  phase = "",
  last = 0,
  acc = 0,
  uiAt = 0,
  frames = 0,
  frameTimes: number[] = [],
  eliteWarningWave = 0,
  title = true,
  doneSaved = false;
type RecordData = {
  runs: number;
  wins: number;
  best: number;
  muted: boolean;
  [key: string]: unknown;
};
function readObject(key: string): Record<string, unknown> {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
function normalizedRecord(raw: Record<string, unknown>): RecordData {
  return {
    ...raw,
    runs: Number.isFinite(raw.runs) ? Math.max(0, Number(raw.runs)) : 0,
    wins: Number.isFinite(raw.wins) ? Math.max(0, Number(raw.wins)) : 0,
    best: Number.isFinite(raw.best) ? Math.max(0, Number(raw.best)) : 0,
    muted: raw.muted === true,
  };
}
let record = normalizedRecord(readObject(recordKey));
const legacy = readObject(legacyKey);
if (recordKey === legacyKey) record.muted = legacy.muted === true;
sound.muted = legacy.muted === true;
const input = new Input(
  $("joystick"),
  () =>
    game?.phase === "fight" ||
    game?.phase === "sweep" ||
    game?.phase === "interlude",
  () => sound.init(),
  () => pause(),
);
function persist() {
  try {
    localStorage.setItem(recordKey, JSON.stringify(record));
    if (recordKey !== legacyKey) {
      // Expedition never rewrites the slice record except for the shared mute
      // preference. Read-merge keeps historical and unknown fields intact.
      const old = readObject(legacyKey);
      old.muted = sound.muted;
      localStorage.setItem(legacyKey, JSON.stringify(old));
    }
  } catch {}
}
function note(text: string) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}
function overlay(html: string) {
  const root = $("overlay");
  root.innerHTML = html;
  root.hidden = false;
  root.classList.toggle(
    "shop-open",
    root.firstElementChild?.classList.contains("p2-rest") === true,
  );
  $("overlay")
    .querySelector<HTMLButtonElement>("button")
    ?.focus({ preventScroll: true });
  // Replacing the innerHTML during a click can leave the scroll container
  // anchored to the removed button. Start each shop/stop at its heading.
  root.scrollTop = 0;
}
function close() {
  $("overlay").hidden = true;
  $("overlay").innerHTML = "";
  $("overlay").classList.remove("shop-open");
}
function icon(id: WeaponId) {
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
const ITEM_FAMILY_LABEL: Record<ItemDefinition["family"], string> = {
  S: "移动",
  C: "连锁",
  H: "壳甲",
  F: "火力",
  P: "拾取",
};
const RARITY_LABEL: Record<ItemDefinition["rarity"], string> = {
  common: "普通",
  uncommon: "罕见",
  rare: "稀有",
};
const STAT_REWARD_LABEL: Record<
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
function statPercent(id: StatRewardId) {
  return `${Math.round(STAT_REWARD_AMOUNTS[id] * 100)}%`;
}
// Derived once from the wave tables so the shop note cannot drift from them.
const BOSS_WAVES_TEXT = Object.keys(BOSS_STAGES)
  .map(Number)
  .sort((a, b) => a - b)
  .join(" / ");
const ELITE_WAVES_TEXT = ELITE_WAVES.join(" / ");
const SHAPE_ART: Record<ItemDefinition["shape"], string> = {
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
function itemIcon(definition: ItemDefinition) {
  return `<svg class="item-icon" viewBox="0 0 112 86" aria-hidden="true"><path d="M5 13h20v6H11v54h14v6H5Z" fill="#273b35" opacity=".15"/><g fill="${rarityColor(definition.rarity)}" stroke="#273b35" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${SHAPE_ART[definition.shape]}</g></svg>`;
}
function rarityColor(rarity: ItemDefinition["rarity"]) {
  return rarity === "rare"
    ? "#f0b85e"
    : rarity === "uncommon"
      ? "#b8d3a7"
      : "#f7e6bd";
}
function weaponStats(profile: EffectiveWeaponProfile) {
  const projectiles = projectileCount(profile);
  const dps = perVolleyDps(profile);
  const extra =
    profile.blastRadius > 0
      ? `<span>爆炸半径 <b>${profile.blastRadius}</b></span>`
      : profile.jumpRange > 0
        ? `<span>跳距 <b>${profile.jumpRange}</b></span>`
        : profile.sawOrbitRadius > 0
          ? `<span>环绕 <b>${profile.sawOrbitRadius}</b> / 接触 <b>${profile.sawContactRadius}</b></span>`
          : "";
  return `<div class="weapon-summary"><span>单发 <b>${profile.damage.toFixed(1)}</b></span><span class="weapon-dps">理论DPS <b>${dps.toFixed(1)}</b></span><span class="weapon-effect">${weaponEffectLabel(profile)}</span></div><div class="weapon-stats"><span>每轮 ${projectiles} 发</span><span>间隔 ${profile.interval.toFixed(2)}s</span><span>射程 ${Math.round(profile.range)}</span>${extra}</div>`;
}
function waveHpLabel(wave: number) {
  const index = clampedWave(wave);
  return `装甲敌人 HP ×${HP_MULT[index]} · 垃圾袋 HP ${BAG_HP[index]}`;
}
function weaponEffectLabel(profile: EffectiveWeaponProfile) {
  if (profile.pellets > 1) return `${profile.pellets} 弹丸`;
  if (profile.shots > 1) return `${profile.shots} 发`;
  if (profile.saws > 1) return `${profile.saws} 片锯`;
  if (profile.jumps > 0) return `链 ${profile.jumps + 1} 目标`;
  if (profile.sawOrbitRadius > 0) return "环绕";
  if (profile.blastRadius > 0) return "范围";
  return "单体";
}
function modIcon(id: ModId, tier = 1) {
  const extra =
    tier >= 3
      ? '<circle cx="68" cy="20" r="9" fill="#fff4a6" stroke="#273b35" stroke-width="3"/>'
      : tier >= 2
        ? '<path d="M66 18l7 7M73 18l-7 7" stroke="#273b35" stroke-width="3"/>'
        : "";
  return `<svg viewBox="0 0 92 72" aria-hidden="true"><text x="30" y="32" text-anchor="middle" font-size="28" font-weight="900" fill="#273b35">${MODS[id].icon}</text><text x="18" y="59" font-size="24" font-weight="900" fill="#273b35">${modTierLabel(tier)}</text>${extra}</svg>`;
}
let quickPickedId: ModId | null = null;
let quickPickedTier = 0;
function start(seed?: number) {
  sound.init();
  input.clear();
  quickPickedId = null;
  quickPickedTier = 0;
  game = new Game(
    seed ?? crypto.getRandomValues(new Uint32Array(1))[0],
    gameMode,
  );
  title = false;
  phase = "";
  doneSaved = false;
  eliteWarningWave = 0;
  frameTimes = [];
  acc = 0;
  $("title").hidden = true;
  $("hud").hidden = false;
  $("pause").hidden = false;
  close();
  sync();
  updateHud();
  layout();
  (document.activeElement as HTMLElement)?.blur();
}
function home() {
  input.clear();
  game = null;
  title = true;
  phase = "";
  renderer.reserveTop = 0;
  renderer.reserveBottom = 0;
  $("title").hidden = false;
  $("hud").hidden = true;
  $("pause").hidden = true;
  close();
}
function pause() {
  if (!game) return;
  if (game.phase === "paused") game.resume();
  else game.pause();
  input.clear();
  sync();
}
function shop() {
  if (!game) return;
  const g = game;
  if (g.mode === "expedition20") {
    expeditionShop(g);
    return;
  }
  overlay(
    `<section class="shop-panel"><div class="shop-heading"><div><div class="eyebrow">LOW TIDE / 潮水退了，整点狠的</div><h2>破烂？<span>是火力。</span></h2><p>武器同时工作。改装互相喂养。选到一起，就让它滚起来。</p></div><div class="shop-wallet"><span>你的废料</span><strong>${g.money}<small> ◈</small></strong><small>已挂载 ${g.guns.length} / 6 件</small></div></div><div class="weapon-cards">${g.offers
      .map((id, i) => {
        const w = WEAPONS[id],
          sold = g.sold.has(i),
          afford = g.money >= w.price;
        return `<button class="weapon-card ${sold ? "sold" : ""}" data-buy="${i}" ${sold || !afford || g.guns.length >= 6 ? "disabled" : ""}><div class="card-tag">${w.en}</div>${icon(id)}<h3>${w.name}</h3><p>${w.desc}</p><div class="card-price"><b>${sold ? "已挂上壳" : `${w.price} ◈`}</b><span>${sold ? "✓" : !afford ? "还差废料" : "买下来 +"}</span></div></button>`;
      })
      .join(
        "",
      )}</div><div class="shop-tools"><span>当前壳上：${g.guns.map((v) => WEAPONS[v.id].name).join(" / ")}</span><button id="reroll" class="text-button">换一批 ↻ ${g.freeRerolls ? "首次免费" : "6 ◈"}</button></div><div class="mod-heading"><h3>让它们互相喂养</h3><span>免费选 2 种改装 · 已选 ${g.mods.length} / 2</span></div><div class="mod-cards">${(Object.entries(MODS) as [ModId, (typeof MODS)[ModId]][]).map(([id, m]) => `<button class="mod-card ${g.has(id) ? "selected" : ""}" data-mod="${id}" ${g.has(id) || g.mods.length === 2 ? "disabled" : ""}><b>${m.icon}</b><div><strong>${m.name} ${g.has(id) ? "✓" : ""}</strong><p>${m.desc}</p></div></button>`).join("")}</div><div class="loop-diagram"><div class="loop-step on"><b>击杀</b><small>敌人倒下</small></div><i>→</i><div class="loop-step on"><b>废料</b><small>掉落一地</small></div><i>→</i><div class="loop-step ${g.has("popcorn") ? "on" : ""}"><b>开火</b><small>废料爆米花</small></div><i>→</i><div class="loop-step ${g.has("domino") ? "on" : ""}"><b>连爆</b><small>易爆垃圾</small></div><i class="back">↺</i></div>${g.has("popcorn") && g.has("domino") ? '<div class="combo-note">连锁已接通：捡废料 → 喷子弹 → 击杀爆炸 → 更多废料。下一波，看看能滚多大。</div>' : g.mods.length === 2 ? '<div class="combo-note">连锁已接通。下一波，让掉落物也替你开火。</div>' : '<div class="combo-note muted">不是三选一。任选两种，把反馈回路接起来。</div>'}<div class="shop-footer"><small>下一波回复 ${waveRecovery(g.mode, 2)} 格生命 · 商店不会流逝战斗时间</small><button id="next" class="primary" ${g.mods.length < 2 ? "disabled" : ""}>${g.mods.length < 2 ? "再选 " + (2 - g.mods.length) + " 种改装" : "让它们见识一下"} <b>→</b></button></div></section>`,
  );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-buy]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.buy(Number(b.dataset.buy))) shop();
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-mod]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.chooseMod(b.dataset.mod as ModId)) shop();
        }),
    );
  $("reroll").onclick = () => {
    if (g.reroll()) shop();
  };
  $("next").onclick = () => {
    if (g.mods.length < 2) return;
    g.nextWave();
    input.clear();
    sync();
    updateHud();
  };
}
function itemArtifactCount(g: Game) {
  return ITEM_IDS.reduce((sum, id) => sum + itemCount(g.inventory, id), 0);
}
function itemCapText(g: Game, id: ItemId) {
  const item = ITEM_BY_ID[id];
  const owned = itemCount(g.inventory, id);
  return item.unique
    ? owned
      ? "已拥有 · 唯一"
      : "唯一"
    : `${owned} / ${item.cap} 份`;
}
function itemDeltaMarkup(before: DerivedItemStats, after: DerivedItemStats) {
  const additions: string[] = [];
  const items: [string, number, number][] = [
    ["武器伤害", before.weaponFactor, after.weaponFactor],
    ["攻速", before.asFactor, after.asFactor],
    ["移动", before.moveFactor, after.moveFactor],
    ["生命上限", before.maxHp, after.maxHp],
    ["拾取范围", before.pickupRadius, after.pickupRadius],
    ["机制强度", before.powerFactor, after.powerFactor],
  ];
  for (const [label, a, b] of items) {
    if (Math.abs(b - a) < 0.0001) continue;
    const delta =
      label === "生命上限"
        ? `${b > a ? "+" : ""}${Math.round(b - a)}`
        : `${b > a ? "+" : ""}${Math.round((b / Math.max(0.0001, a) - 1) * 100)}%`;
    additions.push(`${label} ${delta}`);
  }
  return additions.length
    ? additions.slice(0, 5).join(" · ")
    : "";
}
function previewNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function previewMultiplier(value: number) {
  return `×${Number(value.toFixed(2))}`;
}
function previewReadout(
  before: ReturnType<typeof itemProcPreview>,
  after: ReturnType<typeof itemProcPreview>,
  id: ItemId,
) {
  const a = before.readoutsByItem[id];
  const b = after.readoutsByItem[id];
  if (!a && !b) return "";
  const parts: string[] = [];
  const add = (
    label: string,
    key:
      | "damage"
      | "multiplier"
      | "radius"
      | "interval"
      | "threshold"
      | "count"
      | "max",
  ) => {
    const from = a?.[key];
    const to = b?.[key];
    const format =
      key === "multiplier"
        ? previewMultiplier
        : key === "radius" || key === "max"
          ? (value: number) => String(Math.round(value))
          : previewNumber;
    if (from === undefined && to === undefined) return;
    if (from === undefined) parts.push(`${label} ${format(to!)}`);
    else if (to === undefined) parts.push(`${label} ${format(from)}`);
    else if (Math.abs(from - to) < 0.0001)
      parts.push(`${label} ${format(to)}`);
    else parts.push(`${label} ${format(from)} → ${format(to)}`);
  };
  add("伤害", "damage");
  add("伤害倍率", "multiplier");
  add("半径", "radius");
  add("上限半径", "max");
  add("间隔", "interval");
  add("触发", "threshold");
  add("数量", "count");
  return parts.join(" · ");
}
function derivedPreviewReadout(
  before: DerivedItemStats,
  after: DerivedItemStats,
) {
  const parts: string[] = [];
  const add = (label: string, from: number, to: number, digits = 2) => {
    if (Math.abs(from - to) < 0.0001) return;
    parts.push(`${label} ${from.toFixed(digits)} → ${to.toFixed(digits)}`);
  };
  add("武器伤害", before.weaponFactor, after.weaponFactor);
  add("攻速", before.asFactor, after.asFactor);
  add("生命上限", before.maxHp, after.maxHp, 0);
  add("移动", before.moveFactor, after.moveFactor);
  add("拾取范围", before.pickupRadius, after.pickupRadius, 0);
  add("机制强度", before.powerFactor, after.powerFactor);
  return parts.join(" · ");
}
function ownedWeaponRows(g: Game) {
  const derived = g.derivedItemStats();
  return g.guns
    .map((gun, index) => {
      const tier = gun.tier ?? 1;
      const profile = effectiveWeaponProfile(
        gun.id,
        tier,
        weaponItemModifiers(gun.id, derived),
      );
      const base = effectiveWeaponProfile(gun.id, tier);
      return `<div class="owned-slot">
        <div class="owned-weapon">${icon(gun.id)}<div><strong>${WEAPONS[gun.id].name} ${gunTierLabel(tier)}</strong><small>${WEAPONS[gun.id].desc}</small>${weaponStats(profile)}<span class="weapon-before">裸枪 ${base.damage.toFixed(1)} → 当前 ${profile.damage.toFixed(1)}</span></div></div>
        <div class="slot-actions"><small>累计投入 ${gun.paid ?? 0} ◈ · 实时面板</small><button data-sell="${index}" ${g.guns.length <= 1 ? "disabled" : ""}>拆解 +${g.sellPrice(index)} ◈</button></div>
      </div>`;
    })
    .join("");
}
function projectedWeapons(
  g: Game,
  inventory: Partial<Record<ItemId, number>>,
  stats: Partial<ItemStats>,
) {
  const derived = deriveItemStats(inventory, stats, {
    moved: true,
    weapons: g.guns.map((gun) => gun.id),
  });
  return g.guns.map((gun) => ({
    id: gun.id,
    profile: effectiveWeaponProfile(
      gun.id,
      gun.tier,
      weaponItemModifiers(gun.id, derived),
    ),
  }));
}
function eliteWarningData(g: Game) {
  if (
    g.mode !== "expedition20" ||
    g.phase !== "fight" ||
    !isEliteWave(g.wave) ||
    g.eliteSpawned ||
    g.eliteEscaped ||
    g.eliteRenderData
  )
    return null;
  const remaining = Math.max(0, g.duration * ELITE_TIMER_SHARE - g.waveTime);
  return {
    wave: g.wave,
    progress:
      remaining > 0
        ? Math.max(
            0,
            Math.min(1, g.waveTime / (g.duration * ELITE_TIMER_SHARE)),
          )
        : 1,
    remaining,
  };
}
function playEliteWarning(g: Game) {
  const warning = eliteWarningData(g);
  if (!warning || warning.wave === eliteWarningWave) return;
  eliteWarningWave = warning.wave;
  sound.play({ type: "elite", value: warning.wave });
}
function expeditionPresentation(g: Game): ExpeditionPresentation {
  const derived = g.derivedItemStats();
  const elite = g.eliteRenderData;
  return {
    elite,
    eliteWarning: eliteWarningData(g),
    chests: g.chestRenderData.map((chest) => ({
      x: chest.x,
      y: chest.y,
      source: chest.source,
      pulse: chest.pulse,
    })),
    trailPoints: g.trailPoints.map((point) => ({
      x: point.x,
      y: point.y,
      life: point.life,
      max: point.max,
      radius: point.radius,
    })),
    weaponProfiles: g.guns.map((gun) =>
      effectiveWeaponProfile(
        gun.id,
        gun.tier,
        weaponItemModifiers(gun.id, derived),
      ),
    ),
    spikeShellCopies: derived.counts["spike-shell"],
    spikeShellRadius: ITEM_CONSTANTS.spikeShellRadius,
    pressureActive: g.pressureTimer > 0,
  };
}
function itemCard(
  g: Game,
  id: ItemId,
  kind: "offer" | "reward" | "chest",
  index: number,
) {
  const definition = ITEM_BY_ID[id];
  const eligibility = g.itemEligibility(id);
  const selected = kind === "chest" && eligibility.eligible;
  const sold = kind === "offer" && g.soldItems.has(index);
  const price = kind === "offer" ? g.itemOfferPrice(index) : 0;
  const stale = !eligibility.eligible;
  const owned = itemCount(g.inventory, id);
  const projected =
    !stale && !sold ? itemCountsWith(g.inventory, id) : g.inventory;
  const after = deriveItemStats(projected, g.statRewards, {
    moved: true,
    pressureActive: false,
    weapons: g.guns.map((gun) => gun.id),
  });
  const before = deriveItemStats(g.inventory, g.statRewards, {
    moved: true,
    pressureActive: false,
    weapons: g.guns.map((gun) => gun.id),
  });
  const delta = itemDeltaMarkup(before, after);
  const rarity = definition.rarity;
  const disabled = sold || stale || (kind === "offer" && g.money < price);
  const warning =
    definition.weaponEligibility.length > 0 &&
    !definition.weaponEligibility.some((weapon) =>
      g.guns.some((gun) => gun.id === weapon),
    )
      ? "有兼容枪时才生效"
      : "";
  return `<article class="p2-item-card rarity-${rarity} ${sold ? "sold" : ""} ${stale ? "stale" : ""} ${selected ? "chest-choice" : ""}" data-select-item data-item-card="${index}" data-card-index="${index}" data-item-id="${id}" tabindex="0">
    <div class="item-card-top"><span class="item-code">${ITEM_FAMILY_LABEL[definition.family]}</span><span class="rarity-label">${RARITY_LABEL[rarity]}</span></div>
    <div class="item-art">${itemIcon(definition)}<span class="rarity-mark">${rarity === "rare" ? "RARE" : rarity === "uncommon" ? "UNCOMMON" : "COMMON"}</span></div>
    <h3>${definition.name}</h3>
    <div class="item-meta"><span>${definition.unique ? "唯一" : `最多 ${definition.cap} 份`}</span><span>持有 ${owned}${definition.unique ? "" : ` / ${definition.cap}`}</span><span>${definition.dependencies.allOf.length || definition.dependencies.anyOf.length ? "有前置" : "无前置"}</span></div>
    <p class="item-card-description">${definition.description}</p>
    <div class="item-delta"><b>点选查看效果${delta ? ` · ${delta}` : ""}</b></div>
    ${kind === "offer" ? `<div class="item-buy-row"><span class="item-price">${sold ? "已购入" : `${price} ◈`}</span><small>${sold ? "已结算" : stale ? "当前不可用" : g.money < price ? `还差 ${price - g.money} ◈` : warning || "购买并立即装备"}</small><button class="item-buy" data-buy-item="${index}" ${disabled ? "disabled" : ""}>${sold ? "✓" : "买下"}</button></div>` : ""}
    ${kind === "reward" ? `<div class="reward-choice-row"><button class="item-buy" data-claim-core="${index}" ${stale ? "disabled" : ""}>${stale ? "不可选" : "选这件"}</button><small>免费领取 · 不花废料</small></div>` : ""}
    ${kind === "chest" ? `<div class="reward-choice-row"><button class="item-buy" data-claim-chest="${index}" ${stale ? "disabled" : ""}>${stale ? "已拥有或达到上限" : "确认选择"}</button><small>领取后关闭宝箱</small></div>` : ""}
  </article>`;
}
function ownedInventoryMarkup(g: Game) {
  const rows = ITEM_IDS.filter((id) => itemCount(g.inventory, id) > 0).map(
    (id) => {
      const item = ITEM_BY_ID[id];
      return `<button class="inventory-item rarity-${item.rarity}" data-select-item data-item-id="${id}" aria-label="查看 ${item.name}">
        <span class="inventory-shape">${itemIcon(item)}</span>
        <span class="inventory-copy"><b>${item.name}</b><small>${RARITY_LABEL[item.rarity]} · ${item.unique ? "唯一" : `${itemCount(g.inventory, id)} / ${item.cap} 份`}</small></span>
      </button>`;
    },
  );
  return rows.length
    ? rows.join("")
    : '<p class="inventory-empty">还没有物品。物品行是三行中的独立一行，不占枪槽。</p>';
}
function selectItemDetail(selector: string) {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(`${selector} [data-select-item]`),
  );
  const detail = document.getElementById("selected-item-detail");
  if (!cards.length || !detail) return;
  const choose = (card: HTMLElement) => {
    cards.forEach((entry) =>
      entry.classList.toggle("selected", entry === card),
    );
    const group = card.closest(
      ".reward-row, .shop-item-section, .inventory-section",
    );
    if (group) group.insertAdjacentElement("afterend", detail);
    detail.innerHTML =
      card.querySelector<HTMLElement>(".item-detail-template")?.innerHTML || "";
    detail.dataset.selected = card.dataset.itemId || "";
    const sourceAction = card.querySelector<HTMLButtonElement>(
      ".item-detail-template button",
    );
    const detailAction = detail.querySelector<HTMLButtonElement>("button");
    if (sourceAction && detailAction)
      detailAction.onclick = sourceAction.onclick;
  };
  cards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (
        event.target !== card &&
        (event.target as HTMLElement).closest("button")
      )
        return;
      choose(card);
    });
    card.addEventListener("focusin", () => choose(card));
  });
  const primary =
    cards.find(
      (card) =>
        card.classList.contains("chest-choice") && card.closest(".reward-row"),
    ) ??
    cards.find((card) => card.closest(".reward-row")) ??
    cards.find((card) => card.closest(".shop-item-section")) ??
    cards.find((card) => card.closest(".inventory-section")) ??
    cards[0];
  choose(primary!);
}
function expeditionShop(g: Game) {
  const maxTier = g.guns.reduce(
    (best, gun) => Math.max(best, gun.tier ?? 1),
    1,
  );
  const derived = g.derivedItemStats();
  const owned = ownedWeaponRows(g);
  const offered = g.offers
    .map((id, index) => {
      const w = WEAPONS[id],
        sold = g.sold.has(index),
        record = sold ? g.purchaseRecords.get(index) : undefined,
        price = gunPrice(id, g.wave),
        afford = g.money >= price,
        preview = sold ? null : g.expeditionPurchasePreview(index),
        full = preview?.reason === "no-space";
      const previewText = record
        ? record.merged
          ? `合成 ${gunTierLabel(record.incomingTier)}`
          : `购入 ${gunTierLabel(record.incomingTier)}`
        : preview!.merged
          ? `合成至 ${gunTierLabel(preview!.incomingTier)}`
          : preview!.incomingTier > 1
            ? `购入 ${gunTierLabel(preview!.incomingTier)}`
            : "买下来 +";
      const weaponMods = weaponItemModifiers(id, derived);
      const resultNote = record
        ? `攻击 ${effectiveWeaponProfile(id, record.incomingTier, weaponMods).damage.toFixed(1)}`
        : full
          ? "无空槽且无法合成"
          : `攻击 ${effectiveWeaponProfile(id, preview!.incomingTier, weaponMods).damage.toFixed(1)}`;
      return `<button class="weapon-card ${sold ? "sold" : ""}" data-buy="${index}" ${sold || !afford || full ? "disabled" : ""}>
        <div class="card-tag">${w.en}</div>${icon(id)}<h3>${w.name}</h3><p>${w.desc}</p>${weaponStats(effectiveWeaponProfile(id, 1, weaponMods))}
        <div class="weapon-preview">${previewText}<small>${resultNote}</small></div>
        <div class="card-price"><b>${sold ? "已挂上壳" : `${price} ◈`}</b><span>${sold ? "✓" : full ? "无空槽" : !afford ? `还差 ${price - g.money} ◈` : "买下来 +"}</span></div>
      </button>`;
    })
    .join("");
  const itemOffers = g.itemOffers
    .map((id, index) => itemCard(g, id, "offer", index))
    .join("");
  const coreRewards = g.pendingRewardChoices
    .map((id, index) => itemCard(g, id, "reward", index))
    .join("");
  const chestRewards =
    g.frozenChest?.itemIds
      .map((id, index) => itemCard(g, id, "chest", index))
      .join("") ?? "";
  const statChoices = g.pendingStatChoices
    .map((reward, index) => {
      const before = g.statRewards;
      const after = applyStatReward(before, reward);
      const beforeDerived = deriveItemStats(g.inventory, before, {
        moved: true,
        weapons: g.guns.map((gun) => gun.id),
      });
      const afterDerived = deriveItemStats(g.inventory, after, {
        moved: true,
        weapons: g.guns.map((gun) => gun.id),
      });
      const projected = projectedWeapons(g, g.inventory, after);
      const weaponPreview = g.guns
        .map(
          (gun) =>
            `<span>${WEAPONS[gun.id].name} <b>${effectiveWeaponProfile(gun.id, gun.tier, weaponItemModifiers(gun.id, beforeDerived)).damage.toFixed(1)} → ${projected.find((p) => p.id === gun.id)?.profile.damage.toFixed(1) ?? "?"}</b></span>`,
        )
        .join("");
      return `<button class="stat-choice" data-stat="${index}">
        <span>${STAT_REWARD_LABEL[reward].name}</span><strong>${STAT_REWARD_LABEL[reward].detail}</strong>
        <small>伤害 ${beforeDerived.weaponFactor.toFixed(2)} → ${afterDerived.weaponFactor.toFixed(2)} · 攻速 ${beforeDerived.asFactor.toFixed(2)} → ${afterDerived.asFactor.toFixed(2)} · 机制强度 ${beforeDerived.powerFactor.toFixed(2)} → ${afterDerived.powerFactor.toFixed(2)}</small>
        <div class="stat-weapons">${weaponPreview || "当前无枪"}</div>
      </button>`;
    })
    .join("");
  const reroll = rerollPrice(g.shopRerollIndex);
  const pendingRow = coreRewards
    ? `<section class="rest-choice-section reward-row"><div class="rest-section-heading"><div><span class="section-kicker">FREE CORE / 机制已打出</span><h3>把这件挂进回路。</h3></div><button class="text-button" data-skip-reward>跳过本次</button></div><div class="item-card-row">${coreRewards}</div><small class="section-note">跳过或直接下海都无补偿；离开整备点即丢弃本行。</small></section>`
    : statChoices
      ? `<section class="rest-choice-section reward-row"><div class="rest-section-heading"><div><span class="section-kicker">STAT PICK / 这一停只拿一项</span><h3>让枪和破烂一起变厚。</h3></div><button class="text-button" data-skip-reward>放弃本次</button></div><div class="stat-choice-row">${statChoices}</div><small class="section-note">不领取也能继续下一波。</small></section>`
      : chestRewards
        ? `<section class="rest-choice-section reward-row"><div class="rest-section-heading"><div><span class="section-kicker">${g.frozenChest!.source === "boss" ? "BOSS CHEST" : "ELITE CHEST"} / ${g.frozenChest!.source === "boss" ? "三选一" : "二选一"}</span><h3>挑一件宝箱战利品。</h3></div><button class="text-button" data-skip-reward>不领取</button></div><div class="item-card-row">${chestRewards}</div><small class="section-note">已拥有或达到上限的选项不可再选；跳过不会换成废料。</small></section>`
        : "";
  const itemRow = itemOffers
    ? `<section class="rest-choice-section shop-item-section"><div class="rest-section-heading"><div><span class="section-kicker">ITEM ROW / 每停最多三件</span><h3>别只盯着枪。</h3></div><span class="section-note">稀有度会影响掉落，不是装饰色。</span></div><div class="item-card-row">${itemOffers}</div></section>`
    : "";
  overlay(
    `<section class="shop-panel expedition-shop p2-rest"><div class="shop-heading"><div><div class="eyebrow">REST ${String(g.wave).padStart(2, "0")} / 20 · SCRAP MARKET</div><h2>退潮。挑点<span>能滚起来的东西。</span></h2><p>武器负责底盘，物品把伤害、掉落和拾取接成一条链。三行分开，不互相顶替。</p></div><div class="shop-wallet"><span>废料</span><strong>${g.money}<small> ◈</small></strong><small>枪 ${g.guns.length} / ${g.slotCap} · 物品 ${itemArtifactCount(g)} 件</small></div></div>
    <div class="shop-sticky"><span>废料 <b>${g.money}</b></span><span>枪 <b>${g.guns.length} / ${g.slotCap}</b></span><span>物品 <b>${itemArtifactCount(g)} / 20</b></span><span>最高枪阶 <b>${gunTierLabel(maxTier)}</b></span><button id="next-compact" class="text-button">开始下一波 →</button></div>
    ${g.wave === 1 ? '<div class="rest-brief"><b>W1 免费核心</b><span>三选一是机制行，不和商店售卖行混在一起。</span><span>跳过后，下一波仍会开始，不补现金。</span></div>' : ""}
    <div class="rest-start-row"><span>整备点不消耗战斗时间。看完卡面就出发。</span><button id="next-fast" class="primary">开始下一波 <b>→</b></button></div>
    ${pendingRow}
    <section class="rest-choice-section weapon-market"><div class="rest-section-heading"><div><span class="section-kicker">WEAPON ROW / 独立武器池</span><h3>底盘火力</h3></div><span class="section-note">三把不同武器；同款同阶会自动合成，最高 IV。</span></div><div class="weapon-cards">${offered}</div><div class="row-actions"><span>拆解会返还累计投入的 35%。</span><button id="reroll" class="text-button" ${g.money < reroll ? "disabled" : ""}>一起换武器与物品 ↻ ${reroll ? `${reroll} ◈` : "首次免费"}</button></div></section>
    ${itemRow}
    <section class="rest-choice-section inventory-section"><div class="rest-section-heading"><div><span class="section-kicker">ITEM BAG / 当前持有</span><h3>破烂清单</h3></div><span class="section-note">${itemArtifactCount(g)} 件 · 点按查看完整效果</span></div><div class="inventory-list">${ownedInventoryMarkup(g)}</div></section>
    <div class="item-detail-panel" id="selected-item-detail" aria-live="polite"></div>
    <p class="weapon-dps-note">理论DPS按每轮弹丸全中估算；不含多目标与拾取弹。双联扳机只强化快枪 / 散弹 / 火箭。</p>
    <div class="owned-heading"><h3>壳上的火力</h3><span>实时面板值 · 已计物品</span></div>
    <div class="owned-grid">${owned}</div>
    <div class="empty-slots">${g.guns.length < g.slotCap ? `还有 ${g.slotCap - g.guns.length} 个空槽可以买新武器。` : "六个槽位已满；同名同阶仍可合成。"} 枪位是容量，不是免费武器。</div>
    <div class="wave-armor"><b>下一波 ${g.wave + 1} 装甲</b><span>${g.wave >= 19 ? "W20 终点战，胜利即结束" : waveHpLabel(g.wave + 1)}</span><small>首领在 ${BOSS_WAVES_TEXT} 波；精英在 ${ELITE_WAVES_TEXT} 波。</small></div>
    <div class="shop-footer"><small>下一波回复 ${waveRecovery(g.mode, g.wave + 1)} 格生命 · 可滚动查看全部卡面 · 商店不计战斗时间</small><button id="next" class="primary">${g.wave >= 19 ? "迎战最终潮汐" : "带着这批破烂下海"} <b>→</b></button></div></section>`,
  );
  // Every detail is already present in the card, so touch users need no hover.
  document
    .querySelectorAll<HTMLElement>(".p2-rest [data-select-item]")
    .forEach((card) => {
      const definition = ITEM_BY_ID[card.dataset.itemId as ItemId];
      const template = document.createElement("div");
      template.className = "item-detail-template";
      const cardIndex = Number(card.dataset.itemCard);
      const action =
        definition &&
        card.classList.contains("p2-item-card") &&
        card.closest(".shop-item-section")
          ? `<div class="detail-action"><span>${g.itemOfferPrice(cardIndex)} ◈</span><button class="item-buy" data-buy-item="${cardIndex}" ${g.soldItems.has(cardIndex) || !g.itemEligibility(definition.id).eligible || g.money < g.itemOfferPrice(cardIndex) ? "disabled" : ""}>${g.soldItems.has(cardIndex) ? "已购入" : "按此价买入"}</button></div>`
          : definition &&
              card.classList.contains("p2-item-card") &&
              card.closest(".reward-row")
            ? `<div class="detail-action"><span>免费 · 钱包不变</span><button class="item-buy" data-claim-${card.classList.contains("chest-choice") ? "chest" : "core"}="${cardIndex}" ${!g.itemEligibility(definition.id).eligible ? "disabled" : ""}>${!g.itemEligibility(definition.id).eligible ? "不可选" : "选中这件"}</button></div>`
            : "";
      const shouldProject =
        definition &&
        card.classList.contains("p2-item-card") &&
        g.itemEligibility(definition.id).eligible &&
        !(
          card.closest(".shop-item-section") && g.soldItems.has(cardIndex)
        );
      const projected = shouldProject
        ? itemCountsWith(g.inventory, definition.id)
        : g.inventory;
      const context = {
        moved: true,
        pressureActive: g.pressureTimer > 0,
        weapons: g.guns.map((gun) => gun.id),
      } as const;
      const currentPreview = itemProcPreview(
        g.inventory,
        g.statRewards,
        context,
      );
      const procPreview = itemProcPreview(projected, g.statRewards, context);
      const itemActive = procPreview.activeByItem[definition.id] === true;
      const beforeDerived = deriveItemStats(
        g.inventory,
        g.statRewards,
        context,
      );
      const afterDerived = deriveItemStats(projected, g.statRewards, context);
      const procLine = procPreview.byItem[definition.id] || "";
      const procCondition = procPreview.conditionsByItem[definition.id] || "";
      const selectedReadout = previewReadout(
        currentPreview,
        procPreview,
        definition.id,
      );
      const derivedReadout = derivedPreviewReadout(beforeDerived, afterDerived);
      const effectLine =
        procLine || derivedReadout || "这件物品当前没有可变化的战斗数值。";
      const heldProcReadouts: string[] = [];
      const powerChanged =
        Math.abs(afterDerived.powerFactor - beforeDerived.powerFactor) >=
        0.0001;
      if (powerChanged) {
        for (const candidate of ITEM_IDS) {
          if (
            candidate === definition.id ||
            itemCount(g.inventory, candidate) <= 0
          )
            continue;
          const readout = previewReadout(
            currentPreview,
            procPreview,
            candidate,
          );
          if (readout)
            heldProcReadouts.push(`${ITEM_BY_ID[candidate].name}：${readout}`);
        }
      }
      const effectTitle = procLine
        ? itemActive
          ? "效果数值"
          : "当前未生效"
        : "数值变化";
      const detailReadouts = [
        selectedReadout && procLine ? `当前：${selectedReadout}` : "",
        derivedReadout && procLine ? derivedReadout : "",
        ...heldProcReadouts,
      ].filter(Boolean);
      template.innerHTML = `<div class="detail-head"><span class="item-code">${ITEM_FAMILY_LABEL[definition.family]} · ${RARITY_LABEL[definition.rarity]}</span><span class="rarity-label">${itemCapText(g, definition.id)}</span></div><h4>${definition.name}</h4><p>${definition.description}</p><div class="detail-tags"><span>${RARITY_LABEL[definition.rarity]}</span><span>${itemCapText(g, definition.id)}</span>${definition.weaponEligibility.length ? "<span>适用枪：快枪 / 散弹 / 火箭</span>" : ""}${definition.dependencies.allOf.length || definition.dependencies.anyOf.length ? "<span>需要前置物品</span>" : ""}</div><div class="detail-proc"><b>${effectTitle}</b><span>${effectLine}</span>${detailReadouts.length ? `<small>${detailReadouts.join("；")}</small>` : ""}${procCondition ? `<small>${procCondition}</small>` : ""}</div>${action}`;
      card.append(template);
    });
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-buy]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.buy(Number(b.dataset.buy))) {
            note(`购入 ${b.dataset.buyGunName || "武器"}`);
            expeditionShop(g);
          } else note("这笔购买无法结算。");
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-buy-item]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const index = Number(b.dataset.buyItem);
          const id = g.itemOffers[index];
          if (g.buyItem(index)) {
            note(id ? `${ITEM_BY_ID[id].name} 已购入并生效。` : "物品已购入。");
            expeditionShop(g);
          } else note("这张物品卡已失效，价格不足或有前置限制。");
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-claim-core]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.claimCoreReward(Number(b.dataset.claimCore))) expeditionShop(g);
          else note("这件核心已不可领取。");
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-claim-chest]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.claimPendingItem(Number(b.dataset.claimChest)))
            expeditionShop(g);
          else note("这个宝箱选项当前不可领取。");
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-stat]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.chooseStatReward(Number(b.dataset.stat))) expeditionShop(g);
          else note("这项数值选择已不可用。");
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-skip-reward]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.skipReward()) expeditionShop(g);
        }),
    );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-sell]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.sell(Number(b.dataset.sell))) expeditionShop(g);
        }),
    );
  $("reroll").onclick = () => {
    if (g.reroll()) {
      note("武器与物品一起刷新；已领取的奖励不受影响。");
      expeditionShop(g);
    } else note("本次没有可支付且能改变卡面的刷新。");
  };
  const startNextWave = () => {
    g.nextWave();
    input.clear();
    sync();
    updateHud();
  };
  $("next-compact").onclick = startNextWave;
  $("next-fast").onclick = startNextWave;
  $("next").onclick = () => {
    startNextWave();
  };
  selectItemDetail(".p2-rest");
}
function quick(g: Game) {
  const kind = quickKind(g.wave);
  const eyebrow =
    kind === "branch"
      ? "TIDE FORK / 这一选，整局作数"
      : kind === "mod-upgrade"
        ? "TIDE TUNE / 改装升级"
        : "TIDE TRINKET / 免费改装";
  const lead =
    kind === "branch"
      ? "选一道海流，改变整局掉落和连锁的走法。另一边会在下一轮关掉。"
      : kind === "mod-upgrade"
        ? "选一个壳上改装提升一级。只升一级，然后继续下海。"
        : "三选一，免费挂上壳。这里不卖枪，只决定哪种反馈回路先长出来。";
  const cards =
    kind === "branch"
      ? (g.quickOptions as ExpeditionBranch[])
          .map(
            (
              id,
            ) => `<button class="branch-card ${g.branch === id ? "selected" : ""}" data-quick="${id}" ${g.quickPicked ? "disabled" : ""} aria-pressed="${g.branch === id}">
              <b>${BRANCHES[id].icon}</b><span>${BRANCHES[id].en}</span>
              <h3>${BRANCHES[id].name}${g.branch === id ? " ✓" : ""}</h3><p>${BRANCHES[id].desc}</p>
              <small>${g.branch === id ? "已选 · 本局生效" : "永久 · 二选一"}</small>
            </button>`,
          )
          .join("")
      : (g.quickOptions as ModId[])
          .map((id) => {
            const currentTier = g.modTier(id);
            const nextTier = kind === "mod-upgrade" ? currentTier + 1 : 1;
            const selected =
              kind === "mod-upgrade"
                ? g.quickPicked && quickPickedId === id
                : g.has(id);
            const shownTier =
              kind === "mod-upgrade" && quickPickedId === id
                ? g.modTier(id)
                : nextTier;
            return `<button class="mod-card quick-card ${selected ? "selected" : ""}" data-quick="${id}" ${g.quickPicked ? "disabled" : ""} aria-pressed="${selected}">
              <b>${modIcon(id, shownTier)}</b><div><span class="tier-label">${kind === "mod-upgrade" ? `${modTierLabel(quickPickedId === id ? quickPickedTier : currentTier)} → ${modTierLabel(shownTier)}` : `TIER ${modTierLabel(shownTier)}`}</span><strong>${MODS[id].name}</strong><p>${nextModDescription(id, shownTier)}</p></div>
              <small>${selected ? "已选 ✓" : g.quickPicked ? "本次未选" : "免费"}</small>
            </button>`;
          })
          .join("");
  const canContinue =
    kind === "branch"
      ? !!g.branch
      : kind === "mod-upgrade"
        ? g.quickPicked
        : g.quickPicked;
  overlay(
    `<section class="quick-panel"><div class="eyebrow">${eyebrow}</div><h2>${kind === "branch" ? "海流往哪边走？" : kind === "mod-upgrade" ? "把回路再拧紧一格。" : "挑一件挂上壳。"}</h2><p>${lead}</p><div class="quick-grid">${cards}</div><div class="quick-footer"><small>第 ${g.wave} 波结束 · 接波回复 ${waveRecovery(g.mode, g.wave + 1)} 格 · 免费</small><button id="next" class="primary" ${canContinue ? "" : "disabled"}>${canContinue ? "继续下海" : "先选一件"} <b>→</b></button></div></section>`,
  );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-quick]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const raw = b.dataset.quick!;
          const value =
            kind === "branch" ? (raw as ExpeditionBranch) : (raw as ModId);
          if (kind !== "branch") {
            const id = value as ModId;
            quickPickedTier = g.modTier(id);
            if (g.chooseQuick(value)) {
              quickPickedId = id;
              quick(g);
            }
          } else if (g.chooseQuick(value)) quick(g);
        }),
    );
  $("next").onclick = () => {
    if (!canContinue && !g.quickPicked) return;
    quickPickedId = null;
    quickPickedTier = 0;
    g.nextWave();
    input.clear();
    sync();
    updateHud();
  };
}
function end() {
  if (!game) return;
  const g = game,
    win = g.phase === "won";
  if (!doneSaved) {
    record.runs++;
    if (win) record.wins++;
    record.best = Math.max(record.best, g.kills);
    persist();
    doneSaved = true;
  }
  const expedition = g.mode === "expedition20";
  overlay(
    `<section class="end-panel ${expedition ? "expedition-end" : ""}"><div class="eyebrow">${win ? "BEACH: CLEAN. SHELL: LOADED." : "ONE CRAB DOWN. ANOTHER TIDE COMING."}</div><div class="end-burst">${win ? "✷" : "×"}</div><h2>${win ? (expedition ? "二十波潮线，全打穿了。" : "这片海滩，你说了算。") : "壳碎了，火力没白攒。"}</h2><p>${win ? (expedition ? `第 20 波的首领倒下了。${g.branch ? `这条${BRANCHES[g.branch].name}路线完整走完。` : ""}` : "这次先打两波。下一步要不要扩成完整肉鸽，先听你的手感。") : g.player.hp <= 0 ? "被贴身敌人或红色弹丸击穿了。保持移动，把废料捡回来，让连锁替你清场。" : "首领没能及时击败。多挂武器，让改装之间互相产生火力。"}</p><div class="end-stats"><div><b>${g.kills}</b><small>击败</small></div><div><b>${g.earned}</b><small>废料入账</small></div><div><b>${g.shots}</b><small>弹药倾泻</small></div><div><b>${expedition ? `${g.wave} / 20` : `${Math.floor(g.time)}s`}</b><small>${expedition ? "抵达波次" : "战斗时间"}</small></div></div><div class="end-build">${g.guns.map((w) => `<span>${WEAPONS[w.id].name} ${modTierLabel(w.tier ?? 1)}</span>`).join("")}${g.mods.map((id) => `<span class="mod">${MODS[id].name} ${modTierLabel(g.modTier(id))}</span>`).join("")}${g.branch ? `<span class="branch">${BRANCHES[g.branch].icon} ${BRANCHES[g.branch].name}</span>` : ""}</div>${expedition ? `<div class="end-metrics"><span>连锁峰值 <b>${g.chainPeak}</b></span><span>待处理爆发峰值 <b>${g.pendingPeak}</b></span><span>Spawned <b>${g.spawnCount}</b></span></div>` : ""}<div class="end-actions"><button id="retry" class="primary">再卷一次 <b>↻</b></button><button id="home" class="outline">回到海滩</button></div><small class="fine">${expedition ? "EXPEDITION 20 · " : "两波手感切片 · "}不含局外成长 · SEED ${g.seed.toString(16).toUpperCase()} · 模式 ${gameMode}</small></section>`,
  );
  $("retry").onclick = () => start(g.seed);
  $("home").onclick = home;
}
function sync() {
  if (!game || game.phase === phase) return;
  phase = game.phase;
  const detour = phase === "shop" || phase === "quick" || phase === "paused";
  if (detour) input.clear();
  if (phase === "shop") shop();
  else if (phase === "quick") quick(game);
  else if (phase === "won" || phase === "lost") end();
  else if (phase === "paused") {
    overlay(
      `<section class="pause-panel"><div class="eyebrow">THE TIDE CAN WAIT</div><h2>歇一口气。</h2><p>怪潮、子弹和连锁都已暂停。</p><button id="resume" class="primary">继续开火 <b>→</b></button><button id="quit" class="text-button">结束本局，回到海滩</button></section>`,
    );
    $("resume").onclick = pause;
    $("quit").onclick = home;
  } else close();
}
function updateHud() {
  if (!game) return;
  const g = game;
  const maxHp = Math.max(1, Math.ceil(g.player.maxHp));
  const hp = Math.max(0, Math.min(maxHp, Math.ceil(g.player.hp)));
  $("hp-label").textContent = `${hp} / ${maxHp}`;
  $("hp").innerHTML = Array.from(
    { length: maxHp },
    (_, i) => `<i class="${i < hp ? "full" : ""}"></i>`,
  ).join("");
  $("hp").setAttribute("aria-label", `生命 ${hp} / ${maxHp}`);
  $("wave-label").textContent =
    g.mode === "expedition20"
      ? `WAVE ${String(g.wave).padStart(2, "0")} / 20`
      : `${g.wave === 1 ? "第一波" : "第二波"} / 02`;
  // Past the wave deadline the run continues until the boss dies (or 50s).
  // Surface that overtime explicitly instead of leaving a frozen 00 timer.
  const overtime = g.overtime;
  $("edge").classList.toggle("overtime", overtime);
  $("timer").textContent = String(g.displaySeconds).padStart(2, "0");
  $("edge-fill").style.width = `${
    Math.max(
      0,
      Math.min(
        1,
        overtime ? (g.deadline - g.waveTime) / 15 : g.waveTime / g.duration,
      ),
    ) * 100
  }%`;
  const boss = g.enemies.find((e) => e.kind === "boss");
  $("wave-note").textContent =
    g.phase === "interlude"
      ? `接波回复 ${waveRecovery(g.mode, g.wave + 1)} 格 · 按键保持`
      : overtime
        ? "加时 · 击败首领"
        : g.mode === "expedition20"
          ? boss
            ? `${bossForWave(g.wave)?.name ?? "首领"}来了！`
            : g.wave === 1
              ? `只怕不移动 · ${waveHpLabel(g.wave)}`
              : `${waveHpLabel(g.wave)} · ${stopAfter(g.wave) ? "打完去整备" : "潮线还在往前"}`
          : g.wave === 1
            ? "只管走位，自动开火"
            : g.bossSpawned && !g.bossKilled
              ? "罐头大王来了！"
              : "连锁已上线，冲进废料堆";
  $("money").textContent = String(g.money);
  $("kill-count").textContent = `${g.kills} 击败`;
  $("loadout").innerHTML = Array.from({ length: g.slotCap }, (_, i) => {
    const gun = g.guns[i];
    return gun
      ? `<div class="gun-tier-${gun.tier ?? 1}" title="${WEAPONS[gun.id].desc} · ${gunTierLabel(gun.tier)}">${icon(gun.id)}<small>${WEAPONS[gun.id].name} ${gunTierLabel(gun.tier)}</small></div>`
      : '<div class="empty">+<small>空槽</small></div>';
  }).join("");
  $("mod-strip").innerHTML =
    g.mods
      .map(
        (id) =>
          `<span class="tier-${g.modTier(id)}">${MODS[id].icon} ${MODS[id].name} <b>${modTierLabel(g.modTier(id))}</b></span>`,
      )
      .join("") +
    (g.branch
      ? `<span class="branch-strip">${BRANCHES[g.branch].icon} ${BRANCHES[g.branch].name}</span>`
      : "");
  $("hint").textContent =
    g.mode === "expedition20"
      ? g.phase === "interlude"
        ? "潮水没有停。保持移动，下一波马上接上。"
        : g.phase === "sweep"
          ? "退潮收废料，下一处整备点马上到。"
          : g.player.hp <= 3
            ? "壳快碎了。拉开距离，先捡安全的那一堆废料。"
            : g.wave < 4
              ? "移动就是闪避。武器自己找目标。"
              : g.wave < 9
                ? "武器打底盘，物品把伤害、掉落和拾取接成回路。"
                : g.wave < 16
                  ? "容量不是免费枪位。留下真正喂回路的武器。"
                  : "潮水在加速。把已成的连锁交给它自己滚。"
      : g.wave === 1
        ? g.waveTime < 7
          ? "只需要移动。每把武器都会自己找目标。"
          : g.waveTime < 15
            ? "靠近金色废料，它们会飞进你的壳。"
            : "即将退潮！剩下的废料会全部收回来。"
        : g.waveTime < 8
          ? "新武器都挂上了。冲进废料堆，让反馈回路启动！"
          : "";
  $("hint").hidden = !$("hint").textContent;
  $("boss").hidden = !boss;
  if (boss) {
    const info = g.mode === "expedition20" ? bossForWave(g.wave) : null;
    $("boss").className = info ? `stage-${info.stage}` : "";
    $("boss").querySelector("span")!.textContent = info
      ? `${info.name} / ${info.en} · HP ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`
      : "罐头大王 / DON'T GET CANNED";
    $("boss").setAttribute(
      "aria-label",
      `${info?.name ?? "罐头大王"} ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp} HP`,
    );
    $("boss").querySelector("i")!.style.width =
      `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  }
  $("kill-banner").textContent =
    g.pendingBlasts.length > 2
      ? "连锁起飞！"
      : g.wave === 2 && g.bullets.filter((b) => b.kind === "bonus").length > 15
        ? "废料正在替你开火！"
        : "";
}
// Measure the real HUD chrome and hand the free band to the renderer, so the
// arena is laid out beside the HUD instead of underneath it.
function layout() {
  if (!game || $("hud").hidden) {
    renderer.reserveTop = 0;
    renderer.reserveBottom = 0;
    return;
  }
  // The canvas and the HUD both live in the #app box. Use that box as the single
  // reference frame: window.innerHeight can differ from the canvas CSS height on
  // mobile (visual viewport vs layout viewport), which previously over-reserved
  // space and squeezed the arena.
  const host = $<HTMLCanvasElement>("arena").getBoundingClientRect();
  let bottomTop = $("hud-bottom").getBoundingClientRect().top;
  const stick = $("joystick");
  if (getComputedStyle(stick).display !== "none")
    bottomTop = Math.min(bottomTop, stick.getBoundingClientRect().top);
  const mods = $("mod-strip").getBoundingClientRect();
  if (mods.height) bottomTop = Math.min(bottomTop, mods.top);
  if (!$("hint").hidden)
    bottomTop = Math.min(bottomTop, $("hint").getBoundingClientRect().top);
  renderer.reserveTop = Math.max(
    0,
    $("edge").getBoundingClientRect().bottom - host.top,
  );
  renderer.reserveBottom = Math.max(0, host.bottom - bottomTop);
}
$("start").onclick = () => {
  const s = params.get("seed");
  start(s && /^[0-9a-f]{1,8}$/i.test(s) ? parseInt(s, 16) : undefined);
};
$("sound").onclick = () => {
  sound.init();
  sound.toggle();
  record.muted = sound.muted;
  persist();
  soundLabel();
};
function soundLabel() {
  $("sound").textContent = sound.muted ? "声音 OFF" : "声音 ON";
  $("sound").setAttribute("aria-label", sound.muted ? "开启声音" : "关闭声音");
}
soundLabel();
$("pause").onclick = pause;
$("brand").onclick = (e) => {
  e.preventDefault();
  if (game) pause();
};
$("how").onclick = () => {
  overlay(
    `<section class="pause-panel guide"><div class="eyebrow">JUST KEEP MOVING</div><h2>你负责走位。<br>破烂负责开火。</h2><p><b>电脑：</b>WASD / 方向键移动。<br><b>手机：</b>拖动左下摇杆。<br>无需瞄准或按攻击键，壳上的武器会同时工作。</p><p>${gameMode === "expedition20" ? "二十波潮线。W1-W19 每次退潮都有三把武器、三件物品和一项机制或数值奖励；W1 免费选一件核心物品。同名同阶武器会自动二合一，最多六格。物品有的是可重复叠加，有的只能拥有一件。精英掉实体宝箱，首领宝箱品质更高。每次整备都可手动开始下一波或跳过未领奖励；刷新页面会结束本局，只保留记录和静音设置。" : "第一波 20 秒 → 商店买武器、免费选两种改装 → 第二波 35 秒并击败首领。"}<br>捡废料、喷子弹、击杀爆炸，试着把它们接成一个回路。</p><p class="fine">P / Esc 暂停。切出窗口或旋转屏幕自动暂停。刷新会结束本局，只保存完成记录和声音设置。${gameMode === "slice" ? " 当前是切片模式；去掉 mode=slice 即进入 20 波远征。" : ""}</p><button id="gotit" class="primary">懂了，开整 <b>→</b></button></section>`,
  );
  $("gotit").onclick = close;
};
window.addEventListener("blur", () => {
  if (
    game &&
    (game.phase === "fight" ||
      game.phase === "sweep" ||
      game.phase === "interlude")
  )
    pause();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    game &&
    (game.phase === "fight" ||
      game.phase === "sweep" ||
      game.phase === "interlude")
  )
    pause();
  last = 0;
  acc = 0;
});
window.addEventListener("resize", () => {
  renderer.resize();
  if (
    game &&
    (game.phase === "fight" ||
      game.phase === "sweep" ||
      game.phase === "interlude")
  )
    pause();
  input.clear();
});
function pct(q: number) {
  const sorted = [...frameTimes].sort((a, b) => a - b);
  return sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
    : 0;
}
Object.defineProperty(window, "scrapMetrics", {
  get: () => ({
    mode: gameMode,
    phase: game?.phase ?? "title",
    seed: game?.seed,
    wave: game?.wave,
    duration: game?.duration,
    time: game?.time,
    waveTime: game?.waveTime,
    kills: game?.kills,
    money: game?.money,
    shots: game?.shots,
    hits: game?.hits,
    // F0 read-only instruments: plain per-run scalars, no live references.
    shootAcceptedPlayer: game?.shootAcceptedPlayer,
    shootAcceptedEnemy: game?.shootAcceptedEnemy,
    shootRejectedPlayer: game?.shootRejectedPlayer,
    shootRejectedEnemy: game?.shootRejectedEnemy,
    bulletPeak: game?.bulletPeak,
    popcornBudgetSkippedPickups: game?.popcornBudgetSkippedPickups,
    firstKill: game?.firstKill,
    firstPickup: game?.firstPickup,
    hp: game?.player.hp,
    maxHp: game?.maxHp,
    derived: game?.derivedItemStats(),
    procPreview: game
      ? itemProcPreview(game.inventory, game.statRewards, {
          moved: game.movedThisTick,
          pressureActive: game.pressureTimer > 0,
          weapons: game.guns.map((gun) => gun.id),
        })
      : null,
    statRewards: game ? { ...game.statRewards } : null,
    itemRerollUsed: game?.itemRerollUsed,
    position: game ? { x: game.player.x, y: game.player.y } : null,
    guns: game?.guns.map((g) => g.id),
    gunTiers: game?.guns.map((g) => g.tier ?? 1) ?? [],
    gunProfiles:
      game?.guns.map((gun) => effectiveWeaponProfile(gun.id, gun.tier)) ?? [],
    inventory: game?.inventoryCounts,
    itemOffers: game?.itemOffers.slice() ?? [],
    rewards: game
      ? {
          ...game.pendingRewards,
          statOffers: game.statRewardOffers.slice(),
        }
      : null,
    profiles: game
      ? (() => {
          const derived = game.derivedItemStats();
          return game.guns.map((gun) => {
            const profile = effectiveWeaponProfile(
              gun.id,
              gun.tier,
              weaponItemModifiers(gun.id, derived),
            );
            return {
              id: gun.id,
              ...profile,
              tier: gun.tier ?? 1,
              projectileCount: projectileCount(profile),
              dps: perVolleyDps(profile),
            };
          });
        })()
      : [],
    elite: game?.eliteRenderData ?? null,
    eliteWarning: game ? eliteWarningData(game) : null,
    eliteWaveStats:
      game && isEliteWave(game.wave)
        ? {
            ...ELITE_STATS[game.wave],
            expectedSpawnAt: game.duration * ELITE_TIMER_SHARE,
          }
        : null,
    chest: game?.chestRenderData ?? [],
    trailPoints:
      game?.trailPoints.map((point) => ({
        x: point.x,
        y: point.y,
        life: point.life,
        max: point.max,
        radius: point.radius,
        damage: point.damage,
      })) ?? [],
    frozenChest: game?.pendingRewards.chest ?? null,
    queueCounters: game
      ? Object.fromEntries(
          Object.entries(game.queueMetrics).map(([key, value]) => [
            key,
            { ...value },
          ]),
        )
      : null,
    cashFuel: game
      ? {
          wallet: game.money,
          rawCash: game.rawCash,
          fuelUnits: game.fuelUnits,
          collected: game.collected,
          sweptFuelUnits: game.sweptFuelUnits,
          coinAccumulator: game.coinAccumulator,
        }
      : null,
    slotCap: game?.slotCap,
    mods: game?.mods.slice(),
    modTiers: game ? game.mods.map((id) => game!.modTier(id)) : [],
    branch: game?.branch ?? null,
    stop: game?.stop ?? null,
    quickOptions: game?.quickOptions.slice() ?? [],
    offers: game?.offers.slice() ?? [],
    recordKey,
    enemies: game?.enemies.length,
    // A fresh array of fresh {x, y} copies on every read: no live enemy
    // references leave this getter, so a caller cannot mutate game state
    // through it. Includes the warning-outline enemies that are already drawn
    // on screen (born > 0), not just the fully spawned ones.
    enemyPositions:
      game?.enemies.filter((e) => e.hp > 0).map((e) => ({ x: e.x, y: e.y })) ??
      [],
    boss: (() => {
      const boss = game?.enemies.find((e) => e.kind === "boss" && e.hp > 0);
      return boss
        ? {
            x: boss.x,
            y: boss.y,
            hp: boss.hp,
            maxHp: boss.maxHp,
            stage: boss.bossStage ?? 1,
            born: boss.born,
          }
        : null;
    })(),
    bullets: game?.bullets.length,
    scraps: game?.scraps.length,
    pending: game?.pendingBlasts.length,
    pendingPeak: game?.pendingPeak,
    popcornFuelConsumed: game?.popcornFuelConsumed,
    popcornShotsAdmitted: game?.popcornShotsAdmitted,
    popcornShotsRejected: game?.popcornShotsRejected,
    corpses: game?.corpses.length,
    chainCount: game?.chainCount,
    chainPeak: game?.chainPeak,
    combatPicked: game?.combatPicked,
    spawnCount: game?.spawnCount,
    arena: game ? renderer.arenaRect() : null,
    bossKilled: game?.bossKilled,
    frames,
    samples: frameTimes.length,
    medianMs: pct(0.5),
    p95Ms: pct(0.95),
  }),
});
function frame(now: number) {
  const raw = last ? (now - last) / 1000 : 0;
  last = now;
  if (game && !title) {
    acc = Math.min(0.1, acc + Math.min(0.1, raw));
    while (acc >= DT) {
      game.step(DT, input.read());
      acc -= DT;
    }
    for (const e of game.drain()) sound.play(e);
    playEliteWarning(game);
    sync();
    renderer.render(
      game,
      now / 1000,
      game.mode === "expedition20" ? expeditionPresentation(game) : undefined,
    );
    if (now - uiAt > 100) {
      updateHud();
      layout();
      uiAt = now;
    }
    if (game.phase === "fight" && raw > 0) {
      frameTimes.push(raw * 1000);
      if (frameTimes.length > 1800) frameTimes.shift();
    }
  } else renderer.title(now / 1000);
  frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
