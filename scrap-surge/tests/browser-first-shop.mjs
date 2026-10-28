// Astra's first-shop review, saved into the repo so it is reproducible instead
// of living only in /tmp. It drives real Chrome with ordinary keyboard and touch
// input over three seeds (2a/17/91) on both desktop and phone viewports and only
// reads window.scrapMetrics; it writes no HP, timer or entity state and uses no
// invulnerability. It checks that normal play actually reaches the first shop.
//
// The play policy is unchanged from the reviewed /tmp script. Configurable via
// BASE_URL (dev server or static host) and CHROME_PATH, like the other browser
// tests. Run with: node tests/browser-first-shop.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(process.cwd() + "/package.json")(
  "@playwright/test",
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const seeds = ["2a", "17", "91"];
async function run(seed, touch) {
  const context = await browser.newContext({
    viewport: touch
      ? { width: 390, height: 844 }
      : { width: 1440, height: 960 },
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: touch ? 2 : 1,
  });
  const p = await context.newPage(),
    cdp = touch ? await context.newCDPSession(p) : null;
  let held = new Set(),
    point,
    touching = false;
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const metrics = () => p.evaluate(() => window.scrapMetrics);
  async function release() {
    for (const k of held) await p.keyboard.up(k);
    held.clear();
    if (touching)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    touching = false;
  }
  try {
    await p.goto(
      (process.env.BASE_URL || "http://127.0.0.1:4188") +
        "/?mode=slice&seed=" +
        seed,
    );
    const start = p.locator("#start");
    if (touch) await start.tap();
    else await start.click();
    const begun = Date.now();
    while (Date.now() - begun < 35000) {
      const s = await metrics();
      if (s.phase === "shop" || s.phase === "lost" || s.phase === "won") {
        await release();
        return {
          mode: touch ? "touch" : "keyboard",
          seed,
          phase: s.phase,
          hp: s.hp,
          kills: s.kills,
          time: s.time,
          errors,
        };
      }
      if (s.phase === "paused") {
        await release();
        if (touch) await p.locator("#resume").tap();
        else await p.locator("#resume").click();
        continue;
      }
      const dx = s.position.x - 600,
        dy = s.position.y - 400,
        r = Math.hypot(dx, dy) || 1,
        c = Math.max(-1, Math.min(1, (210 - r) / 90)),
        vx = -dy / r + (dx / r) * c,
        vy = dx / r + (dy / r) * c;
      if (touch) {
        if (!touching) {
          const rect = await p.locator("#joystick").boundingBox();
          point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ ...point, id: 1 }],
          });
          touching = true;
        }
        const l = Math.hypot(vx, vy) || 1;
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: point.x + (vx / l) * 40, y: point.y + (vy / l) * 40, id: 1 },
          ],
        });
      } else {
        const next = new Set();
        if (vx > 0.32) next.add("KeyD");
        if (vx < -0.32) next.add("KeyA");
        if (vy > 0.32) next.add("KeyS");
        if (vy < -0.32) next.add("KeyW");
        for (const k of held) if (!next.has(k)) await p.keyboard.up(k);
        for (const k of next) if (!held.has(k)) await p.keyboard.down(k);
        held = next;
      }
      await p.waitForTimeout(80);
    }
    return {
      mode: touch ? "touch" : "keyboard",
      seed,
      phase: "timeout",
      metrics: await metrics(),
      errors,
    };
  } finally {
    await release();
    await context.close();
  }
}
try {
  const results = await Promise.all(
    [false, true].flatMap((t) => seeds.map((s) => run(s, t))),
  );
  // A 'timeout' run never counts as reaching the shop.
  const majorities = ["keyboard", "touch"].map((mode) => ({
    mode,
    shops: results.filter((r) => r.mode === mode && r.phase === "shop").length,
    total: 3,
  }));
  console.log(
    JSON.stringify(
      {
        normalInputsOnly: true,
        immediateMovement: true,
        performanceClaim: false,
        results,
        majorities,
      },
      null,
      2,
    ),
  );
  // Gate: each mode must reach the shop on at least two of three seeds, and no
  // run may log a page error. Fail the process (exit 1) otherwise.
  const errors = results.flatMap((r) => r.errors || []);
  const short = majorities.filter((m) => m.shops < 2);
  if (short.length || errors.length) {
    console.error(
      "first-shop review failed:",
      JSON.stringify({ short, errors }),
    );
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
