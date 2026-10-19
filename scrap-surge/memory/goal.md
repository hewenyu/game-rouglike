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
