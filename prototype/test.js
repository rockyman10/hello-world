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
