import { Game, type Enemy, type Gun } from "./sim";
import { W, H, WEAPONS, BLAST, type WeaponId } from "./data";
import { bossForWave } from "./expedition";
const INK = "#273b35",
  SAND = "#e8c696",
  CREAM = "#fff1c8",
  ORANGE = "#ee7956",
  MINT = "#91c9ae";
// The player must never be confused with an orange-red enemy, so the shell is
// ivory + teal and gets a bright white rim and a teal ground ring.
const TEAL = "#2f9e8f",
  TEAL_LIGHT = "#3fd0a8",
  IVORY = "#f4efe0",
  IVORY_HI = "#fffdf6";
const WEAPON_TINT: Record<WeaponId, string> = {
  slinger: "#ffcf5c",
  shotgun: "#d8a869",
  rocket: "#ff8a5c",
  coil: "#b6e05a",
  fist: "#f0a05c",
  saw: "#8fb3d9",
};
export class Renderer {
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;
  scale = 1;
  ox = 0;
  oy = 0;
  // Vertical bands reserved for HUD chrome so the arena never sits under it.
  reserveTop = 0;
  reserveBottom = 0;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width;
    this.height = r.height;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = r.width * this.dpr;
    this.canvas.height = r.height * this.dpr;
  }
  // Screen-space rect of the drawn arena, in CSS pixels. Lets the browser test
  // prove the HUD bands really sit outside the play field.
  arenaRect() {
    return {
      x: this.ox,
      y: this.oy,
      w: W * this.scale,
      h: H * this.scale,
      scale: this.scale,
    };
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string,
    stroke = INK,
    width = 3,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (width) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  line(points: { x: number; y: number }[], color = INK, width = 3) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
  }
  round(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke = INK,
    width = 3,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    if (width) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  text(
    t: string,
    x: number,
    y: number,
    size: number,
    color = INK,
    stroke = false,
  ) {
    const c = this.ctx;
    c.font = `900 ${size}px "Avenir Next", "PingFang SC", sans-serif`;
    c.textAlign = "center";
    c.fillStyle = color;
    if (stroke) {
      c.strokeStyle = INK;
      c.lineWidth = 4;
      c.strokeText(t, x, y);
    }
    c.fillText(t, x, y);
  }
  background(t: number) {
    const c = this.ctx,
      w = this.width,
      h = this.height;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = SAND;
    c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(
      w * 0.5,
      h * 0.45,
      10,
      w * 0.5,
      h * 0.45,
      w * 0.7,
    );
    g.addColorStop(0, "#f0d5a5");
    g.addColorStop(1, "#cfa97c");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      const x = (Math.sin(i * 127.1) * 0.5 + 0.5) * w,
        y = (Math.sin(i * 311.7) * 0.5 + 0.5) * h;
      c.fillStyle = i % 3 ? "#c4a578" : "#f7dfb4";
      c.beginPath();
      c.ellipse(x, y, 1.5 + (i % 3), 1 + (i % 2), i, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#3c8f7b";
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w + 30; x += 30)
      c.lineTo(x, h - 18 - Math.sin(x * 0.013 + t * 0.7) * 10);
    c.lineTo(w, h);
    c.closePath();
    c.fill();
    c.strokeStyle = "#b5e4be";
    c.lineWidth = 4;
    c.stroke();
  }
  crab(
    x: number,
    y: number,
    size: number,
    walk: number,
    hurt = false,
    player = false,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    if (hurt) c.globalAlpha = 0.65;
    const legDark = player ? "#20302c" : INK,
      legLight = player ? TEAL_LIGHT : ORANGE,
      shellOuter = player ? IVORY : "#5f867a",
      shellInner = player ? IVORY_HI : "#8eac86",
      limb = player ? TEAL : ORANGE,
      mark = player ? "#bfe6dd" : "#d8d9a1",
      crease = player ? "#0f7d72" : "#365448";
    if (player) {
      // Complete translucent ground ring keeps the player anchored in a swarm.
      this.ellipse(0, 20, 42, 16, "#2f9e8f26", TEAL, 4);
      this.ellipse(0, 0, 35, 34, "#ffffff", "#ffffff", 0);
    } else {
      this.ellipse(0, 18, 34, 13, "#866d4b44", INK, 0);
    }
    // Six short, thick, dark-outlined legs instead of thin crossing strokes.
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const off = Math.sin(walk + i) * 3,
          legs = [
            { x: side * 16, y: 2 + i * 7 },
            { x: side * (26 + off), y: 8 + i * 8 },
            { x: side * 33, y: 16 + i * 8 },
          ];
        this.line(legs, legDark, player ? 8 : 5);
        this.line(legs, legLight, player ? 3.5 : 2.5);
      }
    this.ellipse(0, 0, 29, 28, shellOuter);
    this.ellipse(-3, -4, 23, 21, shellInner);
    if (player) {
      // Warm spiral shading so the ivory shell reads as a hermit-crab shell.
      this.ellipse(5, 6, 19, 15, "#e6d6b133", "#0000", 0);
      this.line(
        [
          { x: -17, y: -7 },
          { x: -4, y: -14 },
          { x: 10, y: -9 },
        ],
        "#d9c9a6",
        3,
      );
      this.line(
        [
          { x: -19, y: 3 },
          { x: -2, y: -3 },
          { x: 15, y: 1 },
        ],
        "#e2d4b4",
        3,
      );
      this.line(
        [
          { x: -15, y: 12 },
          { x: 2, y: 8 },
          { x: 15, y: 12 },
        ],
        "#cdbb96",
        3,
      );
    }
    this.line(
      [
        { x: -14, y: 10 },
        { x: -12, y: -15 },
        { x: 7, y: -22 },
      ],
      mark,
      4,
    );
    this.line(
      [
        { x: 6, y: 19 },
        { x: 18, y: 3 },
        { x: 17, y: -12 },
      ],
      crease,
      3,
    );
    this.round(-16, -22, 26, 12, 4, "#d9b465");
    this.line(
      [
        { x: -9, y: -18 },
        { x: 1, y: -18 },
      ],
      "#6a6043",
      2,
    );
    this.ellipse(0, 13, 22, 15, limb);
    for (const side of [-1, 1]) {
      this.line(
        [
          { x: side * 11, y: 7 },
          { x: side * 13, y: -1 },
        ],
        player ? "#ffffff" : INK,
        player ? 7 : 5,
      );
      this.ellipse(side * 13, -2, 5.5, 7, CREAM, INK, player ? 4 : 3);
      this.ellipse(side * 13, -1, 2.4, 3, INK, INK, 0);
      this.ellipse(side * 33, 7, 10, 9, limb);
      this.line(
        [
          { x: side * 35, y: 0 },
          { x: side * 31, y: 8 },
        ],
        INK,
        2,
      );
    }
    this.line(
      [
        { x: -6, y: 17 },
        { x: 0, y: 20 },
        { x: 6, y: 17 },
      ],
      INK,
      2,
    );
    c.restore();
  }
  gun(
    id: WeaponId,
    x: number,
    y: number,
    angle: number,
    recoil = 0,
    scale = 1,
    plate = false,
    tier: 1 | 2 = 1,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.scale(scale, scale);
    c.translate(-recoil * 5, 0);
    // A colored backing block keeps each mounted weapon readable as a distinct
    // piece of hardware instead of a thin dashed outline.
    if (plate) {
      this.round(-23, -16, 46, 32, 10, WEAPON_TINT[id], INK, 3);
      this.round(-20, -13, 40, 26, 8, "#d9ddd4", INK, 2);
      if (tier === 2) {
        this.round(-24, -17, 48, 34, 11, "#e8edf0", INK, 2);
        this.line(
          [
            { x: -21, y: -13 },
            { x: 21, y: -13 },
          ],
          "#ffffff",
          2,
        );
      }
    }
    if (id === "slinger") {
      this.round(-12, -8, 27, 16, 5, "#c3ccc0");
      this.round(9, -5, 22, 10, 2, "#e2d1a1");
      this.line(
        [
          { x: -4, y: -5 },
          { x: -4, y: 5 },
        ],
        INK,
        2,
      );
      if (tier === 2) {
        this.round(8, -11, 23, 7, 2, "#dce5df");
        this.round(8, 4, 23, 7, 2, "#dce5df");
      }
    }
    if (id === "shotgun") {
      this.round(-13, -10, 25, 20, 4, "#c1874f");
      this.round(5, -9, 28, 8, 2, "#d2d6bb");
      this.round(5, 1, 28, 8, 2, "#9db4a7");
    }
    if (id === "rocket") {
      this.round(-16, -11, 41, 22, 9, "#ed9360");
      this.round(-11, -14, 9, 28, 2, "#7b9b86");
      this.ellipse(22, 0, 5, 9, INK);
      this.line(
        [
          { x: -2, y: -7 },
          { x: 12, y: -7 },
        ],
        CREAM,
        3,
      );
      if (tier === 2) {
        this.round(-10, -17, 8, 34, 3, "#89aa99");
        this.ellipse(-14, 0, 4, 7, "#fff0a0");
      }
    }
    if (id === "coil") {
      this.round(-15, -10, 24, 20, 4, "#b5c48b");
      for (let i = 0; i < 3; i++)
        this.line(
          [
            { x: 8 + i * 6, y: -11 },
            { x: 8 + i * 6, y: 11 },
          ],
          "#507c6c",
          3,
        );
      this.ellipse(26, 0, 6, 6, "#dff4be");
      if (tier === 2) {
        this.line(
          [
            { x: 24, y: -12 },
            { x: 17, y: -4 },
            { x: 29, y: 0 },
            { x: 20, y: 10 },
          ],
          "#bff7d1",
          2.5,
        );
      }
    }
    if (id === "fist") {
      this.line(
        [
          { x: -17, y: 0 },
          { x: -10, y: -7 },
          { x: -3, y: 7 },
          { x: 4, y: -7 },
          { x: 11, y: 0 },
        ],
        "#647e76",
        4,
      );
      this.round(8, -13, 24, 26, 7, ORANGE);
      this.line(
        [
          { x: 12, y: 0 },
          { x: 25, y: 0 },
        ],
        INK,
        2,
      );
    }
    if (id === "saw") {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        this.line(
          [
            { x: Math.cos(a) * 13, y: Math.sin(a) * 13 },
            { x: Math.cos(a + 0.1) * 24, y: Math.sin(a + 0.1) * 24 },
          ],
          "#577b70",
          4,
        );
      }
      this.ellipse(0, 0, 15, 15, "#c4d0b4");
      this.ellipse(0, 0, 5, 5, "#edac54");
    }
    // Identity color stays visible at the muzzle tip, above the weapon body.
    if (plate) this.ellipse(25, 0, 4, 4, WEAPON_TINT[id], INK, 2);
    if (recoil > 0.5 && id !== "saw" && id !== "fist") {
      c.beginPath();
      c.moveTo(30, 0);
      c.lineTo(39, -10);
      c.lineTo(38, -3);
      c.lineTo(53, 0);
      c.lineTo(38, 4);
      c.lineTo(40, 11);
      c.closePath();
      c.fillStyle = "#fff4a6";
      c.fill();
      c.strokeStyle = "#b87b30";
      c.lineWidth = 1.5;
      c.stroke();
      if (tier === 2) {
        c.beginPath();
        c.moveTo(30, 10);
        c.lineTo(46, 18);
        c.lineTo(37, 4);
        c.closePath();
        c.fillStyle = "#d8e4df";
        c.fill();
        c.stroke();
      }
    }
    c.restore();
  }
  title(t: number) {
    this.background(t);
    const c = this.ctx,
      w = this.width,
      h = this.height,
      x = w < 700 ? w * 0.71 : w * 0.74,
      y = h * (w < 700 ? 0.72 : 0.49),
      size = w < 700 ? 1.8 : Math.min(4.3, w / 350);
    c.save();
    c.translate(x, y);
    c.rotate(-0.08);
    this.ellipse(0, 0, 180, 172, "#edb552", INK, 3);
    c.setLineDash([5, 9]);
    this.ellipse(0, 0, 195, 188, "#0000", "#8d794d", 1);
    c.setLineDash([]);
    c.restore();
    this.crab(x, y, size, t * 2);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 2;
      this.gun(
        (["slinger", "shotgun", "rocket", "coil"] as WeaponId[])[i],
        x + Math.cos(a) * size * 33,
        y + Math.sin(a) * size * 29,
        a + Math.sin(t) * 0.08,
        0,
        size * 0.9,
      );
    }
    if (w > 700) {
      // Keep the caption and the little badge clear of both the crab and the
      // DOM sticker so nothing is clipped or overlapped.
      this.text("100% BEACH TRASH", x, y + 248, 11);
      c.save();
      c.translate(x - 128, y + 150);
      c.rotate(-0.12);
      this.round(-45, -27, 90, 54, 4, "#a3cba3");
      this.text("6 把破烂", 0, -2, 14);
      this.text("一只小蟹", 0, 16, 11);
      c.restore();
    }
  }
  render(g: Game, t: number) {
    this.background(t);
    const c = this.ctx,
      w = this.width,
      h = this.height;
    const availH = Math.max(200, h - this.reserveTop - this.reserveBottom),
      midY = this.reserveTop + availH / 2;
    this.scale = Math.min(w / (w < 700 ? 740 : 1260), availH / 890);
    const vw = w / this.scale,
      vh = availH / this.scale,
      cx = vw < W ? Math.max(vw / 2, Math.min(W - vw / 2, g.player.x)) : W / 2,
      cy = vh < H ? Math.max(vh / 2, Math.min(H - vh / 2, g.player.y)) : H / 2;
    this.ox = w / 2 - cx * this.scale;
    this.oy = midY - cy * this.scale;
    const shake = this.reduced ? 0 : g.shake * 16;
    c.translate(
      this.ox + Math.sin(t * 83) * shake,
      this.oy + Math.cos(t * 67) * shake,
    );
    c.scale(this.scale, this.scale);
    c.strokeStyle = "#846f4b55";
    c.lineWidth = 2;
    c.setLineDash([3, 10]);
    c.strokeRect(16, 16, W - 32, H - 32);
    c.setLineDash([]);
    for (let i = 0; i < 12; i++) {
      const x = (Math.sin(i * 12.7) * 0.5 + 0.5) * W,
        y = (Math.sin(i * 47.1) * 0.5 + 0.5) * H;
      c.save();
      c.translate(x, y);
      c.rotate(i * 1.9);
      if (i % 2) {
        this.ellipse(0, 0, 9, 6, "#ead5ac", "#a78d68", 1);
        this.line(
          [
            { x: -5, y: 2 },
            { x: 1, y: -2 },
            { x: 5, y: 2 },
          ],
          "#b89a71",
          1,
        );
      } else {
        this.line(
          [
            { x: -6, y: 5 },
            { x: 2, y: -4 },
            { x: 10, y: 2 },
          ],
          "#a48c61",
          2,
        );
      }
      c.restore();
    }
    for (const s of g.scraps) {
      c.save();
      c.translate(s.x, s.y);
      c.rotate(s.age * 2 + s.id);
      if (g.branch === "ember" && (s.heat ?? 0) > 0) {
        this.ellipse(0, 0, 9, 9, "#e98545", "#743f2d", 2);
        this.line(
          [
            { x: -4, y: 2 },
            { x: -1, y: -4 },
            { x: 2, y: 4 },
            { x: 5, y: -3 },
          ],
          "#fff0a0",
          2,
        );
      } else {
        this.round(-5, -5, 10, 10, 2, "#e8b843", "#756b34", 1.5);
        this.line(
          [
            { x: -2, y: 0 },
            { x: 2, y: 0 },
          ],
          "#fff0b6",
          1.5,
        );
      }
      c.restore();
    }
    for (const point of g.wakePoints) {
      const a = Math.max(0, point.life / point.max);
      c.save();
      c.globalAlpha = 0.25 + a * 0.65;
      this.ellipse(
        point.x,
        point.y,
        point.radius * (1.4 - a * 0.4),
        point.radius * (0.55 + a * 0.25),
        "#f6bd6033",
        "#f2a64e",
        2,
      );
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + point.id;
        this.line(
          [
            {
              x: point.x + Math.cos(ang) * 6,
              y: point.y + Math.sin(ang) * 4,
            },
            {
              x: point.x + Math.cos(ang) * 19,
              y: point.y + Math.sin(ang) * 12,
            },
          ],
          "#fff0a0",
          2,
        );
      }
      c.restore();
    }
    for (const e of g.enemies) this.enemy(e);
    for (const k of g.corpses) {
      const life = k.life / k.max;
      c.save();
      c.globalAlpha = 0.25 + life * 0.45;
      this.line(
        [
          { x: k.x - k.vx * 0.03, y: k.y - k.vy * 0.03 },
          { x: k.x, y: k.y },
        ],
        "#3a3f42",
        12,
      );
      this.round(
        k.x - k.r - 1,
        k.y - k.r,
        (k.r + 1) * 2,
        k.r * 2,
        Math.min(10, k.r),
        "#4a4f52",
        "#20252a",
        3,
      );
      c.restore();
    }
    for (const b of g.bullets) {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(Math.atan2(b.vy, b.vx));
      if (b.kind === "rocket") {
        this.round(-12, -5, 20, 10, 4, "#e88951", INK, 2);
        this.line(
          [
            { x: -14, y: 0 },
            { x: -26, y: Math.sin(t * 55) * 3 },
          ],
          "#fff0a0",
          4,
        );
      } else if (b.kind === "enemy" && b.r >= 7) {
        this.line(
          [
            { x: -12, y: 0 },
            { x: -3, y: 0 },
          ],
          "#f7a05d",
          4,
        );
        this.ellipse(0, 0, b.r, b.r, "#e9695b", "#813b31", 2);
        this.ellipse(-2, -2, 2, 2, "#fff0a0", "#0000", 0);
      } else {
        this.line(
          [
            { x: -10, y: 0 },
            { x: 0, y: 0 },
          ],
          b.kind === "bonus" ? "#d5edb2" : "#fceabe",
          4,
        );
        this.ellipse(
          0,
          0,
          b.r,
          b.r * 0.75,
          b.kind === "enemy"
            ? "#e9695b"
            : b.kind === "bonus"
              ? "#e9cf4a"
              : "#fff3c8",
          INK,
          1.8,
        );
      }
      c.restore();
    }
    this.crab(
      g.player.x,
      g.player.y,
      1.3,
      g.player.walk,
      g.player.invulnerable > 0 && g.damageTaken > 0 && Math.sin(t * 30) > 0,
      true,
    );
    g.guns.forEach((gun, i) => {
      if (gun.id === "saw") {
        const saws = gun.tier === 2 ? 2 : 1;
        for (let n = 0; n < saws; n++) {
          const a = g.time * 4 + (i * Math.PI) / 2 + n * Math.PI;
          this.gun(
            gun.id,
            g.player.x + Math.cos(a) * 92,
            g.player.y + Math.sin(a) * 92,
            g.time * 9,
            0,
            1,
            true,
            gun.tier ?? 1,
          );
        }
      } else {
        const p = g.mount(i);
        this.gun(
          gun.id,
          p.x,
          p.y,
          gun.angle,
          gun.recoil,
          0.95,
          true,
          gun.tier ?? 1,
        );
      }
    });
    for (const f of g.fx) {
      const a = f.life / f.max;
      c.save();
      c.globalAlpha = Math.min(1, a * 2);
      if (f.kind === "number") {
        this.text(f.text!, f.x, f.y, f.size, f.color, true);
      } else if (f.kind === "arc" && f.points) {
        this.line(f.points, INK, 6);
        const jagged = f.points.flatMap((p, i) =>
          i
            ? [
                {
                  x: (p.x + f.points![i - 1].x) / 2 + Math.sin(i + t * 44) * 9,
                  y: (p.y + f.points![i - 1].y) / 2 + Math.cos(i + t * 22) * 9,
                },
                p,
              ]
            : [p],
        );
        this.line(jagged, "#a6f4ce", 3);
      } else if (f.kind === "punch" && f.points) {
        this.line(f.points, INK, 8);
        this.line(f.points, "#e78960", 4);
        this.ellipse(
          f.x,
          f.y,
          14 + 12 * (1 - a),
          12 + 12 * (1 - a),
          "#f1bb60",
          INK,
          2,
        );
      } else if (f.kind === "blast") {
        // Approved explosion palette: orange-yellow flash core, orange outer
        // ring, white shock ring and flying debris. Primary and chain blasts use
        // the same family and are told apart by size and lifetime.
        const r = f.size * (1.25 - a * 0.55);
        this.ellipse(f.x, f.y, r, r, `${f.color}30`, f.color, 6 * a + 1);
        const core = f.size * 0.62 * (0.4 + a * 0.6);
        this.ellipse(f.x, f.y, core, core, BLAST.core, "#0000", 0);
        this.ellipse(
          f.x,
          f.y,
          f.size * (1.9 - a * 0.9),
          f.size * (1.9 - a * 0.9),
          "#0000",
          "#ffffff",
          4 * a,
        );
        for (let i = 0; i < 9; i++) {
          const ang = (i * Math.PI * 2) / 9 + f.x * 0.1,
            d = f.size * (0.7 + a * 0.9);
          this.round(
            f.x + Math.cos(ang) * d,
            f.y + Math.sin(ang) * d,
            9 * a + 2,
            7 * a + 2,
            2,
            i % 2 ? f.color : "#ffd166",
            INK,
            1,
          );
        }
      } else if (f.kind === "pop") {
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3 + f.x,
            r = (1 - a) * f.size * 2.5;
          this.round(
            f.x + Math.cos(ang) * r,
            f.y + Math.sin(ang) * r,
            7 * a + 1,
            5 * a + 1,
            1,
            f.color,
            INK,
            1,
          );
        }
      } else if (f.kind === "wake") {
        this.ellipse(
          f.x,
          f.y,
          8 + 14 * (1 - a),
          5 + 9 * (1 - a),
          "#0000",
          "#fff0a0",
          3,
        );
      } else if (f.kind === "ember") {
        for (let i = 0; i < 7; i++) {
          const ang = (i * Math.PI * 2) / 7 + f.x * 0.07,
            d = f.size * (0.4 + (1 - a) * 0.8);
          this.line(
            [
              {
                x: f.x + Math.cos(ang) * d * 0.55,
                y: f.y + Math.sin(ang) * d * 0.55,
              },
              {
                x: f.x + Math.cos(ang) * d,
                y: f.y + Math.sin(ang) * d,
              },
            ],
            i % 2 ? "#fff0a0" : BLAST.ring,
            3,
          );
        }
      } else {
        this.ellipse(
          f.x,
          f.y,
          18 * (1 - a) + 5,
          18 * (1 - a) + 5,
          "#0000",
          f.color,
          3 * a,
        );
      }
      c.restore();
    }
    if (g.phase === "sweep") {
      this.text("退潮了！统统收回来", 600, 350, 36, CREAM, true);
    }
    // Real chain readout: N is the number of genuine secondary deaths in the
    // strongest chain still alive, never a faked counter.
    if (g.chainCount >= 2 && g.chainTimer > 0) {
      const pop = 1 + Math.max(0, g.chainTimer - 0.55) * 2.4;
      c.save();
      c.translate(g.player.x, g.player.y - 66);
      c.scale(pop, pop);
      this.text(`×${g.chainCount}`, 0, 0, 30, "#ffb020", true);
      c.restore();
    }
  }
  enemy(e: Enemy) {
    const c = this.ctx;
    const stage =
      e.kind === "boss" && e.bossStage
        ? bossForWave(
            e.bossStage === 1
              ? 5
              : e.bossStage === 2
                ? 10
                : e.bossStage === 3
                  ? 15
                  : 20,
          )
        : undefined;
    c.save();
    c.translate(e.x, e.y);
    if (e.born > 0) {
      c.globalAlpha = 0.4;
      this.ellipse(0, 12, e.r * 1.4, e.r * 0.5, "#b4674b22", "#ae7658", 2);
      c.scale(1 - e.born * 0.5, 1 - e.born * 0.5);
    }
    this.ellipse(0, e.r * 0.7, e.r, e.r * 0.36, "#85694744", INK, 0);
    c.rotate(Math.sin(e.age * 9 + e.id) * 0.07);
    c.scale(1 + e.flash * 2, 1 - e.flash * 1.7);
    const color =
      e.flash > 0
        ? CREAM
        : e.kind === "can"
          ? "#858a85"
          : e.kind === "splitter"
            ? "#d88b62"
            : e.kind === "chip"
              ? "#efb35d"
              : e.kind === "spitter"
                ? "#c9944f"
                : ORANGE;
    if (e.kind === "runner") {
      c.beginPath();
      c.moveTo(0, -21);
      c.lineTo(17, 15);
      c.lineTo(-17, 15);
      c.closePath();
      c.fillStyle = e.flash > 0 ? CREAM : "#d78845";
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.stroke();
      this.line(
        [
          { x: -8, y: 5 },
          { x: 8, y: 5 },
        ],
        CREAM,
        5,
      );
    } else if (e.kind === "can") {
      this.round(-22, -25, 44, 48, 8, color, "#424d49", 3);
      this.ellipse(0, -20, 22, 7, "#c1c6b3");
      this.line(
        [
          { x: -14, y: 12 },
          { x: 14, y: 12 },
        ],
        INK,
        3,
      );
      this.line(
        [
          { x: -18, y: -18 },
          { x: 18, y: -18 },
        ],
        "#c26f4f",
        3,
      );
    } else if (e.kind === "splitter") {
      this.ellipse(0, 0, 25, 23, color);
      this.line(
        [
          { x: -20, y: -17 },
          { x: -8, y: -5 },
          { x: -19, y: 9 },
        ],
        INK,
        3,
      );
      this.line(
        [
          { x: 20, y: -17 },
          { x: 8, y: -5 },
          { x: 19, y: 9 },
        ],
        INK,
        3,
      );
      this.line(
        [
          { x: 0, y: -21 },
          { x: 2, y: -8 },
          { x: -5, y: 8 },
        ],
        "#7e4e39",
        3,
      );
    } else if (e.kind === "chip") {
      this.ellipse(0, 0, 8, 8, color, "#7e4e39", 2);
      this.line(
        [
          { x: -5, y: 1 },
          { x: 0, y: -4 },
          { x: 5, y: 2 },
        ],
        "#7e4e39",
        2,
      );
    } else if (e.kind === "spitter") {
      this.ellipse(0, 0, 20, 20, color, "#6c5538", 3);
      this.round(10, -5, 23, 12, 5, "#8d987f", "#4d5d50", 3);
      this.ellipse(32, 1, 4, 6, "#d37550");
      this.line(
        [
          { x: -14, y: -15 },
          { x: -11, y: -24 },
          { x: -4, y: -20 },
        ],
        INK,
        3,
      );
      if ((e.tell ?? 0) > 0) {
        c.setLineDash([3, 5]);
        this.line(
          [
            { x: 34, y: 0 },
            { x: 62, y: 0 },
          ],
          "#ffbe66",
          3,
        );
        c.setLineDash([]);
      }
    } else if (e.kind === "boss") {
      this.round(
        -42,
        -43,
        84,
        83,
        15,
        e.flash > 0 ? CREAM : (stage?.armor ?? "#466d64"),
        INK,
        5,
      );
      this.ellipse(0, -37, 42, 13, "#b5bba0", INK, 4);
      this.round(-27, -20, 54, 40, 5, stage?.core ?? "#db9d51");
      const marks = e.bossStage ?? 1;
      for (let i = 0; i < marks; i++)
        this.line(
          [
            { x: -22 + i * 14, y: 26 },
            { x: -18 + i * 14, y: 35 },
          ],
          i % 2 ? "#d6e1d7" : "#e88a55",
          4,
        );
      this.text("!", 0, 10, 30);
      if ((e.bossStage ?? 1) >= 3) {
        this.round(-59, -8, 16, 31, 5, stage?.armor ?? "#52636d", INK, 3);
        this.round(43, -8, 16, 31, 5, stage?.armor ?? "#52636d", INK, 3);
      }
      this.line(
        [
          { x: -47, y: 17 },
          { x: -59, y: 28 },
        ],
        INK,
        8,
      );
      this.line(
        [
          { x: 47, y: 17 },
          { x: 59, y: 28 },
        ],
        INK,
        8,
      );
    } else {
      this.round(-17, -18, 34, 36, 11, color);
      this.line(
        [
          { x: -10, y: -16 },
          { x: -14, y: -23 },
          { x: -4, y: -21 },
        ],
        INK,
        3,
      );
      this.line(
        [
          { x: 8, y: -17 },
          { x: 14, y: -22 },
          { x: 14, y: -13 },
        ],
        INK,
        3,
      );
    }
    if (e.kind !== "boss") {
      for (const s of [-1, 1]) {
        this.ellipse(s * 6, -3, 4.3, 5, CREAM, INK, 1.5);
        this.ellipse(s * 6, -2, 1.8, 2.8, INK, INK, 0);
      }
      this.line(
        [
          { x: -5, y: 9 },
          { x: 0, y: 6 },
          { x: 5, y: 9 },
        ],
        INK,
        2,
      );
    }
    c.restore();
    if (e.kind === "can" && e.hp < e.maxHp) {
      c.fillStyle = INK;
      c.fillRect(e.x - 20, e.y - 34, 40, 4);
      c.fillStyle = "#a6d2af";
      c.fillRect(e.x - 19, e.y - 33, (38 * e.hp) / e.maxHp, 2);
    }
    if (
      (e.kind === "splitter" || e.kind === "spitter") &&
      e.hp < e.maxHp
    ) {
      c.fillStyle = INK;
      c.fillRect(e.x - 20, e.y - e.r - 12, 40, 4);
      c.fillStyle = e.kind === "spitter" ? "#e5a04d" : "#e08a65";
      c.fillRect(e.x - 19, e.y - e.r - 11, (38 * e.hp) / e.maxHp, 2);
    }
  }
}
