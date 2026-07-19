/*
 * STARFALL: ECLIPSE PROTOCOL — combat engine prototype
 * RAID-style: turn meter, per-skill cooldowns, buff/debuff warfare,
 * ACC-vs-RES landing rolls, affinity triangle + neutral Umbral.
 * Pure logic, no DOM — runs in browser (window.Starfall) and node (module.exports).
 */

const METER_MAX = 1000;

// Ion beats Cryo beats Plasma beats Ion. Umbral is outside the triangle.
const AFFINITY_BEATS = { ion: 'cryo', cryo: 'plasma', plasma: 'ion' };

const EFFECTS = {
  corrosion:    { kind: 'debuff', label: 'Corrosion',        tickPct: 0.05, maxStacks: 3 },
  armorBreach:  { kind: 'debuff', label: 'Armor Breach',     statMod: { def: -0.6 } },
  jam:          { kind: 'debuff', label: 'Jam',              statMod: { spd: -0.3, atk: -0.25 } },
  stasis:       { kind: 'debuff', label: 'Stasis Lock',      stun: true },
  healBlackout: { kind: 'debuff', label: 'Heal Blackout' },
  stims:        { kind: 'buff',   label: 'Combat Stims',     statMod: { atk: 0.25, spd: 0.15 } },
  plating:      { kind: 'buff',   label: 'Reactive Plating', statMod: { def: 0.6 } },
};

// Deterministic RNG (mulberry32) so battles are replayable/testable by seed.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function affinityEdge(att, def) {
  if (att === 'umbral' || def === 'umbral') return 0;
  if (AFFINITY_BEATS[att] === def) return 1;
  if (AFFINITY_BEATS[def] === att) return -1;
  return 0;
}

function effStat(unit, stat) {
  let mult = 1;
  for (const e of unit.effects) {
    const mod = EFFECTS[e.type].statMod;
    if (mod && mod[stat]) mult += mod[stat];
  }
  if (stat === 'atk' && unit.enrage) mult += unit.enrage * (unit.enrageStacks || 0);
  return Math.max(0, unit.base[stat] * mult);
}

function hasEffect(unit, type) {
  return unit.effects.some((e) => e.type === type);
}

function makeUnit(def, side, idx) {
  return {
    id: side + idx,
    side,
    name: def.name,
    affinity: def.affinity,
    role: def.role,
    base: { atk: def.atk, def: def.def, spd: def.spd },
    maxHp: def.hp,
    hp: def.hp,
    shield: 0,
    critRate: def.critRate,
    critDmg: def.critDmg,
    acc: def.acc,
    res: def.res,
    skills: def.skills,
    cooldowns: def.skills.map(() => 0),
    passive: def.passive || null,
    enrage: def.enrage || 0,
    enrageStacks: 0,
    effects: [], // { type, turns }
    meter: 0,
    alive: true,
  };
}

function livingAllies(state, unit) {
  return state.units.filter((u) => u.alive && u.side === unit.side);
}
function livingEnemies(state, unit) {
  return state.units.filter((u) => u.alive && u.side !== unit.side);
}

function log(state, text, cls) {
  state.log.push({ text, cls: cls || '', turn: state.turnCount });
}

// ---------------------------------------------------------------- damage/heal

function dealDamage(state, attacker, target, mult) {
  const atk = effStat(attacker, 'atk');
  const def = effStat(target, 'def');
  const edge = affinityEdge(attacker.affinity, target.affinity);

  let dmg = atk * mult * (1 - def / (def + 900));
  dmg *= 0.9 + state.rng() * 0.2;

  let tag = '';
  const weak = edge === -1 && state.rng() < 0.3;
  if (weak) {
    dmg *= 0.7;
    tag = ' (weak hit)';
  } else if (state.rng() < attacker.critRate + (edge === 1 ? 0.3 : 0)) {
    dmg *= attacker.critDmg;
    tag = ' (CRIT!)';
  }
  dmg = Math.round(dmg);

  const absorbed = Math.min(target.shield, dmg);
  target.shield -= absorbed;
  target.hp = Math.max(0, target.hp - (dmg - absorbed));
  log(state, `${attacker.name} hits ${target.name} for ${dmg}${tag}`, tag ? 'crit' : '');
  if (target.hp === 0) kill(state, target);
  return dmg;
}

function heal(state, source, target, pctOfMax) {
  if (!target.alive) return;
  if (hasEffect(target, 'healBlackout')) {
    log(state, `${target.name} cannot be healed (Heal Blackout)!`, 'debuff');
    return;
  }
  const amount = Math.round(target.maxHp * pctOfMax);
  target.hp = Math.min(target.maxHp, target.hp + amount);
  log(state, `${source.name} heals ${target.name} for ${amount}`, 'heal');
}

