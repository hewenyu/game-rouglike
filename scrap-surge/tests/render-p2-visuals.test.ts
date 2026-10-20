import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Renderer, type ExpeditionPresentation } from "../src/render";
import { Game } from "../src/sim";
import { BLAST, DT } from "../src/data";
import type { Bullet, Enemy } from "../src/sim";

type Matrix = [number, number, number, number, number, number];
type DrawOp = {
  kind: "fill" | "stroke" | "text";
  fill?: string;
  stroke?: string;
  width?: number;
  x?: number;
  y?: number;
  rx?: number;
  ry?: number;
  w?: number;
  h?: number;
  text?: string;
};

const INK = "#273b35";
const ENEMY_RED = "#e9695b";
const PICKUP_FILL = "#effff3";

class RecordingContext {
  private state: Matrix = [1, 0, 0, 1, 0, 0];
  private stack: Matrix[] = [];
  private path: {
    ellipse?: { x: number; y: number; rx: number; ry: number };
    fill?: string;
  } = {};
  fillStyle = "#000000";
  strokeStyle = "#000000";
  lineWidth = 1;
  globalAlpha = 1;
  lineCap = "butt";
  lineJoin = "miter";
  font = "";
  textAlign = "start";
  ops: DrawOp[] = [];

  constructor(private record = true) {}
  private point(x: number, y: number) {
    const [a, b, c, d, e, f] = this.state;
    return { x: a * x + c * y + e, y: b * x + d * y + f };
  }
  private scales() {
    const [a, b, c, d] = this.state;
    return { x: Math.hypot(a, b), y: Math.hypot(c, d) };
  }
  save() {
    this.stack.push([...this.state]);
  }
  restore() {
    this.state = this.stack.pop() ?? [1, 0, 0, 1, 0, 0];
  }
  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) {
    this.state = [a, b, c, d, e, f];
  }
  translate(x: number, y: number) {
    const [a, b, c, d, e, f] = this.state;
    this.state = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
  }
  scale(x: number, y: number) {
    const [a, b, c, d, e, f] = this.state;
    this.state = [a * x, b * x, c * y, d * y, e, f];
  }
  rotate(angle: number) {
    const [a, b, c, d, e, f] = this.state;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.state = [
      a * cos + c * sin,
      b * cos + d * sin,
      -a * sin + c * cos,
      -b * sin + d * cos,
      e,
      f,
    ];
  }
  beginPath() {
    this.path = {};
  }
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  setLineDash() {}
  strokeRect() {}
  fillRect(x: number, y: number, w: number, h: number) {
    if (!this.record) return;
    const point = this.point(x, y);
    const scale = this.scales();
    this.ops.push({
      kind: "fill",
      fill: String(this.fillStyle),
      x: point.x,
      y: point.y,
      w: w * scale.x,
      h: h * scale.y,
    });
  }
  createRadialGradient() {
    return { addColorStop() {} };
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    _rotation: number,
    _start: number,
    _end: number,
  ) {
    const scale = this.scales();
    const point = this.point(x, y);
    this.path.ellipse = {
      x: point.x,
      y: point.y,
      rx: rx * scale.x,
      ry: ry * scale.y,
    };
  }
  roundRect() {}
  fill() {
    this.path.fill = String(this.fillStyle);
    if (!this.record) return;
    const ellipse = this.path.ellipse;
    this.ops.push({
      kind: "fill",
      fill: String(this.fillStyle),
      x: ellipse?.x,
      y: ellipse?.y,
      rx: ellipse?.rx,
      ry: ellipse?.ry,
    });
  }
  stroke() {
    if (!this.record || !this.path.ellipse) return;
    this.ops.push({
      kind: "stroke",
      fill: this.path.fill,
      stroke: String(this.strokeStyle),
      width: this.lineWidth,
      x: this.path.ellipse.x,
      y: this.path.ellipse.y,
      rx: this.path.ellipse.rx,
      ry: this.path.ellipse.ry,
    });
  }
  fillText(text: string, x: number, y: number) {
    if (!this.record) return;
    const point = this.point(x, y);
    this.ops.push({
      kind: "text",
      fill: String(this.fillStyle),
      x: point.x,
      y: point.y,
      text,
    });
  }
  strokeText() {}
}

