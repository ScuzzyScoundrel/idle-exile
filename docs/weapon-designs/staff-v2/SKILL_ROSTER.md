# Staff v2 — Witch Doctor Skill Roster

**Fantasy:** Witch Doctor channeling plague, spirits, minions, and voodoo. Stack DoTs and debuffs as setup, summon minions for passive DPS + defense, then consume everything for explosive burst.

**Primary Elements:** Chaos (poison/plague/curse), Cold (spirits/haunt), Fire (voodoo fire/skulls)

**Scaling:** Pure spell power (`spellPowerRatio`). Staff is 2H spell weapon (no offhand).

**GCD:** All skills use flat `castTime: 1.0` (BASE_GCD). Pacing comes entirely from `cooldown`.

---

## Combo States

| State ID | Created By | Trigger | Duration | Consumers | Consume Bonus |
|----------|-----------|---------|----------|-----------|---------------|
| `haunted` | Zombie Dog attacks, Haunt on cast | dog bite / on cast | 5s | Spirit Barrage | Guaranteed crit + 30% bonus damage |
| `plagued` | Locust Swarm on cast | on cast | 6s | Plague of Toads | Pandemic: spread all active DoTs to ALL enemies |
| `hexed` | Hex on cast | on cast | 5s | Soul Harvest | 2x damage on this cast |
| `soul_stack` | Soul Harvest on cast | on cast | 10s | Bouncing Skull, Mass Sacrifice | Skull: +1 bounce per stack. Mass Sacrifice: +15% dmg per stack. Max 5 stacks, refreshes on new stack. |
| `spirit_link` | Zombie Dogs (while alive), Fetish Swarm (while alive) | while minions active | minion duration | Mass Sacrifice | Detonate all linked minions (remaining HP as AoE chaos damage) |

### Combo Flow Diagram

```
Zombie Dogs (attacks) ──→ [haunted] ──→ Spirit Barrage consumes (crit + 30% dmg)
Haunt (on cast) ────────→ [haunted] ──┘

Locust Swarm (on cast) ─→ [plagued] ──→ Plague of Toads consumes (pandemic spread)

Hex (on cast) ──────────→ [hexed] ───→ Soul Harvest consumes (2x dmg → creates soul_stack)

Soul Harvest (on cast) ─→ [soul_stack] → Bouncing Skull consumes (+1 bounce per stack)
                                       └→ Mass Sacrifice consumes (+15% dmg per stack)

Zombie Dogs (while alive) → [spirit_link] → Mass Sacrifice consumes (detonate minions)
Fetish Swarm (while alive) → [spirit_link] ┘

Mass Sacrifice ────────→ consumes ALL → burst multiplier + detonation
```

---

## Minion System (NEW ENGINE FEATURE)

Minions are a new state system modeled after traps but with persistent behavior.

### Minion State

```typescript
interface MinionState {
  id: string;              // unique instance id
  type: string;            // 'zombie_dog' | 'fetish' | etc.
  hp: number;
  maxHp: number;
  damage: number;          // per attack (scales with spell power)
  attackInterval: number;  // seconds between attacks
  nextAttackAt: number;    // timestamp
  expiresAt: number;       // timestamp
  element: DamageType;     // damage element
  sourceSkillId: string;   // which skill summoned this
}
```

### Damage Interception

1. Incoming damage hits minions first (split evenly across all active minions)
2. When a minion dies from damage, remaining overkill passes to next minion or player
3. Player only takes direct damage when no minions remain

### Two Archetypes

| | Zombie Dogs | Fetish Swarm |
|--|------------|-------------|
| Count | 2 | 4 |
| HP each | 20% player max HP | 10% player max HP |
| Attack interval | 3s | 1.5s |
| Damage per attack | 0.6 × spell power | 0.25 × spell power |
| Duration | 10s (CD 12s = 2s gap) | 6s (CD 10s = 4s gap) |
| Element | Chaos | Physical |
| Role | Tanky bodyguards + `haunted` creators | Glass cannon DPS |
| On sacrifice (Mass Sacrifice) | Remaining HP as chaos AoE | Remaining HP as fire AoE |

- Re-casting while minions alive refreshes duration, does NOT stack additional minions
- Talent trees can extend duration, add minion count, upgrade minion type

---

## 10 Active Skills

### 1. Zombie Dogs

