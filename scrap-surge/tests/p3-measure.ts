import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  assertSourceGuardUnchanged,
  captureSourceGuard,
  sha256,
  type P3SourceGuardManifest,
} from "./p3-source-guard";
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
const DEFAULT_OUTPUT = resolve(ROOT, "docs/data/p3-measurement-v2/generated");
const FROZEN_SOURCE = "447af109d4a07d218ae33466c75bc5b1266b092c";
const BOSS_WAVES = [5, 10, 15, 20] as const;
function bossIndex(wave: (typeof BOSS_WAVES)[number]) {
  return BOSS_WAVES.indexOf(wave);
}
const HP_SAMPLE_STEPS = P3_POLICY.bossHpSample.everySteps;
const ACTUAL_ITEM_ATTRIBUTION =
  "missing: the public read-only API exposes weapon/item projectile metadata and damage-source parameters but no per-hit source ledger";

type WeaponOfferStatus =
  | "purchased"
  | "legal-unaffordable"
  | "unaffordable-preview-rejected-no-space"
  | "preview-rejected-no-space"
  | "attempted-rejected"
  | "not-attempted";

type WeaponOfferRecord = {
  round: "initial" | "reroll";
  index: number;
  id: string;
  tier: number;
  price: number;
  affordable: boolean;
  previewAccepted: boolean;
  previewReason: "no-space" | null;
  status: WeaponOfferStatus;
  purchaseAttempted: boolean;
  purchased: boolean;
};

