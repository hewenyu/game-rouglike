# P2 items and rules contract

This repository copy is the self-contained approved contract for the Stage A pure
item/rules layer and the Stage B simulation integration. It has no runtime or test
dependency on a temporary host path.
The frozen v2 source document SHA-256 is
`9e1097315911b3e6fb9b7c14900cc3fae1b92f24b3b3b1e1bcb9a7b8cbf84cde`.
The frozen base commit is `6d15c7f6f335809773bf3bdd051851a9328cbe45`.

Three-party approval covers P2 implementation only:

- root Astra explicitly approved implementation of contract v2;
- fresh Opus task `p2_opus_v2_accept_once` explicitly approved it;
- fresh independent DeepSeek task `p2_ds_v2_accept_once` explicitly approved it.

Stage A implements the catalog and pure rule/profile API. Stage B wires those rules
into expedition simulation state, inventory, rewards, chests, elites and bounded
queues. It is not a completed P2 integration: rendering, shop/rest UI, audio,
browser behavior and performance remain Stage C, and no balance, user-feel, runtime
or playtest claim follows. The authoritative amendments near the end of this copy
override shorthand or conflicting wording earlier in it. Prototype numbers are not
balance acceptance.

Original contract follows.

Project: `scrap-surge`
Roles: Astra coordination/review, Opus design/experience, DeepSeek implementation; independent DS distinct author. One-shot fork_turns=none. All three explicit approval required. No current writer. Original4188 untouched, P1 stable4190. Read AGENTS.md, memory/goal.md. Only expedition changes; slice behavior locked.

SCOPE: deliver actual full item inventory, 20-item catalog with five mixable families, shared profiles,19 rest screens, real elites/chests/rarity, real proc outputs and accounting/tests/browser fixture. Not a paper-only registry. P3 subsequently measures/tunes 20-wave cohorts; do not claim finished balance from this prototype.

FLOW: W1-W19 one consolidated shop/rest UI (may keep phase='shop' to avoid gratuitous phase rename). 3 distinct weapon offers +3 distinct item offers, independent pools. One free-first shared reroll per rest then existing rerollPrice(index), refresh both rows together. Existing weapon sell retained: refund floor(.35 * aggregate ACTUAL paid), free starter paid0, protect last gun. Bought guns charge once, fuse aggregate actual paid; no market-price refund. Thus every buy/fuse/sell cycle returns <=35% cost, cannot mint cash even across rests; add regression. No ITEM resale, no curse removal. Weapon offers remain visible if presently no slot-fit with reason; can buy/fuse after sell. Items legal before rarity draw (unique/cap/prerequisite). Fewer legal candidates => fewer cards, never duplicates in same row. Reroll requires a possible changed offer in at least one row and affordability before RNG/spend. If draw exactly repeats both row sets, deterministic replacement with legal alternative ensures visible change. Failure leaves inventory, offers, all counters, money, events and RNG unchanged. Revalidate purchases/rewards, mark stale cards unavailable, no automatic free redraw. Bought repeatable item may return on later reroll/rest, not infinite same card buys.

REWARDS: W1 free 3-distinct-choice mechanism row from S3,C1,H2,F4,P1,P2; skip allowed. One basic proc early is NOT completed build. Other nonboss rests free random3 distinct stat options: weapon dmg+6%,AS+6%,maxHP+1/heal1,move+5%,pickup+15%,P+8%. W5/10/15 physical boss chest REPLACES stat reward (no duplicate free mechanism row). Elite chest2choice, boss3choice, both may decline for zero compensation. On collecting chest, freeze rolled IDs using loot RNG. Rest revalidates unique/cap/prerequisite; stale choice unavailable and can decline, no cash substitute. Exit discards unclaimed reward options, no carry. Loss discards all pending chests, claims, drops and queues; W20 terminal no reward UI. Empty legal pools never block continuing.

ECONOMY/RNG: existing raw drop values preserved, wallet conversion .20 with deterministic fractional remainder; curse multiplier affects conversion, NOT fuel. coinRate=.20*max(.10,1-.15*P4copies). Define fuelUnits=1 per original normal scrap-producing death, preserved independently when scrap objects merge (boss scrap drop also1). Pickup magnet counter consumes fuelUnits not object count; popcorn queues 2*fuelUnits seeking bullets using bounded carried queue. cashValue(raw),fuelValue,collected separate; collected only once, zero coin still procs. At250 objects merging conserves cash & fuel; no conditional loss at cap. Combat RNG unchanged stream; existing gun-shop RNG, separate itemShop/statReward/loot streams. Rerolls/rewards never consume combat stream. Paired draw-isolation tests, not claim choices cannot alter fight outcomes. Only one currency. Income planning uses70/85/100% cohorts, clearly static assumptions.
Item price ceil(base[C10,U16,R26]*(wave+4)/5*(1+.15*copiesOwned)). Shop rarity piecewise CONSTANT bands W1-5 C70/U27/R3,W6-12 55/35/10,W13-20 40/40/20. Elite filters out C then normalizes U/R. Boss W5 U60/R40,W10 U45/R55,W15 U30/R70; boss rarer odds than elite. If no eligible items of a rarity, renormalize available rarities; chest never below U. No claim sixIV economically impossible based only on rough arithmetic. Gun price/tier unchanged P2.