| Field | Value |
|-------|-------|
| **id** | `staff_zombie_dogs` |
| **name** | Zombie Dogs |
| **description** | Summon 2 zombie dogs that fight and absorb damage. Dog bites apply Haunted (5s). |
| **weaponType** | staff |
| **tags** | Spell, Chaos, Minion, Summon |
| **baseDamage** | 0 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0 (damage comes from minion attacks, not the cast) |
| **castTime** | 1.0 |
| **cooldown** | 12 |
| **levelRequired** | 1 |
| **icon** | 🐕 |
| **Combo created** | `haunted` (on dog attack), `spirit_link` (while dogs alive) |
| **Combo consumed** | — |
| **Element conversion** | Chaos base. Talent tree can change at skill level 5. |

### 2. Locust Swarm

| Field | Value |
|-------|-------|
| **id** | `staff_locust_swarm` |
| **name** | Locust Swarm |
| **description** | Release a swarm of locusts dealing chaos damage over time. On target death: swarm transfers to next enemy with remaining duration. |
| **weaponType** | staff |
| **tags** | Spell, Chaos, DoT, AoE |
| **baseDamage** | 4 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.4 |
| **castTime** | 1.0 |
| **cooldown** | 5 |
| **dotDuration** | 5 |
| **dotDamagePercent** | 0.30 |
| **levelRequired** | 1 |
| **icon** | 🦗 |
| **baseConversion** | physical → chaos 100% |
| **Combo created** | `plagued` (6s) |
| **Combo consumed** | — |
| **NEW ENGINE:** | DoT transfer on kill (remaining duration transfers to next enemy) |

### 3. Haunt

| Field | Value |
|-------|-------|
| **id** | `staff_haunt` |
| **name** | Haunt |
| **description** | Send a spirit to haunt the target, dealing cold damage over time. On target death: spirit chains to next enemy with fresh duration. |
| **weaponType** | staff |
| **tags** | Spell, Cold, DoT, Chain |
| **baseDamage** | 3 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.5 |
| **castTime** | 1.0 |
| **cooldown** | 5 |
| **dotDuration** | 6 |
| **dotDamagePercent** | 0.25 |
| **levelRequired** | 1 |
| **icon** | 👻 |
| **baseConversion** | physical → cold 100% |
| **Combo created** | `haunted` (5s) |
| **Combo consumed** | — |
| **Key difference from Locust Swarm** | Locust transfers remaining duration on kill. Haunt starts fresh duration on chain. |
| **NEW ENGINE:** | Chain-on-death (spirit jumps to new target on carrier death) |

### 4. Hex

| Field | Value |
|-------|-------|
| **id** | `staff_hex` |
| **name** | Hex |
| **description** | Curse the target, reducing their damage by 20%. Creates Hexed state for combo consumption. |
| **weaponType** | staff |
| **tags** | Spell, Chaos, Utility, Curse |
| **baseDamage** | 2 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.3 |
| **castTime** | 1.0 |
| **cooldown** | 6 |
| **levelRequired** | 1 |
| **icon** | 🧿 |
| **baseConversion** | physical → chaos 100% |
| **Combo created** | `hexed` (5s) |
| **Combo consumed** | — |
| **Debuff applied** | `hexed` debuff on target (20% reduced damage dealt) |

### 5. Spirit Barrage

| Field | Value |
|-------|-------|
| **id** | `staff_spirit_barrage` |
| **name** | Spirit Barrage |
| **description** | Unleash 3 rapid spirit blasts. Consumes Haunted for guaranteed crits and +30% bonus damage on all hits. |
| **weaponType** | staff |
| **tags** | Spell, Cold, Projectile |
| **baseDamage** | 5 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.5 |
| **hitCount** | 3 |
| **castTime** | 1.0 |
| **cooldown** | 5 |
| **levelRequired** | 1 |
| **icon** | 💀 |
| **baseConversion** | physical → cold 100% |
| **Combo created** | — (baseline). Talent: Spirit Caller branch adds `haunted` on crit. |
| **Combo consumed** | `haunted` → guaranteed crit on all 3 hits + 30% bonus damage |

### 6. Plague of Toads

