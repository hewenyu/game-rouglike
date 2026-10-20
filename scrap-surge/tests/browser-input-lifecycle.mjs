// Ordinary-input regression for the expedition auto-transition lifecycle.
// Two independent runs advance normally to the W7 interlude: one uses keyboard,
// the other uses a real CDP touch stream. No game state is written.
//
// Usage:
//   TEST_URL=http://127.0.0.1:4188 npm run test:browser:lifecycle
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE_URL =
  process.env.TEST_URL || process.env.BASE_URL || "http://127.0.0.1:4188";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + JSON.stringify(detail) : ""}`,
  );
};
const metrics = (page) => page.evaluate(() => window.scrapMetrics);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function steer(s) {
  const dx = s.position.x - 600,
    dy = s.position.y - 400,
    r = Math.hypot(dx, dy) || 1,
    c = Math.max(-1, Math.min(1, (210 - r) / 90));
  let vx = -dy / r + (dx / r) * c,
    vy = dx / r + (dy / r) * c;
  let near = null,
    nearest = 105;
  for (const enemy of s.enemyPositions || []) {
    const d = Math.hypot(enemy.x - s.position.x, enemy.y - s.position.y);
    if (d < nearest) {
      nearest = d;
      near = enemy;
    }
  }
  if (near) {
    const repel = 2.4 * (1 - nearest / 105);
    vx += (nearest ? (s.position.x - near.x) / nearest : 1) * repel;
    vy += (nearest ? (s.position.y - near.y) / nearest : 0) * repel;
  }
  return { vx, vy };
}

async function keyboard(page) {
  let held = new Set();
  const release = async () => {
    for (const key of held) await page.keyboard.up(key);
    held = new Set();
  };
  return {
    release,
    async move(vx, vy) {
      const wanted = new Set();
      if (vx > 0.32) wanted.add("KeyD");
      if (vx < -0.32) wanted.add("KeyA");
      if (vy > 0.32) wanted.add("KeyS");
      if (vy < -0.32) wanted.add("KeyW");
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
    },
  };
}

async function touch(page, context) {
  const cdp = await context.newCDPSession(page);
  const box = await page.locator("#joystick").boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  let active = false;
  const release = async () => {
    if (!active) return;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    active = false;
  };
  return {
    release,
    async move(vx, vy) {
      if (!active) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y, id: 1 }],
        });
        active = true;
      }
      const length = Math.hypot(vx, vy) || 1;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: x + (vx / length) * Math.min(1, length) * 40,
            y: y + (vy / length) * Math.min(1, length) * 40,
            id: 1,
          },
        ],
      });
    },
  };
}

async function panel(page, s, driver, keepPlayerKeys = false) {
  if (!keepPlayerKeys) await driver.release();
  if (s.phase === "paused") {
    await page.locator("#resume").click();
    return;
  }
  if (s.phase === "quick") {
    const pick = s.wave === 1 ? "popcorn" : s.wave === 3 ? "domino" : "wake";
    await page.locator(`[data-quick="${pick}"]`).click();
  } else {
    for (let round = 0; round < 2; round++) {
      const now = await metrics(page);
      const before = now.guns.length;
      for (let i = 0; i < now.offers.length; i++) {
        const owned = new Set(now.guns);
        const button = page.locator(`[data-buy="${i}"]`);
        if (
          !owned.has(now.offers[i]) &&
          (await metrics(page)).guns.length < now.slotCap &&
          (await button.isEnabled())
        )
          await button.click();
      }
      if ((await metrics(page)).guns.length === before) break;
    }
  }
  await page.locator("#next").click();
  await page.waitForFunction(
    (phase) => window.scrapMetrics.phase !== phase,
    s.phase,
  );
}

async function run(browser, kind) {
  const mobile = kind === "touch";
  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          deviceScaleFactor: 2,
        }
      : { viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let driver = null;
  let s = null;
  let quickGate = null;
  let shopGate = null;
  let pauseGate = null;
  let interludeSeen = null;
  let keyboardOldReleased = false;
  try {
    await page.goto(`${BASE_URL}/?mode=expedition20&seed=2a`);
    const start = page.locator("#start");
    if (mobile) await start.tap();
    else await start.click();
    driver = mobile ? await touch(page, context) : await keyboard(page);
    const t0 = Date.now();
    while (Date.now() - t0 < 300000) {
      s = await metrics(page);
      if (s.phase === "lost" || s.phase === "won")
        throw new Error(`${kind} run ended at W${s.wave}: ${s.phase}`);
      if (s.phase === "quick" || s.phase === "shop" || s.phase === "paused") {
        if (kind === "keyboard" && s.phase === "quick" && s.wave === 1) {
          await driver.release();
          await page.keyboard.down("KeyA");
          await panel(page, s, driver, true);
          const a = await metrics(page);
          await wait(250);
          const b = await metrics(page);
          quickGate = {
            phase: b.phase,
            distance: Math.hypot(
              b.position.x - a.position.x,
              b.position.y - a.position.y,
            ),
          };
          await page.keyboard.up("KeyA");
        } else if (kind === "keyboard" && s.phase === "shop" && s.wave === 2) {
          await driver.release();
          await page.keyboard.down("KeyS");
          await panel(page, s, driver, true);
          const a = await metrics(page);
          await wait(250);
          const b = await metrics(page);
          shopGate = {
            phase: b.phase,
            distance: Math.hypot(
              b.position.x - a.position.x,
              b.position.y - a.position.y,
            ),
          };
          await page.keyboard.up("KeyS");
        } else {
          await panel(page, s, driver);
        }
        continue;
      }
      if (s.phase === "sweep" && s.wave === 7) {
        if (!interludeSeen) interludeSeen = { phase: s.phase, wave: s.wave };
        await driver.move(1, 0);
        await wait(35);
        continue;
      }
      if (s.phase === "interlude" && s.wave === 7) {
        interludeSeen = { phase: s.phase, wave: s.wave };
        await driver.release();
        await driver.move(0, -1);
        keyboardOldReleased = true;
        await page.waitForFunction(
          () =>
            window.scrapMetrics.phase === "fight" &&
            window.scrapMetrics.wave === 8,
        );
        const a = await metrics(page);
        await wait(300);
        const b = await metrics(page);
        return {
          status: "completed",
          context,
          page,
          errors,
          start: interludeSeen,
          quickGate,
          shopGate,
          pauseGate,
          movement: {
            dx: b.position.x - a.position.x,
            dy: b.position.y - a.position.y,
            phase: b.phase,
            wave: b.wave,
          },
          keyboardOldReleased,
        };
      }
      if (
        kind === "keyboard" &&
        s.phase === "fight" &&
        s.wave === 3 &&
        !pauseGate
      ) {
        await driver.release();
        await page.locator("#pause").click();
        await page.waitForFunction(
          () => window.scrapMetrics.phase === "paused",
        );
        const a = await metrics(page);
        await wait(100);
        const b = await metrics(page);
        await page.keyboard.down("KeyD");
        const c = await metrics(page);
        await page.locator("#resume").click();
        await page.waitForFunction(() => window.scrapMetrics.phase === "fight");
        const d = await metrics(page);
        await wait(250);
        const e = await metrics(page);
        pauseGate = {
          frozen: a.time === b.time && b.time === c.time,
          distance: Math.hypot(
            e.position.x - d.position.x,
            e.position.y - d.position.y,
          ),
        };
        await page.keyboard.up("KeyD");
      }
      if (s.phase === "fight" && s.wave === 7 && s.waveTime > s.duration - 1.5)
        await driver.move(1, 0);
      else {
        const { vx, vy } = steer(s);
        await driver.move(vx, vy);
      }
      await wait(70);
    }
    throw new Error(`${kind} run did not reach the W7 interlude`);
  } catch (error) {
    if (driver) await driver.release().catch(() => {});
    return {
      status: "error",
      context,
      page,
      errors,
      failure: error instanceof Error ? error.stack : String(error),
      lastMetrics: await metrics(page).catch(() => null),
      start: interludeSeen,
      quickGate,
      shopGate,
      pauseGate,
    };
  }
}

await mkdir(join(ROOT, "artifacts"), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const runs = [];
try {
  for (const kind of ["keyboard", "touch"]) {
    const runResult = await run(browser, kind);
    await runResult.context.close();
    runs.push({
      kind,
      status: runResult.status,
      failure: runResult.failure,
      lastMetrics: runResult.lastMetrics,
    });
    if (runResult.status === "error") {
      check(`${kind}: lifecycle run completed`, false, {
        failure: runResult.failure,
        lastMetrics: runResult.lastMetrics,
      });
      continue;
    }
    check(
      `${kind}: normal run reaches W7 interlude`,
      runResult.start?.phase === "interlude",
      runResult.start,
    );
    if (kind === "keyboard") {
      check(
        "keyboard: quick, shop and pause gates reject movement",
        runResult.quickGate?.distance < 1 &&
          runResult.shopGate?.distance < 1 &&
          runResult.pauseGate?.frozen === true &&
          runResult.pauseGate?.distance < 1,
        {
          quick: runResult.quickGate,
          shop: runResult.shopGate,
          paused: runResult.pauseGate,
        },
      );
    }
    check(
      `${kind}: direction newly held in interlude moves immediately in W8`,
      runResult.movement.phase === "fight" &&
        runResult.movement.wave === 8 &&
        runResult.movement.dy < -5 &&
        Math.abs(runResult.movement.dx) < 1,
      runResult.movement,
    );
    check(`${kind}: no page errors`, runResult.errors.length === 0, {
      errors: runResult.errors,
    });
  }
} finally {
  await browser.close();
  const failed = results.filter((result) => !result.ok);
  await writeFile(
    join(ROOT, "artifacts", "input-lifecycle-results.json"),
    JSON.stringify(
      {
        checks: results,
        runs,
        passed: results.length - failed.length,
        total: results.length,
      },
      null,
      2,
    ),
  );
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`,
  );
  process.exitCode = failed.length ? 1 : 0;
}