function kill(state, unit) {
  unit.alive = false;
  unit.effects = [];
  unit.meter = 0;
  log(state, `${unit.name} is destroyed!`, 'kill');
}

// ---------------------------------------------------------------- effects

function tryApplyEffect(state, caster, target, spec) {
  // spec: { type, turns, chance }
  if (!target.alive) return;
  if (state.rng() >= (spec.chance ?? 1)) return;

  const meta = EFFECTS[spec.type];
  if (meta.kind === 'debuff') {
    // ACC vs RES, with affinity disadvantage halving the land chance (RAID-style).
    const edge = affinityEdge(caster.affinity, target.affinity);
    let land = Math.max(0.15, 0.95 - Math.max(0, target.res - caster.acc) / 200);
    if (edge === -1) land *= 0.5;
    if (state.rng() >= land) {
      log(state, `${target.name} resists ${meta.label}`, 'resist');
      return;
    }
  }

  const existing = target.effects.filter((e) => e.type === spec.type);
  const cap = meta.maxStacks || 1;
  if (existing.length >= cap) {
    existing[0].turns = Math.max(existing[0].turns, spec.turns); // refresh
  } else {
    target.effects.push({ type: spec.type, turns: spec.turns });
  }
  log(state, `${meta.label} on ${target.name} (${spec.turns}t)`, meta.kind);
}

function boostMeter(state, unit, pct) {
  if (!unit.alive) return;
  unit.meter = Math.min(METER_MAX, unit.meter + METER_MAX * pct);
  log(state, `${unit.name}'s turn meter +${Math.round(pct * 100)}%`, 'buff');
}

function drainMeter(state, unit, pct) {
  if (!unit.alive) return;
  unit.meter = Math.max(0, unit.meter - METER_MAX * pct);
  log(state, `${unit.name}'s turn meter -${Math.round(pct * 100)}%`, 'debuff');
}

// ---------------------------------------------------------------- turn engine

// Advance meters until at least one unit is ready; return the actor.
function nextActor(state) {
  const living = state.units.filter((u) => u.alive);
  if (living.length === 0) return null;
  let guard = 0;
  for (;;) {
    const ready = living.filter((u) => u.meter >= METER_MAX);
    if (ready.length) {
      ready.sort((a, b) => b.meter - a.meter || effStat(b, 'spd') - effStat(a, 'spd'));
      return ready[0];
    }
    for (const u of living) u.meter += effStat(u, 'spd') * 0.1;
    if (++guard > 100000) throw new Error('turn meter stalled');
  }
}

function battleOver(state) {
  const heroes = state.units.some((u) => u.alive && u.side === 'hero');
  const foes = state.units.some((u) => u.alive && u.side === 'foe');
  if (heroes && foes) return null;
  return heroes ? 'hero' : 'foe';
}

// Resolve one full turn for `actor` using skill `skillIdx` on `target`.
function executeTurn(state, actor, skillIdx, target) {
  state.turnCount++;
  actor.meter = 0;

  // Start of turn: cooldowns tick, passives, corrosion, stun check.
  actor.cooldowns = actor.cooldowns.map((c) => Math.max(0, c - 1));

  if (actor.enrage) {
    actor.enrageStacks++;
    if (actor.enrageStacks % 5 === 0) {
      log(state, `${actor.name} grows more unstable... (+${Math.round(actor.enrage * actor.enrageStacks * 100)}% ATK)`, 'debuff');
    }
  }

  if (actor.passive === 'regenerate' && !hasEffect(actor, 'healBlackout') && actor.hp > 0) {
    const amt = Math.round(actor.maxHp * 0.08);
    actor.hp = Math.min(actor.maxHp, actor.hp + amt);
    log(state, `${actor.name} regenerates ${amt} (apply Heal Blackout to stop this!)`, 'heal');
  }

  for (const e of actor.effects) {
    const meta = EFFECTS[e.type];
    if (meta.tickPct) {
      const dot = Math.round(actor.maxHp * meta.tickPct);
      actor.hp = Math.max(0, actor.hp - dot);
      log(state, `${actor.name} takes ${dot} ${meta.label} damage`, 'debuff');
    }
  }
  if (actor.hp === 0) { kill(state, actor); return; }

  if (hasEffect(actor, 'stasis')) {
    log(state, `${actor.name} is locked in stasis — turn skipped`, 'debuff');
  } else {
    castSkill(state, actor, skillIdx, target);
  }

  // End of turn: this unit's own effects tick down.
  actor.effects = actor.effects
    .map((e) => ({ ...e, turns: e.turns - 1 }))
    .filter((e) => e.turns > 0);
}

