# STARFALL: ECLIPSE PROTOCOL
### A Sci-Fi Gacha RPG — Concept Document

---

## 1. High Concept

**One-liner:** Humanity's last starship drifts through a dying galaxy, and you — its newly awakened Navigator — must recruit genetically engineered "Voidborn" operatives to reclaim lost star systems from a reality-eating anomaly called the Eclipse.

**Elevator pitch:** *Raid: Shadow Legends'* turn-meter combat and buff/debuff warfare meets *Zenless Zone Zero's* stylish urban-tech aesthetic, wrapped in a *Nikke*-style vertical-friendly presentation, with *Arknights'* strategic base-building as the idle layer. Players collect Voidborn operatives through a gacha system, build squads around speed tuning, debuff coverage, and affinity matchups, and push through a galaxy map of story chapters, roguelite void rifts, and time-limited events.

**Genre:** Turn-based squad RPG with idle/base-management sublayer
**Platforms:** Mobile-first (portrait-friendly UI), with browser/PC build
**Monetization model (design target):** Free-to-play with gacha; generous pity, battle pass, monthly pass — modeled on the current market leaders

---

## 2. Market Analysis — What Top Games Do Right

| Game | What we borrow |
|---|---|
| **Raid: Shadow Legends** | The entire combat core: turn-meter system, per-skill cooldowns, buff/debuff-driven strategy, Accuracy-vs-Resistance, affinity triangle, gear sets and speed tuning |
| **Honkai: Star Rail** | Strong character-driven storytelling; generous free pulls in events |
| **Genshin Impact** | 50/50 pity structure that players understand and accept |
| **Zenless Zone Zero** | Stylish UI/UX, snappy menus, personality-forward character design; short mission structure respectful of session time |
| **Goddess of Victory: Nikke** | Portrait orientation for one-handed play; character bond/advise system driving attachment |
| **Arknights** | Base building as idle resource layer; low-rarity units staying relevant via niche utility |
| **Fate/Grand Order** | Story as the primary retention driver; event reruns for catch-up |
| **Reverse: 1999** | Distinct art direction as market differentiator; time-period/faction theming per chapter |

**Key market lessons baked into this design:**
1. **Pity systems are non-negotiable.** Hard pity at 80–90 pulls, 50/50 with guarantee, transparent rates.
2. **Respect player time.** Dailies completable in under 10 minutes; sweep/auto-clear for farmed content.
3. **Story sells characters, characters sell pulls.** Every banner character gets a story spotlight before their banner.
4. **Vertical slice of endgame at launch:** a roguelite mode (like Simulated Universe) and a rotating boss gauntlet (like Spiral Abyss / Memory of Chaos).
5. **Low-spender friendliness:** the $5/month pass is the best value in the game, converting far more players than whales alone.

---

## 3. Setting & Narrative

### The Universe
Three centuries after the **Eclipse** — a slow-motion anomaly that unravels causality itself — swallowed Earth's sector, the generation-ark **Meridian** wanders the fracture zones between surviving star systems. Systems that fall to the Eclipse don't explode; they *rewrite* — their histories mutate, their people become paradox echoes.

### The Player
You are the **Navigator**, a human who can perceive stable timelines inside Eclipse-corrupted space. You are the only one who can chart safe paths — and the only one who can "anchor" Voidborn operatives so their engineered minds don't dissolve in paradox zones. (This mechanically justifies the gacha: recruiting = anchoring a Voidborn to your timeline.)

### The Voidborn
Engineered post-humans, each built from a **Genome Archive** of pre-Eclipse Earth cultures — giving huge visual/character variety (a samurai-lineage frame pilot, a Nordic deep-void salvager, an Afrofuturist bio-hacker, a retro-cassette-punk AI idol). Each carries a fragment of a lost timeline, which fuels character stories.

### Story structure
- **Main chapters** = star systems. Each system has its own culture, crisis, faction conflict, and a "Paradox Lord" boss.
- **Character stories** unlock via bond levels and item gifts (Nikke-style advise sessions).
- **Event stories** are self-contained side tales that rerun yearly with catch-up rewards.

---

## 4. Core Gameplay Loops

### Loop 1 — Combat (minutes) — RAID: Shadow Legends model
Turn-based 5-unit squad combat driven by a **Turn Meter**:

