// Independent normal-input browser regression for scrap-surge.
// Read-only: it injects no game state and uses only real keys, taps and buttons.
// Usage:
//   TEST_URL=http://127.0.0.1:4188 node tests/browser-regression.mjs
//   CHROME_PATH=/path/to/chrome DIST_DIR=/abs/path/to/dist SEED=2a
// Exit code 1 if any check fails. Artifacts land in ./artifacts.
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE_URL =
  process.env.TEST_URL || process.env.BASE_URL || "http://127.0.0.1:4188";
const DIST_DIR = process.env.DIST_DIR || join(ROOT, "dist");
const SEED = process.env.SEED || "2a";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await mkdir(join(ROOT, "artifacts"), { recursive: true });
const shot = (p) => join(ROOT, "artifacts", p);

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + JSON.stringify(detail) : ""}`,
  );
};
const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const metrics = (p) => p.evaluate(() => window.scrapMetrics);

// ---------- A. ordinary-input run to a terminal state, then retry ----------
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    failed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => failed.push(r.url()));
  await page.goto(`${BASE_URL}/?seed=${SEED}`);
  await page.evaluate(() => localStorage.removeItem("scrap-surge.v1"));
  await page.reload();
  await page.waitForTimeout(500);
  await page.locator("#start").click();
  const t0 = Date.now();
  let s = null,
    shops = 0;
  while (Date.now() - t0 < 150000) {
    s = await metrics(page);
    if (s.phase === "lost" || s.phase === "won") break;
    if (s.phase === "shop") {
      shops++;
      for (const id of ["popcorn", "domino"]) {
        const m = page.locator(`[data-mod="${id}"]`);
        if (await m.isEnabled()) await m.click();
      }
      const next = page.locator("#next");
      if (await next.isEnabled()) await next.click();
    }
    if (s.phase === "paused") {
      const r = page.locator("#resume");
      if (await r.isVisible()) await r.click();
    }
    await page.waitForTimeout(200);
  }
  const rec = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("scrap-surge.v1") || "null"),
  );
  const retryVisible = await page
    .locator("#retry")
    .isVisible()
    .catch(() => false);
  await page.screenshot({
    path: shot("regression-death.png"),
    animations: "disabled",
  });
  check(
    "A1 ordinary input reaches a terminal state",
    ["lost", "won"].includes(s.phase),
    {
      phase: s.phase,
      wave: s.wave,
      waveTime: +s.waveTime.toFixed(2),
      hp: s.hp,
      kills: s.kills,
      wallSeconds: +((Date.now() - t0) / 1000).toFixed(1),
      shops,
    },
  );
  // A2 (idle death coverage) is intentionally gone. After S1e an ordinary run
  // can legitimately win, so the A-run only requires a terminal state (A1). The
  // forced defeat path moved to the G charge fixture below.
  check("A3 end panel offers retry", retryVisible);
  check(
    "A4 record written once",
    rec &&
      rec.runs === 1 &&
      rec.wins === (s.phase === "won" ? 1 : 0) &&
      rec.best >= s.kills,
    rec,
  );
  const before = s.kills;
  await page.locator("#retry").click();
  await page.waitForFunction(() => window.scrapMetrics.phase === "fight");
  const a = await metrics(page);
  check(
    "A5 retry resets the run immediately",
    a.phase === "fight" &&
      a.hp === 10 &&
      a.kills === 0 &&
      a.kills < before + 1 &&
      a.guns.length === 1 &&
      a.mods.length === 0,
    {
      phase: a.phase,
      hp: a.hp,
      kills: a.kills,
      guns: a.guns.length,
      mods: a.mods.length,
    },
  );
  const rec2 = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("scrap-surge.v1") || "null"),
  );
  check(
    "A6 record not double counted after retry",
    rec2 && rec2.runs === 1 && rec2.best === rec.best,
    rec2,
  );

  // ---------- B. refresh mid-fight: no resume, record preserved ----------
  const live = await metrics(page);
  await page.reload();
  await page.waitForTimeout(700);
  const after = await metrics(page);
  check(
    "B1 refresh does not resume the run",
    after.phase === "title" &&
      (await page.locator("#title").isVisible()) &&
      (await page.locator("#hud").isHidden()),
    { phaseBefore: live.phase, phaseAfter: after.phase },
  );
  const rec3 = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("scrap-surge.v1") || "null"),
  );
  check(
    "B2 record survives refresh",
    rec3 && rec3.runs === 1 && rec3.best === rec.best,
    rec3,
  );
  check(
    "B3 no page errors in A/B",
    errors.length === 0 && failed.length === 0,
    {
      errors,
      failed,
    },
  );
  await page.close();
}

// ---------- C. HUD bands stay outside the drawn arena ----------
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  await page.goto(`${BASE_URL}/?seed=${SEED}`);
  await page.locator("#start").click();
  await page.waitForTimeout(1200);
  const box = async (sel) => page.locator(sel).boundingBox();
  const arena = (await metrics(page)).arena;
  const edge = await box("#edge");
  const bottom = await box("#hud-bottom");
  const stick = await box("#joystick");
  const arenaBottom = arena.y + arena.h;
  const bottomTop = Math.min(
    bottom ? bottom.y : Infinity,
    stick ? stick.y : Infinity,
  );
  check(
    "C1 arena starts below the edge bar",
    arena.y >= (edge ? edge.y + edge.height : 0) - 1,
    {
      arenaTop: +arena.y.toFixed(1),
      edgeBottom: edge ? +(edge.y + edge.height).toFixed(1) : null,
    },
  );
  check(
    "C2 arena ends above the bottom HUD band",
    arenaBottom <= bottomTop + 1,
    { arenaBottom: +arenaBottom.toFixed(1), hudTop: +bottomTop.toFixed(1) },
  );
  await page.close();
}

// ---------- D. focus loss pauses; sim freezes; resume keeps the position ----------
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  await page.goto(`${BASE_URL}/?seed=${SEED}`);
  await page.locator("#start").click();
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(400);
  const other = await browser.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await page.waitForTimeout(500);
  const realBlur = (await metrics(page)).phase === "paused";
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(300);
  const p1 = await metrics(page);
  await page.waitForTimeout(900);
  const p2 = await metrics(page);
  check(
    "D1 blur pauses and freezes simulation",
    p1.phase === "paused" && p1.time === p2.time,
    {
      phase: p1.phase,
      simFrozen: p1.time === p2.time,
      realBlurDeliveredHeadless: realBlur,
      note: "headless cannot confirm a real window blur; the synthetic event only proves the handler",
    },
  );
  await other.close();
  const resume = page.locator("#resume");
  if (await resume.isVisible()) await resume.click();
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(300);
  const r1 = await metrics(page);
  await page.waitForTimeout(600);
  const r2 = await metrics(page);
  const moved = Math.hypot(
    r2.position.x - r1.position.x,
    r2.position.y - r1.position.y,
  );
  check(
    "D2 resume continues and the released key leaves no ghost movement",
    r2.phase === "fight" && r2.time > r1.time && moved < 1,
    {
      phase: r2.phase,
      timeAdvanced: r2.time > r1.time,
      driftPx: +moved.toFixed(3),
      from: { x: +r1.position.x.toFixed(1), y: +r1.position.y.toFixed(1) },
      to: { x: +r2.position.x.toFixed(1), y: +r2.position.y.toFixed(1) },
    },
  );
  await page.close();
}

// ---------- E. production build hosted from a subdirectory ----------
{
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
  };
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!p.startsWith("/sub/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    let rel = p.slice(5) || "index.html";
    if (rel.endsWith("/")) rel += "index.html";
    try {
      const buf = await readFile(
        join(DIST_DIR, normalize(rel).replace(/^(\.\.[/\\])+/, "")),
      );
      res.writeHead(200, {
        "content-type": types[extname(rel)] || "application/octet-stream",
      });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [],
    failed = [],
    bad = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(`http://127.0.0.1:${port}/sub/`);
  await page.waitForTimeout(600);
  await page.locator("#start").click();
  await page.waitForTimeout(2500);
  const m = await metrics(page);
  await page.screenshot({
    path: shot("regression-subdir.png"),
    animations: "disabled",
  });
  check(
    "E1 relative-path build runs under a subdirectory",
    m.phase === "fight" &&
      m.kills > 0 &&
      errors.length === 0 &&
      failed.length === 0 &&
      bad.length === 0,
    {
      distDir: DIST_DIR,
      phase: m.phase,
      kills: m.kills,
      firstKill: m.firstKill,
      errors,
      failed,
      bad,
    },
  );
  await page.close();
  await new Promise((r) => server.close(r));
}

