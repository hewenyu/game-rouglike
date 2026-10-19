# Three-model collaboration and sign-off record

Astra coordinates, defines architecture boundaries and reviews integration. Opus
reviews gameplay, aesthetics, audiovisual direction and feel. DeepSeek is the only
writer in this directory (implementation, tests, fixes). Astra, Opus and DeepSeek
have equal standing: a decision is implemented only after all three explicitly
agree. Silence, absence or an "approved" note written by one agent is not another
agent's approval.

Actual subagent configurations used by the coordinator:

- opus_design: kiro/claude-opus-5.5
- deepseek_qa: group/auto-deepseek-v4-1-flash

Both were spawned with fork_turns=none. They cannot introspect the provider's
underlying routing; the tool-call configurations and the real returned messages
are the verifiable evidence. This is not one model roleplaying three.

Author self-check is not independent review. The independent DeepSeek review must
run in a separate context against a frozen commit.

## Explicit sign-off: S1 (feel slice, fixed numbers)

- Astra: agreed.
- Opus: agreed.
- DeepSeek (implementer): explicitly agreed to every fixed number, and specifically
  to `combatPicked` counting only combat pickups (sweep pickups never advance the
  magnet charge), the remainder carrying across waves, the FIFO of 12 blasts per
  tick with no silent drop, and the real chain count.

## Explicit sign-off: S1b (fist remnant, overtime UI, accounting)

- Astra: agreed, with the clarification that a remnant kill gives normal drops,
  can trigger domino and counts as a secondary chain death.
- Opus: agreed to all of S1b plus the same clarification, and added that the
  remnant must not damage the player, must not be targeted, must not occupy the
  180 live-enemy cap, keeps its own cap of 180, and renders dark, translucent,
  eyeless with a trail.
- DeepSeek (implementer): explicitly agreed to the remnant at 0.6s life, 650
  initial speed, decay 7, 30 damage, once per target, no repeated death or drop
  from the remnant itself, and secondary-chain counting; the independent 180 cap
  and no player damage; the 15s overtime countdown; and the count reclamation with
  a real chain peak.

## DeepSeek implementation review: S1c (aesthetics only) — I explicitly agree

I explicitly agree to S1c because each item is presentation-only and cannot alter
combat rules, collision, spawn numbers or timing:

1. Weapon mounts use a metal-grey/ivory base with a dark outline and keep the
   per-weapon identity colour at the muzzle tip, so the fast gun no longer shares
   the crab's teal.
2. The ivory shell gets warm spiral shading so it reads as a hermit-crab shell
   rather than a flat white disc.
3. The thin crossed legs become six short, thick, dark-outlined legs, and the
   ground ring is a complete translucent ellipse.
4. Damage numbers are white with a dark outline, with orange-yellow reserved for
   large damage and real chains. No crit system is invented. Eye outlines are
   thicker.

My reason for agreeing rather than deferring: the reviewer's finding was that the
teal player and teal-ish slinger were still confusable, which is a readability
failure of the S1 colour-separation goal, not a new gameplay decision. Every edit
lives in `src/render.ts`/`src/style.css` only. Opus signed these five items and
their boundary; Astra signed; this is the DeepSeek implementation signature.

## Independent DeepSeek findings raised before the freeze

These were raised by a separate read-only review context and are fixed in this
slice, with regression tests:

- A lethal spring-fist hit removed the enemy before the bowling pass, so the
  promised knockback never landed on the common bag/runner kills. Fixed with the
  S1b remnant.
- The first chain implementation counted the primary root kill and let a
  no-mod rocket radius kill accumulate into the chain counter, and reused one id
  as both allocator and display id. Rewritten to count only real secondary deaths
  with a monotonic id and per-causal-root counts.
- Wave 2 past 35s showed a frozen `00` timer during the invisible overtime.
  Fixed with the explicit overtime countdown.
- `spawnCount` advanced for spawns the 180 cap silently dropped. Now counts
  successful spawns only.
- Documented rather than changed: remaining queued blasts are cancelled at the
  wave boundary, pockets shrink under the enemy cap, and the 420 projectile cap is
  shared between player and enemy bullets.

## Status

Frozen slice review is pending against the commit recorded in memory/status.md.
Model review and an automated victory cannot establish whether this version feels
satisfying to the user. No user acceptance of this version yet.

## Full review and disposition of the unapproved expansion (2026-10-19)