function rendererWith(ctx: RecordingContext) {
  const renderer = Object.create(Renderer.prototype) as Renderer;
  renderer.ctx = ctx as unknown as CanvasRenderingContext2D;
  renderer.width = 1260;
  renderer.height = 890;
  renderer.dpr = 1;
  renderer.scale = 1;
  renderer.ox = 0;
  renderer.oy = 0;
  renderer.reserveTop = 0;
  renderer.reserveBottom = 0;
  renderer.reduced = true;
  return renderer;
}

function bullet(
  x: number,
  y: number,
  kind: Bullet["kind"],
  id: number,
  r = kind === "enemy" ? 7 : 5,
  mod?: Bullet["mod"],
): Bullet {
  return {
    x,
    y,
    id,
    vx: 100,
    vy: 0,
    damage: 1,
    life: 1,
    kind,
    target: 0,
    r,
    homing: false,
    mod,
  };
}

function enemy(kind: Enemy["kind"], id: number, maxHp = 20): Enemy {
  return {
    x: 240 + id * 70,
    y: 360,
    id,
    kind,
    hp: maxHp / 2,
    maxHp,
    r:
      kind === "boss"
        ? 48
        : kind === "chip"
          ? 10
          : kind === "splitter"
            ? 20
            : kind === "spitter"
              ? 19
              : kind === "can"
                ? 24
                : kind === "runner"
                  ? 14
                  : 17,
    vx: 0,
    vy: 0,
    knockX: 0,
    knockY: 0,
    flash: 0,
    age: 0.4,
    born: 0,
    attack: 0,
    bowled: new Set(),
    tell: 0,
  };
}

function visualGame() {
  const g = new Game(42, "expedition20");
  g.enemies = [enemy("bag", 1)];
  g.guns = [];
  g.scraps = [];
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
  ];
  g.bullets = [
    bullet(500, 450, "cap", 1),
    bullet(520, 450, "bonus", 2, 5, "popcorn"),
    bullet(560, 450, "enemy", 3, 7),
  ];
  g.chainCount = 5;
  g.chainTimer = 0.5;
  g.phase = "sweep";
  return g;
}

function snapshot(game: Game) {
  return JSON.stringify(game, (_key, value) => {
    if (value instanceof Map) return { __map: [...value.entries()] };
    if (value instanceof Set) return { __set: [...value] };
    return value;
  });
}

function presentation(): ExpeditionPresentation {
  return {
    elite: {
      x: 360,
      y: 320,
      hp: 180,
      maxHp: 360,
      radius: 28,
      wave: 3,
      marker: "elite",
    },
    eliteWarning: {
      wave: 7,
      progress: 0.7,
      remaining: 4.8,
    },
    chests: [{ x: 540, y: 380, source: "elite", pulse: 0.8 }],
    trailPoints: [{ x: 610, y: 450, life: 0.75, max: 1, radius: 36 }],
    weaponProfiles: [],
    spikeShellCopies: 1,
    spikeShellRadius: 40,
    pressureActive: true,
  };
}

test("slice rendering stays byte-identical without expedition presentation", () => {
  for (const seed of [42, 23, 145]) {
    const g = new Game(seed, "slice");
    for (let i = 0; i < 30; i++)
      g.step(DT, { x: Math.sin(i * 0.3), y: Math.cos(i * 0.4) });
    const baseline = rendererWith(new RecordingContext());
    baseline.render(g, 1);
    const withOptionalArg = rendererWith(new RecordingContext());
    withOptionalArg.render(g, 1, undefined);
    assert.deepEqual(
      (withOptionalArg.ctx as unknown as RecordingContext).ops,
      (baseline.ctx as unknown as RecordingContext).ops,
    );
    const hash = createHash("sha256")
      .update(JSON.stringify((baseline.ctx as unknown as RecordingContext).ops))
      .digest("hex");
    assert.match(hash, /^[0-9a-f]{64}$/);
  }
});

