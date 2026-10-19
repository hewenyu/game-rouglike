# Status

## Current candidate: expedition20 through `851cd13` (2026-10-19)

This is the final 20-wave candidate for user playtesting. It is runnable and
**not user-accepted or validation-complete**, and the full 10-20 minute goal is
not complete. The normal page opens `expedition20`; `?mode=slice` preserves the
approved two-wave feel slice. The three-party approval history for its bounded
changes is in `docs/reviews.md`; same-SHA final review remains required.

The current source baseline is
**851cd13faa17f930cbeb9cbf28eff3eeafe17073** plus this cleanup commit. The
approved cleanup after that baseline changes only this documentation set, the
expedition-only header label, three portable diagnostics and their npm scripts.
It does not change combat, waves, economy, recovery, layout or slice rules.
Only the rendered header text changes after `851cd13`; simulation source remains
identical, so the rule, input and slice-equivalence evidence still applies.

### Current rules

- The expedition has 20 waves, with nine full shops and six quick choices.
- Entering W1-W10 restores 3 health; entering expedition W11-W20 restores 4.
  Slice entries still restore 3. The destination wave decides the amount, and
  recovery is capped at 10. Lost and won states cannot be revived.
- Movement input is accepted in `fight`, `sweep` and `interlude`, so a direction
  pressed during the automatic transition moves immediately in the next wave.
  Quick, shop and paused phases still reject movement.
- `shootAcceptedEnemy` counts enemy projectiles admitted before the shared
  420-projectile cap. It does not count hits or attribute player injury.

### Evidence for the current candidate

| Check | Result |
| --- | --- |
| Unit suite | **89/89** |
| Production build | **clean** |
| Browser regression on `851cd13` | **24/24**, root-reported |
| Input lifecycle on `f7d0741` | **7/7 author**, independent DeepSeek **7/7** |
| Three-seed slice equivalence on `851cd13` | **0 differences** |
| Simulation CPU diagnostic | W1-W15 only; p95 **0.060041 ms**, max **1.301042 ms** |
| Ordinary ranged run on `851cd13` | **lost W20 during boss spawn; boss fight unobserved**, 0 HP |

The unit, build, slice-equivalence and browser-regression checks ran on
`851cd13`. The named 7/7 input-lifecycle log is the **author DeepSeek** run on the
parent `f7d0741`, before the recovery-only change. The separate root-verified
independent DeepSeek artifact is
`/tmp/astra-f7d-review.B5iCbP/f7/scrap-surge/artifacts/input-lifecycle-results.json`
with SHA-256
`241fea027757a430d2088b5f5776c1a1f9904738524c4853b82f434836f1a6f3`;
it records 7/7 with keyboard and touch runs completed. These are finite checks,
not a W20 acceptance claim.

The lifecycle log is
`/tmp/astra-input-f7d0741-evidence/lifecycle-f7d0741.log`. It separately covers
keyboard and real-CDP touch: normal progression to the W7 interlude, a newly
held direction moving immediately in W8, rejection in quick/shop/pause, and no
page errors.

The slice-equivalence log is `/tmp/astra-851cd13-slice-equivalence.log`. Against
the approved pre-expansion slice at
`058951fc84994abb8ee24a2c587bb9232c1c1ccd`, all three seeds finished with zero
per-step differences:

| Seed | Outcome | Kills | HP | Chain peak |
| --- | --- | ---: | ---: | ---: |
| 42 | won | 307 | 10 | 20 |
| 23 | won | 308 | 7 | 18 |
| 145 | won | 307 | 10 | 18 |

This is evidence that the late recovery change did not alter the slice. It is not
new coverage of the expedition.

The CPU diagnostic is `/tmp/astra-851cd13-perf.json`. It measures only
`Game.step` for seed 42 through W1-W15 on an Apple M4 with Node 26. It is **not**
FPS, W16-W20, mobile, render, audio, GPU or peak-load evidence. The run ended
lost in W15.

The fresh `851cd13` browser regression log is
`/tmp/astra-851cd13-regression.log`: 24/24, including two real W1 deaths and the
wave-2 live-boss metrics check.