// ---------- F. narrow phone: no overflow, HUD visible, arena usable ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/?seed=${SEED}`);
  await page.locator("#start").tap();
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: shot("regression-phone.png"),
    animations: "disabled",
  });
  const info = await page.evaluate(() => {
    const host = document.querySelector("#arena").getBoundingClientRect();
    const box = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width };
    };
    return {
      host: {
        l: host.left,
        r: host.right,
        t: host.top,
        b: host.bottom,
        w: host.width,
        h: host.height,
      },
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      edge: box("#edge"),
      band: box("#hud-bottom"),
      health: box(".health"),
      loadout: box("#loadout"),
      wallet: box(".wallet"),
      stick: box("#joystick"),
      arena: window.scrapMetrics.arena,
    };
  });
  const parts = [
    info.health,
    info.loadout,
    info.wallet,
    info.band,
    info.edge,
  ].filter(Boolean);
  const over = parts
    .map((p) => ({ l: +p.l.toFixed(1), r: +p.r.toFixed(1) }))
    .filter((p) => p.l < info.host.l - 1 || p.r > info.host.r + 1);
  check("F1 no HUD element overflows the viewport width", over.length === 0, {
    host: { l: info.host.l, r: info.host.r, w: info.host.w },
    overflowing: over,
    scrollWidth: info.scrollWidth,
    clientWidth: info.clientWidth,
  });
  check(
    "F2 no horizontal document scroll",
    info.scrollWidth <= info.clientWidth + 1,
    { scrollWidth: info.scrollWidth, clientWidth: info.clientWidth },
  );
  check(
    "F3 edge bar and bottom band are fully visible",
    !!info.edge &&
      !!info.band &&
      info.edge.l >= info.host.l - 1 &&
      info.edge.r <= info.host.r + 1 &&
      info.edge.t >= info.host.t - 1 &&
      info.band.b <= info.host.b + 1 &&
      info.band.t >= info.host.t - 1,
    { edge: info.edge, band: info.band, host: info.host },
  );
  const arenaBottom = info.arena.y + info.arena.h;
  const hudTop = Math.min(
    info.band ? info.band.t : Infinity,
    info.stick ? info.stick.t : Infinity,
  );
  check(
    "F4 phone arena is usable and clear of the HUD",
    info.arena.w >= 240 &&
      info.arena.h >= 160 &&
      info.arena.y >= info.edge.b - 1 &&
      arenaBottom <= hudTop + 1,
    {
      arena: {
        x: +info.arena.x.toFixed(1),
        y: +info.arena.y.toFixed(1),
        w: +info.arena.w.toFixed(1),
        h: +info.arena.h.toFixed(1),
      },
      arenaBottom: +arenaBottom.toFixed(1),
      hudTop: +hudTop.toFixed(1),
      edgeBottom: +info.edge.b.toFixed(1),
    },
  );
  check("F5 no page errors on phone", errors.length === 0, { errors });
  await ctx.close();
}