- **Turn Meter:** every unit's meter fills continuously at a rate set by its Speed stat; a unit acts when it hits 100%. Speed is the god-stat, and **turn-meter manipulation** (skills that boost allies' meter or drain enemies') is a core strategic axis — whole team comps are built around going first or denying the enemy a turn.
- **Skills with cooldowns:** each unit has a basic attack (no cooldown) plus 2–3 signature skills on individual cooldowns (3–6 turns). No shared resource pool — the decisions are about sequencing, cooldown alignment, and saving key skills for boss phases. Skill ranks ("Neurolinks," RAID's tomes) reduce cooldowns and add effect chances.
- **Buff/debuff warfare — the heart of combat.** Fights are won by coverage, not raw damage:
  - *Debuffs:* Corrosion (poison, % max HP per turn), Armor Breach (Decrease DEF), Jam (Decrease SPD/ATK), Stasis Lock (stun/freeze), Firewall Down (Decrease RES), Heal Blackout (block healing), Provoke, Turn Meter Drain.
  - *Buffs:* Overshield (shield), Combat Stims (Increase ATK/SPD), Reactive Plating (Increase DEF), Nanite Lifesteal, Counterattack Protocol, Cloak (unkillable/block-debuffs).
  - **Accuracy vs. Resistance:** every debuff rolls the caster's ACC against the target's RES — gearing debuffers for Accuracy is a build requirement, exactly as in RAID.
- **Affinity triangle:** three combat affinities — **Ion ⟶ Cryo ⟶ Plasma ⟶ Ion** (advantage: +crit chance and weak-hit immunity; disadvantage: chance to weak-hit and miss debuffs) — plus rare **Umbral (Void-type)** units that sit outside the triangle with no weakness. Umbral units carry rarity prestige, mirroring RAID's coveted Void champions.
- **Leader Protocol:** the slot-1 unit projects an aura (e.g., +19% team SPD, +33% HP in Rifts) — some units are pulled *for their aura alone*, a proven RAID collection driver.
- **Multi-battle / auto:** full auto with configurable skill priority, plus sweep for farmed stages — RAID's respect-the-grind convenience from day one.

### Loop 2 — Progression (session)
- **Character:** Level → Ascension (farmed materials) → Skill ranks (Neurolink tomes) → **Chronoprint** gear in six slots with main stats + sub-stats, organized into **sets** (Speed, Lifesteal, Accuracy, Counterattack, Shield...) granting bonuses at 2 or 4 pieces. Speed-tuning your team's turn order via gear is the endgame optimization layer, exactly as in RAID.
- Anti-frustration vs. market: sub-stat rolling uses a **pity-token** system so gear grind has a visible finish line (RAID's harshest pain point — we keep the depth, cap the cruelty).

### Loop 3 — Base / Idle (daily)
The **Meridian** ship: assign off-squad units to modules (Reactor = currency, Biolab = ascension mats, Archive = character bond XP). Generates offline; collect on login. Keeps the whole roster useful.

### Loop 4 — Endgame (weekly)
- **Void Rifts:** roguelite runs with random blessings — infinitely replayable, free premium currency weekly.
- **Eclipse Frontier:** rotating 3-week boss gauntlet with buffs that spotlight recent banner units.
- **Paradox Hunts:** weekly bosses for signature materials — each demanding a specific debuff package (e.g., a boss that heals unless Heal Blackout is maintained), RAID Clan-Boss-style, so utility units hold long-term value.
- **The Arena (post-launch):** asynchronous PvP vs. defense teams, RAID-style — speed-lead metas, tiered rankings, weekly rewards. Deferred past the vertical slice but designed-for from the start (it's RAID's biggest gear-chase motivator).

---

## 5. Gacha & Economy Design

### Rarities
- **5★ Voidborn** — 0.6% base rate
- **4★ Voidborn** — 5.1% rate, at least one per 10-pull
- **3★ Cores** (weapon-equivalent) — filler

### Pity (industry-standard, transparent, published in-game)
- **Soft pity** from pull 74 (rate climbs steeply), **hard pity at 90**.
- **Featured banner:** 50/50 — lose the coin flip, next 5★ is guaranteed featured.
- Pity **carries between banners** of the same type.
- **Selector shop:** off-banner currency ("Echo Shards") from dupes buys standard 5★s — a dupe never feels worthless.

### Currencies
| Currency | Source | Use |
|---|---|---|
| Voidglass (premium) | Purchase + achievements/story/events | Pulls |
| Starcharts (pull tickets) | Events, battle pass, dailies | Pulls |
| Credits | Everywhere | Leveling |
| Echo Shards | Dupe pulls | Pity shop |

### Monetization ladder (design target, all optional)
1. **Monthly Pass (~$5):** small instant grant + daily premium drip — best value, aimed at the mass market.
2. **Battle Pass (~$10/patch):** cosmetic + material track.
3. **Direct top-ups** with first-time double bonus.
4. **Cosmetic skins** — no stats, ever.

**Ethical guardrails:** published rates, hard pity, spending recap screen, no FOMO-only limited units without eventual rerun, no loot-box nesting. This is both ethically right and increasingly a compliance requirement (EU/Asia gacha regulation trends).

### F2P income target
~70–80 pulls per patch (6 weeks) for an active free player — competitive with HSR's generosity, which the market has rewarded.

---

## 6. Content Cadence

- **6-week patches:** 1 new 5★ + 1 new 4★, one event with story, one QoL feature.
- **Half-anniversary / anniversary:** free 5★ selector (market has punished stingy anniversaries hard — see the Nikke vs. lesser competitors discourse).
- **Launch roster:** 12 units (5×5★, 7×4★) across the three affinities + Umbral, and 4 roles (Attack, Defense, Support, Mender) — with debuff coverage (Armor Breach, Corrosion, SPD control, Heal Blackout) spread so every role matters in boss design.

---

## 7. Art & Audio Direction

- **Visual:** "Neon-void deco" — dark cosmic backgrounds, thin luminous linework, each star system with a distinct culture-derived palette. 2D character art with Live2D-style motion (dramatically cheaper than 3D and proven by Nikke/Arknights/Reverse:1999).
- **UI:** ZZZ-inspired — diegetic ship OS, bold type, fast transitions.
- **Audio:** synthwave base layer; each star system remixes the main theme in its own cultural instrumentation.

---

## 8. Launch Character Concepts (sample)

| Name | Rarity | Affinity / Role | Hook |
|---|---|---|---|
| **Kaelis Vantar** | 5★ | Umbral / Attack | Ex-Paradox Lord's enforcer; converts HP to damage; Void-type — no affinity weakness |
| **Juno-9** | 5★ | Ion / Support | Cassette-punk AI idol; team-wide Combat Stims + Turn Meter boost; +SPD leader aura (the "speed lead" everyone wants) |
| **Solveig Rask** | 5★ | Cryo / Attack | Deep-void salvager; drains enemy Turn Meter on crit; A3 skill fully resets her own cooldowns |
| **Adaeze Okonkwo** | 5★ | Plasma / Mender | Bio-hacker medic; cleanses debuffs and converts overheal to Overshield |
| **Renji Kurosawa** | 5★ | Cryo / Defense | Frame pilot; Provoke + Counterattack Protocol; +DEF leader aura |
| **Mika Tan** | 4★ | Ion / Support | Free starter; AoE Armor Breach + Jam debuffer built for Accuracy — stays meta forever by design, like RAID's best rare debuffers |

---

## 9. Player Experience Pillars — Fun Over Grind

What the market data and community sentiment actually say: players love RAID's *combat* (depth, speed tuning, debuff strategy) but its most common criticisms are the grind — energy walls, repetitive farming, and gear RNG with no finish line. Meanwhile the games with the strongest long-term goodwill (HSR, Nikke) won it by making the grind background noise and putting *challenge and story* in the foreground. We take RAID's combat and reject its reward structure.

**Pillar 1 — Grind is passive, challenge is active.** Farming (gear, ascension mats, credits) happens through the idle ship-base and one-tap sweeps of already-cleared stages. Active session time is always spent on something *new*: a story chapter, a boss mechanic, a Void Rift run, an event. The player never manually replays a stage they've already mastered.

**Pillar 2 — No energy wall on the fun.** Story, boss attempts, Void Rifts, and events cost no stamina, ever. Stamina exists only to meter *sweep farming* — so the cap limits how fast you can idle-grind, never how long you can actually play.

**Pillar 3 — Every grind has a visible finish line.** Gear sub-stat pity tokens, weekly guaranteed gear selectors, material crafting to convert excess into what's needed. RNG can make progress *faster*, never *impossible*. "I know exactly what I need and roughly when I'll have it" is the feeling.

**Pillar 4 — Difficulty is the content.** Reward big one-time jackpots for first-clears of hard content (boss mechanic checks, Rift depth records, challenge tiers with modifiers) instead of tiny drips for repetition. Replayability comes from the roguelite Rifts being genuinely fun to re-roll, not from being required.

**Pillar 5 — Big, celebrated rewards beat constant crumbs.** Milestone chests, first-clear jackpots, event finales with a guaranteed 4★ — fewer, larger, *celebrated* payouts (full-screen moments, like a pull animation) rather than a stream of +5 currency toasts nobody feels.

**Pillar 6 — Respect the session, never punish absence.** Dailies in under 10 minutes; no login streaks that break, no FOMO decay, idle earnings cap at 24h so a weekend away costs little. Coming back should feel like a warm welcome (accumulated loot chest), not homework debt.

**Pillar 7 — Characters are the real retention.** Story spotlights, bond conversations, and showcase clips make players *want* the next unit. The pull is the reward; the grind is just the road between pulls and the challenges that test them.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Content treadmill outpaces a small team | 2D + turn-based drastically cuts per-character cost; roguelite mode is evergreen |
| Gacha regulation shifts | Guardrails above already exceed current requirements |
| Standing out vs. HoYo | Art direction + portrait-first play + idle layer targets the commute niche HoYo underserves |
| Server costs at scale | Start account-light (see build roadmap); add server authority only when revenue justifies it |
