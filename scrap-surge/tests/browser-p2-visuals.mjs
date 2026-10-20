// Ordinary-input Stage D visual/audio-flow evidence.
//
// This plays the real expedition through W3: claim the W1 core, buy legal items
// and weapons at the W2 rest, then observe the actual elite warning/HP entity,
// defeat it through ordinary combat, collect its physical chest and claim the
// frozen next-rest reward when reachable. It never injects state, HP, clocks or
// invulnerability.
//
// Usage:
//   BASE_URL=http://127.0.0.1:4192 \
//   OUTPUT_DIR=/tmp/p2-stage-d-visuals \
//     node tests/browser-p2-visuals.mjs
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4192";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR || `/tmp/scrap-p2-visuals-${Date.now()}`;
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SEED = process.env.SEED || (process.env.CORE === "milestone" ? "2" : "1");
const CORE_PREFERENCE = [
  "scrap-popcorn",
  "volatile-trash",
  "magnetic-return",
  "milestone",
];
const CORE_OVERRIDE = process.env.CORE;
const ITEM_PREFERENCE = [
  "thick-shell",
  "siphon-bag",
  "long-barrel",
  "worn-sandals",
  "scrap-powder",
  "surfboard",
];
const WEAPON_PREFERENCE = ["rocket", "shotgun", "saw", "coil", "fist"];
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
    const repel = 2.7 * (1 - nearest / 112);
    vx += ((state.position.x - near.x) / (nearest || 1)) * repel;
    vy += ((state.position.y - near.y) / (nearest || 1)) * repel;
  }
  if (state.elite) {
    const ex = state.elite.x - state.position.x,
      ey = state.elite.y - state.position.y,
      ed = Math.hypot(ex, ey) || 1;
    if (ed < 260) {
      const repel = 2.2 * (1 - ed / 260);
      vx -= (ex / ed) * repel;
      vy -= (ey / ed) * repel;
    }
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

async function screenshot(page, kind, name, fullPage = true) {
  await page.screenshot({
    path: join(OUTPUT_DIR, `${kind}-${name}.png`),
    fullPage,
    animations: "disabled",
  });
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
        ".p2-rest .item-buy, .p2-rest .text-button, .p2-rest .weapon-card, .p2-rest #next-fast, .p2-rest #next-compact, .p2-rest #next",
      ),
    ].map((button) => ({
      selector:
        button.id ||
        button.dataset.buyItem ||
        button.dataset.buy ||
        button.dataset.claimCore ||
        button.dataset.claimChest ||
        button.dataset.stat ||
        button.textContent?.trim().slice(0, 24),
      disabled: button.disabled,
      ...rect(button),
    }));
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      overlayClientWidth: document.querySelector("#overlay")?.clientWidth ?? 0,
      overlayScrollWidth: document.querySelector("#overlay")?.scrollWidth ?? 0,
      footerPosition: getComputedStyle(
        document.querySelector(".p2-rest .shop-footer"),
      ).position,
      buttons,
    };
  });
}

function assertLayout(layout, mobile) {
  if (mobile) {
    assert.equal(layout.documentScrollWidth, layout.viewportWidth);
    assert(layout.overlayScrollWidth <= layout.overlayClientWidth + 1);
    assert.equal(layout.footerPosition, "static");
  }
  const undersized = layout.buttons.filter(
    (button) => button.visible && (button.width < 44 || button.height < 44),
  );
  assert.deepEqual(undersized, [], "visible rest actions must be >=44x44");
}

async function claimCore(page, mobile, state) {
  assert(
    (state.rewards?.items?.length ?? 0) > 0,
    `W1 core row was not awaiting a claim: ${JSON.stringify(state.rewards)}`,
  );
  await scrollTo(page, ".reward-row");
  const choices = state.rewards?.items ?? [];
  const coreId =
    CORE_OVERRIDE && choices.includes(CORE_OVERRIDE)
      ? CORE_OVERRIDE
      : CORE_PREFERENCE.find((id) => choices.includes(id));
  assert(coreId, `W1 must offer a natural core: ${choices}`);
  const index = choices.indexOf(coreId);
  await screenshot(page, mobile ? "touch" : "keyboard", "w1-core-before");
  if (mobile)
    await page
      .locator(`.reward-row .p2-item-card[data-item-card="${index}"]`)
      .click({ position: { x: 8, y: 8 } });
  await activate(
    page,
    mobile,
    mobile
      ? `#selected-item-detail [data-claim-core="${index}"]`
      : `.p2-item-card[data-item-card="${index}"] > .reward-choice-row [data-claim-core="${index}"]`,
  );
  await page.waitForFunction(
    (id) => window.scrapMetrics.inventory[id] >= 1,
    coreId,
  );
  return { coreId, index, before: state, after: await metrics(page) };
}