// ---------- G. forced defeat: ordinary keyboard charge into the nearest enemy ----------
{
  // T2 final gate (agreed by Astra, Opus and DeepSeek): fixed seeds 2a/17/91 and
  // a fixed strategy - 70ms poll, +-6px deadzone, charge the nearest enemy read
  // from the read-only enemyPositions (which includes the visible warning
  // outlines). Each seed runs exactly once; nothing here is retried to force a
  // result.
  //
  // T2 differs from the old G fixture in one way: the first shop is no longer a
  // terminal stop. At the shop the run buys no weapon, takes exactly magnet +
  // popcorn, then keeps charging through wave 2 to a real outcome. The hard wall
  // limit is a single 100s (normal play tops out at 20 + 1 + 50 + 1 = 72s), with
  // no per-phase timer. endReason is one of:
  //   death    - lost at 0 hp (the only outcome that counts as death coverage)
  //   deadline - lost with hp > 0 because the wave-2 boss was not killed in time;
  //              recorded as "not covered", never as a death
  //   won      - normal victory
  //   timeout  - still fighting at 100s; a real failure, never retried
  // This fixture stays probabilistic and timing-sensitive; a green run is
  // evidence for these three fixed seeds only, not a stability claim.
  let deaths = 0;
  const group = [];
  for (const seed of ["2a", "17", "91"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE_URL}/?seed=${seed}`);
    await page.locator("#start").click();
    let held = new Set();
    const release = async () => {
      for (const k of held) await page.keyboard.up(k);
      held = new Set();
    };
    const t0 = Date.now();
    let s = await metrics(page);
    let shopReached = false;
    let shopDetail = null;
    let gunsAtWave2 = null;
    while (Date.now() - t0 < 100000) {
      s = await metrics(page);
      if (s.phase === "lost" || s.phase === "won") break;
      if (s.wave === 2 && gunsAtWave2 === null) gunsAtWave2 = s.guns.length;
      if (s.phase === "paused") {
        await release();
        const r = page.locator("#resume");
        if (await r.isVisible()) await r.click();
        continue;
      }
      if (s.phase === "shop") {
        await release();
        shopReached = true;
        const gunsAtShop = s.guns.length;
        const moneyAtShop = s.money;
        // No weapon is bought here on purpose: the death path must not be
        // masked by a stronger build. Take exactly magnet + popcorn.
        for (const id of ["magnet", "popcorn"]) {
          const m = page.locator(`[data-mod="${id}"]`);
          if (await m.isEnabled()) await m.click();
        }
        const after = await metrics(page);
        shopDetail = {
          gunsAtShop,
          moneyAtShop,
          mods: after.mods.slice(),
          modsOk:
            after.mods.length === 2 &&
            after.mods.includes("magnet") &&
            after.mods.includes("popcorn"),
        };
        const next = page.locator("#next");
        if (await next.isEnabled()) await next.click();
        // The shop is not terminal: wait for the wave-2 fight to actually start.
        // Playwright's signature is (pageFunction, arg, options), so the options
        // must be the third argument. This is a necessary step, not an optional
        // extra timeout, so a failure here fails the run instead of being swallowed.
        await page.waitForFunction(
          () => window.scrapMetrics.phase !== "shop",
          undefined,
          { timeout: 5000 },
        );
        continue;
      }
      let nx = 0,
        ny = 0,
        bd = Infinity;
      for (const e of s.enemyPositions || []) {
        const d = Math.hypot(e.x - s.position.x, e.y - s.position.y);
        if (d < bd) {
          bd = d;
          nx = e.x - s.position.x;
          ny = e.y - s.position.y;
        }
      }
      const next = new Set();
      if (nx > 6) next.add("KeyD");
      if (nx < -6) next.add("KeyA");
      if (ny > 6) next.add("KeyS");
      if (ny < -6) next.add("KeyW");
      for (const k of held) if (!next.has(k)) await page.keyboard.up(k);
      for (const k of next) if (!held.has(k)) await page.keyboard.down(k);
      held = next;
      await page.waitForTimeout(70);
    }
    await release();
    const timedOut = s.phase !== "lost" && s.phase !== "won";
    const endReason = timedOut
      ? "timeout"
      : s.phase === "won"
        ? "won"
        : s.hp === 0
          ? "death"
          : "deadline";
    const retryVisible = await page
      .locator("#retry")
      .isVisible()
      .catch(() => false);
    const detail = {
      seed,
      phase: s.phase,
      hp: s.hp,
      wave: s.wave,
      kills: s.kills,
      endReason,
      shopReached,
      ...(shopDetail || {}),
      gunsAtWave2,
      retryVisible,
      wallSeconds: +((Date.now() - t0) / 1000).toFixed(1),
      errors,
    };
    // T2 does not require every seed to reach the shop: a genuine wave-1 death is
    // a valid outcome and must not be failed by shop-only assertions. The shop
    // contract (exactly magnet + popcorn, no gun bought, still one gun in wave 2)
    // applies only once a shop was actually reached.
    const shopOk =
      !shopReached ||
      (!!shopDetail?.modsOk &&
        shopDetail.gunsAtShop === 1 &&
        gunsAtWave2 === 1);
    let ok = errors.length === 0 && !timedOut && shopOk;
    if (endReason === "death") {
      deaths++;
      let retryReset = false;
      if (s.hp === 0 && retryVisible) {
        await page.locator("#retry").click();
        await page.waitForFunction(() => window.scrapMetrics.phase === "fight");
        const a = await metrics(page);
        retryReset =
          a.phase === "fight" &&
          a.hp === 10 &&
          a.kills === 0 &&
          a.guns.length === 1 &&
          a.mods.length === 0;
        detail.afterRetry = {
          phase: a.phase,
          hp: a.hp,
          kills: a.kills,
          guns: a.guns.length,
          mods: a.mods.length,
        };
      }
      detail.retryReset = retryReset;
      ok = ok && s.hp === 0 && retryVisible && retryReset;
      if (!shopReached)
        detail.note =
          "died in wave 1; shop path not covered (death itself is real)";
    } else if (endReason === "deadline") {
      // A live boss at the 50s deadline is a real loss, but not the 0-hp death
      // path this fixture is here to cover.
      detail.note =
        "boss deadline at hp > 0; death path not covered (not a death)";
    } else if (endReason === "won") {
      detail.note = "normal victory; death path not covered (not a death)";
    }
    group.push(detail);
    check(`G charge seed ${seed}`, ok, detail);
    await page.close();
  }
  check("G group covers the death path (>= 1 real lost at 0 hp)", deaths >= 1, {
    deaths,
    runs: group.map((g) => ({ seed: g.seed, phase: g.phase, hp: g.hp })),
  });
}

// ---------- H. the metrics API exposes a read-only XY copy ----------
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/?seed=2a`);
  await page.locator("#start").click();
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    ready = await page.evaluate(
      () => (window.scrapMetrics.enemyPositions || []).length > 0,
    );
    if (!ready) await page.waitForTimeout(100);
  }
  // Read a snapshot, mutate the copies we were handed, then read again. The
  // fresh read must be untouched: that is what proves no live enemy reference
  // escapes the getter. This is a read-only API isolation test, not a player path.
  const iso = await page.evaluate(() => {
    const a = window.scrapMetrics.enemyPositions;
    const ref = a[0];
    const before = a.map((p) => [p.x, p.y]);
    for (const p of a) {
      p.x = 1e9;
      p.y = -1e9;
    }
    a.push({ x: 1e9, y: -1e9 });
    const b = window.scrapMetrics.enemyPositions;
    const after = b.map((p) => [p.x, p.y]);
    return {
      count: before.length,
      freshArray: b !== a,
      freshObjects: b[0] !== ref,
      unchanged:
        after.length === before.length &&
        after.every((v, i) => v[0] === before[i][0] && v[1] === before[i][1]),
      inBounds: after.every(
        ([x, y]) => x >= 0 && x <= 1200 && y >= 0 && y <= 800,
      ),
    };
  });
  check(
    "H enemyPositions is a fresh read-only XY copy that cannot mutate game state",
    ready &&
      iso.count > 0 &&
      iso.freshArray &&
      iso.freshObjects &&
      iso.unchanged &&
      iso.inBounds &&
      errors.length === 0,
    { ready, ...iso, errors },
  );
  await page.close();
}

await browser.close();
const failedChecks = results.filter((r) => !r.ok);
await writeFile(
  shot("browser-regression-results.json"),
  JSON.stringify(
    {
      checks: results,
      passed: results.length - failedChecks.length,
      total: results.length,
    },
    null,
    2,
  ),
);
console.log(
  `\n${results.length - failedChecks.length}/${results.length} checks passed`,
);
process.exitCode = failedChecks.length ? 1 : 0;