After the previous implementer was interrupted, the working tree on
`codex/scrap-surge` carried unapproved edits to `src/data.ts`, `src/sim.ts` and
`src/render.ts` on top of source commit `ee53cf8`. Astra, Opus and an independent
DeepSeek review context each ran a full review of that extension. All three
explicitly agreed to the same disposition: **fully isolate the extension as a
draft branch, return the working branch to the committed slice, and review the
extension in phases later.** This is not a delete and not a merge. No party
approved shipping the extension as-is, and no party approved discarding it
wholesale.

Recovery performed under this agreement:

- The three files were committed, without change, to a new branch
  `codex/scrap-surge-expansion-draft` as an explicitly unapproved, unintegrated
  WIP draft. Draft SHA: **8e1542ebd8f8568bcdc9f2301050cd3f85acb6e0**.
- `codex/scrap-surge` was switched back to committed source `ee53cf8`; the
  working tree is clean. The draft commit reproduces the exact pre-recovery file
  contents, so the original hashes stay recoverable.

The audit snapshot at `/tmp/scrap-audit-ofrJ1o` (a patch of the extension plus a
snapshot server) is an auxiliary path only. Any project reproduction must use the
draft branch SHA above; nothing in the project may depend on `/tmp`.

### Blockers recorded (must be resolved before any reuse)

- **B1.** On main the shop still calls `chooseMod`, the UI still has two waves and
  the anchor icon is missing, so the first shop actually errors and cannot advance
  to the next wave. The extension does not fix this; it must not be presented as
  runnable on that path.
- **B2.** In the snapshot `npm test` was 32/36 and `npm run build` failed the
  TypeScript check (a stale Gun-level fixture). That fixture failure does not mean
  every mechanic is broken; it means the extension was never green.
- **B3.** `wave2.hp` of `1.35` moves runner `19 -> 26` and can `75 -> 101`, and
  bossborn `0.65 -> 1.2`. The claim that old numbers are unchanged is false; any
  reuse must restate the real numbers.

### New-mechanism issues recorded

- The barrel `bool` loses multiple volleys.
- The saw's free volley resets the cooldown.
- The echo persistent-cutting text describes more than the single hit it applies.

### Items of value that must be signed off in a separate package

The wave table, weapon merging and the new enemies/feedback mechanisms are worth
keeping, but they are new product scope. They require a fresh, explicit three-party
sign-off before any implementation.

### Other recorded findings

- `qaStart` is not exposed on main, so it is not a cheat backdoor in the shipped
  path.
- The infinite `refine` does not directly require a hard cap; it needs an economy
  review.
- S1d (fast gun `18 -> 20`) was agreed by all three and is now implemented at
  `d6ba6fe`. The recovery package recorded above did not implement it; the S1e
  review below covers `d6ba6fe`.
- `ee53cf8` is the post-palette-restore slice and is still pending review. The
  older `21a18fd` review must not be reused for this new SHA.

## Review of d6ba6fe and the S1e aiming fix (2026-10-19)

All three parties reviewed `d6ba6fe` ("S1d: can-popper damage 18 -> 20").

- Automated: `npm test` 37/37, `npm run build` clean, the author-run browser
  regression 19/19, and a normal-play browser victory at 286 kills.
- Astra's first-shop review **failed**: normal keyboard input reached the first shop
  on 0/3 seeds and touch on 2/3 seeds. That is the blocking result for this build.
- Opus: the visual work passed, but Opus blocked the build overall because of the
  first-shop failure.
- Independent DeepSeek: confirmed the root cause is the weapon aim geometry. The gun
  aimed from the player centre while the bullet leaves a mount offset from it, so a
  target level with the player on the mount's left or right was shot straight past and
  never hit. This is a long-standing S1 defect, **not** introduced by S1d, which only
  changed the damage number.

Three-party decision (S1e): fix exactly that aim geometry and nothing else. Each shot
now aims from the mount toward the same predicted point, with the lead factor, target
selection, range, damage, fire rate, spawn and economy all unchanged, and the muzzle
still at `mount + direction * 24`. The coil/fist direct-hit rules and the saw are
untouched; no anchor or draft code is involved.

S1e result on `codex/scrap-surge`: `npm test` 40/40 (three new tests: left/right 140px
same-row enemies are hit and killed within two seconds through the real weapon path, a
single gun reaches all eight fixed directions, and multi-slot mounts keep every
direction covered), `npm run build` clean, the first-shop review now passes (keyboard
3/3, touch 3/3, no page errors), a normal-play browser victory at 287 kills, and the
browser regression 19/19.

The first-shop gate counts three seeds per input mode. n = 3 is only a smoke test, not
a statistical claim; a passing run does not prove every seed works.