ITEMS: IDs are descriptive implementation choice. Stats additive percentages except explicit multiplicative .75 and .20 money conversion. P=max(.1,1+statRewards+.25*C3); general weapon damage factor=max(.1,1+statRewards+.08*F1-.08*C3+moving?.5*S2*max(0,moveBonus):0+pressureActive?.60:0) (write correctly parenthesized). Move factor=max(.4,1+.12*S1-.04*H1+statRewards). AS=max(.2,1+.1*F2+(moving?.15:-.10)*S4+statRewards). Movement means actual displacement this tick, not merely held key against boundary. HP=max(3,base10+2*H1-S1+statRewards), item maxHP increases leave currentHP unchanged; decreases clamp currentHP; stat HP reward explicitly heals1. Healing caps derived max; preserve existing destination-wave3/4 recovery. No extra automatic heal from repeatedly buying HP items.
S1 破凉鞋 C cap5 move+12%,maxHP-1 each.
S2 顺风线圈 U cap3 while moving converts50% of positive movement bonus to weapon damage per copy.
S3 里程碑 R unique each90px actual distance trail point r36,30*P dmg,lifetime1sec,once per enemy per point. Distance accumulated only active combat; movement tests.
S4 冲浪板 U cap3 moving AS+15% percopy,stationary AS-10% percopy.
C1 易爆垃圾 R unique each real death queues r75,26*P blast; secondary kills can trigger it recursively with finite entities and queues.
C2 楔形环 U cap3 requiresC1; per causal chain each4secondary kills gives +10% radius, capped20%*copies; reset per causal root, no cross-chain accumulation.
C3 短引信 C cap3 weapon damage-8%,P+25% percopy (helps trail/contact/pickup too).
C4 大爆炸 R unique requiresC1; every8secondary kills in SAME root queues extra r160,80*P blast once per threshold. No synthetic kills/counters.
H1 厚壳 C cap5 maxHP+2,move-4% percopy.
H2 暗流板 U cap3 accepted NONLETHAL CONTACT hurt explodes r(90+10*copies),damage(8+4*copies)*maxHP*P. Enemy bullets do not trigger. Repeat copies improve damage & radius.
H3 刺壳 U cap3 aura every.5sec r40 from player center intersects enemy radius (distance<=40+enemy.r), dmg1.5*maxHP*copies*P. 25 direct aura/contactProc kills heal1,max3/wave; later chain kills do NOT credit. Heal only alive. Aura/contact explosions source-tagged.
H4 压力阀 R unique ALL accepted hurt damage+1; accepted nonlethal hurt starts4sec weapon+60%,H3damage*2, unchanged invulnerability. Lethal hurt never triggers any item/heal.
F1 废料火药 C cap10 weapon damage+8% each.
F2 长枪管 C cap5 AS+10%,range-6% each (rangefactor floor.6).
F3 弯钉 U cap3 slinger/shotgun pierce+1,coil jumps+1,rocket radius+12%,saw contactradius+4,fist range+10% percopy. No dead weapon class.
F4 双联扳机 R cap2 ONLY slinger/shotgun/rocket: shots+1/copy, per-projectiledamage*.75^copies. Other weapons unaffected. Requires owning>=1 eligible gun to offer/buy; keep inventory if later sell, UI says inactive until compatiblegun. Shotgun actual projectiles=pellets*shots, no max() arithmetic. One central profile authoritative for firing/render/UI. Rate unchanged beyondAS. F4 effect ratios nominal1.5x/1.6875x. Cap admitted bullets measured honestly.
P1 磁力回潮 U unique basepickup radius300 (then pickupbonuses),each8fuel launches10caps20*Pdamage.
P2 废料爆米花 R unique eachfuel queues2seeking shots18*Pdamage.
P3 钩尖 U cap3 requiresP1orP2, pickupbullets pierce+1/copy,magnetcaps homing.
P4 虹吸袋 C cap3 pickup+25%,coinrate-15% additive relativebase,pickupbulletdamage+25% percopy. Fuel unaffected.
Routes not classes, only direct-dependency gates; no two-modslot cap or old branch bonuses in expedition. Reuse primitives not accidental old II/III effects. Item channels use P once; gun profile uses weapon factor once; rocket blast does not multiply it again. Fist remnants explicitly weapon-derived secondary channel: keep existing flat30 baseline with NO tier change, apply weaponFactor once and no powerFactor; count actual remnant kills as secondary for chain. Document/test source distinction.