type WeaponPreviewEvaluation = {
  round: "initial" | "reroll";
  index: number;
  id: string;
  price: number;
  previewAccepted: boolean;
  previewReason: "no-space" | null;
  purchaseAttempted: boolean;
};

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
  offerRound?: "initial" | "reroll";
  previewAccepted?: boolean;
  previewReason?: "no-space" | null;
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
  rerollAttempts: number;
  rerollNotAttemptedReason: string | null;
  coreOffers: ItemId[];
  coreClaimed: ItemId | null;
  itemOffers: ReadonlyArray<{
    id: ItemId;
    price: number;
    legal: boolean;
    affordable: boolean;
    usefulToCohort: boolean;
  }>;
  initialWeaponOffers: WeaponOfferRecord[];
  refreshedWeaponOffers: WeaponOfferRecord[];
  weaponPreviewEvaluations: WeaponPreviewEvaluation[];
  offerAudit: {
    initialWeaponOfferCount: number;
    refreshedWeaponOfferCount: number;
    previewRejectedNoSpaceCount: number;
    purchaseAttemptCount: number;
    rejectedPurchaseCallCount: number;
    allTierTwoPlusAtRestEnd: boolean;
    allTierTwoPlusNoTierOneOffer: boolean;
  };
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
    acceptedRerolls: number;
    freeAcceptedRerolls: number;
    paidAcceptedRerolls: number;
    rejectedRerollAttempts: number;
    paidRerollSpend: number;
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
  offerAudit: {
    initialWeaponOffers: number;
    refreshedWeaponOffers: number;
    purchasedWeaponOffers: number;
    purchasedWithPreviewNoSpace: number;
    attemptedRejectedWeaponOffers: number;
    notAttemptedWeaponOffers: number;
    previewRejectedNoSpaceOffers: number;
    allTierTwoPlusAtRestEndRests: number;
    allTierTwoPlusNoTierOneOfferRests: number;
    interpretation: string;
  };
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

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function portablePath(path: string) {
  const value = relative(ROOT, path);
  return value && !value.startsWith("..") ? value.replaceAll("\\", "/") : path;
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
  sourceManifestSHA256: string;
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
      rerollAttempts: 0,
      rerollNotAttemptedReason: null,
      coreOffers: [...game.pendingRewardChoices],
      coreClaimed: null,
      itemOffers: game.itemOffers.map((id, index) => ({
        id,
        price: game.itemOfferPrice(index),
        legal: !game.soldItems.has(index) && game.itemEligibility(id).eligible,
        affordable: game.money >= game.itemOfferPrice(index),
        usefulToCohort: isUsefulToCohort(policy, game, id),
      })),
      initialWeaponOffers: [],
      refreshedWeaponOffers: [],
      weaponPreviewEvaluations: [],
      offerAudit: {
        initialWeaponOfferCount: 0,
        refreshedWeaponOfferCount: 0,
        previewRejectedNoSpaceCount: 0,
        purchaseAttemptCount: 0,
        rejectedPurchaseCallCount: 0,
        allTierTwoPlusAtRestEnd: false,
        allTierTwoPlusNoTierOneOffer: false,
      },
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
    const offerRounds: Array<{
      round: "initial" | "reroll";
      ids: readonly string[];
      tiers: readonly number[];
      prices: readonly number[];
      previews: readonly {
        accepted: boolean;
        reason: "no-space" | null;
      }[];
      initialCash: number;
    }> = [];

    const weaponRowSnapshot = (initialCash: number) => ({
      ids: [...game.offers],
      tiers: game.offers.map(
        (id) => game.guns.find((gun) => gun.id === id)?.tier ?? 1,
      ),
      prices: game.offers.map((id) => gunPrice(id, game.wave)),
      previews: game.offers.map((_, index) => {
        const preview = game.expeditionPurchasePreview(index);
        return {
          accepted: preview.accepted,
          reason: preview.reason,
        };
      }),
      initialCash,
    });
    offerRounds.push({
      round: "initial",
      ...weaponRowSnapshot(rest.cashStart),
    });

    const materializeWeaponOffers = (
      round: "initial" | "reroll",
    ): WeaponOfferRecord[] => {
      const snapshot = offerRounds.find((entry) => entry.round === round);
      if (!snapshot) return [];
      const restTransactions = transactions.slice(restTransactionStart);
      return snapshot.ids.map((id, index) => {
        const price = snapshot.prices[index]!;
        const affordable = snapshot.initialCash >= price;
        const purchaseCalls = restTransactions.filter(
          (entry) =>
            entry.kind === "weapon-purchase" &&
            entry.offerRound === round &&
            entry.requestedIndex === index,
        );
        const purchase = purchaseCalls.find((entry) => entry.accepted);
        const rejectedPurchase = purchaseCalls.find((entry) => !entry.accepted);
        const previewAccepted = snapshot.previews[index]?.accepted ?? false;
        const previewReason = snapshot.previews[index]?.reason ?? null;
        let status: WeaponOfferStatus;
        if (purchase) status = "purchased";
        else if (rejectedPurchase) status = "attempted-rejected";
        else if (previewReason === "no-space") {
          status = affordable
            ? "preview-rejected-no-space"
            : "unaffordable-preview-rejected-no-space";
        } else if (!affordable) status = "legal-unaffordable";
        else status = "not-attempted";
        return {
          round,
          index,
          id,
          tier: snapshot.tiers[index]!,
          price,
          affordable,
          previewAccepted,
          previewReason,
          status,
          purchaseAttempted: purchaseCalls.length > 0,
          purchased: purchase !== undefined,
        };
      });
    };

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

    const exhaustWeapons = (round: "initial" | "reroll") => {
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
          offerRound: round,
          previewAccepted: weapon.preview.accepted,
          previewReason: weapon.preview.reason,
        });
        if (!accepted) return;
        rest.spend.weapon += before - after;
        spent += before - after;
      }
    };

    exhaustItems();
    exhaustWeapons("initial");
    if (!itemCandidate(policy, game) && !weaponCandidate(game)) {
      const price = rerollPrice(game.shopRerollIndex);
      if (game.money >= price) {
        const before = game.money;
        const accepted = game.reroll();
        const after = game.money;
        rest.rerollAttempts = 1;
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
          offerRounds.push({
            round: "reroll",
            ...weaponRowSnapshot(after),
          });
          exhaustItems();
          exhaustWeapons("reroll");
        } else rest.rerollNotAttemptedReason = "public reroll rejected";
      } else {
        rest.rerollNotAttemptedReason =
          "actual reroll price exceeds pre-reroll cash";
      }
    } else {
      rest.rerollNotAttemptedReason =
        "useful legal affordable item or weapon remained";
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
    rest.initialWeaponOffers = materializeWeaponOffers("initial");
    rest.refreshedWeaponOffers = materializeWeaponOffers("reroll");
    rest.weaponPreviewEvaluations = [
      ...rest.initialWeaponOffers,
      ...rest.refreshedWeaponOffers,
    ].map((entry) => ({
      round: entry.round,
      index: entry.index,
      id: entry.id,
      price: entry.price,
      previewAccepted: entry.previewAccepted,
      previewReason: entry.previewReason,
      purchaseAttempted: entry.purchaseAttempted,
    }));
    rest.offerAudit = {
      initialWeaponOfferCount: rest.initialWeaponOffers.length,
      refreshedWeaponOfferCount: rest.refreshedWeaponOffers.length,
      previewRejectedNoSpaceCount: [
        ...rest.initialWeaponOffers,
        ...rest.refreshedWeaponOffers,
      ].filter((entry) => entry.previewReason === "no-space").length,
      purchaseAttemptCount: [
        ...rest.initialWeaponOffers,
        ...rest.refreshedWeaponOffers,
      ].filter((entry) => entry.purchaseAttempted).length,
      rejectedPurchaseCallCount: rest.transactions.filter(
        (entry) => entry.kind === "weapon-purchase" && !entry.accepted,
      ).length,
      allTierTwoPlusAtRestEnd:
        game.guns.length === game.slotCap &&
        game.guns.every((gun) => (gun.tier ?? 1) >= 2),
      allTierTwoPlusNoTierOneOffer:
        game.guns.length === game.slotCap &&
        game.guns.every((gun) => (gun.tier ?? 1) >= 2) &&
        ![...rest.initialWeaponOffers, ...rest.refreshedWeaponOffers].some(
          (entry) => entry.tier === 1,
        ),
    };
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
  const sourceManifest = options.sourceManifestSHA256;
  const allRerolls = transactions.filter((entry) => entry.kind === "reroll");
  const acceptedRerolls = allRerolls.filter((entry) => entry.accepted);
  const paidAcceptedRerolls = acceptedRerolls.filter(
    (entry) => entry.price > 0,
  );
  const allWeaponOffers = rests.flatMap((rest) => [
    ...rest.initialWeaponOffers,
    ...rest.refreshedWeaponOffers,
  ]);
  const offerAudit = {
    initialWeaponOffers: rests.reduce(
      (sum, rest) => sum + rest.initialWeaponOffers.length,
      0,
    ),
    refreshedWeaponOffers: rests.reduce(
      (sum, rest) => sum + rest.refreshedWeaponOffers.length,
      0,
    ),
    purchasedWeaponOffers: allWeaponOffers.filter((entry) => entry.purchased)
      .length,
    purchasedWithPreviewNoSpace: allWeaponOffers.filter(
      (entry) => entry.purchased && entry.previewReason === "no-space",
    ).length,
    attemptedRejectedWeaponOffers: allWeaponOffers.filter(
      (entry) => entry.status === "attempted-rejected",
    ).length,
    notAttemptedWeaponOffers: allWeaponOffers.filter(
      (entry) =>
        entry.status === "not-attempted" ||
        entry.status === "legal-unaffordable",
    ).length,
    previewRejectedNoSpaceOffers: allWeaponOffers.filter(
      (entry) => entry.previewReason === "no-space",
    ).length,
    allTierTwoPlusAtRestEndRests: rests.filter(
      (rest) => rest.offerAudit.allTierTwoPlusAtRestEnd,
    ).length,
    allTierTwoPlusNoTierOneOfferRests: rests.filter(
      (rest) => rest.offerAudit.allTierTwoPlusNoTierOneOffer,
    ).length,
    interpretation:
      "Offer rows, prices and public preview results are observed at row creation. With six occupied slots and every weapon at Tier II or higher, no Tier-I offer can merge and there is no empty slot; only a same-ID/same-tier fusion can free a slot. Rows without any Tier-I offer cannot supply a missing partner regardless of cash or future shop luck. This does not prove wallet scarcity or a failed DPS check.",
  };

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
      acceptedRerolls: acceptedRerolls.length,
      freeAcceptedRerolls: acceptedRerolls.filter((entry) => entry.price === 0)
        .length,
      paidAcceptedRerolls: paidAcceptedRerolls.length,
      rejectedRerollAttempts: allRerolls.filter((entry) => !entry.accepted)
        .length,
      paidRerollSpend: paidAcceptedRerolls.reduce(
        (sum, entry) => sum + entry.price,
        0,
      ),
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
    offerAudit,
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
  schema: "p3a-measurement-v2";
  generatedAt: string;
  sourceSHA: string;
  checkpointSHA: string;
  policySHA256: string;
  driverSHA256: string;
  sourceGuard: P3SourceGuardManifest;
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
  return raw || FROZEN_SOURCE;
}

