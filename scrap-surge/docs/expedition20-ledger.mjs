export const DUR=[20,22,24,26,28,28,30,30,32,40,32,34,34,36,45,38,38,40,40,75];
export const RATE=[3.1,3.4,3.7,4.0,4.4,4.6,4.8,5.0,5.2,5.4,5.6,5.8,6.0,6.2,6.4,6.6,6.8,7.0,7.4,7.8];
export const POCKETS=[
 [[6,12,'ring'],[14,12,'ring']],
 [[5,13,'ring'],[12,13,'ring'],[18,13,'ring']],
 [[6,14,'ring'],[14,14,'ring'],[21,14,'ring']],
 [[6,14,'ring'],[13,14,'ring'],[20,14,'ring']],
 [[5,15,'ring'],[12,15,'ring'],[19,15,'ring'],[25,15,'ring']],
 [[6,15,'stream'],[13,15,'stream'],[20,15,'stream']],
 [[6,16,'stream'],[14,16,'stream'],[22,16,'stream']],
 [[5,16,'stream'],[13,16,'stream'],[21,16,'stream'],[27,16,'stream']],
 [[6,17,'stream'],[14,17,'stream'],[22,17,'stream'],[29,17,'stream']],
 [[6,17,'ring'],[14,17,'ring'],[22,17,'ring'],[30,17,'ring'],[36,17,'ring']],
 [[8,12,'stream'],[12,12,'stream'],[16,12,'stream'],[20,12,'stream'],[24,12,'stream'],[28,12,'stream']],
 [[8,12,'two-cluster'],[20,12,'two-cluster'],[28,18,'two-cluster']],
 [[7,18,'two-cluster'],[14,18,'two-cluster'],[21,18,'two-cluster'],[28,18,'two-cluster']],
 [[8,12,'stream'],[11.5,12,'stream'],[15,12,'stream'],[18.5,12,'stream'],[22,12,'stream'],[25.5,12,'stream'],[29,12,'stream']],
 [[6,20,'two-cluster'],[14,20,'two-cluster'],[22,20,'two-cluster'],[30,20,'two-cluster'],[38,20,'two-cluster']],
 [[8,12,'stream'],[12,12,'stream'],[16,12,'stream'],[20,12,'stream'],[24,12,'stream'],[28,12,'stream'],[32,12,'stream'],[35,12,'stream']],
 [[6,20,'two-cluster'],[24,20,'two-cluster']],
 [[6,18,'ring'],[20,18,'ring'],[32,18,'two-cluster']],
 [[5,16,'ring'],[10,10,'stream'],[15,16,'ring'],[20,10,'stream'],[25,16,'ring'],[30,10,'stream'],[35,16,'ring']],
 [[6,12,'ring'],[20,12,'ring'],[34,12,'ring'],[50,12,'ring'],[66,12,'ring']],
];
// bag/runner/can/splitter/spitter percentages
export const MIX=[
 [87,13,0,0,0],[62,26,12,0,0],[62,24,14,0,0],[56,26,18,0,0],[52,26,22,0,0],
 [46,24,18,12,0],[44,24,18,14,0],[42,24,18,16,0],[40,24,18,18,0],[38,24,18,20,0],
 [40,22,22,16,0],[34,20,18,12,16],[32,20,18,14,16],[30,20,18,16,16],[28,20,18,18,16],
 [26,20,18,20,16],[24,20,18,22,16],[30,20,16,20,14],[32,20,16,18,14],[26,20,16,22,16],
];
export const PMIX=[
 [58,42,0,0,0],[56,28,16,0,0],[56,28,16,0,0],[54,26,20,0,0],[50,26,24,0,0],
 [42,24,22,12,0],[40,24,22,14,0],[38,24,22,16,0],[36,24,22,18,0],[34,24,22,20,0],
 [38,22,24,16,0],[32,20,20,12,16],[30,20,20,14,16],[28,20,20,16,16],[26,20,20,18,16],
 [24,20,20,20,16],[24,20,18,22,16],[24,20,18,24,14],[24,20,18,24,14],[20,20,18,26,16],
];
export const BAG=[17,17,17,17,17,20,20,20,20,20,24,24,24,24,24,24,24,17,17,24];
export const MULT=[1,1,1.15,1.3,1.45,1.6,1.75,1.9,2.1,2.3,2.5,2.7,2.9,3.15,3.4,3.7,4.0,4.35,4.7,5.1];
export const BASE={runner:19,can:75,splitter:40,chip:8,spitter:55};
export const VALUE=[2,2,4,3,4];
export const CHIP_VALUE=1;
export const CHIPS_PER_SPLIT=2;
export function hps(i){
 const m=MULT[i];
 return [BAG[i],Math.round(19*m),Math.round(75*m),Math.round(40*m),Math.round(55*m),
         Math.min(BAG[i],Math.round(8*m))];
}
export function row(i){
 const hp=hps(i), bm=MIX[i].map(x=>x/100), pm=PMIX[i].map(x=>x/100);
 const nb=DUR[i]*RATE[i], np=POCKETS[i].reduce((s,p)=>s+p[1],0);
 const avgB=hp.slice(0,5).reduce((s,h,j)=>s+h*bm[j],0);
 const avgP=hp.slice(0,5).reduce((s,h,j)=>s+h*pm[j],0);
 const ehp=nb*avgB+np*avgP;
 const splitValue=CHIPS_PER_SPLIT*CHIP_VALUE;
 const inc=nb*bm.reduce((s,x,j)=>s+x*(VALUE[j]+(j===3?splitValue:0)),0)
          +np*pm.reduce((s,x,j)=>s+x*(VALUE[j]+(j===3?splitValue:0)),0);
 return {hp,nb,np,ehps:ehp/DUR[i],income:inc};
}
export function ledger(){
  let ci = 0;
  const out = [];
  for (let i = 0; i < 20; i++) {
    const r = row(i);
    ci += r.income;
    out.push({ wave: i + 1, hp: r.hp.join('/'), base: Math.round(r.nb), pocket: r.np,
               ehps: Math.round(r.ehps), income: Math.round(r.income), cumIncome: Math.round(ci) });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` && !process.argv[2]) {
  for (const r of ledger())
    console.log(`${r.wave}\t${r.hp}\t${r.base}+${r.pocket}\t${r.ehps}\t${r.income}\t${r.cumIncome}`);
}

/**
 * Static economy and DPS estimates. These are NOT measurements: they assume a
 * stated collection rate, two chips per successful splitter, no boss drops and
 * no overkill modelling, using the legal build route near the end of this file.
 */

// Collector sensitivity. 70% / 85% / 100% of spawned value.
export function incomeAt(rate) {
  let cum = 0;
  const out = [];
  for (let i = 0; i < 20; i++) {
    cum += row(i).income * rate;
    out.push(Math.round(cum));
  }
  return out;
}

// Nominal DPS. Interval never changes with tier. Coil reports one target in
// gunDps() and its full chain in gunGroupDps(); other guns report their normal
// single-target output in both helpers.
export const GUN_DPS = {
  slinger: { interval: 0.25, damage: 20, t1: 1, t2: 2, t2Mult: 1.0 },
  shotgun: { interval: 0.85, damage: 15, t1: 5, t2: 7, t2Mult: 1.4 },
  saw: { interval: 0.21, damage: 24, t1: 1, t2: 2, t2Mult: 1.0 },
  coil: { interval: 0.8, damage: 23, t1: 5, t2: 7, t2Mult: 1.4, group: true },
  rocket: { interval: 1.2, damage: 45, t1: 1, t2: 2, t2Mult: 1.0 },
  fist: { interval: 0.6, damage: 48, t1: 1, t2: 1, t2Mult: 2.0 },
};

export function gunDps(id, tier) {
  const g = GUN_DPS[id];
  const hits = tier === 1 ? g.t1 : g.t2;
  const mult = tier === 1 ? 1 : g.t2Mult;
  return Math.round(((g.damage * (g.group ? 1 : hits) * mult) / g.interval) * 100) / 100;
}

export function gunGroupDps(id, tier) {
  const g = GUN_DPS[id];
  const hits = tier === 1 ? g.t1 : g.t2;
  const value = gunDps(id, tier) * (g.group ? hits : 1);
  return Math.round(value * 100) / 100;
}

export const BASE_PRICE = {
  slinger: 15, shotgun: 22, saw: 21, coil: 25, rocket: 26, fist: 18,
};

// Integer prices: ceil(B * mult * (w + 4) / 5). No floating point factor.
export function price(base, mult, wave) {
  return Math.ceil((base * mult * (wave + 4)) / 5);
}

// Tier-II capacity by wave, from the agreed ramp.
export const TIER2_CAP = { 8: 1, 10: 2, 12: 3, 14: 4, 16: 5, 18: 6 };

// One legal six-gun route: the starting slinger costs 0, then five new guns and
// one tier-II upgrade per capacity shop. This is a planning route, not a claim
// that every seed deals these offers without rerolls.
export const INITIAL_SLINGER_COST = 0;
export const LEGAL_ROUTE = [
  { wave: 2, purchases: [{ id: 'shotgun', tier: 1 }, { id: 'coil', tier: 1 }] },
  { wave: 4, purchases: [{ id: 'rocket', tier: 1 }] },
  { wave: 6, purchases: [] },
  { wave: 8, purchases: [{ id: 'saw', tier: 1 }, { id: 'slinger', tier: 2 }] },
  { wave: 10, purchases: [{ id: 'shotgun', tier: 2 }] },
  { wave: 12, purchases: [{ id: 'fist', tier: 1 }, { id: 'coil', tier: 2 }] },
  { wave: 14, purchases: [{ id: 'rocket', tier: 2 }] },
  { wave: 16, purchases: [{ id: 'saw', tier: 2 }] },
  { wave: 18, purchases: [{ id: 'fist', tier: 2 }] },
];

export function routeCost(route) {
  return route.purchases.reduce(
    (sum, p) => sum + price(BASE_PRICE[p.id], p.tier === 1 ? 1 : 4, route.wave),
    0,
  );
}

export const TOTAL_BUILD_COST =
  INITIAL_SLINGER_COST + LEGAL_ROUTE.reduce((sum, r) => sum + routeCost(r), 0);

// Static shop ledger. Income through the wave ending immediately before the
// shop includes 2 chips per successful splitter. It does not model boss drops,
// enemy-cap rejections, or an over-cap spitter falling back to a bag.
export function shopLedger() {
  const rates = [0.7, 0.85, 1.0];
  const incomes = rates.map(incomeAt);
  let spend = INITIAL_SLINGER_COST;
  return LEGAL_ROUTE.map((route) => {
    const cost = routeCost(route);
    spend += cost;
    const idx = route.wave - 1;
    const income = incomes.map((series) => series[idx]);
    return {
      wave: route.wave,
      purchases: route.purchases
        .map((p) => `${p.id}${p.tier === 1 ? '' : ' II'}`)
        .join(' + '),
      cost,
      spend,
      income70: income[0],
      income85: income[1],
      income100: income[2],
      balance70: income[0] - spend,
      balance85: income[1] - spend,
      balance100: income[2] - spend,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'economy') {
  console.log('# DPS: single target (coil group in parentheses)');
  for (const id of Object.keys(GUN_DPS)) {
    const extra = GUN_DPS[id].group
      ? ` (${gunGroupDps(id, 1).toFixed(2)}, ${gunGroupDps(id, 2).toFixed(2)})`
      : '';
    console.log(id, gunDps(id, 1).toFixed(2), gunDps(id, 2).toFixed(2) + extra);
  }
  console.log('# slinger tier II at W8 =', price(15, 4, 8));
  console.log('# legal route:');
  for (const r of shopLedger()) {
    console.log(
      `W${r.wave}\t${r.purchases}\tcost=${r.cost}\tspend=${r.spend}` +
      `\tincome=${r.income70}/${r.income85}/${r.income100}` +
      `\tbalance=${r.balance70}/${r.balance85}/${r.balance100}`,
    );
  }
  console.log('# total build cost =', TOTAL_BUILD_COST);
  console.log('# cash at 70/85/100% by W10 and W18');
  const i70 = incomeAt(0.7), i85 = incomeAt(0.85), i100 = incomeAt(1.0);
  for (const w of [10, 18, 20])
    console.log(`W${w}`, i70[w - 1], i85[w - 1], i100[w - 1]);
}
