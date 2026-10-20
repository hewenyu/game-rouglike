import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DT } from "../src/data";
import { DURATIONS, gunPrice, rerollPrice } from "../src/expedition";
import {
  ITEM_IDS,
  ITEM_CAPS,
  type ItemId,
  type StatRewardId,
} from "../src/items";
import { Game, type Event, type QueueMetrics } from "../src/sim";
import { movementInput } from "./p3-driver";
import {
  P3_COHORTS,
  P3_PER_WAVE_STEP_CAPS,
  P3_POLICY,
  P3_RUN_STEP_CAP,
  canonicalJson,
  type P3Cohort,
  type P3CohortId,
} from "./p3-policy";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const DEFAULT_DATA = resolve(ROOT, "docs/data/p3-measurement");
const DEFAULT_ARTIFACTS = "/tmp/scrap-p3-measurement-447af10";
const SOURCE_FILES = [
  "src/audio.ts",
  "src/data.ts",
  "src/expedition.ts",
  "src/input.ts",
  "src/items.ts",
  "src/main.ts",
  "src/math.ts",
  "src/render.ts",
  "src/sim.ts",
  "src/style.css",
] as const;
const BOSS_WAVES = [5, 10, 15, 20] as const;
function bossIndex(wave: (typeof BOSS_WAVES)[number]) {
  return BOSS_WAVES.indexOf(wave);
}
const HP_SAMPLE_STEPS = P3_POLICY.bossHpSample.everySteps;
const ACTUAL_ITEM_ATTRIBUTION =
  "missing: the public read-only API exposes weapon/item projectile metadata and damage-source parameters but no per-hit source ledger";

type RunTransaction = {
  order: number;
  restAfterWave: number;
  kind: "core-reward" | "stat" | "item-purchase" | "weapon-purchase" | "reroll";
  requestedIndex: number;
  item?: ItemId;
  weapon?: string;
  tier?: number;
  merged?: boolean;
  price: number;
  refund: number;
  cashBefore: number;
  cashAfter: number;
  cashDelta: number;
  cashConserved: boolean;
  accepted: boolean;
  legalityBefore: boolean;
  reason?: string;
};

type RestRecord = {
  afterWave: number;
  cashStart: number;
  cashEnd: number;
  spend: {
    coreReward: number;
    stat: number;
    item: number;
    weapon: number;
  };
  refund: number;
  rerollSpend: number;
  rerollCount: number;
  coreOffers: ItemId[];
  coreClaimed: ItemId | null;
  itemOffers: ReadonlyArray<{
    id: ItemId;
    price: number;
    legal: boolean;
    affordable: boolean;
    usefulToCohort: boolean;
  }>;
  chestOffers: ItemId[];
  chestClaimed: ItemId | null;
  statOffers: StatRewardId[];
  statClaimed: StatRewardId | null;
  usableItemOffers: number;
  usableAffordableItemOffers: number;
  ownedItems: number;
  weaponSlots: number;
  maxWeaponTier: number;
  inventory: Record<ItemId, number>;
  stats: {
    statRewards: typeof baseStatShape;
    damageFactor: number;
    attackSpeedFactor: number;
    powerFactor: number;
    moveFactor: number;
    maxHp: number;
    pickupRadius: number;
  };
  health: { hp: number; maxHp: number };
  transactions: RunTransaction[];
  cashConservationFailures: number;
  purchaseLegalityFailures: number;
};

type BossRecord = {
  wave: (typeof BOSS_WAVES)[number];
  scheduledSpawnAtWaveTime: number;
  everSpawned: boolean;
  firstObserved: {
    simulationTime: number;
    waveTime: number;
    hp: number;
    maxHp: number;
  } | null;
  engaged: boolean;
  engagementWindow: {
    firstAt: number;
    lastAt: number;
    duration: number;
  } | null;
  sampledHp: Array<{
    simulationTime: number;
    waveTime: number;
    hp: number;
  }>;
  positiveHpDecreaseSamples: number;
  observedDamage: number;
  maxHp: number;
  lastObservedHp: number | null;
  killed: boolean;
  survivedToTerminal: boolean;
  encounterClassification:
    | "not-encountered"
    | "engaged-no-observed-damage"
    | "engaged-with-observed-damage"
    | "killed";
};

type WaveRecord = {
  wave: number;
  duration: number;
  bossWave: boolean;
  elapsedCombat: number;
  fixedSteps: number;
  endReason: "sweep" | "lost" | "run-cap" | "terminal";
  phaseAtEnd: string;
  kills: number;
  bossKills: number;
  spawns: number;
  picked: number;
  combatPicked: number;
  sweptFuelUnits: number;
  rawCashGenerated: number;
  cashCollectedThisWave: number;
  cashAtWaveStart: number;
  cashAtWaveEnd: number;
  earnedAtWaveStart: number;
  earnedAtWaveEnd: number;
  healthStart: { hp: number; maxHp: number };
  healthEnd: { hp: number; maxHp: number };
  damageTaken: number;
  output: {
    shotsAcceptedPlayer: number;
    shotsRejectedPlayer: number;
    shotsAcceptedEnemy: number;
    shotsRejectedEnemy: number;
    bulletPeak: number;
    popcornShotsAdmitted: number;
    popcornShotsRejected: number;
    popcornBudgetSkippedPickups: number;
    events: Partial<Record<Event["type"], number>>;
    queueDelta: Record<
      "pendingBlasts" | "popcorn" | "corpseTrail" | "chests" | "fx",
      QueueMetrics
    >;
    queueAtEnd: Record<
      "pendingBlasts" | "popcorn" | "corpseTrail" | "chests" | "fx",
      QueueMetrics
    >;
  };
  pickup: {
    total: number;
    combat: number;
    sweptFuelUnits: number;
    firstKill: number | null;
    firstPickup: number | null;
  };
};

