# STARFALL: ECLIPSE PROTOCOL — Art Direction
### Bringing RAID-quality visuals to the game for $0

## 1. What "RAID-style visuals" actually are

Deconstruct RAID: Shadow Legends' look and it's five separable ingredients — none of which requires their budget:

1. **Painterly-realistic 3D characters** with heavy rim lighting and gritty material detail
2. **A dark, high-contrast UI** — near-black panels, metallic borders, gold accents on everything that matters
3. **Battle "juice"**: big floating damage numbers, crit pops, screen shake, hit flashes, skill cast flourishes
4. **The turn-order ribbon** — the strip of portraits showing who acts next (the single most recognizable RAID UI element)
5. **Monumental boss staging** — the boss physically dwarfs the squad on screen

Items 2–5 are *presentation engineering*, not art assets. **They are now implemented in the prototype** (see §3). Item 1 is an asset pipeline problem with a real $0 path (§2).

## 2. The character-art pipeline (free tools, RAID-adjacent look)

RAID's characters are 3D renders. The free path to that look:

**Route A — stylized 3D in Blender (closest to RAID):**
- Model in **Blender** (free); sculpt-and-retopo or kitbash from CC0 model packs (Quaternius, Kenney, Poly Haven models).
- Materials/lighting: Poly Haven CC0 HDRIs + heavy rim light (one cool key, one warm/affinity-colored rim) — this two-light setup IS most of the "RAID look."
- Render to 2D: pose each character, render a 3/4 portrait + full-body at 2–4k, paint over in **Krita** for grit. You ship *renders*, not real-time 3D — massively cheaper, and how many "3D-looking" gachas actually work.
- Idle motion later: cut the render into layers and rig in **Live2D Cubism (free indie tier)** or **DragonBones** (fully free) for breathing/hair drift.

**Route B — painted 2D with the RAID lighting formula:** paint directly in Krita over a Blender blockout for perspective; same rim-light rule. Faster per character, needs stronger painting skill.

**Rules regardless of route:**
- **One silhouette test per character** — readable in the 26px emblem, the card, and the showcase art.
- **Affinity = light color, House = trim/material language** (Vantar black-glass and gold, Frameguard heraldic plate, Chorus neon…). This makes every asset do lore work.
- **No AI-generated character art as shipped identity** — the gacha audience detects and punishes it; concept exploration only.
- Commission budget, when it exists someday, goes to the five Prime launch characters first — they carry the store page.

## 3. Battle presentation (implemented in the prototype now)

| RAID ingredient | Prototype implementation |
|---|---|
| Floating damage numbers | Engine emits a structured event stream (`state.events`); a fixed-position FX layer spawns rising numbers — white normal, small gray weak hits, big gold rotating **crit pops** |
| Screen shake | Battlefield shakes on crits and 3000+ hits |
| Hit flashes / cast flourishes | Radial flash over the struck card (gold for crits); pulse ring on big-skill casts; "REBORN" burst on titan resurrection |
| Turn-order ribbon | Live forecast strip computed from turn meters — affinity-colored chips, next-to-act enlarged and glowing, hero/enemy edged green/red |
| Monumental bosses | Titans render as full-width cards with oversized name, HP bar, phase counter, and rebirth warning |
| Character identity | Procedural SVG **emblems** — affinity-gradient hex crest, House-colored ring, initials — used on battle cards, hangar, and pull reveals. These are the placeholder slots the Route-A renders drop into later, same shape language |
| Arena staging | Battles get a bordered starfield arena panel with drifting nebula gradients |

Design note: the FX layer is decoupled — the engine knows nothing about DOM; the UI consumes events. The same event stream drives Godot particles or Spine animations later without engine changes.

### 3b. The "zone-in" layer — motion & celebration (implemented)

The three highest-retention visual ingredients from §5's ranking are now live in the prototype:

| Ingredient | Implementation | Why it holds attention |
|---|---|---|
| **Ultimate camera punch-in** (3D) | On any cooldown skill, the orbiting camera eases into a shoulder-level close-up of the caster with an FOV push, holds on the impact frame, then eases back | The screen *reacts* to your big moments — ZZZ/HSR's core game-feel trick |
| **Skill cut-in banner** (2D + 3D) | A portrait sweeps in from the left, the skill name flashes in the caster's affinity color across a letterboxed band | Turns every signature skill into a beat; the single most repeated "juice" moment in a session |
| **Pull cinematic** | Warp-speed starfield streaking in the batch's rarity color → core flash → rarity-colored "SIGNAL LOCKED" headline with the top pull's portrait and epithet → full grid. Skippable at any point | The highest-perceived-value 15 seconds in any gacha; the reason people screenshot pulls |
| **Bespoke character models** | `MODELS` registry in `battle3d.js` — Kaelis Vantar is the first hand-built model (cloak, horned helm, void-edge blade, orbiting glass shards) replacing his graybox; others drop in one name at a time | Proves the Tier-B upgrade path: collection value rises per character without an engine rewrite |

