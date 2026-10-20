import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "./p3-policy";
import { sha256 } from "./p3-source-guard";

type Json = Record<string, any>;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_GENERATED = resolve(
  ROOT,
  "docs/data/p3-measurement-v2/generated",
);
const DEFAULT_DATA = resolve(ROOT, "docs/data/p3-measurement-v2");
const ORIGINAL_GZIP = resolve(DEFAULT_DATA, "artifacts/runs-447af10.jsonl.gz");
const ORIGINAL_RAW_SHA256 =
  "6df30a864a262b0e858c2d826b18600d22df59eaa03feff90d41d819519f8bc2";
const ORIGINAL_HARNESS_SHA256 =
  "11456c85c3f0b7f50a47951c6c0214fbaaa218ab43b63bcb466d4a0208b1635d";

function round(value: number, digits = 6) {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function roundDeep(value: unknown): unknown {
  if (typeof value === "number") return round(value);
  if (Array.isArray(value)) return value.map(roundDeep);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Json).map(([key, entry]) => [
        key,
        roundDeep(entry),
      ]),
    );
  return value;
}

function parseJsonl(raw: Buffer) {
  return raw
    .toString("utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Json);
}

function terminalOutcome(run: Json) {
  if (run.outcome === "won") return "won";
  const final = run.waves.at(-1) as Json | undefined;
  if (!final) return "incomplete";
  if (final.endReason === "run-cap") return "harness-step-cap";
  const deadline = final.duration + (final.bossWave ? 15 : 0);
  if (
    final.bossWave &&
    final.bossKills === 0 &&
    run.health.hp > 0 &&
    run.finalWaveTime >= deadline
  )
    return "lost-deadline";
  if (run.health.hp > 0) return "lost-positive-hp-before-deadline";
  const boss =
    final.bossWave &&
    run.bossWindows.find((entry: Json) => entry.wave === run.finalWave);
  if (boss?.everSpawned) {
    if (boss.killed) return "lost-hp-after-boss-kill";
    if (boss.observedDamage <= 0) return "lost-hp-before-boss-damage";
    return "lost-hp-during-boss-engagement";
  }
  if (final.bossWave && final.elapsedCombat >= final.duration - 18)
    return "lost-hp-before-boss-spawn-engaged";
  return "lost-hp";
}

function bossSummary(boss: Json) {
  const samples = boss.sampledHp as Json[];
  return {
    wave: boss.wave,
    scheduledSpawnAtWaveTime: boss.scheduledSpawnAtWaveTime,
    everSpawned: boss.everSpawned,
    firstObserved: boss.firstObserved,
    observedWindow:
      samples.length > 0
        ? {
            firstAt: samples[0]!.simulationTime,
            lastAt: samples.at(-1)!.simulationTime,
            duration:
              samples.at(-1)!.simulationTime - samples[0]!.simulationTime,
          }
        : null,
    sampledHpCount: samples.length,
    positiveHpDecreaseSamples: boss.positiveHpDecreaseSamples,
    sampledDamageLowerBound: boss.observedDamage,
    sampledDamageLowerBoundMeaning:
      "Sum of positive decreases between sampled live boss HP observations; actual cumulative damage and per-source attribution are not observable.",
    lastLiveObservedHp: boss.lastObservedHp,
    actualBossKilledFlag: boss.killed,
    maxHp: boss.maxHp,
    survivedToTerminal: boss.survivedToTerminal,
    encounterClassification: boss.encounterClassification,
  };
}

function offerSummary(offer: Json) {
  return {
    round: offer.round,
    index: offer.index,
    id: offer.id,
    tier: offer.tier,
    price: offer.price,
    affordable: offer.affordable,
    previewAccepted: offer.previewAccepted,
    previewReason: offer.previewReason,
    status: offer.status,
    purchaseAttempted: offer.purchaseAttempted,
    purchased: offer.purchased,
  };
}

function compactRun(run: Json) {
  return {
    cohort: run.cohort,
    seed: run.seed,
    outcome: run.outcome,
    traceTerminalReason: run.terminalReason,
    terminalOutcome: terminalOutcome(run),
    finalWave: run.finalWave,
    finalWaveTime: run.finalWaveTime,
    kills: run.kills,
    bossKills: run.bossKills,
    health: run.health,
    cash: run.cash,
    missingCore: run.missingCore,
    acquisitions: run.acquisitions,
    inventory: run.inventory,
    stats: run.stats,
    guns: run.guns,
    actualItemDamageAttribution: run.actualItemDamageAttribution,
    routeLabelEvidence: run.routeLabelEvidence,
    offerAudit: run.offerAudit,
    bossWindows: run.bossWindows.map(bossSummary),
    waves: run.waves.map((wave: Json) => ({
      wave: wave.wave,
      duration: wave.duration,
      bossWave: wave.bossWave,
      elapsedCombat: wave.elapsedCombat,
      endReason: wave.endReason,
      kills: wave.kills,
      bossKills: wave.bossKills,
      spawns: wave.spawns,
      picked: wave.picked,
      combatPicked: wave.combatPicked,
      rawCashGenerated: wave.rawCashGenerated,
      cashCollectedThisWave: wave.cashCollectedThisWave,
      cashAtWaveStart: wave.cashAtWaveStart,
      cashAtWaveEnd: wave.cashAtWaveEnd,
      healthStart: wave.healthStart,
      healthEnd: wave.healthEnd,
      damageTaken: wave.damageTaken,
      output: {
        shotsAcceptedPlayer: wave.output.shotsAcceptedPlayer,
        shotsRejectedPlayer: wave.output.shotsRejectedPlayer,
        shotsAcceptedEnemy: wave.output.shotsAcceptedEnemy,
        shotsRejectedEnemy: wave.output.shotsRejectedEnemy,
        bulletPeak: wave.output.bulletPeak,
        popcornShotsAdmitted: wave.output.popcornShotsAdmitted,
        popcornShotsRejected: wave.output.popcornShotsRejected,
        popcornBudgetSkippedPickups: wave.output.popcornBudgetSkippedPickups,
        queueDelta: wave.output.queueDelta,
        queueAtEnd: wave.output.queueAtEnd,
      },
    })),
    rests: run.rests.map((rest: Json) => ({
      afterWave: rest.afterWave,
      cashStart: rest.cashStart,
      cashEnd: rest.cashEnd,
      spend: rest.spend,
      refund: rest.refund,
      reroll: {
        attempts: rest.rerollAttempts,
        accepted: rest.rerollCount,
        spend: rest.rerollSpend,
        notAttemptedReason: rest.rerollNotAttemptedReason,
      },
      initialWeaponOffers: rest.initialWeaponOffers.map(offerSummary),
      refreshedWeaponOffers: rest.refreshedWeaponOffers.map(offerSummary),
      offerAudit: rest.offerAudit,
      coreOffers: rest.coreOffers,
      coreClaimed: rest.coreClaimed,
      chestOffers: rest.chestOffers,
      chestClaimed: rest.chestClaimed,
      statOffers: rest.statOffers,
      statClaimed: rest.statClaimed,
      usableItemOffers: rest.usableItemOffers,
      usableAffordableItemOffers: rest.usableAffordableItemOffers,
      ownedItems: rest.ownedItems,
      weaponSlots: rest.weaponSlots,
      maxWeaponTier: rest.maxWeaponTier,
      inventory: rest.inventory,
      stats: rest.stats,
      health: rest.health,
      transactions: rest.transactions.map((transaction: Json) => ({
        order: transaction.order,
        kind: transaction.kind,
        requestedIndex: transaction.requestedIndex,
        item: transaction.item,
        weapon: transaction.weapon,
        tier: transaction.tier,
        merged: transaction.merged,
        price: transaction.price,
        cashBefore: transaction.cashBefore,
        cashAfter: transaction.cashAfter,
        cashDelta: transaction.cashDelta,
        accepted: transaction.accepted,
        cashConserved: transaction.cashConserved,
        offerRound: transaction.offerRound,
        previewAccepted: transaction.previewAccepted,
        previewReason: transaction.previewReason,
      })),
      cashConservationFailures: rest.cashConservationFailures,
      purchaseLegalityFailures: rest.purchaseLegalityFailures,
    })),
  };
}

function cohortSummaries(runs: Json[]) {
  const cohorts = [...new Set(runs.map((run) => run.cohort))];
  return Object.fromEntries(
    cohorts.map((cohort) => {
      const selected = runs.filter((run) => run.cohort === cohort);
      const sum = (pick: (run: Json) => number) =>
        selected.reduce((total, run) => total + pick(run), 0);
      return [
        cohort,
        {
          runs: selected.length,
          wins: selected.filter((run) => run.outcome === "won").length,
          outcomes: Object.fromEntries(
            [...new Set(selected.map(terminalOutcome))].map((outcome) => [
              outcome,
              selected.filter((run) => terminalOutcome(run) === outcome).length,
            ]),
          ),
          reachedWaves: selected.map((run) => run.finalWave),
          averageItems: round(
            sum((run) =>
              Object.values(run.inventory as Record<string, number>).reduce(
                (total, count) => total + count,
                0,
              ),
            ) / selected.length,
          ),
          averageEndCash: round(sum((run) => run.cash.end) / selected.length),
          averageEarned: round(sum((run) => run.cash.earned) / selected.length),
          averageSpent: round(sum((run) => run.cash.spent) / selected.length),
          acceptedRerolls: sum((run) => run.cash.acceptedRerolls),
          freeAcceptedRerolls: sum((run) => run.cash.freeAcceptedRerolls),
          paidAcceptedRerolls: sum((run) => run.cash.paidAcceptedRerolls),
          rejectedRerollAttempts: sum((run) => run.cash.rejectedRerollAttempts),
          paidRerollSpend: sum((run) => run.cash.paidRerollSpend),
          removedFromReroll: sum((run) => run.cash.spent),
          bossEncounters: selected.reduce(
            (total, run) =>
              total +
              run.bossWindows.filter((boss: Json) => boss.everSpawned).length,
            0,
          ),
          sampledBossDamageLowerBound: round(
            sum((run) =>
              run.bossWindows.reduce(
                (total: number, boss: Json) => total + boss.observedDamage,
                0,
              ),
            ),
          ),
        },
      ];
    }),
  );
}

function evidenceEqual(original: Json[], observed: Json[]) {
  const ignored = new Set([
    "acceptedRerolls",
    "freeAcceptedRerolls",
    "paidAcceptedRerolls",
    "rejectedRerollAttempts",
    "paidRerollSpend",
    "offerAudit",
    "initialWeaponOffers",
    "refreshedWeaponOffers",
    "weaponPreviewEvaluations",
    "rerollAttempts",
    "rerollNotAttemptedReason",
    "offerRound",
    "previewAccepted",
    "previewReason",
  ]);
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value as Json)
          .filter(([key]) => !ignored.has(key))
          .map(([key, entry]) => [key, strip(entry)]),
      );
    return value;
  };
  assert.equal(observed.length, original.length);
  for (let index = 0; index < original.length; index++) {
    assert.equal(
      canonicalJson(strip(original[index])),
      canonicalJson(strip(observed[index])),
      `${original[index]!.cohort}/seed-${original[index]!.seed} changed`,
    );
  }
  return {
    comparedRecords: original.length,
    ignoredObservationFields: [...ignored].sort(),
  };
}

