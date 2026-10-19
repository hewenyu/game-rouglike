// Focused visual evidence for enemy-projectile draw order.
//
// Usage:
//   BASE_URL=http://127.0.0.1:4188 OUTPUT_DIR=/tmp/occlusion-after \
//     EXPECT_VISIBLE=1 node tests/browser-render-occlusion.mjs
//
// The synthetic fixture is deliberately not normal gameplay: it puts an enemy
// bullet at the centre of an opaque blast and a domino/ember effect. The same
// fixture is run against the pre-fix and fixed source when collecting evidence.
// The optional ordinary-input slice capture waits for a real accepted enemy
// projectile, then preserves sequential canvas frames for human visual review.
// That counter alone is not treated as proof that a bullet is visible.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4188";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ||
  `/tmp/scrap-render-occlusion-${Date.now()}-${process.pid}`;
const EXPECT_VISIBLE = process.env.EXPECT_VISIBLE !== "0";
const RUN_NORMAL = process.env.RUN_NORMAL !== "0";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VISUAL_COEXISTENCE = "requires-manual-review";

function harnessOutcome({
  syntheticPass,
  runNormal,
  normalCaptures,
  pageErrors,
}) {
  const syntheticOnly = !runNormal;
  const normalCaptureReached = syntheticOnly
    ? null
    : normalCaptures > 0
      ? "captured"
      : "not-reached";
  return {
    syntheticOnly,
    normalCaptureReached,
    visualCoexistence: VISUAL_COEXISTENCE,
    pass:
      syntheticPass &&
      pageErrors.length === 0 &&
      (syntheticOnly || normalCaptures > 0),
  };
}

if (process.env.HARNESS_SELF_CHECK === "1") {
  const cases = [
    {
      name: "synthetic only",
      input: {
        syntheticPass: true,
        runNormal: false,
        normalCaptures: 0,
        pageErrors: [],
      },
      expected: {
        syntheticOnly: true,
        normalCaptureReached: null,
        visualCoexistence: VISUAL_COEXISTENCE,
        pass: true,
      },
    },
    {
      name: "normal lost or deadline with no capture",
      input: {
        syntheticPass: true,
        runNormal: true,
        normalCaptures: 0,
        pageErrors: [],
      },
      expected: {
        syntheticOnly: false,
        normalCaptureReached: "not-reached",
        visualCoexistence: VISUAL_COEXISTENCE,
        pass: false,
      },
    },
    {
      name: "normal capture with page error",
      input: {
        syntheticPass: true,
        runNormal: true,
        normalCaptures: 1,
        pageErrors: ["boom"],
      },
      expected: {
        syntheticOnly: false,
        normalCaptureReached: "captured",
        visualCoexistence: VISUAL_COEXISTENCE,
        pass: false,
      },
    },
    {
      name: "normal capture without errors",
      input: {
        syntheticPass: true,
        runNormal: true,
        normalCaptures: 1,
        pageErrors: [],
      },
      expected: {
        syntheticOnly: false,
        normalCaptureReached: "captured",
        visualCoexistence: VISUAL_COEXISTENCE,
        pass: true,
      },
    },
    {
      name: "synthetic failure",
      input: {
        syntheticPass: false,
        runNormal: false,
        normalCaptures: 0,
        pageErrors: [],
      },
      expected: {
        syntheticOnly: true,
        normalCaptureReached: null,
        visualCoexistence: VISUAL_COEXISTENCE,
        pass: false,
      },
    },
  ];
  for (const entry of cases)
    assert.deepEqual(
      harnessOutcome(entry.input),
      entry.expected,
      entry.name,
    );
  console.log(
    JSON.stringify(
      {
        harnessSelfCheck: "passed",
        cases: cases.map((entry) => entry.name),
        visualCoexistence: VISUAL_COEXISTENCE,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
});
const report = {
  baseUrl: BASE_URL,
  expectedVisible: EXPECT_VISIBLE,
  syntheticOnly: !RUN_NORMAL,
  synthetic: [],
  normalCaptureReached: null,
  normalSlice: null,
  visualCoexistence: VISUAL_COEXISTENCE,
  errors: [],
};

async function fixturePage(viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: viewport.width <= 390,
    isMobile: viewport.width <= 390,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    report.errors.push(`${viewport.width}x${viewport.height}: ${error.message}`),
  );
  await page.route("**/__render_occlusion_fixture.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden}canvas{display:block}</style></head><body></body></html>',
    }),
  );
  await page.goto(`${BASE_URL}/__render_occlusion_fixture.html`);
  return { context, page };
}

