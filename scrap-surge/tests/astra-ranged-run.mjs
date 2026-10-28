// Ordinary-input ranged diagnostic. It records failures instead of retrying.
//
// This preserves Astra's fixed seed, build priority and movement strategy. It
// reads public metrics and uses only normal keyboard/button input. A loss is a
// valid diagnostic outcome but still fails the victory assertion on exit.
//
// Usage:
//   SOURCE_SHA=<commit> OUTPUT_DIR=/abs/path/to/new-run \
//     BASE_URL=http://127.0.0.1:4190 npm run test:astra:ranged
import { chromium } from "@playwright/test";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4190";
const SOURCE_SHA = process.env.SOURCE_SHA || process.env.REVIEW_SHA;
if (!SOURCE_SHA) throw Error("SOURCE_SHA (or legacy REVIEW_SHA) is required");
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ||
  join(
    tmpdir(),
    "astra-ranged",
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`,
  );
await mkdir(dirname(OUTPUT_DIR), { recursive: true });
await mkdir(OUTPUT_DIR, { recursive: false });

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const report = {
  sha: SOURCE_SHA,
  baseUrl: BASE_URL,
  seed: "2a",
  branch: "wake",
  mods: ["popcorn", "domino"],
  strategy: {
    centerRadius: 210,
    bossRadius: 170,
    avoidance: {
      nearestOnly: true,
      radius: 105,
      weight: 2.4,
      falloff: "linear",
      zeroDistanceDirection: [1, 0],
    },
    deadzone: 0.32,
    pollMs: 80,
    buyOrder: ["rocket", "coil", "slinger"],
    allowDuplicates: true,
    rerollMax: 2,
    reroll: true,
    sale: false,
    capSeconds: 1100,
  },
  checks: [],
  stops: [],
  bosses: [],
  errors: [],
  environment: {
    browser: browser.version(),
    headless: true,
    viewport: "1440x960",
    platform: process.platform,
  },
};
page.on("pageerror", (error) => report.errors.push(error.message));
const metrics = () => page.evaluate(() => window.scrapMetrics);
const held = new Set();
const started = Date.now();

async function keys(wanted) {
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

async function shot(name) {
  await page.screenshot({
    path: join(OUTPUT_DIR, `${name}.png`),
    animations: "disabled",
  });
}

async function trace(type, state) {
  await appendFile(
    join(OUTPUT_DIR, "trace.jsonl"),
    JSON.stringify({
      type,
      wall: (Date.now() - started) / 1000,
      ...state,
    }) + "\n",
  );
}

try {
  await page.goto(`${BASE_URL}/?mode=expedition20&seed=2a`);
  await page.locator("#start").click();
  assert.equal((await metrics()).boss, null);
  report.checks.push("boss null before spawn");

  let last = "";
  let lastTrace = 0;
  const seenBosses = new Set();
  while (Date.now() - started < 1_100_000) {
    const state = await metrics();
    if (Date.now() - lastTrace > 5000) {
      lastTrace = Date.now();
      await trace("sample", state);
    }
    if (state.phase === "lost" || state.phase === "won") break;
    if (state.phase === "paused") {
      await page.locator("#resume").click();
      continue;
    }
    if (state.boss && !seenBosses.has(state.wave)) {
      seenBosses.add(state.wave);
      report.bosses.push(state);
      await trace("boss", state);
      await shot(`boss-${state.wave}`);
      const isolated = await page.evaluate(() => {
        const first = window.scrapMetrics.boss;
        if (!first) return null;
        const x = first.x;
        const hp = first.hp;
        first.x = -12345;
        first.hp = -12345;
        const second = window.scrapMetrics.boss;
        return (
          !!second && second.x === x && second.hp === hp && second !== first
        );
      });
      assert.equal(isolated, true);
      report.checks.push(`boss ${state.wave} copy isolated`);
    }

    const phase = `${state.wave}-${state.phase}`;
    if (state.phase === "quick" || state.phase === "shop") {
      await keys(new Set());
      await shot(`${phase}-before`);
      const before = state;
      if (state.phase === "quick") {
        const pick =
          state.wave === 1
            ? "popcorn"
            : state.wave === 3
              ? "domino"
              : state.wave === 5
                ? "wake"
                : state.wave === 17
                  ? "domino"
                  : "popcorn";
        await page.locator(`[data-quick="${pick}"]`).click();
        const after = await metrics();
        assert(await page.locator("#next").isEnabled());
        assert.equal(
          await page.locator('[data-quick][aria-pressed="true"]').count(),
          1,
        );
        assert.match(
          await page.locator('[data-quick][aria-pressed="true"]').innerText(),
          /已选/,
        );

        const chosen = page.locator(`[data-quick="${pick}"]`);
        const box = await chosen.boundingBox();
        if (box)
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        assert.deepEqual((await metrics()).modTiers, after.modTiers);

        const count = await page.locator("[data-quick]").count();
        for (let index = 0; index < count; index++)
          assert(await page.locator("[data-quick]").nth(index).isDisabled());
        if ([9, 13, 17].includes(state.wave)) {
          const expected =
            state.wave === 9 ? [2, 1] : state.wave === 13 ? [3, 1] : [3, 2];
          assert.deepEqual(after.modTiers, expected);
        }
        report.checks.push(`W${state.wave} choice locked and continue enabled`);
      } else {
        // Fill legal weapon slots in the registered priority.
        for (let roll = 0; roll <= 2; roll++) {
          for (const id of report.strategy.buyOrder) {
            const current = await metrics();
            for (let index = 0; index < current.offers.length; index++) {
              if (current.offers[index] !== id) continue;
              const button = page.locator(`[data-buy="${index}"]`);
              if (await button.isEnabled()) await button.click();
            }
          }
          const current = await metrics();
          if (current.guns.length >= current.slotCap || roll === 2) break;
          const reroll = page.locator("#reroll");
          if (!(await reroll.isEnabled())) break;
          await reroll.click();
        }
      }
      const after = await metrics();
      report.stops.push({ before, after });
      await trace("stop-after", after);
      await shot(`${phase}-after`);
      await page.locator("#next").click();
      console.error(
        `[astra-ranged] W${state.wave} ${state.phase} hp${after.hp} kills${after.kills} guns${after.guns.length} tiers${after.modTiers}`,
      );
      last = phase;
      continue;
    }

    if (phase !== last) {
      await trace("phase", state);
      if (state.phase === "interlude") await shot(phase);
      last = phase;
    }

    const boss = state.boss && state.boss.born <= 0 ? state.boss : null;
    const dx = state.position.x - (boss?.x ?? 600);
    const dy = state.position.y - (boss?.y ?? 400);
    const radius = Math.hypot(dx, dy) || 1;
    const centering = Math.max(
      -1,
      Math.min(1, ((boss ? 170 : 210) - radius) / 90),
    );
    let vx = -dy / radius + (dx / radius) * centering;
    let vy = dx / radius + (dy / radius) * centering;
    let nearest = null;
    let nearestDistance = 105;
    for (const enemy of state.enemyPositions) {
      const distance = Math.hypot(
        enemy.x - state.position.x,
        enemy.y - state.position.y,
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
    }
    if (nearest) {
      const repel = 2.4 * (1 - nearestDistance / 105);
      vx +=
        (nearestDistance
          ? (state.position.x - nearest.x) / nearestDistance
          : 1) * repel;
      vy +=
        (nearestDistance
          ? (state.position.y - nearest.y) / nearestDistance
          : 0) * repel;
    }
    const wanted = new Set();
    if (vx > 0.32) wanted.add("KeyD");
    if (vx < -0.32) wanted.add("KeyA");
    if (vy > 0.32) wanted.add("KeyS");
    if (vy < -0.32) wanted.add("KeyW");
    await keys(wanted);
    await page.waitForTimeout(80);
  }

  await keys(new Set());
  report.result = await metrics();
  report.reason =
    report.result.phase === "won"
      ? "victory"
      : report.result.phase === "lost"
        ? report.result.hp <= 0
          ? "death"
          : "deadline"
        : "timeout";
  await shot("result");
  await trace("terminal", report.result);
  assert.equal(report.errors.length, 0);
  assert(await page.locator("#retry").isVisible());
  await page.locator("#retry").click();
  const retry = await metrics();
  assert.equal(retry.phase, "fight");
  assert.equal(retry.wave, 1);
  assert.equal(retry.hp, 10);
  assert.equal(retry.kills, 0);
  assert.equal(retry.guns.length, 1);
  assert.equal(retry.mods.length, 0);
  report.checks.push(
    report.result.phase === "won"
      ? "victory retry resets run"
      : "failure retry resets run",
  );
  assert.equal(
    report.result.phase,
    "won",
    "Full victory not achieved; actual failure retained",
  );
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  report.wallSeconds = (Date.now() - started) / 1000;
  await keys(new Set());
  await writeFile(
    join(OUTPUT_DIR, "result.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        sha: report.sha,
        outputDir: OUTPUT_DIR,
        reason: report.reason,
        result: report.result,
        checks: report.checks,
        errors: report.errors,
        failure: report.failure,
        wallSeconds: report.wallSeconds,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