The final heal post-analysis, `/tmp/astra-851cd13-heal-trace.json` (mirrored as
`/tmp/astra-851cd13-heal-trace-final.json`), passed **19/19** entries through W20:
3 recovery through W10, 4 from W11, and the 10-health cap. The earlier 12/12 W13
read was an intermediate state, not a separate final artifact.

The ordinary ranged run on `851cd13` is a real failure, not a victory or deadline.
It entered W20 with 8 health. The boss was first observed around `57.05 s`, while
player health was 1; at wave time `57.583333333331346 s`, still during boss spawn,
health reached 0. No final boss fight was observed and no boss damage was dealt
(boss still at 6,400 hp). The result recorded 5,965 kills, simulated
`698.6666666663599 s`, wall `703.349 s`, six Tier-II guns, popcorn III plus
domino II, chain peak 21, no page errors, all 12 functional checks passed, and a
working terminal retry; the full-victory assertion failed as intended. Raw
evidence is `/tmp/astra-851cd13-ranged/result.json` with the JSONL trace alongside
it.

### Preserved failure evidence

Historical failures remain failure evidence. They are not overwritten by later
green checks.

- **Input lifecycle, `f7`:** the preserved
  `/tmp/astra-input-f7d0741-evidence/lifecycle-f7d0741.log` is the **author
  DeepSeek 7/7** run. The root-verified independent DeepSeek 7/7 artifact is
  `/tmp/astra-f7d-review.B5iCbP/f7/scrap-surge/artifacts/input-lifecycle-results.json`
  (SHA-256 `241fea027757a430d2088b5f5776c1a1f9904738524c4853b82f434836f1a6f3`),
  with keyboard and touch runs completed. The shared
  `tests/browser-input-lifecycle.mjs` remains the reproducible ordinary-input
  check.
- **Ordinary ranged on `f7d0741`:** lost in W18 at 0 hp, 4,781 kills, simulated
  `594.7166666664544 s`, wall `599.635 s`, no page errors. The result and trace
  are in `/tmp/astra-f7d0741-ranged/`.
- **Final approved domino diagnostic on `f7d0741`:** lost in W15 with 3,455
  kills. The registered variant kept the ranged guns and 105 nearest-enemy
  avoidance input, took domino at W9/W13 and popcorn at W17, and put domino
  second. The preserved result file contains the diagnostic CPU measurement and
  terminal outcome, not a full browser stop trace. Raw result:
  `/tmp/astra-f7d0741-domino-diagnostic.json`. This is the final
  preregistered strategy variant; no further strategy variants are planned.
- **Historical W15 run on `3140`:** lost at 0 hp with 3,569 kills. The stage-III
  boss had already been killed, but the player died with 3.5 seconds remaining
  in W15. This corrects the earlier ambiguous "about 3.5s later" wording.

The full chronological record remains in `docs/status-history.md`, including
earlier red regression runs, the F0/T2 checkpoints, expired suite counts and
superseded review state. Those entries are explicitly historical.

### Portable diagnostics

`tests/astra-ranged-run.mjs` reproduces the ordinary ranged strategy through a
real browser. `tests/astra-perf.ts` reproduces the single-CPU simulation timing
diagnostic. `tests/astra-heal-trace.cjs` reads the ranged trace after a run and
checks first-fight HP against the 3/4 recovery and 10 cap. None changes game state
or is part of `npm test`.

The browser and CPU diagnostics require `SOURCE_SHA`, so an artifact cannot claim
a source it did not run. Optional settings:

- Ranged: `CHROME_PATH`, `BASE_URL`, `OUTPUT_DIR`. A loss remains an assertion
  failure and its JSON, trace, screenshots and terminal state are preserved.
- CPU: `OUTPUT_FILE`.
- Heal trace: pass the ranged run directory as the sole argument to
  `npm run test:astra:heal-trace -- /abs/path/to/run`.

Without an explicit output path, each run creates a unique directory or file
under the system temporary directory (`astra-ranged/` or `astra-perf/`). Existing
evidence is never overwritten; the chosen path is printed.

### Open boundaries

No current evidence establishes a full ordinary-input W20 victory on `851cd13`.
Physical-device performance, Safari, mobile ergonomics, rendered-frame rate,
audio mix and user feel remain unverified. The 20-wave candidate has no user
acceptance. No tuning, additional UI, push, merge or deployment is authorized
by this cleanup.
