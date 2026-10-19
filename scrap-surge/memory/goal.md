# Current goal

This file records the user's latest directly specified goal. It supplements, and
does not replace, the live built-in goal while that goal remains active.

## Product goal

Build an original, runnable, replayable, single-player browser auto-combat
roguelike in this directory. A normal run should target 10-20 minutes. It must
support real touch input. Brotato is a reference for the play experience only:
do not copy its character, world, art, UI layout or symbols.

The central experience is a genuine positive-feedback loop ("left foot steps on
right foot and goes to the sky"): deaths, drops, pickups, weapons and explosions
must feed each other in a real, readable chain rather than being simulated by
fake counters or reduced to numeric stat inflation.

## Wave-count target (user playtest, 2026-10-19)

The user played the slice and gave the latest, highest-priority requirement: the
level count is too low and there must be **at least 20 levels/waves**. The build
should take shape gradually across those 20 waves. The current build-formation pace
varies too much: sometimes it forms too fast, sometimes too slow; the causes remain
to be measured. 20 waves is the pace the user wants.

So the base flow is now planned around **20 waves**. The earlier 12-wave idea is
void, and the 4-wave build-difference check is an internal experiment only, never a
delivery target. The original 10-20 minute run target still stands and must be
reconciled with 20 waves plus shop pacing in a later three-party review; it must not
silently stretch to 30 minutes.

This playtest feedback is only about wave count and build-formation pacing. It is
**not** an aesthetic or feel acceptance of the current slice, and it must never be
recorded as user acceptance of the visuals or of any other part of the build.

Scope stays gated: no one may unilaterally implement a 20-wave expansion. The
concrete 20-wave content plan is a proposal for the next three-party review. Opus's
20-wave timetable is still a proposal, not approved. Keeping two mod slots and the
build-differentiation design are also still undecided; do not add a third mod slot
without three-party agreement.

## Collaboration and ownership

- Astra coordinates, defines architecture boundaries and reviews integration;
  Astra does not write implementation.
- Opus reviews gameplay, aesthetics, audiovisual direction and feel.
- DeepSeek implements, tests and fixes the product.
- Astra, Opus and DeepSeek have equal standing. A decision is implemented only
  after all three explicitly agree. Silence or absence is not approval.
- Author self-checks are not independent review. The independent DeepSeek review
  must run in a separate context.
- DeepSeek is the only writer in this directory while the role remains active.

## Delivery gates

- Create the goal before starting work.
- Freeze a feel-validation slice and review that exact commit before expanding.
- Freeze a final candidate and review that exact commit before calling it done.
- The original seven acceptance sections remain in force. The slice is not the
  final scope. User acceptance is still pending.
- The rejected `nightfold/` prototype has been deleted under the user's direct
  authorization.
- Do not push, deploy, publish or use paid services without explicit user
  authorization.
