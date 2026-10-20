import "./style.css";
import { Game } from "./sim";
import { Renderer } from "./render";
import { Input } from "./input";
import { Sound } from "./audio";
import { DT, WEAPONS, MODS, type WeaponId, type ModId } from "./data";
import {
  BAG_HP,
  BRANCHES,
  HP_MULT,
  bossForWave,
  clampedWave,
  effectiveWeaponProfile,
  gunTierLabel,
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
<section id="title" class="title"><div class="title-copy"><div class="kicker"><span></span> 一只小蟹。六把破烂。一整片怪潮。</div><h1>废<span>潮</span><i>!</i></h1><h2>捡的是垃圾。<br>打出来的是<span>火力。</span></h2><p>只管走位，让壳上的家伙自动开火。<br>捡废料、挂武器，把一场混战滚成连锁反应。</p><div class="start-row"><button class="primary" id="start">下海，开火 <b>↗</b></button><button id="how" class="outline">怎么玩？</button></div><small>${gameMode === "expedition20" ? "20 波潮线 · 9 次整备 · 4 场首领战 · 约 15 分钟" : "两波战斗 + 一次改装商店 · 约 1 分钟战斗体验"}</small></div><div class="sticker">不用瞄准<br><strong>自动开火！</strong><span>JUST KEEP MOVING</span></div><div class="title-bottom"><div><b>01</b><p>走位活下来<small>WASD / 方向键 · 触屏摇杆</small></p></div><div><b>02</b><p>往壳上挂火力<small>六个槽位，同时开火</small></p></div><div><b>03</b><p>让连锁自己滚起来<small>击杀 → 掉落 → 火力 → 更多击杀</small></p></div></div><div class="bottom-tape">TRASH INTO TREASURE · TREASURE INTO TROUBLE · TRASH INTO TREASURE · TREASURE INTO TROUBLE</div></section>
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
function weaponStats(profile: EffectiveWeaponProfile) {
  const direct = profile.damage * Math.max(profile.pellets, profile.shots, profile.saws);
  const dps = direct / profile.interval;
  const extra =
    profile.blastRadius > 0
      ? `<span>爆炸半径 <b>${profile.blastRadius}</b></span>`
      : profile.jumpRange > 0
        ? `<span>跳距 <b>${profile.jumpRange}</b></span>`
        : profile.sawOrbitRadius > 0
          ? `<span>环绕 <b>${profile.sawOrbitRadius}</b> / 接触 <b>${profile.sawContactRadius}</b></span>`
          : "";
  return `<div class="weapon-summary"><span>攻击 <b>${profile.damage}</b></span><span class="weapon-dps">理论DPS <b>${dps.toFixed(1)}</b></span><span class="weapon-effect">${weaponEffectLabel(profile)}</span></div><div class="weapon-stats"><span>间隔 ${profile.interval.toFixed(2)}s</span><span>射程 ${profile.range}</span>${extra}</div>`;
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
function expeditionShop(g: Game) {
  const maxTier = g.guns.reduce(
    (best, gun) => Math.max(best, gun.tier ?? 1),
    1,
  );
  const ownedSlots = g.guns
    .map((gun, index) => {
      const tier = gun.tier ?? 1;
      const profile = effectiveWeaponProfile(gun.id, tier);
      return `<div class="owned-slot">
        <div class="owned-weapon">${icon(gun.id)}<div><strong>${WEAPONS[gun.id].name} ${gunTierLabel(tier)}</strong><small>${WEAPONS[gun.id].desc}</small>${weaponStats(profile)}</div></div>
        <div class="slot-actions">
          <button data-sell="${index}" ${g.guns.length <= 1 ? "disabled" : ""}>拆解 +${g.sellPrice(index)} ◈</button>
        </div>
      </div>`;
    });
  const owned = ownedSlots.join("");
  const offered = g.offers
    .map((id, index) => {
      const w = WEAPONS[id],
        sold = g.sold.has(index),
        record = sold ? g.purchaseRecords.get(index) : undefined,
        price = Math.ceil((w.price * (g.wave + 4)) / 5),
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
      const resultNote = record
        ? `攻击 ${record.damage}`
        : full
          ? "无空槽且无法合成"
          : `攻击 ${effectiveWeaponProfile(id, preview!.incomingTier).damage}`;
      return `<button class="weapon-card ${sold ? "sold" : ""}" data-buy="${index}" ${sold || !afford || full ? "disabled" : ""}>
        <div class="card-tag">${w.en}</div>${icon(id)}<h3>${w.name}</h3><p>${w.desc}</p>${weaponStats(effectiveWeaponProfile(id, 1))}
        <div class="weapon-preview">${previewText}<small>${resultNote}</small></div>
        <div class="card-price"><b>${sold ? "已挂上壳" : `${price} ◈`}</b><span>${sold ? "✓" : full ? "无空槽" : !afford ? "还差废料" : "买下来 +"}</span></div>
      </button>`;
    })
    .join("");
  const reroll = rerollPrice(g.shopRerollIndex);
  overlay(
    `<section class="shop-panel expedition-shop"><div class="shop-heading"><div><div class="eyebrow">SHOP ${g.wave < 10 ? "0" : ""}${g.wave} / 20 · FULL TIDE MARKET</div><h2>这一波，添点<span>硬货。</span></h2><p>同名同阶自动合成，最高 IV；满槽仍可购买可合成武器。改装选择在别的停靠点，不占这里。</p></div><div class="shop-wallet"><span>废料</span><strong>${g.money}<small> ◈</small></strong><small>装备 ${g.guns.length} / ${g.slotCap}</small></div></div>
    <div class="shop-sticky"><span>废料 <b>${g.money}</b></span><span>装备 <b>${g.guns.length} / ${g.slotCap}</b></span><span>最高 <b>${gunTierLabel(maxTier)}</b></span><button id="next-compact" class="text-button">继续下海 ↓</button></div>
    <p class="weapon-dps-note">理论DPS为面板估算：单目标、散弹全中；餐叉持续接触；不含多目标收益。</p>
    <div class="weapon-cards">${offered}</div>
    <div class="shop-tools"><span>买枪或合成。拆解返还累计投入的 35%。</span><button id="reroll" class="text-button" ${g.money < reroll ? "disabled" : ""}>换一批 ↻ ${reroll ? `${reroll} ◈` : "本次免费"}</button></div>
    <div class="owned-heading"><h3>壳上的火力</h3><span>面板数值</span></div>
    <div class="owned-grid">${owned}</div>${g.guns.length < g.slotCap ? `<div class="empty-slots">还有 ${g.slotCap - g.guns.length} 个空槽可以买新武器；槽位是容量，不是免费枪。</div>` : ""}${g.guns.length === 6 ? `<div class="empty-slots">六个槽位已占。同名同阶仍可合成；无法腾出槽位时不能购入。</div>` : ""}
    <div class="wave-armor"><b>下一波 ${g.wave + 1} 装甲</b><span>${waveHpLabel(g.wave + 1)}</span><small>垃圾袋使用独立 HP 表；首领 HP 为独立表值。</small></div>
    <div class="shop-footer"><small>下一波回复 ${waveRecovery(g.mode, g.wave + 1)} 格生命 · 商店不计战斗时间</small><button id="next" class="primary">带着这批破烂下海 <b>→</b></button></div></section>`,
  );
  $("overlay")
    .querySelectorAll<HTMLButtonElement>("[data-buy]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (g.buy(Number(b.dataset.buy))) expeditionShop(g);
          else note("这笔购买无法结算。");
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
    if (g.reroll()) expeditionShop(g);
  };
  $("next-compact").onclick = () => {
    $("next").scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  $("next").onclick = () => {
    g.nextWave();
    input.clear();
    sync();
    updateHud();
  };
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
  $("hp-label").textContent = `${g.player.hp} / 10`;
  $("hp").innerHTML = Array.from(
    { length: 10 },
    (_, i) => `<i class="${i < g.player.hp ? "full" : ""}"></i>`,
  ).join("");
  $("hp").setAttribute("aria-label", `生命 ${g.player.hp} / 10`);
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
                ? "改装会先长成回路；商店只负责枪。"
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
    `<section class="pause-panel guide"><div class="eyebrow">JUST KEEP MOVING</div><h2>你负责走位。<br>破烂负责开火。</h2><p><b>电脑：</b>WASD / 方向键移动。<br><b>手机：</b>拖动左下摇杆。<br>无需瞄准或按攻击键，壳上的武器会同时工作。</p><p>${gameMode === "expedition20" ? "二十波潮线：打怪、退潮、整备。第一波后选改装，第二波后进枪店；第五波后会永久选择航迹或余烬。首领在 5 / 10 / 15 / 20 波。自动接波时按住移动键也不会丢。" : "第一波 20 秒 → 商店买武器、免费选两种改装 → 第二波 35 秒并击败首领。"}<br>捡废料、喷子弹、击杀爆炸，试着把它们接成一个回路。</p><p class="fine">P / Esc 暂停。切出窗口或旋转屏幕自动暂停。刷新会结束本局，只保存完成记录和声音设置。${gameMode === "slice" ? " 当前是切片模式；去掉 mode=slice 即进入 20 波远征。" : ""}</p><button id="gotit" class="primary">懂了，开整 <b>→</b></button></section>`,
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
    position: game ? { x: game.player.x, y: game.player.y } : null,
    guns: game?.guns.map((g) => g.id),
    gunTiers: game?.guns.map((g) => g.tier ?? 1) ?? [],
    gunProfiles:
      game?.guns.map((gun) => effectiveWeaponProfile(gun.id, gun.tier)) ?? [],
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
    sync();
    renderer.render(game, now / 1000);
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
