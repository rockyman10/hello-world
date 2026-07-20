# Building STARFALL: ECLIPSE PROTOCOL for $0
### A step-by-step roadmap using only free tools

The strategy: build a **web-first vertical slice** solo/small-team, prove the loop is fun, then scale. Every tool below has a genuinely free tier or is open source — no trials, no credit card.

---

## Phase 0 — Design on Paper (Weeks 1–2, $0)

1. **Write the one-page design doc** (done — see `GAME_CONCEPT.md`).
2. **Prototype the gacha math in a spreadsheet** (Google Sheets, free): simulate 10,000 pull sessions, verify pity curve feels right, model F2P income per patch.
3. **Prototype combat on paper or in a spreadsheet:** 5 units vs. 3 enemies, run the turn meter by hand for 10 turns — verify speed differences and turn-meter boosts/drains create interesting ordering decisions, and that a debuff team beats a raw-damage team on the boss. If it's not interesting in a spreadsheet, no engine will save it.
4. **Scope ruthlessly for the vertical slice:** 5 playable units, 1 star system, 5 combat encounters, 1 boss, working gacha with placeholder pool. Nothing else.

## Phase 1 — Tools Setup (Week 3, $0)

| Need | Free tool | Why |
|---|---|---|
| Engine | **Godot 4** | Fully free/open-source, no revenue cut ever, exports to web/mobile/PC, great 2D |
| Alternative (web-native) | **Phaser 3 + TypeScript** | If you want pure browser + npm ecosystem |
| Code hosting / CI | **GitHub free** (this repo) + GitHub Actions | Free CI minutes for builds |
| Art | **Krita** (painting), **Aseprite alternative: LibreSprite**, **Inkscape** (UI vectors) | Open source |
| Character rigging | **Blender** grease pencil, or free tier of **Live2D Cubism** (indie free version) | 2D motion like Nikke/Arknights |
| Audio | **LMMS** (music), **Audacity** (SFX editing), **freesound.org / OpenGameArt** (CC0 assets) | Open source + free assets |
| UI mockups | **Figma free tier** or **Penpot** (open source) | Design the ZZZ-style menus before coding them |
| Project tracking | **GitHub Projects** | Free, lives with the code |

**Recommended stack: Godot 4 + GDScript**, exporting to HTML5 first. Mobile export comes free later from the same project.

## Phase 2 — Core Combat Prototype (Weeks 4–8, $0)

> **Status: started.** A playable browser prototype lives in [`/prototype`](../prototype/) — open `prototype/index.html` in any browser (no install, no build step). Engine logic is DOM-free in `combat.js` (portable to Godot/server later); `node prototype/test.js` runs a 500-battle balance/invariant harness.

Build in this order — each step is playable:

1. **Turn Meter system:** every unit's meter fills by Speed each tick; act at 100%. Gray boxes, debug text, visible meter bars. No art. (This is the whole feel of RAID combat — get the tick rate and meter readability right first.)
2. **Basic attacks + skills with cooldowns:** per-unit skill definitions with cooldown tracking and simple targeting (single/AoE).
3. **Buff/debuff engine:** a generic status-effect system — duration in turns, tick-on-turn effects (Corrosion), stat modifiers (Armor Breach, Jam), control (Stasis Lock), and the ACC-vs-RES landing roll. *This is the deepest system in the game; build it generic so every future skill is data, not code.*
4. **Turn-meter manipulation skills** (boost allies / drain enemies) — the moment combat becomes chess.
5. **Affinity triangle:** Ion ⟶ Cryo ⟶ Plasma advantage/disadvantage rolls (crit bonus vs. weak-hit/debuff-miss), plus neutral Umbral.
6. **5 archetype units** (attacker, defender, debuffer, buffer, healer) as data files (JSON or Godot Resources) — *data-driven from day one* so adding unit #6 costs a config file, not code.
7. **One boss** with a phase change and a debuff-check mechanic (e.g., heals unless Heal Blackout is on it).
8. **Auto-battle** with a dumb-but-honest skill priority — RAID players expect auto from the first session, and it doubles as your balance-testing harness.

**Milestone gate:** hand the prototype to 3 people. If nobody says "one more fight," iterate here before building anything else.

## Phase 3 — Gacha, Meta & Progression (Weeks 9–12, $0)