async function synthetic(viewport) {
  const { context, page } = await fixturePage(viewport);
  const result = await page.evaluate(async () => {
    const { Renderer } = await import("/src/render.ts");
    const { Game } = await import("/src/sim.ts");
    const { BLAST } = await import("/src/data.ts");

    document.body.innerHTML = "";
    Object.assign(document.documentElement.style, {
      margin: "0",
      background: "#e8c696",
    });
    Object.assign(document.body.style, {
      margin: "0",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
    });
    const canvas = document.createElement("canvas");
    canvas.id = "occlusion-fixture";
    Object.assign(canvas.style, {
      display: "block",
      width: `${innerWidth}px`,
      height: `${innerHeight}px`,
    });
    document.body.append(canvas);

    const g = new Game(42, "expedition20");
    g.enemies = [];
    g.guns = [];
    g.bullets = [
      {
        x: 560,
        y: 450,
        id: 1,
        vx: 100,
        vy: 0,
        damage: 1,
        life: 1,
        kind: "cap",
        target: 0,
        r: 5,
        homing: false,
      },
      {
        x: 600,
        y: 450,
        id: 2,
        vx: 100,
        vy: 0,
        damage: 1,
        life: 1,
        kind: "enemy",
        target: 0,
        r: 7,
        homing: false,
      },
      {
        x: 640,
        y: 450,
        id: 3,
        vx: 100,
        vy: 0,
        damage: 1,
        life: 1,
        kind: "rocket",
        target: 0,
        r: 8,
        homing: false,
      },
    ];
    g.fx = [
      {
        kind: "blast",
        x: 600,
        y: 450,
        life: 0.7,
        max: 1,
        color: "#efaa39",
        size: 130,
      },
      {
        kind: "domino-blast",
        x: 600,
        y: 450,
        life: 0.4,
        max: 0.8,
        color: "#f6c35c",
        size: 70,
      },
      {
        kind: "ember",
        x: 600,
        y: 450,
        life: 0.3,
        max: 0.6,
        color: BLAST.ring,
        size: 55,
      },
    ];
    g.chainCount = 5;
    g.chainTimer = 0.5;

    const renderer = new Renderer(canvas);
    renderer.render(g, 1);

    const ctx = canvas.getContext("2d");
    const center = {
      x: Math.round(renderer.ox + 600 * renderer.scale) * renderer.dpr,
      y: Math.round(renderer.oy + 450 * renderer.scale) * renderer.dpr,
    };
    const radius = 7 * renderer.scale * renderer.dpr;
    const image = ctx.getImageData(
      Math.max(0, center.x - 20),
      Math.max(0, center.y - 20),
      Math.min(41, canvas.width),
      Math.min(41, canvas.height),
    );
    const near = (r, g, b, target, tolerance) =>
      Math.abs(r - target[0]) <= tolerance &&
      Math.abs(g - target[1]) <= tolerance &&
      Math.abs(b - target[2]) <= tolerance;
    let redPixels = 0;
    let inkPixels = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const px = image.width * y + x;
        const offset = px * 4;
        const dx = x - 20;
        const dy = y - 20;
        const d = Math.hypot(dx, dy);
        const r = image.data[offset];
        const g = image.data[offset + 1];
        const b = image.data[offset + 2];
        if (d <= radius * 0.65 && near(r, g, b, [233, 105, 91], 18))
          redPixels++;
        if (
          d >= radius * 0.75 &&
          d <= radius * 1.35 &&
          near(r, g, b, [39, 59, 53], 20)
        )
          inkPixels++;
      }
    }
    return {
      viewport: `${innerWidth}x${innerHeight}`,
      canvas: `${canvas.width}x${canvas.height}`,
      center,
      radius,
      redPixels,
      inkPixels,
      renderer: {
        scale: renderer.scale,
        ox: renderer.ox,
        oy: renderer.oy,
        dpr: renderer.dpr,
      },
    };
  });
  await page.screenshot({
    path: join(
      OUTPUT_DIR,
      `synthetic-${viewport.width}x${viewport.height}.png`,
    ),
    animations: "disabled",
  });
  await context.close();
  result.visible = result.redPixels > 4 && result.inkPixels > 2;
  result.expectedVisible = EXPECT_VISIBLE;
  result.pass = result.visible === EXPECT_VISIBLE;
  report.synthetic.push(result);
}