async function main() {
  assert.deepEqual(P3_POLICY.primarySeeds, [1, 42, 145]);
  assert.equal(P3_POLICY.runOrder.length, 21);
  assert.equal(P3_POLICY.cohorts.length, 7);
  assert.equal(
    P3_RUN_STEP_CAP,
    P3_PER_WAVE_STEP_CAPS.reduce((a, b) => a + b, 0),
  );
  const sourceFiles = await captureSourceGuard(ROOT, FROZEN_SOURCE);
  const policyContent = await readFile(resolve(ROOT, "tests/p3-policy.ts"));
  const driverContent = await readFile(resolve(ROOT, "tests/p3-driver.ts"));
  const harnessContent = await readFile(resolve(ROOT, "tests/p3-measure.ts"));
  const policySHA256 = sha256(policyContent);
  const driverSHA256 = sha256(driverContent);
  const harnessSHA256 = sha256(harnessContent);
  const sourceSHA = await readSourceSHA();
  if (sourceSHA !== FROZEN_SOURCE)
    throw new Error(
      `SOURCE_SHA must identify the frozen source ${FROZEN_SOURCE}, got ${sourceSHA}`,
    );
  const sourceAtPreregistration = await captureSourceGuard(ROOT, FROZEN_SOURCE);
  assertSourceGuardUnchanged(sourceFiles, sourceAtPreregistration);

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
      sourceManifestSHA256: sourceFiles.contentManifestSHA256,
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
    sourceManifestSHA256: sourceFiles.contentManifestSHA256,
  };
  const replay = await simulate(replayOptions);
  const sourceAtEnd = assertSourceGuardUnchanged(
    sourceFiles,
    await captureSourceGuard(ROOT, FROZEN_SOURCE),
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
    schema: "p3a-measurement-v2",
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
    : resolve(DEFAULT_OUTPUT, "data");
  const artifactDir = process.env.P3_ARTIFACT_DIR
    ? resolve(process.env.P3_ARTIFACT_DIR)
    : resolve(DEFAULT_OUTPUT, "artifacts");
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
    reportPath: portablePath(reportPath),
    reportSHA256: reportHash,
    tracePath: portablePath(tracePath),
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
