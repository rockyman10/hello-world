# STARFALL → ROBLOX PIVOT
### "Meridian Station" — a sci-fi tycoon-collection game that teaches money & math

**Why this pivot:** Roblox removes the two costs that stalled the standalone game — **character art** (use Roblox avatars + free UGC) and **backend** (accounts, servers, matchmaking, payments are all built in). It adds ~70M daily users who are the exact edutainment audience. Your 2019 16" MacBook Pro runs **Roblox Studio** natively; the language is **Luau**. The tested design work from Starfall — combat math, economy/pity math, affinity systems, lore, characters — is framework-agnostic logic that ports to Luau.

**The winning category:** tycoon-collection hybrid. Tycoons are where solo Roblox devs realistically earn; collection/battle drives retention; and the STEM is **baked into the core loop** (resource management, ratios, compounding, budgeting) rather than bolted on as quizzes. Credible to a parent, monetizes like a mainstream game.

> **The one rule that makes it work:** a genuinely fun mainstream game *first*, with learning baked into the action. Kids must never feel schooled.

---

## 1. The game in one paragraph

You inherit a derelict deep-space station, the **Meridian**. You rebuild it module by module — Reactor, Biolab, Archive, Foundry — each of which *produces resources by running a real system you manage* (power budgets, growth ratios, supply/demand). Production currency recruits and levels **Voidborn operatives** (earned, never bought randomly), whom you deploy into **turn-meter battles** against the Eclipse to reclaim sectors and unlock new station tech. The station is the money loop; the operatives are the retention hook; the management *is* the lesson.

---

## 2. What each module teaches (STEM/economics baked in, no quizzes)

| Module | Core action | What it teaches natively |
|---|---|---|
| **Reactor** | Allocate a fixed power budget across systems; over-allocate and it browns out | Budgeting, constraints, opportunity cost |
| **Biolab** | Set growth ratios; yields compound over time if balanced | Ratios, exponential growth, compounding |
| **Archive** | Trade surplus resources on a fluctuating market | Supply/demand, buy-low/sell-high, expected value |
| **Foundry** | Combine inputs at recipe ratios to craft gear | Fractions, proportions, multi-step planning |
| **Nav Deck** | Choose sector missions by risk/reward payoff | Probability, risk vs. reward, decision-making |

Difficulty scales with player level, so a 9-year-old learns ratios while a 14-year-old optimizes compounding curves — same systems, deeper math.

---

## 3. The loops (reusing Starfall's proven design)

1. **Tycoon loop (minutes, the earner):** modules produce **Credits** offline and on — this is our **Meridian Reactor idle system** (`prototype/meta.js`), already designed and tuned, reskinned as the whole station.
2. **Collection loop (sessions, the retention):** Credits + mission rewards recruit/level operatives. Earn-to-collect — the pity/economy math from `meta.js` becomes a *transparent milestone track*, not a paid lootbox.
3. **Battle loop (the depth):** the RAID-style turn-meter combat (`prototype/combat.js`) — affinity triangle, buff/debuff warfare, titans — is the "spend your production" endgame. Ports to Luau nearly 1:1 (see §6).
4. **Mastery loop (weekly):** sector events and station-wide efficiency challenges — leaderboards drive the Roblox engagement algorithm.

---

## 4. Roblox-compliant monetization (all built in, no infra, no paid gacha)

**Design principle:** sell acceleration, expression, and convenience — never randomized power. Collection is always earnable.

| Product (Roblox type) | Example | Why it's safe + effective |
|---|---|---|
| **Game Passes** (one-time) | +2 build slots, auto-collect Credits, "Navigator's Log" (2× offline cap) | Convenience, not power spikes |
| **Developer Products** (repeatable) | Credit boosts, mission retries, instant-finish a build timer | Accelerators; nothing PvP-decisive |
| **Premium Payouts** | (passive) Roblox pays you per minute Premium users play | An engaging edu-game earns this with zero selling |
| **VIP / Private Servers** | recurring Robux — a private station for a class or friend group | Recurring revenue; teacher-friendly |
| **UGC cosmetics** | operative skins & station themes via Roblox avatars | **Zero 3D-art cost to you** |

**Never:** paid random rolls, pay-to-win in any competitive mode, FOMO-only content. (Roblox restricts paid random rewards, especially for under-13, and requires odds disclosure — our earn-based design sidesteps this entirely.)

**DevEx:** convert earned Robux to USD once past Roblox's payout threshold.

---

## 5. Build plan on your Mac (Roblox Studio + Luau)

**Prereqs (all free):** Roblox Studio for macOS, a Roblox account, the **Rojo** toolchain (optional, lets you edit Luau in VS Code and sync to Studio — great since our logic is already in files).

- **Week 1 — Tycoon skeleton.** One buildable module that produces Credits on a timer; a save system (Roblox `DataStoreService`). Ship *nothing* else. Goal: a working earn loop.
- **Week 2 — 3 more modules + the management micro-actions** (power budget, growth ratios). This is where the "learning by playing" lands.
- **Week 3 — Collection.** Port the operative roster + earn-to-recruit track from `meta.js` to Luau. Roblox avatars stand in for operative art.
- **Week 4 — Battle.** Port `combat.js` (turn meter, affinity, buffs/debuffs) to Luau; wire one sector of missions.
- **Week 5 — Monetization + polish.** Game passes, dev products, a cosmetic or two, a leaderboard.
- **Week 6 — Soft launch.** Publish, invite a small group, watch retention (D1/D7) before any marketing. Iterate on the first mission and first 5 minutes — that's what the algorithm judges.

**Playtest the fun before the teaching** — if the tycoon loop isn't compelling with the math turned off, the math won't save it (same gate as our spreadsheet-first rule in `BUILD_ROADMAP.md`).

---

## 6. Why the port is cheap: our logic already fits Luau

`combat.js` and `meta.js` are pure, DOM-free, data-driven logic — no browser or engine dependencies. Translating to Luau is mechanical: JS objects → Lua tables, `Math.random` → seeded RNG, functions stay functions. A worked example of the turn-meter core is in **`prototype/luau/combat_core.lua`** — it mirrors `combat.js`'s meter fill + affinity + a basic attack so you can see the 1:1 mapping. The balance numbers (win-rate bands, drop rates, idle rates) carry over unchanged because they're just data.

**Reused as-is:** lore bible (`LORE.md`), the fun-over-grind and monetization pillars (`GAME_CONCEPT.md` §9, `MONETIZATION.md`), the idle-economy tuning, and the Chapter 1–2 story beats.

---

## 7. Honest expectations

Most Roblox games earn little — outcomes are a power law driven by retention and the discovery algorithm, not by the concept. This category is simply the one where a solo dev on a laptop has a *realistic* shot at both revenue and an educational story. Treat first revenue as validation; reinvest engagement data into whatever's actually retaining players. The tycoon earns while you learn what works; the collection/battle depth is what turns a spike into a game.
