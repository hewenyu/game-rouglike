import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../src/render";
import { Game } from "../src/sim";
import { BLAST, DT } from "../src/data";
import type { Bullet } from "../src/sim";

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
  text?: string;
};

const INK = "#273b35";
const ENEMY_RED = "#e9695b";
const CAP = "#fff3c8";
const ROCKET = "#e88951";

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
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
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
  fillRect() {}
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
    r: kind === "enemy" ? 7 : 5,
    homing: false,
  };
}

function visualGame() {
  const g = new Game(42, "expedition20");
  g.enemies = [];
  g.guns = [];
  g.bullets = [
    bullet(560, 450, "cap", 1),
    bullet(600, 450, "enemy", 2),
    bullet(640, 450, "rocket", 3),
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
  return g;
}

function snapshot(game: Game) {
  return JSON.stringify(game, (_key, value) => {
    if (value instanceof Map)
      return { __map: [...value.entries()] };
    if (value instanceof Set)
      return { __set: [...value] };
    return value;
  });
}

test("enemy bullets render once above opaque blasts and the chain readout", () => {
  const ctx = new RecordingContext();
  const renderer = rendererWith(ctx);
  renderer.render(visualGame(), 1);

  const enemyFills = ctx.ops.filter(
    (op) => op.kind === "fill" && op.fill === ENEMY_RED,
  );
  const enemyStrokes = ctx.ops.filter(
    (op) => op.kind === "stroke" && op.fill === ENEMY_RED,
  );
  assert.equal(enemyFills.length, 1);
  assert.equal(enemyStrokes.length, 1);
  assert.equal(enemyStrokes[0].stroke, INK);
  assert.equal(enemyStrokes[0].width, 3);

  const cap = ctx.ops.findIndex((op) => op.kind === "fill" && op.fill === CAP);
  const rocket = ctx.ops.findIndex(
    (op) => op.kind === "fill" && op.fill === ROCKET,
  );
  const blast = ctx.ops.findIndex(
    (op) => op.kind === "fill" && op.fill === BLAST.core,
  );
  const chainText = ctx.ops.findIndex(
    (op) => op.kind === "text" && op.text === "×5",
  );
  const enemy = ctx.ops.findIndex(
    (op) => op.kind === "fill" && op.fill === ENEMY_RED,
  );
  const enemyStroke = ctx.ops.findIndex(
    (op) => op.kind === "stroke" && op.fill === ENEMY_RED,
  );

  assert(cap >= 0, "player cap bullet was not rendered");
  assert(rocket >= 0, "player rocket was not rendered");
  assert(blast >= 0, "opaque blast core was not rendered");
  assert(chainText >= 0, "chain readout was not rendered");
  assert(cap < blast, "player bullets should keep their original world pass");
  assert(rocket < blast);
  assert(enemy > blast, "enemy bullet must be after the opaque blast core");
  assert(enemy > chainText, "enemy bullet must be after the final chain text");
  assert(
    enemyStroke > enemy,
    "enemy red fill and dark ring must use the same final-play transform",
  );
});

test("rendering leaves slice and expedition state unchanged for three seeds", () => {
  for (const mode of ["slice", "expedition20"] as const) {
    for (const seed of [42, 23, 145]) {
      const rendered = new Game(seed, mode);
      const control = new Game(seed, mode);
      const renderer = rendererWith(new RecordingContext(false));
      assert.equal(snapshot(rendered), snapshot(control));

      for (let i = 0; i < 60; i++) {
        const input = {
          x: Math.sin(i * 0.11) * 0.8,
          y: Math.cos(i * 0.17) * 0.6,
        };
        rendered.step(DT, input);
        control.step(DT, input);
        renderer.render(rendered, i / 60);
        assert.equal(
          snapshot(rendered),
          snapshot(control),
          `${mode} seed ${seed} diverged after render step ${i}`,
        );
      }
    }
  }
});