type RunRecord = {
  cohort: P3CohortId;
  seed: number;
  outcome: Game["phase"];
  terminalReason:
    | "won"
    | "lost-hp"
    | "lost-deadline"
    | "lost-during-boss-spawn"
    | "harness-run-cap"
    | "incomplete";
  ok: boolean;
  sourceSHA: string;
  policySHA256: string;
  driverSHA256: string;
  reportSourceSHA256: string;
  finalWave: number;
  finalWaveTime: number;
  simulationTime: number;
  fixedSteps: number;
  perWaveStepCap: number;
  runStepCap: number;
  kills: number;
  bossKills: number;
  health: { hp: number; maxHp: number };
  cash: {
    start: number;
    end: number;
    earned: number;
    rawCashGenerated: number;
    spent: number;
    refunds: number;
    rerolls: number;
    reserve: number;
  };
  inventory: Record<ItemId, number>;
  stats: RestRecord["stats"];
  guns: ReadonlyArray<{ id: string; tier: number; paid: number }>;
  acquisitions: Array<{
    wave: number;
    source: "core" | "chest" | "shop";
    item: ItemId;
    cash: number;
  }>;
  missingCore: readonly string[];
  routeLabelEvidence: string;
  actualItemDamageAttribution: string;
  output: {
    shotsAcceptedPlayer: number;
    shotsRejectedPlayer: number;
    shotsAcceptedEnemy: number;
    shotsRejectedEnemy: number;
    bulletPeak: number;
    popcornShotsAdmitted: number;
    popcornShotsRejected: number;
    popcornBudgetSkippedPickups: number;
    queueCounters: Game["queueMetrics"];
  };
  bossWindows: BossRecord[];
  rests: RestRecord[];
  waves: WaveRecord[];
  integrity: {
    noNegativeMoney: boolean;
    noNegativeHp: boolean;
    noHpRevival: boolean;
    noOverCapItems: boolean;
    noIneligiblePurchases: boolean;
    noNegativeQueueCounters: boolean;
    allTransactionsCashConserved: boolean;
    sourceGuardClean: boolean;
  };
  failureNotes: string[];
};

const baseStatShape = {
  damage: 0,
  as: 0,
  hpFlat: 0,
  move: 0,
  pickup: 0,
  power: 0,
};

const ITEM_ORDER = [...ITEM_IDS];
const QUEUE_KEYS = [
  "pendingBlasts",
  "popcorn",
  "corpseTrail",
  "chests",
  "fx",
] as const;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function cloneInventory(game: Game): Record<ItemId, number> {
  return Object.fromEntries(
    ITEM_ORDER.map((id) => [id, Number(game.inventory[id] ?? 0)]),
  ) as Record<ItemId, number>;
}

function itemCountsTotal(inventory: Readonly<Record<ItemId, number>>) {
  return ITEM_ORDER.reduce((sum, id) => sum + inventory[id], 0);
}

function queueSnapshot(game: Game) {
  return Object.fromEntries(
    QUEUE_KEYS.map((key) => [key, { ...game.queueMetrics[key] }]),
  ) as RunRecord["output"]["queueCounters"];
}

function queueDelta(
  before: ReturnType<typeof queueSnapshot>,
  after: ReturnType<typeof queueSnapshot>,
) {
  return Object.fromEntries(
    QUEUE_KEYS.map((key) => [
      key,
      {
        admitted: after[key].admitted - before[key].admitted,
        rejected: after[key].rejected - before[key].rejected,
        dropped: after[key].dropped - before[key].dropped,
        processed: after[key].processed - before[key].processed,
      },
    ]),
  ) as RunRecord["output"]["queueCounters"];
}

function statsSnapshot(game: Game): RestRecord["stats"] {
  const derived = game.derivedItemStats();
  return {
    statRewards: { ...game.statRewards },
    damageFactor: derived.weaponFactor,
    attackSpeedFactor: derived.asFactor,
    powerFactor: derived.powerFactor,
    moveFactor: derived.moveFactor,
    maxHp: derived.maxHp,
    pickupRadius: derived.pickupRadius,
  };
}

function cohortPriorityIndex(cohort: P3Cohort, id: ItemId) {
  const index = cohort.itemPriorities.findIndex((entry) => entry.id === id);
  return index < 0 ? Number.POSITIVE_INFINITY : index;
}

function priorityCap(cohort: P3Cohort, id: ItemId) {
  return cohort.itemPriorities.find((entry) => entry.id === id)?.cohortCap ?? 0;
}

function isUsefulToCohort(cohort: P3Cohort, game: Game, id: ItemId) {
  if (cohort.itemSelection === "none") return false;
  if (cohort.itemSelection === "first-legal") return true;
  if (!game.itemEligibility(id).eligible) return false;
  const native = game.itemEligibility(id).remaining;
  const cap = priorityCap(cohort, id);
  return (
    Number.isFinite(cohortPriorityIndex(cohort, id)) &&
    cap > 0 &&
    native > 0 &&
    game.inventory[id] < cap
  );
}

function pickFreeCore(
  cohort: P3Cohort,
  game: Game,
): { index: number; id: ItemId } | null {
  if (cohort.itemSelection === "none") return null;
  if (cohort.itemSelection === "first-legal") {
    const index = game.pendingRewardChoices.findIndex(
      (id) => game.itemEligibility(id).eligible,
    );
    return index >= 0 ? { index, id: game.pendingRewardChoices[index]! } : null;
  }
  for (const preferred of cohort.corePriorities) {
    const index = game.pendingRewardChoices.indexOf(preferred);
    if (index < 0) continue;
    const id = game.pendingRewardChoices[index]!;
    if (
      game.itemEligibility(id).eligible &&
      game.inventory[id] < priorityCap(cohort, id)
    )
      return { index, id };
  }
  return null;
}

function pickChest(
  cohort: P3Cohort,
  game: Game,
): { index: number; id: ItemId } | null {
  if (cohort.itemSelection === "none" || !game.frozenChest) return null;
  if (cohort.itemSelection === "first-legal") {
    const index = game.pendingChestChoices.findIndex(
      (entry) => entry.available,
    );
    return index >= 0
      ? { index, id: game.pendingChestChoices[index]!.id }
      : null;
  }
  const matching = game.pendingChestChoices
    .filter(
      (entry) =>
        entry.available &&
        Number.isFinite(cohortPriorityIndex(cohort, entry.id)) &&
        game.inventory[entry.id] < priorityCap(cohort, entry.id),
    )
    .sort((left, right) => {
      const rank =
        cohortPriorityIndex(cohort, left.id) -
        cohortPriorityIndex(cohort, right.id);
      return rank || left.index - right.index;
    });
  return matching[0] ? { index: matching[0].index, id: matching[0].id } : null;
}

