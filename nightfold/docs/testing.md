# Validation evidence

## Automated rules
20 deterministic tests cover degenerate geometry, even-odd lobes, closing edges,
seed determinism, minimum path defense, conversion cap, pause cancellation,
auto-release latch, movement normalization/bounds, damage immunity, terminal states,
draft validation, delayed echo, satellites, constellation, loom cap, beam reach,
moth non-recursion, boss victory/deadline and all-eight composition across 40 seeds.
This is bounded sampling and not a proof that every seed/build is fair or winnable.

## Browser method
Playwright launches installed Chrome and sends ordinary keyboard/mouse inputs.
The slice driver follows a circular route by reading position metrics and chooses
from visible draft cards; it never changes HP, timer, entity state or difficulty.
It asserts a terminal outcome, records whether that outcome is victory or defeat,
and checks retry, pause, resize, persistence and uncaught errors. CDP touchscreen
input uses two independent contacts in a mobile-emulated context, including cancel.
That is not a physical-phone test, and it does not validate real finger ergonomics.

Results, performance environment, independent reviews and limits will be appended
once the two checkpoints have completed. At this stage no user acceptance exists.