ELITES: W3/7/11/14/17/19 at35% timer,HP360/900/1500/2000/2800/3400,speed71.4,r28,contact1. Reserve ONE ordinary enemy cap slot like boss, prewarn, defer if unavailable, actual spawn only. Timer ends => survivesleave,nochest,noextraovertime. Boss rule unchanged. Kill spawns real separate chest pickup (not scrapcap), normal movement or sweep collects. Render unmistakable silhouette,HPbar,elite marker and chest cue. Do not allocate six virtual cap slots. W20 normal terminal behavior.

TERMINAL/CAPS: accepted hurt subtract damage, ifHP<=0 settle exactlyone lost/end; immediately return step before further bullets,enemies,proc,heal,kill,drop/pickup. Cancel pending blast/proc/rewards. Contact blast only AFTER accepted nonlethal CONTACT hurt. Preserve slice. Keep180enemies,420sharedbullets,250scrapobjects,12blasts/tick,180corpses/trailpoints,300FX. No arbitrary generation6 cutoff or forced loop gain<1: finite population/deaths settleonce plus bounded queues provide loop safety. New deferred work queues need explicit bounded sizes/coalescing with admitted/deferred/dropped metrics, never claim full admitted output when capped. No rule changes from graphics quality.

UI/AUDIO: preserve warm beach scrap palette and current character identity, distinctive item icons/shapes and Cplain/Ucutcorner/Rdoubleframe rarity cue + text. Desktop readable cards. Mobile390px choose3compact cards perrow + selected in-panel detail & buy area, not modal; >=44px interactions. Show rarity,unique orcount/cap,fullpositiveANDnegative effects,price/wallet/shortfall,purchase delta,weaponATK/rate/theoreticalsingle-targetDPS using actual pellet*volley semantics, live enemyHP on meaningful hurt. Details must not need hover. Rest start always accessible scrolling, no nested horizontal overflow. Reuse audio event identities but distinct elite/chest/item purchase feedback using existing synthesis. Real touch test plus desktop input. No new external assets required.

VALIDATION: retain slice tests unchanged; migrate only explicitly obsolete expedition schedule/mod progression tests, record oldname/newcoverage ledger. Preserve P1 transaction tests; shared reroll schema updates allowed not discarded invariants. Add tests for each item trigger,stack/cap/unique/prerequisite & invalid atomicity,RNGstates,no-arbitrage,firstcore,all19rests,coins/fuelmerge,zero-coincurse,sweep,chestrealspawn/collect/decline/stale,elite timing/reservation/escape,boss rarity weights,terminaldeathnoheal/proc,damagechannels,shotgunpellets*shots/liveprojectiletest,fullcooldownsprofilecounts,boundedqueues. Registry descriptions derive numbers or test match to avoid misleading labels. Author normal-input browser W1core->W2 realproc->rest itempurchase,desktop+CDPtouch; no internal state injection to satisfy playerflow. Browserfixture preserved repo. Static incomeledger seed/cohort distinct from actual gameplay. Build relativepath and no regressions baseline. Freeze commit,releaselease,then NEW independent Opus/DS review SAMEsha and root integration normalplay. P2 approval only implementationcheckpoint, P3 full20wavecohorts,performance,lateitemled and five-routeviability still needed.
NON-GOALS: meta,lockcards,itemsell,curse removal,newordinaryenemytypes,ember,newexternalassets,no performanceclaim,no fullgoalcompletion. Target19restdecision median<=20sec hypothesis measured later, not declare achieved.

AUTHORITATIVE V2 AMENDMENTS (these replace shorthand or conflicting queue/stat/accounting language above; apply EXPEDITION ONLY):

All deferred work uses one simple FIFO or scalar per queue; no partitioned engine.

pendingBlasts: FIFO capacity 512 entries. Drain at most 12 entries/tick. On enqueue:
admitted++; else deferred++ and do not append. Preserve pendingPeak. On loss, clear
and count all admitted-but-unprocessed entries as dropped. Never report deferred
work as processed output.

