// Shared simulation data shapes. Rules live in sim.ts; render.ts, audio.ts
// and main.ts read these shapes without importing the Game class at runtime.
import type { ModId, WeaponId } from "./data";
import type { ExpeditionEnemyKind, Formation, GunTier } from "./expedition";
import type { ItemId, ItemLootSource, StatRewardId } from "./items";
import type { Vec } from "./math";

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
  elite?: boolean;
  eliteWave?: number;
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
  mod?: ModId;
  tier?: number;
  blastRadius?: number;
  source?: DamageSource | "enemy";
};
export type Scrap = Vec & {
  id: number;
  value: number;
  rawCash?: number;
  fuelUnits?: number;
  collected?: boolean;
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
  damage?: number;
  source?: DamageSource;
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
    | "ember"
    | "split"
    | "tell"
    | "domino-ring"
    | "domino-blast"
    | "ring";
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
  tier?: GunTier;
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
export type TrailPoint = WakePoint & {
  kind: "milestone";
};
export type ChestPickup = Vec & {
  id: number;
  source: ItemLootSource;
  wave: number;
  vx: number;
  vy: number;
  age: number;
};
export type FrozenChestChoice = {
  chestId: number;
  source: ItemLootSource;
  wave: number;
  itemIds: readonly ItemId[];
};
export type QueueMetrics = {
  admitted: number;
  // Contract v2 calls admission rejection `deferred`; this counter is that
  // admission-rejection count, not a promise of later processing.
  rejected: number;
  dropped: number;
  // Queue-specific completed work. Popcorn counts consumed fuel units here,
  // not emitted bullets; use the popcorn shot counters for emitted output.
  processed: number;
};
export type DamageSource =
  "weapon" | "secondaryWeapon" | "contactProc" | "chain" | "itemProc";
export type PendingBlast = {
  p: Vec;
  radius: number;
  damage: number;
  chain: number;
  source: DamageSource;
  dualRing?: boolean;
  tier3?: boolean;
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
    | "wake-hit"
    | "ember-blast"
    | "split"
    | "spitter-tell"
    | "mod-cue"
    | "tier-fire"
    | "merge"
    | "ring"
    | "elite"
    | "chest"
    | "end";
  kind?: WeaponId;
  item?: ItemId;
  stat?: StatRewardId;
  value?: number;
  mod?: ModId;
  tier?: number;
};