test("frozen bag/runner/chip default enemy draw hash is preserved", () => {
  const rendered = rendererWith(new RecordingContext());
  let id = 20;
  for (const kind of ["bag", "runner", "chip"] as const) {
    rendered.enemy(enemy(kind, id++, 2));
    rendered.enemy({ ...enemy(kind, id++, 2), hp: 2 });
  }
  const hash = createHash("sha256")
    .update(JSON.stringify((rendered.ctx as unknown as RecordingContext).ops))
    .digest("hex");
  assert.equal(
    hash,
    "4ba5006bbeb0835ae7fc1d9ce8deecf1f41926250d2303ebfe1be15e02d80abf",
  );
});

test("expedition presentation reads elite HP, chest, trail and pressure without mutation", () => {
  const g = visualGame();
  g.phase = "fight";
  const p = presentation();
  const before = snapshot(g);
  const pBefore = JSON.stringify(p);
  const renderer = rendererWith(new RecordingContext());
  renderer.render(g, 1, p);
  const ctx = renderer.ctx as unknown as RecordingContext;
  assert.equal(snapshot(g), before);
  assert.equal(JSON.stringify(p), pBefore);
  assert(ctx.ops.some((op) => op.text === "ELITE"));
  assert(ctx.ops.some((op) => op.text === "LOOT"));
  assert(ctx.ops.some((op) => op.text === "精英来袭 · W07"));
  assert(ctx.ops.some((op) => op.text === "4.8s"));
  assert(
    ctx.ops.some(
      (op) => op.kind === "stroke" && op.stroke === "#dff6e8" && op.rx === 40,
    ),
    "H3 radius ring is drawn at the shared item constant",
  );
  assert(
    ctx.ops.some(
      (op) =>
        op.kind === "stroke" &&
        op.stroke === "#c78336" &&
        op.rx === 36 &&
        op.ry === 36,
    ),
    "trail uses its actual 36 radius",
  );
});

test("expedition pickup bullets stay visible and player bullets remain before FX", () => {
  const g = visualGame();
  const p = presentation();
  const ctx = new RecordingContext();
  rendererWith(ctx).render(g, 1, p);
  const pickup = ctx.ops.findIndex(
    (op) => op.kind === "fill" && op.fill === PICKUP_FILL,
  );
  const blast = ctx.ops.findIndex(
    (op) => op.kind === "fill" && op.fill === BLAST.core,
  );
  assert(pickup >= 0, "popcorn/pickup bullet must be visible");
  assert(blast >= 0);
  assert(pickup < blast, "player bullet pass remains before world FX");
  const enemy = ctx.ops.findIndex(
    (op) => op.kind === "fill" && op.fill === ENEMY_RED,
  );
  assert(enemy > blast, "enemy bullets still draw after FX/chain HUD");
});

test("rendered expedition frames and critical order remain non-mutating", () => {
  for (const seed of [42, 23]) {
    const rendered = new Game(seed, "expedition20");
    const control = new Game(seed, "expedition20");
    const renderer = rendererWith(new RecordingContext(false));
    for (let i = 0; i < 60; i++) {
      const input = { x: Math.sin(i * 0.11), y: Math.cos(i * 0.17) };
      rendered.step(DT, input);
      control.step(DT, input);
      renderer.render(rendered, i / 60, presentation());
      assert.equal(snapshot(rendered), snapshot(control));
    }
  }
});

test("enemy projectile outline remains the frozen INK 3px treatment", () => {
  const g = visualGame();
  const ctx = new RecordingContext();
  rendererWith(ctx).render(g, 1, presentation());
  const enemyStroke = ctx.ops.find(
    (op) => op.kind === "stroke" && op.fill === ENEMY_RED && op.stroke === INK,
  );
  assert(enemyStroke);
  assert.equal(enemyStroke.width, 3);
});
