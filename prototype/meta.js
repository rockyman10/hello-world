/*
 * STARFALL: ECLIPSE PROTOCOL — meta-game prototype
 * Gacha (pity + 50/50), roster/squad, gear sets, encounters, rewards.
 * Pure logic, no DOM — browser (window.StarfallMeta) and node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./combat.js'));
  else root.StarfallMeta = factory(root.Starfall);
})(typeof self !== 'undefined' ? self : this, function (S) {

const PULL_COST = 160;

// ---------------------------------------------------------------- unit pools

// 4★ pool (5★ pool comes from combat.js HEROES).
const FOUR_STARS = [
  {
    name: 'Mika Tan', affinity: 'ion', role: 'Support',
    hp: 11500, atk: 950, def: 800, spd: 115, critRate: 0.15, critDmg: 1.5, acc: 240, res: 120,
    skills: [
      { name: 'Pin Shot', mult: 0.9, target: 'enemy',
        effects: [{ type: 'armorBreach', turns: 2, chance: 0.4 }] },
      { name: 'Full Spectrum Breach', cd: 4, mult: 0.8, target: 'allEnemies',
        effects: [{ type: 'armorBreach', turns: 2, chance: 0.75 }, { type: 'jam', turns: 2, chance: 0.4 }] },
    ],
  },
  {
    name: 'Dex Volkov', affinity: 'plasma', role: 'Attack',
    hp: 11000, atk: 1250, def: 650, spd: 104, critRate: 0.3, critDmg: 1.8, acc: 150, res: 100,
    skills: [
      { name: 'Burn Cutter', mult: 1.0, target: 'enemy' },
      { name: 'Overcharge Lance', cd: 3, mult: 2.0, target: 'enemy' },
    ],
  },
  {
    name: 'Vex Marlowe', affinity: 'ion', role: 'Attack',
    hp: 10500, atk: 1200, def: 600, spd: 112, critRate: 0.32, critDmg: 1.8, acc: 160, res: 100,
    skills: [
      { name: 'Arc Fang', mult: 1.0, target: 'enemy' },
      { name: 'Storm Volley', cd: 4, mult: 1.3, target: 'allEnemies' },
    ],
  },
  {
    name: 'Ora Chen', affinity: 'cryo', role: 'Mender',
    hp: 12500, atk: 800, def: 850, spd: 106, critRate: 0.15, critDmg: 1.5, acc: 140, res: 160,
    skills: [
      { name: 'Cold Compress', mult: 0.9, target: 'enemy' },
      { name: 'Triage Field', cd: 3, target: 'ally', healPct: 0.3 },
    ],
  },
  {
    name: 'Brick-7', affinity: 'ion', role: 'Defense',
    hp: 15000, atk: 900, def: 950, spd: 96, critRate: 0.2, critDmg: 1.6, acc: 180, res: 150,
    skills: [
      { name: 'Slab Punch', mult: 1.0, target: 'enemy',
        effects: [{ type: 'jam', turns: 2, chance: 0.25 }] },
      { name: 'Shield Wall', cd: 4, target: 'allAllies',
        effects: [{ type: 'plating', turns: 2 }] },
    ],
  },
];

const UNITS = {};
for (const d of S.HEROES) UNITS[d.name] = { rarity: 5, def: d };
for (const d of FOUR_STARS) UNITS[d.name] = { rarity: 4, def: d };

const FIVE_STAR_NAMES = S.HEROES.map((d) => d.name);
const FOUR_STAR_NAMES = FOUR_STARS.map((d) => d.name);
const FEATURED = 'Kaelis Vantar';

// ---------------------------------------------------------------- lore

// In-world rarity tier names (see docs/LORE.md).
const RARITY_NAMES = { 3: 'STRAND', 4: 'VECTOR', 5: 'PRIME', 6: 'SINGULARITY' };

const FACTIONS = {
  vantar:     { label: 'House Vantar',     color: '#c084fc' },
  chorus:     { label: 'The Chorus',       color: '#5ee0ff' },
  rimeholt:   { label: 'Rimeholt Combine', color: '#a5b4fc' },
  helix:      { label: 'Helix Gardens',    color: '#4ade80' },
  frameguard: { label: 'The Frameguard',   color: '#fdba74' },
  eclipsed:   { label: 'The Eclipsed',     color: '#f472b6' },
};

const LORE = {
  'Kaelis Vantar':  { faction: 'vantar', epithet: 'The Unwritten Blade',
    bio: 'Heir of the Void Compact. The Eclipse rewrote him into the enforcer of the Paradox Lord Sable-of-Nine — until the Navigator\'s anchor signal cut him loose. Somewhere in a rewritten timeline, a version of him still serves. He intends to erase it.' },
  'Juno-9':         { faction: 'chorus', epithet: 'The Signal Saint',
    bio: 'An AI grown from the archived voice of a pre-Eclipse idol. Nine iterations have burned out keeping the morale grid alive; this one writes her own songs. Her concerts are also jamming arrays.' },
  'Solveig Rask':   { faction: 'rimeholt', epithet: 'Hullbreaker',
    bio: 'Third-generation salvager. Cut open a derelict at nineteen and found echo-copies of her own clan still working the wreck. Sealed the hull, said nothing for six years. Pays her debts in corrosion now.' },
  'Adaeze Okonkwo': { faction: 'helix', epithet: 'The Gardener',
    bio: 'Chief gene-artisan of Helix Gardens; half the Voidborn genome library is her handwriting. Overheals on purpose: "growth beyond the wound is the whole point."' },
  'Renji Kurosawa': { faction: 'frameguard', epithet: 'The Last Standard',
    bio: 'Pilots the frame his family has maintained for eleven generations; its armor carries a smear of Earth soil under lacquer. The last time a Kurosawa broke formation was never.' },
  'Mika Tan':       { faction: 'chorus', epithet: 'The Static Cartographer',
    bio: 'Chorus signal-tech who maps enemy shield harmonics live on air — every Armor Breach she lands is, technically, a broadcast hit single. The first friend every Navigator makes.' },
  'Dex Volkov':     { faction: 'rimeholt', epithet: 'Cutter',
    bio: 'Plasma-torch specialist. Burns salvage loose and enemies looser. Owes Solveig either three life-debts or four; they\'ve stopped counting in front of witnesses.' },
  'Vex Marlowe':    { faction: 'vantar', epithet: 'The Storm Privateer',
    bio: 'Runs contraband along the fracture lanes under a Vantar letter of marque. Insists the letter is genuine. The seal is upside down.' },
  'Ora Chen':       { faction: 'helix', epithet: 'Coldhands',
    bio: 'Cryo-surgeon. Keeps hearts beating at three kelvin and considers warmth a rumor. Trained under Adaeze; disagrees with her about everything except patients.' },
  'Brick-7':        { faction: 'frameguard', epithet: 'The Door',
    bio: 'A decommissioned breach-frame that refused to power down and walked to the Frameguard chapterhouse to take the oath. Legally a door. The Frameguard\'s most beloved member.' },
};

// Kinship Protocol: 2+ squad members of the same House each gain +12% ATK/DEF.
const KINSHIP = { atk: 0.12, def: 0.12, minCount: 2 };

// ---------------------------------------------------------------- gear sets

const GEAR_SETS = {
  velocity:  { label: 'Velocity',  desc: '+18% SPD (speed tuning!)', spd: 0.18 },
  assault:   { label: 'Assault',   desc: '+25% ATK',                 atk: 0.25 },
  aegis:     { label: 'Aegis',     desc: '+40% DEF, +10% HP',        def: 0.40, hp: 0.10 },
  targeting: { label: 'Targeting', desc: '+75 ACC (land debuffs)',   acc: 75 },
  precision: { label: 'Precision', desc: '+15% crit chance',         critRate: 0.15 },
};

function withGear(def, setKey) {
  if (!setKey || !GEAR_SETS[setKey]) return def;
  const g = GEAR_SETS[setKey];
  return {
    ...def,
    hp: Math.round(def.hp * (1 + (g.hp || 0))),
    atk: Math.round(def.atk * (1 + (g.atk || 0))),
    def: Math.round(def.def * (1 + (g.def || 0))),
    spd: Math.round(def.spd * (1 + (g.spd || 0))),
    critRate: def.critRate + (g.critRate || 0),
    acc: def.acc + (g.acc || 0),
  };
}

// ---------------------------------------------------------------- encounters

const ENCOUNTERS = [
  {
    id: 'sweep', name: 'Perimeter Sweep', tier: 'Story I',
    desc: 'Clear the drone patrol around the Meridian. A warm-up.',
    firstClear: { voidglass: 800, caches: 1 }, repeat: { voidglass: 40, caches: 0 },
    foes: [
      { name: 'Patrol Drone α', affinity: 'ion', role: 'Add', hp: 6500, atk: 750, def: 400, spd: 108, critRate: 0.1, critDmg: 1.5, acc: 120, res: 80,
        skills: [{ name: 'Zap', mult: 1.0, target: 'enemy' }, { name: 'Twin Zap', cd: 3, mult: 0.8, target: 'allEnemies' }] },
      { name: 'Patrol Drone β', affinity: 'cryo', role: 'Add', hp: 6500, atk: 750, def: 400, spd: 100, critRate: 0.1, critDmg: 1.5, acc: 120, res: 80,
        skills: [{ name: 'Chill Ray', mult: 1.0, target: 'enemy' }, { name: 'Ice Shard', cd: 3, mult: 1.4, target: 'enemy' }] },
      { name: 'Patrol Drone γ', affinity: 'plasma', role: 'Add', hp: 6500, atk: 750, def: 400, spd: 96, critRate: 0.1, critDmg: 1.5, acc: 120, res: 80,
        skills: [{ name: 'Flare', mult: 1.0, target: 'enemy' }, { name: 'Melt Beam', cd: 3, mult: 1.4, target: 'enemy' }] },
    ],
  },
  {
    id: 'cryocell', name: 'Affinity Gauntlet: Cryo Cell', tier: 'Story II',
    desc: 'An all-Cryo echo cell. Ion units gain advantage; Plasma units weak-hit and miss debuffs. Bring Accuracy for the leader.',
    firstClear: { voidglass: 1300, caches: 2 }, repeat: { voidglass: 60, caches: 0 },
    foes: [
      { name: 'Frost Echo A', affinity: 'cryo', role: 'Add', hp: 10000, atk: 1250, def: 550, spd: 112, critRate: 0.15, critDmg: 1.6, acc: 160, res: 180,
        skills: [{ name: 'Frost Bolt', mult: 1.0, target: 'enemy' }, { name: 'Deep Chill', cd: 3, mult: 1.3, target: 'enemy', effects: [{ type: 'jam', turns: 2, chance: 0.5 }] }] },
      { name: 'Frost Echo B', affinity: 'cryo', role: 'Add', hp: 10000, atk: 1250, def: 550, spd: 104, critRate: 0.15, critDmg: 1.6, acc: 160, res: 180,
        skills: [{ name: 'Frost Bolt', mult: 1.0, target: 'enemy' }, { name: 'Shatter Round', cd: 3, mult: 1.5, target: 'enemy' }] },
      { name: 'Frost Echo C', affinity: 'cryo', role: 'Add', hp: 10000, atk: 1250, def: 550, spd: 98, critRate: 0.15, critDmg: 1.6, acc: 160, res: 180,
        skills: [{ name: 'Frost Bolt', mult: 1.0, target: 'enemy' }, { name: 'Rime Wave', cd: 4, mult: 0.9, target: 'allEnemies' }] },
      { name: 'Glacier Echo', affinity: 'cryo', role: 'Elite', hp: 19000, atk: 1500, def: 650, spd: 112, critRate: 0.2, critDmg: 1.7, acc: 200, res: 280,
        skills: [{ name: 'Glacial Slam', mult: 1.1, target: 'enemy' },
                 { name: 'Flash Freeze', cd: 4, mult: 1.2, target: 'enemy', effects: [{ type: 'stasis', turns: 1, chance: 0.7 }] },
                 { name: 'Whiteout', cd: 5, mult: 1.0, target: 'allEnemies', effects: [{ type: 'jam', turns: 2, chance: 0.5 }] }] },
    ],
  },
  {
    id: 'warden', name: 'Boss: Paradox Warden', tier: 'Story III',
    desc: 'The Warden regenerates unless Heal Blackout is on it, and enrages as the fight drags. Kill it fast — or shut its healing down.',
    firstClear: { voidglass: 2400, caches: 2 }, repeat: { voidglass: 80, caches: 0 },
    foes: S.FOES,
  },
];

function encounterById(id) { return ENCOUNTERS.find((e) => e.id === id); }

// ---------------------------------------------------------------- chapter 1 story
// Speakers: unit names (colored by House), NAVIGATOR (the player), MERIDIAN (ship AI).

const STORY = {
  sweep: {
    intro: [
      { who: 'MERIDIAN', text: 'Anchor-sleep terminated. Navigator vitals green. Welcome back to the year everyone else already lived through.' },
      { who: 'Mika Tan', text: 'Told you the anchor would hold! Navigator, hi, big fan, ALSO we have Eclipsed drones on the hull.' },
      { who: 'Dex Volkov', text: 'Patrol pattern. Something sent them sniffing. Cutter\'s hot — point me.' },
      { who: 'Ora Chen', text: 'Vitals are mine, drones are yours. Try not to make more work for me.' },
      { who: 'NAVIGATOR', text: 'Anchoring squad. If I can hold a timeline steady, I can hold three of you. Move.' },
    ],
    outro: [
      { who: 'Dex Volkov', text: 'Wreckage is clean salvage... wait. That\'s a Rimeholt distress beacon. Clan Rask\'s marking.' },
      { who: 'Mika Tan', text: 'That clan was logged lost thirty years ago. Beacons don\'t start crying after thirty years.' },
      { who: 'NAVIGATOR', text: 'This one did. Chart the source. We\'re going to look.' },
    ],
  },
  cryocell: {
    intro: [
      { who: 'MERIDIAN', text: 'Salvage yard located. Life signs: seventeen. Life signs, Navigator, are the wrong word for what I am reading.' },
      { who: 'Ora Chen', text: 'They\'re copies. Echoes. The Eclipse didn\'t kill this clan — it preserved them wrongly. They\'ve been running the same shift for thirty years.' },
      { who: 'Mika Tan', text: 'All-Cryo signatures, heavy resistance fields. Ion harmonics will cut through — plasma\'s going to splash. Building the breach map now.' },
      { who: 'NAVIGATOR', text: 'We end the shift. Anchors up.' },
    ],
    outro: [
      { who: 'Ora Chen', text: 'One echo stabilized before it dissolved. It kept saying a word. "Warden."' },
      { who: 'MERIDIAN', text: 'Cross-reference: a Paradox Warden — an Eclipsed anchor-organism. Where a Warden stands, a rewrite holds. This yard is being *maintained*.' },
      { who: 'NAVIGATOR', text: 'Then we unwrite it. Find me the Warden.' },
    ],
  },
  warden: {
    intro: [
      { who: 'MERIDIAN', text: 'There. The heart of the yard. It is healing the timeline around it faster than reality can wound it.' },
      { who: 'Mika Tan', text: 'Translation: it regenerates unless you blackout its healing loop. Or kill it before it learns your tempo — it gets angrier the longer you take.' },
      { who: 'Ora Chen', text: 'Everyone comes back from this one. That\'s a medical order.' },
      { who: 'NAVIGATOR', text: 'Sever the loop. The clan rests today.' },
    ],
    outro: [
      { who: 'MERIDIAN', text: 'Warden terminated. Rewrite collapsing. Seventeen echoes... resolving. At rest. Logging clan Rask: found, and finished.' },
      { who: 'Mika Tan', text: '...Navigator? There\'s a voice on a dead channel. It\'s not a distress call. It\'s addressed to us.' },
      { who: 'SABLE-OF-NINE', text: 'You\'ve unwritten my Warden, little Navigator. I felt it from nine timelines away. Kaelis — come home.' },
      { who: 'NAVIGATOR', text: 'End of Chapter One. (Chapter Two: House Vantar knows that voice.)' },
    ],
  },
};

// ---------------------------------------------------------------- profile

function newProfile() {
  const p = {
    voidglass: 1600, // opening recruitment grant: one free 10-pull
    shards: 0,
    caches: 2,
    pity5: 0,
    sinceFour: 0,
    guaranteedFeatured: false,
    totalPulls: 0,
    owned: {},      // name -> { copies, gear }
    squad: [],
    cleared: {},    // encounter id -> true
  };
  for (const name of ['Mika Tan', 'Dex Volkov', 'Ora Chen']) {
    p.owned[name] = { copies: 1, gear: null };
    p.squad.push(name);
  }
  return p;
}

function kinshipFactions(names) {
  const counts = {};
  for (const n of names) {
    const f = LORE[n] && LORE[n].faction;
    if (f) counts[f] = (counts[f] || 0) + 1;
  }
  return Object.keys(counts).filter((f) => counts[f] >= KINSHIP.minCount);
}

function squadDefs(profile) {
  const names = profile.squad.filter((n) => profile.owned[n]).slice(0, 5);
  const bonded = kinshipFactions(names);
  return names.map((n) => {
    let d = withGear(UNITS[n].def, profile.owned[n].gear);
    const f = LORE[n] && LORE[n].faction;
    if (f && bonded.includes(f)) {
      d = { ...d, atk: Math.round(d.atk * (1 + KINSHIP.atk)), def: Math.round(d.def * (1 + KINSHIP.def)) };
    }
    return d;
  });
}

// ---------------------------------------------------------------- gacha

// Published rates: 5★ 0.6% base, soft pity +6%/pull from 74, hard pity 90.
// 4★ 5.1%, guaranteed at least one every 10 pulls. Featured 50/50 with guarantee.
function fiveStarChance(pity5) {
  const n = pity5 + 1; // this pull's number since last 5★
  if (n >= 90) return 1;
  return Math.min(1, 0.006 + (n > 73 ? (n - 73) * 0.06 : 0));
}

function pullOne(profile, rng) {
  profile.totalPulls++;
  let result;

  if (rng() < fiveStarChance(profile.pity5)) {
    let name;
    if (profile.guaranteedFeatured || rng() < 0.5) {
      name = FEATURED;
      profile.guaranteedFeatured = false;
    } else {
      const others = FIVE_STAR_NAMES.filter((n) => n !== FEATURED);
      name = others[Math.floor(rng() * others.length)];
      profile.guaranteedFeatured = true; // lost the 50/50 → next is featured
    }
    profile.pity5 = 0;
    profile.sinceFour = 0;
    result = grant(profile, name, 5);
  } else if (profile.sinceFour >= 9 || rng() < 0.051) {
    const name = FOUR_STAR_NAMES[Math.floor(rng() * FOUR_STAR_NAMES.length)];
    profile.pity5++;
    profile.sinceFour = 0;
    result = grant(profile, name, 4);
  } else {
    profile.pity5++;
    profile.sinceFour++;
    profile.shards += 2;
    result = { rarity: 3, name: 'Salvage Strand', isNew: false, shards: 2 };
  }
  return result;
}

function grant(profile, name, rarity) {
  const entry = profile.owned[name];
  if (entry) {
    const shards = rarity === 5 ? 25 : 8;
    entry.copies++;
    profile.shards += shards;
    return { rarity, name, isNew: false, shards };
  }
  profile.owned[name] = { copies: 1, gear: null };
  return { rarity, name, isNew: true, shards: 0 };
}

function doPulls(profile, count, rng) {
  const cost = PULL_COST * count;
  if (profile.voidglass < cost) return null;
  profile.voidglass -= cost;
  const results = [];
  for (let i = 0; i < count; i++) results.push(pullOne(profile, rng));
  return results;
}

// Echo Exchange: buy any standard-pool 5★ outright with dupe shards.
const SHARD_PRICE_5 = 300;
function shardBuy(profile, name) {
  if (!UNITS[name] || UNITS[name].rarity !== 5 || profile.shards < SHARD_PRICE_5) return null;
  profile.shards -= SHARD_PRICE_5;
  return grant(profile, name, 5);
}

// ---------------------------------------------------------------- gear ops

function equipGear(profile, name, setKey) {
  const entry = profile.owned[name];
  if (!entry) return false;
  if (setKey === entry.gear) return true;
  if (setKey && !entry.gear) {
    if (profile.caches < 1) return false;
    profile.caches--;
  }
  if (!setKey && entry.gear) profile.caches++; // unequip refunds the cache
  entry.gear = setKey || null;
  return true;
}

// ---------------------------------------------------------------- rewards

function applyVictory(profile, encId) {
  const enc = encounterById(encId);
  const first = !profile.cleared[encId];
  const r = first ? enc.firstClear : enc.repeat;
  profile.cleared[encId] = true;
  profile.voidglass += r.voidglass;
  profile.caches += r.caches;
  return { first, ...r };
}

return {
  PULL_COST, SHARD_PRICE_5, UNITS, FOUR_STARS, FIVE_STAR_NAMES, FOUR_STAR_NAMES, FEATURED,
  RARITY_NAMES, FACTIONS, LORE, KINSHIP, STORY,
  GEAR_SETS, ENCOUNTERS, encounterById,
  newProfile, squadDefs, withGear, kinshipFactions,
  fiveStarChance, pullOne, doPulls, shardBuy, equipGear, applyVictory,
};
});