function pickStat(cohort: P3Cohort, game: Game) {
  if (!game.pendingStatChoices.length) return null;
  for (const preferred of P3_POLICY.sharedStatPriority) {
    const index = game.pendingStatChoices.indexOf(preferred);
    if (index >= 0) return { index, id: game.pendingStatChoices[index]! };
  }
  return {
    index: 0,
    id: game.pendingStatChoices[0]!,
  };
}

function itemCandidate(
  cohort: P3Cohort,
  game: Game,
): { index: number; id: ItemId; price: number } | null {
  if (cohort.itemSelection === "none") return null;
  const candidates = game.itemOffers
    .map((id, index) => ({
      index,
      id,
      price: game.itemOfferPrice(index),
      legal: !game.soldItems.has(index) && game.itemEligibility(id).eligible,
    }))
    .filter((entry) => entry.legal);
  if (!candidates.length) return null;
  if (cohort.itemSelection === "first-legal") {
    const chosen = candidates[0]!;
    return game.money >= chosen.price ? chosen : null;
  }
  const ranked = candidates
    .filter(
      (entry) =>
        Number.isFinite(cohortPriorityIndex(cohort, entry.id)) &&
        game.inventory[entry.id] < priorityCap(cohort, entry.id),
    )
    .sort((left, right) => {
      const rank =
        cohortPriorityIndex(cohort, left.id) -
        cohortPriorityIndex(cohort, right.id);
      return rank || left.index - right.index;
    });
  const chosen = ranked[0];
  return chosen && game.money >= chosen.price ? chosen : null;
}

function weaponCandidate(game: Game) {
  const candidates = game.offers
    .map((id, index) => ({
      id,
      index,
      price: gunPrice(id, game.wave),
      preview: game.expeditionPurchasePreview(index),
    }))
    .filter(
      (entry) =>
        !game.sold.has(entry.index) &&
        entry.preview.accepted &&
        game.money >= entry.price,
    );
  if (!candidates.length) return null;
  return candidates.sort((left, right) => {
    const leftRank = P3_POLICY.sharedWeaponPreference.indexOf(left.id);
    const rightRank = P3_POLICY.sharedWeaponPreference.indexOf(right.id);
    const leftUnowned = !game.guns.some((gun) => gun.id === left.id);
    const rightUnowned = !game.guns.some((gun) => gun.id === right.id);
    if (leftUnowned !== rightUnowned) return leftUnowned ? -1 : 1;
    if (leftUnowned) return leftRank - rightRank;
    const leftTier = game.guns.find((gun) => gun.id === left.id)?.tier ?? 1;
    const rightTier = game.guns.find((gun) => gun.id === right.id)?.tier ?? 1;
    return leftTier - rightTier || leftRank - rightRank;
  })[0]!;
}

function bossSnapshot(game: Game, wave: number) {
  const stage = BOSS_WAVES.indexOf(wave as (typeof BOSS_WAVES)[number]) + 1;
  return game.enemies.find(
    (enemy) =>
      enemy.kind === "boss" && enemy.hp > 0 && enemy.bossStage === stage,
  );
}

function waveOutput(
  game: Game,
  events: readonly Event[],
  queueBefore: ReturnType<typeof queueSnapshot>,
  counterStart: {
    shootAcceptedPlayer: number;
    shootRejectedPlayer: number;
    shootAcceptedEnemy: number;
    shootRejectedEnemy: number;
    bulletPeak: number;
    popcornShotsAdmitted: number;
    popcornShotsRejected: number;
    popcornBudgetSkippedPickups: number;
  },
) {
  const eventCounts: Partial<Record<Event["type"], number>> = {};
  for (const event of events)
    eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
  const queueAfter = queueSnapshot(game);
  return {
    shotsAcceptedPlayer:
      game.shootAcceptedPlayer - counterStart.shootAcceptedPlayer,
    shotsRejectedPlayer:
      game.shootRejectedPlayer - counterStart.shootRejectedPlayer,
    shotsAcceptedEnemy:
      game.shootAcceptedEnemy - counterStart.shootAcceptedEnemy,
    shotsRejectedEnemy:
      game.shootRejectedEnemy - counterStart.shootRejectedEnemy,
    bulletPeak: Math.max(0, game.bulletPeak - counterStart.bulletPeak),
    popcornShotsAdmitted:
      game.popcornShotsAdmitted - counterStart.popcornShotsAdmitted,
    popcornShotsRejected:
      game.popcornShotsRejected - counterStart.popcornShotsRejected,
    popcornBudgetSkippedPickups:
      game.popcornBudgetSkippedPickups -
      counterStart.popcornBudgetSkippedPickups,
    events: eventCounts,
    queueDelta: queueDelta(queueBefore, queueAfter),
    queueAtEnd: queueAfter,
  };
}

function sourceGuard() {
  return Promise.all(
    SOURCE_FILES.map(async (path) => {
      const content = await readFile(resolve(ROOT, path));
      return { path, sha256: sha256(content) };
    }),
  ).then((files) =>
    Object.freeze({
      files,
      manifestSHA256: sha256(
        files.map((file) => `${file.path}\0${file.sha256}`).join("\n"),
      ),
    }),
  );
}

function collectIntegrityFailures(
  game: Game,
  transactions: readonly RunTransaction[],
  failures: string[],
) {
  const counts = Array.from(game.enemies, (enemy) => enemy.hp);
  if (game.money < 0) failures.push("negative wallet");
  if (game.player.hp < 0) failures.push("negative HP");
  if (counts.some((hp) => !Number.isFinite(hp) || hp < 0))
    failures.push("invalid enemy HP");
  if (game.player.hp > game.player.maxHp) failures.push("HP over cap");
  for (const id of ITEM_IDS) {
    const owned = game.inventory[id] ?? 0;
    if (owned < 0 || !Number.isInteger(owned))
      failures.push(`invalid inventory count ${id}`);
    if (owned > ITEM_CAPS[id]) failures.push(`cap failure ${id}`);
  }
  if (
    transactions.some(
      (entry) =>
        !entry.cashConserved ||
        entry.cashAfter < 0 ||
        entry.cashDelta !== entry.cashAfter - entry.cashBefore ||
        (entry.accepted && !entry.legalityBefore),
    )
  )
    failures.push("transaction cash conservation failed");
  for (const key of QUEUE_KEYS) {
    const metrics = game.queueMetrics[key];
    if (
      Object.values(metrics).some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    )
      failures.push(`invalid queue counter ${key}`);
  }
}

