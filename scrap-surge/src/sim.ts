import { clamp, dist, rng, segmentDistance, type Vec } from "./math";
import { WEAPONS, W, H, BLAST, type WeaponId, type ModId } from "./data";
import {
  BAG_HP,
  BOSS_STAGES,
  DURATIONS,
  GUN_TIER,
  MIX_KINDS,
  POCKETS,
  POCKET_MIX,
  RATES,
  MIX,
  bossForWave,
  enemyHp,
  gunPrice,
  gunSlotCap,
  isBossWave,
  quickKind,
  rerollPrice,
  stopAfter,
  tier2Capacity,
  tier2Price,
  type ExpeditionBranch,
  type ExpeditionEnemyKind,
  type Formation,
  type GameMode,
  type Stop,
} from "./expedition";
export type Phase =
  | "fight"
  | "sweep"
  | "interlude"
  | "shop"
  | "quick"
  | "paused"
  | "won"
  | "lost";
export type Enemy = Vec & {
  id: number;
  kind: ExpeditionEnemyKind | "boss";
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
  bossStage?: 1 | 2 | 3 | 4;
  volleys?: number;
  tell?: number;
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
  pierce?: number;
  hitIds?: Set<number>;
};
export type Scrap = Vec & {
  id: number;
  value: number;
  vx: number;
  vy: number;
  age: number;
  heat?: number;
  root?: number;
  exploded?: boolean;
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
  kind:
    | "pop"
    | "blast"
    | "arc"
    | "punch"
    | "number"
    | "pickup"
    | "wake"
    | "ember";
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
  tier?: 1 | 2;
  paid?: number;
};
export type WakePoint = Vec & {
  id: number;
  life: number;
  max: number;
  radius: number;
  damage: number;
  root: number;
  hitIds: Set<number>;
};
export type PocketBatch = {
  wave: number;
  time: number;
  requested: number;
  spawned: number;
  rejected: number;
  formation: Formation;
  center: Vec;
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
    | "boss"
    | "branch"
    | "tier"
    | "buy"
    | "end";
  kind?: WeaponId;
  value?: number;
  mod?: ModId;
  tier?: number;
};
export class Game {
  mode: GameMode;
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
  // F0 read-only instruments. Per run: a new Game starts them at zero and the
  // paused phase never steps, so they only advance during real combat. They are
  // counts of what already happened - they never change combat, RNG, target
  // choice or the bullet budget.
  shootAcceptedPlayer = 0;
  shootAcceptedEnemy = 0;
  shootRejectedPlayer = 0;
  shootRejectedEnemy = 0;
  bulletPeak = 0;
  popcornBudgetSkippedPickups = 0;
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
  expeditionBonusBudget = 0;
  pendingPeak = 0;
  chainCount = 0;
  chainPeak = 0;
  chainTimer = 0;
  chainId = 0;
  nextChainId = 0;
  chainCounts = new Map<number, number>();
  dominoRadius = new Map<number, number>();
  pocketTimes: number[] = [];
  pocketSize = 0;
  pocketIndex = 0;
  offers: WeaponId[] = ["shotgun", "coil", "saw", "rocket"];
  sold = new Set<number>();
  freeRerolls = 1;
  shopRerollIndex = 0;
  quickOptions: (ModId | ExpeditionBranch)[] = [];
  quickPicked = false;
  modTiers = new Map<ModId, number>();
  branch: ExpeditionBranch | null = null;
  wakePoints: WakePoint[] = [];
  wakeAnchor: Vec = { x: 600, y: 450 };
  popcornCredits = 0;
  popcornDrained = 0;
  popcornPendingCancelled = 0;
  ringPending = 0;
  ringPendingCancelled = 0;
  ringCharge = 0;
  ringCooldown = 0;
  magnetPulse = 0;
  magnetPulseCooldown = 0;
  spitterFallbackToBag = 0;
  pocketRejected = 0;
  pocketBatches: PocketBatch[] = [];
  expeditionBatches: {
    time: number;
    count: number;
    formation: Formation;
    group: 0 | 1;
    pair: boolean;
  }[] = [];
  expeditionBatchIndex = 0;
  expeditionClusterCenters = new Map<number, [Vec, Vec]>();
  interludeRemaining = 0;
  stop: Stop | null = null;
  qaStart?: never;
  shopRandom: () => number;
  random: () => number;
  constructor(
    public seed: number,
    mode: GameMode = "slice",
  ) {
    this.mode = mode;
    this.random = rng(seed);
    this.shopRandom = rng(seed ^ 0x71bc21);
    if (mode === "expedition20") {
      this.guns[0] = {
        id: "slinger",
        cooldown: 0.12,
        angle: -Math.PI / 2,
        recoil: 0,
        tier: 1,
        paid: 0,
      };
      return;
    }
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
    if (this.mode === "expedition20") {
      this.pocketIndex = 0;
      this.pocketTimes = [];
      this.pocketSize = 0;
      return;
    }
    this.pocketIndex = 0;
    this.pocketTimes = this.wave === 1 ? [6, 14] : [5, 12, 19, 26, 32];
    this.pocketSize = this.wave === 1 ? 12 : 18;
  }
  get duration() {
    if (this.mode === "expedition20")
      return DURATIONS[clamp(this.wave, 1, 20) - 1];
    return this.wave === 1 ? 20 : 35;
  }
  get deadline() {
    return this.duration + (this.mode === "expedition20" ? 15 : 15);
  }
  // Past the wave deadline the run continues until the boss dies (or 50s).
  // Exposed so the HUD can show a real countdown instead of a frozen 00.
  get overtime() {
    if (this.mode === "expedition20")
      return (
        isBossWave(this.wave) &&
        this.waveTime > this.duration &&
        !this.bossKilled
      );
    return this.wave === 2 && this.waveTime > this.duration && !this.bossKilled;
  }
  get displaySeconds() {
    return Math.max(
      0,
      Math.ceil(
        this.overtime
          ? this.deadline - this.waveTime
          : this.duration - this.waveTime,
      ),
    );
  }
  get slotCap() {
    return this.mode === "expedition20" ? gunSlotCap(this.wave) : 6;
  }
  get tier2Cap() {
    return this.mode === "expedition20" ? tier2Capacity(this.wave) : 0;
  }
  get tier2Count() {
    return this.guns.filter((g) => (g.tier ?? 1) === 2).length;
  }
  get pendingBoss() {
    if (this.mode !== "expedition20" || !isBossWave(this.wave))
      return false;
    return this.waveTime >= this.duration - 18 && !this.bossSpawned;
  }
  has(id: ModId) {
    return this.mods.includes(id);
  }
  modTier(id: ModId) {
    if (this.mode !== "expedition20") return this.has(id) ? 1 : 0;
    return this.modTiers.get(id) ?? (this.has(id) ? 1 : 0);
  }
  get magnetRadius() {
    return this.has("magnet") ? 300 : 155;
  }
  get dropsUnlocked() {
    return this.mode !== "expedition20" || this.phase === "sweep";
  }
  event(type: Event["type"], kind?: WeaponId, value?: number, mod?: ModId) {
    this.events.push({ type, kind, value, mod });
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
  spawn(kind: Enemy["kind"], p?: Vec): boolean {
    const a = this.random() * Math.PI * 2,
      r = 340 + this.random() * 100,
      variant = this.random();
    if (
      this.mode === "expedition20" &&
      kind === "spitter" &&
      this.enemies.filter((e) => e.kind === "spitter" && e.hp > 0).length >= 6
    ) {
      this.spitterFallbackToBag++;
      return this.spawn("bag", p);
    }
    if (this.enemies.length >= 180) return false;
    // F0: once wave 2 is past the boss trigger and the boss is still pending,
    // ordinary spawns stop one short of the 180 cap so a slot is always held
    // for the boss. The three RNG draws above keep their old order; only this
    // reject condition is added. The cap itself is unchanged and nothing is
    // ever deleted to free room - a full arena simply waits for a real death.
    if (
      (this.mode === "slice" &&
        kind !== "boss" &&
        this.wave === 2 &&
        this.waveTime >= 18 &&
        !this.bossSpawned &&
        this.enemies.length >= 179) ||
      (this.mode === "expedition20" &&
        kind !== "boss" &&
        this.pendingBoss &&
        this.enemies.length >= 179)
    )
      return false;
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
    const exp = this.mode === "expedition20",
      boss = exp ? bossForWave(this.wave) : undefined,
      hp =
      kind === "boss"
        ? (boss?.hp ?? 560)
        : exp
          ? enemyHp(kind, this.wave)
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
      age: 0,
      born:
        kind === "spitter" && exp ? 0.8 : 0.65,
      attack:
        kind === "boss"
          ? (boss?.interval ?? 2.4)
          : kind === "spitter"
            ? 0.8
            : 1.6,
      bowled: new Set(),
      bossStage: kind === "boss" ? boss?.stage : undefined,
      volleys: kind === "boss" ? 0 : undefined,
      tell: 0,
    });
    // Expedition uses a complete successful-birth total, including timer
    // spawns, pockets, splitter children and boss additions. The frozen slice
    // keeps its existing timer-only accounting.
    if (this.mode === "expedition20") this.spawnCount++;
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
  pickKind(mix: readonly number[], pocket = false): Enemy["kind"] {
    const roll = this.random() * 100;
    let total = 0;
    for (let i = 0; i < MIX_KINDS.length; i++) {
      total += mix[i];
      if (roll < total) {
        let kind = MIX_KINDS[i];
        if (kind === "splitter" && this.wave < 6) kind = "bag";
        if (kind === "spitter" && this.wave < 12) kind = "bag";
        return kind;
      }
    }
    return "bag";
  }
  safePocketCenter(radius = 75, other?: Vec) {
    for (let i = 0; i < 8; i++) {
      const angle = this.random() * Math.PI * 2,
        distance = 340 + this.random() * 100;
      const p = {
        x: clamp(this.player.x + Math.cos(angle) * distance, 60, W - 60),
        y: clamp(this.player.y + Math.sin(angle) * distance, 60, H - 60),
      };
      if (dist(p, this.player) >= 310 && (!other || dist(p, other) >= 200))
        return p;
    }
    const y = other ? 80 : clamp(this.player.y, 80, H - 80);
    return {
      x: this.player.x < W / 2 ? W - 70 : 70,
      y,
    };
  }
  twoClusterCenters(): [Vec, Vec] {
    for (let i = 0; i < 8; i++) {
      const first = this.randomPocketCenter(),
        second = this.randomPocketCenter();
      if (
        dist(first, this.player) >= 310 &&
        dist(second, this.player) >= 310 &&
        dist(first, second) >= 200
      )
        return [first, second];
    }
    const x = this.player.x < W / 2 ? W - 70 : 70;
    return [
      { x, y: 80 },
      { x, y: H - 80 },
    ];
  }
  randomPocketCenter() {
    const angle = this.random() * Math.PI * 2,
      distance = 340 + this.random() * 100;
    return {
      x: clamp(this.player.x + Math.cos(angle) * distance, 60, W - 60),
      y: clamp(this.player.y + Math.sin(angle) * distance, 60, H - 60),
    };
  }
  pocketMemberPoint(center: Vec, radius: number, angle: number): Vec {
    const rr = 30 + this.random() * Math.max(1, radius - 30);
    let p = {
      x: clamp(center.x + Math.cos(angle) * rr, 28, W - 28),
      y: clamp(center.y + Math.sin(angle) * rr, 28, H - 28),
    };
    if (dist(p, this.player) >= 235) return p;
    // Clamping a ring point at an arena edge must never move it inside the
    // approved individual-enemy safety radius. Preserve the deterministic
    // spawn attempt, then choose the nearest in-bounds point on that radius.
    const dx = p.x - this.player.x,
      dy = p.y - this.player.y,
      d = Math.hypot(dx, dy) || 1;
    p = {
      x: clamp(this.player.x + (dx / d) * 236, 28, W - 28),
      y: clamp(this.player.y + (dy / d) * 236, 28, H - 28),
    };
    if (dist(p, this.player) >= 235) return p;
    for (const a of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
      const q = {
        x: clamp(this.player.x + Math.cos(a) * 236, 28, W - 28),
        y: clamp(this.player.y + Math.sin(a) * 236, 28, H - 28),
      };
      if (dist(q, this.player) >= 235) return q;
    }
    return p;
  }
  spawnExpeditionBatch(
    kind: "ring" | "stream" | "two-cluster",
    count: number,
    radius: number,
    center?: Vec,
  ) {
    const actualCenter = center ?? this.safePocketCenter(radius);
    let spawned = 0;
    const mix = POCKET_MIX[this.wave - 1];
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2 + (this.random() - 0.5) * 0.42,
        p = this.pocketMemberPoint(actualCenter, radius, a);
      if (this.spawn(this.pickKind(mix, true), p)) spawned++;
    }
    this.pocketRejected += count - spawned;
    this.pocketBatches.push({
      wave: this.wave,
      time: this.waveTime,
      requested: count,
      spawned,
      rejected: count - spawned,
      formation: kind,
      center: { x: actualCenter.x, y: actualCenter.y },
    });
    return spawned;
  }
  buildExpeditionPocketSchedule() {
    this.expeditionBatches = [];
    this.expeditionClusterCenters.clear();
    for (const [time, count, formation] of POCKETS[this.wave - 1]) {
      if (formation === "stream") {
        const first = Math.ceil(count / 3),
          second = Math.ceil((count - first) / 2),
          third = count - first - second;
        [first, second, third].forEach((n, i) => {
          if (n > 0)
            this.expeditionBatches.push({
              time: time + i * 0.4,
              count: n,
              formation,
              group: 0,
              pair: false,
            });
        });
      } else if (formation === "two-cluster") {
        const first = Math.ceil(count / 2),
          second = Math.floor(count / 2);
        if (first)
          this.expeditionBatches.push({
            time,
            count: first,
            formation,
            group: 0,
            pair: true,
          });
        if (second)
          this.expeditionBatches.push({
            time,
            count: second,
            formation,
            group: 1,
            pair: true,
          });
      } else {
        this.expeditionBatches.push({
          time,
          count,
          formation,
          group: 0,
          pair: false,
        });
      }
    }
    this.expeditionBatches.sort((a, b) => a.time - b.time);
    this.expeditionBatchIndex = 0;
  }
  buy(index: number) {
    if (this.mode === "expedition20")
      return this.buyExpedition(index);
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
  buyExpedition(index: number) {
    if (
      this.phase !== "shop" ||
      this.sold.has(index) ||
      index < 0 ||
      index >= this.offers.length ||
      this.guns.length >= this.slotCap
    )
      return false;
    const id = this.offers[index],
      price = gunPrice(id, this.wave);
    if (this.money < price) return false;
    this.money -= price;
    this.guns.push({
      id,
      cooldown: this.guns.length * 0.08,
      angle: 0,
      recoil: 0,
      tier: 1,
      paid: price,
    });
    this.sold.add(index);
    this.event("buy", id);
    return true;
  }
  upgrade(index: number) {
    if (this.mode !== "expedition20" || this.phase !== "shop") return false;
    const gun = this.guns[index];
    if (!gun || (gun.tier ?? 1) !== 1) return false;
    if (this.tier2Count >= this.tier2Cap) return false;
    const price = tier2Price(gun.id, this.wave);
    if (this.money < price) return false;
    this.money -= price;
    gun.tier = 2;
    gun.paid = (gun.paid ?? 0) + price;
    this.event("tier", gun.id, price);
    return true;
  }
  sell(index: number) {
    if (this.mode !== "expedition20" || this.phase !== "shop") return false;
    if (this.guns.length <= 1 || !this.guns[index]) return false;
    const refund = Math.floor(0.35 * (this.guns[index].paid ?? 0));
    this.money += refund;
    this.guns.splice(index, 1);
    return true;
  }
  upgradePrice(index: number) {
    const gun = this.guns[index];
    return gun ? tier2Price(gun.id, this.wave) : 0;
  }
  sellPrice(index: number) {
    const gun = this.guns[index];
    return gun ? Math.floor(0.35 * (gun.paid ?? 0)) : 0;
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
    if (this.mode === "expedition20") this.modTiers.set(id, 1);
    this.event("buy", undefined, undefined, id);
    return true;
  }
  chooseQuick(value: ModId | ExpeditionBranch | number) {
    if (this.mode !== "expedition20" || this.phase !== "quick") return false;
    const kind = quickKind(this.wave);
    if (!kind) return false;
    if (kind === "mod-1" || kind === "mod-2") {
      if (this.mods.length >= (kind === "mod-1" ? 1 : 2)) return false;
      const id = value as ModId;
      if (
        !["popcorn", "domino", "magnet"].includes(id) ||
        this.has(id)
      )
        return false;
      this.mods.push(id);
      this.modTiers.set(id, 1);
      this.event("buy", undefined, undefined, id);
      this.quickPicked = true;
      return true;
    }
    if (kind === "branch") {
      if (this.branch || !["wake", "ember"].includes(String(value))) return false;
      this.branch = value as ExpeditionBranch;
      this.wakeAnchor = { x: this.player.x, y: this.player.y };
      this.event("branch", undefined, this.branch === "wake" ? 1 : 2);
      this.quickPicked = true;
      return true;
    }
    const index = typeof value === "number" ? value : Number.NaN;
    const id =
      typeof value === "string" ? (value as ModId) : this.mods[index];
    if (!id) return false;
    if (!this.quickOptions.includes(id)) return false;
    const tier = this.modTier(id);
    if (tier >= 3) return false;
    this.modTiers.set(id, tier + 1);
    this.event("tier", undefined, tier + 1, id);
    this.quickPicked = true;
    return true;
  }
  reroll() {
    if (this.mode === "expedition20") {
      if (this.phase !== "shop") return false;
      const price = rerollPrice(this.shopRerollIndex);
      if (this.money < price) return false;
      this.money -= price;
      this.shopRerollIndex++;
      this.refillExpeditionOffers();
      this.sold.clear();
      return true;
    }
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
  refillExpeditionOffers() {
    const types = Object.keys(WEAPONS) as WeaponId[];
    const unowned = types.filter(
      (id) => !this.guns.some((gun) => gun.id === id),
    );
    const pool = [...types];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.shopRandom() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let offers = pool.slice(0, 4);
    if (unowned.length && !offers.some((id) => unowned.includes(id))) {
      const index = Math.floor(this.shopRandom() * 4);
      offers[index] =
        unowned[Math.floor(this.shopRandom() * unowned.length)];
    }
    for (let i = offers.length - 1; i > 0; i--) {
      const j = Math.floor(this.shopRandom() * (i + 1));
      [offers[i], offers[j]] = [offers[j], offers[i]];
    }
    this.offers = offers;
  }
  openStop() {
    if (this.mode !== "expedition20") return;
    this.stop = stopAfter(this.wave);
    this.quickPicked = false;
    if (this.stop === "full") {
      this.phase = "shop";
      this.freeRerolls = 1;
      this.shopRerollIndex = 0;
      this.refillExpeditionOffers();
      this.sold.clear();
    } else if (this.stop === "quick") {
      this.phase = "quick";
      const kind = quickKind(this.wave);
      if (kind === "mod-1") this.quickOptions = ["popcorn", "domino", "magnet"];
      else if (kind === "mod-2")
        this.quickOptions = (["popcorn", "domino", "magnet"] as ModId[]).filter(
          (id) => !this.has(id),
        );
      else if (kind === "branch") this.quickOptions = ["wake", "ember"];
      else this.quickOptions = this.mods.filter((id) => this.modTier(id) < 3);
    } else if (this.stop === "auto") {
      this.phase = "interlude";
      this.interludeRemaining = 1.2;
    } else if (this.stop === "end") {
      this.phase = "won";
      this.event("end");
    }
  }
  nextWave() {
    if (this.mode === "expedition20") {
      if (this.phase !== "shop" && this.phase !== "quick") return;
      if (quickKind(this.wave) === "mod-upgrade" && this.mods.length === 0) return;
      if (this.phase === "quick") {
        const kind = quickKind(this.wave);
        if (kind === "mod-1" && this.mods.length < 1) return;
        if (kind === "mod-2" && this.mods.length < 2) return;
        if (kind === "branch" && !this.branch) return;
        if (kind === "mod-upgrade" && !this.quickPicked) return;
      }
      this.enterExpeditionWave(this.wave + 1);
      return;
    }
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
  enterExpeditionWave(wave: number) {
    this.wave = clamp(wave, 1, 20);
    this.waveTime = 0;
    this.player.hp = Math.min(10, this.player.hp + 3);
    this.player.invulnerable = 2;
    this.enemies = [];
    this.bullets = [];
    this.corpses = [];
    this.fx = [];
    this.scraps = [];
    this.pendingBlasts = [];
    this.wakePoints = [];
    this.chainCounts.clear();
    this.dominoRadius.clear();
    this.chainCount = 0;
    this.chainTimer = 0;
    this.chainId = 0;
    this.popcornPendingCancelled += this.popcornCredits;
    this.ringPendingCancelled += this.ringPending;
    this.popcornCredits = 0;
    this.ringPending = 0;
    this.ringCharge = 0;
    this.ringCooldown = 0;
    this.magnetPulse = 0;
    this.magnetPulseCooldown = 0;
    this.expeditionBonusBudget = 0;
    this.player.x = 600;
    this.player.y = 450;
    this.wakeAnchor = { x: 600, y: 450 };
    this.spawnTimer = 0.2;
    this.bossSpawned = false;
    this.bossKilled = false;
    this.pocketIndex = 0;
    this.pocketRejected = 0;
    this.buildExpeditionPocketSchedule();
    this.expeditionClusterCenters.clear();
    this.phase = "fight";
    this.stop = null;
    this.event("wave");
    if (isBossWave(this.wave)) this.event("boss", undefined, this.wave);
  }
  pause() {
    if (
      this.phase === "fight" ||
      this.phase === "sweep" ||
      this.phase === "interlude"
    ) {
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
      if (this.mode === "expedition20" && this.modTier("domino") >= 2) {
        if (n % 4 === 0) {
          const current = this.dominoRadius.get(chain) ?? 0;
          this.dominoRadius.set(chain, Math.min(60, current + 10));
        }
        if (this.modTier("domino") >= 3 && n % 8 === 0)
          this.pendingBlasts.push({
            p: { x: e.x, y: e.y },
            radius: 160,
            damage: 80,
            chain,
          });
      }
    }
    this.kills++;
    if (this.firstKill === null) this.firstKill = this.time;
    this.event("kill");
    this.shake = Math.max(this.shake, 0.13);
    const deathRoot =
      this.mode === "expedition20"
        ? inChain
          ? chain
          : ++this.nextChainId
        : 0;
    // A lethal spring-fist hit keeps flying as a remnant so its bowling
    // knockback still lands, instead of vanishing with the dead enemy.
    if (corpse)
      this.spawnCorpse(
        e,
        from,
        this.mode === "expedition20" ? deathRoot : undefined,
      );
    this.effect("pop", e, 0.42, e.kind === "can" ? "#83aaa4" : "#f07558", e.r);
    if (e.kind === "boss") {
      this.bossKilled = true;
      this.effect("blast", e, 0.7, "#efaa39", 130);
      this.event("explode");
    }
    const bossValue = this.mode === "expedition20" ? bossForWave(this.wave)?.value : undefined;
    const value =
      e.kind === "boss"
        ? (bossValue ?? 15)
        : e.kind === "can" || e.kind === "spitter"
          ? 4
          : e.kind === "splitter"
            ? 3
            : e.kind === "chip"
              ? 1
              : 2;
    const heat =
      this.mode === "expedition20" && this.branch === "ember" ? 1.2 : 0;
    if (this.scraps.length < 250)
      this.scraps.push({
        x: e.x,
        y: e.y,
        id: ++this.id,
        value,
        vx: heat ? 0 : (this.random() - 0.5) * 140,
        vy: heat ? 0 : (this.random() - 0.5) * 140,
        age: 0,
        heat,
        root: deathRoot,
        exploded: false,
      });
    else {
      const merged = this.scraps[this.scraps.length - 1];
      merged.value += value;
      if (heat && !merged.heat && !merged.exploded) {
        merged.heat = heat;
        merged.root = deathRoot;
        merged.exploded = false;
      }
    }
    // Death is settled once (hp <= 0 guard). Chained explosions are queued, not recursive.
    const blastRoot =
      this.mode === "expedition20"
        ? deathRoot
        : inChain
          ? chain
          : ++this.nextChainId;
    if (this.has("domino") && this.mode !== "expedition20")
      this.chainCounts.set(blastRoot, this.chainCounts.get(blastRoot) ?? 0);
    if (this.has("domino") && this.mode === "expedition20" && !inChain)
      this.chainCounts.set(blastRoot, this.chainCounts.get(blastRoot) ?? 0);
    if (this.has("domino")) {
      this.pendingBlasts.push({
        p: { x: e.x, y: e.y },
        radius:
          75 *
          (1 +
            (this.mode === "expedition20"
              ? (this.dominoRadius.get(blastRoot) ?? 0) / 100
              : 0)),
        damage: 26,
        chain: blastRoot,
      });
    }
    this.pendingPeak = Math.max(this.pendingPeak, this.pendingBlasts.length);
    if (e.kind === "splitter") this.split(e);
  }
  split(e: Enemy) {
    const angle = this.random() * Math.PI * 2;
    for (const offset of [-Math.PI / 3, Math.PI / 3]) {
      const p = {
        x: clamp(e.x + Math.cos(angle + offset) * 60, 18, W - 18),
        y: clamp(e.y + Math.sin(angle + offset) * 60, 18, H - 18),
      };
      this.spawn("chip", p);
    }
  }
  spawnCorpse(e: Enemy, from: Vec, root?: number) {
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
      chain: root ?? ++this.nextChainId,
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
    life?: number,
  ) {
    // F0: the 420-bullet cap is the only rejection reason, so a rejected shot is
    // attributed to its side and never reaches `shots` (which stays success-only).
    const isEnemy = kind === "enemy";
    if (this.bullets.length >= 420) {
      if (isEnemy) this.shootRejectedEnemy++;
      else this.shootRejectedPlayer++;
      return;
    }
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
      life: life ?? (kind === "enemy" ? 5 : 1.3),
    });
    if (isEnemy) this.shootAcceptedEnemy++;
    else this.shootAcceptedPlayer++;
    if (this.bullets.length > this.bulletPeak)
      this.bulletPeak = this.bullets.length;
  }
  collect(s: Scrap) {
    if (
      this.mode === "expedition20" &&
      this.branch === "ember" &&
      (s.heat ?? 0) > 0
    )
      return;
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
    if (this.mode === "expedition20" && this.branch === "wake") {
      if (dist(this.player, this.wakeAnchor) >= 30) {
        this.wakePoints.push({
          x: this.player.x,
          y: this.player.y,
          id: ++this.id,
          life: 1,
          max: 1,
          radius: 36,
          damage: 30,
          root: ++this.nextChainId,
          hitIds: new Set(),
        });
        if (this.wakePoints.length > 180) this.wakePoints.shift();
        this.wakeAnchor = { x: this.player.x, y: this.player.y };
      }
    }
    if (this.mode === "expedition20" && this.has("popcorn")) {
      this.popcornCredits++;
      if (this.modTier("popcorn") >= 3) {
        this.ringCharge++;
        if (this.ringCharge >= 5) {
          this.ringCharge -= 5;
          this.ringPending++;
        }
      }
    }
    if (this.has("popcorn")) {
      if (this.mode === "expedition20") {
        // Draining happens after weapon fire in the fixed simulation step.
      } else {
      if (this.bonusBudget < 8) {
        const t = this.enemies
          .filter((e) => e.hp > 0 && e.born <= 0)
          .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
        if (t) {
          const a = Math.atan2(t.y - this.player.y, t.x - this.player.x);
          for (const offset of [-0.3, 0.3])
            this.shoot(this.player, a + offset, 18, "bonus", t.id, 500, true);
          this.bonusBudget += 2;
        }
      } else if (this.enemies.some((e) => e.hp > 0 && e.born <= 0)) {
        // F0 read-only counter: this pickup had a target but the per-step
        // 8-bullet popcorn budget was already spent. Plain `some`, no sort and
        // no RNG, and the accepted path above is untouched.
        this.popcornBudgetSkippedPickups++;
      }
      }
    }
    if (this.has("magnet") && this.combatPicked % 8 === 0) {
      const tier = this.modTier("magnet");
      const target = this.enemies.find((e) => e.hp > 0 && e.born <= 0);
      for (let i = 0; i < 10; i++)
        this.shoot(
          this.player,
          (i * Math.PI) / 5,
          24,
          "bonus",
          tier >= 2 && target ? target.id : 0,
          550,
          tier >= 2 && !!target,
        );
      if (this.mode === "expedition20" && tier >= 3 && this.magnetPulseCooldown <= 0) {
        this.magnetPulse = 0.6;
        this.magnetPulseCooldown = 0.6;
      }
      this.effect("blast", this.player, 0.3, BLAST.ring, 70);
    }
  }
  drainExpeditionPopcorn() {
    if (
      this.ringPending > 0 &&
      this.ringCooldown <= 0 &&
      this.bullets.length + 8 <= 420
    ) {
      const angle = this.random() * Math.PI * 2;
      for (let i = 0; i < 8; i++)
        this.shoot(
          this.player,
          angle + (i * Math.PI) / 4,
          18,
          "bonus",
          0,
          500,
          false,
        );
      this.ringPending--;
      this.ringCooldown = 0.5;
    }
    let drained = 0;
    while (
      drained < 4 &&
      this.popcornCredits > 0 &&
      this.bullets.length + 2 <= 420
    ) {
      const target = this.enemies
        .filter((e) => e.hp > 0 && e.born <= 0)
        .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
      if (!target) break;
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      for (const offset of [-0.3, 0.3])
        this.shoot(
          this.player,
          angle + offset,
          18,
          "bonus",
          target.id,
          500,
          true,
        );
      const first = this.bullets[this.bullets.length - 2],
        second = this.bullets[this.bullets.length - 1];
      if (first) first.pierce = this.modTier("popcorn") >= 2 ? 1 : 0;
      if (second) second.pierce = this.modTier("popcorn") >= 2 ? 1 : 0;
      this.popcornCredits--;
      this.popcornDrained++;
      this.expeditionBonusBudget += 2;
      drained++;
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
        const saws = gun.tier === 2 ? 2 : 1;
        for (let n = 0; n < saws; n++) {
          const a =
              this.time * 4 + (index * Math.PI) / 2 + (n * Math.PI),
            p = {
              x: this.player.x + Math.cos(a) * 83,
              y: this.player.y + Math.sin(a) * 83,
            };
          for (const e of this.enemies)
            if (e.hp > 0 && dist(e, p) < e.r + 24)
              this.hit(e, info.damage, p);
        }
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
        const targets = gun.tier === 2 ? 7 : 5;
        for (let n = 0; n < targets; n++) {
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
          this.hit(e, info.damage * (gun.tier === 2 ? GUN_TIER.coil.damage : 1), current);
          current = e;
        }
        this.effect("arc", mount, 0.2, "#9becce", 4, undefined, chain);
      } else if (gun.id === "fist") {
        const lethal = target.hp <=
          info.damage * (gun.tier === 2 ? GUN_TIER.fist.damage : 1);
        this.hit(
          target,
          info.damage * (gun.tier === 2 ? GUN_TIER.fist.damage : 1),
          this.player,
          "weapon",
          gun.tier === 2 ? 800 : 650,
          0,
          true,
        );
        if (lethal && gun.tier === 2) {
          const remnant = this.corpses.at(-1);
          if (remnant) remnant.r *= 1.25;
        }
        this.effect("punch", target, 0.22, "#ef896b", 30, undefined, [
          mount,
          { ...target },
        ]);
      } else if (gun.id === "shotgun") {
        const pellets = gun.tier === 2 ? GUN_TIER.shotgun.hits : 5;
        const damage = info.damage * (gun.tier === 2 ? GUN_TIER.shotgun.damage : 1);
        for (let n = -(pellets - 1) / 2; n <= (pellets - 1) / 2; n++)
          this.shoot(
            muzzle,
            gun.angle + n * (gun.tier === 2 ? 0.1 : 0.13),
            damage,
            "cap",
            n === 0 ? target.id : 0,
            520,
          );
        incoming.set(target.id, (incoming.get(target.id) || 0) + damage);
      } else {
        const shots = gun.tier === 2 && (gun.id === "slinger" || gun.id === "rocket") ? 2 : 1;
        for (let n = 0; n < shots; n++)
          this.shoot(
            muzzle,
            gun.angle + (shots > 1 ? (n - 0.5) * 0.08 : 0),
            info.damage,
            gun.id === "rocket" ? "rocket" : "cap",
            target.id,
            gun.id === "rocket" ? 390 : 650,
            gun.id === "rocket",
          );
        incoming.set(target.id, (incoming.get(target.id) || 0) + info.damage * shots);
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
    if (
      this.phase !== "fight" &&
      this.phase !== "sweep" &&
      this.phase !== "interlude"
    )
      return;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.bonusBudget = 0;
    this.expeditionBonusBudget = 0;
    this.magnetPulseCooldown = Math.max(0, this.magnetPulseCooldown - dt);
    this.ringCooldown = Math.max(0, this.ringCooldown - dt);
    const inFight = this.phase === "fight";
    if (inFight) {
      this.waveTime += dt;
      this.chainTimer = Math.max(0, this.chainTimer - dt);
      if (this.chainTimer === 0 && this.chainCount > 0) this.chainCount = 0;
    }
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    for (const f of this.fx) {
      f.life -= dt;
      if (f.kind === "number") f.y -= dt * 36;
    }
    this.fx = this.fx.filter((f) => f.life > 0);
    if (this.phase === "interlude") {
      this.interludeRemaining -= dt;
      if (this.interludeRemaining <= 0) this.enterExpeditionWave(this.wave + 1);
      else this.updateLooseScraps(dt);
      return;
    }
    if (this.phase === "fight") {
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
        if (this.mode === "expedition20")
          this.spawnTimer = 1 / RATES[this.wave - 1];
        else
        this.spawnTimer = this.wave === 1 ? 1 / 3.1 : 1 / 4.2;
        const spawned =
          this.mode === "expedition20"
            ? this.spawn(this.pickKind(MIX[this.wave - 1]))
            : this.spawn(
                this.wave === 1
                  ? this.random() > 0.87
                    ? "runner"
                    : "bag"
                  : this.random() > 0.84
                    ? "can"
                    : this.random() > 0.6
                      ? "runner"
                      : "bag",
              );
        // The frozen slice keeps its timer-only counter. Expedition counts all
        // successful births centrally in spawn().
        if (spawned && this.mode === "slice") this.spawnCount++;
      }
      if (this.mode === "expedition20") {
        while (
          this.expeditionBatchIndex < this.expeditionBatches.length &&
          this.waveTime >=
            this.expeditionBatches[this.expeditionBatchIndex].time
        ) {
          const batch = this.expeditionBatches[this.expeditionBatchIndex++];
          if (batch.formation === "two-cluster") {
            let centers = this.expeditionClusterCenters.get(batch.time);
            if (!centers) {
              centers = this.twoClusterCenters();
              this.expeditionClusterCenters.set(batch.time, centers);
            }
            const center = centers[batch.group];
            this.spawnExpeditionBatch(
              batch.formation,
              batch.count,
              75,
              center,
            );
          } else {
            this.spawnExpeditionBatch(
              batch.formation,
              batch.count,
              batch.formation === "stream" ? 45 : 75,
            );
          }
        }
      } else {
        while (
          this.pocketIndex < this.pocketTimes.length &&
          this.waveTime >= this.pocketTimes[this.pocketIndex]
        ) {
          this.pocketIndex++;
          this.spawnPocket(this.pocketSize);
        }
      }
      if (this.mode === "expedition20" && this.pendingBoss) {
        const boss = bossForWave(this.wave)!;
        if (
          this.spawn("boss", {
            x: this.player.x < 600 ? 900 : 300,
            y: 220,
          })
        ) {
          this.bossSpawned = true;
          this.event("wave");
          this.event("boss", undefined, boss.stage);
        }
      }
      if (
        this.mode === "slice" &&
        this.wave === 2 &&
        this.waveTime >= 18 &&
        !this.bossSpawned
      ) {
        // F0: only a real spawn flips the flag and fires the event, so a
        // cap-rejected attempt cannot fake "the boss is here" (or the HUD
        // prompt). If the cap is full this step the boss retries next step,
        // once the dead enemy is cleaned up at the end of a step.
        if (
          this.spawn("boss", { x: this.player.x < 600 ? 900 : 300, y: 220 })
        ) {
          this.bossSpawned = true;
          this.event("wave");
        }
      }
      if (this.mode === "expedition20") this.drainExpeditionPopcorn();
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
              : e.kind === "spitter"
                ? l > 320
                  ? 34
                  : 0
                : e.kind === "chip"
                  ? 118
                  : e.kind === "splitter"
                    ? 50
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
          if (e.tell && e.tell > 0) {
            e.tell = Math.max(0, e.tell - dt);
            if (e.tell === 0) e.attack = 0;
          }
          if (e.attack <= 0) {
            const stage =
                this.mode === "expedition20"
                  ? (e.bossStage ?? 1)
                  : 1,
              info =
                this.mode === "expedition20"
                  ? bossForWave(this.wave)!
                  : { interval: 2.4, radial: 8, stage: 1 as const };
            e.attack = info.interval;
            e.volleys = (e.volleys ?? 0) + 1;
            const volley = e.volleys;
            if ((stage === 2 || stage === 4) && volley % 3 === 0) {
              const a = Math.atan2(
                this.player.y - e.y,
                this.player.x - e.x,
              );
              for (const offset of [-0.24, 0, 0.24])
                this.shoot(e, a + offset, 1, "enemy", 0, 150);
            } else {
              for (let i = 0; i < info.radial; i++)
              this.shoot(
                e,
                (i * Math.PI * 2) / info.radial + e.age * 0.15,
                1,
                "enemy",
                0,
                120,
              );
            }
            if (stage === 3 && volley % 3 === 0) {
              for (let i = 0; i < 3; i++)
                this.spawn("runner", {
                  x: clamp(e.x + (i - 1) * 35, 28, W - 28),
                  y: clamp(e.y + 50, 28, H - 28),
                });
            }
            if (stage === 4 && volley % 4 === 0) {
              for (let i = 0; i < 4; i++)
                this.spawn("chip", {
                  x: clamp(e.x + (i - 1.5) * 26, 18, W - 18),
                  y: clamp(e.y + 58, 18, H - 18),
                });
            }
            this.effect("blast", e, 0.3, "#ed7552", 60);
          }
        } else if (e.kind === "spitter") {
          e.attack -= dt;
          if (e.attack <= 0) {
            e.attack = 2.2;
            e.tell = 0.8;
          }
          if (e.tell && e.tell > 0) {
            e.tell = Math.max(0, e.tell - dt);
            if (e.tell === 0) {
              const a = Math.atan2(
                this.player.y - e.y,
                this.player.x - e.x,
              );
              this.shoot(e, a, 1, "enemy", 0, 190, false, 3.5);
            }
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
          const e = this.enemies.find((e) => {
            if (
              e.hp <= 0 ||
              e.born > 0 ||
              b.hitIds?.has(e.id) ||
              segmentDistance(e, old, b) >= e.r + b.r
            )
              return false;
            return true;
          });
          if (e) {
            if ((b.pierce ?? 0) > 0) {
              b.hitIds ??= new Set();
              b.hitIds.add(e.id);
            }
            if (b.kind === "rocket") this.explode(b, 92, b.damage);
            else
              this.hit(
                e,
                b.damage,
                old,
                b.kind === "bonus" ? "secondary" : "weapon",
              );
            if (!b.hitIds || (b.pierce ?? 0) <= 0) b.life = 0;
            else if (b.pierce! > 0) b.pierce!--;
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
        if (this.mode === "expedition20") {
          for (const point of this.wakePoints) live.add(point.root);
          for (const s of this.scraps)
            if (this.branch === "ember" && (s.heat ?? 0) > 0 && s.root)
              live.add(s.root);
        }
        for (const id of this.chainCounts.keys())
          if (!live.has(id)) this.chainCounts.delete(id);
      }
      const canEndFight =
        this.mode === "expedition20"
          ? isBossWave(this.wave)
            ? this.bossKilled
            : true
          : this.wave === 1 || this.bossKilled;
      if (
        this.phase === "fight" &&
        this.waveTime >= this.duration &&
        canEndFight
      ) {
        this.phase = "sweep";
        this.sweepTime = 1;
        this.enemies = [];
        this.bullets = [];
        this.pendingBlasts = [];
        this.corpses = [];
        if (this.mode === "expedition20") {
          this.wakePoints = [];
          this.chainCounts.clear();
          this.dominoRadius.clear();
          this.chainCount = 0;
          this.chainTimer = 0;
          for (const s of this.scraps) {
            if ((s.heat ?? 0) > 0) {
              s.heat = 0;
              s.vx = 0;
              s.vy = 0;
            }
          }
        }
        this.event("wave");
      }
      const deadline =
        this.mode === "expedition20" ? this.waveTime > this.deadline : this.waveTime > 50;
      if (
        this.phase === "fight" &&
        deadline &&
        (this.mode === "slice" ? this.wave === 2 : isBossWave(this.wave))
      ) {
        this.phase = "lost";
        this.event("end");
      }
    } else {
      this.sweepTime -= dt;
      if (this.sweepTime <= 0) {
        for (const s of this.scraps) this.collect(s);
        this.scraps = [];
        if (this.mode === "expedition20") this.openStop();
        else {
          this.phase = this.wave === 1 ? "shop" : "won";
          if (this.phase === "won") this.event("end");
        }
      }
    }
    this.updateLooseScraps(dt);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    this.bullets = this.bullets.filter(
      (b) =>
        b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30,
    );
    this.scraps = this.scraps.filter((s) => s.value > 0);
  }
  updateLooseScraps(dt: number) {
    const expedition = this.mode === "expedition20";
    if (this.magnetPulse > 0) this.magnetPulse = Math.max(0, this.magnetPulse - dt);
    for (const s of this.scraps) {
      s.age += dt;
      if (expedition && (s.heat ?? 0) > 0) {
        s.vx = 0;
        s.vy = 0;
        if (this.phase === "sweep") {
          s.heat = 0;
          continue;
        }
        if (this.phase === "interlude") {
          s.heat = 0;
          continue;
        }
        s.heat = Math.max(0, s.heat! - dt);
        if (s.heat === 0 && !s.exploded) {
          s.exploded = true;
          this.explode(
            s,
            55,
            25,
            false,
            s.root || ++this.nextChainId,
          );
          this.effect("ember", s, 0.42, BLAST.ring, 55);
        }
        continue;
      }
      const d = dist(s, this.player);
      if (
        d < this.magnetRadius ||
        this.phase === "sweep" ||
        this.magnetPulse > 0
      ) {
        const speed = 200 + Math.min(900, s.age * 300);
        s.vx = ((this.player.x - s.x) / (d || 1)) * speed;
        s.vy = ((this.player.y - s.y) / (d || 1)) * speed;
      } else {
        s.vx *= Math.exp(-dt * 5);
        s.vy *= Math.exp(-dt * 5);
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (this.phase !== "interlude" && (d < 22 || dist(s, this.player) < 22))
        this.collect(s);
    }
    if (
      this.mode === "expedition20" &&
      this.branch === "wake" &&
      this.phase === "fight"
    ) {
      for (const point of this.wakePoints) {
        point.life -= dt;
        for (const e of this.enemies) {
          if (
            e.hp > 0 &&
            e.born <= 0 &&
            !point.hitIds.has(e.id) &&
            dist(e, point) < point.radius + e.r
          ) {
            point.hitIds.add(e.id);
            this.hit(
              e,
              point.damage,
              point,
              "secondary",
              50,
              point.root,
            );
          }
        }
      }
      this.wakePoints = this.wakePoints.filter((point) => point.life > 0);
    }
  }
}
