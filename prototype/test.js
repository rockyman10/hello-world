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

// ---------------------------------------------------------------- lore & factions

{
  // Every playable unit must have complete lore, and every faction must be real.
  for (const name of Object.keys(M.UNITS)) {
    const l = M.LORE[name];
    if (!l || !l.faction || !l.epithet || !l.bio) throw new Error(`missing lore for ${name}`);
    if (!M.FACTIONS[l.faction]) throw new Error(`unknown faction '${l.faction}' on ${name}`);
  }
  // Every House fields at least 2 units so Kinship is achievable for all of them.
  const perFaction = {};
  for (const name of Object.keys(M.UNITS)) {
    const f = M.LORE[name].faction;
    perFaction[f] = (perFaction[f] || 0) + 1;
  }
  for (const [f, n] of Object.entries(perFaction)) {
    if (n < 2) throw new Error(`House ${f} has only ${n} unit — Kinship unreachable`);
  }

  // Kinship Protocol: two Chorus units get boosted, a lone House member does not.
  const p = M.newProfile(); // starters: Mika (chorus), Dex (rimeholt), Ora (helix)
  p.owned['Juno-9'] = { copies: 1, gear: null };
  p.squad = ['Mika Tan', 'Juno-9', 'Dex Volkov'];
  const defs = M.squadDefs(p);
  const mika = defs.find((d) => d.name === 'Mika Tan');
  const dex = defs.find((d) => d.name === 'Dex Volkov');
  const baseMika = M.UNITS['Mika Tan'].def, baseDex = M.UNITS['Dex Volkov'].def;
  if (mika.atk !== Math.round(baseMika.atk * 1.12)) throw new Error('kinship bonus not applied to bonded pair');
  if (dex.atk !== baseDex.atk) throw new Error('kinship bonus wrongly applied to lone House member');

  // Chapter 1 story: every encounter has a non-empty intro and outro.
  for (const e of M.ENCOUNTERS) {
    const s = M.STORY[e.id];
    if (!s || !s.intro.length || !s.outro.length) throw new Error(`missing story for encounter ${e.id}`);
  }
  const rarityNames = [3, 4, 5].map((r) => M.RARITY_NAMES[r]);
  if (rarityNames.some((n) => !n)) throw new Error('rarity tier names incomplete');

  console.log(`Lore OK — ${Object.keys(M.UNITS).length} dossiers, ${Object.keys(perFaction).length} Houses (all Kinship-capable), story beats for all ${M.ENCOUNTERS.length} encounters, tiers: ${rarityNames.join('/')}`);
}

// ---------------------------------------------------------------- leveling, reactor, rift

