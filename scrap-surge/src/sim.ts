import { clamp, dist, rng, segmentDistance, type Vec } from "./math";
import { WEAPONS, W, H, BLAST, type WeaponId, type ModId } from "./data";
export type Phase = "fight" | "sweep" | "shop" | "paused" | "won" | "lost";
export type Enemy = Vec & {
  id: number;
  kind: "bag" | "runner" | "can" | "boss";
  hp: number;
  maxHp: number;
  r: number;
  vx: number;
  vy: number;
  knockX: number;
  knockY: number;
  flash: number;
  age: number;
  born: number;
  attack: number;
  bowled: Set<number>;
};
export type Bullet = Vec & {
  id: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  kind: "cap" | "rocket" | "bonus" | "enemy";
  target: number;
  r: number;
  homing: boolean;
};
export type Scrap = Vec & {
  id: number;
  value: number;
  vx: number;
  vy: number;
  age: number;
};
// S1b: a lethal spring-fist hit leaves a flying, non-targetable remnant that
// still bowls into other enemies. It is kept out of the live-enemy cap.
export type Corpse = Vec & {
  id: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  chain: number;
  hitIds: Set<number>;
};
export type Fx = {
  kind: "pop" | "blast" | "arc" | "punch" | "number" | "pickup";
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  size: number;
  points?: Vec[];
  text?: string;
};
export type Gun = {
  id: WeaponId;
  cooldown: number;
  angle: number;
  recoil: number;
};
export type Event = {
  type:
    | "fire"
    | "hit"
    | "kill"
    | "explode"
    | "pickup"
    | "hurt"
    | "wave"
    | "buy"
    | "end";
  kind?: WeaponId;
  value?: number;
};
export class Game {
  phase: Phase = "fight";
  beforePause: Phase = "fight";
  player = { x: 600, y: 450, hp: 10, maxHp: 10, invulnerable: 2, walk: 0 };
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  scraps: Scrap[] = [];
  corpses: Corpse[] = [];
  fx: Fx[] = [];
  events: Event[] = [];
  guns: Gun[] = [
    { id: "slinger", cooldown: 0.12, angle: -Math.PI / 2, recoil: 0 },
  ];
  mods: ModId[] = [];
  pendingBlasts: {
    p: Vec;
    radius: number;
    damage: number;
    chain: number;
  }[] = [];
  wave = 1;
  waveTime = 0;
  time = 0;
  kills = 0;
  money = 0;
  earned = 0;
  picked = 0;
  shots = 0;
  hits = 0;
  combatPicked = 0;
  firstKill: number | null = null;
  firstPickup: number | null = null;
  id = 0;
  spawnTimer = 0;
  spawnCount = 0;
  shake = 0;
  sweepTime = 0;
  bossSpawned = false;
  bossKilled = false;
  damageTaken = 0;
  bonusBudget = 0;
  pendingPeak = 0;
  chainCount = 0;
  chainPeak = 0;
  chainTimer = 0;
  chainId = 0;
  nextChainId = 0;
  chainCounts = new Map<number, number>();
  pocketTimes: number[] = [];
  pocketSize = 0;
  pocketIndex = 0;
  offers: WeaponId[] = ["shotgun", "coil", "saw", "rocket"];
  sold = new Set<number>();
  freeRerolls = 1;
  shopRandom: () => number;
  random: () => number;
  constructor(public seed: number) {
    this.random = rng(seed);
    this.shopRandom = rng(seed ^ 0x71bc21);
    this.setPocketSchedule();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.9 + (i / 9) * Math.PI * 0.8;
      this.spawn("bag", {
        x: 600 + Math.cos(a) * 270,
        y: 450 + Math.sin(a) * 270,
      });
    }
  }
  setPocketSchedule() {
    this.pocketIndex = 0;
    this.pocketTimes = this.wave === 1 ? [6, 14] : [5, 12, 19, 26, 32];
    this.pocketSize = this.wave === 1 ? 12 : 18;
  }
  get duration() {
    return this.wave === 1 ? 20 : 35;
  }
  // Past the wave deadline the run continues until the boss dies (or 50s).
  // Exposed so the HUD can show a real countdown instead of a frozen 00.
  get overtime() {
    return this.wave === 2 && this.waveTime > this.duration && !this.bossKilled;
  }
  get displaySeconds() {
    return Math.max(
      0,
      Math.ceil(
        this.overtime ? 50 - this.waveTime : this.duration - this.waveTime,
      ),
    );
  }
  has(id: ModId) {
    return this.mods.includes(id);
  }
  get magnetRadius() {
    return this.has("magnet") ? 300 : 155;
  }
  event(type: Event["type"], kind?: WeaponId, value?: number) {
    this.events.push({ type, kind, value });
  }
  drain() {
    const es = this.events;
    this.events = [];
    return es;
  }
  effect(
    kind: Fx["kind"],
    p: Vec,
    life: number,
    color: string,
    size: number,
    text?: string,
    points?: Vec[],
  ) {
    // Damage numbers that land on nearly the same spot merge into one total so
    // a busy chain does not bury the arena in overlapping digits.
    if (kind === "number" && text) {
      const near = this.fx.find(
        (f) =>
          f.kind === "number" &&
          f.life > 0.2 &&
          Math.abs(f.x - p.x) < 26 &&
          Math.abs(f.y - p.y) < 26,
      );
      if (near) {
        const total = (Number(near.text) || 0) + (Number(text) || 0);
        near.text = String(total);
        near.life = Math.max(near.life, life);
        near.max = Math.max(near.max, life);
        near.size = Math.min(32, near.size + 2);
        if (total >= 40) near.color = "#f3ba43";
        return;
      }
    }
    if (this.fx.length >= 300) this.fx.shift();
    this.fx.push({
      kind,
      x: p.x,
      y: p.y,
      life,
      max: life,
      color,
      size,
      text,
      points,
    });
  }
  spawn(kind: Enemy["kind"], p?: Vec) {
    const a = this.random() * Math.PI * 2,
      r = 340 + this.random() * 100,
      variant = this.random();
    if (this.enemies.length >= 180) return false;
    if (!p) {
      p = {
        x: clamp(this.player.x + Math.cos(a) * r, 28, W - 28),
        y: clamp(this.player.y + Math.sin(a) * r, 28, H - 28),
      };
      if (dist(p, this.player) < 200)
        p = {
          x: this.player.x < W / 2 ? W - 35 : 35,
          y: 60 + variant * (H - 120),
        };
    }
    const hp =
      kind === "boss"
        ? 560
        : kind === "can"
          ? 75
          : kind === "runner"
            ? 19
            : this.wave === 1
              ? 17
              : 23;
    this.enemies.push({
      ...p,
      id: ++this.id,
      kind,
      hp,
      maxHp: hp,
      r:
        kind === "boss"
          ? 48
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
      age: 0,
      born: 0.65,
      attack: 1.6,
      bowled: new Set(),
    });
    return true;
  }
  spawnPocket(count: number) {
    const angle = this.random() * Math.PI * 2,
      radius = 340 + this.random() * 100;
    let cx = clamp(this.player.x + Math.cos(angle) * radius, 60, W - 60),
      cy = clamp(this.player.y + Math.sin(angle) * radius, 60, H - 60);
    if (dist({ x: cx, y: cy }, this.player) < 310) {
      cx = this.player.x < W / 2 ? W - 70 : 70;
      cy = 80 + this.random() * (H - 160);
    }
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (this.random() - 0.5) * 0.42,
        r = 30 + this.random() * 45,
        p = {
          x: clamp(cx + Math.cos(a) * r, 28, W - 28),
          y: clamp(cy + Math.sin(a) * r, 28, H - 28),
        },
        roll = this.random(),
        kind: Enemy["kind"] =
          this.wave === 2 && roll > 0.84
            ? "can"
            : roll > 0.58
              ? "runner"
              : "bag";
      this.spawn(kind, p);
    }
  }
  buy(index: number) {
    if (
      this.phase !== "shop" ||
      this.sold.has(index) ||
      index < 0 ||
      index >= this.offers.length ||
      this.guns.length >= 6
    )
      return false;
    const id = this.offers[index],
      price = WEAPONS[id].price;
    if (this.money < price) return false;
    this.money -= price;
    this.guns.push({
      id,
      cooldown: this.guns.length * 0.08,
      angle: 0,
      recoil: 0,
    });
    this.sold.add(index);
    this.event("buy", id);
    return true;
  }
  chooseMod(id: ModId) {
    if (
      this.phase !== "shop" ||
      this.mods.length >= 2 ||
      this.has(id) ||
      !["popcorn", "domino", "magnet"].includes(id)
    )
      return false;
    this.mods.push(id);
    this.event("buy");
    return true;
  }
  reroll() {
    if (this.phase !== "shop" || (!this.freeRerolls && this.money < 6))
      return false;
    if (this.freeRerolls) this.freeRerolls--;
    else this.money -= 6;
    const pool = Object.keys(WEAPONS) as WeaponId[];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.shopRandom() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.offers = pool.slice(0, 4);
    this.sold.clear();
    return true;
  }
  nextWave() {
    if (this.phase !== "shop") return;
    this.wave = 2;
    this.waveTime = 0;
    this.player.hp = Math.min(10, this.player.hp + 3);
    this.player.invulnerable = 2;
    this.enemies = [];
    this.bullets = [];
    this.corpses = [];
    this.fx = [];
    this.player.x = 600;
    this.player.y = 450;
    this.spawnTimer = 0.2;
    this.setPocketSchedule();
    this.phase = "fight";
    this.event("wave");
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.spawn("bag", {
        x: 600 + Math.cos(a) * 300,
        y: 400 + Math.sin(a) * 280,
      });
    }
  }
  pause() {
    if (this.phase === "fight" || this.phase === "sweep") {
      this.beforePause = this.phase;
      this.phase = "paused";
    }
  }
  resume() {
    if (this.phase === "paused") this.phase = this.beforePause;
  }
  hurt() {
    if (this.player.invulnerable > 0 || this.phase !== "fight") return;
    this.player.hp--;
    this.damageTaken++;
    this.player.invulnerable = 1.05;
    this.shake = 0.3;
    this.effect("blast", this.player, 0.35, "#ed7552", 35);
    this.event("hurt");
    if (this.player.hp <= 0) {
      this.phase = "lost";
      this.event("end");
    }
  }
  hit(
    e: Enemy,
    amount: number,
    from: Vec,
    source: "weapon" | "secondary" = "weapon",
    force = 75,
    chain = 0,
    corpse = false,
  ) {
    if (e.hp <= 0 || e.born > 0) return;
    this.hits++;
    e.hp -= amount;
    e.flash = 0.09;
    const d = dist(e, from) || 1;
    e.knockX += ((e.x - from.x) / d) * force;
    e.knockY += ((e.y - from.y) / d) * force;
    this.effect(
      "number",
      e,
      0.55,
      amount >= 40 ? "#f3ba43" : "#ffffff",
      amount >= 40 ? 24 : 16,
      String(Math.round(amount)),
    );
    if (e.hp > 0) return;
    // The chain counter only tracks real secondary deaths (kills caused by a
    // queued explosion). A primary weapon kill, including a rocket's radius
    // damage, never fabricates a chain; it merely starts a new chain id whose
    // descendants are the ones that count. Counts are kept per causal root so
    // interleaved chains cannot inflate each other.
    const inChain = source === "secondary" && chain > 0;
    if (inChain) {
      const n = (this.chainCounts.get(chain) || 0) + 1;
      this.chainCounts.set(chain, n);
      this.chainId = chain;
      if (n > this.chainCount) this.chainCount = n;
      this.chainPeak = Math.max(this.chainPeak, this.chainCount);
      this.chainTimer = 0.8;
    }
    this.kills++;
    if (this.firstKill === null) this.firstKill = this.time;
    this.event("kill");
    this.shake = Math.max(this.shake, 0.13);
    // A lethal spring-fist hit keeps flying as a remnant so its bowling
    // knockback still lands, instead of vanishing with the dead enemy.
    if (corpse) this.spawnCorpse(e, from);
    this.effect("pop", e, 0.42, e.kind === "can" ? "#83aaa4" : "#f07558", e.r);
    if (e.kind === "boss") {
      this.bossKilled = true;
      this.effect("blast", e, 0.7, "#efaa39", 130);
      this.event("explode");
    }
    const value = e.kind === "boss" ? 15 : e.kind === "can" ? 4 : 2;
    if (this.scraps.length < 250)
      this.scraps.push({
        x: e.x,
        y: e.y,
        id: ++this.id,
        value,
        vx: (this.random() - 0.5) * 140,
        vy: (this.random() - 0.5) * 140,
        age: 0,
      });
    else this.scraps[this.scraps.length - 1].value += value;
    // Death is settled once (hp <= 0 guard). Chained explosions are queued, not recursive.
    if (this.has("domino"))
      this.pendingBlasts.push({
        p: { x: e.x, y: e.y },
        radius: 75,
        damage: 26,
        chain: inChain ? chain : ++this.nextChainId,
      });
    this.pendingPeak = Math.max(this.pendingPeak, this.pendingBlasts.length);
  }
  spawnCorpse(e: Enemy, from: Vec) {
    if (this.corpses.length >= 180) this.corpses.shift();
    const d = dist(e, from) || 1;
    this.corpses.push({
      x: e.x,
      y: e.y,
      id: ++this.id,
      vx: ((e.x - from.x) / d) * 650,
      vy: ((e.y - from.y) / d) * 650,
      life: 0.6,
      max: 0.6,
      r: e.r,
      chain: ++this.nextChainId,
      hitIds: new Set<number>(),
    });
  }
  explode(p: Vec, radius: number, damage: number, primary = true, chain = 0) {
    // Primary and chain blasts share the approved orange-yellow explosion
    // palette. They are told apart by size and lifetime, not by a new hue.
    this.effect("blast", p, primary ? 0.32 : 0.3, BLAST.ring, radius);
    this.shake = Math.max(this.shake, 0.2);
    this.event("explode");
    for (const e of this.enemies)
      if (e.hp > 0 && dist(e, p) < radius + e.r)
        this.hit(e, damage, p, primary ? "weapon" : "secondary", 170, chain);
  }
  shoot(
    from: Vec,
    angle: number,
    damage: number,
    kind: Bullet["kind"] = "cap",
    target = 0,
    speed = 600,
    homing = false,
  ) {
    if (this.bullets.length >= 420) return;
    this.shots++;
    this.bullets.push({
      ...from,
      id: ++this.id,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      kind,
      target,
      r: kind === "rocket" ? 8 : kind === "enemy" ? 7 : 5,
      homing,
      life: kind === "enemy" ? 5 : 1.3,
    });
  }
  collect(s: Scrap) {
    if (s.value <= 0) return;
    this.money += s.value;
    this.earned += s.value;
    this.picked++;
    if (this.firstPickup === null) this.firstPickup = this.time;
    this.effect("pickup", this.player, 0.25, "#eeb63c", 9);
    this.event("pickup", undefined, s.value);
    s.value = 0;
    if (this.phase !== "fight") return;
    this.combatPicked++;
    if (this.has("popcorn") && this.bonusBudget < 8) {
      const t = this.enemies
        .filter((e) => e.hp > 0 && e.born <= 0)
        .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
      if (t) {
        const a = Math.atan2(t.y - this.player.y, t.x - this.player.x);
        for (const offset of [-0.3, 0.3])
          this.shoot(this.player, a + offset, 18, "bonus", t.id, 500, true);
        this.bonusBudget += 2;
      }
    }
    if (this.has("magnet") && this.combatPicked % 8 === 0) {
      for (let i = 0; i < 10; i++)
        this.shoot(this.player, (i * Math.PI) / 5, 24, "bonus", 0, 550);
      this.effect("blast", this.player, 0.3, BLAST.ring, 70);
    }
  }
  weapons(dt: number) {
    const incoming = new Map<number, number>();
    for (const b of this.bullets)
      if (b.target && b.life > 0)
        incoming.set(b.target, (incoming.get(b.target) || 0) + b.damage);
    for (let index = 0; index < this.guns.length; index++) {
      const gun = this.guns[index],
        info = WEAPONS[gun.id];
      gun.cooldown -= dt;
      gun.recoil = Math.max(0, gun.recoil - dt * 7);
      if (gun.cooldown > 0) continue;
      if (gun.id === "saw") {
        const a = this.time * 4 + (index * Math.PI) / 2,
          p = {
            x: this.player.x + Math.cos(a) * 83,
            y: this.player.y + Math.sin(a) * 83,
          };
        for (const e of this.enemies)
          if (e.hp > 0 && dist(e, p) < e.r + 24) this.hit(e, info.damage, p);
        gun.cooldown = info.interval;
        continue;
      }
      const enemies = this.enemies
        .filter(
          (e) => e.hp > 0 && e.born <= 0 && dist(e, this.player) <= info.range,
        )
        .sort((a, b) => dist(a, this.player) - dist(b, this.player));
      const target = enemies.find((e) => e.hp > (incoming.get(e.id) || 0));
      if (!target) {
        gun.cooldown = 0.04;
        continue;
      }
      const lead =
        gun.id === "rocket"
          ? 0
          : Math.min(0.5, dist(target, this.player) / 600);
      const mount = this.mount(index);
      // Aim from the mount the bullet actually leaves, not the player centre.
      // Aiming from the player centre offset every shot by the mount's
      // perpendicular distance, so an enemy level with the player on the
      // mount's left or right was shot straight past and never hit.
      gun.angle = Math.atan2(
        target.y + target.vy * lead - mount.y,
        target.x + target.vx * lead - mount.x,
      );
      gun.cooldown = info.interval;
      gun.recoil = 1;
      const muzzle = {
        x: mount.x + Math.cos(gun.angle) * 24,
        y: mount.y + Math.sin(gun.angle) * 24,
      };
      this.event("fire", gun.id);
      if (gun.id === "coil") {
        const chain: Vec[] = [mount],
          seen = new Set<number>();
        let current: Vec = target;
        for (let n = 0; n < 5; n++) {
          const e =
            n === 0
              ? target
              : this.enemies
                  .filter(
                    (e) =>
                      e.hp > 0 &&
                      e.born <= 0 &&
                      !seen.has(e.id) &&
                      dist(e, current) < 170,
                  )
                  .sort((a, b) => dist(a, current) - dist(b, current))[0];
          if (!e) break;
          seen.add(e.id);
          chain.push({ ...e });
          this.hit(e, info.damage, current);
          current = e;
        }
        this.effect("arc", mount, 0.2, "#9becce", 4, undefined, chain);
      } else if (gun.id === "fist") {
        this.hit(target, info.damage, this.player, "weapon", 650, 0, true);
        this.effect("punch", target, 0.22, "#ef896b", 30, undefined, [
          mount,
          { ...target },
        ]);
      } else if (gun.id === "shotgun") {
        for (let n = -2; n <= 2; n++)
          this.shoot(
            muzzle,
            gun.angle + n * 0.13,
            info.damage,
            "cap",
            n === 0 ? target.id : 0,
            520,
          );
        incoming.set(target.id, (incoming.get(target.id) || 0) + info.damage);
      } else {
        this.shoot(
          muzzle,
          gun.angle,
          info.damage,
          gun.id === "rocket" ? "rocket" : "cap",
          target.id,
          gun.id === "rocket" ? 390 : 650,
          gun.id === "rocket",
        );
        incoming.set(target.id, (incoming.get(target.id) || 0) + info.damage);
      }
    }
  }
  mount(index: number) {
    const a =
      -Math.PI / 2 + (index / Math.max(3, this.guns.length)) * Math.PI * 2;
    return {
      x: this.player.x + Math.cos(a) * 40,
      y: this.player.y + Math.sin(a) * 33,
    };
  }
  step(dt: number, input: Vec) {
    if (this.phase !== "fight" && this.phase !== "sweep") return;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.bonusBudget = 0;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    for (const f of this.fx) {
      f.life -= dt;
      if (f.kind === "number") f.y -= dt * 36;
    }
    this.fx = this.fx.filter((f) => f.life > 0);
    if (this.phase === "fight") {
      this.waveTime += dt;
      this.chainTimer = Math.max(0, this.chainTimer - dt);
      if (this.chainTimer === 0 && this.chainCount > 0) {
        this.chainCount = 0;
        this.chainCounts.clear();
      }
      const l = Math.hypot(input.x, input.y);
      if (l) {
        this.player.x = clamp(
          this.player.x + (input.x / Math.max(1, l)) * 230 * dt,
          30,
          W - 30,
        );
        this.player.y = clamp(
          this.player.y + (input.y / Math.max(1, l)) * 230 * dt,
          30,
          H - 30,
        );
        this.player.walk += dt * 15;
      }
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.wave === 1 ? 1 / 3.1 : 1 / 4.2;
        const r = this.random();
        const spawned = this.spawn(
          this.wave === 1
            ? r > 0.87
              ? "runner"
              : "bag"
            : r > 0.84
              ? "can"
              : r > 0.6
                ? "runner"
                : "bag",
        );
        // spawnCount tracks successful spawns only, not attempts rejected by
        // the live-enemy cap (S1b fairness metric).
        if (spawned) this.spawnCount++;
      }
      while (
        this.pocketIndex < this.pocketTimes.length &&
        this.waveTime >= this.pocketTimes[this.pocketIndex]
      ) {
        this.pocketIndex++;
        this.spawnPocket(this.pocketSize);
      }
      if (this.wave === 2 && this.waveTime >= 18 && !this.bossSpawned) {
        this.bossSpawned = true;
        this.spawn("boss", { x: this.player.x < 600 ? 900 : 300, y: 220 });
        this.event("wave");
      }
      this.weapons(dt);
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.age += dt;
        e.born = Math.max(0, e.born - dt);
        e.flash = Math.max(0, e.flash - dt);
        if (e.born > 0) continue;
        const dx = this.player.x - e.x,
          dy = this.player.y - e.y,
          l = Math.hypot(dx, dy) || 1,
          speed =
            e.kind === "boss"
              ? 32
              : e.kind === "can"
                ? 39
                : e.kind === "runner"
                  ? 102
                  : 57;
        e.vx = (dx / l) * speed;
        e.vy = (dy / l) * speed;
        // Simple symmetric soft separation; contact and targeting still use world geometry.
        for (const other of this.enemies) {
          if (other.id <= e.id || other.hp <= 0 || other.born > 0) continue;
          const d = dist(e, other),
            need = (e.r + other.r) * 0.8;
          if (d > 0 && d < need) {
            const push = (need - d) * 0.07;
            e.x += ((e.x - other.x) / d) * push;
            e.y += ((e.y - other.y) / d) * push;
            other.x -= ((e.x - other.x) / d) * push;
            other.y -= ((e.y - other.y) / d) * push;
          }
        }
        if (Math.hypot(e.knockX, e.knockY) > 250)
          for (const other of this.enemies) {
            if (
              other.id !== e.id &&
              other.hp > 0 &&
              !e.bowled.has(other.id) &&
              dist(other, e) < other.r + e.r
            ) {
              e.bowled.add(other.id);
              this.hit(other, 30, e, "secondary", 170);
            }
          }
        e.x = clamp(e.x + (e.vx + e.knockX) * dt, 18, W - 18);
        e.y = clamp(e.y + (e.vy + e.knockY) * dt, 18, H - 18);
        e.knockX *= Math.exp(-dt * 7);
        e.knockY *= Math.exp(-dt * 7);
        if (dist(e, this.player) < e.r + 17) this.hurt();
        if (e.kind === "boss") {
          e.attack -= dt;
          if (e.attack <= 0) {
            e.attack = 2.4;
            for (let i = 0; i < 8; i++)
              this.shoot(
                e,
                (i * Math.PI) / 4 + e.age * 0.15,
                1,
                "enemy",
                0,
                120,
              );
            this.effect("blast", e, 0.3, "#ed7552", 60);
          }
        }
      }
      // S1b: spring-fist remnants keep flying after a lethal hit. They are not
      // targetable and never touch the player; each enemy can be bowled once.
      for (const k of this.corpses) {
        k.life -= dt;
        k.x = clamp(k.x + k.vx * dt, 18, W - 18);
        k.y = clamp(k.y + k.vy * dt, 18, H - 18);
        k.vx *= Math.exp(-dt * 7);
        k.vy *= Math.exp(-dt * 7);
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.born > 0 || k.hitIds.has(e.id)) continue;
          if (dist(e, k) < e.r + k.r) {
            k.hitIds.add(e.id);
            this.hit(e, 30, k, "secondary", 170, k.chain);
          }
        }
      }
      if (this.corpses.length)
        this.corpses = this.corpses.filter((k) => k.life > 0);
      for (const b of this.bullets) {
        if (b.life <= 0) continue;
        const old = { x: b.x, y: b.y };
        if (b.homing) {
          const target = this.enemies.find(
            (e) => e.id === b.target && e.hp > 0,
          );
          if (target) {
            const d = dist(target, b) || 1,
              speed = b.kind === "rocket" ? 390 : 500;
            b.vx += (((target.x - b.x) / d) * speed - b.vx) * dt * 5;
            b.vy += (((target.y - b.y) / d) * speed - b.vy) * dt * 5;
          }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.kind === "enemy") {
          if (segmentDistance(this.player, old, b) < b.r + 15) {
            this.hurt();
            b.life = 0;
          }
        } else {
          const e = this.enemies.find(
            (e) =>
              e.hp > 0 && e.born <= 0 && segmentDistance(e, old, b) < e.r + b.r,
          );
          if (e) {
            if (b.kind === "rocket") this.explode(b, 92, b.damage);
            else
              this.hit(
                e,
                b.damage,
                old,
                b.kind === "bonus" ? "secondary" : "weapon",
              );
            b.life = 0;
          }
        }
      }
      for (let i = 0; i < 12 && this.pendingBlasts.length; i++) {
        const blast = this.pendingBlasts.shift()!;
        this.explode(blast.p, blast.radius, blast.damage, false, blast.chain);
      }
      // Reclaim chain roots with no queued work and no live remnant. Without
      // this, sustained secondary kills keep refreshing chainTimer and finished
      // roots would never be released in a long run. The xN readout is a separate
      // scalar (chainCount) and still decays on its own 0.8s timer.
      if (this.chainCounts.size) {
        const live = new Set<number>();
        for (const b of this.pendingBlasts) live.add(b.chain);
        for (const k of this.corpses) live.add(k.chain);
        for (const id of this.chainCounts.keys())
          if (!live.has(id)) this.chainCounts.delete(id);
      }
      if (
        this.phase === "fight" &&
        this.waveTime >= this.duration &&
        (this.wave === 1 || this.bossKilled)
      ) {
        this.phase = "sweep";
        this.sweepTime = 1;
        this.enemies = [];
        this.bullets = [];
        this.pendingBlasts = [];
        this.corpses = [];
        this.event("wave");
      }
      if (this.phase === "fight" && this.wave === 2 && this.waveTime > 50) {
        this.phase = "lost";
        this.event("end");
      }
    } else {
      this.sweepTime -= dt;
      if (this.sweepTime <= 0) {
        for (const s of this.scraps) this.collect(s);
        this.scraps = [];
        this.phase = this.wave === 1 ? "shop" : "won";
        if (this.phase === "won") this.event("end");
      }
    }
    for (const s of this.scraps) {
      s.age += dt;
      const d = dist(s, this.player);
      if (d < this.magnetRadius || this.phase === "sweep") {
        const speed = 200 + Math.min(900, s.age * 300);
        s.vx = ((this.player.x - s.x) / (d || 1)) * speed;
        s.vy = ((this.player.y - s.y) / (d || 1)) * speed;
      } else {
        s.vx *= Math.exp(-dt * 5);
        s.vy *= Math.exp(-dt * 5);
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (d < 22 || dist(s, this.player) < 22) this.collect(s);
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    this.bullets = this.bullets.filter(
      (b) =>
        b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30,
    );
    this.scraps = this.scraps.filter((s) => s.value > 0);
  }
}