function castSkill(state, actor, skillIdx, target) {
  const skill = actor.skills[skillIdx];
  if (actor.cooldowns[skillIdx] > 0) skillIdx = 0; // safety: fall back to basic
  const s = actor.skills[skillIdx];
  actor.cooldowns[skillIdx] = s.cd || 0;
  log(state, `— ${actor.name} uses ${s.name} —`, 'skill');

  const foes = livingEnemies(state, actor);
  const allies = livingAllies(state, actor);
  let targets;
  switch (s.target) {
    case 'allEnemies': targets = foes; break;
    case 'allAllies': targets = allies; break;
    case 'self': targets = [actor]; break;
    case 'ally': targets = [target && target.alive && target.side === actor.side ? target : lowestHp(allies)]; break;
    default: targets = [target && target.alive && target.side !== actor.side ? target : lowestHp(foes)];
  }

  for (const t of targets) {
    if (!t || !t.alive) continue;
    if (s.mult) dealDamage(state, actor, t, s.mult);
    if (s.healPct) heal(state, actor, t, s.healPct);
    if (s.shieldPct && t.alive) {
      t.shield += Math.round(t.maxHp * s.shieldPct);
      log(state, `${t.name} gains an Overshield`, 'buff');
    }
    if (s.cleanse && t.alive) {
      const n = t.effects.filter((e) => EFFECTS[e.type].kind === 'debuff').length;
      t.effects = t.effects.filter((e) => EFFECTS[e.type].kind !== 'debuff');
      if (n) log(state, `${t.name} is cleansed of ${n} debuff(s)`, 'heal');
    }
    for (const eff of s.effects || []) tryApplyEffect(state, actor, t, eff);
    if (s.tmDrain && t.alive) drainMeter(state, t, s.tmDrain);
  }
  if (s.tmBoostAllies) for (const a of allies) if (a !== actor) boostMeter(state, a, s.tmBoostAllies);
}

function lowestHp(units) {
  return units.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}

// ---------------------------------------------------------------- simple AI
// Priority: heal if an ally is hurt, otherwise first ready skill (last-first), else basic.

function chooseAction(state, actor) {
  const allies = livingAllies(state, actor);
  const foes = livingEnemies(state, actor);
  const hurt = lowestHp(allies);

  for (let i = actor.skills.length - 1; i >= 1; i--) {
    if (actor.cooldowns[i] > 0) continue;
    const s = actor.skills[i];
    const isSupport = s.healPct || s.cleanse;
    if (isSupport && (!hurt || hurt.hp / hurt.maxHp > 0.65)) continue; // don't waste heals
    const target = s.target === 'ally' ? hurt : lowestHp(foes);
    return { skillIdx: i, target };
  }
  return { skillIdx: 0, target: lowestHp(foes) };
}

// ---------------------------------------------------------------- rosters

const HEROES = [
  {
    name: 'Kaelis Vantar', affinity: 'umbral', role: 'Attack',
    hp: 14000, atk: 1400, def: 700, spd: 105, critRate: 0.3, critDmg: 1.9, acc: 180, res: 100,
    skills: [
      { name: 'Void Slash', mult: 1.0, target: 'enemy' },
      { name: 'Entropy Wound', cd: 4, mult: 2.2, target: 'enemy',
        effects: [{ type: 'healBlackout', turns: 2, chance: 0.85 }] },
      { name: 'Paradox Execution', cd: 5, mult: 1.6, target: 'allEnemies' },
    ],
  },
  {
    name: 'Juno-9', affinity: 'ion', role: 'Support',
    hp: 13000, atk: 900, def: 850, spd: 122, critRate: 0.15, critDmg: 1.5, acc: 220, res: 120,
    skills: [
      { name: 'Static Chord', mult: 0.9, target: 'enemy',
        effects: [{ type: 'jam', turns: 2, chance: 0.3 }] },
      { name: 'Broadcast: Overdrive', cd: 4, target: 'allAllies', tmBoostAllies: 0.2,
        effects: [{ type: 'stims', turns: 2 }] },
      { name: 'Signal Scramble', cd: 5, target: 'allEnemies', tmDrain: 0.15,
        effects: [{ type: 'jam', turns: 2, chance: 0.8 }] },
    ],
  },
  {
    name: 'Solveig Rask', affinity: 'cryo', role: 'Attack',
    hp: 13500, atk: 1300, def: 750, spd: 110, critRate: 0.35, critDmg: 1.8, acc: 200, res: 100,
    skills: [
      { name: 'Salvage Hook', mult: 1.0, target: 'enemy',
        effects: [{ type: 'corrosion', turns: 2, chance: 0.35 }] },
      { name: 'Flashfreeze', cd: 4, mult: 2.0, target: 'enemy',
        effects: [{ type: 'stasis', turns: 1, chance: 0.75 }] },
      { name: 'Hull Rupture', cd: 5, mult: 1.4, target: 'allEnemies',
        effects: [{ type: 'corrosion', turns: 2, chance: 0.6 }] },
    ],
  },
  {
    name: 'Adaeze Okonkwo', affinity: 'plasma', role: 'Mender',
    hp: 15000, atk: 850, def: 900, spd: 108, critRate: 0.15, critDmg: 1.5, acc: 150, res: 180,
    skills: [
      { name: 'Scalpel Beam', mult: 0.9, target: 'enemy' },
      { name: 'Nanite Surge', cd: 3, target: 'allAllies', healPct: 0.18, shieldPct: 0.1 },
      { name: 'Purge Protocol', cd: 5, target: 'allAllies', cleanse: true, healPct: 0.15 },
    ],
  },
  {
    name: 'Renji Kurosawa', affinity: 'cryo', role: 'Defense',
    hp: 17000, atk: 1000, def: 1000, spd: 98, critRate: 0.2, critDmg: 1.6, acc: 200, res: 150,
    skills: [
      { name: 'Frame Strike', mult: 1.0, target: 'enemy',
        effects: [{ type: 'armorBreach', turns: 2, chance: 0.35 }] },
      { name: 'Bulwark Field', cd: 4, target: 'allAllies',
        effects: [{ type: 'plating', turns: 2 }] },
      { name: 'Piledriver', cd: 4, mult: 1.8, target: 'enemy',
        effects: [{ type: 'armorBreach', turns: 2, chance: 0.85 }] },
    ],
  },
];