function assertOfferTransactions(runs: Json[]) {
  let purchasedOffers = 0;
  let acceptedWeaponTransactions = 0;
  for (const run of runs) {
    for (const rest of run.rests as Json[]) {
      const offers = [
        ...(rest.initialWeaponOffers as Json[]),
        ...(rest.refreshedWeaponOffers as Json[]),
      ];
      const transactions = (rest.transactions as Json[]).filter(
        (transaction) => transaction.kind === "weapon-purchase",
      );
      for (const offer of offers) {
        const calls = transactions.filter(
          (transaction) =>
            transaction.offerRound === offer.round &&
            transaction.requestedIndex === offer.index,
        );
        const accepted = calls.filter((transaction) => transaction.accepted);
        assert.ok(
          accepted.length <= 1,
          `${run.cohort}/seed-${run.seed}/W${rest.afterWave}: offer ${offer.round}:${offer.index} has multiple accepted purchases`,
        );
        assert.equal(
          offer.purchaseAttempted,
          calls.length > 0,
          `${run.cohort}/seed-${run.seed}/W${rest.afterWave}: offer ${offer.round}:${offer.index} attempt mismatch`,
        );
        assert.equal(
          offer.purchased,
          accepted.length === 1,
          `${run.cohort}/seed-${run.seed}/W${rest.afterWave}: offer ${offer.round}:${offer.index} purchase mismatch`,
        );
        if (offer.purchased) purchasedOffers++;
      }
      for (const transaction of transactions) {
        if (!transaction.accepted) continue;
        acceptedWeaponTransactions++;
        assert.ok(
          offers.some(
            (offer) =>
              offer.round === transaction.offerRound &&
              offer.index === transaction.requestedIndex &&
              offer.purchased,
          ),
          `${run.cohort}/seed-${run.seed}/W${rest.afterWave}: accepted transaction has no purchased offer`,
        );
      }
    }
  }
  assert.equal(purchasedOffers, acceptedWeaponTransactions);
  return {
    purchasedOffers,
    acceptedWeaponTransactions,
    mismatches: 0,
  };
}

