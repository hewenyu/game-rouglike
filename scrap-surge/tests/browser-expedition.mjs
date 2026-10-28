// Ordinary-input expedition walkthrough. No state injection, no invulnerability.
// It drives the real panels and reaches an actual terminal state.
//
// Every invocation gets its own immutable attempt directory. A failed, early or
// timed-out attempt is evidence too, so it must not be overwritten by a later
// attempt with the same seed. The latest aggregate is a separate pointer/report.
import { chromium } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE = process.env.BASE_URL || "http://127.0.0.1:4188";
const SEED = process.env.SEED || "2a";
const STRATEGY = process.env.STRATEGY || "orbit";
const ATTEMPT_ID =
  process.env.ATTEMPT_ID ||
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${SEED}-${randomUUID().slice(0, 8)}`;
const ATTEMPT_DIR = join(ROOT, "artifacts", "expedition-attempts", ATTEMPT_ID);
const RESULT_PATH = join(ROOT, "artifacts", "expedition-results.json");
const AGGREGATE_PATH = join(
  ROOT,
  "artifacts",
  "expedition-attempts",
  "aggregate.json",
);
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await mkdir(ATTEMPT_DIR, { recursive: true });

let revision = null;
let dirty = null;
let changedPaths = [];
let sourceFingerprint = null;
let testFingerprint = null;
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  dirty =
    execFileSync("git", ["status", "--porcelain"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim().length > 0;
  changedPaths = execFileSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));
  const fingerprint = async (paths) => {
    const hash = createHash("sha256");
    for (const path of paths.sort()) {
      hash.update(path);
      hash.update("\0");
      hash.update(await readFile(join(ROOT, path)));
      hash.update("\0");
    }
    return hash.digest("hex");
  };
  sourceFingerprint = await fingerprint([
    "src/audio.ts",
    "src/data.ts",
    "src/expedition.ts",
    "src/input.ts",
    "src/main.ts",
    "src/math.ts",
    "src/render.ts",
    "src/sim.ts",
    "src/style.css",
  ]);
  testFingerprint = await fingerprint([
    "tests/browser-expedition.mjs",
    "tests/browser-first-shop.mjs",
    "tests/browser-regression.mjs",
    "tests/browser.mjs",
    "tests/expedition.test.ts",
    "tests/rules.test.ts",
  ]);
} catch {}

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const report = {
  attemptId: ATTEMPT_ID,
  seed: SEED,
  mode: "expedition20",
  strategy: STRATEGY,
  revision,
  dirty,
  changedPaths,
  sourceFingerprint,
  testFingerprint,
  startedAt: new Date().toISOString(),
  status: "running",
  endReason: null,
  failure: null,
  checkpoints: [],
  environment: {
    browser: await browser.version(),
    viewport: "1440x960",
    deviceScaleFactor: 1,
    headless: true,
    platform: process.platform,
  },
  stops: [],
  shops: [],
  errors: [],
};
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const metrics = () => page.evaluate(() => window.scrapMetrics);
report.errors = errors;
let held = new Set();
let runStartedAt = Date.now();
const trace = [];
let lastTraceAt = 0;

async function recordTrace(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...data };
  trace.push(entry);
  await appendFile(
    join(ATTEMPT_DIR, "trace.jsonl"),
    `${JSON.stringify(entry)}\n`,
  );
}

async function checkpoint(s, tag) {
  const p = {
    at: new Date().toISOString(),
    tag,
    phase: s.phase,
    wave: s.wave,
    stop: s.stop,
    waveTime: s.waveTime,
    hp: s.hp,
    kills: s.kills,
    money: s.money,
    position: s.position,
    guns: s.guns,
    gunTiers: s.gunTiers,
    slotCap: s.slotCap,
    gunProfiles: s.gunProfiles,
    mods: s.mods,
    modTiers: s.modTiers,
    branch: s.branch,
    offers: s.offers,
    quickOptions: s.quickOptions,
    bossKilled: s.bossKilled,
    shots: s.shots,
    hits: s.hits,
    shootAcceptedPlayer: s.shootAcceptedPlayer,
    shootAcceptedEnemy: s.shootAcceptedEnemy,
    shootRejectedPlayer: s.shootRejectedPlayer,
    shootRejectedEnemy: s.shootRejectedEnemy,
    bulletPeak: s.bulletPeak,
    popcornBudgetSkippedPickups: s.popcornBudgetSkippedPickups,
    enemies: s.enemies,
    scraps: s.scraps,
    chainPeak: s.chainPeak,
    pendingPeak: s.pendingPeak,
    spawnCount: s.spawnCount,
    medianMs: s.medianMs,
    p95Ms: s.p95Ms,
  };
  report.checkpoints.push(p);
  await recordTrace("checkpoint", {
    tag,
    phase: s.phase,
    wave: s.wave,
    hp: s.hp,
    kills: s.kills,
    money: s.money,
    branch: s.branch,
  });
  await writeFile(
    join(ATTEMPT_DIR, "checkpoints.json"),
    JSON.stringify(report.checkpoints, null, 2),
  );
}

async function release() {
  for (const key of held) await page.keyboard.up(key);
  held = new Set();
}
async function hold(next) {
  for (const key of held)
    if (!next.has(key)) {
      await page.keyboard.up(key);
      held.delete(key);
    }
  for (const key of next)
    if (!held.has(key)) {
      await page.keyboard.down(key);
      held.add(key);
    }
}
async function steer(s) {
  const enemies = (s.enemyPositions || []).filter(
    (e) => Math.hypot(e.x - s.position.x, e.y - s.position.y) < 390,
  );
  let nearest = null,
    best = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - s.position.x, e.y - s.position.y);
    if (d < best) {
      best = d;
      nearest = e;
    }
  }
  const next = new Set();
  if (nearest) {
    // Keep away from nearby contact enemies while looping through the arena.
    // This is still one ordinary keyboard input, with no position or HP writes.
    const dx = nearest.x - s.position.x,
      dy = nearest.y - s.position.y,
      d = Math.hypot(dx, dy) || 1,
      radial =
        STRATEGY === "charge"
          ? Math.max(-1, Math.min(1, (180 - best) / 90))
          : best < 235
            ? -1
            : Math.max(0, Math.min(1, (330 - best) / 95));
    const strafe = STRATEGY === "charge" ? 0.7 : 0.95;
    const vx = (dx / d) * radial - (dy / d) * strafe,
      vy = (dy / d) * radial + (dx / d) * strafe;
    if (vx > 0.15) next.add("KeyD");
    if (vx < -0.15) next.add("KeyA");
    if (vy > 0.15) next.add("KeyS");
    if (vy < -0.15) next.add("KeyW");
  } else {
    const t = (Date.now() - runStartedAt) / 1000;
    const tx = 600 + Math.cos(t * 0.75) * 360,
      ty = 400 + Math.sin(t * 0.75) * 250;
    const dx = tx - s.position.x,
      dy = ty - s.position.y;
    if (dx > 18) next.add("KeyD");
    if (dx < -18) next.add("KeyA");
    if (dy > 18) next.add("KeyS");
    if (dy < -18) next.add("KeyW");
  }
  await hold(next);
}
async function clickFirst(selector) {
  const nodes = page.locator(selector);
  for (let i = 0; i < (await nodes.count()); i++) {
    const node = nodes.nth(i);
    if ((await node.isVisible()) && (await node.isEnabled())) {
      await node.click();
      return true;
    }
  }
  return false;
}
async function panel(s) {
  await release();
  if (s.phase === "paused") {
    await clickFirst("#resume");
    return;
  }
  if (s.phase === "quick") {
    const before = await metrics();
    const option = s.quickOptions[0];
    if (!option) {
      throw new Error(`quick panel at wave ${s.wave} has no legal choice`);
    }
    await page.locator(`[data-quick="${option}"]`).click();
    const picked = await metrics();
    await checkpoint(picked, `quick-${s.wave}-picked`);
    const continued = await page.locator("#next").isEnabled();
    report.stops.push({
      kind: "quick",
      stop: s.stop,
      wave: s.wave,
      options: s.quickOptions,
      picked: option,
      modsBefore: before.mods,
      modsAfter: picked.mods,
      modTiersAfter: picked.modTiers,
      branchBefore: before.branch,
      branchAfter: picked.branch,
      quickPicked: continued,
    });
    if (!continued)
      throw new Error(`quick choice at wave ${s.wave} did not enable continue`);
    await page.locator("#next").click();
    await checkpoint(await metrics(), `quick-${s.wave}`);
    return;
  }
  if (s.phase === "shop") {
    const before = await metrics();
    const offersAtOpen = s.offers;
    const firstFree = page.locator("#reroll");
    const rerollOpened = await firstFree.isEnabled().catch(() => false);
    await page.screenshot({
      path: join(
        ATTEMPT_DIR,
        `shop-${String(s.wave).padStart(2, "0")}-open.png`,
      ),
      animations: "disabled",
    });
    // Slot capacity is capacity, not free guns. Buy cards while affordable;
    // same-weapon cards can merge even when all six slots are occupied.
    for (let round = 0; round < 3; round++) {
      const now = await metrics();
      let bought = false;
      for (let i = 0; i < now.offers.length; i++) {
        const button = page.locator(`[data-buy="${i}"]`);
        if (await button.isEnabled().catch(() => false)) {
          await button.click();
          bought = true;
        }
      }
      if (!bought) break;
    }
    const after = await metrics();
    await checkpoint(after, `shop-${s.wave}-acting`);
    report.shops.push({
      wave: s.wave,
      offersAtOpen,
      rerollOpened,
      slotCap: after.slotCap,
      money: before.money,
      moneyAfter: after.money,
      spent: before.money - after.money,
      guns: after.guns.map((id, i) => `${id}:${after.gunTiers[i]}`),
      gunProfiles: after.gunProfiles,
    });
    if (!(await page.locator("#next").isEnabled()))
      throw new Error(`shop at wave ${s.wave} cannot continue`);
    await page.locator("#next").click();
    await checkpoint(await metrics(), `shop-${s.wave}`);
    return;
  }
}

try {
  await page.goto(`${BASE}/?mode=expedition20&seed=${SEED}`);
  await page.evaluate(() => {
    localStorage.removeItem("scrap-surge.expedition20.v1");
    localStorage.removeItem("scrap-surge.v1");
  });
  await page.reload();
  await page.locator("#start").click();
  await page.waitForTimeout(500);
  await checkpoint(await metrics(), "start");
  runStartedAt = Date.now();
  const t0 = Date.now();
  let s = await metrics();
  let lastPhase = "";
  while (Date.now() - t0 < 950000) {
    s = await metrics();
    if (s.phase === "fight" && Date.now() - lastTraceAt >= 5000) {
      lastTraceAt = Date.now();
      await recordTrace("fight", {
        wave: s.wave,
        waveTime: s.waveTime,
        hp: s.hp,
        kills: s.kills,
        money: s.money,
        enemies: s.enemies,
        bullets: s.bullets,
        branch: s.branch,
      });
    }
    if (s.phase === "lost" || s.phase === "won") break;
    if (s.phase !== "fight" && s.phase !== lastPhase) {
      await panel(s);
      lastPhase = s.phase;
      console.error(
        `[expedition] wave ${s.wave} ${s.phase} hp=${s.hp} kills=${s.kills} money=${s.money}`,
      );
      continue;
    }
    lastPhase = s.phase;
    await steer(s);
    await page.waitForTimeout(80);
  }
  await release();
  report.result = await metrics();
  await checkpoint(report.result, "end");
  report.status = ["won", "lost"].includes(report.result.phase)
    ? report.result.phase
    : "timeout";
  report.endReason =
    report.result.phase === "won"
      ? "victory"
      : report.result.hp <= 0
        ? "death"
        : report.result.phase === "lost"
          ? "deadline"
          : "timeout";
  report.performance = {
    note: "rAF frame intervals are diagnostic only, not a simulation-CPU gate",
    samples: report.result.samples,
    medianMs: report.result.medianMs,
    p95Ms: report.result.p95Ms,
    bulletPeak: report.result.bulletPeak,
    spawnCount: report.result.spawnCount,
  };
  report.wallSeconds = +((Date.now() - t0) / 1000).toFixed(1);
  report.retryVisible = await page
    .locator("#retry")
    .isVisible()
    .catch(() => false);
  report.finishedAt = new Date().toISOString();
  await page.screenshot({
    path: join(ATTEMPT_DIR, "result.png"),
    animations: "disabled",
  });
  console.log(JSON.stringify(report, null, 2));
  if (!["won", "lost"].includes(report.result.phase))
    throw new Error("expedition run timed out");
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
} catch (error) {
  report.status = "error";
  report.failure = error instanceof Error ? error.stack : String(error);
  report.endReason = "error";
  try {
    await page.screenshot({
      path: join(ATTEMPT_DIR, "failure.png"),
      animations: "disabled",
    });
  } catch {}
  throw error;
} finally {
  await release();
  await browser.close();
  report.finishedAt ??= new Date().toISOString();
  const serialized = JSON.stringify(report, null, 2);
  await writeFile(join(ATTEMPT_DIR, "result.json"), serialized);
  // This compatibility file always points at the latest attempt, but the
  // attempt directory above is the authoritative copy and is never rewritten.
  await writeFile(
    RESULT_PATH,
    JSON.stringify(
      {
        latestAttemptId: ATTEMPT_ID,
        attemptResult: join(
          "artifacts",
          "expedition-attempts",
          ATTEMPT_ID,
          "result.json",
        ),
        status: report.status,
      },
      null,
      2,
    ),
  );
  let aggregate = [];
  try {
    aggregate = JSON.parse(
      await (await import("node:fs/promises")).readFile(AGGREGATE_PATH, "utf8"),
    );
    if (!Array.isArray(aggregate)) aggregate = [];
  } catch {}
  aggregate.push({
    attemptId: ATTEMPT_ID,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    seed: SEED,
    revision,
    status: report.status,
    dirty: report.dirty,
    sourceFingerprint: report.sourceFingerprint,
    testFingerprint: report.testFingerprint,
    endReason: report.endReason,
    phase: report.result?.phase ?? null,
    wave: report.result?.wave ?? null,
    hp: report.result?.hp ?? null,
    kills: report.result?.kills ?? null,
    wallSeconds: report.wallSeconds ?? null,
    path: join("artifacts", "expedition-attempts", ATTEMPT_ID),
    failure: report.failure,
  });
  await writeFile(AGGREGATE_PATH, JSON.stringify(aggregate, null, 2));
}
