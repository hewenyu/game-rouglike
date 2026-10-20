import type { WeaponId } from "../src/data";
import { DURATIONS, isBossWave } from "../src/expedition";
import type { ItemId, StatRewardId } from "../src/items";

export type P3CohortId =
  | "weapon-only"
  | "scattered"
  | "speed"
  | "chain"
  | "hp-contact"
  | "item-amplified-firepower"
  | "pickup-feedback";

export type P3ItemSelection = "none" | "first-legal" | "priority";

export type P3ItemPriority = Readonly<{
  id: ItemId;
  cohortCap: number;
}>;

export type P3Cohort = Readonly<{
  id: P3CohortId;
  label: string;
  hypothesis: string;
  itemSelection: P3ItemSelection;
  itemPriorities: readonly P3ItemPriority[];
  corePriorities: readonly ItemId[];
}>;

const priority = (
  entries: readonly (readonly [ItemId, number])[],
): readonly P3ItemPriority[] =>
  entries.map(([id, cohortCap]) => ({ id, cohortCap }));

export const P3_COHORTS: readonly P3Cohort[] = [
  {
    id: "weapon-only",
    label: "weapon only",
    hypothesis:
      "Control: weapons and shared stat picks only; decline all items.",
    itemSelection: "none",
    itemPriorities: [],
    corePriorities: [],
  },
  {
    id: "scattered",
    label: "uncurated legal items",
    hypothesis:
      "Control: take the first legal item or chest choice without coordination.",
    itemSelection: "first-legal",
    itemPriorities: [],
    corePriorities: [],
  },
  {
    id: "speed",
    label: "speed",
    hypothesis:
      "Hypothesis only: movement speed and moving attack-speed convert into late output.",
    itemSelection: "priority",
    itemPriorities: priority([
      ["worn-sandals", 3],
      ["surfboard", 2],
      ["tailwind-coil", 2],
      ["milestone", 1],
    ]),
    corePriorities: ["milestone"],
  },
  {
    id: "chain",
    label: "chain",
    hypothesis:
      "Hypothesis only: real-death explosions and root-local amplification form a chain route.",
    itemSelection: "priority",
    itemPriorities: priority([
      ["volatile-trash", 1],
      ["wedge-ring", 3],
      ["big-bang", 1],
      ["short-fuse", 2],
    ]),
    corePriorities: ["volatile-trash"],
  },
  {
    id: "hp-contact",
    label: "HP/contact",
    hypothesis:
      "Hypothesis only: health, contact procs and pressure convert incoming contact into output.",
    itemSelection: "priority",
    itemPriorities: priority([
      ["thick-shell", 3],
      ["undertow-board", 3],
      ["spike-shell", 2],
      ["pressure-valve", 1],
    ]),
    corePriorities: [],
  },
  {
    id: "item-amplified-firepower",
    label: "item-amplified firepower",
    hypothesis:
      "Hypothesis only: weapon modifiers and own proc power become the primary output.",
    itemSelection: "priority",
    itemPriorities: priority([
      ["scrap-powder", 5],
      ["long-barrel", 3],
      ["bent-nail", 2],
      ["twin-trigger", 2],
    ]),
    corePriorities: ["twin-trigger"],
  },
  {
    id: "pickup-feedback",
    label: "pickup feedback",
    hypothesis:
      "Hypothesis only: fuel, pickup bullets and pickup radius close a kill-to-output loop.",
    itemSelection: "priority",
    itemPriorities: priority([
      ["magnetic-return", 1],
      ["scrap-popcorn", 1],
      ["hooked-tip", 2],
      ["siphon-bag", 2],
    ]),
    corePriorities: ["magnetic-return", "scrap-popcorn"],
  },
] as const;

export const P3_PRIMARY_SEEDS = [1, 42, 145] as const;

export const P3_SHARED_WEAPON_PREFERENCE: readonly WeaponId[] = [
  "slinger",
  "shotgun",
  "coil",
  "rocket",
  "saw",
  "fist",
] as const;

export const P3_SHARED_STAT_PRIORITY: readonly StatRewardId[] = [
  "hpFlat",
  "damage",
  "power",
  "as",
  "move",
  "pickup",
] as const;

export const P3_PER_WAVE_STEP_CAPS: readonly number[] = DURATIONS.map(
  (duration, index) => {
    const wave = index + 1;
    const bossWindow = isBossWave(wave) ? 15 : 0;
    const oneSecondSweep = 1;
    const oneSecondHarnessMargin = 1;
    return (
      (duration + bossWindow + oneSecondSweep + oneSecondHarnessMargin) * 60
    );
  },
);

export const P3_RUN_STEP_CAP = P3_PER_WAVE_STEP_CAPS.reduce(
  (sum, cap) => sum + cap,
  0,
);