> **Status: started.** The prototype now includes the full core loop — missions → Voidglass → gacha (exact pity math: soft 74 / hard 90 / 50-50 / per-10 4★ guarantee) → roster/squad building → gear sets with speed tuning → harder encounters, with localStorage saves. Also in: character leveling (Credits sink, cap 30), the idle Meridian Reactor (Credits accrue offline, 24h cap), the Void Rift roguelite (3 depths, blessing draft, wounds persist, rewards kept on defeat), **Titan Hunts** (three massive multi-phase Archive Titans with rebirth/summon/coil-heal mechanics, each dropping a titan-forged gear set), **House Vaults** (faction-gated squads), the **Eclipse Frontier** (weekly-modifier 3-stage gauntlet with a one-time seasonal jackpot), Chapter II story content, a RAID-style battle presentation layer (floating damage numbers, crit shake, turn-order ribbon, procedural character emblems), a toggleable **real-time 3D battle arena** (vendored Three.js diorama with lit voidframe figures, colossal titans, and event-driven particle bursts), plus the **zone-in polish layer**: ultimate camera punch-ins, skill cut-in banners, a warp-speed pull cinematic, the first bespoke battle model (Kaelis Vantar), and a full **banner Showcase** — a finished-fidelity hero render of Kaelis (flaring cloak, gold-trimmed void armor, crowned helm, floating void-blade, rune-circle dais, hero light rig, faked bloom, turntable, and a RECRUIT CTA) as the visual pitch — see `ART_DIRECTION.md` §3b/§3c/§5. Meta logic is DOM-free in `prototype/meta.js`; the test harness verifies pull rates, both pity guarantees, encounter win-rate bands, and all three systems.

1. **Pull system:** implement the exact pity math from the spreadsheet (soft pity @74, hard @90, 50/50). Client-side for now; keep the pull logic in one pure function so it can move server-side later untouched.
2. **Roster & leveling:** level/ascend with two farmable materials max in the slice.
3. **Pull animation:** one skippable, satisfying sequence (screen crack + rarity color). This single animation carries enormous perceived value — study HSR's.
4. **Save system:** local save (Godot's `user://` + JSON). Cloud saves come later.
5. **Daily loop stub:** 3 daily tasks granting pull currency.

## Phase 4 — Content & Polish for the Vertical Slice (Weeks 13–18, $0)

1. **Art pass:** 4 characters. If you can't draw: commission-free route is CC0/CC-BY packs from itch.io + OpenGameArt as placeholders, and lean the launch aesthetic on strong UI + silhouettes. (Do **not** ship AI-generated character art as your identity — the gacha audience punishes it.)
2. **One story chapter:** dialogue system (Godot: free **Dialogic 2** addon), ~20 minutes of story.
3. **UI pass** from the Figma mockups.
4. **Audio pass:** 3 music tracks, core SFX.
5. **Onboarding:** first 10 minutes = tutorial fight → story beat → free 10-pull. Copy the market leaders' opening flow shamelessly.

## Phase 5 — Ship the Slice Publicly (Week 19+, $0)

| Need | Free option |
|---|---|
| Web hosting | **itch.io** (HTML5 upload, free) and/or **GitHub Pages** from this repo |
| Landing page | GitHub Pages |
| Community | **Discord** (free) + a subreddit |
| Analytics | Godot + self-hosted **Plausible**-style events to a free-tier backend, or itch.io's built-in stats |
| Feedback | Google Forms embedded post-session |

Launch as **"STARFALL — Combat Demo"**. Devlog on itch.io + TikTok/YouTube Shorts of combat clips (gacha audiences discover games through character showcase clips — this is free UA).

## Phase 6 — Only After the Slice Proves Out (still ~$0)

1. **Accounts & cloud saves:** **Supabase** or **Firebase** free tier (auth + Postgres/Firestore). Free tiers comfortably cover thousands of DAU.
2. **Server-authoritative pulls:** move that pure pull function into a **Supabase Edge Function / Cloudflare Workers** (free tier: 100k requests/day). Required before any real money touches the game.
3. **Mobile builds:** Godot exports Android free (Play Console has a one-time $25 fee — the *only* unavoidable cost in this entire plan, and only when you're ready for the store; iOS needs $99/yr, defer it).
4. **Live-ops:** patch cadence from the concept doc, driven by remote config (Supabase table) so events don't require client updates.
5. **Monetization:** only now, only with the ethical guardrails in the concept doc, and check local gacha-disclosure law first.

---

## Total budget summary

| Item | Cost |
|---|---|
| Everything through public web launch | **$0** |
| Google Play (optional, one-time) | $25 |
| Apple App Store (optional, yearly) | $99 |

## The three rules that keep this shippable

1. **Data-driven everything** — characters, enemies, banners, and events are config files, not code.
2. **Web first** — instant playtesting via a link beats waiting for app-store review while you iterate.
3. **The slice is the product** — nothing from Phase 6 exists until strangers replay Phase 5 voluntarily.