function assertSourcePreregistrationUnchanged(
  preregistration: Awaited<ReturnType<typeof sourceGuard>>,
  final: Awaited<ReturnType<typeof sourceGuard>>,
) {
  if (final.manifestSHA256 !== preregistration.manifestSHA256)
    throw new Error("production source changed across a diagnostic batch");
  return final;
}

function emptyBoss(wave: (typeof BOSS_WAVES)[number]): BossRecord {
  return {
    wave,
    scheduledSpawnAtWaveTime: DURATIONS[wave - 1] - 18,
    everSpawned: false,
    firstObserved: null,
    engaged: false,
    engagementWindow: null,
    sampledHp: [],
    positiveHpDecreaseSamples: 0,
    observedDamage: 0,
    maxHp: 0,
    lastObservedHp: null,
    killed: false,
    survivedToTerminal: false,
    encounterClassification: "not-encountered",
  };
}

type RunOptions = {
  cohort: P3Cohort;
  seed: number;
  sourceSHA: string;
  policySHA256: string;
  driverSHA256: string;
  sourceFiles: Awaited<ReturnType<typeof sourceGuard>>["files"];
};

async function simulate(options: RunOptions): Promise<RunRecord> {
  const game = new Game(options.seed, "expedition20");
  const startingCash = game.money;
  const policy = options.cohort;
  const failures: string[] = [];
  const waves: WaveRecord[] = [];
  const rests: RestRecord[] = [];
  const acquisitions: RunRecord["acquisitions"] = [];
  const bossWindows = BOSS_WAVES.map(emptyBoss);
  const transactions: RunTransaction[] = [];
  let transactionOrder = 0;
  let runSteps = 0;
  let runCapReached = false;
  let healthStart = { hp: game.player.hp, maxHp: game.player.maxHp };
  let waveCashStart = game.money;
  let waveEarnedStart = game.earned;
  let waveCombatTime = 0;
  let waveKillsStart = game.kills;
  let waveSpawnStart = game.spawnCount;
  let wavePickedStart = game.picked;
  let waveCombatPickedStart = game.combatPicked;
  let waveSweptFuelStart = game.sweptFuelUnits;
  let waveRawCashStart = game.rawCash;
  let waveQueueStart = queueSnapshot(game);
  let waveEventStart = 0;
  let waveDamageStart = game.damageTaken;
  let waveCounterStart = {
    shootAcceptedPlayer: game.shootAcceptedPlayer,
    shootRejectedPlayer: game.shootRejectedPlayer,
    shootAcceptedEnemy: game.shootAcceptedEnemy,
    shootRejectedEnemy: game.shootRejectedEnemy,
    bulletPeak: game.bulletPeak,
    popcornShotsAdmitted: game.popcornShotsAdmitted,
    popcornShotsRejected: game.popcornShotsRejected,
    popcornBudgetSkippedPickups: game.popcornBudgetSkippedPickups,
  };
  let waveBulletPeak = 0;
  let lastBossHp = new Map<(typeof BOSS_WAVES)[number], number>();
  let zeroHpObserved = false;
  let reviveObserved = false;

  const noteBoss = (
    wave: (typeof BOSS_WAVES)[number],
    enemy: ReturnType<typeof bossSnapshot>,
    forceSample: boolean,
  ) => {
    if (!enemy) return;
    const boss = bossWindows[bossIndex(wave)]!;
    if (!boss.everSpawned) {
      boss.everSpawned = true;
      boss.firstObserved = {
        simulationTime: game.time,
        waveTime: game.waveTime,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
      };
      boss.maxHp = enemy.maxHp;
    }
    const previous = lastBossHp.get(wave);
    if (
      forceSample ||
      previous === undefined ||
      Math.abs(enemy.hp - previous) > 1e-9
    ) {
      boss.sampledHp.push({
        simulationTime: game.time,
        waveTime: game.waveTime,
        hp: enemy.hp,
      });
      boss.lastObservedHp = enemy.hp;
      if (previous !== undefined && enemy.hp < previous) {
        boss.positiveHpDecreaseSamples++;
        boss.observedDamage += previous - enemy.hp;
      }
      lastBossHp.set(wave, enemy.hp);
    }
    if (!boss.engaged) {
      boss.engaged = true;
      boss.engagementWindow = {
        firstAt: game.time,
        lastAt: game.time,
        duration: 0,
      };
    } else if (boss.engagementWindow) {
      boss.engagementWindow.lastAt = game.time;
      boss.engagementWindow.duration =
        boss.engagementWindow.lastAt - boss.engagementWindow.firstAt;
    }
    if (game.bossKilled) boss.killed = true;
  };

  const closeWave = (endReason: WaveRecord["endReason"]) => {
    const eventDelta = game.events.slice(waveEventStart);
    waves.push({
      wave: game.wave,
      duration: game.duration,
      bossWave: BOSS_WAVES.includes(game.wave as (typeof BOSS_WAVES)[number]),
      elapsedCombat: waveCombatTime,
      fixedSteps: Math.round(waveCombatTime / DT),
      endReason,
      phaseAtEnd: game.phase,
      kills: game.kills - waveKillsStart,
      bossKills: game.bossKilled ? 1 : 0,
      spawns: game.spawnCount - waveSpawnStart,
      picked: game.picked - wavePickedStart,
      combatPicked: game.combatPicked - waveCombatPickedStart,
      sweptFuelUnits: game.sweptFuelUnits - waveSweptFuelStart,
      rawCashGenerated: game.rawCash - waveRawCashStart,
      cashCollectedThisWave: game.earned - waveEarnedStart,
      cashAtWaveStart: waveCashStart,
      cashAtWaveEnd: game.money,
      earnedAtWaveStart: waveEarnedStart,
      earnedAtWaveEnd: game.earned,
      healthStart,
      healthEnd: { hp: game.player.hp, maxHp: game.player.maxHp },
      damageTaken: game.damageTaken - waveDamageStart,
      output: {
        ...waveOutput(game, eventDelta, waveQueueStart, waveCounterStart),
        bulletPeak: waveBulletPeak,
      },
      pickup: {
        total: game.picked - wavePickedStart,
        combat: game.combatPicked - waveCombatPickedStart,
        sweptFuelUnits: game.sweptFuelUnits - waveSweptFuelStart,
        firstKill: game.firstKill,
        firstPickup: game.firstPickup,
      },
    });
    waveQueueStart = queueSnapshot(game);
    waveEventStart = game.events.length;
    waveDamageStart = game.damageTaken;
    waveCounterStart = {
      shootAcceptedPlayer: game.shootAcceptedPlayer,
      shootRejectedPlayer: game.shootRejectedPlayer,
      shootAcceptedEnemy: game.shootAcceptedEnemy,
      shootRejectedEnemy: game.shootRejectedEnemy,
      bulletPeak: game.bulletPeak,
      popcornShotsAdmitted: game.popcornShotsAdmitted,
      popcornShotsRejected: game.popcornShotsRejected,
      popcornBudgetSkippedPickups: game.popcornBudgetSkippedPickups,
    };
    waveBulletPeak = 0;
  };

  const transactionSnapshot = (rest: RestRecord) => {
    for (const id of ITEM_IDS) {
      const owned = game.inventory[id] ?? 0;
      if (owned < 0) failures.push(`negative item count ${id}`);
    }
    rest.ownedItems = itemCountsTotal(cloneInventory(game));
    rest.weaponSlots = game.guns.length;
    rest.maxWeaponTier = game.guns.reduce(
      (maximum, gun) => Math.max(maximum, gun.tier ?? 1),
      1,
    );
    rest.inventory = cloneInventory(game);
    rest.stats = statsSnapshot(game);
    rest.health = { hp: game.player.hp, maxHp: game.player.maxHp };
  };

  const useRest = () => {
    if (game.phase !== "shop") return;
    const rest: RestRecord = {
      afterWave: game.wave,
      cashStart: game.money,
      cashEnd: game.money,
      spend: { coreReward: 0, stat: 0, item: 0, weapon: 0 },
      refund: 0,
      rerollSpend: 0,
      rerollCount: 0,
      coreOffers: [...game.pendingRewardChoices],
      coreClaimed: null,
      itemOffers: game.itemOffers.map((id, index) => ({
        id,
        price: game.itemOfferPrice(index),
        legal: !game.soldItems.has(index) && game.itemEligibility(id).eligible,
        affordable: game.money >= game.itemOfferPrice(index),
        usefulToCohort: isUsefulToCohort(policy, game, id),
      })),
      chestOffers: [...(game.frozenChest?.itemIds ?? [])],
      chestClaimed: null,
      statOffers: [...game.pendingStatChoices],
      statClaimed: null,
      usableItemOffers: 0,
      usableAffordableItemOffers: 0,
      ownedItems: 0,
      weaponSlots: game.guns.length,
      maxWeaponTier: 0,
      inventory: cloneInventory(game),
      stats: statsSnapshot(game),
      health: { hp: game.player.hp, maxHp: game.player.maxHp },
      transactions: [],
      cashConservationFailures: 0,
      purchaseLegalityFailures: 0,
    };
    const restTransactionStart = transactions.length;
    let spent = 0;

    const core = pickFreeCore(policy, game);
    if (core) {
      const accepted = game.claimCoreReward(core.index);
      if (accepted) {
        rest.coreClaimed = core.id;
        transactions.push({
          order: ++transactionOrder,
          restAfterWave: game.wave,
          kind: "core-reward",
          requestedIndex: core.index,
          item: core.id,
          price: 0,
          refund: 0,
          cashBefore: game.money,
          cashAfter: game.money,
          cashDelta: 0,
          cashConserved: true,
          accepted: true,
          legalityBefore: true,
        });
        acquisitions.push({
          wave: game.wave,
          source: "core",
          item: core.id,
          cash: game.money,
        });
      }
    }
    if (game.frozenChest) {
      const chest = pickChest(policy, game);
      if (chest) {
        const accepted = game.claimPendingItem(chest.index);
        if (accepted) {
          rest.chestClaimed = chest.id;
          transactions.push({
            order: ++transactionOrder,
            restAfterWave: game.wave,
            kind: "core-reward",
            requestedIndex: chest.index,
            item: chest.id,
            price: 0,
            refund: 0,
            cashBefore: game.money,
            cashAfter: game.money,
            cashDelta: 0,
            cashConserved: true,
            accepted: true,
            legalityBefore: true,
          });
          acquisitions.push({
            wave: game.wave,
            source: "chest",
            item: chest.id,
            cash: game.money,
          });
        }
      }
      if (game.frozenChest) game.skipReward();
    }

    const stat = pickStat(policy, game);
    if (stat) {
      const accepted = game.chooseStatReward(stat.index);
      if (accepted) rest.statClaimed = stat.id;
    }

    const exhaustItems = () => {
      while (true) {
        const item = itemCandidate(policy, game);
        if (!item) return;
        const before = game.money;
        const accepted = game.buyItem(item.index);
        const after = game.money;
        transactions.push({
          order: ++transactionOrder,
          restAfterWave: game.wave,
          kind: "item-purchase",
          requestedIndex: item.index,
          item: item.id,
          price: item.price,
          refund: 0,
          cashBefore: before,
          cashAfter: after,
          cashDelta: after - before,
          cashConserved:
            (accepted &&
              after >= 0 &&
              after === before - item.price &&
              game.inventory[item.id] > 0) ||
            (!accepted && before === after),
          accepted,
          legalityBefore: true,
          reason: accepted ? undefined : "public buyItem rejected",
        });
        if (!accepted) return;
        rest.spend.item += before - after;
        spent += before - after;
        acquisitions.push({
          wave: game.wave,
          source: "shop",
          item: item.id,
          cash: after,
        });
      }
    };

    const exhaustWeapons = () => {
      while (true) {
        const weapon = weaponCandidate(game);
        if (!weapon) return;
        const before = game.money;
        const accepted = game.buy(weapon.index);
        const after = game.money;
        transactions.push({
          order: ++transactionOrder,
          restAfterWave: game.wave,
          kind: "weapon-purchase",
          requestedIndex: weapon.index,
          weapon: weapon.id,
          tier: weapon.preview.incomingTier,
          merged: weapon.preview.merged,
          price: weapon.price,
          refund: 0,
          cashBefore: before,
          cashAfter: after,
          cashDelta: after - before,
          cashConserved:
            (accepted && after >= 0 && after === before - weapon.price) ||
            (!accepted && before === after),
          accepted,
          legalityBefore: true,
          reason: accepted ? undefined : "public buy rejected",
        });
        if (!accepted) return;
        rest.spend.weapon += before - after;
        spent += before - after;
      }
    };

    exhaustItems();
    exhaustWeapons();
    if (!itemCandidate(policy, game) && !weaponCandidate(game)) {
      const price = rerollPrice(game.shopRerollIndex);
      if (game.money >= price) {
        const before = game.money;
        const accepted = game.reroll();
        const after = game.money;
        rest.rerollCount = accepted ? 1 : 0;
        rest.rerollSpend = accepted ? before - after : 0;
        spent += rest.rerollSpend;
        transactions.push({
          order: ++transactionOrder,
          restAfterWave: game.wave,
          kind: "reroll",
          requestedIndex: game.shopRerollIndex,
          price: accepted ? before - after : price,
          refund: 0,
          cashBefore: before,
          cashAfter: after,
          cashDelta: after - before,
          cashConserved:
            (accepted && after === before - price) ||
            (!accepted && before === after),
          accepted,
          legalityBefore: true,
          reason: accepted ? undefined : "public reroll rejected",
        });
        if (accepted) {
          exhaustItems();
          exhaustWeapons();
        }
      }
    }

    rest.transactions = transactions.slice(restTransactionStart);
    rest.spend.coreReward = 0;
    rest.spend.stat = 0;
    rest.cashEnd = game.money;
    rest.refund = rest.transactions.reduce(
      (sum, entry) => sum + entry.refund,
      0,
    );
    rest.itemOffers = game.itemOffers.map((id, index) => ({
      id,
      price: game.itemOfferPrice(index),
      legal: !game.soldItems.has(index) && game.itemEligibility(id).eligible,
      affordable: game.money >= game.itemOfferPrice(index),
      usefulToCohort: isUsefulToCohort(policy, game, id),
    }));
    rest.usableItemOffers = rest.itemOffers.filter(
      (entry) => entry.legal && entry.usefulToCohort,
    ).length;
    rest.usableAffordableItemOffers = rest.itemOffers.filter(
      (entry) => entry.legal && entry.usefulToCohort && entry.affordable,
    ).length;
    rest.cashConservationFailures = rest.transactions.filter(
      (entry) => !entry.cashConserved,
    ).length;
    rest.purchaseLegalityFailures = rest.transactions.filter(
      (entry) =>
        entry.accepted &&
        entry.kind === "item-purchase" &&
        !entry.legalityBefore,
    ).length;
    transactionSnapshot(rest);
    if (rest.cashConservationFailures)
      failures.push(`rest ${rest.afterWave}: cash conservation`);
    if (rest.purchaseLegalityFailures)
      failures.push(`rest ${rest.afterWave}: purchase legality`);
    assert.equal(game.money, rest.cashStart - spent);
    rests.push(rest);
  };

  const openWave = (wave: number) => {
    waveCashStart = game.money;
    waveEarnedStart = game.earned;
    waveCombatTime = 0;
    waveKillsStart = game.kills;
    waveSpawnStart = game.spawnCount;
    wavePickedStart = game.picked;
    waveCombatPickedStart = game.combatPicked;
    waveSweptFuelStart = game.sweptFuelUnits;
    waveRawCashStart = game.rawCash;
    waveQueueStart = queueSnapshot(game);
    waveEventStart = game.events.length;
    waveDamageStart = game.damageTaken;
    waveCounterStart = {
      shootAcceptedPlayer: game.shootAcceptedPlayer,
      shootRejectedPlayer: game.shootRejectedPlayer,
      shootAcceptedEnemy: game.shootAcceptedEnemy,
      shootRejectedEnemy: game.shootRejectedEnemy,
      bulletPeak: game.bulletPeak,
      popcornShotsAdmitted: game.popcornShotsAdmitted,
      popcornShotsRejected: game.popcornShotsRejected,
      popcornBudgetSkippedPickups: game.popcornBudgetSkippedPickups,
    };
    waveBulletPeak = 0;
    healthStart = { hp: game.player.hp, maxHp: game.player.maxHp };
    if (BOSS_WAVES.includes(wave as (typeof BOSS_WAVES)[number])) {
      lastBossHp.delete(wave as (typeof BOSS_WAVES)[number]);
    }
  };

  openWave(1);
  while (runSteps < P3_RUN_STEP_CAP) {
    if (game.phase === "won") break;
    if (game.phase === "lost") break;
    if (game.phase === "shop") {
      useRest();
      const phaseAfterRest = game.phase as Game["phase"];
      if (phaseAfterRest === "shop") game.nextWave();
      const phaseAfterNext = game.phase as Game["phase"];
      if (phaseAfterNext === "fight") openWave(game.wave);
      continue;
    }
    if (game.phase === "quick" || game.phase === "paused") {
      failures.push(`unexpected phase ${game.phase}`);
      break;
    }
    const wave = game.wave;
    const perWaveCap = P3_PER_WAVE_STEP_CAPS[wave - 1]!;
    const waveStartSteps = runSteps;
    while (
      game.phase === "fight" ||
      game.phase === "sweep" ||
      game.phase === "interlude"
    ) {
      if (runSteps >= P3_RUN_STEP_CAP) {
        runCapReached = true;
        break;
      }
      if (runSteps - waveStartSteps >= perWaveCap) {
        failures.push(`wave ${wave}: per-wave step cap`);
        runCapReached = true;
        break;
      }
      const wasFight = game.phase === "fight";
      game.step(DT, movementInput(game));
      runSteps++;
      waveBulletPeak = Math.max(waveBulletPeak, game.bullets.length);
      const phaseAfterStep = game.phase as Game["phase"];
      if (wasFight) waveCombatTime += DT;
      if (game.player.hp < 0)
        failures.push(`wave ${wave}: negative HP after step`);
      if (game.player.hp <= 0) zeroHpObserved = true;
      if (zeroHpObserved && game.player.hp > 0) reviveObserved = true;
      if (game.money < 0) failures.push(`wave ${wave}: negative wallet`);
      if (BOSS_WAVES.includes(wave as (typeof BOSS_WAVES)[number])) {
        const shown = bossSnapshot(game, wave);
        if (shown) {
          const boss =
            bossWindows[bossIndex(wave as (typeof BOSS_WAVES)[number])]!;
          const first = !boss.everSpawned;
          noteBoss(
            wave as (typeof BOSS_WAVES)[number],
            shown,
            first || runSteps % HP_SAMPLE_STEPS === 0,
          );
        }
        const point =
          bossWindows[bossIndex(wave as (typeof BOSS_WAVES)[number])]!;
        if (game.bossKilled && point.everSpawned) point.killed = true;
      }
      if (phaseAfterStep === "lost") break;
    }
    const phaseAfterWave = game.phase as Game["phase"];
    if (phaseAfterWave === "lost") {
      closeWave("lost");
      break;
    }
    if (phaseAfterWave === "shop") {
      closeWave("sweep");
      continue;
    }
    if (phaseAfterWave === "won") {
      closeWave("terminal");
      break;
    }
    if (runCapReached) {
      closeWave("run-cap");
      break;
    }
    if (phaseAfterWave === "paused") {
      failures.push(`unexpected paused phase after wave ${wave}`);
      break;
    }
    failures.push(`unhandled phase ${game.phase} after wave ${wave}`);
    break;
  }

  for (const boss of bossWindows) {
    if (!boss.everSpawned) continue;
    const final = bossSnapshot(game, boss.wave);
    if (boss.killed) {
      boss.survivedToTerminal = false;
      boss.encounterClassification = "killed";
    } else if (final) {
      noteBoss(boss.wave, final, true);
      boss.survivedToTerminal = true;
      boss.encounterClassification =
        boss.observedDamage > 0
          ? "engaged-with-observed-damage"
          : "engaged-no-observed-damage";
    } else {
      boss.survivedToTerminal = false;
      boss.encounterClassification =
        boss.observedDamage > 0
          ? "engaged-with-observed-damage"
          : boss.everSpawned
            ? "engaged-no-observed-damage"
            : "not-encountered";
    }
  }

  if (game.phase === "won") {
    // No extra interaction is allowed after W20: the terminal phase is final.
  }
  collectIntegrityFailures(game, transactions, failures);
  if (reviveObserved) failures.push("HP revival after zero");
  const inventory = cloneInventory(game);
  const missingCore = policy.corePriorities.filter(
    (id) => (inventory[id] ?? 0) <= 0,
  );
  const output = {
    shotsAcceptedPlayer: game.shootAcceptedPlayer,
    shotsRejectedPlayer: game.shootRejectedPlayer,
    shotsAcceptedEnemy: game.shootAcceptedEnemy,
    shotsRejectedEnemy: game.shootRejectedEnemy,
    bulletPeak: game.bulletPeak,
    popcornShotsAdmitted: game.popcornShotsAdmitted,
    popcornShotsRejected: game.popcornShotsRejected,
    popcornBudgetSkippedPickups: game.popcornBudgetSkippedPickups,
    queueCounters: queueSnapshot(game),
  };
  const sourceManifest = sha256(
    options.sourceFiles
      .map((file) => `${file.path}\0${file.sha256}`)
      .join("\n"),
  );

  const terminalReason: RunRecord["terminalReason"] =
    game.phase === "won"
      ? "won"
      : game.phase === "lost"
        ? waves.at(-1)?.bossWave &&
          (waves.at(-1)?.bossKills ?? 0) === 0 &&
          (waves.at(-1)?.elapsedCombat ?? 0) >=
            (waves.at(-1)?.duration ?? 0) - 18
          ? "lost-during-boss-spawn"
          : (waves.at(-1)?.elapsedCombat ?? 0) > (waves.at(-1)?.duration ?? 0)
            ? "lost-deadline"
            : "lost-hp"
        : runCapReached
          ? "harness-run-cap"
          : "incomplete";

  const result: RunRecord = {
    cohort: policy.id,
    seed: options.seed,
    outcome: game.phase,
    terminalReason,
    ok:
      failures.length === 0 &&
      (game.phase === "won" || game.phase === "lost") &&
      !runCapReached,
    sourceSHA: options.sourceSHA,
    policySHA256: options.policySHA256,
    driverSHA256: options.driverSHA256,
    reportSourceSHA256: sourceManifest,
    finalWave: game.wave,
    finalWaveTime: game.waveTime,
    simulationTime: game.time,
    fixedSteps: runSteps,
    perWaveStepCap: P3_PER_WAVE_STEP_CAPS[game.wave - 1]!,
    runStepCap: P3_RUN_STEP_CAP,
    kills: game.kills,
    bossKills: bossWindows.filter((boss) => boss.killed).length,
    health: { hp: game.player.hp, maxHp: game.player.maxHp },
    cash: {
      start: startingCash,
      end: game.money,
      earned: game.earned,
      rawCashGenerated: game.rawCash,
      spent: transactions.reduce(
        (sum, entry) => sum + (entry.accepted ? entry.price : 0),
        0,
      ),
      refunds: transactions.reduce((sum, entry) => sum + entry.refund, 0),
      rerolls: 0,
      reserve: game.money,
    },
    inventory,
    stats: statsSnapshot(game),
    guns: game.guns.map((gun) => ({
      id: gun.id,
      tier: gun.tier ?? 1,
      paid: gun.paid ?? 0,
    })),
    acquisitions,
    missingCore,
    routeLabelEvidence:
      "Cohort labels describe preregistered acquisition policies; they do not prove a route formed or caused output.",
    actualItemDamageAttribution: ACTUAL_ITEM_ATTRIBUTION,
    output,
    bossWindows,
    rests,
    waves,
    integrity: {
      noNegativeMoney: !failures.some((entry) =>
        entry.includes("negative wallet"),
      ),
      noNegativeHp: !failures.some((entry) => entry.includes("negative HP")),
      noHpRevival: !reviveObserved,
      noOverCapItems: !failures.some((entry) => entry.includes("cap failure")),
      noIneligiblePurchases: !failures.some((entry) =>
        entry.includes("purchase legality"),
      ),
      noNegativeQueueCounters: !failures.some((entry) =>
        entry.includes("queue counter"),
      ),
      allTransactionsCashConserved: !failures.some((entry) =>
        entry.includes("cash conservation"),
      ),
      sourceGuardClean: true,
    },
    failureNotes: [...new Set(failures)],
  };
  return result;
}

