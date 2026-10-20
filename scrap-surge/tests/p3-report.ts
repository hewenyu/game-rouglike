import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { canonicalJson } from "./p3-policy";

type Json = Record<string, any>;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "docs/data/p3-measurement");
const TRACE = "/tmp/scrap-p3-measurement-447af10/runs.jsonl";
const REPORT = resolve(DATA, "report.json");
const MARKDOWN = resolve(DATA, "report.md");
const PROVENANCE = resolve(DATA, "provenance.json");
const HARNESS = resolve(ROOT, "tests/p3-measure.ts");

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

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

function terminalOutcome(run: Json) {
  if (run.outcome === "won") return "won";
  const final = run.waves.at(-1) as Json | undefined;
  if (!final) return "incomplete";
  if (final.endReason === "run-cap") return "harness-step-cap";
  // The simulation settles a boss-wave loss at duration + 15s even if HP > 0.
  // Equal-to-deadline time is accepted because recorded steps can end just
  // below the float boundary; the terminal positive-HP/boss-wave shape is the
  // source-level loss path, not a generic positive-HP outcome.
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
  const damagePoints = samples.filter(
    (sample, index) => index > 0 && sample.hp < samples[index - 1]!.hp,
  );
  const firstDamage = damagePoints[0] ?? null;
  const lastDamage = damagePoints.at(-1) ?? null;
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
    damageWindow:
      firstDamage && lastDamage
        ? {
            firstAt: firstDamage.simulationTime,
            lastAt: lastDamage.simulationTime,
            duration: lastDamage.simulationTime - firstDamage.simulationTime,
          }
        : null,
    sampledHpCount: samples.length,
    positiveHpDecreaseSamples: boss.positiveHpDecreaseSamples,
    sampledDamageLowerBound: boss.observedDamage,
    sampledDamageLowerBoundMeaning:
      "Sum of positive decreases between sampled live boss HP observations; actual cumulative damage and per-source attribution are not observable.",
    lastLiveObservedHp: boss.lastObservedHp,
    lastLiveObservedHpMeaning:
      "Last sampled HP while the boss was alive; a separate game-owned kill flag may make the true terminal HP zero after this sample.",
    actualBossKilledFlag: boss.killed,
    actualCumulativeDamageLowerBound: boss.killed
      ? boss.maxHp
      : boss.observedDamage,
    actualCumulativeDamage: null,
    actualCumulativeDamageMeaning:
      "Not exactly observable. If the boss was killed, actual cumulative damage is at least maxHp; otherwise it is at least the sampled decrease total.",
    maxHp: boss.maxHp,
    survivedToTerminal: boss.survivedToTerminal,
    encounterClassification: boss.encounterClassification,
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
    simulationTime: run.simulationTime,
    fixedSteps: run.fixedSteps,
    kills: run.kills,
    bossKills: run.bossKills,
    health: run.health,
    cash: run.cash,
    missingCore: run.missingCore,
    missingItemPriorities: run.missingItemPriorities,
    acquisitions: run.acquisitions,
    inventory: run.inventory,
    stats: run.stats,
    guns: run.guns,
    actualItemDamageAttribution: run.actualItemDamageAttribution,
    routeLabelEvidence: run.routeLabelEvidence,
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
      sweptFuelUnits: wave.sweptFuelUnits,
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
      rerolls: {
        accepted: rest.rerollCount,
        spend: rest.rerollSpend,
      },
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
      const itemCount = (run: Json) =>
        Object.values(run.inventory as Record<string, number>).reduce(
          (total, count) => total + count,
          0,
        );
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
          averageItems: round(sum(itemCount) / selected.length),
          averageEndCash: round(sum((run) => run.cash.end) / selected.length),
          averageEarned: round(sum((run) => run.cash.earned) / selected.length),
          averageSpent: round(sum((run) => run.cash.spent) / selected.length),
          missingCoreRuns: selected.filter((run) => run.missingCore.length)
            .length,
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

async function main() {
  const rawTrace = await readFile(TRACE);
  const traceSHA256 = sha256(rawTrace);
  const provenance = JSON.parse(await readFile(PROVENANCE, "utf8")) as Json;
  if (provenance.traceSHA256 !== traceSHA256)
    throw new Error("trace hash does not match provenance");
  const detailedRuns = rawTrace
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Json);
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

  const previousReport = JSON.parse(
    await readFile(REPORT, "utf8").catch(() => "{}"),
  ) as Json;
  const harnessSHA256 = sha256(await readFile(HARNESS));
  if (harnessSHA256 !== provenance.harnessSHA256)
    throw new Error(
      "harness hash changed after the measured batch; rerun the measurement",
    );
  const sourcePolicy = previousReport.policy ?? provenance.policy;
  const compactRuns = primary.map((run) => {
    const cohort = (sourcePolicy.cohorts as Json[]).find(
      (entry) => entry.id === run.cohort,
    );
    const priorityIds = (cohort?.itemPriorities ?? []).map(
      (entry: Json) => entry.id,
    );
    return compactRun({
      ...run,
      missingItemPriorities: priorityIds.filter(
        (id: string) => !(run.inventory[id] > 0),
      ),
    });
  });
  const report = {
    schema: "p3a-measurement-v1",
    sourceSHA: provenance.sourceSHA,
    checkpointSHA: provenance.checkpointSHA,
    policySHA256: provenance.policySHA256,
    driverSHA256: provenance.driverSHA256,
    harnessSHA256: provenance.harnessSHA256,
    sourceManifestSHA256: provenance.sourceManifestSHA256,
    sourceGuard: previousReport.sourceGuard,
    policy: previousReport.policy,
    preregistrationCommit: "5c5b253d493f1e760296ae7a57877757234397cb",
    runHarnessFixCommit: "a5997bf",
    failedHarnessAttempts: [
      {
        stage: "before the first cohort completed",
        error:
          "TypeError: Cannot read properties of undefined (reading 'everSpawned')",
        cause: "incorrect boss bucket indexing",
        resolutionCommit: "a5997bf",
        preserved: true,
      },
    ],
    trace: {
      path: TRACE,
      sha256: traceSHA256,
      detailedRuns: detailedRuns.length,
    },
    determinism: {
      cohort: "weapon-only",
      seed: 1,
      equal: replayEqual,
      primaryCanonicalSHA256: sha256(canonicalJson(primary[0])),
      replayCanonicalSHA256: sha256(canonicalJson(replay)),
    },
    summary: {
      primaryRuns: primary.length,
      replayRuns: 1,
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
      "Positive-HP terminal records are deadline losses only when the boss wave crossed duration + 15 s with no boss kill; this does not identify the final hit source.",
      "The raw trace retains the successful run's harness terminalReason; the compact report's deadline classification supersedes its boss-spawn precedence without modifying measured state.",
      "Boss damage is a sampled lower bound between live-HP observations. LastLiveObservedHp is not terminal HP; actualBossKilledFlag is the separate game-owned kill result.",
    ],
    runs: compactRuns,
  };
  const compact = roundDeep(report) as Json;
  const reportText = `${JSON.stringify(compact, null, 2)}\n`;
  await writeFile(REPORT, reportText);
  const reportSHA256 = sha256(reportText);
  const updatedProvenance = {
    ...provenance,
    policy: previousReport.policy,
    sourceGuard: previousReport.sourceGuard,
    reportPath: REPORT,
    reportSHA256,
    reportSchema: "p3a-measurement-v1",
    traceSHA256,
  };
  await writeFile(
    PROVENANCE,
    `${JSON.stringify(updatedProvenance, null, 2)}\n`,
  );

  const wins = primary.filter((run) => run.outcome === "won");
  const terminalRows = Object.entries(compact.summary.terminalOutcomes)
    .map(([name, count]) => `| ${name} | ${count} |`)
    .join("\n");
  const cohortRows = Object.entries(compact.summary.cohorts)
    .map(
      ([name, summary]: [string, any]) =>
        `| ${name} | ${summary.wins}/${summary.runs} | ${summary.reachedWaves.join(", ")} | ${summary.averageItems} | ${summary.averageEarned} | ${summary.averageEndCash} | ${summary.averageSpent} | ${summary.bossEncounters} | ${summary.sampledBossDamageLowerBound} |`,
    )
    .join("\n");
  const runRows = compactRuns
    .map((run) => {
      const final = run.waves.at(-1);
      const deadline = final.duration + (final.bossWave ? 15 : 0);
      return `| ${run.cohort} | ${run.seed} | ${run.terminalOutcome} | ${run.finalWave} | ${run.finalWaveTime.toFixed(3)} | ${deadline} | ${run.kills} | ${run.health.hp}/${run.health.maxHp} | ${run.cash.earned} | ${run.cash.spent} | ${run.cash.end} | ${run.missingCore.join(", ") || "-"} |`;
    })
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
  const md = `# P3A natural-simulation measurement

Status: finite diagnostic evidence; not pass-by-definition, browser play, human
victory, route viability, performance or user acceptance.

Source is frozen at \`${compact.sourceSHA}\`; preregistration checkpoint was
\`${compact.checkpointSHA}\`. The 21 fixed cohort/seed runs use the same hashed
driver and policy for every cohort. A separate weapon-only/seed-1 replay matched
the complete run record exactly.

## Provenance

- policy SHA-256: \`${compact.policySHA256}\`
- driver SHA-256: \`${compact.driverSHA256}\`
- harness SHA-256: \`${compact.harnessSHA256}\`
- production source manifest: \`${compact.sourceManifestSHA256}\`
- external detail trace: \`${TRACE}\` (\`${traceSHA256}\`)
- tracked compact report SHA-256: \`${reportSHA256}\`

## Results

${wins.length}/21 runs won. These are fixed samples, not a win-rate estimate.

| terminal outcome | runs |
| --- | ---: |
${terminalRows}

| cohort | wins | reached waves | avg item copies | avg earned | avg ending cash | avg spent | boss encounters | sampled boss damage lower bound |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${cohortRows}

| cohort | seed | terminal outcome | W | end time | deadline | kills | HP | earned | spent | ending cash | missing core |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
${runRows}

## Findings

- All 15 positive-HP losses crossed the real boss-wave deadline
  (\`duration + 15 s\`) with no boss kill, so they are classified as deadline
  losses rather than deaths during boss spawn. This includes weapon-only seed 1
  at W15 (60.0167 s, HP 12/14, boss not killed).
- Weapon-only finished with six Tier-II guns on seed 1 and five Tier-II plus
  one Tier-III gun on seeds 42/145; none reached Tier-IV. Seed 1 entered the
  W9-W14 rests with six occupied slots, 153-765 cash and 0 accepted rerolls.
  The observed rows offered no useful full-slot partner progression. This is a
  full-slot / missing Tier-I partner purchase bottleneck under the frozen policy,
  not evidence of cash scarcity or a failed Tier-IV DPS check. Whether to add a
  sales or partner-selection policy belongs to a later three-party design gate;
  no production/balance change is made here.
- Item-acquisition runs commonly exhausted useful affordable offers early and
  accumulated cash later. Ending cash alone is not treated as proof of scarcity;
  per-rest cash, spend split, offers and transactions are in the report.
- Scattered seed 42/145 acquired most legal items and won, which proves only
  that this acquisition policy can produce wins on those seeds. It does not
  prove a coordinated route or item-led damage attribution.
- Boss windows distinguish not encountered, encountered without observed
  damage, observed damage and killed. Deadline losses are reported separately
  and are not labelled failed DPS merely because the boss wave ended.
- Boss damage is reported as a **sampled lower bound**, not exact actual damage.
  \`lastLiveObservedHp\` is the last sampled HP while the boss was alive, so it can
  remain positive on a win because the terminal zero occurred after that sample.
  \`actualBossKilledFlag\` is the separate game-owned result. The winning W20
  bosses were actually killed even where the last live sample was positive;
  actual cumulative damage is at least their 6400 max HP. No synthetic death
  sample was added, and no exact final hit, overkill or source is claimed.
- The public action APIs used are real: \`claimCoreReward\`,
  \`claimPendingItem\`, \`chooseStatReward\`, \`skipReward\`, the shop methods and
  \`nextWave\`. The first harness attempt failed before cohort completion with
  \`TypeError: Cannot read properties of undefined (reading 'everSpawned')\`;
  commit \`a5997bf\` fixed the boss bucket indexing, and that failed attempt is
  preserved rather than treated as a cohort result. Missing per-hit item damage
  attribution remains unpatched and reported as missing.

The detailed trace is preserved byte-for-byte, including the successful harness's
raw \`terminalReason\`. That raw field gave positive-HP boss-wave losses
boss-spawn precedence; this report classifies them from the source deadline rule
instead and keeps \`traceTerminalReason\` beside the corrected
\`terminalOutcome\`.

## Winning-boss observation detail

| cohort | seed | last live sampled HP | sampled damage lower bound | actual boss killed flag | boss max HP |
| --- | ---: | ---: | ---: | --- | ---: |
${winBossRows}

Positive last-live HP does not mean the run won with the boss alive. It means the
later killing event was not sampled as a live HP observation.

## P2 approval context

P2 was independently checked at committed checkpoint \`6ba7844\` for the bounded
preview repair only: 173 tests and clean build, plus ordinary keyboard and real
CDP-touch W1 shop-before-reward projection through the W2 item purchase.

- root evidence: 173/build, normal 2/2,
  \`/tmp/astra-p2-6ba7844/items/report.json\`
- Opus evidence: 173 + normal 2/2, \`/tmp/opus-6ba-preview/report.json\`
- independent DeepSeek: 173/build + normal 2/2,
  \`/tmp/ds-6ba-preview/report.json\`,
  SHA-256 \`259c119f47084157a1cfe428f88a9d9bf6d6479d6022eaeff4509f1f771d8c82\`

P2 user acceptance was not given. Full W20 browser play, five late routes,
render performance, audio/mobile/Safari and user feeling remain gates.

## Attribution boundary

The production source exposes projectile/item metadata and damage-source
parameters, but no per-hit source ledger. A win, item count or cohort difference
does not prove item-led actual damage. A bounded observer would need a later,
separate approved instrumentation change; none is made here.
`;
  await writeFile(MARKDOWN, md);
  console.log(
    JSON.stringify(
      {
        reportPath: REPORT,
        reportSHA256,
        markdownPath: MARKDOWN,
        traceSHA256,
        replayEqual,
        runs: primary.length,
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
