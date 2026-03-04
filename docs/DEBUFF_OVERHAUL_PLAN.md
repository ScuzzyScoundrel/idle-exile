# Debuff Overhaul & Weapon Tree Enhancement Plan

## Context

The current debuff system has 10 debuffs but they're mechanically flat - DoTs use fixed DPS values, and several debuffs just apply generic "% more damage taken." The `incDoTDamage` gear stat exists but is never applied to actual DoT calculations (bug). This overhaul redesigns each debuff to have a distinct, interesting identity, then leverages those mechanics to make weapon skill trees more compelling. Planned as 4 small sprints, each independently shippable.

---

## Debuff Redesign Summary

| Debuff | Current | New Mechanic |
|--------|---------|-------------|
| **Bleeding** | Flat 8 DPS/stack | Each stack snapshots hit damage. Triggers X% of snapshot when **enemy attacks** (not per-second). Max 5 stacks. |
| **Poisoned** | Flat 2 DPS/stack | Each stack snapshots hit damage. X% of snapshot as DoT/sec. Max 10 stacks. |
| **Burning** | Flat 5 DPS | X% of **enemy max HP** as fire damage/sec. Strong vs bosses. |
| **Shocked** | +15% damage taken/stack | Enemy has +X% chance to **be crit** per stack. Max 3 stacks. |
| **Chilled** | +10% damage taken | **Shatter on Kill**: X% of overkill damage dealt to next enemy as cold damage. |
| **Vulnerable** | +30% crit damage taken | Flat +X% **more damage taken** from all sources. |
| **Slowed** | -20% attack speed | *Unchanged* |
| **Weakened** | -10% enemy damage | *Unchanged* |
| **Blinded** | 20% miss chance | *Unchanged* |
| **Cursed** | -15 resists/stack | *Unchanged* |

---

## Sprint 1: Core Debuff Engine Overhaul — COMPLETE

### Changes Made
- **Types**: Added `dotType`, new effect fields (`snapshotPercent`, `percentMaxHp`, `incCritChanceTaken`, `shatterOverkillPercent`) to `DebuffDef`; added `stackSnapshots` to `ActiveDebuff`
- **Data**: All 10 debuffs rewritten with new mechanics and descriptions
- **Engine**: Snapshot application, DoT tick rework, bleed-on-enemy-attack (3 sites), shocked +crit pre-roll, chilled shatter on kill, incDoTDamage bug fix
- **Migration**: v41 resets activeDebuffs

## Sprint 2: Combat Log & Debuff UX (Future)
## Sprint 3: Skill Tree Debuff Integration (Future)
## Sprint 4+: Weapon Tree Differentiation (Future)
