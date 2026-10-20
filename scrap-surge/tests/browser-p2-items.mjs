// Ordinary-input P2 item integration check.
//
// Play W1 and W2 through the real UI: claim the natural W1 core reward, observe
// its real W2 proc counters, then buy an item at the W2 rest. The script only
// reads window.scrapMetrics and DOM geometry; it never writes game, HP, timer or
// entity state and never enables invulnerability.
//
// Usage:
//   BASE_URL=http://127.0.0.1:4192 node tests/browser-p2-items.mjs
//   OUTPUT_DIR=/tmp/p2-items BASE_URL=... node tests/browser-p2-items.mjs
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4192";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR || `/tmp/scrap-p2-items-${Date.now()}`;
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SEED = process.env.SEED || "1";
const CORE_PREFERENCE = [
  "scrap-popcorn",
  "volatile-trash",
  "magnetic-return",
  "milestone",
];
const ITEM_ID = "thick-shell";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const metrics = (page) => page.evaluate(() => window.scrapMetrics);

await mkdir(OUTPUT_DIR, { recursive: true });

function steer(state) {
  const dx = state.position.x - 600,
    dy = state.position.y - 450,
    r = Math.hypot(dx, dy) || 1,
    center = Math.max(-1, Math.min(1, (220 - r) / 90));
  let vx = -dy / r + (dx / r) * center,
    vy = dx / r + (dy / r) * center;
  let nearest = 112,
    near = null;
  for (const enemy of state.enemyPositions || []) {
    const d = Math.hypot(enemy.x - state.position.x, enemy.y - state.position.y);
    if (d < nearest) {
      nearest = d;
      near = enemy;
    }
  }
  if (near) {
    const repel = 2.6 * (1 - nearest / 112);
    vx += ((state.position.x - near.x) / (nearest || 1)) * repel;
    vy += ((state.position.y - near.y) / (nearest || 1)) * repel;
  }
  return { vx, vy };
}

async function keyboardDriver(page) {
  let held = new Set();
  return {
    async release() {
      for (const key of held) await page.keyboard.up(key);
      held = new Set();
    },
    async move(vx, vy) {
      const wanted = new Set();
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
    },
  };
}

async function touchDriver(page, context) {
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

async function activate(page, mobile, selector) {
  const locator = page.locator(selector);
  assert.equal(await locator.count(), 1, `${selector} must be unique`);
  assert(await locator.isVisible(), `${selector} must be visible`);
  assert(await locator.isEnabled(), `${selector} must be enabled`);
  if (mobile) await locator.tap();
  else await locator.click();
}

async function scrollTo(page, selector) {
  const locator = page.locator(selector).first();
  assert(await locator.count(), `${selector} must exist`);
  await locator.scrollIntoViewIfNeeded();
}

async function layoutReport(page) {
  return page.evaluate(() => {
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return {
        width: +r.width.toFixed(1),
        height: +r.height.toFixed(1),
        left: +r.left.toFixed(1),
        right: +r.right.toFixed(1),
        visible: r.width > 0 && r.height > 0,
      };
    };
    const buttons = [
      ...document.querySelectorAll(
        ".p2-rest .item-buy, .p2-rest .text-button, .p2-rest #next-fast, .p2-rest #next-compact, .p2-rest #next",
      ),
    ].map((button) => ({
      selector:
        button.id ||
        button.dataset.buyItem ||
        button.dataset.claimCore ||
        button.dataset.claimChest ||
        button.dataset.stat ||
        button.textContent?.trim().slice(0, 24),
      disabled: button.disabled,
      ...rect(button),
    }));
    const cardNodes = [...document.querySelectorAll(".p2-item-card")];
    const cards = cardNodes.map(
      (card) => ({
        id: card.dataset.itemId,
        ...rect(card),
      }),
    );
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      overlayClientWidth: document.querySelector("#overlay")?.clientWidth ?? 0,
      overlayScrollWidth: document.querySelector("#overlay")?.scrollWidth ?? 0,
      footerPosition:
        getComputedStyle(document.querySelector(".p2-rest .shop-footer"))
          .position,
      unselectableCards: cardNodes.filter(
        (card) => !card.hasAttribute("data-select-item"),
      ).length,
      visibleDetailTemplates: [
        ...document.querySelectorAll(".item-detail-template"),
      ].filter((node) => getComputedStyle(node).display !== "none").length,
      cardOverflow: cards.some(
        (card) => card.left < 0 || card.right > window.innerWidth + 0.5,
      ),
      cards,
      buttons,
    };
  });
}

