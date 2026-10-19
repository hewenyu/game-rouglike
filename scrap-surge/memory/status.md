# Status
User played and rejected Nightfold: not satisfying, wants a Brotato-like roguelike.
The rejected prototype has been deleted under the user's direct authorization.
Current project: Scrap Surge, a scrap-armored hermit crab with automatic multi-weapons.

Product goal lives in memory/goal.md: an original, runnable, replayable single-player
browser auto-combat roguelike targeting a 10-20 minute normal run with genuine
positive-feedback builds. The user's latest goal supersedes the older "stop before
demonstrating" note; the two-wave build is now the first slice toward that goal.

## Roles
Astra coordinates, owns architecture boundaries and integration review; Opus reviews
gameplay/aesthetics/feel; DeepSeek is the sole writer here (implementation, tests,
fixes). All three have equal standing and must explicitly agree before a decision is
implemented. Silence is not approval. Author self-check is not independent review;
the independent DeepSeek review runs in a separate context against a frozen commit.

## Slice S1 (approved by Astra, Opus and DeepSeek)
Feel-validation slice: 20-second wave 1, shop, 35-second wave 2 with boss, real touch
movement. Approved revision package: player ivory+teal color separation at 1.3x with
white outline and teal ground ring; visible weapon blocks; fixed wave spawn rates
(3.1/s and 4.2/s) plus timed enemy pockets; high-saturation explosion FX with a real
chain count and number merging; non-blocking HUD; high-contrast shop feedback-loop
diagram; title-sticker clipping fix; and the combatPicked / FIFO boundary rules.
Also agreed: S1b (spring-fist remnant, overtime countdown, per-root chain accounting,
success-only spawn counting) and S1c (presentation-only readability fixes). The
explicit per-agent sign-off text lives in docs/reviews.md.

S1 + S1b + S1c are implemented and frozen on branch codex/scrap-surge at the commit
recorded below. Evidence: `npm test` 35/35, `npm run build` clean,
`npm run test:browser` victory (283 kills, hp 1, chain peak 19, pending peak 14, no
page errors) and an author-run `npm run test:browser:regression` 19/19 including the
idle-play defeat path and the arena-vs-HUD geometry checks. The checks were drafted by a
separate agent, but the implementer ran them, so that is author evidence, not
independent review. Frozen slice review by Astra, Opus and an isolated DeepSeek
reviewer is pending and must run against the frozen source commit.

This is a feel-validation slice, not a claim of a finished 10-20-minute game.
User acceptance of this version is still pending.

## Frozen slice commit

Source commit under review: **21a18fd66f782c8239ec6511897c66da9c58fe5a**
("scrap-surge: freeze S1/S1b/S1c feel slice"), parent c502295.

Astra, Opus and an isolated DeepSeek reviewer should review that exact SHA. This
status paragraph is a docs-only follow-up commit; the source at the reviewed SHA is
unchanged by it, so the frozen source SHA stays 21a18fd.

Scope is exactly S1 + S1b + S1c. No new product scope is authorized and no further
non-blocking item is pending from the implementer.