| Field | Value |
|-------|-------|
| **id** | `staff_plague_of_toads` |
| **name** | Plague of Toads |
| **description** | Release toads that leap to enemies dealing chaos AoE damage and applying poison. Consumes Plagued for pandemic: all active DoTs spread to ALL enemies. |
| **weaponType** | staff |
| **tags** | Spell, Chaos, AoE, DoT |
| **baseDamage** | 5 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.7 |
| **castTime** | 1.0 |
| **cooldown** | 5 |
| **dotDuration** | 3 |
| **dotDamagePercent** | 0.20 |
| **levelRequired** | 1 |
| **icon** | 🐸 |
| **baseConversion** | physical → chaos 100% |
| **Combo created** | — |
| **Combo consumed** | `plagued` → pandemic: spread all active DoTs from front target to ALL enemies in pack |
| **NEW ENGINE:** | Pandemic mechanic (DoT spread to all enemies on consume) |

### 7. Fetish Swarm

| Field | Value |
|-------|-------|
| **id** | `staff_fetish_swarm` |
| **name** | Fetish Swarm |
| **description** | Summon 4 fetish warriors that attack rapidly. Fragile but high DPS. |
| **weaponType** | staff |
| **tags** | Spell, Physical, Minion, AoE |
| **baseDamage** | 0 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0 (damage comes from minion attacks) |
| **castTime** | 1.0 |
| **cooldown** | 10 |
| **levelRequired** | 1 |
| **icon** | 🎭 |
| **Combo created** | `spirit_link` (while fetishes alive) |
| **Combo consumed** | — |

### 8. Soul Harvest

| Field | Value |
|-------|-------|
| **id** | `staff_soul_harvest` |
| **name** | Soul Harvest |
| **description** | Harvest soul energy from the target. Consumes Hexed for 2x damage. Creates Soul Stack (max 5, 10s, refreshes). |
| **weaponType** | staff |
| **tags** | Spell, Chaos |
| **baseDamage** | 6 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.8 |
| **castTime** | 1.0 |
| **cooldown** | 6 |
| **levelRequired** | 1 |
| **icon** | 💜 |
| **baseConversion** | physical → chaos 100% |
| **Combo created** | `soul_stack` (10s, max 5, refreshes on new stack) |
| **Combo consumed** | `hexed` → 2x damage on this cast |

### 9. Bouncing Skull

| Field | Value |
|-------|-------|
| **id** | `staff_bouncing_skull` |
| **name** | Bouncing Skull |
| **description** | Hurl a flaming skull that bounces between enemies. Consumes Soul Stacks for +1 bounce per stack consumed. |
| **weaponType** | staff |
| **tags** | Spell, Fire, Chain, Projectile |
| **baseDamage** | 5 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 0.7 |
| **chainCount** | 2 |
| **castTime** | 1.0 |
| **cooldown** | 5 |
| **levelRequired** | 1 |
| **icon** | 🔥 |
| **baseConversion** | physical → fire 100% |
| **Combo created** | — |
| **Combo consumed** | `soul_stack` → +1 chain per stack (2 base + up to 5 = 7 max bounces) |

### 10. Mass Sacrifice

| Field | Value |
|-------|-------|
| **id** | `staff_mass_sacrifice` |
| **name** | Mass Sacrifice |
| **description** | Consume ALL active combo states and detonate all minions. Each consumed state adds a damage multiplier. Detonated minions deal their remaining HP as AoE. |
| **weaponType** | staff |
| **tags** | Spell, Chaos, Heavy |
| **baseDamage** | 15 |
| **weaponDamagePercent** | 0 |
| **spellPowerRatio** | 2.0 |
| **castTime** | 1.0 |
| **cooldown** | 12 |
| **levelRequired** | 1 |
| **icon** | ☠️ |
| **baseConversion** | physical → chaos 100% |
| **Combo created** | — |
| **Combo consumed** | ALL active states: |

**Mass Sacrifice consume bonuses:**

| State | Bonus |
|-------|-------|
| `haunted` | +20% damage |
| `plagued` | +20% damage + spread all DoTs |
| `hexed` | +20% damage |
| `soul_stack` | +15% damage per stack (up to +75% at 5 stacks) |
| `spirit_link` | Detonate all linked minions (remaining HP as AoE chaos damage) |

**Theoretical max with all states + 5 soul stacks:**
`2.0 SPR × (1 + 0.20 + 0.20 + 0.20 + 0.75) = 2.0 × 2.35 = 4.7 SPR` + minion HP detonation

---

## 3 Buff Abilities

### 1. Spirit Walk (Spirit Caller Buff)