function assertLayout(layout, mobile) {
  if (mobile) {
    assert.equal(
      layout.documentScrollWidth,
      layout.viewportWidth,
      "390px fixture must not create horizontal document overflow",
    );
    assert(layout.overlayScrollWidth <= layout.overlayClientWidth + 1);
    assert(!layout.cardOverflow, "P2 item cards must stay inside 390px");
    assert.equal(layout.unselectableCards, 0);
    assert.equal(
      layout.visibleDetailTemplates,
      0,
      "detail templates must stay inert inside cards",
    );
    assert.equal(
      layout.footerPosition,
      "static",
      "mobile P2 footer must not cover selectable content",
    );
  }
  const visibleButtons = layout.buttons.filter((button) => button.visible);
  const undersized = visibleButtons.filter(
    (button) => button.width < 44 || button.height < 44,
  );
  assert.deepEqual(undersized, [], "visible rest actions must be >=44x44");
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
  page.on("pageerror", (error) => errors.push(error.message));
  let driver;
  try {
    await page.goto(`${BASE_URL}/?mode=expedition20&seed=${SEED}`);
    const start = page.locator("#start");
    if (mobile) await start.tap();
    else await start.click();
    driver = mobile
      ? await touchDriver(page, context)
      : await keyboardDriver(page);
    const begun = Date.now();
    let coreClaimed = false;
    let procBaseline = null;

    while (Date.now() - begun < 120000) {
      const state = await metrics(page);
      if (state.phase === "lost" || state.phase === "won")
        throw new Error(
          `${kind} run ended at W${state.wave}: ${state.phase}, hp=${state.hp}`,
        );
      if (state.phase === "paused") {
        await driver.release();
        await activate(page, mobile, "#resume");
        continue;
      }

      if (state.phase === "shop" && state.wave === 1 && !coreClaimed) {
        await driver.release();
        await scrollTo(page, ".reward-row");
        const coreChoices = state.rewards?.items ?? [];
        const coreId = CORE_PREFERENCE.find((id) =>
          coreChoices.includes(id),
        );
        assert(coreId, `W1 must offer a natural proc core: ${coreChoices}`);
        const coreIndex = coreChoices.indexOf(coreId);
        const before = state;
        const layout = await layoutReport(page);
        assertLayout(layout, mobile);
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-w1-core-before.png`),
          fullPage: true,
          animations: "disabled",
        });
        if (mobile) {
          await page
            .locator(`.reward-row .p2-item-card[data-item-card="${coreIndex}"]`)
            .click({ position: { x: 8, y: 8 } });
          assert.equal(
            await page.locator("#selected-item-detail").getAttribute(
              "data-selected",
            ),
            coreId,
          );
        }
        await activate(
          page,
          mobile,
          mobile
            ? `#selected-item-detail [data-claim-core="${coreIndex}"]`
            : `.p2-item-card[data-item-card="${coreIndex}"] > .reward-choice-row [data-claim-core="${coreIndex}"]`,
        );
        await page.waitForFunction(
          (id) => window.scrapMetrics.inventory[id] >= 1,
          coreId,
        );
        const after = await metrics(page);
        assert.equal(after.inventory[coreId], 1);
        assert.equal(after.money, before.money);
        assert.deepEqual(after.rewards.items, []);
        procBaseline = {
          core: coreId,
          before,
          after,
          layout,
        };
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-w1-core-claimed.png`),
          fullPage: true,
          animations: "disabled",
        });
        coreClaimed = true;
        await activate(page, mobile, "#next-fast");
        await page.waitForFunction(
          () => window.scrapMetrics.phase === "fight" &&
            window.scrapMetrics.wave === 2,
        );
        continue;
      }

      if (state.phase === "shop" && state.wave === 2) {
        await driver.release();
        assert(coreClaimed, "W2 rest must follow the W1 core claim");
        const before = state;
        const itemIndex = before.itemOffers.indexOf(ITEM_ID);
        assert(
          itemIndex >= 0,
          `seed ${SEED} must offer ${ITEM_ID}: ${before.itemOffers}`,
        );
        const itemButton = page.locator(
          `.p2-item-card[data-item-card="${itemIndex}"] > .item-buy-row [data-buy-item="${itemIndex}"]`,
        );
        assert.equal(await itemButton.count(), 1);
        assert(await itemButton.isVisible());
        assert(await itemButton.isEnabled());
        await scrollTo(page, ".shop-item-section");
        const layout = await layoutReport(page);
        assertLayout(layout, mobile);
        const priceText = await page
          .locator(".shop-item-section .item-price")
          .nth(itemIndex)
          .innerText();
        const price = Number(priceText.replace(/[^0-9]/g, ""));
        assert(price > 0, `item price must be visible: ${priceText}`);
        if (mobile) {
          await page
            .locator(`.shop-item-section .p2-item-card[data-item-card="${itemIndex}"]`)
            .click({ position: { x: 8, y: 8 } });
          assert.equal(
            await page.locator("#selected-item-detail").getAttribute(
              "data-selected",
            ),
            ITEM_ID,
          );
        }
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-w2-item-before.png`),
          fullPage: true,
          animations: "disabled",
        });
        await activate(
          page,
          mobile,
          mobile
            ? `#selected-item-detail [data-buy-item="${itemIndex}"]`
            : `.p2-item-card[data-item-card="${itemIndex}"] > .item-buy-row [data-buy-item="${itemIndex}"]`,
        );
        await page.waitForFunction(
          (id) => window.scrapMetrics.inventory[id] >= 1,
          ITEM_ID,
        );
        const after = await metrics(page);
        assert(after.inventory[ITEM_ID] >= 1);
        assert.equal(after.money, before.money - price);
        assert.equal(after.maxHp, before.maxHp + 2);
        assert.equal(after.derived.moveFactor < 1, true);
        assert(
          before.queueCounters.popcorn.processed > 0,
          `W2 must show real popcorn processing: ${JSON.stringify(before.queueCounters.popcorn)}`,
        );
        assert(
          before.queueCounters.popcorn.admitted >=
            before.queueCounters.popcorn.processed,
        );
        await scrollTo(page, ".shop-item-section");
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-w2-item-after.png`),
          fullPage: true,
          animations: "disabled",
        });
        reports.push({
          kind,
          core: procBaseline,
          item: {
            id: ITEM_ID,
            index: itemIndex,
            priceText,
            price,
            layout,
            before,
            after,
          },
          proc: before.queueCounters.popcorn,
          blasts: before.queueCounters.pendingBlasts,
        });
        assert.deepEqual(errors, []);
        return { kind, status: "completed", reports, errors };
      }

      if (state.phase === "fight") {
        const { vx, vy } = steer(state);
        await driver.move(vx, vy);
      }
      await wait(70);
    }
    throw new Error(`${kind} run did not reach the W2 item rest`);
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
const report = {
  baseUrl: BASE_URL,
  seed: SEED,
  normalInputsOnly: true,
  noStateInjection: true,
  noInvulnerability: true,
  results,
};
await writeFile(join(OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      outputDir: OUTPUT_DIR,
      checks: results.map((result) => ({
        kind: result.kind,
        status: result.status,
        failure: result.failure,
        errors: result.errors,
        core: result.reports?.[0]?.core?.core,
        item: result.reports?.[0]?.item?.id,
        popcorn: result.reports?.[0]?.proc,
      })),
    },
    null,
    2,
  ),
);
if (results.some((result) => result.status !== "completed")) {
  process.exitCode = 1;
}
