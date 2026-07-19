// Sanity harness for the combat engine: run many full auto-battles and check invariants.
// Usage: node prototype/test.js
const S = require('./combat.js');

const RUNS = 500;
const MAX_TURNS = 400;
let heroWins = 0, foeWins = 0, totalTurns = 0;
let sawCorrosion = false, sawResist = false, sawBlackout = false, sawStun = false, sawRegen = false;

for (let seed = 1; seed <= RUNS; seed++) {
  const state = S.newBattle(seed);
  let turns = 0;
  while (!state.winner) {
    S.stepAuto(state);
    if (++turns > MAX_TURNS) throw new Error(`seed ${seed}: battle did not terminate`);
    for (const u of state.units) {
      if (u.hp < 0 || u.hp > u.maxHp) throw new Error(`seed ${seed}: hp out of range for ${u.name}`);
      if (u.alive && u.hp === 0) throw new Error(`seed ${seed}: alive at 0 hp`);
      for (const c of u.cooldowns) if (c < 0) throw new Error(`seed ${seed}: negative cooldown`);
    }
  }
  totalTurns += turns;
  if (state.winner === 'hero') heroWins++; else foeWins++;
  const text = state.log.map((l) => l.text).join('\n');
  sawCorrosion ||= text.includes('Corrosion damage');
  sawResist ||= text.includes('resists');
  sawBlackout ||= text.includes('Heal Blackout');
  sawStun ||= text.includes('stasis');
  sawRegen ||= text.includes('regenerates');
}

// Mechanics must all be reachable in normal play.
for (const [name, seen] of Object.entries({ sawCorrosion, sawResist, sawBlackout, sawStun, sawRegen })) {
  if (!seen) throw new Error(`mechanic never fired across ${RUNS} battles: ${name}`);
}

// Affinity + deterministic RNG unit checks.
if (S.affinityEdge('ion', 'cryo') !== 1 || S.affinityEdge('cryo', 'ion') !== -1) throw new Error('affinity triangle wrong');
if (S.affinityEdge('umbral', 'ion') !== 0) throw new Error('umbral must be neutral');
const a = S.makeRng(42), b = S.makeRng(42);
if (a() !== b()) throw new Error('rng not deterministic');

console.log(`OK — ${RUNS} battles, hero win rate ${(100 * heroWins / RUNS).toFixed(1)}%, avg length ${(totalTurns / RUNS).toFixed(1)} turns`);
console.log('All mechanics fired: corrosion ticks, debuff resists, heal blackout, stasis, boss regen.');

// ---------------------------------------------------------------- gacha math

const M = require('./meta.js');
{
  const rng = S.makeRng(7);
  const p = M.newProfile();
  p.voidglass = 1e9;
  const N = 30000;
  let fives = 0, fours = 0, gap = 0, maxGap = 0, fourGap = 0, maxFourGap = 0;
  let lostFifty = false, fiftyChecked = 0;
  for (let i = 0; i < N; i++) {
    const r = M.pullOne(p, rng);
    gap++; fourGap++;
    if (r.rarity === 5) {
      fives++;
      maxGap = Math.max(maxGap, gap); gap = 0;
      maxFourGap = Math.max(maxFourGap, fourGap); fourGap = 0;
      if (lostFifty) {
        if (r.name !== M.FEATURED) throw new Error('50/50 guarantee violated');
        fiftyChecked++;
        lostFifty = false;
      } else if (r.name !== M.FEATURED) lostFifty = true;
    } else if (r.rarity === 4) {
      fours++;
      maxFourGap = Math.max(maxFourGap, fourGap); fourGap = 0;
    }
  }
  if (maxGap > 90) throw new Error(`hard pity violated: gap ${maxGap}`);
  if (maxFourGap > 10) throw new Error(`4-star per-10 guarantee violated: gap ${maxFourGap}`);
  const rate5 = fives / N;
  if (rate5 < 0.012 || rate5 > 0.024) throw new Error(`5-star effective rate off: ${rate5}`);
  if (fiftyChecked < 5) throw new Error('50/50 guarantee path barely exercised');
  console.log(`Gacha OK — ${N} pulls: 5★ rate ${(100 * rate5).toFixed(2)}% (consolidated), longest 5★ drought ${maxGap}, guarantee honored ${fiftyChecked}×`);
}

// ---------------------------------------------------------------- encounters

function winRate(heroDefs, encId, runs) {
  const foes = M.encounterById(encId).foes;
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const st = S.newBattle(seed, heroDefs, foes);
    let t = 0;
    while (!st.winner) {
      S.stepAuto(st);
      if (++t > MAX_TURNS) throw new Error(`${encId} seed ${seed}: no termination`);
    }
    if (st.winner === 'hero') wins++;
  }
  return wins / runs;
}

{
  const starters = M.newProfile();
  const startDefs = M.squadDefs(starters);

  const w1 = winRate(startDefs, 'sweep', 200);
  if (w1 < 0.7) throw new Error(`Perimeter Sweep too hard for starters: ${w1}`);

  const w2starter = winRate(startDefs, 'cryocell', 200);

  // A counter-built squad: ion attackers + accuracy gear + a healer.
  const counter = ['Vex Marlowe', 'Juno-9', 'Mika Tan', 'Brick-7', 'Ora Chen'].map((n) => M.UNITS[n].def);
  const geared = counter.map((d) =>
    d.role === 'Support' ? M.withGear(d, 'targeting') : d.role === 'Attack' ? M.withGear(d, 'precision') : M.withGear(d, 'velocity'));
  const w2counter = winRate(geared, 'cryocell', 200);
  if (w2counter - w2starter < 0.2) throw new Error(`affinity check too weak: starter ${w2starter} vs counter ${w2counter}`);
  if (w2counter < 0.55) throw new Error(`Cryo Cell unbeatable even when countered: ${w2counter}`);

  const fiveStars = S.HEROES.map((d) => d);
  const w3 = winRate(fiveStars, 'warden', 200);
  if (w3 < 0.6 || w3 > 0.98) throw new Error(`Warden out of band with full 5★ squad: ${w3}`);

  console.log(`Encounters OK — Sweep(starters) ${(100 * w1).toFixed(0)}%, CryoCell starters ${(100 * w2starter).toFixed(0)}% vs countered ${(100 * w2counter).toFixed(0)}%, Warden(5★s) ${(100 * w3).toFixed(0)}%`);
}
