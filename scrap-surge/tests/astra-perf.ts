// Diagnostic simulation CPU benchmark, not a browser/frame-rate or win-rate test.
//
// Usage:
//   SOURCE_SHA=<commit> OUTPUT_FILE=/abs/path/to/new-result.json \
//     npm run test:astra:perf
//
// If OUTPUT_FILE is omitted, a unique path is created under artifacts/astra-perf.
import { Game } from "../src/sim";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import os from "node:os";

const SOURCE_SHA = process.env.SOURCE_SHA || process.env.REVIEW_SHA;
if (!SOURCE_SHA) throw Error("SOURCE_SHA (or legacy REVIEW_SHA) is required");
const OUTPUT_FILE =
  process.env.OUTPUT_FILE ||
  join(
    os.tmpdir(),
    "astra-perf",
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}.json`,
  );
await mkdir(dirname(OUTPUT_FILE), { recursive: true });

const pct = (values: number[], quantile: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(quantile * sorted.length))] ??
    0
  );
};

function input(game: Game) {
  const boss = game.enemies.find(
    (enemy) => enemy.kind === "boss" && enemy.hp > 0 && enemy.born <= 0,
  );
  const dx = game.player.x - (boss?.x ?? 600);
  const dy = game.player.y - (boss?.y ?? 400);
  const radius = Math.hypot(dx, dy) || 1;
  const centering = Math.max(
    -1,
    Math.min(1, ((boss ? 170 : 210) - radius) / 90),
  );
  let x = -dy / radius + (dx / radius) * centering;
  let y = dx / radius + (dy / radius) * centering;
  let nearest: (typeof game.enemies)[number] | null = null;
  let nearestDistance = 105;
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue;
    const distance = Math.hypot(
      enemy.x - game.player.x,
      enemy.y - game.player.y,
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }
  if (nearest) {
    const repel = 2.4 * (1 - nearestDistance / 105);
    x +=
      (nearestDistance ? (game.player.x - nearest.x) / nearestDistance : 1) *
      repel;
    y +=
      (nearestDistance ? (game.player.y - nearest.y) / nearestDistance : 0) *
      repel;
  }
  return {
    x: x > 0.32 ? 1 : x < -0.32 ? -1 : 0,
    y: y > 0.32 ? 1 : y < -0.32 ? -1 : 0,
  };
}

function panels(game: Game) {
  if (game.phase === "quick") {
    game.chooseQuick(
      game.wave === 1
        ? "popcorn"
        : game.wave === 3
          ? "domino"
          : game.wave === 5
            ? "wake"
            : game.wave === 17
              ? "domino"
              : "popcorn",
    );
    game.nextWave();
  }
  if (game.phase === "shop") {
    for (let priority = 0; priority < 3; priority++)
      for (let index = 0; index < game.offers.length; index++) {
        const preview = game.expeditionPurchasePreview(index);
        if (!preview.accepted) continue;
        const owned = game.guns.some(
          (gun) => gun.id === game.offers[index] && (gun.tier ?? 1) < 4,
        );
        if (owned || game.guns.length < game.slotCap) game.buy(index);
      }
    game.nextWave();
  }
}

// Warm the timer, JIT and the genuine fixed-step path before measuring.
const warm = new Game(42, "expedition20");
for (let index = 0; index < 3000; index++) {
  panels(warm);
  warm.step(1 / 60, input(warm));
  warm.drain();
}
const overhead: number[] = [];
for (let index = 0; index < 10000; index++) {
  const started = performance.now();
  overhead.push(performance.now() - started);
}

const game = new Game(42, "expedition20");
const groups = new Map<
  number,
  {
    ms: number[];
    enemies: number;
    bullets: number;
    fx: number;
    checks: number;
  }
>();
let held = { x: 0, y: 0 };
let steps = 0;
for (; steps < 90000 && !["won", "lost"].includes(game.phase); steps++) {
  panels(game);
  if (steps % 5 === 0) held = input(game);
  const wave = game.wave;
  const group = groups.get(wave) ?? {
    ms: [],
    enemies: 0,
    bullets: 0,
    fx: 0,
    checks: 0,
  };
  const started = performance.now();
  game.step(1 / 60, held);
  const duration = performance.now() - started;
  group.ms.push(duration);
  group.enemies = Math.max(group.enemies, game.enemies.length);
  group.bullets = Math.max(group.bullets, game.bullets.length);
  group.fx = Math.max(group.fx, game.fx.length);
  group.checks++;
  groups.set(wave, group);
  game.drain();
}

const all = [...groups.values()].flatMap((group) => group.ms);
const report = {
  sourceSha: SOURCE_SHA,
  method:
    "performance.now around Game.step(1/60) only; legal actions, seed42, fixed ordinary keyboard-like input, no state grants. Input/panel creation and event draining excluded. Warm-up3000 ticks. Single CPU test, no render/audio/GPU/browser measurement.",
  environment: {
    platform: os.platform(),
    release: os.release(),
    cpu: os.cpus()[0].model,
    node: process.version,
  },
  timer: {
    n: overhead.length,
    medianMs: pct(overhead, 0.5),
    p95Ms: pct(overhead, 0.95),
    nonzero: overhead.filter((value) => value > 0).length,
  },
  outcome: {
    phase: game.phase,
    wave: game.wave,
    hp: game.player.hp,
    kills: game.kills,
    simulationSeconds: game.time,
    steps,
  },
  overall: {
    n: all.length,
    medianMs: pct(all, 0.5),
    p95Ms: pct(all, 0.95),
    p99Ms: pct(all, 0.99),
    maxMs: Math.max(...all),
  },
  waves: [...groups].map(([wave, group]) => ({
    wave,
    n: group.ms.length,
    medianMs: pct(group.ms, 0.5),
    p95Ms: pct(group.ms, 0.95),
    p99Ms: pct(group.ms, 0.99),
    maxMs: Math.max(...group.ms),
    enemies: group.enemies,
    bullets: group.bullets,
    fx: group.fx,
  })),
};

await writeFile(OUTPUT_FILE, JSON.stringify(report, null, 2), { flag: "wx" });
console.log(
  JSON.stringify(
    {
      sourceSha: SOURCE_SHA,
      outputFile: OUTPUT_FILE,
      outcome: report.outcome,
      overall: report.overall,
    },
    null,
    2,
  ),
);