async function meaningfulPurchases(page, mobile, state) {
  const purchased = [];
  const itemIndex = state.itemOffers.findIndex((id) =>
    ITEM_PREFERENCE.includes(id),
  );
  if (itemIndex >= 0) {
    const itemId = state.itemOffers[itemIndex];
    const button = page.locator(
      `.shop-item-section .p2-item-card[data-item-card="${itemIndex}"] [data-buy-item="${itemIndex}"]`,
    );
    if ((await button.count()) === 1 && (await button.isEnabled())) {
      await scrollTo(page, ".shop-item-section");
      if (mobile)
        await page
          .locator(
            `.shop-item-section .p2-item-card[data-item-card="${itemIndex}"]`,
          )
          .click({ position: { x: 8, y: 8 } });
      await activate(
        page,
        mobile,
        mobile
          ? `#selected-item-detail [data-buy-item="${itemIndex}"]`
          : `.shop-item-section .p2-item-card[data-item-card="${itemIndex}"] [data-buy-item="${itemIndex}"]`,
      );
      await page.waitForFunction(
        (id) => window.scrapMetrics.inventory[id] >= 1,
        itemId,
      );
      purchased.push({ kind: "item", id: itemId, after: await metrics(page) });
    }
  }

  let now = await metrics(page);
  const weaponIndex = now.offers.findIndex((id) =>
    WEAPON_PREFERENCE.includes(id),
  );
  if (weaponIndex >= 0) {
    const button = page.locator(
      `.weapon-market .weapon-card[data-buy="${weaponIndex}"]`,
    );
    if ((await button.count()) === 1 && (await button.isEnabled())) {
      await scrollTo(page, ".weapon-market");
      await activate(
        page,
        mobile,
        `.weapon-market .weapon-card[data-buy="${weaponIndex}"]`,
      );
      await page.waitForFunction(
        (before) => window.scrapMetrics.guns.length > before,
        now.guns.length,
      );
      const after = await metrics(page);
      purchased.push({
        kind: "weapon",
        id: after.guns.at(-1),
        after,
      });
    }
  }
  return purchased;
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
  let driver;
  const observed = {
    reachedW3: false,
    eliteWarning: null,
    eliteLive: null,
    eliteSeenAt: 0,
    eliteDefeated: false,
    chestSeen: null,
    chestCollected: false,
    frozenChest: null,
    trailSeen: [],
    trailCaptured: false,
  };
  try {
    await page.goto(`${BASE_URL}/?mode=expedition20&seed=${SEED}`);
    if (mobile) await page.locator("#start").tap();
    else await page.locator("#start").click();
    driver = mobile
      ? await touchDriver(page, context)
      : await keyboardDriver(page);
    const startAt = Date.now();
    let coreDone = false;
    let restDone = false;
    const restReports = [];
    let chestSeenAt = 0;
    while (Date.now() - startAt < 240000) {
      const state = await metrics(page);
      if (state.phase === "lost" || state.phase === "won") {
        if (state.wave === 3 && observed.eliteSeenAt > 0)
          throw new Error(
            `${kind} died in W3 after observing the elite at hp ${state.hp}`,
          );
        throw new Error(
          `${kind} ended W${state.wave}: ${state.phase}, hp=${state.hp}`,
        );
      }
      if (state.phase === "paused") {
        await driver.release();
        await activate(page, mobile, "#resume");
        continue;
      }
      if (state.phase === "shop" && state.wave === 1 && !coreDone) {
        await driver.release();
        if (!(state.rewards?.items?.length > 0)) {
          coreDone = true;
          await activate(page, mobile, "#next-fast");
          await page.waitForFunction(
            () =>
              window.scrapMetrics.phase === "fight" &&
              window.scrapMetrics.wave === 2,
          );
          continue;
        }
        const layout = await layoutReport(page);
        assertLayout(layout, mobile);
        const core = await claimCore(page, mobile, state);
        await screenshot(
          page,
          mobile ? "touch" : "keyboard",
          "w1-core-claimed",
        );
        restReports.push({ wave: 1, layout, core });
        coreDone = true;
        await activate(page, mobile, "#next-fast");
        await page.waitForFunction(
          () =>
            window.scrapMetrics.phase === "fight" &&
            window.scrapMetrics.wave === 2,
        );
        continue;
      }
      if (state.phase === "shop" && state.wave === 2 && !restDone) {
        await driver.release();
        const layout = await layoutReport(page);
        assertLayout(layout, mobile);
        await screenshot(page, mobile ? "touch" : "keyboard", "w2-rest-before");
        const purchases = await meaningfulPurchases(page, mobile, state);
        const after = await metrics(page);
        if ((after.inventory["scrap-popcorn"] ?? 0) > 0)
          assert(after.queueCounters.popcorn.processed > 0);
        await scrollTo(page, ".shop-item-section");
        await screenshot(page, mobile ? "touch" : "keyboard", "w2-rest-after");
        restReports.push({
          wave: 2,
          layout,
          purchases,
          before: state,
          after,
        });
        restDone = true;
        await activate(page, mobile, "#next-fast");
        await page.waitForFunction(
          () =>
            window.scrapMetrics.phase === "fight" &&
            window.scrapMetrics.wave === 3,
        );
        observed.reachedW3 = true;
        continue;
      }
      if (state.phase === "shop" && state.wave === 3) {
        await driver.release();
        observed.frozenChest = state.rewards?.chest ?? null;
        if (observed.frozenChest) {
          await screenshot(
            page,
            mobile ? "touch" : "keyboard",
            "w3-chest-choice",
          );
          const available = observed.frozenChest.available.findIndex(Boolean);
          if (available >= 0) {
            if (mobile) {
              await page
                .locator(
                  `.reward-row .p2-item-card[data-item-card="${available}"]`,
                )
                .click({ position: { x: 8, y: 8 } });
              assert.equal(
                await page
                  .locator("#selected-item-detail")
                  .getAttribute("data-selected"),
                observed.frozenChest.itemIds[available],
              );
            }
            await activate(
              page,
              mobile,
              mobile
                ? `#selected-item-detail [data-claim-chest="${available}"]`
                : `.reward-row .p2-item-card[data-item-card="${available}"] > .reward-choice-row [data-claim-chest="${available}"]`,
            );
            observed.frozenChest.claimed = true;
          } else observed.frozenChest.claimed = false;
        }
        await screenshot(page, mobile ? "touch" : "keyboard", "w3-rest");
        assert.deepEqual(errors, []);
        return {
          kind,
          status: "completed",
          observed,
          restReports,
          errors,
        };
      }

      if (state.phase === "fight") {
        const { vx, vy } = steer(state);
        await driver.move(vx, vy);
        if (state.wave === 3) {
          if (state.eliteWarning?.remaining > 0 && !observed.eliteWarning) {
            observed.eliteWarning = state.eliteWarning;
            await page.screenshot({
              path: join(OUTPUT_DIR, `${kind}-w3-elite-warning-desktop.png`),
              animations: "disabled",
            });
          }
          if (state.elite && !observed.eliteLive) {
            observed.eliteLive = state.elite;
            observed.eliteSeenAt = Date.now();
            assert(state.elite.maxHp === 360);
            assert(state.elite.radius === 28);
            await page.screenshot({
              path: join(OUTPUT_DIR, `${kind}-w3-elite-live-desktop.png`),
              animations: "disabled",
            });
          }
          if (state.elite)
            observed.eliteLive = {
              ...state.elite,
              lastHp: state.elite.hp,
            };
          if (observed.eliteLive && !state.elite && !observed.eliteDefeated) {
            observed.eliteDefeated = true;
          }
          if (state.chest.length && !observed.chestSeen) {
            observed.chestSeen = state.chest[0];
            chestSeenAt = Date.now();
            await page.screenshot({
              path: join(OUTPUT_DIR, `${kind}-w3-chest-live-desktop.png`),
              animations: "disabled",
            });
          }
          if (state.chest.length && Date.now() - chestSeenAt < 5000) {
            const chest = state.chest[0];
            const dx = chest.x - state.position.x,
              dy = chest.y - state.position.y,
              d = Math.hypot(dx, dy) || 1;
            await driver.move(dx / d, dy / d);
            await wait(70);
            continue;
          }
          if (state.trailPoints?.length) {
            observed.trailSeen.push(...state.trailPoints);
            if (!observed.trailCaptured) {
              observed.trailCaptured = true;
              await page.screenshot({
                path: join(OUTPUT_DIR, `${kind}-w3-trail-desktop.png`),
                animations: "disabled",
              });
            }
          }
          if (
            observed.chestSeen &&
            state.chest.length === 0 &&
            state.frozenChest?.source === "elite"
          )
            observed.chestCollected = true;
        }
      }
      await wait(70);
    }
    throw new Error(`${kind} did not reach the W3 elite flow`);
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
  ordinaryInputsOnly: true,
  noStateInjection: true,
  noInvulnerability: true,
  noClockSkip: true,
  fullRunClaim: false,
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
      results: results.map((result) => ({
        kind: result.kind,
        status: result.status,
        failure: result.failure,
        errors: result.errors,
        reachedW3: result.observed?.reachedW3,
        elite: result.observed?.eliteLive,
        chest: result.observed?.chestSeen,
        frozenChest: result.observed?.frozenChest?.source,
        trailCount: result.observed?.trailSeen?.length,
        purchases: result.restReports?.[1]?.purchases?.map((p) => p.id),
      })),
    },
    null,
    2,
  ),
);
if (results.some((result) => result.status !== "completed"))
  process.exitCode = 1;