type Manifest = {
  generatedAt: string;
  sourceSHA: string;
  checkpointSHA: string;
  policySHA256: string;
  driverSHA256: string;
  sourceGuard: Awaited<ReturnType<typeof sourceGuard>>;
  policy: typeof P3_POLICY;
  runs: RunRecord[];
  summary: {
    cohortSeedCount: number;
    replayEqual: boolean;
    replayRunIndex: number;
    outcomes: Record<string, number>;
    failures: number;
    terminalReasons: Record<string, number>;
    bossEncounters: Record<string, number>;
    missingCoreRuns: number;
  };
};

async function readSourceSHA() {
  const raw = process.env.SOURCE_SHA?.trim();
  return raw || "447af109d4a07d218ae33466c75bc5b1266b092c";
}

async function main() {
  assert.deepEqual(P3_POLICY.primarySeeds, [1, 42, 145]);
  assert.equal(P3_POLICY.runOrder.length, 21);
  assert.equal(P3_POLICY.cohorts.length, 7);
  assert.equal(
    P3_RUN_STEP_CAP,
    P3_PER_WAVE_STEP_CAPS.reduce((a, b) => a + b, 0),
  );
  const sourceFiles = await sourceGuard();
  const policyContent = await readFile(resolve(ROOT, "tests/p3-policy.ts"));
  const driverContent = await readFile(resolve(ROOT, "tests/p3-driver.ts"));
  const harnessContent = await readFile(resolve(ROOT, "tests/p3-measure.ts"));
  const policySHA256 = sha256(policyContent);
  const driverSHA256 = sha256(driverContent);
  const harnessSHA256 = sha256(harnessContent);
  const sourceSHA = await readSourceSHA();
  const sourceDiff = await execFileAsync(
    "git",
    ["diff", "--exit-code", "--name-only", `${sourceSHA}..HEAD`, "--", "src"],
    { cwd: ROOT },
  ).catch((error: unknown) => {
    const failure = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    if (failure.code === 1 && !failure.stdout?.trim()) {
      return { stdout: "", stderr: "" };
    }
    throw error;
  });
  if (sourceDiff.stdout.trim())
    throw new Error(`frozen source diff is non-empty:\n${sourceDiff.stdout}`);
  const sourceAtPreregistration = await sourceGuard();
  assertSourcePreregistrationUnchanged(sourceFiles, sourceAtPreregistration);

  const runs: RunRecord[] = [];
  for (const entry of P3_POLICY.runOrder) {
    const cohort = P3_COHORTS.find(
      (candidate) => candidate.id === entry.cohort,
    );
    assert(cohort, `missing cohort ${entry.cohort}`);
    const run = await simulate({
      cohort,
      seed: entry.seed,
      sourceSHA,
      policySHA256,
      driverSHA256,
      sourceFiles: sourceFiles.files,
    });
    runs.push(run);
    console.log(
      `${run.cohort}/seed-${run.seed}: ${run.outcome} W${run.finalWave} ` +
        `steps=${run.fixedSteps} kills=${run.kills} hp=${run.health.hp}/${run.health.maxHp} ` +
        `boss-encounters=${run.bossWindows.filter((boss) => boss.everSpawned).length}`,
    );
  }

  const replayOptions: RunOptions = {
    cohort: P3_COHORTS.find((cohort) => cohort.id === "weapon-only")!,
    seed: 1,
    sourceSHA,
    policySHA256,
    driverSHA256,
    sourceFiles: sourceFiles.files,
  };
  const replay = await simulate(replayOptions);
  const sourceAtEnd = assertSourcePreregistrationUnchanged(
    sourceFiles,
    await sourceGuard(),
  );
  const original = runs[0]!;
  const replayEqual =
    canonicalJson(original) === canonicalJson(replay) &&
    sha256(canonicalJson(original)) === sha256(canonicalJson(replay));
  runs.push(replay);

  const outcomes: Record<string, number> = {};
  const terminalReasons: Record<string, number> = {};
  const bossEncounters: Record<string, number> = {};
  let failures = 0;
  let missingCoreRuns = 0;
  for (const run of runs) {
    outcomes[run.outcome] = (outcomes[run.outcome] ?? 0) + 1;
    terminalReasons[run.terminalReason] =
      (terminalReasons[run.terminalReason] ?? 0) + 1;
    if (run.missingCore.length) missingCoreRuns++;
    failures += run.failureNotes.length;
    for (const boss of run.bossWindows) {
      if (!boss.everSpawned) continue;
      bossEncounters[boss.encounterClassification] =
        (bossEncounters[boss.encounterClassification] ?? 0) + 1;
    }
  }

  const report: Manifest = {
    generatedAt: new Date().toISOString(),
    sourceSHA,
    checkpointSHA: P3_POLICY.source.checkpointAtPreregistration,
    policySHA256,
    driverSHA256,
    sourceGuard: sourceAtEnd,
    policy: P3_POLICY,
    runs,
    summary: {
      cohortSeedCount: runs.length - 1,
      replayEqual,
      replayRunIndex: runs.length - 1,
      outcomes,
      failures,
      terminalReasons,
      bossEncounters,
      missingCoreRuns,
    },
  };

  const dataDir = process.env.P3_DATA_DIR
    ? resolve(process.env.P3_DATA_DIR)
    : DEFAULT_DATA;
  const artifactDir = process.env.P3_ARTIFACT_DIR
    ? resolve(process.env.P3_ARTIFACT_DIR)
    : DEFAULT_ARTIFACTS;
  await mkdir(dataDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  const reportPath = resolve(dataDir, "report.json");
  const tracePath = resolve(artifactDir, "runs.jsonl");
  await writeFile(reportPath, json(report) + "\n");
  await writeFile(
    tracePath,
    runs.map((run) => JSON.stringify(run)).join("\n") + "\n",
  );
  const reportHash = sha256(await readFile(reportPath));
  const traceHash = sha256(await readFile(tracePath));
  const provenance = {
    generatedAt: report.generatedAt,
    sourceSHA,
    checkpointSHA: report.checkpointSHA,
    policySHA256,
    driverSHA256,
    harnessSHA256,
    sourceManifestSHA256: report.sourceGuard.manifestSHA256,
    reportPath,
    reportSHA256: reportHash,
    tracePath,
    traceSHA256: traceHash,
    primaryRuns: runs.length - 1,
    replayEqual,
  };
  await writeFile(resolve(dataDir, "provenance.json"), json(provenance) + "\n");
  console.log(
    JSON.stringify(
      {
        runCount: runs.length,
        primaryRuns: runs.length - 1,
        replayEqual,
        outcomes,
        terminalReasons,
        failures,
        missingCoreRuns,
        provenance,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