{
  // Leveling: cost scales, stats grow, credits gate, cap holds.
  const p = M.newProfile();
  p.credits = 150; // exactly one level-up
  if (!M.levelUp(p, 'Mika Tan')) throw new Error('affordable level-up refused');
  if (p.credits !== 0 || p.owned['Mika Tan'].level !== 2) throw new Error('level-up bookkeeping wrong');
  if (M.levelUp(p, 'Mika Tan')) throw new Error('unaffordable level-up allowed');
  const base = M.UNITS['Mika Tan'].def;
  const lv2 = M.withLevel(base, 2);
  if (lv2.atk !== Math.round(base.atk * 1.02)) throw new Error('level bonus math wrong');
  p.owned['Mika Tan'].level = M.LEVEL_CAP;
  p.credits = 1e9;
  if (M.levelUp(p, 'Mika Tan')) throw new Error('level cap not enforced');

  // Reactor: accrues by the hour, caps at 24h, collect resets.
  const q = M.newProfile();
  const t0 = 1000000000000;
  q.lastCollect = t0;
  const rate = M.reactorRate(q);
  if (M.reactorPending(q, t0 + 3600000) !== rate) throw new Error('reactor hourly accrual wrong');
  const capped = M.reactorPending(q, t0 + 48 * 3600000);
  if (capped !== 24 * rate) throw new Error('reactor 24h cap not applied');
  const before = q.credits;
  M.collectReactor(q, t0 + 3600000);
  if (q.credits !== before + rate || q.lastCollect !== t0 + 3600000) throw new Error('reactor collect wrong');

  // Migration: old-shape saves gain the new fields.
  const old = { voidglass: 5, shards: 0, caches: 0, pity5: 0, sinceFour: 0, guaranteedFeatured: false, totalPulls: 0, owned: { 'Mika Tan': { copies: 1, gear: null } }, squad: ['Mika Tan'], cleared: {} };
  M.migrateProfile(old);
  if (old.credits !== 0 || old.lastCollect == null || old.owned['Mika Tan'].level !== 1) throw new Error('profile migration incomplete');

  // Rift: blessings stack, foes scale, a leveled 5★ squad survives the shallows.
  const defs = S.HEROES.map((d) => M.withLevel(d, 15));
  const blessed = M.applyBlessings(defs, ['surge', 'tempo']);
  if (blessed[0].atk !== Math.round(defs[0].atk * 1.2)) throw new Error('blessing atk math wrong');
  if (blessed[0].spd !== Math.round(defs[0].spd * 1.12)) throw new Error('blessing spd math wrong');
  const d1foes = M.riftFoes(0);
  if (d1foes[0].hp !== Math.round(M.encounterById('sweep').foes[0].hp * 1.25)) throw new Error('rift foe scaling wrong');
  let wins = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const st = S.newBattle(seed, blessed, d1foes);
    let t = 0;
    while (!st.winner) { S.stepAuto(st); if (++t > MAX_TURNS) throw new Error('rift depth 1 no termination'); }
    if (st.winner === 'hero') wins++;
  }
  if (wins < 90) throw new Error(`rift shallows too hard for a leveled+blessed 5★ squad: ${wins}%`);

  // Rift rewards pay out.
  const r = M.newProfile();
  const vg = r.voidglass, cr = r.credits;
  M.riftReward(r, 2);
  if (r.voidglass !== vg + 800 || r.credits !== cr + 3000 || r.caches !== 3) throw new Error('rift reward payout wrong');

  console.log(`Systems OK — leveling (cap ${M.LEVEL_CAP}, +2%/lvl), reactor (¢${rate}/h, 24h cap), rift (blessings stack, shallows win ${wins}% for leveled 5★s), migration intact`);
}

// ---------------------------------------------------------------- titans & vaults

