// Bounded first-merge fixture. It advances through W1/W2 with ordinary
// keyboard or touch drive input, then buys the offered copy of the starting
// weapon so the real shop exercises an I -> II merge. It only reads
// window.scrapMetrics and normal DOM; it never writes game state.
//
// Usage:
//   BASE_URL=http://127.0.0.1:4190 node tests/browser-merge-purchase.mjs
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4190";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ||
  join(ROOT, "artifacts", `merge-purchase-${Date.now()}`);
const SEED = "2a";
await mkdir(OUTPUT_DIR, { recursive: true });

const metrics = (page) => page.evaluate(() => window.scrapMetrics);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function steer(state) {
  const dx = state.position.x - 600,
    dy = state.position.y - 400,
    r = Math.hypot(dx, dy) || 1,
    c = Math.max(-1, Math.min(1, (210 - r) / 90));
  let vx = -dy / r + (dx / r) * c,
    vy = dx / r + (dy / r) * c;
  let nearest = 105,
    near = null;
  for (const enemy of state.enemyPositions || []) {
    const d = Math.hypot(
      enemy.x - state.position.x,
      enemy.y - state.position.y,
    );
    if (d < nearest) {
      nearest = d;
      near = enemy;
    }
  }
  if (near) {
    const repel = 2.4 * (1 - nearest / 105);
    vx += ((state.position.x - near.x) / nearest) * repel;
    vy += ((state.position.y - near.y) / nearest) * repel;
  }
  return { vx, vy };
}

async function keyboard(page) {
  let held = new Set();
  return {
    async release() {
      for (const key of held) await page.keyboard.up(key);
      held = new Set();
    },
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
  return {
    async release() {
      if (!active) return;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      active = false;
    },
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
  const reports = [];
  let driver = null;
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${BASE_URL}/?mode=expedition20&seed=${SEED}`);
    const start = page.locator("#start");
    if (mobile) await start.tap();
    else await start.click();
    driver = mobile ? await touch(page, context) : await keyboard(page);
    const begun = Date.now();
    while (Date.now() - begun < 80000) {
      const state = await metrics(page);
      if (state.phase === "quick" && state.wave === 1) {
        await driver.release();
        const before = state;
        assert(await page.locator('[data-quick="popcorn"]').isEnabled());
        await page.locator('[data-quick="popcorn"]').click();
        const after = await metrics(page);
        assert.deepEqual(after.mods, ["popcorn"]);
        assert(await page.locator("#next").isEnabled());
        reports.push({ kind, panel: "quick", before, after });
        await page.locator("#next").click();
        continue;
      }
      if (state.phase === "shop" && state.wave === 2) {
        await driver.release();
        const before = state;
        const layout = await page.evaluate(() => {
          const cards = [...document.querySelectorAll(".weapon-card")];
          const summary = [...document.querySelectorAll(".weapon-summary")];
          const note = document.querySelector(".weapon-dps-note");
          return {
            viewportWidth: window.innerWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            cardOverflow: cards.some((card) => {
              const r = card.getBoundingClientRect();
              return r.left < 0 || r.right > window.innerWidth + 0.5;
            }),
            summaryMetrics: summary.map((row) => ({
              clientWidth: row.clientWidth,
              scrollWidth: row.scrollWidth,
              width: row.getBoundingClientRect().width,
              text: row.textContent?.replace(/\s+/g, " ").trim() ?? "",
            })),
            noteVisible: note
              ? note.getBoundingClientRect().height > 0 &&
                getComputedStyle(note).visibility !== "hidden"
              : false,
            noteText: note?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          };
        });
        assert(
          layout.noteVisible,
          "shared theoretical-DPS note must be visible",
        );
        assert.match(layout.noteText, /单目标、散弹全中/);
        assert.match(layout.noteText, /餐叉持续接触/);
        if (mobile) {
          assert.equal(
            layout.documentScrollWidth,
            layout.viewportWidth,
            "390px shop must not overflow horizontally",
          );
          assert(
            !layout.cardOverflow,
            "390px shop cards must stay in viewport",
          );
          assert(
            layout.summaryMetrics.every(
              (row) => row.scrollWidth <= row.clientWidth + 1,
            ),
            `390px weapon labels must not clip: ${JSON.stringify(layout.summaryMetrics)}`,
          );
        }
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-shop-before.png`),
          fullPage: true,
          animations: "disabled",
        });
        const startingId = before.guns[0];
        const offerIndex = before.offers.indexOf(startingId);
        assert(
          offerIndex >= 0,
          `starting weapon ${startingId} must be offered: ${before.offers}`,
        );
        const card = page.locator(`[data-buy="${offerIndex}"]`);
        const beforeText = await card.innerText();
        assert.match(beforeText, /合成至 II/);
        assert.match(beforeText, /攻击 40/);
        assert(await card.isEnabled());
        await card.click();
        const after = await metrics(page);
        assert.deepEqual(after.guns, [startingId]);
        assert.deepEqual(after.gunTiers, [2]);
        assert.equal(after.gunProfiles[0].damage, 40);
        assert.equal(after.money, before.money - 18);
        const afterText = await card.innerText();
        assert.match(afterText, /合成 II/);
        assert.match(afterText, /攻击 40/);
        assert.match(
          await page.locator(".owned-grid").innerText(),
          /罐头快枪 II[\s\S]*攻击 40/,
        );
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-shop-after.png`),
          fullPage: true,
          animations: "disabled",
        });
        reports.push({
          kind,
          panel: "shop",
          layout,
          startingId,
          offerIndex,
          beforeText,
          afterText,
          before,
          after,
        });
        return { kind, status: "completed", reports, errors };
      }
      if (state.phase === "lost" || state.phase === "won") {
        throw new Error(`${kind} run ended at W${state.wave}: ${state.phase}`);
      }
      if (state.phase === "paused") {
        await driver.release();
        await page.locator("#resume").click();
        continue;
      }
      if (state.phase === "fight") {
        const { vx, vy } = steer(state);
        await driver.move(vx, vy);
      }
      await wait(70);
    }
    throw new Error(`${kind} run did not reach the W2 shop`);
  } finally {
    if (driver) await driver.release().catch(() => {});
    await context.close();
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const results = [];
try {
  for (const kind of ["keyboard", "touch"]) {
    try {
      results.push(await run(browser, kind));
    } catch (error) {
      results.push({
        kind,
        status: "error",
        failure: error instanceof Error ? error.stack : String(error),
      });
      process.exitCode = 1;
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  join(OUTPUT_DIR, "report.json"),
  JSON.stringify(
    {
      seed: SEED,
      baseUrl: BASE_URL,
      normalInputOnly: true,
      results,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      outputDir: OUTPUT_DIR,
      checks: results.map((result) => ({
        kind: result.kind,
        status: result.status,
        failure: result.failure,
        errors: result.errors,
      })),
    },
    null,
    2,
  ),
);
if (results.some((result) => result.status !== "completed")) {
  process.exitCode = 1;
}