These are the pieces that make a session feel alive between the strategic decisions — exactly the "keep players zoned in" layer.

### 3c. The banner showcase — a finished-fidelity hero render (implemented)

The **Showcase** tab is the visual pitch: a full banner-splash presentation of Kaelis Vantar at target fidelity, the quality every character upgrades toward. It's a high-detail procedural build (hundreds of primitives vs. the battle graybox's dozen) — layered flaring cloak with gold hem, gold-trimmed void armor, spiked pauldrons, crowned helm with a glowing visor, a floating void-edge greatsword, orbiting shards, and rising embers — staged on a rune-circle dais with a hero three-point light rig (cool key, purple back-rim, warm fill, top spot), faked bloom via additive glow sprites, a slow turntable, and a gold RECRUIT call-to-action over a name/epithet/rarity/stat plate. This is the "would a player spend on this?" screen, and it renders in-browser with zero external assets.

What this proves for production: the presentation *frame* (lighting rig, staging, bloom, banner UI, turntable, CTA) is done and reusable for every character. Swapping the procedural body for a **Blender-sculpted, textured model** (the §2 Route-A pipeline) drops into the same rig and lands at true store-page quality — the procedural version is the stand-in that lets the frame ship today. The bar to clear per character is *the model*, not the scene.

## 4. UI skin evolution

The current "neon-void deco" palette stays (it's our differentiation vs. RAID's brown-gold grimdark), but adopts RAID's *hierarchy rules*: gold is reserved for rewards, crits, and 5★/PRIME moments; red-pink for threat (titans, the Eclipsed); House colors never used for system chrome. When real character art lands, cards shift art-first: full-bleed portrait, UI as a thin overlay.

## 5. Going Full 3D Like RAID — Yes, and Here's the Framework

**A real-time 3D battle view now exists in the prototype** — press **3D** in any battle. It's a WebGL diorama (vendored Three.js, still zero-install, works offline): graybox "voidframe" figures and colossal titans staged on a starfield arena with the §2 two-light formula, live-synced to the battle engine — turn-meter positions, active-unit step-forward, HP rings, hit/heal/death/rebirth particle bursts from the same event stream that drives the 2D juice. The 2D cards remain the control surface below, exactly like RAID's unit frames under its 3D stage.

**What "graphics that make top games fun" actually consists of** (in order of player impact per dollar):
1. **Animation & game-feel** — snap, impact frames, hit-stop, cast flourishes (ZZZ's real secret)
2. **Celebration moments** — pull cinematics, ultimate cut-ins, victory poses (HSR's real secret)
3. **Character art quality** — faces and silhouettes players want to screenshot
4. **Scene staging** — lighting, scale contrast (titan vs. squad), camera drama
5. **Raw fidelity** — polygon counts and PBR materials — *genuinely last*; Arknights and FGO out-earn most 3D games with 2D

**The three production tiers:**

| Tier | What it is | Cost per character | Who does it |
|---|---|---|---|
| **A — Full real-time 3D** | Modeled, rigged, animated characters (RAID/HSR/ZZZ) | Highest — model + rig + ~20 animations each; 5–10× Tier B | Needs a 3D animator; only choose if combat animation IS the product |
| **B — 3D-staged hybrid** | Real-time 3D arena/staging + rendered or 2D characters | Middle — the arena is built once; characters stay cheap | **Recommended.** The prototype's 3D view is exactly this tier's skeleton |
| **C — 2D + juice** | Cards/portraits + the §3 presentation layer | Lowest | Already fully built; always the fallback |

**Recommended path:** stay Tier B. Keep the 3D arena, upgrade it incrementally — replace graybox figures with low-poly stylized models (Blender, CC0 kitbash) one banner character at a time, add attack lunges and camera punch-ins on ultimates. In Godot this same architecture carries over (the engine's event stream is renderer-agnostic). Jump to Tier A only if a 3D animator joins and playtests say combat spectacle — not collection, story, or squad-building — is why people stay.

## 6. Sequencing

1. **Now (done):** juice + emblems + ribbon + boss staging — the game already *feels* RAID-like in motion.
2. **Vertical-slice art pass:** 5 Prime portraits via Route A; drop into emblem/card slots.
3. **Pull-animation upgrade:** rarity-colored signal-lock sequence ending on the portrait (the single highest-perceived-value asset in any gacha).
4. **Battle backgrounds:** one painted arena per star system (Krita over Blender blockouts).
5. **Live2D/DragonBones idle motion** for banner characters only — spotlight spend, not roster-wide.