async function normalSliceCapture() {
  if (!RUN_NORMAL) return;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    report.errors.push(`normal slice: ${error.message}`),
  );
  await page.goto(`${BASE_URL}/?mode=slice&seed=2a`);
  await page.locator("#start").click();
  let held = new Set();
  const keys = async (next) => {
    for (const key of held)
      if (!next.has(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
    for (const key of next)
      if (!held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
      }
  };
  let previousAccepted = 0;
  let captureSerial = 0;
  let captures = 0;
  const started = Date.now();
  let final = null;
  while (Date.now() - started < 100000) {
    const state = await page.evaluate(() => window.scrapMetrics);
    final = state;
    if (state.phase === "lost" || state.phase === "won") break;
    if (state.phase === "paused") {
      await keys(new Set());
      const resume = page.locator("#resume");
      if (await resume.isVisible()) await resume.click();
      continue;
    }
    if (state.phase === "shop") {
      await keys(new Set());
      for (const id of ["popcorn", "domino"]) {
        const button = page.locator(`[data-mod="${id}"]`);
        if (await button.isEnabled()) await button.click();
      }
      const next = page.locator("#next");
      if (await next.isEnabled()) await next.click();
      continue;
    }
    if (
      state.wave === 2 &&
      state.shootAcceptedEnemy > previousAccepted &&
      captures < 12
    ) {
      previousAccepted = state.shootAcceptedEnemy;
      for (let i = 0; i < 4; i++) {
        const name = `normal-w2-${String(captureSerial++).padStart(2, "0")}.png`;
        await page.screenshot({
          path: join(OUTPUT_DIR, name),
          animations: "disabled",
        });
        captures++;
        await page.waitForTimeout(60);
      }
    }
    const dx = state.position.x - 600;
    const dy = state.position.y - 400;
    const distance = Math.hypot(dx, dy) || 1;
    const inward = Math.max(-1, Math.min(1, (210 - distance) / 90));
    const vx = -dy / distance + (dx / distance) * inward;
    const vy = dx / distance + (dy / distance) * inward;
    const wanted = new Set();
    if (vx > 0.32) wanted.add("KeyD");
    if (vx < -0.32) wanted.add("KeyA");
    if (vy > 0.32) wanted.add("KeyS");
    if (vy < -0.32) wanted.add("KeyW");
    await keys(wanted);
    await page.waitForTimeout(80);
  }
  await keys(new Set());
  report.normalSlice = {
    captures,
    visualCoexistence: VISUAL_COEXISTENCE,
    shootAcceptedEnemyAtEnd: final?.shootAcceptedEnemy ?? 0,
    phase: final?.phase,
    wave: final?.wave,
    note:
      captures > 0
        ? "Sequential real canvas frames preserved after an accepted enemy projectile; visual coexistence still requires review."
        : "No accepted enemy projectile frame was captured; retain this as a visual-coverage gap.",
  };
  await context.close();
}

try {
  await synthetic({ width: 1440, height: 960 });
  await synthetic({ width: 390, height: 844 });
  if (RUN_NORMAL) {
    await normalSliceCapture();
  }
} finally {
  await browser.close();
}

Object.assign(
  report,
  harnessOutcome({
    syntheticPass: report.synthetic.every((entry) => entry.pass),
    runNormal: RUN_NORMAL,
    normalCaptures: report.normalSlice?.captures ?? 0,
    pageErrors: report.errors,
  }),
);
await writeFile(
  join(OUTPUT_DIR, "result.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (!report.pass || report.errors.length) process.exitCode = 1;
