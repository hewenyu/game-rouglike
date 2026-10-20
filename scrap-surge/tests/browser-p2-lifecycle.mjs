// Project-local ordinary-input lifecycle regression for the P2 repair.
//
// This retains the useful checks from Astra's one-shot root fixture without
// borrowing its version label: pause freezes the simulation, resize pauses,
// refresh returns to the title and preserves mute, normal input loses W2, the
// completion record is written once, and retry resets the run.
//
// Usage:
//   BASE_URL=http://127.0.0.1:4194 node tests/browser-p2-lifecycle.mjs
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4192";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR || `/tmp/scrap-p2-lifecycle-${Date.now()}`;
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SEED = process.env.SEED || "1";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 850 },
});
const page = await context.newPage();
const errors = [];
const checks = [];
const position = (state) => `${state.position.x},${state.position.y}`;
const metrics = () => page.evaluate(() => window.scrapMetrics);
let held = new Set();

async function release() {
  for (const key of held) await page.keyboard.up(key);
  held = new Set();
}

async function steerAway(state) {
  const wanted = new Set();
  const dx = state.position.x - 600;
  const dy = state.position.y - 450;
  const r = Math.hypot(dx, dy) || 1;
  const center = Math.max(-1, Math.min(1, (220 - r) / 90));
  const vx = -dy / r + (dx / r) * center;
  const vy = dx / r + (dy / r) * center;
  if (vx > 0.28) wanted.add("KeyD");
  if (vx < -0.28) wanted.add("KeyA");
  if (vy > 0.28) wanted.add("KeyS");
  if (vy < -0.28) wanted.add("KeyW");
  for (const key of held)
    if (!wanted.has(key)) {
      await page.keyboard.up(key);
      held.delete(key);
    }
  for (const key of wanted)
    if (!held.has(key)) {
      await page.keyboard.down(key);
      held.add(key);
    }
}

let result = {
  baseUrl: BASE_URL,
  seed: SEED,
  ordinaryInputsOnly: true,
  noStateInjection: true,
  noInvulnerability: true,
  checks,
  errors,
};

try {
  await page.goto(`${BASE_URL}/?mode=expedition20&seed=${SEED}`);
  await page.locator("#start").click();
  await wait(300);

  await page.locator("#pause").click();
  const paused = await metrics();
  await wait(500);
  const stillPaused = await metrics();
  assert.equal(stillPaused.phase, "paused");
  assert.equal(position(stillPaused), position(paused));
  assert.equal(stillPaused.waveTime, paused.waveTime);
  checks.push("pause freezes position and clock");
  await page.locator("#resume").click();

  await page.setViewportSize({ width: 1100, height: 800 });
  await wait(200);
  assert.equal((await metrics()).phase, "paused");
  checks.push("resize automatically pauses");
  await page.locator("#resume").click();

  await page.locator("#sound").click();
  const muted = await page.locator("#sound").textContent();
  await page.reload();
  assert(await page.locator("#start").isVisible());
  assert.equal(await page.locator("#sound").textContent(), muted);
  checks.push("refresh returns to title and preserves mute");

  await page.locator("#start").click();
  const begun = Date.now();
  let terminal = null;
  while (Date.now() - begun < 170000) {
    const state = await metrics();
    if (state.phase === "lost" || state.phase === "won") {
      terminal = state;
      break;
    }
    if (state.phase === "shop") {
      await release();
      await page.locator("#next-fast").click();
      continue;
    }
    if (state.phase === "paused") {
      await release();
      await page.locator("#resume").click();
      continue;
    }
    if (state.phase === "fight") await steerAway(state);
    await wait(70);
  }
  await release();
  terminal = terminal ?? (await metrics());
  assert.equal(terminal.phase, "lost");
  assert(terminal.wave >= 2 && terminal.wave <= 20);
  assert(terminal.hp <= 0);
  checks.push(`normal input reaches a real loss at W${terminal.wave}`);

  const records = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("scrap-surge.expedition20.v1") || "null"),
    );
  const record = await records();
  assert.equal(record.runs, 1);
  checks.push("one completion record is written");

  await page.locator("#retry").click();
  await page.waitForFunction(() => window.scrapMetrics.phase === "fight");
  const reset = await metrics();
  assert.equal(reset.wave, 1);
  assert.equal(reset.hp, reset.maxHp);
  assert.equal(reset.guns.length, 1);
  assert.equal(
    Object.values(reset.inventory).reduce((sum, value) => sum + value, 0),
    0,
  );
  assert.equal((await records()).runs, 1);
  checks.push("retry resets wave, health, gun and inventory without a record");
  assert.deepEqual(errors, []);
  result = { ...result, terminal, status: "completed" };
  await page.screenshot({
    path: join(OUTPUT_DIR, "retry-reset.png"),
    animations: "disabled",
  });
} catch (error) {
  result = {
    ...result,
    status: "error",
    failure: error instanceof Error ? error.stack : String(error),
  };
  process.exitCode = 1;
} finally {
  await release().catch(() => {});
  await writeFile(
    join(OUTPUT_DIR, "report.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      outputDir: OUTPUT_DIR,
      status: result.status,
      checks: result.checks,
      failure: result.failure,
      terminal: result.terminal,
    }),
  );
  await context.close();
  await browser.close();
}
