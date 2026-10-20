// Read-only post-analysis of an ordinary browser trace's first-fight HP.
//
// Usage:
//   node tests/astra-heal-trace.cjs /abs/path/to/run-dir
//
// The run directory must contain trace.jsonl from tests/astra-ranged-run.mjs.
// This script reads no game internals and writes nothing.
const fs = require("fs");
const path = require("path");

const directory = process.argv[2];
if (!directory) throw Error("trace directory is required");
const rows = fs
  .readFileSync(path.join(directory, "trace.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);

const checks = [];
let lastEnd = null;
const seen = new Set();
for (const state of rows) {
  if (["sweep", "interlude", "quick", "shop"].includes(state.phase))
    lastEnd = state;
  if (state.phase === "fight" && !seen.has(state.wave)) {
    seen.add(state.wave);
    if (state.wave > 1 && lastEnd?.wave === state.wave - 1) {
      const recovery = state.wave >= 11 ? 4 : 3;
      const expected = Math.min(10, lastEnd.hp + recovery);
      checks.push({
        wave: state.wave,
        previousHp: lastEnd.hp,
        recovery,
        expected,
        actual: state.hp,
        firstFightTime: state.waveTime,
        pass: expected === state.hp,
      });
    }
  }
}

const result = {
  method:
    "Read-only post-analysis of ordinary browser trace: final prior-wave sweep/stop/interlude HP compared to first observed fight HP. No new state or input.",
  checks,
  passed: checks.filter((check) => check.pass).length,
  total: checks.length,
};
console.log(JSON.stringify(result, null, 2));
if (checks.some((check) => !check.pass)) process.exitCode = 1;