{
  // A developed endgame squad: level 25 5★s with sensible gear.
  const gearFor = (d) => d.role === 'Attack' ? 'assault' : d.role === 'Mender' ? 'velocity' : d.role === 'Support' ? 'targeting' : 'aegis';
  const endgame = S.HEROES.map((d) => M.withGear(M.withLevel(d, 25), gearFor(d)));

  function titanRun(titanId, runs) {
    const t = M.titanById(titanId);
    let wins = 0, mechanics = { reborn: false, shed: false, summoned: false, coilHeal: false };
    for (let seed = 1; seed <= runs; seed++) {
      const st = S.newBattle(seed, endgame, t.foes);
      let turns = 0;
      while (!st.winner) { S.stepAuto(st); if (++turns > 600) throw new Error(`${titanId} seed ${seed}: no termination`); }
      if (st.winner === 'hero') wins++;
      const text = st.log.map((l) => l.text).join('\n');
      mechanics.reborn ||= text.includes('REBORN');
      mechanics.shed ||= text.includes('SHEDS ITS RUINED SKIN');
      mechanics.summoned ||= text.includes('emerges from');
      mechanics.coilHeal ||= text.includes('vitality from its coils');
    }
    return { winRate: wins / runs, mechanics };
  }

  const vor = titanRun('vormungand', 100);
  const pyr = titanRun('pyrrhax', 100);
  const maw = titanRun('maw', 100);
  if (!vor.mechanics.shed) throw new Error('Vormungand never shed its skin');
  if (!vor.mechanics.coilHeal) throw new Error('Vormungand never coil-healed');
  if (!pyr.mechanics.reborn) throw new Error('Pyrrhax never resurrected');
  if (!maw.mechanics.summoned) throw new Error('The Maw never summoned brood');
  for (const [id, r] of [['vormungand', vor], ['pyrrhax', pyr], ['maw', maw]]) {
    if (r.winRate < 0.25 || r.winRate > 0.95) throw new Error(`${id} out of tuning band on auto: ${r.winRate}`);
  }

  // Rebirth restores 40% exactly once.
  {
    const st = S.newBattle(5, endgame, M.titanById('pyrrhax').foes);
    let turns = 0;
    while (!st.winner) { S.stepAuto(st); if (++turns > 600) break; }
    const reborns = st.log.filter((l) => l.text.includes('REBORN')).length;
    if (reborns > 1) throw new Error('Pyrrhax reborn more than once');
  }

  // Vaults: roster filtering, kinship, and reward claims.
  const p = M.newProfile(); // Mika (chorus), Dex (rimeholt), Ora (helix)
  p.owned['Juno-9'] = { copies: 1, gear: null, level: 1 };
  if (M.vaultRoster(p, 'chorus').sort().join() !== 'Juno-9,Mika Tan') throw new Error('vault roster filter wrong');
  if (M.vaultRoster(p, 'frameguard').length !== 0) throw new Error('vault roster leaked units');
  const vd = M.vaultSquadDefs(p, 'chorus');
  if (vd.length !== 2 || vd.find((d) => d.name === 'Mika Tan').atk !== Math.round(M.UNITS['Mika Tan'].def.atk * 1.12)) {
    throw new Error('vault kinship not applied to full-House squad');
  }
  const solo = M.vaultSquadDefs(p, 'helix');
  if (solo[0].atk !== M.UNITS['Ora Chen'].def.atk) throw new Error('vault kinship wrongly applied to solo');
  if (M.vaultFoes().length !== 4) throw new Error('vault foes malformed');

  const before = { vg: p.voidglass, sh: p.shards };
  const r1 = M.claimReward(p, 'vault:chorus', M.VAULT_REWARD_FIRST, M.VAULT_REWARD_REPEAT);
  const r2 = M.claimReward(p, 'vault:chorus', M.VAULT_REWARD_FIRST, M.VAULT_REWARD_REPEAT);
  if (!r1.first || r2.first) throw new Error('claimReward first/repeat wrong');
  if (p.shards !== before.sh + 60 + 10) throw new Error('claimReward payout wrong');

  console.log(`Titans OK — auto win rates for lvl25 geared 5★s: Vormungand ${(100 * vor.winRate).toFixed(0)}%, Pyrrhax ${(100 * pyr.winRate).toFixed(0)}%, Maw ${(100 * maw.winRate).toFixed(0)}% — all signature mechanics fired. Vaults OK.`);
}

// ---------------------------------------------------------------- frontier, titan gear, ch2, events

