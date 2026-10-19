import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.TEST_URL || "http://127.0.0.1:4188";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const report = {
  environment: {
    browser: await browser.version(),
    viewport: "1440x960",
    headless: true,
    platform: process.platform,
  },
  checks: [],
  errors,
};
const m = () => page.evaluate(() => window.scrapMetrics);
await mkdir("artifacts", { recursive: true });
try {
  await page.goto(`${origin}/?seed=2a`);
  await page.waitForTimeout(700);
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/title-desktop.png",
  });
  await page.locator("#start").click();
  await page.waitForTimeout(3000);
  const opening = await m();
  assert(opening.kills > 0 && opening.firstKill <= 5);
  report.opening = opening;
  report.checks.push("automatic first kill without attack input");
  let down = new Set(),
    shopDone = false,
    shot = false,
    chainShot = false;
  const wall = Date.now();
  async function keys(next) {
    for (const k of down)
      if (!next.has(k)) {
        await page.keyboard.up(k);
        down.delete(k);
      }
    for (const k of next) {
      await page.keyboard.down(k);
      down.add(k);
    }
  }
  while (Date.now() - wall < 100000) {
    const s = await m();
    if (["won", "lost"].includes(s.phase)) break;
    if (s.phase === "shop") {
      await keys(new Set());
      await page.screenshot({
        animations: "disabled",
        path: "artifacts/shop-before.png",
      });
      for (const index of [3, 1, 0, 2]) {
        const b = page.locator(`[data-buy="${index}"]`);
        if (await b.isEnabled()) await b.click();
      }
      await page.locator('[data-mod="popcorn"]').click();
      await page.locator('[data-mod="domino"]').click();
      await page.screenshot({
        animations: "disabled",
        path: "artifacts/shop-build.png",
      });
      await page.locator("#next").click();
      shopDone = true;
      continue;
    }
    if (s.phase === "paused") {
      await page.locator("#resume").click();
      continue;
    }
    const dx = s.position.x - 600,
      dy = s.position.y - 400,
      r = Math.hypot(dx, dy) || 1,
      c = Math.max(-1, Math.min(1, (210 - r) / 90)),
      vx = -dy / r + (dx / r) * c,
      vy = dx / r + (dy / r) * c;
    const wanted = new Set();
    if (vx > 0.32) wanted.add("KeyD");
    if (vx < -0.32) wanted.add("KeyA");
    if (vy > 0.32) wanted.add("KeyS");
    if (vy < -0.32) wanted.add("KeyW");
    await keys(wanted);
    await page.waitForTimeout(100);
    if (s.wave === 1 && s.waveTime > 9 && !shot) {
      await page.screenshot({
        animations: "disabled",
        path: "artifacts/battle-first.png",
      });
      shot = true;
    }
    if (s.wave === 2 && s.waveTime > 10 && !report.build) {
      report.build = await m();
      await page.screenshot({
        animations: "disabled",
        path: "artifacts/battle-build.png",
      });
    }
    // Capture one frame where a real chain is actually running. This only reads
    // normal-play metrics; no game state is injected.
    if (!chainShot && (s.chainCount >= 8 || s.pendingPeak >= 8)) {
      chainShot = true;
      report.chain = await m();
      await page.screenshot({
        animations: "disabled",
        path: "artifacts/battle-chain.png",
      });
    }
  }
  await keys(new Set());
  report.result = await m();
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/result.png",
  });
  assert(shopDone);
  assert.equal(report.result.phase, "won");
  assert(report.result.mods.length === 2 && report.result.guns.length >= 3);
  report.checks.push(
    "ordinary movement, weapon purchases, two stacked mods, boss victory",
  );
  await page.locator("#retry").click();
  assert.equal((await m()).guns.length, 1);
  assert.equal((await m()).mods.length, 0);
  await page.keyboard.press("Escape");
  const paused = await m();
  await page.waitForTimeout(350);
  assert.equal((await m()).time, paused.time);
  await page.locator("#resume").click();
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForFunction(() => window.scrapMetrics.phase === "paused");
  report.checks.push("retry reset, pause and resize");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  await mp.goto(origin);
  await mp.waitForTimeout(700);
  await mp.screenshot({
    animations: "disabled",
    path: "artifacts/title-mobile.png",
  });
  await mp.locator("#start").tap();
  const box = await mp.locator("#joystick").boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2,
    cdp = await mobile.newCDPSession(mp);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 35, y: y - 15, id: 1 }],
  });
  await mp.waitForTimeout(2000);
  await mp.screenshot({
    animations: "disabled",
    path: "artifacts/touch-play.png",
  });
  const touch = await mp.evaluate(() => window.scrapMetrics);
  assert(touch.position.x > 800 && touch.kills > 0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await mp.waitForFunction(() => window.scrapMetrics.phase === "paused");
  await mp.locator("#resume").tap();
  const pos = await mp.evaluate(() => window.scrapMetrics.position);
  await mp.waitForTimeout(200);
  assert.deepEqual(await mp.evaluate(() => window.scrapMetrics.position), pos);
  report.touch = touch;
  report.checks.push(
    "real emulated touch stream moves, auto-fires; cancel resumes without ghost movement",
  );
  await mobile.close();
  assert.equal(errors.length, 0);
  report.checks.push("no uncaught page errors");
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  report.failure = e.stack;
  console.error(e);
  process.exitCode = 1;
  await page
    .screenshot({ animations: "disabled", path: "artifacts/failure.png" })
    .catch(() => {});
} finally {
  await writeFile(
    "artifacts/browser-results.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
