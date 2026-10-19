import "./style.css";
import { Game } from "./sim";
import { Renderer } from "./render";
import { Input } from "./input";
import { Sound } from "./audio";
import { DT, WEAPONS, MODS, type WeaponId, type ModId } from "./data";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<canvas id="arena" aria-label="废潮自动战斗场地；WASD 或方向键移动，武器自动攻击"></canvas><header><a class="brand" href="#" id="brand">SCRAP<span>SURGE</span><b>废潮</b></a><div class="header-tools"><span class="version">FEEL TEST / 01</span><button id="sound" class="small-button" aria-label="关闭声音">声音 ON</button><button id="pause" class="small-button" hidden aria-label="暂停">Ⅱ</button></div></header>
<section id="title" class="title"><div class="title-copy"><div class="kicker"><span></span> 一只小蟹。六把破烂。一整片怪潮。</div><h1>废<span>潮</span><i>!</i></h1><h2>捡的是垃圾。<br>打出来的是<span>火力。</span></h2><p>只管走位，让壳上的家伙自动开火。<br>捡废料、挂武器，把一场混战滚成连锁反应。</p><div class="start-row"><button class="primary" id="start">下海，开火 <b>↗</b></button><button id="how" class="outline">怎么玩？</button></div><small>两波战斗 + 一次改装商店 · 约 1 分钟战斗体验</small></div><div class="sticker">不用瞄准<br><strong>自动开火！</strong><span>JUST KEEP MOVING</span></div><div class="title-bottom"><div><b>01</b><p>走位活下来<small>WASD / 方向键 · 触屏摇杆</small></p></div><div><b>02</b><p>往壳上挂火力<small>六个槽位，同时开火</small></p></div><div><b>03</b><p>让连锁自己滚起来<small>击杀 → 掉落 → 火力 → 更多击杀</small></p></div></div><div class="bottom-tape">TRASH INTO TREASURE · TREASURE INTO TROUBLE · TRASH INTO TREASURE · TREASURE INTO TROUBLE</div></section>
<section id="hud" hidden><div class="hud-row"><div class="health"><strong id="hp-label">10 / 10</strong><div id="hp"></div><small>壳还很硬</small></div><div class="wave"><span id="wave-label">第一波</span><strong id="timer">20</strong><small id="wave-note">自动开火，别被围住</small></div><div class="wallet"><span>废料</span><strong id="money">0</strong><small id="kill-count">0 击败</small></div></div><div id="boss" hidden><span>罐头大王 / DON'T GET CANNED</span><div><i></i></div></div><div class="kill-banner" id="kill-banner"></div><div id="loadout" class="loadout"></div><div id="mod-strip"></div><p id="hint" class="hint">只需要移动，武器会自动找目标。</p><div id="joystick" role="group" aria-label="触屏移动摇杆"><i></i><span>移动</span></div></section><div id="overlay" hidden></div><div id="toast" role="status"></div>`;
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
let record = { runs: 0, wins: 0, best: 0, muted: false };
try {
  const r = JSON.parse(localStorage.getItem("scrap-surge.v1") || "null");
  if (r && typeof r === "object")
    record = {
      runs: Number.isFinite(r.runs) ? Math.max(0, r.runs) : 0,
      wins: Number.isFinite(r.wins) ? Math.max(0, r.wins) : 0,
      best: Number.isFinite(r.best) ? Math.max(0, r.best) : 0,
      muted: r.muted === true,
    };
} catch {}
sound.muted = record.muted;
const input = new Input(
  $("joystick"),
  () => game?.phase === "fight",
  () => sound.init(),
  () => pause(),
);
function persist() {
  try {
    localStorage.setItem("scrap-surge.v1", JSON.stringify(record));
  } catch {}
}
function note(text: string) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}
function overlay(html: string) {
  $("overlay").innerHTML = html;
  $("overlay").hidden = false;
  $("overlay")
    .querySelector<HTMLButtonElement>("button")
    ?.focus({ preventScroll: true });
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
function start(seed?: number) {
  sound.init();
  input.clear();
  game = new Game(seed ?? crypto.getRandomValues(new Uint32Array(1))[0]);
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
  (document.activeElement as HTMLElement)?.blur();
}
function home() {
  input.clear();
  game = null;
  title = true;
  phase = "";
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
      )}</div><div class="shop-tools"><span>当前壳上：${g.guns.map((v) => WEAPONS[v.id].name).join(" / ")}</span><button id="reroll" class="text-button">换一批 ↻ ${g.freeRerolls ? "首次免费" : "6 ◈"}</button></div><div class="mod-heading"><h3>让它们互相喂养</h3><span>免费选 2 种改装 · 已选 ${g.mods.length} / 2</span></div><div class="mod-cards">${(Object.entries(MODS) as [ModId, (typeof MODS)[ModId]][]).map(([id, m]) => `<button class="mod-card ${g.has(id) ? "selected" : ""}" data-mod="${id}" ${g.has(id) || g.mods.length === 2 ? "disabled" : ""}><b>${m.icon}</b><div><strong>${m.name} ${g.has(id) ? "✓" : ""}</strong><p>${m.desc}</p></div></button>`).join("")}</div>${g.has("popcorn") && g.has("domino") ? '<div class="combo-note">连锁已接通：捡废料 → 喷子弹 → 击杀爆炸 → 更多废料。下一波，看看能滚多大。</div>' : g.mods.length === 2 ? '<div class="combo-note">连锁已接通。下一波，让掉落物也替你开火。</div>' : '<div class="combo-note muted">不是三选一。任选两种，把反馈回路接起来。</div>'}<div class="shop-footer"><small>下一波回复 3 格生命 · 商店不会流逝战斗时间</small><button id="next" class="primary" ${g.mods.length < 2 ? "disabled" : ""}>${g.mods.length < 2 ? "再选 " + (2 - g.mods.length) + " 种改装" : "让它们见识一下"} <b>→</b></button></div></section>`,
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
  overlay(
    `<section class="end-panel"><div class="eyebrow">${win ? "BEACH: CLEAN. SHELL: LOADED." : "ONE CRAB DOWN. ANOTHER TIDE COMING."}</div><div class="end-burst">${win ? "✷" : "×"}</div><h2>${win ? "这片海滩，你说了算。" : "壳碎了，火力没白攒。"}</h2><p>${win ? "这次先打两波。下一步要不要扩成完整肉鸽，先听你的手感。" : g.player.hp <= 0 ? "被贴身敌人或红色弹丸击穿了。保持移动，把废料捡回来，让连锁替你清场。" : "罐头大王没能及时击败。多挂武器，让改装之间互相产生火力。"}</p><div class="end-stats"><div><b>${g.kills}</b><small>击败</small></div><div><b>${g.earned}</b><small>废料入账</small></div><div><b>${g.shots}</b><small>弹药倾泻</small></div><div><b>${Math.floor(g.time)}s</b><small>战斗时间</small></div></div><div class="end-build">${g.guns.map((w) => `<span>${WEAPONS[w.id].name}</span>`).join("")}${g.mods.map((id) => `<span class="mod">${MODS[id].name}</span>`).join("")}</div><div class="end-actions"><button id="retry" class="primary">再卷一次 <b>↻</b></button><button id="home" class="outline">回到海滩</button></div><small class="fine">两波手感切片 · 不含局外成长 · SEED ${g.seed.toString(16).toUpperCase()}</small></section>`,
  );
  $("retry").onclick = () => start(g.seed);
  $("home").onclick = home;
}
function sync() {
  if (!game || game.phase === phase) return;
  phase = game.phase;
  input.clear();
  if (phase === "shop") shop();
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
  $("wave-label").textContent = `${g.wave === 1 ? "第一波" : "第二波"} / 02`;
  $("timer").textContent = String(
    Math.max(0, Math.ceil(g.duration - g.waveTime)),
  ).padStart(2, "0");
  $("wave-note").textContent =
    g.wave === 1
      ? "只管走位，自动开火"
      : g.bossSpawned && !g.bossKilled
        ? "罐头大王来了！"
        : "连锁已上线，冲进废料堆";
  $("money").textContent = String(g.money);
  $("kill-count").textContent = `${g.kills} 击败`;
  $("loadout").innerHTML = Array.from({ length: 6 }, (_, i) => {
    const gun = g.guns[i];
    return gun
      ? `<div title="${WEAPONS[gun.id].desc}">${icon(gun.id)}<small>${WEAPONS[gun.id].name}</small></div>`
      : '<div class="empty">+<small>空槽</small></div>';
  }).join("");
  $("mod-strip").innerHTML = g.mods
    .map((id) => `<span>${MODS[id].icon} ${MODS[id].name}</span>`)
    .join("");
  $("hint").textContent =
    g.wave === 1
      ? g.waveTime < 7
        ? "只需要移动。每把武器都会自己找目标。"
        : g.waveTime < 15
          ? "靠近金色废料，它们会飞进你的壳。"
          : "即将退潮！剩下的废料会全部收回来。"
      : g.waveTime < 8
        ? "新武器都挂上了。冲进废料堆，让反馈回路启动！"
        : "";
  $("hint").hidden = !$("hint").textContent;
  const boss = g.enemies.find((e) => e.kind === "boss");
  $("boss").hidden = !boss;
  if (boss)
    $("boss").querySelector("i")!.style.width =
      `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  $("kill-banner").textContent =
    g.pendingBlasts.length > 2
      ? "连锁起飞！"
      : g.wave === 2 && g.bullets.filter((b) => b.kind === "bonus").length > 15
        ? "废料正在替你开火！"
        : "";
}
$("start").onclick = () => {
  const s = new URLSearchParams(location.search).get("seed");
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
    `<section class="pause-panel guide"><div class="eyebrow">JUST KEEP MOVING</div><h2>你负责走位。<br>破烂负责开火。</h2><p><b>电脑：</b>WASD / 方向键移动。<br><b>手机：</b>拖动左下摇杆。<br>无需瞄准或按攻击键，六把武器可以同时工作。</p><p>第一波 20 秒 → 商店买武器、免费选两种改装 → 第二波 35 秒并击败首领。<br>捡废料、喷子弹、击杀爆炸，试着把它们接成一个回路。</p><p class="fine">P / Esc 暂停。切出窗口或旋转屏幕自动暂停。刷新会结束本局，只保存完成记录和声音设置。</p><button id="gotit" class="primary">懂了，开整 <b>→</b></button></section>`,
  );
  $("gotit").onclick = close;
};
window.addEventListener("blur", () => {
  if (game && (game.phase === "fight" || game.phase === "sweep")) pause();
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    game &&
    (game.phase === "fight" || game.phase === "sweep")
  )
    pause();
  last = 0;
  acc = 0;
});
window.addEventListener("resize", () => {
  renderer.resize();
  if (game && (game.phase === "fight" || game.phase === "sweep")) pause();
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
    phase: game?.phase ?? "title",
    seed: game?.seed,
    wave: game?.wave,
    time: game?.time,
    waveTime: game?.waveTime,
    kills: game?.kills,
    money: game?.money,
    shots: game?.shots,
    hits: game?.hits,
    firstKill: game?.firstKill,
    firstPickup: game?.firstPickup,
    hp: game?.player.hp,
    position: game ? { x: game.player.x, y: game.player.y } : null,
    guns: game?.guns.map((g) => g.id),
    mods: game?.mods.slice(),
    enemies: game?.enemies.length,
    bullets: game?.bullets.length,
    scraps: game?.scraps.length,
    pending: game?.pendingBlasts.length,
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