const FOES = [
  {
    name: 'Paradox Warden', affinity: 'plasma', role: 'Boss', passive: 'regenerate', enrage: 0.08,
    hp: 48000, atk: 1750, def: 550, spd: 115, critRate: 0.2, critDmg: 1.6, acc: 250, res: 200,
    skills: [
      { name: 'Causality Lash', mult: 1.0, target: 'enemy' },
      { name: 'Rewrite Field', cd: 4, mult: 1.5, target: 'allEnemies',
        effects: [{ type: 'jam', turns: 2, chance: 0.4 }] },
      { name: 'Timeline Shear', cd: 5, mult: 2.4, target: 'enemy', tmDrain: 0.3 },
    ],
  },
  {
    name: 'Echo Drone α', affinity: 'ion', role: 'Add',
    hp: 11000, atk: 1350, def: 500, spd: 118, critRate: 0.15, critDmg: 1.5, acc: 180, res: 100,
    skills: [
      { name: 'Arc Bolt', mult: 1.0, target: 'enemy' },
      { name: 'Suppression Pulse', cd: 3, mult: 1.3, target: 'enemy',
        effects: [{ type: 'jam', turns: 2, chance: 0.6 }] },
    ],
  },
  {
    name: 'Echo Drone β', affinity: 'cryo', role: 'Add',
    hp: 11000, atk: 1350, def: 500, spd: 102, critRate: 0.15, critDmg: 1.5, acc: 180, res: 100,
    skills: [
      { name: 'Frost Bolt', mult: 1.0, target: 'enemy' },
      { name: 'Corrosive Vent', cd: 3, mult: 0.9, target: 'allEnemies',
        effects: [{ type: 'corrosion', turns: 2, chance: 0.4 }] },
    ],
  },
];

// ---------------------------------------------------------------- battle setup

function newBattle(seed, heroDefs, foeDefs) {
  const state = {
    rng: makeRng(seed ?? (Date.now() & 0xffffffff)),
    units: [],
    log: [],
    turnCount: 0,
    winner: null,
  };
  (heroDefs || HEROES).forEach((h, i) => state.units.push(makeUnit(h, 'hero', i)));
  (foeDefs || FOES).forEach((f, i) => state.units.push(makeUnit(f, 'foe', i)));
  // Randomize opening meters slightly so identical speeds don't always tie.
  for (const u of state.units) u.meter = state.rng() * 200;
  log(state, 'Eclipse anomaly detected. Squad engaged!', 'skill');
  return state;
}

// Run one actor's turn on auto AI. Returns the actor (or null when battle is over).
function stepAuto(state) {
  if ((state.winner = battleOver(state))) return null;
  const actor = nextActor(state);
  const { skillIdx, target } = chooseAction(state, actor);
  executeTurn(state, actor, skillIdx, target);
  state.winner = battleOver(state);
  return actor;
}

const api = {
  METER_MAX, EFFECTS, HEROES, FOES,
  makeRng, affinityEdge, effStat, hasEffect,
  newBattle, nextActor, executeTurn, chooseAction, stepAuto, battleOver, lowestHp,
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.Starfall = api;
