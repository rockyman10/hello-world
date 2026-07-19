# STARFALL: ECLIPSE PROTOCOL — Monetization Strategy

**Thesis: monetize love, not frustration.** In 2024–2026 the gacha market's revenue leaders (HoYo titles, Nikke) all converged on the same finding: long-term revenue is `retention × conversion`, and retention dies when players feel farmed. Every mechanism below sells *acceleration, convenience, or expression* — never relief from pain we deliberately created. That last pattern is RAID's monetization reputation, and it is the single thing we must not copy from RAID.

---

## 1. The Revenue Ladder (in order of importance)

### Tier 1 — The Anchor Pass (~$5/month) · the backbone
Small instant Voidglass grant + a daily drip (roughly doubling a free player's pull income). **This is the most important SKU in the game.** Genre data is consistent: the $5 monthly pass converts an order of magnitude more players than any other product, and monthly-pass holders retain dramatically better because they log in to collect what they already paid for. Design target: an Anchor Pass player should feel they get ~80% of a "spender's" experience for $5.

### Tier 2 — The Chronoprint Pass (~$10/patch, 6 weeks) · battle pass
Free track for everyone; paid track adds materials, caches, a skin every other patch, and one guaranteed VECTOR selector. Progress comes from playing normally (missions, rifts, dailies) — never from grinding extra hours, or the pass becomes homework and kills the retention it exists to build.

### Tier 3 — Direct Voidglass top-ups · the whale lane
Standard tiered packs with **first-purchase double bonus** per tier (the industry's most effective one-time conversion tool). No purchase-triggered popups, no "limited offer" countdown spam — store is a place you *go*, not a thing that chases you.

### Tier 4 — Cosmetics · the long game
Skins (per-character outfits with unique pull-in animations), ship interior themes for the Meridian, UI themes, victory-screen flourishes. **Zero stats, ever.** Cosmetics scale beautifully with attachment — which is why the lore/House investment isn't just narrative polish, it's the cosmetic revenue engine. A player who loves Juno-9 buys her stage outfit; nobody buys outfits for stat-sticks.

### Tier 5 — One-time bundles · conversion accelerants
Chapter-clear bundles ("Chapter 1 Commemorative: 10 pulls + caches, 80% off nominal"), first-Prime celebration pack, House-themed starter bundles. One-time-per-account keeps them exciting instead of extractive.

**Expected mix at maturity** (based on genre benchmarks): ~35% passes, ~40% top-ups, ~15% cosmetics, ~10% bundles. If passes fall below ~25%, the game is over-indexing on whales — a fragility signal, not a success signal.

---

## 2. What We Deliberately Do NOT Sell

These are the highest-revenue-per-quarter, highest-churn-per-year mechanics in the genre. Refusing them *is* the strategy:

- **No energy refills for cash.** Energy never gates story/bosses/rifts (design pillar), so there's no frustration to sell relief from.
- **No gear RNG monetization.** RAID's most-hated system is monetized substat rerolling. Our gear pity-tokens are earnable only.
- **No paid-exclusive units.** Every operative is pullable with earnable currency. (Cosmetic-only collab skins may be paid.)
- **No pay-to-win in PvP.** Arena rewards cosmetics and modest currency, not power spirals.
- **No FOMO-only units.** Limited banners rerun within ~12 months, stated at launch. FOMO revenue is borrowed from future trust.
- **No dark patterns.** No fake discounts, no decoy pricing, no purchase-flow confirmshaming, no popups after losses.

## 3. Trust Infrastructure (compliance + goodwill)

- Published rates and pity in-game (already in the prototype's banner screen) — legally required in a growing list of markets, table stakes everywhere else.
- **Spending recap**: monthly in-game statement of what was spent and received.
- Real parental controls and spend limits for minors.
- Pity/guarantee state always visible *before* purchase.
- Anniversary/half-anniversary generosity (free Prime selector) — the market has repeatedly punished stingy anniversaries with review-bombs; generosity here is cheap insurance and genuine goodwill.

## 4. Channel Strategy — Keep the 30%

Launch web-first (already our plan), which means **direct payments from day one** with no store cut. When mobile launches, follow the HoYo/mihoyo playbook: an out-of-app **web shop** with bonus currency for direct purchases. Every 30% not paid to a store is roughly equivalent to increasing revenue by 40% on those transactions. (Free stack: Stripe/Paddle for payments; merchant-of-record services handle global VAT for a small cut.)

## 5. Rollout Sequencing

1. **Vertical slice / soft launch:** no monetization at all. Prove D1/D7 retention first (targets: D1 > 40%, D7 > 15% for the genre).
2. **Launch:** Anchor Pass + top-ups only. A tiny SKU list signals confidence and keeps the economy readable.
3. **Patch 2:** Chronoprint Pass, first-purchase bonuses, chapter bundles.
4. **Patch 4+:** cosmetics line, once attachment data shows which characters players love.
5. **Continuous:** watch the guardrail metrics — if F2P pull income per patch drops below ~70, or pass share of revenue falls, fix the game before touching the store.

## 6. KPIs That Matter

| Metric | Healthy target | Why it matters |
|---|---|---|
| D30 retention | > 8–10% | The whole model is worthless without it |
| Payer conversion | 3–6% | Below 2% = pass value unclear; above 8% with low D30 = extraction warning |
| Pass share of revenue | 25–40% | The "broad healthy base" indicator |
| ARPDAU | $0.20–0.50 at scale | Genre-normal band |
| F2P pulls/patch | ~70–80 | The generosity floor that protects retention |
| Refund/chargeback rate | < 0.5% | Trust failure detector |

---

*Related docs: economy details in `GAME_CONCEPT.md` §5; the fun-over-grind pillars this strategy depends on in §9.*