async function main() {
  const originalCompressed = await readFile(
    process.env.P3_ORIGINAL_TRACE_GZIP ?? ORIGINAL_GZIP,
  );
  const originalRaw = gunzipSync(originalCompressed);
  const originalSHA256 = sha256(originalRaw);
  if (originalSHA256 !== ORIGINAL_RAW_SHA256)
    throw new Error(`original raw trace hash mismatch: ${originalSHA256}`);

  const generatedRoot = process.env.P3_GENERATED_DIR ?? DEFAULT_GENERATED;
  const tracePath = resolve(generatedRoot, "artifacts/runs.jsonl");
  const reportInputPath = resolve(generatedRoot, "data/report.json");
  const generatedProvenancePath = resolve(
    generatedRoot,
    "data/provenance.json",
  );
  const outputData = process.env.P3_REPORT_DATA_DIR
    ? resolve(process.env.P3_REPORT_DATA_DIR)
    : DEFAULT_DATA;
  const reportPath = resolve(outputData, "report.json");
  const markdownPath = resolve(outputData, "report.md");
  const provenancePath = resolve(outputData, "provenance.json");
  await mkdir(outputData, { recursive: true });

  const rawTrace = await readFile(tracePath);
  const trackTraceSHA256 = sha256(rawTrace);
  const detailedRuns = parseJsonl(rawTrace);
  if (detailedRuns.length !== 22)
    throw new Error(
      `expected 21 primary runs plus replay, got ${detailedRuns.length}`,
    );
  const primary = detailedRuns.slice(0, 21);
  const replay = detailedRuns[21]!;
  const replayEqual =
    canonicalJson(primary[0]) === canonicalJson(replay) &&
    sha256(canonicalJson(primary[0])) === sha256(canonicalJson(replay));
  if (!replayEqual) throw new Error("deterministic replay differs");

  const generatedProvenance = JSON.parse(
    await readFile(generatedProvenancePath, "utf8"),
  ) as Json;
  if (generatedProvenance.traceSHA256 !== trackTraceSHA256)
    throw new Error("generated trace hash does not match provenance");
  if (
    generatedProvenance.sourceSHA !== "447af109d4a07d218ae33466c75bc5b1266b092c"
  )
    throw new Error("generated trace did not use the frozen source");

  const originalRuns = parseJsonl(originalRaw);
  const compatibility = evidenceEqual(originalRuns, detailedRuns);
  const offerConsistency = assertOfferTransactions(primary);
  const harnessSHA256 = sha256(
    await readFile(resolve(ROOT, "tests/p3-measure.ts")),
  );

  const compactRuns = primary.map(compactRun);
  const rerollTotals = primary.reduce(
    (total, run) => ({
      attempts:
        total.attempts +
        run.cash.acceptedRerolls +
        run.cash.rejectedRerollAttempts,
      accepted: total.accepted + run.cash.acceptedRerolls,
      freeAccepted: total.freeAccepted + run.cash.freeAcceptedRerolls,
      paidAccepted: total.paidAccepted + run.cash.paidAcceptedRerolls,
      rejected: total.rejected + run.cash.rejectedRerollAttempts,
      paidSpend: total.paidSpend + run.cash.paidRerollSpend,
    }),
    {
      attempts: 0,
      accepted: 0,
      freeAccepted: 0,
      paidAccepted: 0,
      rejected: 0,
      paidSpend: 0,
    },
  );
  const offers = primary.flatMap((run) =>
    run.rests.flatMap((rest: Json) => [
      ...rest.initialWeaponOffers,
      ...rest.refreshedWeaponOffers,
    ]),
  );
  const offerTotals = {
    initial: offers.filter((offer: Json) => offer.round === "initial").length,
    refreshed: offers.filter((offer: Json) => offer.round === "reroll").length,
    purchased: offers.filter((offer: Json) => offer.purchased).length,
    attemptedRejected: offers.filter(
      (offer: Json) => offer.status === "attempted-rejected",
    ).length,
    notAttempted: offers.filter(
      (offer: Json) =>
        offer.status === "not-attempted" ||
        offer.status === "legal-unaffordable",
    ).length,
    previewRejectedNoSpace: offers.filter(
      (offer: Json) => offer.previewReason === "no-space",
    ).length,
    allTierTwoPlusAtRestEndRests: primary.reduce(
      (total, run) =>
        total +
        run.rests.filter(
          (rest: Json) => rest.offerAudit.allTierTwoPlusAtRestEnd,
        ).length,
      0,
    ),
    allTierTwoPlusNoTierOneOfferRests: primary.reduce(
      (total, run) =>
        total +
        run.rests.filter(
          (rest: Json) => rest.offerAudit.allTierTwoPlusNoTierOneOffer,
        ).length,
      0,
    ),
    tierOneOffersAtAllTierTwoPlusRests: primary.reduce(
      (total, run) =>
        total +
        run.rests
          .filter((rest: Json) => rest.offerAudit.allTierTwoPlusAtRestEnd)
          .flatMap((rest: Json) => [
            ...rest.initialWeaponOffers,
            ...rest.refreshedWeaponOffers,
          ])
          .filter((offer: Json) => offer.tier === 1).length,
      0,
    ),
    purchasedTierOneOffersAtAllTierTwoPlusRests: primary.reduce(
      (total, run) =>
        total +
        run.rests
          .filter((rest: Json) => rest.offerAudit.allTierTwoPlusAtRestEnd)
          .flatMap((rest: Json) => [
            ...rest.initialWeaponOffers,
            ...rest.refreshedWeaponOffers,
          ])
          .filter((offer: Json) => offer.tier === 1 && offer.purchased).length,
      0,
    ),
  };

  const report = {
    schema: "p3a-measurement-v2-report",
    sourceSHA: generatedProvenance.sourceSHA,
    checkpointSHA: generatedProvenance.checkpointSHA,
    policySHA256: generatedProvenance.policySHA256,
    driverSHA256: generatedProvenance.driverSHA256,
    harnessSHA256: generatedProvenance.harnessSHA256,
    sourceManifestSHA256: generatedProvenance.sourceManifestSHA256,
    oldHarnessSHA256: ORIGINAL_HARNESS_SHA256,
    oldTraceSHA256: ORIGINAL_RAW_SHA256,
    replayEqual,
    trace: {
      sha256: trackTraceSHA256,
      detailedRuns: detailedRuns.length,
    },
    compatibility,
    offerConsistency,
    rerollTotals,
    offerTotals,
    summary: {
      primaryRuns: primary.length,
      outcomes: {
        won: primary.filter((run) => run.outcome === "won").length,
        lost: primary.filter((run) => run.outcome === "lost").length,
      },
      terminalOutcomes: Object.fromEntries(
        [...new Set(primary.map(terminalOutcome))].map((outcome) => [
          outcome,
          primary.filter((run) => terminalOutcome(run) === outcome).length,
        ]),
      ),
      harnessFailures: primary.reduce(
        (total, run) => total + run.failureNotes.length,
        0,
      ),
      missingCoreRuns: primary.filter((run) => run.missingCore.length).length,
      cohorts: cohortSummaries(primary),
    },
    limitations: [
      "Fixed three-seed diagnostic samples are not win-rate estimates.",
      "Cohort labels describe preregistered acquisition policies, not proof that a route formed or caused output.",
      "No public per-hit damage-source ledger exists; item-led actual damage attribution is missing.",
      "This is simulation evidence, not browser play, human victory, performance or user acceptance.",
      "Boss damage is a sampled lower bound between live-HP observations; actual cumulative damage and source attribution are not observable.",
      "The production source guard covers exact file list, bytes and clean src status; it is not a Git worktree-wide cleanliness check.",
    ],
    runs: compactRuns,
  };
  const compact = roundDeep(report) as Json;
  const reportText = `${JSON.stringify(compact, null, 2)}\n`;
  await writeFile(reportPath, reportText);
  const reportSHA256 = sha256(reportText);

  const provenance = JSON.parse(
    await readFile(provenancePath, "utf8").catch(() => "{}"),
  ) as Json;
  const updatedProvenance = {
    ...provenance,
    schema: "p3a-measurement-v2-provenance",
    originalRaw: {
      path: "docs/data/p3-measurement-v2/artifacts/runs-447af10.jsonl.gz",
      sha256: originalSHA256,
      bytes: originalRaw.length,
    },
    observedTrace: {
      path: "docs/data/p3-measurement-v2/generated/artifacts/runs.jsonl",
      sha256: trackTraceSHA256,
      bytes: rawTrace.length,
      generatedProvenance:
        "docs/data/p3-measurement-v2/generated/data/provenance.json",
    },
    reportPath: "docs/data/p3-measurement-v2/report.json",
    reportSHA256,
    compatibility,
    rerollTotals,
    offerTotals,
  };
  await writeFile(
    provenancePath,
    `${JSON.stringify(updatedProvenance, null, 2)}\n`,
  );

  const terminalRows = Object.entries(compact.summary.terminalOutcomes)
    .map(([name, count]) => `| ${name} | ${count} |`)
    .join("\n");
  const cohortRows = Object.entries(compact.summary.cohorts)
    .map(
      ([name, summary]: [string, any]) =>
        `| ${name} | ${summary.wins}/${summary.runs} | ${summary.reachedWaves.join(", ")} | ${summary.averageItems} | ${summary.averageEarned} | ${summary.averageEndCash} | ${summary.averageSpent} | ${summary.acceptedRerolls} | ${summary.bossEncounters} | ${summary.sampledBossDamageLowerBound} |`,
    )
    .join("\n");
  const runRows = compactRuns
    .map((run) => {
      const final = run.waves.at(-1);
      const deadline = final.duration + (final.bossWave ? 15 : 0);
      return `| ${run.cohort} | ${run.seed} | ${run.terminalOutcome} | ${run.finalWave} | ${run.finalWaveTime.toFixed(3)} | ${deadline} | ${run.kills} | ${run.health.hp}/${run.health.maxHp} | ${run.cash.acceptedRerolls} | ${run.cash.earned} | ${run.cash.spent} | ${run.cash.end} | ${run.missingCore.join(", ") || "-"} |`;
    })
    .join("\n");
  const rerollRows = primary
    .map(
      (run) =>
        `| ${run.cohort} | ${run.seed} | ${run.cash.acceptedRerolls} | ${run.cash.freeAcceptedRerolls} | ${run.cash.paidAcceptedRerolls} | ${run.cash.rejectedRerollAttempts} | ${run.cash.paidRerollSpend} |`,
    )
    .join("\n");
  const weaponOfferRows = primary
    .filter((run) => run.cohort === "weapon-only")
    .flatMap((run) =>
      run.rests.map((rest: Json) => {
        const all = [
          ...rest.initialWeaponOffers,
          ...rest.refreshedWeaponOffers,
        ];
        return `| ${run.seed} | ${rest.afterWave} | ${rest.cashStart}-${rest.cashEnd} | ${rest.weaponSlots} | ${rest.maxWeaponTier} | ${rest.initialWeaponOffers.filter((offer: Json) => offer.previewReason === "no-space").length} | ${rest.refreshedWeaponOffers.filter((offer: Json) => offer.previewReason === "no-space").length} | ${rest.initialWeaponOffers.filter((offer: Json) => offer.tier === 1).length} | ${rest.refreshedWeaponOffers.filter((offer: Json) => offer.tier === 1).length} | ${rest.offerAudit.allTierTwoPlusNoTierOneOffer ? "yes" : "no"} | ${all.map((offer: Json) => `${offer.round[0]}:${offer.id}/T${offer.tier}/$${offer.price}/${offer.status}`).join("; ")} |`;
      }),
    )
    .join("\n");
  const winBossRows = compactRuns
    .filter((run) => run.outcome === "won")
    .map((run) => {
      const boss = run.bossWindows.find(
        (entry: Json) => entry.wave === run.finalWave,
      );
      return `| ${run.cohort} | ${run.seed} | ${boss.lastLiveObservedHp} | ${boss.sampledDamageLowerBound} | ${boss.actualBossKilledFlag ? "yes" : "no"} | ${boss.maxHp} |`;
    })
    .join("\n");
  const md = `# P3A natural-simulation measurement (v2 evidence repair)

Status: finite diagnostic evidence; not pass-by-definition, browser play, human
victory, route viability, performance or user acceptance.

This version repairs the prior report's reroll and weapon-offer claims without
changing gameplay or the original raw trace. Source is frozen at
\`${compact.sourceSHA}\`; preregistration checkpoint was
\`${compact.checkpointSHA}\`. The 21 fixed cohort/seed runs use the same hashed
driver and policy for every cohort. A separate weapon-only/seed-1 replay matched
the complete run record exactly.

## Provenance

- policy SHA-256: \`${compact.policySHA256}\`
- driver SHA-256: \`${compact.driverSHA256}\`
- v2 harness SHA-256: \`${compact.harnessSHA256}\`
- original v1 harness SHA-256: \`${compact.oldHarnessSHA256}\`
- production source manifest: \`${compact.sourceManifestSHA256}\`
- original raw SHA-256: \`${compact.oldTraceSHA256}\`
- v2 observed trace SHA-256: \`${compact.trace.sha256}\`
- tracked compact report SHA-256: \`${reportSHA256}\`

The original v1 raw is preserved gzip-compressed at
\`docs/data/p3-measurement-v2/artifacts/runs-447af10.jsonl.gz\`. The new
observer trace is under
\`docs/data/p3-measurement-v2/generated/artifacts/runs.jsonl\`. Regeneration
accepts \`P3_DATA_DIR\`/\`P3_ARTIFACT_DIR\` for measurement and
\`P3_GENERATED_DIR\`/\`P3_REPORT_DATA_DIR\` for reporting, with no private
\`/tmp\` default.

## Compatibility with v1

The v2 observer batch is \`${compatibility.comparedRecords}\` records. After
removing only observation-only fields, every old and new record matched exactly:
health, cash, guns, acquisitions, waves, bosses, inventory, terminal outcome and
all other measured state. The replay matched its primary record.

Ignored observation-only fields:

\`${compatibility.ignoredObservationFields.join(", ")}\`

## Rerolls

The raw records contain **${rerollTotals.accepted} accepted rerolls**, of which
**${rerollTotals.freeAccepted} were free**, **${rerollTotals.paidAccepted} were
paid**, **${rerollTotals.rejected} were rejected calls**, and paid reroll spend
was **${rerollTotals.paidSpend}**. All rests reset \`shopRerollIndex\`, so the
one attempted reroll per rest had price 0. The old \`cash.rerolls\` field remains
0 and is retained; it is not the total accepted-reroll counter. The money
fields are unchanged.

| cohort | seed | accepted | free | paid | rejected | paid spend |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rerollRows}

Weapon-only seed 1 has **14 accepted/free rerolls across 14 rests**. This
contradicts the old report's "no accepted rerolls" statement.

## Weapon-offer observations

Rows are captured when created, before later purchases can change the shop.
Each row records ID, tier, price, affordability at row creation, public preview
acceptance/reason, status and purchase-attempt state.

Totals across all primary runs: initial offers ${offerTotals.initial}, refreshed
offers ${offerTotals.refreshed}, purchased offers ${offerTotals.purchased},
attempted-rejected offers ${offerTotals.attemptedRejected}, not-attempted or
unaffordable offers ${offerTotals.notAttempted}, and preview-no-space offers
${offerTotals.previewRejectedNoSpace}. There were
${offerTotals.allTierTwoPlusAtRestEndRests} rest endings with six occupied slots
and every gun at Tier II or higher; ${offerTotals.allTierTwoPlusNoTierOneOfferRests}
of those rests also had no Tier-I offer in either row.
The remaining ${offerTotals.allTierTwoPlusAtRestEndRests - offerTotals.allTierTwoPlusNoTierOneOfferRests}
rests contained ${offerTotals.tierOneOffersAtAllTierTwoPlusRests} Tier-I offers,
all ${offerTotals.purchasedTierOneOffersAtAllTierTwoPlusRests} purchased after an
earlier compatible purchase freed a slot.

Weapon-only observation detail:

| seed | after W | cash start-end | slots | max tier | initial no-space | refreshed no-space | initial Tier I | refreshed Tier I | all T2+ and no T1 offer | rows |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${weaponOfferRows}

Weapon-only finished with six Tier-II guns on seed 1 and five Tier-II plus one
Tier-III gun on seeds 42/145; none reached Tier-IV. Under the no-sales policy,
six occupied slots with every gun at Tier II or higher cannot admit a Tier-I
weapon because no Tier-I merge is possible and no slot is free. Rows with no
Tier-I offer cannot supply the missing partner regardless of cash or future
luck. Seed 1's later rows contained no Tier-I helper.
This is an observed full-slot / no-Tier-I-partner condition, not proof of wallet
scarcity or a failed DPS check. Whether to add sales or partner selection is a
later design decision; no production or balance change is made here.

## Results

${compact.summary.outcomes.won}/21 runs won. These are fixed samples, not a
win-rate estimate.

| terminal outcome | runs |
| --- | ---: |
${terminalRows}

| cohort | wins | reached waves | avg item copies | avg earned | avg ending cash | avg spent | accepted rerolls | boss encounters | sampled boss damage lower bound |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${cohortRows}

| cohort | seed | terminal outcome | W | end time | deadline | kills | HP | rerolls | earned | spent | ending cash | missing core |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
${runRows}

## Findings and boundaries

- All 15 positive-HP losses crossed the real boss-wave deadline
  (\`duration + 15 s\`) with no boss kill. They are classified as deadline losses,
  not deaths during boss spawn. Weapon-only seed 1 lost W15 at 60.016667 s with
  HP 12/14 and no boss kill.
- Item-acquisition runs commonly exhausted useful affordable offers early and
  accumulated cash later. Ending cash alone is not proof of scarcity; the report
  retains per-rest cash, offer rows, transactions, rerolls and acquisitions.
- Scattered seed 42/145 acquired most legal items and won. This proves only that
  this acquisition policy can produce wins on those seeds; it does not prove a
  coordinated route or item-led damage attribution.
- Boss windows distinguish not encountered, encountered without observed damage,
  observed damage and killed. Deadline losses are not labelled failed DPS merely
  because the boss wave ended.
- Boss damage is a sampled lower bound, not exact actual damage.
  \`lastLiveObservedHp\` can remain positive on a win because the terminal zero
  occurred after the sample; \`actualBossKilledFlag\` is the separate game-owned
  result. No synthetic death sample or exact final-hit/source claim is made.
- The public action APIs used are real: \`claimCoreReward\`,
  \`claimPendingItem\`, \`chooseStatReward\`, \`skipReward\`, the shop methods and
  \`nextWave\`. The first harness attempt failed before cohort completion with
  \`TypeError: Cannot read properties of undefined (reading 'everSpawned')\`;
  commit \`a5997bf\` fixed the boss bucket indexing. The failed attempt remains a
  harness failure, distinct from the later successful harness.
- Missing per-hit item damage attribution remains unpatched and reported as
  missing. These are author-run finite simulation diagnostics, not independent
  review, browser play, performance or user acceptance.

## Winning-boss observation detail

| cohort | seed | last live sampled HP | sampled damage lower bound | actual boss killed flag | boss max HP |
| --- | ---: | ---: | ---: | --- | ---: |
${winBossRows}

Positive last-live HP does not mean the run won with the boss alive. It means the
later killing event was not sampled as a live HP observation.

## Attribution boundary

The production source exposes projectile/item metadata and damage-source
parameters, but no per-hit source ledger. A win, item count or cohort difference
does not prove item-led actual damage. A bounded observer would need a separate
approved instrumentation change; none is made here.
`;
  await writeFile(markdownPath, md);
  console.log(
    JSON.stringify(
      {
        reportPath,
        reportSHA256,
        markdownPath,
        traceSHA256: trackTraceSHA256,
        replayEqual,
        compatibility,
        offerConsistency,
        rerollTotals,
        offerTotals,
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