export const P3_POLICY = {
  version: "P3A-1",
  status:
    "Preregistered finite diagnostic; hypotheses are not pass conditions or route-proof labels.",
  source: {
    frozenProductionSource: "447af109d4a07d218ae33466c75bc5b1266b092c",
    checkpointAtPreregistration: "6ba784466e9a3f814a8fb4700438c44f3825d633",
    sourceDiffMustBeEmpty:
      "git diff 447af109d4a07d218ae33466c75bc5b1266b092c..HEAD -- scrap-surge/src",
  },
  mode: "expedition20",
  fixedTimestep: 1 / 60,
  bossHpSample: {
    everySteps: 6,
    simulatedSeconds: 0.1,
    firstSpawnAlwaysSampled: true,
    disappearanceAlwaysSampled: true,
  },
  primarySeeds: P3_PRIMARY_SEEDS,
  cohorts: P3_COHORTS,
  runOrder: P3_COHORTS.flatMap((cohort) =>
    P3_PRIMARY_SEEDS.map((seed) => ({ cohort: cohort.id, seed })),
  ),
  driver: {
    id: "shared-orbit-threat-pickup-v1",
    sameForEveryPrimaryCohort: true,
    readsOnly: ["time", "player", "enemies", "bullets", "scraps", "chests"],
    writes: "none; returns a normalized public step input vector",
  },
  itemPolicy: {
    nativeItemCapsAlwaysApply: true,
    scattered:
      "Uncurated means choose the first legal offered array entry; it is not a guarantee of zero synergy.",
    priority:
      "Choose the first eligible, affordable offered item on the cohort list whose owned count is below both its native cap and cohort cap.",
    noMatch:
      "For priority cohorts, decline or skip rather than taking an off-route item.",
    weaponOnly:
      "Decline core rewards, chest choices and paid items; use the shared stat policy.",
    dependencyAndSlotRules:
      "All legality, dependency, uniqueness and price rules remain game-owned.",
  },
  sharedWeaponPreference: P3_SHARED_WEAPON_PREFERENCE,
  weaponSelection: {
    rule: "Among accepted, affordable offers, prefer an unowned type by shared rank; if all offered types are owned, prefer the lowest current tier by shared rank.",
    purchasesPerRest:
      "Keep buying the highest-ranked legal affordable weapon until the current row has no legal affordable offer.",
  },
  sharedStatPriority: P3_SHARED_STAT_PRIORITY,
  rewardPolicy: {
    order: ["free core or frozen chest", "one stat pick", "one item purchase"],
    coreAndChest:
      "Priority cohorts take the first matching legal option; scattered takes the first legal array entry; weapon-only declines.",
    noSubstitution: true,
  },
  reserveAndSpend: {
    reserveCash: 0,
    order: [
      "free reward",
      "stat",
      "useful affordable item offers",
      "useful affordable weapon offers",
    ],
    itemPurchasesPerRest:
      "Exhaust all useful legal affordable offers; no artificial one-item cap.",
    weaponPurchasesPerRest:
      "Exhaust all legal affordable offers, including fusion helpers; no artificial one-weapon cap.",
    sells: 0,
  },
  rerolls: {
    maxPerRest: 1,
    timing:
      "After exhausting the initial rows, reroll once only if no useful legal affordable item remains and the current actual reroll price is affordable.",
    afterReroll:
      "Exhaust useful legal affordable items and weapons in the new rows; do not reroll again at this rest.",
    stoppingRule:
      "Skip the one reroll if any useful legal affordable item remains, if game reroll validation rejects the attempt, or if its actual price exceeds cash.",
  },
  stepCaps: {
    perWave: P3_PER_WAVE_STEP_CAPS,
    run: P3_RUN_STEP_CAP,
    timeoutMeaning:
      "Harness-only finite guard. It is never written into Game time, HP, deadline or RNG.",
  },
  forbidden: [
    "HP injection",
    "clock or time jumping",
    "RNG injection or replacement",
    "inventory injection",
    "wallet injection",
    "enemy injection",
    "browser or user-play claim",
    "posthoc controller search",
    "source patch when an action API is missing",
  ],
  attribution: {
    directItemDamage:
      "Missing from the current public observation API; win/loss alone must not be called item-led damage attribution.",
    bossDamage:
      "Only sampled positive boss-HP decreases are observable; no per-source attribution is claimed.",
  },
  determinismReplay: {
    cohort: "weapon-only",
    seed: 1,
    compare:
      "canonical JSON hash of the complete run record and per-wave records",
  },
  finiteOutcome:
    "Run exactly 21 primary simulations in runOrder, then one replay; no tuning iteration.",
} as const;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}