| Field | Value |
|-------|-------|
| **id** | `staff_spirit_walk` |
| **name** | Spirit Walk |
| **description** | Phase into the spirit realm. +25% dodge chance, +15% damage for 8s. |
| **weaponType** | staff |
| **kind** | buff |
| **icon** | 👻 |
| **duration** | 8 |
| **cooldown** | 45 |
| **effect** | `{ dodgeChanceBonus: 25, damageMult: 1.15 }` |

### 2. Big Bad Voodoo (Voodoo Master Buff)

| Field | Value |
|-------|-------|
| **id** | `staff_big_bad_voodoo` |
| **name** | Big Bad Voodoo |
| **description** | Channel massive voodoo power. +50% attack speed, +30% damage for 10s. |
| **weaponType** | staff |
| **kind** | buff |
| **icon** | 🥁 |
| **duration** | 10 |
| **cooldown** | 60 |
| **effect** | `{ attackSpeedMult: 1.5, damageMult: 1.3 }` |

### 3. Grave Injustice (Plague Doctor Passive)

| Field | Value |
|-------|-------|
| **id** | `staff_grave_injustice` |
| **name** | Grave Injustice |
| **description** | On kill: reduce all cooldowns by 1s and heal 2% max life. |
| **weaponType** | staff |
| **kind** | passive |
| **icon** | ⚰️ |
| **effect** | `{ onKillCDR: 1, onKillHealPercent: 2 }` |
| **NEW ENGINE:** | `onKillCDR` — reduce all skill cooldowns by flat seconds on kill. `onKillHealPercent` — heal % max life on kill. |

---

## Talent Branch Archetypes

Each of the 10 active skill talent trees has 3 branches:

| Branch | Theme | Fantasy |
|--------|-------|---------|
| **Plague Doctor** | DoT scaling, ailment spread, poison stacking, pandemic | Your diseases are the weapon |
| **Spirit Caller** | Spirits, minions, chain on death, haunt empowerment | The dead fight for you |
| **Voodoo Master** | Hex/curse power, soul harvest, burst payoff, control | Consume everything for power |

---

## New Engine Features Required

### New Systems

| Feature | Description | Scope |
|---------|-------------|-------|
| **Minion system** | `activeMinions: MinionState[]` on GameState. Persistent summons with HP, attack timers, damage interception. | Large — new state, tick logic, UI |
| **Damage interception** | Incoming damage hits minions first (split evenly), overkill passes through. | Medium — modifies incoming damage pipeline |
| **DoT transfer on kill** | Locust Swarm: active DoT transfers to next enemy preserving remaining duration. | Medium — new death-handling behavior |
| **Chain on death** | Haunt: spirit chains to new target on carrier death with fresh duration. | Medium — similar to existing chain but triggered on death |
| **Pandemic spread** | Plague of Toads consume: copy all active DoTs from front target to all pack members. | Medium — new DoT spreading logic |
| **Multi-state consumption** | Mass Sacrifice: consume all active combo states at once, bonus per state type. | Small — extends existing consume logic |

### New Engine Fields

| Field | Type | Where | Purpose |
|-------|------|-------|---------|
| `activeMinions` | `MinionState[]` | GameState | Track active minions |
| `onKillCDR` | `number` | AbilityEffect | Flat CD reduction on kill (Grave Injustice) |
| `onKillHealPercent` | `number` | AbilityEffect | % max life healed on kill |
| `dodgeChanceBonus` | `number` | AbilityEffect | Flat dodge chance bonus (Spirit Walk) — may already exist |
| `dotTransferOnKill` | `boolean` | SkillDef or graphMod | Enable DoT transfer behavior |
| `chainOnDeath` | `boolean` | SkillDef or graphMod | Enable chain-on-death behavior |
| `pandemicOnConsume` | `boolean` | ComboStateConsumer | Spread DoTs on consume |

---

## Comparison to Dagger v2

| | Dagger | Staff (Witch Doctor) |
|--|--------|---------------------|
| Speed | 1.3x (fastest) | 0.8x (slow caster) |
| Handedness | 1H + offhand | 2H, no offhand |
| Scaling | Hybrid (atk + spell) | Pure spell power |
| Setup → Burst | 3 GCDs → Assassinate | 5 GCDs → Mass Sacrifice |
| Between bursts | Low (CD waiting) | High (DoTs + minions ticking) |
| Defense | Blade Ward (temp DR + counter) | Minions absorb hits |
| Unique | Traps, combo counter-attacks | Minions, DoT spreading, pandemic |
| Element spread | Chaos/Lightning/Physical | Chaos/Cold/Fire |
