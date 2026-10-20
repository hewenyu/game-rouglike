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
const PREVIEW_ITEM_ID = "siphon-bag";
const PREVIEW_REWARD_ID = "magnetic-return";
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
    const font = (selector) => {
      const node = document.querySelector(selector);
      return node ? parseFloat(getComputedStyle(node).fontSize) : null;
    };
    const detail = document.querySelector("#selected-item-detail");
    const reward = document.querySelector(".reward-row");
    const rewardCards = [
      ...document.querySelectorAll(".reward-row .p2-item-card"),
    ];
    const restSections = [...document.querySelectorAll(".p2-rest > *")];
    const nestedScroll = [...document.querySelectorAll(".p2-rest *")].filter(
      (node) => {
        const style = getComputedStyle(node);
        const scrollable = [style.overflowX, style.overflowY].some(
          (value) => value === "scroll" || value === "auto",
        );
        return (
          scrollable &&
          (node.scrollHeight > node.clientHeight + 2 ||
            node.scrollWidth > node.clientWidth + 2)
        );
      },
    ).length;
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
    const cards = cardNodes.map((card) => ({
      id: card.dataset.itemId,
      ...rect(card),
    }));
    const cardLabelOverflow = [
      ...document.querySelectorAll(".p2-item-card .item-code"),
    ].filter((node) => node.scrollWidth > node.clientWidth + 1).length;
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      overlayClientWidth: document.querySelector("#overlay")?.clientWidth ?? 0,
      overlayScrollWidth: document.querySelector("#overlay")?.scrollWidth ?? 0,
      footerPosition: getComputedStyle(
        document.querySelector(".p2-rest .shop-footer"),
      ).position,
      unselectableCards: cardNodes.filter(
        (card) => !card.hasAttribute("data-select-item"),
      ).length,
      visibleDetailTemplates: [
        ...document.querySelectorAll(".item-detail-template"),
      ].filter((node) => getComputedStyle(node).display !== "none").length,
      cardOverflow: cards.some(
        (card) => card.left < 0 || card.right > window.innerWidth + 0.5,
      ),
      cardLabelOverflow,
      cards,
      buttons,
      cardCounts: {
        weapon: document.querySelectorAll(".weapon-market .weapon-card").length,
        item: document.querySelectorAll(".shop-item-section .p2-item-card")
          .length,
        reward: rewardCards.length,
        stat: document.querySelectorAll(".stat-choice").length,
      },
      fonts: {
        cardTitle: font(".p2-item-card h3"),
        cardLabel: font(".p2-item-card .item-code"),
        cardMeta: font(".p2-item-card .item-meta"),
        detailDescription: font("#selected-item-detail p"),
        detailEffect: font("#selected-item-detail .detail-proc"),
      },
      detail: detail
        ? {
            id: detail.dataset.selected,
            group: detail.previousElementSibling?.className ?? "",
            text: detail.innerText,
            directlyAfterReward:
              !!reward && detail.previousElementSibling === reward,
            rewardOffset:
              reward && restSections.includes(reward)
                ? restSections.indexOf(detail) - restSections.indexOf(reward)
                : null,
          }
        : null,
      noise: document.body.innerText,
      nestedScroll,
      nextReachable: (() => {
        const next = document.querySelector("#next");
        if (!next) return false;
        const overlay = document.querySelector("#overlay");
        const prior = overlay.scrollTop;
        overlay.scrollTop = overlay.scrollHeight;
        const rect = next.getBoundingClientRect();
        overlay.scrollTop = prior;
        return rect.top >= 0 && rect.bottom <= window.innerHeight + 1;
      })(),
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
    assert.equal(
      layout.cardLabelOverflow,
      0,
      "P2 family labels must not be ellipsized",
    );
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
    assert.equal(layout.cardCounts.weapon, 3);
    assert(layout.cardCounts.item >= 1 && layout.cardCounts.item <= 3);
    assert(layout.cardCounts.reward <= 3 || layout.cardCounts.stat === 3);
    assert(layout.fonts.cardTitle >= 14);
    assert(layout.fonts.cardLabel >= 11);
    assert(layout.fonts.cardMeta >= 11);
    assert(layout.fonts.detailDescription >= 14);
    assert(layout.fonts.detailEffect >= 14);
    assert.equal(layout.nestedScroll, 0);
    assert(layout.nextReachable);
    const noiseMatch = layout.noise.match(
      /(派生|冻住|重新校验|现金替代|×P|\bF4\b|因果根)/,
    );
    assert(
      !noiseMatch,
      `player-facing engineering prose: ${noiseMatch?.[0]}\n${layout.noise}`,
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
        const coreId = CORE_PREFERENCE.find((id) => coreChoices.includes(id));
        assert(coreId, `W1 must offer a natural proc core: ${coreChoices}`);
        const coreIndex = coreChoices.indexOf(coreId);
        const before = state;
        const layout = await layoutReport(page);
        assertLayout(layout, mobile);
        assert(layout.cardCounts.reward > 0);
        assert(layout.detail?.directlyAfterReward);
        assert(
          coreChoices.includes(layout.detail?.id),
          `default detail must be an available W1 core: ${layout.detail?.id}`,
        );
        assert(/(当前效果|效果数值|机制强度)/.test(layout.detail?.text ?? ""));

        const previewItemIndex = state.itemOffers.indexOf(PREVIEW_ITEM_ID);
        const previewRewardIndex =
          state.rewards?.items?.indexOf(PREVIEW_REWARD_ID) ?? -1;
        assert.equal(
          previewItemIndex,
          0,
          `seed ${SEED} must put ${PREVIEW_ITEM_ID} at shop index 0`,
        );
        assert.equal(
          previewRewardIndex,
          0,
          `seed ${SEED} must put ${PREVIEW_REWARD_ID} at reward index 0`,
        );
        await scrollTo(page, ".shop-item-section");
        await page
          .locator(
            `.shop-item-section .p2-item-card[data-item-card="${previewItemIndex}"]`,
          )
          .click({ position: { x: 8, y: 8 } });
        assert.equal(
          await page
            .locator("#selected-item-detail")
            .getAttribute("data-selected"),
          PREVIEW_ITEM_ID,
        );
        await activate(
          page,
          mobile,
          mobile
            ? `#selected-item-detail [data-buy-item="${previewItemIndex}"]`
            : `.shop-item-section .p2-item-card[data-item-card="${previewItemIndex}"] > .item-buy-row [data-buy-item="${previewItemIndex}"]`,
        );
        await page.waitForFunction(
          (id) => window.scrapMetrics.inventory[id] >= 1,
          PREVIEW_ITEM_ID,
        );
        const afterPreviewBuy = await metrics(page);
        assert.equal(afterPreviewBuy.inventory[PREVIEW_ITEM_ID], 1);
        assert.equal(afterPreviewBuy.inventory[PREVIEW_REWARD_ID], 0);
        assert(
          afterPreviewBuy.rewards.items.includes(PREVIEW_REWARD_ID),
          "reward must remain unclaimed after buying the same-index shop card",
        );

        await scrollTo(page, ".reward-row");
        await page
          .locator(
            `.reward-row .p2-item-card[data-item-card="${previewRewardIndex}"]`,
          )
          .click({ position: { x: 8, y: 8 } });
        assert.equal(
          await page
            .locator("#selected-item-detail")
            .getAttribute("data-selected"),
          PREVIEW_REWARD_ID,
        );
        const previewDetail = await page
          .locator("#selected-item-detail")
          .innerText();
        assert(
          /当前：伤害 25 · 半径 375 · 触发 8 · 数量 10/.test(
            previewDetail,
          ),
          `unclaimed reward must project actual siphon outputs: ${previewDetail}`,
        );
        assert(
          /拾取范围 194 → 375/.test(previewDetail),
          `unclaimed reward must project pickup radius: ${previewDetail}`,
        );
        await scrollTo(page, ".shop-item-section");
        await page
          .locator(
            `.shop-item-section .p2-item-card[data-item-card="${previewItemIndex}"]`,
          )
          .click({ position: { x: 8, y: 8 } });
        const siphonDetail = await page
          .locator("#selected-item-detail")
          .innerText();
        assert(
          /当前：伤害倍率 ×1\.25 · 半径 194/.test(siphonDetail),
          `siphon multiplier must remain dimensionless: ${siphonDetail}`,
        );
        assert(
          !/当前：伤害 1\.3/.test(siphonDetail),
          `siphon multiplier must not be labeled as damage: ${siphonDetail}`,
        );
        assert(
          !/点选查看效果 · 点选查看完整效果/.test(layout.noise),
          "item cards must keep one selection instruction",
        );
        await page.screenshot({
          path: join(
            OUTPUT_DIR,
            `${kind}-w1-after-item-buy-inspect-core.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });

        const beforeClaim = await metrics(page);
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
            await page
              .locator("#selected-item-detail")
              .getAttribute("data-selected"),
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
        assert.equal(after.money, beforeClaim.money);
        assert.deepEqual(after.rewards.items, []);
        procBaseline = {
          core: coreId,
          before: beforeClaim,
          after,
          layout,
          preview: {
            itemIndex: previewItemIndex,
            rewardIndex: previewRewardIndex,
            beforeBuy: before,
            afterBuy: afterPreviewBuy,
            detail: previewDetail,
            siphonDetail,
          },
        };
        await page.screenshot({
          path: join(OUTPUT_DIR, `${kind}-w1-core-claimed.png`),
          fullPage: true,
          animations: "disabled",
        });
        coreClaimed = true;
        await activate(page, mobile, "#next-fast");
        await page.waitForFunction(
          () =>
            window.scrapMetrics.phase === "fight" &&
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
        await page
          .locator(
            `.shop-item-section .p2-item-card[data-item-card="${itemIndex}"]`,
          )
          .click({ position: { x: 8, y: 8 } });
        assert.equal(
          await page
            .locator("#selected-item-detail")
            .getAttribute("data-selected"),
          ITEM_ID,
        );
        const layout = await layoutReport(page);
        assertLayout(layout, mobile);
        assert(layout.detail?.group?.includes("shop-item-section"));
        assert(layout.detail?.rewardOffset >= 1);
        assert(
          /(当前效果|效果数值|数值变化|机制强度)/.test(
            layout.detail?.text ?? "",
          ),
        );
        assert(
          /生命上限 10 → 12/.test(layout.detail?.text ?? ""),
          `厚壳 detail must show its own derived change: ${layout.detail?.text}`,
        );
        assert(
          !/废料爆米花/.test(layout.detail?.text ?? ""),
          `厚壳 detail must not show unrelated held procs: ${layout.detail?.text}`,
        );
        const priceText = await page
          .locator(".shop-item-section .item-price")
          .nth(itemIndex)
          .innerText();
        const price = Number(priceText.replace(/[^0-9]/g, ""));
        assert(price > 0, `item price must be visible: ${priceText}`);
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
          before.popcornShotsAdmitted > 0,
          `W2 must admit real popcorn shots: ${JSON.stringify({
            fuel: before.popcornFuelConsumed,
            admitted: before.popcornShotsAdmitted,
            rejected: before.popcornShotsRejected,
          })}`,
        );
        assert(before.popcornFuelConsumed > 0);
        assert(before.queueCounters.popcorn.admitted > 0);
        assert.equal(
          before.queueCounters.popcorn.processed,
          before.popcornFuelConsumed,
          "processed popcorn queue work must be consumed fuel units",
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
          proc: {
            fuelConsumed: before.popcornFuelConsumed,
            shotsAdmitted: before.popcornShotsAdmitted,
            shotsRejected: before.popcornShotsRejected,
            queue: before.queueCounters.popcorn,
          },
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
await writeFile(
  join(OUTPUT_DIR, "report.json"),
  JSON.stringify(report, null, 2),
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