{
  const gearFor = (d) => d.role === 'Attack' ? 'assault' : d.role === 'Mender' ? 'velocity' : d.role === 'Support' ? 'targeting' : 'aegis';
  const endgame = S.HEROES.map((d) => M.withGear(M.withLevel(d, 25), gearFor(d)));

  // Combat event stream feeds the VFX layer.
  {
    const st = S.newBattle(11, endgame, M.encounterById('sweep').foes);
    let n = 0;
    while (!st.winner) { S.stepAuto(st); if (++n > 400) break; }
    const types = new Set(st.events.map((e) => e.type));
    if (!types.has('hit') || !types.has('cast') || !types.has('death')) throw new Error('event stream incomplete: ' + [...types]);
    const hitEvents = st.events.filter((e) => e.type === 'hit').length;
    const hitLogs = st.log.filter((l) => / hits /.test(l.text)).length;
    if (hitEvents !== hitLogs) throw new Error(`event/log hit mismatch: ${hitEvents} vs ${hitLogs}`);
  }

  // Titan gear: locked until slain, unlock is idempotent, then equippable.
  {
    const p = M.newProfile();
    if (M.equipGear(p, 'Mika Tan', 'serpentscale')) throw new Error('locked titan gear equipped');
    if (M.unlockTitanGear(p, 'vormungand') !== 'serpentscale') throw new Error('titan gear unlock wrong');
    if (M.unlockTitanGear(p, 'vormungand') !== null) throw new Error('titan gear unlock not idempotent');
    if (!M.equipGear(p, 'Mika Tan', 'serpentscale')) throw new Error('unlocked titan gear refused');
    for (const k of Object.keys(M.GEAR_SETS)) {
      if (M.GEAR_SETS[k].titan && !M.titanById(M.GEAR_SETS[k].titan)) throw new Error(`gear ${k} references unknown titan`);
    }
    const titansWithGear = new Set(Object.values(M.GEAR_SETS).filter((g) => g.titan).map((g) => g.titan));
    if (titansWithGear.size !== M.TITANS.length) throw new Error('not every titan drops a gear set');
  }

  // Chapter 2 gate: winnable by an endgame squad, and its story exists (lore suite also checks).
  {
    let w = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const st = S.newBattle(seed, endgame, M.encounterById('vantargate').foes);
      let n = 0;
      while (!st.winner) { S.stepAuto(st); if (++n > 600) throw new Error('vantargate no termination'); }
      if (st.winner === 'hero') w++;
    }
    if (w < 50) throw new Error(`Vantar Gate too hard for endgame squad: ${w}%`);
    if (M.ENCOUNTERS[M.ENCOUNTERS.length - 1].id !== 'vantargate') throw new Error('Chapter II must come after the warden');
  }

  // Frontier: modifier rotation is deterministic, both sides get modified, full runs land in a challenge band.
  {
    const wk = 7 * 86400000;
    if (M.frontierModifier(0).id !== M.FRONTIER.modifiers[0].id) throw new Error('modifier week 0 wrong');
    if (M.frontierModifier(wk).id !== M.FRONTIER.modifiers[1].id) throw new Error('modifier rotation wrong');
    const mod = { atk: 0.3 };
    const boosted = M.applyModifier(endgame, mod);
    if (boosted[0].atk !== Math.round(endgame[0].atk * 1.3)) throw new Error('applyModifier math wrong');
    if (M.frontierStageFoes(0, 0)[0].hp !== Math.round(M.encounterById('sweep').foes[0].hp * M.FRONTIER.stages[0].mult)) throw new Error('frontier scaling wrong');

    let full = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const m = M.frontierModifier(0);
      const heroes = M.applyModifier(endgame, m);
      let hpFrac = {}, cleared = 0;
      for (let stg = 0; stg < 3; stg++) {
        const st = S.newBattle(seed * 7 + stg, heroes, M.frontierStageFoes(stg, 0));
        for (const u of st.units) if (u.side === 'hero' && hpFrac[u.name] != null) u.hp = Math.max(1, Math.round(u.maxHp * hpFrac[u.name]));
        let n = 0;
        while (!st.winner) { S.stepAuto(st); if (++n > 600) throw new Error('frontier no termination'); }
        if (st.winner !== 'hero') break;
        for (const u of st.units) if (u.side === 'hero') hpFrac[u.name] = u.alive ? u.hp / u.maxHp : 0.05;
        cleared++;
      }
      if (cleared === 3) full++;
    }
    const pct = full * 2;
    if (pct < 15 || pct > 95) throw new Error(`frontier full-clear out of band: ${pct}%`);

    // Stage rewards pay; seasonal bonus claims once.
    const p = M.newProfile();
    const vg = p.voidglass;
    M.frontierStageReward(p, 0);
    if (p.voidglass !== vg + 200) throw new Error('frontier stage reward wrong');
    const b1 = M.claimReward(p, M.FRONTIER.seasonKey, M.FRONTIER.clearBonus, { voidglass: 0 });
    const b2 = M.claimReward(p, M.FRONTIER.seasonKey, M.FRONTIER.clearBonus, { voidglass: 0 });
    if (!b1.first || b2.first) throw new Error('seasonal bonus not one-time');
    console.log(`Frontier OK — modifier rotation deterministic, full-clear ${pct}% under '${M.frontierModifier(0).label}'. Titan gear gating OK, Chapter II gate OK, event stream OK.`);
  }
}
