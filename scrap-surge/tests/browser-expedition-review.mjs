// Review-only ordinary-input walkthrough for the full expedition20 run.
//
// This harness adapts the review script supplied by Astra. It starts a real
// keyboard run at seed 2a, drives every quick/shop panel through its buttons,
// records each boss and stop, and requires a real 20-wave victory. It writes no
// game state and uses no invulnerability. Every run needs its own explicit
// OUTPUT_DIR and the reviewed REVIEW_SHA; artifacts are never overwritten by a
// later run.
//
// Usage:
//   REVIEW_SHA=<commit> OUTPUT_DIR=/abs/path/run-1 \
//     BASE_URL=http://127.0.0.1:4190 \
//     node tests/browser-expedition-review.mjs
//
// This file is intentionally separate from npm scripts so it does not alter the
// frozen suite or its check denominator. An unrun copy is not evidence of a win.
import { chromium } from "@playwright/test";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4190";
const OUTPUT_DIR = process.env.OUTPUT_DIR;
const REVIEW_SHA = process.env.REVIEW_SHA;
if (!OUTPUT_DIR || !REVIEW_SHA)
  throw Error("OUTPUT_DIR and REVIEW_SHA are required");
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
  sha: REVIEW_SHA,
  seed: "2a",
  branch: "wake",
  mods: ["popcorn", "domino"],
  strategy: {
    centerRadius: 210,
    bossRadius: 170,
    deadzone: 0.32,
    pollMs: 80,
    upgradeOrder: ["coil", "rocket", "slinger", "shotgun", "saw", "fist"],
    reroll: false,
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
page.on("pageerror", (e) => report.errors.push(e.message));
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
    path: `${OUTPUT_DIR}/${name}.png`,
    animations: "disabled",
  });
}
async function trace(type, state) {
  await appendFile(
    `${OUTPUT_DIR}/trace.jsonl`,
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
  const opening = await metrics();
  assert(
    opening.boss === null || opening.boss.hp <= 0,
    "a live boss unexpectedly appeared before its wave",
  );
  report.checks.push("boss null before spawn");

  let last = "",
    lastTrace = 0;
  const seenBoss = new Set();
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
    if (state.boss && !seenBoss.has(state.wave)) {
      seenBoss.add(state.wave);
      report.bosses.push(state);
      await trace("boss", state);
      await shot(`boss-${state.wave}`);
      const isolation = await page.evaluate(() => {
        const a = window.scrapMetrics.boss;
        if (!a) return null;
        const x = a.x,
          hp = a.hp;
        a.x = -12345;
        a.hp = -12345;
        const b = window.scrapMetrics.boss;
        return !!b && b.x === x && b.hp === hp && b !== a;
      });
      assert.equal(isolation, true);
      report.checks.push(`boss ${state.wave} copy isolated`);
    }

    const phase = `${state.wave}-${state.phase}`;
    if (state.phase === "quick" || state.phase === "shop") {
      await keys(new Set());
      await shot(`${phase}-before`);
      const before = state;
      if (state.phase === "quick") {
        const pick =
          state.wave === 5 ? "wake" : state.wave === 17 ? "domino" : "popcorn";
        await page.locator(`[data-quick="${pick}"]`).click();
        const after = await metrics();
        assert(await page.locator("#next").isEnabled());
        // A real repeated pointer click must not grant a second tier.
        const chosen = page.locator(`[data-quick="${pick}"]`);
        const box = await chosen.boundingBox();
        if (box)
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        assert.deepEqual((await metrics()).modTiers, after.modTiers);
        assert.equal(
          await page.locator("[data-quick][aria-pressed=true]").count(),
          1,
        );
        assert.match(
          await page.locator("[data-quick][aria-pressed=true]").innerText(),
          /已选/,
        );
        const count = await page.locator("[data-quick]").count();
        for (let i = 0; i < count; i++)
          assert(await page.locator("[data-quick]").nth(i).isDisabled());
        if ([9, 13, 17].includes(state.wave)) {
          const expected =
            state.wave === 9 ? [2, 1] : state.wave === 13 ? [3, 1] : [3, 2];
          assert.deepEqual(after.modTiers, expected);
        }
        report.checks.push(`W${state.wave} choice locked and continue enabled`);
      } else {
        // Fill legal slots with different offered weapons, then explicitly
        // upgrade owned slots. These are normal shop button clicks only.
        for (let round = 0; round < 3; round++) {
          let changed = false;
          const now = await metrics();
          for (let i = 0; i < now.offers.length; i++) {
            const current = await metrics();
            if (current.guns.length >= current.slotCap) break;
            if (current.guns.includes(current.offers[i])) continue;
            const button = page.locator(`[data-buy="${i}"]`);
            if (await button.isEnabled()) {
              await button.click();
              changed = true;
            }
          }
          if (!changed) break;
        }
        for (const id of report.strategy.upgradeOrder) {
          const now = await metrics();
          for (let i = 0; i < now.guns.length; i++)
            if (now.guns[i] === id) {
              const button = page.locator(`[data-upgrade="${i}"]`);
              if ((await button.count()) && (await button.isEnabled()))
                await button.click();
            }
        }
      }
      const after = await metrics();
      report.stops.push({ before, after });
      await trace("stop-after", after);
      await shot(`${phase}-after`);
      await page.locator("#next").click();
      console.error(
        `[review] W${state.wave} ${state.phase} hp${after.hp} kills${after.kills} guns${after.guns.length} tiers${after.modTiers}`,
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
    const dx = state.position.x - (boss?.x ?? 600),
      dy = state.position.y - (boss?.y ?? 400),
      r = Math.hypot(dx, dy) || 1,
      c = Math.max(-1, Math.min(1, ((boss ? 170 : 210) - r) / 90)),
      vx = -dy / r + (dx / r) * c,
      vy = dx / r + (dy / r) * c,
      wanted = new Set();
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
  if (report.result.phase === "won" || report.result.phase === "lost") {
    assert(await page.locator("#retry").isVisible());
    await page.locator("#retry").click();
    const retry = await metrics();
    assert.equal(retry.phase, "fight");
    assert.equal(retry.wave, 1);
    assert.equal(retry.hp, 10);
    assert.equal(retry.kills, 0);
    assert.equal(retry.guns.length, 1);
    assert.equal(retry.mods.length, 0);
    report.checks.push("terminal retry resets run");
  }
  assert.equal(report.errors.length, 0);
  assert.equal(
    report.result.phase,
    "won",
    "Full victory not achieved; retain actual failure",
  );
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  report.wallSeconds = (Date.now() - started) / 1000;
  await keys(new Set());
  await writeFile(`${OUTPUT_DIR}/result.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        sha: report.sha,
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
