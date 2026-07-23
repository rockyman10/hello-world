# Handoff — resume this project locally

You're picking up "Starfall: Eclipse Protocol" (a sci-fi gacha concept, now pivoting toward a Roblox tycoon-collection spinoff). This note exists so a fresh Claude Code session — or you — can resume without re-deriving context. Paste this file's contents (or just point Claude at it) as your first prompt in the new session.

## Repo state
Branch: `claude/sci-fi-gacha-game-concept-xpzmzi` (tracked by GitHub PR #2 on `rockyman10/hello-world`). All work described below is committed and pushed there — nothing is sitting only in this conversation.

## What exists

**Design docs (`docs/`)**
- `GAME_CONCEPT.md` — core pitch: RAID: Shadow Legends-style turn-meter combat (affinity triangle, buff/debuff warfare, gear speed-tuning) + gacha economy, with "fun over grind" pillars (§9) driving every design call.
- `LORE.md` — five Genome Houses (factions), rarity tier names (Strand/Vector/Prime/Singularity), Chapter 1–2 story, Archive Titans mythology.
- `MONETIZATION.md` — Anchor Pass ladder, ethical guardrails, no-paid-gacha-for-power principles.
- `ART_DIRECTION.md` — the visual pipeline: 2D "juice" → 3D battle arena → banner showcase → real Blender-sculpted glTF models (§5d has an honest "distance to RAID-level" step count).
- `BUILD_ROADMAP.md` — phase-by-phase $0 build plan; tracks what's done vs. planned.
- `ROBLOX_PIVOT.md` — **the current direction**: "Meridian Station," a tycoon-collection Roblox game that teaches money/math natively (no quizzes), chosen because it has the best money-potential × educational-credibility balance of four options considered. Includes a 6-week Roblox Studio build plan and monetization model compliant with Roblox's rules (earn-only collection, no paid random rewards).

**Playable prototype (`prototype/`)** — a full browser game, zero install, opens from `file://`:
- `combat.js` / `meta.js` — the tested game engine and economy (turn meter, affinity, buffs/debuffs, titans, gacha pity math, gear, leveling, idle reactor, Void Rift, House Vaults, Eclipse Frontier). `test.js` is a 7-suite harness — run `node prototype/test.js`.
- `index.html` — full UI: missions, hangar, gacha, titan hunts, frontier, vaults, 2D battle screen with juice (damage numbers, crit shake, turn-order ribbon).
- `battle3d.js` — toggleable real-time 3D battle arena (Three.js).
- `showcase.js` + `prototype/models/*.glb` — a banner-quality character showcase with **real Blender-sculpted models** (Kaelis, Juno-9), built by a headless-Blender pipeline (`prototype/models/sculpt.py`, needs `pip install bpy` to regenerate), with bloom + filmic tone mapping.
- `prototype/luau/combat_core.lua` — worked proof that the combat logic ports to Luau/Roblox almost 1:1 (turn meter, affinity, basic attack).

## Where we left off
Just finished writing `ROBLOX_PIVOT.md` and the Luau combat port. Two next steps were offered and not yet started:
1. **Expand the Luau port** into a fuller ModuleScript set (bring over the buff/debuff engine and economy/idle system from `meta.js`, not just the combat slice).
2. **Build the Week-1 Roblox tycoon prototype** — one buildable module with a produce-on-a-timer loop + DataStore save, per the 6-week plan in `ROBLOX_PIVOT.md` §5. This is the smallest thing that proves the earn loop is fun before adding anything else.

## Running it locally
```bash
git clone https://github.com/rockyman10/hello-world.git
cd hello-world
git checkout claude/sci-fi-gacha-game-concept-xpzmzi
open prototype/index.html        # or: cd prototype && python3 -m http.server 8000
node prototype/test.js           # run the 7-suite harness
```
For Roblox work: Roblox Studio (macOS) + a Roblox account; Rojo is optional but recommended for editing Luau in a real editor and syncing to Studio.

## House style, if continuing with Claude
Every feature so far was: designed → implemented → balance-tuned via the test harness → verified end-to-end in headless Chromium with screenshots → committed with a descriptive message. Keep that bar. Don't re-litigate settled decisions (turn-meter combat over shared-charge, tycoon-collection over the other three Roblox options, earn-only collection over paid gacha) unless the user explicitly reopens them.
