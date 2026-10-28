import {
  SeededStream,
  clamp,
  dist,
  rng,
  segmentDistance,
  type Vec,
} from "./math";
import {
  WEAPONS,
  ARENA_W,
  ARENA_H,
  BLAST,
  BOSS_ENTRY,
  PLAYER_SPEED,
  PLAYER_START,
  PLAYER_WALL_MARGIN,
  type WeaponId,
  type ModId,
} from "./data";
import {
  BAG_HP,
  BOSS_STAGES,
  DURATIONS,
  ELITE_TIMER_SHARE,
  MIX_KINDS,
  POCKETS,
  POCKET_MIX,
  RATES,
  MIX,
  bossForWave,
  effectiveWeaponProfile,
  enemyHp,
  gunPrice,
  gunSlotCap,
  gunTier,
  gunTierLabel,
  eliteForWave,
  isEliteWave,
  isBossWave,
  quickKind,
  rerollPrice,
  stopAfter,
  waveRecovery,
  type ExpeditionBranch,
  type ExpeditionEnemyKind,
  type GunTier,
  type Formation,
  type GameMode,
  type PurchasePreview,
  type Stop,
} from "./expedition";
import {
  EXPEDITION_CAPS,
  ITEM_BY_ID,
  ITEM_CONSTANTS,
  ITEM_IDS,
  QUEUE_CAPS,
  STAT_REWARD_IDS,
  applyStatReward,
  canOwnItem,
  creditRawCash,
  deriveItemStats,
  drawCoreRewards,
  drawItemOffers,
  drawStatRewards,
  itemCount,
  itemCountsWith,
  itemEligibility,
  itemPrice,
  purchaseEffectPreview,
  weaponItemModifiers,
  wedgeRingRadius,
  type DerivedItemStats,
  type ItemCounts,
  type ItemId,
  type ItemLootSource,
  type ItemStats,
  type StatRewardId,
} from "./items";
import {
  type Phase,
  type Enemy,
  type Bullet,
  type Scrap,
  type Corpse,
  type Fx,
  type Gun,
  type WakePoint,
  type TrailPoint,
  type ChestPickup,
  type FrozenChestChoice,
  type QueueMetrics,
  type DamageSource,
  type PendingBlast,
  type PocketBatch,
  type Event,
} from "./sim-types";
export type * from "./sim-types";
import { planGunPurchase, type PurchasePlan } from "./economy";
// Chase speeds (px/s). Spitters only walk while farther than
// SPITTER_HOLD_DISTANCE, then stand and shoot.
const ENEMY_SPEED: Readonly<Record<Enemy["kind"], number>> = Object.freeze({
  bag: 57,
  runner: 102,
  can: 39,
  splitter: 50,
  chip: 118,
  spitter: 34,
  boss: 32,
});
const SPITTER_HOLD_DISTANCE = 320;
const ELITE_FALLBACK_SPEED = 71.4;
function sameOfferSet<T>(left: readonly T[], right: readonly T[]) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  if (leftSet.size !== new Set(right).size) return false;
  return right.every((value) => leftSet.has(value));
}
export class Game {
  mode: GameMode;
  phase: Phase = "fight";
  beforePause: Phase = "fight";
  player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    hp: 10,
    maxHp: 10,
    invulnerable: 2,
    walk: 0,
  };
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  scraps: Scrap[] = [];
  corpses: Corpse[] = [];
  trailPoints: TrailPoint[] = [];
  chests: ChestPickup[] = [];
  frozenChest: FrozenChestChoice | null = null;
  fx: Fx[] = [];
  events: Event[] = [];
  guns: Gun[] = [
    { id: "slinger", cooldown: 0.12, angle: -Math.PI / 2, recoil: 0 },
  ];
  mods: ModId[] = [];
  pendingBlasts: PendingBlast[] = [];
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
  rawCash = 0;
  fuelUnits = 0;
  collected = 0;
  sweptFuelUnits = 0;
  magnetFuelCharge = 0;
  coinAccumulator = 0;
  inventory: Readonly<Record<ItemId, number>> = Object.freeze(
    Object.fromEntries(Object.keys(ITEM_BY_ID).map((id) => [id, 0])) as Record<
      ItemId,
      number
    >,
  );
  statRewards: ItemStats = {
    damage: 0,
    as: 0,
    hpFlat: 0,
    move: 0,
    pickup: 0,
    power: 0,
  };
  itemOffers: readonly ItemId[] = [];
  statRewardOffers: readonly StatRewardId[] = [];
  soldItems = new Set<number>();
  pendingRewardChoices: readonly ItemId[] = [];
  pendingStatChoices: readonly StatRewardId[] = [];
  itemRerollUsed = false;
  movedThisTick = false;
  distanceSinceMilestone = 0;
  pressureTimer = 0;
  spikeAuraTimer = 0;
  directContactKills = 0;
  waveKillHeals = 0;
  rootSecondaryKills = new Map<number, number>();
  lastMilestone: Vec = { ...PLAYER_START };
  eliteSpawned = false;
  eliteEscaped = false;
  queueMetrics: Record<
    "pendingBlasts" | "popcorn" | "corpseTrail" | "chests" | "fx",
    QueueMetrics
  > = {
    pendingBlasts: { admitted: 0, rejected: 0, dropped: 0, processed: 0 },
    popcorn: { admitted: 0, rejected: 0, dropped: 0, processed: 0 },
    corpseTrail: { admitted: 0, rejected: 0, dropped: 0, processed: 0 },
    chests: { admitted: 0, rejected: 0, dropped: 0, processed: 0 },
    fx: { admitted: 0, rejected: 0, dropped: 0, processed: 0 },
  };
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
  popcornShotsAdmitted = 0;
  popcornShotsRejected = 0;
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
  purchaseRecords = new Map<
    number,
    {
      tier: GunTier;
      incomingTier: GunTier;
      merged: boolean;
      damage: number;
    }
  >();
  freeRerolls = 1;
  shopRerollIndex = 0;
  quickOptions: (ModId | ExpeditionBranch | ItemId | StatRewardId)[] = [];
  quickPicked = false;
  modTiers = new Map<ModId, number>();
  branch: ExpeditionBranch | null = null;
  wakePoints: WakePoint[] = [];
  wakeAnchor: Vec = { ...PLAYER_START };
  popcornCredits = 0;
  popcornDrained = 0;
  popcornPendingCancelled = 0;
  ringPending = 0;
  ringPendingCancelled = 0;
  ringCharge = 0;
  ringCooldown = 0;
  ringCueReady = false;
  magnetPulse = 0;
  magnetPulseCooldown = 0;
  get popcornFuelConsumed() {
    return this.popcornDrained;
  }
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
  weaponShopStream: SeededStream;
  itemShopRandom: SeededStream;
  statRewardRandom: SeededStream;
  lootRandom: SeededStream;
  constructor(
    public seed: number,
    mode: GameMode = "slice",
  ) {
    this.mode = mode;
    this.random = rng(seed);
    this.weaponShopStream = new SeededStream(seed ^ 0x71bc21);
    this.shopRandom = this.weaponShopStream.next;
    this.itemShopRandom = new SeededStream(seed ^ 0x2f6e2b1);
    this.statRewardRandom = new SeededStream(seed ^ 0x6ac690c5);
    this.lootRandom = new SeededStream(seed ^ 0x1b873593);
    if (mode === "expedition20") {
      this.guns[0] = {
        id: "slinger",
        cooldown: 0.12,
        angle: -Math.PI / 2,
        recoil: 0,
        tier: 1,
        paid: 0,
      };
      this.buildExpeditionPocketSchedule();
      return;
    }
    this.setPocketSchedule();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.9 + (i / 9) * Math.PI * 0.8;
      this.spawn("bag", {
        x: PLAYER_START.x + Math.cos(a) * 270,
        y: PLAYER_START.y + Math.sin(a) * 270,
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
  get pendingBoss() {
    if (this.mode !== "expedition20" || !isBossWave(this.wave)) return false;
    return this.waveTime >= this.duration - 18 && !this.bossSpawned;
  }
  get pendingElite() {
    if (this.mode !== "expedition20" || !isEliteWave(this.wave)) return false;
    return (
      this.waveTime >= this.duration * ELITE_TIMER_SHARE &&
      !this.eliteSpawned &&
      !this.eliteEscaped
    );
  }
  get eliteRenderData() {
    const enemy = this.enemies.find((e) => e.elite && e.hp > 0);
    if (!enemy) return null;
    return {
      x: enemy.x,
      y: enemy.y,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      radius: enemy.r,
      wave: enemy.eliteWave ?? this.wave,
      marker: "elite" as const,
    };
  }
  get chestRenderData() {
    return this.chests.map((chest) => ({
      x: chest.x,
      y: chest.y,
      source: chest.source,
      pulse: chest.age,
    }));
  }
  has(id: ModId) {
    return this.mode !== "expedition20" && this.mods.includes(id);
  }
  modTier(id: ModId) {
    return this.mode === "expedition20" ? 0 : this.mods.includes(id) ? 1 : 0;
  }
  get magnetRadius() {
    if (this.mode !== "expedition20")
      return this.mods.includes("magnet") ? 300 : 155;
    return this.derivedItemStats().pickupRadius;
  }
  get dropsUnlocked() {
    return this.mode !== "expedition20" || this.phase === "sweep";
  }
  get maxHp() {
    return this.mode === "expedition20" ? this.derivedItemStats().maxHp : 10;
  }
  get pendingRewards() {
    return {
      items: [...this.pendingRewardChoices],
      stats: [...this.pendingStatChoices],
      chest: this.frozenChest
        ? {
            ...this.frozenChest,
            itemIds: [...this.frozenChest.itemIds],
            available: this.frozenChest.itemIds.map((id) =>
              canOwnItem(
                id,
                this.inventory,
                this.guns.map((gun) => gun.id),
              ),
            ),
          }
        : null,
    };
  }
  get pendingChestChoices() {
    if (!this.frozenChest) return [];
    return this.frozenChest.itemIds.map((id, index) => ({
      index,
      id,
      available: canOwnItem(
        id,
        this.inventory,
        this.guns.map((gun) => gun.id),
      ),
      definition: ITEM_BY_ID[id],
    }));
  }
  get inventoryCounts(): ItemCounts {
    return this.inventory;
  }
  get itemChoices(): readonly ItemId[] {
    return this.pendingRewardChoices;
  }
  get statChoices(): readonly StatRewardId[] {
    return this.pendingStatChoices;
  }
  get hasPendingChest() {
    return this.frozenChest !== null;
  }
  derivedItemStats(): DerivedItemStats {
    return deriveItemStats(this.inventory, this.statRewards, {
      moved: this.movedThisTick,
      pressureActive: this.pressureTimer > 0,
      weapons: this.guns.map((gun) => gun.id),
    });
  }
  itemEligibility(id: ItemId) {
    return itemEligibility(
      id,
      this.inventory,
      this.guns.map((gun) => gun.id),
    );
  }
  itemOfferPrice(index: number) {
    const id = this.itemOffers[index];
    if (!id) return 0;
    return itemPrice(id, this.wave, itemCount(this.inventory, id));
  }
  itemOfferPreview(index: number) {
    const id = this.itemOffers[index];
    if (!id) return null;
    return {
      ...purchaseEffectPreview(id, itemCount(this.inventory, id)),
      price: this.itemOfferPrice(index),
      eligibility: this.itemEligibility(id),
      definition: ITEM_BY_ID[id],
    };
  }
  claimCoreReward(index: number) {
    const id = this.pendingRewardChoices[index];
    return id ? this.claimReward(id) : false;
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
    const fxMetrics = this.queueMetrics.fx;
    if (this.fx.length >= EXPEDITION_CAPS.effects) {
      fxMetrics.rejected++;
      return;
    }
    fxMetrics.admitted++;
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
  spawn(kind: Enemy["kind"], p?: Vec, elite = false): boolean {
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
        this.enemies.length >= 179) ||
      (this.mode === "expedition20" &&
        !elite &&
        kind !== "boss" &&
        this.pendingElite &&
        this.enemies.length >= 179)
    )
      return false;
    if (!p) {
      p = {
        x: clamp(this.player.x + Math.cos(a) * r, 28, ARENA_W - 28),
        y: clamp(this.player.y + Math.sin(a) * r, 28, ARENA_H - 28),
      };
      if (dist(p, this.player) < 200)
        p = {
          x: this.player.x < ARENA_W / 2 ? ARENA_W - 35 : 35,
          y: 60 + variant * (ARENA_H - 120),
        };
    }
    const exp = this.mode === "expedition20",
      boss = exp ? bossForWave(this.wave) : undefined,
      eliteInfo = elite ? eliteForWave(this.wave) : undefined,
      hp = eliteInfo
        ? eliteInfo.hp
        : kind === "boss"
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
      r: eliteInfo
        ? eliteInfo.radius
        : kind === "boss"
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
      born: kind === "spitter" && exp ? 0.8 : 0.65,
      attack:
        kind === "boss"
          ? exp
            ? (boss?.interval ?? 2.4)
            : this.wave === 2
              ? 1.6
              : 2.4
          : kind === "spitter"
            ? 0.8
            : 1.6,
      bowled: new Set(),
      bossStage: kind === "boss" ? boss?.stage : undefined,
      elite: elite || undefined,
      eliteWave: elite ? this.wave : undefined,
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
    let cx = clamp(this.player.x + Math.cos(angle) * radius, 60, ARENA_W - 60),
      cy = clamp(this.player.y + Math.sin(angle) * radius, 60, ARENA_H - 60);
    if (dist({ x: cx, y: cy }, this.player) < 310) {
      cx = this.player.x < ARENA_W / 2 ? ARENA_W - 70 : 70;
      cy = 80 + this.random() * (ARENA_H - 160);
    }
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (this.random() - 0.5) * 0.42,
        r = 30 + this.random() * 45,
        p = {
          x: clamp(cx + Math.cos(a) * r, 28, ARENA_W - 28),
          y: clamp(cy + Math.sin(a) * r, 28, ARENA_H - 28),
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
        x: clamp(this.player.x + Math.cos(angle) * distance, 60, ARENA_W - 60),
        y: clamp(this.player.y + Math.sin(angle) * distance, 60, ARENA_H - 60),
      };
      if (dist(p, this.player) >= 310 && (!other || dist(p, other) >= 200))
        return p;
    }
    const y = other ? 80 : clamp(this.player.y, 80, ARENA_H - 80);
    return {
      x: this.player.x < ARENA_W / 2 ? ARENA_W - 70 : 70,
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
    const x = this.player.x < ARENA_W / 2 ? ARENA_W - 70 : 70;
    return [
      { x, y: 80 },
      { x, y: ARENA_H - 80 },
    ];
  }
  randomPocketCenter() {
    const angle = this.random() * Math.PI * 2,
      distance = 340 + this.random() * 100;
    return {
      x: clamp(this.player.x + Math.cos(angle) * distance, 60, ARENA_W - 60),
      y: clamp(this.player.y + Math.sin(angle) * distance, 60, ARENA_H - 60),
    };
  }
  pocketMemberPoint(center: Vec, radius: number, angle: number): Vec {
    const rr = 30 + this.random() * Math.max(1, radius - 30);
    let p = {
      x: clamp(center.x + Math.cos(angle) * rr, 28, ARENA_W - 28),
      y: clamp(center.y + Math.sin(angle) * rr, 28, ARENA_H - 28),
    };
    if (dist(p, this.player) >= 235) return p;
    // Clamping a ring point at an arena edge must never move it inside the
    // approved individual-enemy safety radius. Preserve the deterministic
    // spawn attempt, then choose the nearest in-bounds point on that radius.
    const dx = p.x - this.player.x,
      dy = p.y - this.player.y,
      d = Math.hypot(dx, dy) || 1;
    p = {
      x: clamp(this.player.x + (dx / d) * 236, 28, ARENA_W - 28),
      y: clamp(this.player.y + (dy / d) * 236, 28, ARENA_H - 28),
    };
    if (dist(p, this.player) >= 235) return p;
    for (const a of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
      const q = {
        x: clamp(this.player.x + Math.cos(a) * 236, 28, ARENA_W - 28),
        y: clamp(this.player.y + Math.sin(a) * 236, 28, ARENA_H - 28),
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
      const a =
          (i / Math.max(1, count)) * Math.PI * 2 + (this.random() - 0.5) * 0.42,
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
    if (this.mode === "expedition20") return this.buyExpedition(index);
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
      index >= this.offers.length
    )
      return false;
    const id = this.offers[index],
      price = gunPrice(id, this.wave);
    if (this.money < price) return false;
    const preview = this.expeditionPurchasePreview(index);
    if (!preview.accepted) return false;
    this.money -= price;
    this.guns = preview.result;
    this.sold.add(index);
    this.purchaseRecords.set(index, {
      tier: preview.tier,
      incomingTier: preview.incomingTier,
      merged: preview.merged,
      damage: effectiveWeaponProfile(id, preview.incomingTier).damage,
    });
    if (preview.merged)
      this.events.push({
        type: "merge",
        kind: id,
        value: price,
        tier: preview.incomingTier,
      });
    this.event("buy", id);
    return true;
  }
  buyItem(index: number) {
    if (
      this.mode !== "expedition20" ||
      this.phase !== "shop" ||
      this.soldItems.has(index) ||
      index < 0 ||
      index >= this.itemOffers.length
    )
      return false;
    const id = this.itemOffers[index];
    if (
      !id ||
      !canOwnItem(
        id,
        this.inventory,
        this.guns.map((g) => g.id),
      )
    )
      return false;
    const price = this.itemOfferPrice(index);
    if (this.money < price) return false;
    const maxBefore = this.maxHp;
    this.money -= price;
    this.inventory = itemCountsWith(this.inventory, id);
    this.soldItems.add(index);
    const maxAfter = this.maxHp;
    if (maxAfter > maxBefore) {
      // Item HP is capacity, never a free heal.
      this.player.maxHp = maxAfter;
    } else if (maxAfter < maxBefore) {
      this.player.maxHp = maxAfter;
      this.player.hp = Math.min(this.player.hp, maxAfter);
    }
    this.events.push({
      type: "buy",
      item: id,
      value: price,
    });
    return true;
  }
  expeditionPurchasePreview(index: number): PurchasePlan {
    const id = this.offers[index];
    const price = id ? gunPrice(id, this.wave) : 0;
    return planGunPurchase(this.guns, id, price, this.slotCap);
  }
  sell(index: number) {
    if (this.mode !== "expedition20" || this.phase !== "shop") return false;
    if (this.guns.length <= 1 || !this.guns[index]) return false;
    const refund = Math.floor(0.35 * (this.guns[index].paid ?? 0));
    this.money += refund;
    this.guns.splice(index, 1);
    return true;
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
    if (this.mode !== "expedition20") {
      if (this.phase !== "shop" || this.mods.length >= 2) return false;
      const id = value as ModId;
      if (this.has(id) || !["popcorn", "domino", "magnet"].includes(id))
        return false;
      this.mods.push(id);
      this.event("buy", undefined, undefined, id);
      return true;
    }
    return false;
  }
  reroll() {
    if (this.mode === "expedition20") {
      if (this.phase !== "shop") return false;
      return this.rerollExpedition();
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
    this.purchaseRecords.clear();
    return true;
  }
  rerollExpedition() {
    if (this.mode !== "expedition20" || this.phase !== "shop") return false;
    const price = rerollPrice(this.shopRerollIndex);
    if (this.money < price) return false;
    const weaponBefore = [...this.offers];
    const itemBefore = [...this.itemOffers];
    const weaponAlt = this.alternateWeaponOffer(weaponBefore);
    const itemAlt = this.alternateItemOffer(itemBefore);
    // A reroll must be able to change at least one visible offer row. This is
    // checked before any stream draw, charge or mutation.
    if (!weaponAlt && !itemAlt) return false;
    const weaponState = this.weaponShopStream.state();
    const itemState = this.itemShopRandom.state();
    const weaponNext = this.legalWeaponOffers(
      this.weaponShopStream,
      weaponBefore,
    );
    const itemNext = [
      ...drawItemOffers({
        owned: this.inventory,
        weapons: this.guns.map((gun) => gun.id),
        count: 3,
        source: "shop",
        wave: this.wave,
        rng: this.itemShopRandom.next,
      }),
    ];
    // A reorder-only result is not a useful offer change.
    const weaponChanged = !sameOfferSet(weaponNext, weaponBefore);
    const itemChanged = !sameOfferSet(itemNext, itemBefore);
    if (!weaponChanged && !itemChanged) {
      this.weaponShopStream.setState(weaponState);
      this.itemShopRandom.setState(itemState);
      // Reordering the same IDs is not a visible offer change. Replace the last
      // card of exactly one row, with weapons taking priority.
      if (!itemAlt && !weaponAlt) return false;
      if (weaponAlt) {
        weaponNext[weaponNext.length - 1] = weaponAlt;
      } else if (itemAlt) {
        itemNext[itemNext.length - 1] = itemAlt;
      }
    }
    this.money -= price;
    this.shopRerollIndex++;
    this.itemRerollUsed = true;
    this.offers = weaponNext;
    this.itemOffers = itemNext;
    this.sold.clear();
    this.soldItems.clear();
    this.purchaseRecords.clear();
    return true;
  }
  private legalWeaponOffers(
    stream: SeededStream,
    _before: readonly WeaponId[],
  ): WeaponId[] {
    const types = Object.keys(WEAPONS) as WeaponId[];
    const unowned = types.filter(
      (id) => !this.guns.some((gun) => gun.id === id),
    );
    const pool = [...types];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(stream.next() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let offers = pool.slice(0, 3);
    if (unowned.length && !offers.some((id) => unowned.includes(id))) {
      const index = Math.floor(stream.next() * 3);
      offers[index] = unowned[Math.floor(stream.next() * unowned.length)];
    }
    for (let i = offers.length - 1; i > 0; i--) {
      const j = Math.floor(stream.next() * (i + 1));
      [offers[i], offers[j]] = [offers[j], offers[i]];
    }
    return offers;
  }
  private alternateItemOffer(before: readonly ItemId[]) {
    const excluded = new Set(before);
    return (
      ITEM_IDS.find(
        (id) =>
          !excluded.has(id) &&
          canOwnItem(
            id,
            this.inventory,
            this.guns.map((gun) => gun.id),
          ),
      ) ?? null
    );
  }
  private alternateWeaponOffer(before: readonly WeaponId[]) {
    const excluded = new Set(before);
    return (
      (Object.keys(WEAPONS) as WeaponId[]).find((id) => !excluded.has(id)) ??
      null
    );
  }
  refillExpeditionOffers() {
    this.offers = this.legalWeaponOffers(this.weaponShopStream, this.offers);
  }
  // Test-only deterministic stream controls. These expose no live state to the
  // player and never alter production offer generation.
  setWeaponShopStreamState(state: number) {
    this.weaponShopStream.setState(state);
  }
  setItemShopStreamState(state: number) {
    this.itemShopRandom.setState(state);
  }
  setStatRewardStreamState(state: number) {
    this.statRewardRandom.setState(state);
  }
  refillExpeditionItems() {
    this.itemOffers = drawItemOffers({
      owned: this.inventory,
      weapons: this.guns.map((gun) => gun.id),
      count: 3,
      source: "shop",
      wave: this.wave,
      rng: this.itemShopRandom.next,
    });
    this.statRewardOffers =
      this.wave === 1 ? [] : drawStatRewards(3, this.statRewardRandom.next);
    this.soldItems.clear();
    this.pendingRewardChoices = [];
    this.pendingStatChoices = [];
    this.itemRerollUsed = false;
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
      this.refillExpeditionItems();
      if (!this.frozenChest) {
        if (this.wave === 1) {
          this.pendingRewardChoices = drawCoreRewards(
            this.inventory,
            this.guns.map((gun) => gun.id),
            3,
            this.statRewardRandom.next,
          );
          this.pendingStatChoices = [];
        } else if ([5, 10, 15].includes(this.wave)) {
          this.pendingRewardChoices = [];
          this.pendingStatChoices = [];
        } else {
          this.pendingRewardChoices = [];
          this.pendingStatChoices = drawStatRewards(
            3,
            this.statRewardRandom.next,
          );
        }
      }
      this.sold.clear();
      this.purchaseRecords.clear();
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
      this.cancelExpeditionWavePending();
      this.phase = "won";
      this.event("end");
    }
  }
  nextWave() {
    if (this.mode === "expedition20") {
      if (this.phase !== "shop" && this.phase !== "quick") return;
      this.enterExpeditionWave(this.wave + 1);
      return;
    }
    if (this.phase !== "shop") return;
    this.wave = 2;
    this.waveTime = 0;
    this.player.hp = Math.min(
      this.player.maxHp,
      this.player.hp + waveRecovery(this.mode, this.wave),
    );
    this.player.invulnerable = 2;
    this.enemies = [];
    this.bullets = [];
    this.corpses = [];
    this.fx = [];
    this.player.x = PLAYER_START.x;
    this.player.y = PLAYER_START.y;
    this.spawnTimer = 0.2;
    this.setPocketSchedule();
    this.phase = "fight";
    this.event("wave");
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.spawn("bag", {
        x: ARENA_W / 2 + Math.cos(a) * 300,
        y: ARENA_H / 2 + Math.sin(a) * 280,
      });
    }
  }
  enterExpeditionWave(wave: number) {
    this.cancelExpeditionWavePending();
    this.wave = clamp(wave, 1, 20);
    this.waveTime = 0;
    const maxHp = this.maxHp;
    this.player.maxHp = maxHp;
    this.player.hp = Math.min(
      maxHp,
      this.player.hp + waveRecovery(this.mode, this.wave),
    );
    if (this.wave === 1) this.player.hp = maxHp;
    this.player.invulnerable = 2;
    this.enemies = [];
    this.bullets = [];
    this.corpses = [];
    this.trailPoints = [];
    this.chests = [];
    this.frozenChest = null;
    this.pendingRewardChoices = [];
    this.pendingStatChoices = [];
    this.fx = [];
    this.scraps = [];
    // Wave transitions remove uncollected scrap in expedition mode. That
    // boundary is unchanged from the existing run; future chest pickups will
    // require a separate persisted/reachable pickup path.
    this.pendingBlasts = [];
    this.wakePoints = [];
    this.chainCounts.clear();
    this.dominoRadius.clear();
    this.chainCount = 0;
    this.chainTimer = 0;
    this.chainId = 0;
    this.ringCharge = 0;
    this.ringCooldown = 0;
    this.ringCueReady = false;
    this.magnetPulse = 0;
    this.magnetPulseCooldown = 0;
    this.expeditionBonusBudget = 0;
    this.player.x = PLAYER_START.x;
    this.player.y = PLAYER_START.y;
    this.wakeAnchor = { ...PLAYER_START };
    this.spawnTimer = 0.2;
    this.bossSpawned = false;
    this.bossKilled = false;
    this.eliteSpawned = false;
    this.eliteEscaped = false;
    this.pressureTimer = 0;
    this.spikeAuraTimer = 0;
    this.directContactKills = 0;
    this.waveKillHeals = 0;
    this.rootSecondaryKills.clear();
    this.movedThisTick = false;
    this.distanceSinceMilestone = 0;
    this.lastMilestone = { ...PLAYER_START };
    this.pocketIndex = 0;
    this.pocketRejected = 0;
    this.buildExpeditionPocketSchedule();
    this.expeditionClusterCenters.clear();
    this.phase = "fight";
    this.stop = null;
    this.event("wave");
    if (isBossWave(this.wave)) this.event("boss", undefined, this.wave);
  }
  cancelExpeditionWavePending() {
    this.queueMetrics.popcorn.dropped += this.popcornCredits;
    this.queueMetrics.pendingBlasts.dropped += this.pendingBlasts.length;
    this.queueMetrics.corpseTrail.dropped +=
      this.corpses.length + this.trailPoints.length;
    this.popcornPendingCancelled += this.popcornCredits;
    this.ringPendingCancelled += this.ringPending;
    this.popcornCredits = 0;
    this.ringPending = 0;
    this.ringCueReady = false;
    this.pendingBlasts = [];
    this.corpses = [];
    this.trailPoints = [];
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
  hurt(amount = 1, source: "contact" | "bullet" = "contact") {
    if (this.player.invulnerable > 0 || this.phase !== "fight") return;
    if (this.mode === "expedition20") this.hurtExpedition(amount, source);
    else this.hurtSlice();
  }
  // Frozen slice: every hit costs exactly one HP.
  hurtSlice() {
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
  hurtExpedition(amount: number, source: "contact" | "bullet") {
    const derived = this.derivedItemStats();
    const accepted = amount + derived.acceptedHurtDamageBonus;
    this.player.hp -= accepted;
    this.player.maxHp = derived.maxHp;
    this.damageTaken += accepted;
    this.player.invulnerable = 1.05;
    this.shake = 0.3;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.settleExpeditionLoss();
      return;
    }
    if (source === "contact" && derived.counts["undertow-board"] > 0) {
      this.queueBlast({
        p: { x: this.player.x, y: this.player.y },
        radius: derived.hurtExplosion.radius,
        damage: derived.hurtExplosion.damage,
        chain: 0,
        source: "contactProc",
      });
    }
    if (derived.counts["pressure-valve"]) this.pressureTimer = 4;
    this.effect("blast", this.player, 0.35, "#ed7552", 35);
    this.event("hurt");
  }
  hit(
    e: Enemy,
    amount: number,
    from: Vec,
    source: "weapon" | "secondary" = "weapon",
    force = 75,
    chain = 0,
    corpse = false,
    damageSource: DamageSource = source === "secondary"
      ? "secondaryWeapon"
      : "weapon",
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
      if (this.mode === "expedition20") {
        if (this.inventory["wedge-ring"] > 0 && n % 4 === 0) {
          this.rootSecondaryKills.set(chain, n);
        }
        if (this.inventory["big-bang"] > 0 && n % 8 === 0) {
          this.queueBlast({
            p: { x: e.x, y: e.y },
            radius: 160,
            damage: this.derivedItemStats().bigBangDamage,
            chain,
            source: "chain",
            tier3: true,
            dualRing: true,
          });
        }
      }
    }
    this.kills++;
    if (this.firstKill === null) this.firstKill = this.time;
    this.event("kill");
    this.shake = Math.max(this.shake, 0.13);
    const deathRoot =
      this.mode === "expedition20" ? (inChain ? chain : ++this.nextChainId) : 0;
    if (
      this.mode === "expedition20" &&
      damageSource === "contactProc" &&
      this.inventory["spike-shell"] > 0
    ) {
      this.directContactKills++;
      if (
        this.directContactKills % 25 === 0 &&
        this.waveKillHeals < 3 &&
        this.player.hp > 0
      ) {
        this.player.hp = Math.min(this.player.hp + 1, this.maxHp);
        this.waveKillHeals++;
      }
    }
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
    const bossValue =
      this.mode === "expedition20" ? bossForWave(this.wave)?.value : undefined;
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
    const fuel = 1;
    const drop: Scrap = {
      x: e.x,
      y: e.y,
      id: ++this.id,
      value,
      rawCash: value,
      fuelUnits: fuel,
      collected: false,
      vx: heat ? 0 : (this.random() - 0.5) * 140,
      vy: heat ? 0 : (this.random() - 0.5) * 140,
      age: 0,
      heat,
      root: deathRoot,
      exploded: false,
    };
    if (this.mode === "expedition20") {
      this.rawCash += value;
      this.fuelUnits += fuel;
    }
    if (this.scraps.length < EXPEDITION_CAPS.scrapObjects) {
      this.scraps.push(drop);
    } else {
      this.purgeCollectedScraps();
      const merged = this.scraps.find((s) => !s.collected);
      if (!merged) {
        this.scraps.push(drop);
      } else {
        merged.value += value;
        merged.rawCash = (merged.rawCash ?? merged.value - value) + value;
        merged.fuelUnits = (merged.fuelUnits ?? 1) + fuel;
      }
      if (merged && heat && !merged.heat && !merged.exploded) {
        merged.heat = heat;
        merged.root = deathRoot;
        merged.exploded = false;
      }
    }
    // Death is settled once (hp <= 0 guard). Chained explosions are queued, not recursive.
    // The slice only allocates a root when a domino blast is actually queued;
    // expedition allocates the long-lived causal root above for all branches.
    let blastRoot =
      this.mode === "expedition20" ? deathRoot : inChain ? chain : 0;
    if (this.mode === "expedition20" && this.inventory["volatile-trash"] > 0) {
      const derived = this.derivedItemStats();
      this.queueBlast({
        p: { x: e.x, y: e.y },
        radius: wedgeRingRadius(
          this.rootSecondaryKills.get(blastRoot) ?? 0,
          derived.counts["wedge-ring"],
        ),
        damage: derived.volatileTrashDamage,
        chain: blastRoot,
        source: inChain ? "chain" : "itemProc",
        dualRing: derived.counts["wedge-ring"] > 0,
      });
    } else if (this.has("domino") && this.mode !== "expedition20") {
      if (!inChain) blastRoot = ++this.nextChainId;
      this.queueBlast({
        p: { x: e.x, y: e.y },
        radius: 75,
        damage: 26,
        chain: blastRoot,
        source: "itemProc",
        dualRing: false,
      });
    }
    this.pendingPeak = Math.max(this.pendingPeak, this.pendingBlasts.length);
    if (e.kind === "splitter") this.split(e);
    if (e.elite) this.spawnChest(e, "elite");
    if (e.kind === "boss" && [5, 10, 15].includes(this.wave)) {
      this.spawnChest(e, "boss");
    }
  }
  split(e: Enemy) {
    const angle = this.random() * Math.PI * 2;
    this.event("split");
    this.effect("split", e, 0.34, "#f0b071", 28);
    for (const offset of [-Math.PI / 3, Math.PI / 3]) {
      const p = {
        x: clamp(e.x + Math.cos(angle + offset) * 60, 18, ARENA_W - 18),
        y: clamp(e.y + Math.sin(angle + offset) * 60, 18, ARENA_H - 18),
      };
      this.spawn("chip", p);
    }
  }
  spawnCorpse(e: Enemy, from: Vec, root?: number) {
    const shared =
      this.mode === "expedition20"
        ? this.corpses.length + this.trailPoints.length
        : this.corpses.length;
    if (
      shared >=
      (this.mode === "expedition20"
        ? EXPEDITION_CAPS.corpsesAndTrailPoints
        : 180)
    ) {
      if (this.mode === "expedition20")
        this.queueMetrics.corpseTrail.rejected++;
      return;
    }
    if (this.mode === "expedition20") this.queueMetrics.corpseTrail.admitted++;
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
      damage: 30,
      source: "secondaryWeapon",
    });
  }
  explode(
    p: Vec,
    radius: number,
    damage: number,
    primary = true,
    chain = 0,
    slow = false,
    source: DamageSource = primary ? "weapon" : "chain",
  ) {
    // Primary and chain blasts share the approved orange-yellow explosion
    // palette. They are told apart by size and lifetime, not by a new hue.
    this.effect(
      primary ? "blast" : slow ? "domino-blast" : "blast",
      p,
      slow ? 0.48 : primary ? 0.32 : 0.3,
      BLAST.ring,
      radius,
    );
    this.shake = Math.max(this.shake, 0.2);
    this.event("explode");
    for (const e of this.enemies)
      if (e.hp > 0 && dist(e, p) < radius + e.r)
        this.hit(
          e,
          damage,
          p,
          primary ? "weapon" : "secondary",
          170,
          chain,
          false,
          source,
        );
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
    blastRadius?: number,
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
      blastRadius,
      source:
        kind === "enemy"
          ? "enemy"
          : kind === "rocket"
            ? "weapon"
            : kind === "bonus"
              ? "itemProc"
              : "weapon",
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
    if (s.collected === true) return;
    const rawCash = Number.isFinite(s.rawCash) ? s.rawCash! : s.value;
    const fuel = Number.isFinite(s.fuelUnits)
      ? Math.max(0, Math.floor(s.fuelUnits!))
      : 1;
    const source = s;
    source.collected = true;
    if (this.mode === "expedition20") {
      const credit = creditRawCash(
        this.money,
        this.coinAccumulator,
        rawCash,
        itemCount(this.inventory, "siphon-bag"),
      );
      this.money = credit.wallet;
      this.coinAccumulator = credit.remainder;
      this.earned += credit.earned;
      this.collected += fuel;
      if (this.phase === "sweep") this.sweptFuelUnits += fuel;
    } else {
      this.money += rawCash;
      this.earned += rawCash;
      this.fuelUnits += fuel;
    }
    this.picked++;
    if (this.firstPickup === null) this.firstPickup = this.time;
    this.effect("pickup", this.player, 0.25, "#eeb63c", 9);
    this.event("pickup", undefined, rawCash);
    s.value = 0;
    if (this.phase !== "fight") return;
    this.combatPicked++;
    if (this.mode === "expedition20") {
      const derived = this.derivedItemStats();
      if (derived.counts["scrap-popcorn"] > 0) this.admitPopcornFuel(fuel);
      if (derived.counts["magnetic-return"] > 0) {
        this.magnetFuelCharge += fuel;
        while (this.magnetFuelCharge >= ITEM_CONSTANTS.magnetFuelEvery) {
          this.magnetFuelCharge -= ITEM_CONSTANTS.magnetFuelEvery;
          const target = this.enemies.find((e) => e.hp > 0 && e.born <= 0);
          const before = this.bullets.length;
          for (let i = 0; i < ITEM_CONSTANTS.magnetCaps; i++)
            this.shoot(
              this.player,
              (i * Math.PI) / 5,
              ITEM_CONSTANTS.magnetDamage *
                derived.powerFactor *
                derived.pickupBulletDamageMultiplier,
              "bonus",
              derived.pickupBulletHoming && target ? target.id : 0,
              550,
              derived.pickupBulletHoming && !!target,
            );
          const newly = this.bullets.slice(before);
          for (const bullet of newly) {
            bullet.pierce = derived.pickupBulletPierce;
            bullet.mod = "magnet";
          }
          if (derived.pickupBulletHoming) this.magnetPulse = 0.6;
        }
      }
    } else if (this.has("popcorn")) {
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
    if (
      this.mode !== "expedition20" &&
      this.has("magnet") &&
      this.combatPicked % 8 === 0
    ) {
      const tier = this.modTier("magnet");
      const target = this.enemies.find((e) => e.hp > 0 && e.born <= 0);
      const startLen = this.bullets.length;
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
      if (tier >= 2) {
        for (let i = startLen; i < this.bullets.length; i++) {
          const bullet = this.bullets[i];
          if (!bullet?.homing) continue;
          bullet.mod = "magnet";
          bullet.tier = tier;
        }
      }
      if (tier >= 3 && this.magnetPulseCooldown <= 0) {
        this.magnetPulse = 0.6;
        this.magnetPulseCooldown = 0.6;
        this.event("mod-cue", undefined, 3, "magnet");
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
      for (let i = 0; i < 8; i++) {
        this.shoot(
          this.player,
          angle + (i * Math.PI) / 4,
          18,
          "bonus",
          0,
          500,
          false,
        );
        const bullet = this.bullets[this.bullets.length - 1];
        if (bullet) {
          bullet.mod = "popcorn";
          bullet.tier = 3;
        }
      }
      this.ringPending--;
      this.ringCueReady = false;
      this.event("ring");
      this.effect("ring", this.player, 0.36, BLAST.ring, 72);
      this.ringCooldown = 0.5;
    }
    const derived = this.derivedItemStats();
    if (
      this.mode !== "expedition20" ||
      derived.counts["scrap-popcorn"] <= 0 ||
      this.popcornCredits <= 0
    )
      return;
    let drained = 0;
    // Admitted fuel is consumed even when the shared projectile cap rejects
    // one or both shots. This keeps the queue accounting honest.
    while (drained < 4 && this.popcornCredits > 0) {
      const target = this.enemies
        .filter((e) => e.hp > 0 && e.born <= 0)
        .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
      if (!target) break;
      const angle = Math.atan2(
        target.y - this.player.y,
        target.x - this.player.x,
      );
      const before = this.bullets.length;
      for (const offset of [-0.3, 0.3])
        this.shoot(
          this.player,
          angle + offset,
          18 * derived.powerFactor * derived.pickupBulletDamageMultiplier,
          "bonus",
          target.id,
          500,
          true,
        );
      const emitted = this.bullets.slice(before);
      this.popcornShotsAdmitted += emitted.length;
      this.popcornShotsRejected += 2 - emitted.length;
      for (const bullet of emitted) {
        bullet.pierce = derived.pickupBulletPierce;
        bullet.mod = "popcorn";
      }
      this.popcornCredits--;
      this.popcornDrained++;
      this.queueMetrics.popcorn.processed++;
      this.expeditionBonusBudget += 2;
      drained++;
    }
  }
  admitPopcornFuel(units: number) {
    const metrics = this.queueMetrics.popcorn;
    const requested = Math.max(0, Math.floor(units));
    const admitted = Math.min(
      requested,
      QUEUE_CAPS.popcornFuelPending - this.popcornCredits,
    );
    metrics.admitted += admitted;
    // v2 terminology: overflow is deferred/rejected at admission and is never
    // reported as processed output.
    metrics.rejected += requested - admitted;
    this.popcornCredits += admitted;
  }
  queueBlast(blast: PendingBlast) {
    const metrics = this.queueMetrics.pendingBlasts;
    if (this.pendingBlasts.length >= QUEUE_CAPS.pendingBlasts) {
      metrics.rejected++;
      return false;
    }
    metrics.admitted++;
    this.pendingBlasts.push(blast);
    this.pendingPeak = Math.max(this.pendingPeak, this.pendingBlasts.length);
    return true;
  }
  private purgeCollectedScraps() {
    if (!this.scraps.some((s) => s.collected)) return;
    this.scraps = this.scraps.filter((s) => !s.collected);
  }
  spawnChest(e: Enemy, source: "elite" | "boss") {
    const metrics = this.queueMetrics.chests;
    if (this.chests.length >= EXPEDITION_CAPS.physicalChests) {
      metrics.rejected++;
      return false;
    }
    metrics.admitted++;
    this.chests.push({
      x: e.x,
      y: e.y,
      id: ++this.id,
      source,
      wave: this.wave,
      vx: 0,
      vy: 0,
      age: 0,
    });
    this.effect("tell", e, 0.8, "#fff0a1", e.r + 18);
    return true;
  }
  collectChest(chest: ChestPickup) {
    if (!this.chests.includes(chest) || this.frozenChest) return false;
    this.chests = this.chests.filter((c) => c !== chest);
    this.queueMetrics.chests.processed++;
    const count = chest.source === "boss" ? 3 : 2;
    const ids = drawItemOffers({
      owned: this.inventory,
      weapons: this.guns.map((gun) => gun.id),
      count,
      source: chest.source,
      wave: chest.wave,
      rng: this.lootRandom.next,
    });
    this.frozenChest = {
      chestId: chest.id,
      source: chest.source,
      wave: chest.wave,
      itemIds: ids,
    };
    this.event("chest", undefined, chest.source === "boss" ? 3 : 2);
    return true;
  }
  claimReward(id: ItemId) {
    if (
      this.mode !== "expedition20" ||
      this.phase !== "shop" ||
      !this.pendingRewardChoices.includes(id)
    )
      return false;
    if (
      !canOwnItem(
        id,
        this.inventory,
        this.guns.map((gun) => gun.id),
      )
    )
      return false;
    const maxBefore = this.maxHp;
    this.inventory = itemCountsWith(this.inventory, id);
    this.pendingRewardChoices = [];
    const maxAfter = this.maxHp;
    if (maxAfter > maxBefore) this.player.maxHp = maxAfter;
    else if (maxAfter < maxBefore) {
      this.player.maxHp = maxAfter;
      this.player.hp = Math.min(this.player.hp, maxAfter);
    }
    this.events.push({ type: "buy", item: id });
    return true;
  }
  claimPendingItem(index: number) {
    if (
      this.mode !== "expedition20" ||
      this.phase !== "shop" ||
      !this.frozenChest
    )
      return false;
    const id = this.frozenChest.itemIds[index];
    if (!id) return false;
    if (
      !canOwnItem(
        id,
        this.inventory,
        this.guns.map((gun) => gun.id),
      )
    ) {
      return false;
    }
    const maxBefore = this.maxHp;
    this.inventory = itemCountsWith(this.inventory, id);
    this.pendingRewardChoices = [];
    this.frozenChest = null;
    const maxAfter = this.maxHp;
    if (maxAfter > maxBefore) this.player.maxHp = maxAfter;
    else if (maxAfter < maxBefore) {
      this.player.maxHp = maxAfter;
      this.player.hp = Math.min(this.player.hp, maxAfter);
    }
    this.events.push({ type: "buy", item: id });
    return true;
  }
  chooseStatReward(index: number) {
    if (
      this.mode !== "expedition20" ||
      this.phase !== "shop" ||
      index < 0 ||
      index >= this.pendingStatChoices.length
    )
      return false;
    const reward = this.pendingStatChoices[index]!;
    const maxBefore = this.maxHp;
    this.statRewards = applyStatReward(this.statRewards, reward);
    this.events.push({ type: "buy", stat: reward });
    this.pendingStatChoices = [];
    this.statRewardOffers = [];
    const maxAfter = this.maxHp;
    this.player.maxHp = maxAfter;
    if (reward === "hpFlat") {
      this.player.hp = Math.min(maxAfter, this.player.hp + 1);
    } else {
      this.player.hp = Math.min(this.player.hp, maxAfter);
    }
    if (maxAfter > maxBefore && reward !== "hpFlat") {
      this.player.maxHp = maxAfter;
    }
    return true;
  }
  skipReward() {
    if (this.mode !== "expedition20" || this.phase !== "shop") return false;
    this.pendingRewardChoices = [];
    this.pendingStatChoices = [];
    this.statRewardOffers = [];
    this.frozenChest = null;
    return true;
  }
  declinePendingReward() {
    return this.skipReward();
  }
  weapons(dt: number) {
    const expedition = this.mode === "expedition20";
    const derived = expedition ? this.derivedItemStats() : null;
    const weaponMods = (id: WeaponId) =>
      derived ? weaponItemModifiers(id, derived) : undefined;
    const incoming = new Map<number, number>();
    for (const b of this.bullets)
      if (b.target && b.life > 0)
        incoming.set(b.target, (incoming.get(b.target) || 0) + b.damage);
    for (let index = 0; index < this.guns.length; index++) {
      const gun = this.guns[index],
        profile = effectiveWeaponProfile(gun.id, gun.tier, weaponMods(gun.id));
      gun.cooldown -= dt;
      gun.recoil = Math.max(0, gun.recoil - dt * 7);
      if (gun.cooldown > 0) continue;
      if (gun.id === "saw") {
        for (let n = 0; n < profile.saws; n++) {
          const a = this.time * 4 + (index * Math.PI) / 2 + n * Math.PI,
            p = {
              x: this.player.x + Math.cos(a) * profile.sawOrbitRadius,
              y: this.player.y + Math.sin(a) * profile.sawOrbitRadius,
            };
          for (const e of this.enemies)
            if (e.hp > 0 && dist(e, p) < e.r + profile.sawContactRadius)
              this.hit(e, profile.damage, p, "weapon", 75, 0, false, "weapon");
        }
        gun.cooldown = profile.interval;
        continue;
      }
      const enemies = this.enemies
        .filter(
          (e) =>
            e.hp > 0 && e.born <= 0 && dist(e, this.player) <= profile.range,
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
      gun.cooldown = profile.interval;
      gun.recoil = 1;
      const muzzle = {
        x: mount.x + Math.cos(gun.angle) * 24,
        y: mount.y + Math.sin(gun.angle) * 24,
      };
      this.event("fire", gun.id);
      if (this.mode === "expedition20" && profile.tier > 1) {
        this.events.push({
          type: "tier-fire",
          kind: gun.id,
          tier: profile.tier,
        });
      }
      if (gun.id === "coil") {
        const chain: Vec[] = [mount],
          seen = new Set<number>();
        let current: Vec = target;
        const targets = profile.jumps + 1;
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
                      dist(e, current) < profile.jumpRange,
                  )
                  .sort((a, b) => dist(a, current) - dist(b, current))[0];
          if (!e) break;
          seen.add(e.id);
          chain.push({ ...e });
          this.hit(
            e,
            profile.damage,
            current,
            "weapon",
            75,
            0,
            false,
            "weapon",
          );
          current = e;
        }
        this.effect("arc", mount, 0.2, "#9becce", 4, undefined, chain);
      } else if (gun.id === "fist") {
        this.hit(
          target,
          profile.damage,
          this.player,
          "weapon",
          650,
          0,
          true,
          "weapon",
        );
        this.effect("punch", target, 0.22, "#ef896b", 30, undefined, [
          mount,
          { ...target },
        ]);
      } else if (gun.id === "shotgun") {
        const projectiles = profile.pellets * profile.shots;
        const before = this.bullets.length;
        for (let n = 0; n < projectiles; n++) {
          const shot = Math.floor(n / profile.pellets);
          const pellet = n % profile.pellets;
          const spread =
            (pellet - (profile.pellets - 1) / 2) * 0.13 +
            (profile.shots > 1 ? (shot - (profile.shots - 1) / 2) * 0.08 : 0);
          this.shoot(
            muzzle,
            gun.angle + spread,
            profile.damage,
            "cap",
            pellet === Math.floor(profile.pellets / 2) ? target.id : 0,
            520,
          );
        }
        if (profile.pierce !== undefined)
          for (const bullet of this.bullets.slice(before))
            bullet.pierce = profile.pierce;
        incoming.set(
          target.id,
          (incoming.get(target.id) || 0) + profile.damage * projectiles,
        );
      } else {
        const before = this.bullets.length;
        for (let n = 0; n < profile.shots; n++)
          this.shoot(
            muzzle,
            gun.angle + (profile.shots > 1 ? (n - 0.5) * 0.08 : 0),
            profile.damage,
            gun.id === "rocket" ? "rocket" : "cap",
            target.id,
            gun.id === "rocket" ? 390 : 650,
            gun.id === "rocket",
            undefined,
            profile.blastRadius || undefined,
          );
        if (profile.pierce !== undefined)
          for (const bullet of this.bullets.slice(before))
            bullet.pierce = profile.pierce;
        incoming.set(
          target.id,
          (incoming.get(target.id) || 0) + profile.damage * profile.shots,
        );
      }
    }
  }
  bossEntryPoint(): Vec {
    return {
      x: this.player.x < ARENA_W / 2 ? BOSS_ENTRY.farX : BOSS_ENTRY.nearX,
      y: BOSS_ENTRY.y,
    };
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
    this.tickTimers(dt);
    if (this.phase === "interlude") {
      this.interludeRemaining -= dt;
      if (this.interludeRemaining <= 0) this.enterExpeditionWave(this.wave + 1);
      else this.updateLooseScraps(dt);
      return;
    }
    if (this.phase === "fight") {
      this.movePlayer(dt, input);
      const derived = this.derivedItemStats();
      this.player.maxHp = derived.maxHp;
      this.player.hp = Math.min(this.player.hp, derived.maxHp);
      this.spawnOnTimer(dt);
      this.spawnScheduledGroups();
      this.spawnBossesAndElites();
      if (this.mode === "expedition20") this.drainExpeditionPopcorn();
      this.weapons(dt);
      if (this.mode === "expedition20") {
        this.updateMilestoneTrail(dt);
        this.updateSpikeAura(dt);
      }
      // These return true when a hit ended the fight; the rest of the step,
      // cleanup included, is then skipped exactly as before the split.
      if (this.updateEnemies(dt)) return;
      this.updateCorpses(dt);
      if (this.updateBullets(dt)) return;
      this.processPendingBlasts();
      this.pruneChainRoots();
      this.checkWaveCleared();
      this.checkBossDeadline();
    } else this.updateSweep(dt);
    this.updateLooseScraps(dt);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    this.bullets = this.bullets.filter(
      (b) =>
        b.life > 0 &&
        b.x > -30 &&
        b.x < ARENA_W + 30 &&
        b.y > -30 &&
        b.y < ARENA_H + 30,
    );
    this.scraps = this.scraps.filter((s) =>
      this.mode === "expedition20" ? s.collected !== true : s.value > 0,
    );
  }
  tickTimers(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.bonusBudget = 0;
    this.expeditionBonusBudget = 0;
    this.magnetPulseCooldown = Math.max(0, this.magnetPulseCooldown - dt);
    this.ringCooldown = Math.max(0, this.ringCooldown - dt);
    this.pressureTimer = Math.max(0, this.pressureTimer - dt);
    this.movedThisTick = false;
    const inFight = this.phase === "fight";
    if (inFight) {
      this.waveTime += dt;
      this.chainTimer = Math.max(0, this.chainTimer - dt);
      if (this.chainTimer === 0 && this.chainCount > 0) {
        this.chainCount = 0;
        if (this.mode !== "expedition20") this.chainCounts.clear();
      }
    }
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    for (const f of this.fx) {
      f.life -= dt;
      if (f.kind === "number") f.y -= dt * 36;
    }
    this.fx = this.fx.filter((f) => f.life > 0);
  }
  movePlayer(dt: number, input: Vec) {
    const l = Math.hypot(input.x, input.y);
    if (l) {
      const derived =
        this.mode === "expedition20" ? this.derivedItemStats() : null;
      const speed = PLAYER_SPEED * (derived?.moveFactor ?? 1);
      const beforeX = this.player.x,
        beforeY = this.player.y;
      this.player.x = clamp(
        this.player.x + (input.x / Math.max(1, l)) * speed * dt,
        PLAYER_WALL_MARGIN,
        ARENA_W - PLAYER_WALL_MARGIN,
      );
      this.player.y = clamp(
        this.player.y + (input.y / Math.max(1, l)) * speed * dt,
        PLAYER_WALL_MARGIN,
        ARENA_H - PLAYER_WALL_MARGIN,
      );
      this.player.walk += dt * 15;
      this.movedThisTick =
        Math.abs(this.player.x - beforeX) + Math.abs(this.player.y - beforeY) >
        1e-8;
    }
  }
  // Steady trickle on top of the scheduled groups.
  spawnOnTimer(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    if (this.mode === "expedition20") {
      this.spawnTimer = 1 / RATES[this.wave - 1];
      this.spawn(this.pickKind(MIX[this.wave - 1]));
      return;
    }
    this.spawnTimer = this.wave === 1 ? 1 / 3.1 : 1 / 4.2;
    // The frozen slice keeps its timer-only counter. Expedition counts all
    // successful births centrally in spawn().
    if (this.spawn(this.sliceTimerKind())) this.spawnCount++;
  }
  // Frozen slice mix: one random draw per timer spawn.
  sliceTimerKind(): Enemy["kind"] {
    const r = this.random();
    if (this.wave === 1) return r > 0.87 ? "runner" : "bag";
    if (r > 0.84) return "can";
    return r > 0.6 ? "runner" : "bag";
  }
  spawnScheduledGroups() {
    if (this.mode === "expedition20") {
      while (
        this.expeditionBatchIndex < this.expeditionBatches.length &&
        this.waveTime >= this.expeditionBatches[this.expeditionBatchIndex].time
      ) {
        const batch = this.expeditionBatches[this.expeditionBatchIndex++];
        if (batch.formation === "two-cluster") {
          let centers = this.expeditionClusterCenters.get(batch.time);
          if (!centers) {
            centers = this.twoClusterCenters();
            this.expeditionClusterCenters.set(batch.time, centers);
          }
          const center = centers[batch.group];
          this.spawnExpeditionBatch(batch.formation, batch.count, 75, center);
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
  }
  spawnBossesAndElites() {
    if (this.mode === "expedition20" && this.pendingBoss) {
      const boss = bossForWave(this.wave)!;
      if (this.spawn("boss", this.bossEntryPoint())) {
        this.bossSpawned = true;
        this.event("wave");
        this.event("boss", undefined, boss.stage);
      }
    }
    if (this.mode === "expedition20" && this.pendingElite) {
      const info = eliteForWave(this.wave);
      if (info && this.spawn("can", this.bossEntryPoint(), true)) {
        this.eliteSpawned = true;
        this.effect("tell", this.enemies.at(-1)!, 0.9, "#ffe071", 50);
      }
    }
    if (
      this.mode === "expedition20" &&
      this.waveTime >= this.duration &&
      isEliteWave(this.wave) &&
      !this.eliteSpawned
    ) {
      this.eliteEscaped = true;
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
      if (this.spawn("boss", this.bossEntryPoint())) {
        this.bossSpawned = true;
        this.event("wave");
      }
    }
  }
  // Chase speed in px/s; `distance` is to the player.
  enemySpeed(e: Enemy, distance: number) {
    if (e.elite) return eliteForWave(this.wave)?.speed ?? ELITE_FALLBACK_SPEED;
    if (e.kind === "spitter")
      return distance > SPITTER_HOLD_DISTANCE ? ENEMY_SPEED.spitter : 0;
    return ENEMY_SPEED[e.kind];
  }
  updateEnemies(dt: number): boolean {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.age += dt;
      e.born = Math.max(0, e.born - dt);
      e.flash = Math.max(0, e.flash - dt);
      if (e.born > 0) continue;
      const dx = this.player.x - e.x,
        dy = this.player.y - e.y,
        l = Math.hypot(dx, dy) || 1,
        speed = this.enemySpeed(e, l);
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
            this.hit(
              other,
              30,
              e,
              "secondary",
              170,
              0,
              false,
              "secondaryWeapon",
            );
            if (this.phase !== "fight") return true;
          }
        }
      e.x = clamp(e.x + (e.vx + e.knockX) * dt, 18, ARENA_W - 18);
      e.y = clamp(e.y + (e.vy + e.knockY) * dt, 18, ARENA_H - 18);
      e.knockX *= Math.exp(-dt * 7);
      e.knockY *= Math.exp(-dt * 7);
      if (dist(e, this.player) < e.r + 17) {
        this.hurt(1, "contact");
        if (this.phase !== "fight") return true;
      }
      if (e.kind === "boss") this.updateBossAttack(e, dt);
      else if (e.kind === "spitter") this.updateSpitterAttack(e, dt);
    }
    return false;
  }
  updateBossAttack(e: Enemy, dt: number) {
    e.attack -= dt;
    if (e.tell && e.tell > 0) {
      e.tell = Math.max(0, e.tell - dt);
      if (e.tell === 0) e.attack = 0;
    }
    if (e.attack <= 0) {
      const stage = this.mode === "expedition20" ? (e.bossStage ?? 1) : 1,
        info =
          this.mode === "expedition20"
            ? bossForWave(this.wave)!
            : { interval: 2.4, radial: 8, stage: 1 as const };
      e.attack = info.interval;
      e.volleys = (e.volleys ?? 0) + 1;
      const volley = e.volleys;
      if ((stage === 2 || stage === 4) && volley % 3 === 0) {
        const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
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
            x: clamp(e.x + (i - 1) * 35, 28, ARENA_W - 28),
            y: clamp(e.y + 50, 28, ARENA_H - 28),
          });
      }
      if (stage === 4 && volley % 4 === 0) {
        for (let i = 0; i < 4; i++)
          this.spawn("chip", {
            x: clamp(e.x + (i - 1.5) * 26, 18, ARENA_W - 18),
            y: clamp(e.y + 58, 18, ARENA_H - 18),
          });
      }
      this.effect("blast", e, 0.3, "#ed7552", 60);
    }
  }
  updateSpitterAttack(e: Enemy, dt: number) {
    e.attack -= dt;
    if (e.attack <= 0) {
      if (!e.tell) {
        this.event("spitter-tell");
        this.effect("tell", e, 0.8, "#e5a04d", 34);
      }
      e.attack = 2.2;
      e.tell = 0.8;
    }
    if (e.tell && e.tell > 0) {
      e.tell = Math.max(0, e.tell - dt);
      if (e.tell === 0) {
        const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        this.shoot(e, a, 1, "enemy", 0, 190, false, 3.5);
      }
    }
  }
  updateCorpses(dt: number) {
    // S1b: spring-fist remnants keep flying after a lethal hit. They are not
    // targetable and never touch the player; each enemy can be bowled once.
    for (const k of this.corpses) {
      k.life -= dt;
      k.x = clamp(k.x + k.vx * dt, 18, ARENA_W - 18);
      k.y = clamp(k.y + k.vy * dt, 18, ARENA_H - 18);
      k.vx *= Math.exp(-dt * 7);
      k.vy *= Math.exp(-dt * 7);
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.born > 0 || k.hitIds.has(e.id)) continue;
        if (dist(e, k) < e.r + k.r) {
          k.hitIds.add(e.id);
          const damage =
            this.mode === "expedition20"
              ? this.derivedItemStats().fistRemnantDamage
              : (k.damage ?? 30);
          this.hit(
            e,
            damage,
            k,
            "secondary",
            170,
            k.chain,
            false,
            "secondaryWeapon",
          );
        }
      }
    }
    if (this.corpses.length)
      this.corpses = this.corpses.filter((k) => k.life > 0);
  }
  updateBullets(dt: number): boolean {
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      const old = { x: b.x, y: b.y };
      if (b.homing) {
        const target = this.enemies.find((e) => e.id === b.target && e.hp > 0);
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
          this.hurt(1, "bullet");
          b.life = 0;
          if (this.phase !== "fight") return true;
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
          if (b.kind === "rocket") {
            this.explode(
              b,
              b.blastRadius ?? 92,
              b.damage,
              true,
              0,
              false,
              "weapon",
            );
          } else
            this.hit(
              e,
              b.damage,
              old,
              b.kind === "bonus" ? "secondary" : "weapon",
              75,
              0,
              false,
              b.kind === "bonus" ? "itemProc" : "weapon",
            );
          if (!b.hitIds || (b.pierce ?? 0) <= 0) b.life = 0;
          else if (b.pierce! > 0) b.pierce!--;
        }
      }
    }
    return false;
  }
  processPendingBlasts() {
    for (let i = 0; i < 12 && this.pendingBlasts.length; i++) {
      const blast = this.pendingBlasts.shift()!;
      if (blast.dualRing)
        this.effect("domino-ring", blast.p, 0.45, "#f6c35c", blast.radius);
      this.queueMetrics.pendingBlasts.processed++;
      this.explode(
        blast.p,
        blast.radius,
        blast.damage,
        false,
        blast.chain,
        !!blast.tier3,
        blast.source,
      );
    }
  }
  pruneChainRoots() {
    // Reclaim chain roots with no queued work and no live remnant. Without
    // this, sustained secondary kills keep refreshing chainTimer and finished
    // roots would never be released in a long run. The xN readout is a separate
    // scalar (chainCount) and still decays on its own 0.8s timer.
    if (
      this.chainCounts.size ||
      this.rootSecondaryKills.size ||
      (this.mode === "expedition20" && this.dominoRadius.size)
    ) {
      const live = new Set<number>();
      for (const b of this.pendingBlasts) live.add(b.chain);
      for (const k of this.corpses) live.add(k.chain);
      for (const point of this.wakePoints) live.add(point.root);
      for (const point of this.trailPoints) live.add(point.root);
      for (const s of this.scraps)
        if (this.branch === "ember" && (s.heat ?? 0) > 0 && s.root)
          live.add(s.root);
      for (const id of this.chainCounts.keys()) {
        if (live.has(id)) continue;
        this.chainCounts.delete(id);
      }
      // This map must prune independently: a radius can outlive deletion of
      // its chainCounts key, and looping chainCounts alone would leak it.
      if (this.mode === "expedition20")
        for (const id of this.dominoRadius.keys()) {
          if (!live.has(id)) this.dominoRadius.delete(id);
        }
      if (this.mode === "expedition20")
        for (const id of this.rootSecondaryKills.keys()) {
          if (!live.has(id)) this.rootSecondaryKills.delete(id);
        }
    }
  }
  checkWaveCleared() {
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
      if (this.mode === "expedition20") {
        this.cancelExpeditionWavePending();
      }
      this.phase = "sweep";
      this.sweepTime = 1;
      this.enemies = [];
      this.bullets = [];
      this.pendingBlasts = [];
      this.corpses = [];
      this.trailPoints = [];
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
  }
  checkBossDeadline() {
    const deadline =
      this.mode === "expedition20"
        ? this.waveTime > this.deadline
        : this.waveTime > 50;
    if (
      this.phase === "fight" &&
      deadline &&
      (this.mode === "slice" ? this.wave === 2 : isBossWave(this.wave))
    ) {
      if (this.mode === "expedition20") this.settleExpeditionLoss();
      else {
        this.phase = "lost";
        this.pendingBlasts = [];
        this.scraps = [];
        this.chests = [];
        this.corpses = [];
        this.trailPoints = [];
        this.bullets = [];
        this.event("end");
      }
    }
  }
  updateSweep(dt: number) {
    this.sweepTime -= dt;
    if (this.sweepTime <= 0) {
      for (const s of this.scraps) {
        if (this.mode === "expedition20") {
          if (s.collected === true) continue;
          const rawCash = Number.isFinite(s.rawCash) ? s.rawCash! : s.value;
          const fuel = Number.isFinite(s.fuelUnits)
            ? Math.max(0, Math.floor(s.fuelUnits!))
            : 1;
          s.collected = true;
          const credit = creditRawCash(
            this.money,
            this.coinAccumulator,
            rawCash,
            itemCount(this.inventory, "siphon-bag"),
          );
          this.money = credit.wallet;
          this.coinAccumulator = credit.remainder;
          this.earned += credit.earned;
          this.sweptFuelUnits += fuel;
          this.collected += fuel;
          this.picked++;
          if (this.firstPickup === null) this.firstPickup = this.time;
          this.effect("pickup", this.player, 0.25, "#eeb63c", 9);
          this.event("pickup", undefined, rawCash);
          s.value = 0;
          // updateLooseScraps normally reaches collect() while sweeping.
          // This fallback handles a late object not reached there; credit
          // fuel in both paths without running fight-only pickup procs.
          s.collected = true;
        } else this.collect(s);
      }
      this.scraps = [];
      if (this.mode === "expedition20") this.openStop();
      else {
        this.phase = this.wave === 1 ? "shop" : "won";
        if (this.phase === "won") this.event("end");
      }
    }
  }
  updateMilestoneTrail(dt: number) {
    for (const point of this.trailPoints) {
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
            false,
            "itemProc",
          );
        }
      }
    }
    this.trailPoints = this.trailPoints.filter((point) => point.life > 0);
    if (this.inventory.milestone <= 0 || !this.movedThisTick) return;
    const d = dist(this.player, this.lastMilestone);
    if (d <= 0) return;
    this.distanceSinceMilestone += d;
    this.lastMilestone = { x: this.player.x, y: this.player.y };
    while (this.distanceSinceMilestone >= 90) {
      this.distanceSinceMilestone -= 90;
      if (
        this.corpses.length + this.trailPoints.length >=
        EXPEDITION_CAPS.corpsesAndTrailPoints
      ) {
        this.queueMetrics.corpseTrail.rejected++;
        return;
      }
      this.queueMetrics.corpseTrail.admitted++;
      const derived = this.derivedItemStats();
      this.trailPoints.push({
        kind: "milestone",
        x: this.player.x,
        y: this.player.y,
        id: ++this.id,
        life: 1,
        max: 1,
        radius: 36,
        damage: derived.milestoneDamage,
        root: ++this.nextChainId,
        hitIds: new Set(),
      });
      this.event("wake-hit");
      this.effect("wake", this.player, 0.28, "#fff0a0", 22);
    }
  }
  updateSpikeAura(dt: number) {
    const derived = this.derivedItemStats();
    if (derived.counts["spike-shell"] <= 0) return;
    this.spikeAuraTimer += dt;
    if (this.spikeAuraTimer < 0.5) return;
    this.spikeAuraTimer -= 0.5;
    this.effect("ring", this.player, 0.22, "#dff6e8", 40);
    for (const e of this.enemies) {
      if (e.hp > 0 && e.born <= 0 && dist(e, this.player) <= 40 + e.r)
        this.hit(
          e,
          derived.spikeShellDamage,
          this.player,
          "secondary",
          60,
          0,
          false,
          "contactProc",
        );
    }
  }
  settleExpeditionLoss() {
    if (this.phase !== "fight") return;
    this.queueMetrics.pendingBlasts.dropped += this.pendingBlasts.length;
    this.queueMetrics.popcorn.dropped += this.popcornCredits;
    this.queueMetrics.corpseTrail.dropped +=
      this.corpses.length + this.trailPoints.length;
    this.queueMetrics.chests.dropped += this.chests.length;
    this.phase = "lost";
    this.pendingBlasts = [];
    this.popcornCredits = 0;
    this.pendingRewardChoices = [];
    this.pendingStatChoices = [];
    this.frozenChest = null;
    this.chests = [];
    this.scraps = [];
    this.corpses = [];
    this.trailPoints = [];
    this.bullets = [];
    this.event("end");
  }
  updateLooseScraps(dt: number) {
    const expedition = this.mode === "expedition20";
    if (this.magnetPulse > 0)
      this.magnetPulse = Math.max(0, this.magnetPulse - dt);
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
          this.explode(s, 55, 25, false, s.root || ++this.nextChainId);
          this.event("ember-blast");
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
    if (expedition) {
      for (const chest of [...this.chests]) {
        chest.age += dt;
        const d = dist(chest, this.player);
        if (d < this.magnetRadius || this.phase === "sweep") {
          const speed = 260 + Math.min(900, chest.age * 300);
          chest.vx = ((this.player.x - chest.x) / (d || 1)) * speed;
          chest.vy = ((this.player.y - chest.y) / (d || 1)) * speed;
        }
        chest.x += chest.vx * dt;
        chest.y += chest.vy * dt;
        if (this.phase === "sweep" || dist(chest, this.player) < 28)
          this.collectChest(chest);
      }
    }
    if (
      this.mode === "expedition20" &&
      this.branch === "wake" &&
      this.phase === "fight" &&
      this.inventory.milestone <= 0
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
            this.hit(e, point.damage, point, "secondary", 50, point.root);
          }
        }
      }
      this.wakePoints = this.wakePoints.filter((point) => point.life > 0);
    }
  }
}