popcornFuelPending: one integer scalar in the range 0..1024 fuel units. Collecting
a scrap object admits min(object.fuelUnits, remaining capacity); overflow increments
deferred. Drain at most 4 fuel units/tick; each unit queues/emits two seeking shots,
subject to the existing 420 shared-bullet admission cap. Unprocessed admitted units
are not carried across sweep or rest.

The 1024-unit cap is based on the source: W20's timer spawns plus pockets, splitter
children, and boss additions produce under roughly 1024 normal scrap-producing deaths
in the full wave. A smaller 512-unit cap would truncate a legitimate fully merged
late pickup without a measured reason.

Use one shared FIFO capacity of 180 for corpses plus S3 trail points, not two
independent 180-cap arrays. Physical chest pickups use capacity 9; a frozen chest
choice list uses capacity 3.

At full capacity, discard the new request rather than creating synthetic work.
Expose admitted, deferred, and dropped counters for every capped queue. No claim
may equate admitted output with processed output.

stats = { damage, as, hpFlat, move, pickup, power }
moved = actual player displacement this fight tick, not merely held input
moveFactor = max(.4, 1 + stats.move + .12*S1 - .04*H1)
moveBonus = moved ? max(0, moveFactor - 1) : 0
weaponFactor = max(.1, 1 + stats.damage + .08*F1 - .08*C3 + .5*S2*moveBonus + (pressureActive ? .60 : 0))
asFactor = max(.2, 1 + stats.as + .10*F2 + (moved ? .15 : -.10)*S4)
powerFactor = max(.1, 1 + stats.power + .25*C3)
maxHp = max(3, 10 + stats.hpFlat + 2*H1 - S1)
pickupRadius = (P1 ? 300 : 155) * (1 + stats.pickup + .25*P4)
C1 radius = 75 * (1 + min(.20*C2, .10*floor(secondaryKillsInSameRoot / 4)))
C4 extra blast remains fixed at radius 160 and is not scaled by C2.
H3 damage = 1.5 * maxHp * H3copies * powerFactor * (pressureActive ? 2 : 1)
H3 healing: every 25 direct H2 contact-blast or H3 aura kills heals 1,
maximum 3 per wave; C1/C4/remnant/ordinary chain kills do not credit.
rangeFactor = max(.6, 1 - .06*F2 + (weaponId == "fist" ? .10*F3 : 0))
F3: slinger/shotgun pierce += F3; coil jumps += F3;
    rocket radius = 92*(1 + .12*F3); saw contact radius = 24 + 4*F3.
F4: eligible shots = 1 + F4; projectile damage *= .75^F4.
    shotgun projectiles = pellets * shots, never max(pellets, shots).

rateMilli = 200 * max(10, 100 - 15*P4copies) / 100
          = 200, 170, 140, or 110 milli-coins per raw unit
coinAccumulator += rawCash * rateMilli
wallet += floor(coinAccumulator / 1000)
coinAccumulator %= 1000

If a conversion curse exists, apply its integer multiplier to rateMilli; never apply it to fuelUnits. Store rawCash, fuelUnits, and collected separately on each scrap. Collection must be guarded by collected, not by rawCash > 0. A zero-coin collection still creates pickup FX and still triggers fuel-dependent procs. The fractional wallet remainder carries across collections.
When the 250-object scrap cap is reached, merge rawCash and fuelUnits into an existing uncollected object, or create a new object after purging collected ones. Never revive a collected object merely because it is the last array element. No cash or fuel is lost at the cap. Boss scrap has fuelUnits = 1.
Sweep collection credits cash and adds the collected fuel to a separate sweptFuelUnits metric exactly once, but does not enqueue popcorn, magnet, or other fight-only proc work. The player still receives full pickup FX even when the fractional cash delta is zero. Sweep work cannot carry into the next wave.
Reroll exact-repeat fallback deterministic order: weapons first, items second, catalog order, lowest unoffered legal candidate replacing last card in that row. If no row has an alternate, disable reroll without draws/spend/counters/events. Existing sold cards may become eligible after a reroll per normal purchase rules.

Terminology disclosure: the proposed counter named deferred counts requests rejected/discarded AT ADMISSION, not a hidden promise of future processing. Display/test it as admission rejection; dropped counts previously admitted work canceled at terminal/wave boundary. Processed/output counters count only actual work. This clarification does not change queue rules. Numeric under1024 wave estimate above is an unmeasured review rationale, not proof; P3 saturation profiling must check it.
Opus presentation guidance: full pickup FX even fractionalcoin; start-wave control near top/reward and accessible by scrolling, not below every card. P1 source has no current shotguncountbug; F4 introduces the need for pellets*shots.
