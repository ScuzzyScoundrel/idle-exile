# Skill Ability Tree Design Framework

## Context

Idle Exile has 93 active skills across 14 weapon types + 42 buff/passive abilities. Only 9 wand skills have skill graphs (~35 nodes each), and those are basic stat-stick trees (flat damage, crit chance, cast speed). Every tree follows the same 3-branch pattern and skills feel interchangeable.

**Goal:** Design a framework that makes every skill tree feel unique and impactful, with ~50 nodes per tree but only 20 points to spend, forcing meaningful build decisions. This document is a **design reference** to iterate on -- not a single-sprint implementation plan.

**Current System:**
- Skill graphs: `src/data/skillGraphs/wand.ts` (9 graphs, ~35 nodes each)
- Graph engine: `src/engine/skillGraph.ts` (resolve modifiers, allocation rules)
- Types: `src/types/index.ts` (SkillModifier, SkillGraphNode, AbilityEffect)
- Combat: `src/engine/unifiedSkills.ts` (rollSkillCast, calcSkillDps)
- Debuffs: `src/data/debuffs.ts` (4 debuffs: chilled, shocked, burning, poisoned)
- Existing SkillModifier fields: incDamage, flatDamage, incCritChance, incCritMultiplier, incCastSpeed, extraHits, abilityEffect, globalEffect, convertElement, convertToAoE, durationBonus, cooldownReduction, applyDebuff, procOnHit, flags (pierce/fork/alwaysCrit/cannotCrit/lifeLeech/ignoreResists)

---

## 1. New Modifier Types

### 1A. Conditional Triggers

Modifiers that only activate under specific combat conditions.

```
TriggerCondition:
  onCrit              - this skill critically strikes
  onKill              - this skill kills the mob
  onBlock             - player blocks an attack
  onDodge             - player dodges an attack
  onHit               - this skill hits (not miss)
  onDebuffApplied     - a debuff is successfully applied
  whileLowHp          - player HP < 35%
  whileFullHp         - player HP == maxHp
  whileDebuffActive   - target has any active debuff
  afterConsecutiveHits - after N hits without miss
  onBossPhase         - only during boss encounters
  onFirstHit          - first hit on each new mob
  onOverkill          - damage exceeds mob remaining HP

ConditionalModifier:
  condition: TriggerCondition
  threshold?: number        (for afterConsecutiveHits count, whileLowHp % threshold)
  modifier: SkillModifier   (the bonus that activates)
```

New SkillModifier field: `conditionalMods?: ConditionalModifier[]`

### 1B. Expanded Proc System

Replace the simple `procOnHit: { effectId, chance }` with a rich proc system.

```
SkillProcEffect:
  id: string
  chance: number              (0-1 per trigger)
  trigger: TriggerCondition   (what triggers it)

  // What happens:
  castSkill?: string          (fire another equipped skill, bypasses cooldown)
  resetCooldown?: string      (reset cooldown of named skill)
  bonusCast?: boolean         (re-cast THIS skill immediately free)
  applyBuff?: { effect: AbilityEffect, duration: number }
  applyDebuff?: { debuffId, stacks, duration }
  instantDamage?: { flatDamage, element, scaleStat?, scaleRatio? }
  healPercent?: number        (heal % of maxHp)
```

New SkillModifier field: `procs?: SkillProcEffect[]`

**Examples this enables:**
- "10% on crit: re-cast Chain Lightning free"
- "On kill: reset Mortal Strike's cooldown"
- "When you block: deal 200% weapon damage as fire"

### 1C. Debuff Interactions

```
DebuffInteraction:
  bonusDamageVsDebuffed?: { debuffId, incDamage }   (+X% vs specific debuff)
  spreadDebuffOnKill?: { debuffIds[], refreshDuration }
  debuffOnCrit?: { debuffId, stacks, duration }      (guaranteed debuff on crit)
  consumeDebuff?: { debuffId, damagePerStack, element } (consume stacks for burst)
  debuffDurationBonus?: number   (+X% debuff duration)
  debuffEffectBonus?: number     (+X% debuff effectiveness)
```

### 1D. Per-Skill Charge System

Skills can have their own charge resource, independent of class resources.

```
SkillChargeConfig:
  chargeId: string         ('combo_points', 'soul_stacks', 'heat', etc.)
  maxCharges: number
  gainOn: TriggerCondition (onHit, onCrit, onKill)
  gainAmount: number
  decayRate?: number       (charges lost per second, 0 = no decay)

  // Per-charge bonuses:
  perChargeDamage?: number
  perChargeCritChance?: number
  perChargeCastSpeed?: number

  // Spend mechanic:
  spendAll?: {
    trigger: 'onCast' | 'onCrit'
    damagePerCharge: number
    element: DamageElement
    applyDebuff?: { debuffId, stacksPerCharge, duration }
  }
```

New GameState field: `skillCharges: Record<string, { current, max, chargeId }>`

### 1E. Defensive-Offensive Mechanics

New SkillModifier fields:
```
damageFromArmor?: number      (add X% of armor as flat damage)
damageFromEvasion?: number    (add X% of evasion as flat damage)
damageFromMaxLife?: number    (add X% of maxLife as flat damage)
leechPercent?: number         (X% of damage dealt heals player)
lifeOnHit?: number            (flat HP per hit)
lifeOnKill?: number           (flat HP per kill)
fortifyOnHit?: { reductionPercent, duration, maxStacks }
```

### 1F. Expanded Conversion/Transform

New SkillModifier fields:
```
chainCount?: number      (hit chains to N additional targets)
forkCount?: number       (projectile forks into N copies)
pierceCount?: number     (pierce through N targets = extra hits)
splitDamage?: { element, percent }[]  (split into multiple elements)
addTag?: DamageTag       (add AoE/Projectile/DoT tag)
removeTag?: DamageTag    (remove a delivery tag)
```

### 1G. Momentum / Stacking Mechanics

New SkillModifier fields:
```
rampingDamage?: { incPerCast, maxStacks, decayAfterSeconds }
executeThreshold?: number    (+100% dmg when mob HP below X%)
overkillDamage?: number      (X% of overkill carries to next mob)
```

### 1H. Risk/Reward Tradeoffs

New SkillModifier fields:
```
selfDamagePercent?: number      (take X% maxHp per cast)
cannotLeech?: boolean
reducedMaxLife?: number         (-X% max life)
increasedDamageTaken?: number   (+X% damage taken)
berserk?: { damagePerMissingHpPercent }  (more dmg at lower HP)
```

---

## 2. Node Archetypes

### Minor Nodes (30-35 per tree, ~1-3% power each)

**NOT** boring stat sticks. Every minor should have at least one thematic element.

| Archetype | Example | What Makes It Good |
|---|---|---|
| Thematic Stat | "+3% damage vs full-HP enemies" | Condition steers play style |
| Micro-Proc | "5% chance to apply Shocked for 2s" | Small but exciting |
| Conditional Bonus | "+8% damage on first hit of each mob" | Rewards specific behavior |
| Bridge Node | "+2% damage, +1% speed, 3% Chill" | Connects branches, tastes both |

**Rules:** No two minors identical in same tree. Every minor hints at its branch's notable/keystone.

### Notable Nodes (8-12 per tree, ~5-10% power each)

"I want to get to THAT node" goals.

| Archetype | Example | What Makes It Good |
|---|---|---|
| Mechanic Enabler | "Crits cause Bleeding (3 DPS, 4s, 5 stacks)" | Introduces new mechanic |
| Conditional Multiplier | "+40% damage vs enemies below 25% HP" | Big boost with condition |
| Build Definer | "Converts to AoE, -20% per hit, +2 extra hits" | Changes how skill works |
| Synergy Node | "When this skill debuffs, next buff activates instantly" | Creates skill combos |

**Rules:** Every notable creates visible gameplay change. No "just more damage" without a twist.

### Keystone Nodes (3-5 per tree, game-changing WITH tradeoffs)

| Archetype | Example | Tradeoff |
|---|---|---|
| Glass Cannon | "3x damage, costs 10% HP per cast, no leech" | Offense vs survival |
| Transformation | "100% Cold conversion, AoE, always Chill, cannot Shock/Burn" | Element lock |
| Conditional Powerhouse | "Only fires on Block, 5x damage, bypasses cooldown" | Requires block build |
| Global Influencer | "-30% this skill's DPS, +15% damage to ALL other skills" | Self-sacrifice for team |
| Build-Around | "All damage -> Chaos DoT, +200% poison, deal no hit damage" | Total playstyle change |

**Rules:** Every keystone MUST have a meaningful downside. No two keystones in same tree should both be optimal to take.

---

## 3. Five Branch Framework

50 nodes, 20 points. 5 branches of 10 nodes each. Players can go deep in 2 (reach keystones) or spread across 3-4 (reach notables only).

**Design decision: All 5 branches are UNIQUE per weapon type.** No generic templates -- every weapon has its own bespoke branch identities that lean into what makes that weapon special. This is more work but creates maximum flavor and build diversity.

### Branch Layout Per Branch (10 nodes)
```
Start (free) --> [root] --> [minor] --> [minor] --> [NOTABLE] --> [minor] --> [minor] --> [NOTABLE] --> [KEYSTONE]
                            [minor]  (cross-connect to adjacent branch)
```

Per branch: 1 root minor + 5 path minors + 2 notables + 1 keystone = ~9-10 nodes
Plus 1 shared start node = 51 total

Cross-connections at tier 2-3 between adjacent branches let you dip into neighboring themes.

### Per-Weapon Branch Designs

**SWORD** (1.0x speed, balanced versatile)
1. **Bladework** -- Precision strikes, first-hit bonuses, finesse damage
2. **Riposte** -- Block-based counterattacks, parry mechanics, defensive offense
3. **Bleed Master** -- Crit-triggered Bleeding, DoT stacking, wound exploitation
4. **Runeforged Blade** -- Elemental infusion, tri-element conversion, debuff layering
5. **Dueling Stance** -- Consecutive hit bonuses, momentum, ramping speed

**AXE** (0.9x speed, raw damage + cleave)
1. **Brutality** -- Raw flat damage, execute threshold, overkill carry
2. **Cleave** -- AoE conversion, extra targets, splash damage
3. **Berserker** -- Low-HP bonuses, self-damage for power, berserk rage
4. **Rend** -- Physical DoT (Bleed), wound stacking, DoT power
5. **Warcry** -- Shout-based buffs, party-wide (global) damage amp, intimidate (Weakened)

**MACE** (0.85x speed, tanky + stun)
1. **Concussion** -- Stun/Slow debuffs, daze on hit, control
2. **Juggernaut** -- Damage from Armor, fortify stacking, unbreakable
3. **Shatter** -- Bonus vs frozen/chilled, cold conversion, brittle
4. **Earthbreaker** -- AoE ground slam, aftershock procs, seismic
5. **Holy Smite** -- Lightning conversion, Shocked stacking, divine wrath

**DAGGER** (1.3x speed, fast poison crit)
1. **Assassination** -- First-hit mega-damage, ambush bonuses, vanish resets
2. **Venomcraft** -- Poison stacking, max stacks, DoT power
3. **Shadow Dance** -- Evasion-based offense, dodge procs free casts, elusive
4. **Lacerate** -- Bleed on crit, wound exploitation, surgical cuts
5. **Toxin Mastery** -- Multi-debuff application, debuff spread on kill, plague

**GREATSWORD** (0.7x speed, huge single-hit)
1. **Titan's Strike** -- Massive single-hit damage, cannot multi-hit, +100% tradeoff
2. **Momentum** -- Ramping damage per cast, charge-up mechanic, windmill
3. **Colossus** -- Damage from MaxLife, fortify, damage reduction per hit
4. **Sunder** -- Armor penetration, ignore resists, Cursed debuff
5. **Whirlwind** -- Slow AoE conversion, spin-to-win, continuous damage

**GREATAXE** (0.65x speed, execute specialist)
1. **Headsman** -- Execute threshold (+200% below 25%), culling strike
2. **Rampage** -- Kill streak bonuses, overkill carry, frenzy on kill
3. **Savage Blows** -- Crit with massive multiplier, infrequent but devastating
4. **Gore** -- Bleed stacking, Bleed DPS doubling, wound explosion on kill
5. **Warmonger** -- Self-damage for power, increased damage taken, glass cannon

**MAUL** (0.6x speed, slowest + hardest hit)
1. **Earthquake** -- AoE aftershock, delayed secondary hit, seismic
2. **Fortification** -- Damage from Armor, block chance, counterattack
3. **Crush** -- Weakened debuff, reduced target damage, armor shred
4. **Consecrate** -- Fire/Lightning conversion, holy ground DoT zone
5. **Colossus Blow** -- Charge system (3 hits to charge, 4th = mega strike)

**BOW** (0.85x speed, ranged precision)
1. **Sniper** -- First-hit bonus, long-range damage amp, headshot crit
2. **Barrage** -- Extra projectiles, rapid fire, speed stacking
3. **Hunter's Mark** -- Vulnerable debuff on crit, mark for death, bonus vs marked
4. **Elemental Arrows** -- Fire/Cold/Lightning arrow types, element conversion
5. **Evasion Mastery** -- Dodge-based offense, kite mechanics, dodge = free shot

**CROSSBOW** (0.75x speed, ranged power)
1. **Siege Engine** -- Massive single-bolt damage, armor penetration
2. **Repeater** -- Extra bolts, chain mechanics, ricochet
3. **Explosive Bolts** -- AoE conversion, burning/fire, splash
4. **Poison Bolts** -- Chaos conversion, poison stacking, debuff on hit
5. **Mechanical Precision** -- Charge-up system (wind crank), bigger damage per charge

**STAFF** (0.8x speed, balanced caster AoE)
1. **Arcane Might** -- Raw spell damage, spell power scaling
2. **Elemental Mastery** -- Tri-element conversion, debuff layering, element rotation bonus
3. **Nova** -- AoE conversion, expanding radius, more targets = more damage
4. **Arcane Battery** -- Charge system, store casts, release all at once
5. **Warding** -- Spell-based defense, resist bonuses, Cursed debuff on target

**WAND** (1.1x speed, fast caster)
1. **Overcharge** -- Raw damage, spell power amplification
2. **Spell Echo** -- Bonus casts, cascade chains, free re-casts on proc
3. **Hex Weaver** -- Debuff mastery, multiple debuffs per cast, debuff exploitation
4. **Arcane Precision** -- Crit chance, crit mult, crit-triggered spell procs
5. **Arcane Barrier** -- Energy shield, spell leech, defensive casting

**SCEPTER** (0.95x speed, hybrid attack/spell)
1. **Divine Wrath** -- Lightning conversion, smite from above, Shocked stacking
2. **Hybrid Mastery** -- Scales with BOTH attack and spell stats, dual scaling
3. **Judgement** -- Weakened + Cursed debuffs, holy damage, debuff amplification
4. **Sacred Fire** -- Fire conversion, Burning, consecrated ground DoT
5. **Paladin's Shield** -- Block-based defense, heal on block, retribution damage

**GAUNTLET** (0.9x speed, spell + armor)
1. **Arcane Fist** -- Spell damage from Armor, punch magic, hybrid scaling
2. **Shock Pulse** -- Lightning AoE, Shocked stacking, pulse nova
3. **Iron Will** -- Damage from Armor + MaxLife, tanky caster
4. **Flame Gauntlet** -- Fire conversion, burning touch, ignite on hit
5. **Spellguard** -- Spell-based defense, fortify on cast, energy barrier

**TOME** (1.0x speed, ability haste focus)
1. **Forbidden Knowledge** -- Raw spell damage, chaos conversion, dark magic
2. **Chronomancy** -- Cooldown reduction mastery, time manipulation, Slowed debuff
3. **Inscription** -- DoT runes, delayed damage, trap-like mechanics
4. **Summoner's Tome** -- Proc-based minion damage (phantom strikes on kill)
5. **Sage's Wisdom** -- Global effects, all-skill buffs, supportive keystones

---

## 4. Example Skill Trees

### 4A. Sword Slash (Attack / Physical / Melee)

**Branch 1: BRUTALITY**
| Node | Type | Tier | Effect |
|---|---|---|---|
| ss_b1_root | minor | 1 | Heavy Swing: +4% damage, +3 flat |
| ss_b1_m1 | minor | 1 | Weighted Blade: +5% damage vs full-HP enemies |
| ss_b1_m2 | minor | 2 | Deep Cut: +3 flat, crits apply Bleed (5%, 2s) |
| ss_b1_m3 | minor | 2 | Forged Strength: add 2% of Armor as flat phys |
| ss_b1_n1 | **notable** | 2 | **Executioner:** +40% damage vs enemies below 25% HP |
| ss_b1_m4 | minor | 3 | Culling Blow: +8% damage, +5% vs debuffed |
| ss_b1_m5 | minor | 3 | Overwhelming Force: +10 flat, 20% overkill carried |
| ss_b1_n2 | **notable** | 3 | **Mortal Wound:** Hits vs <50% HP have +20% crit. Crits vs low-HP deal 3x crit mult |
| ss_b1_k | **KEYSTONE** | 4 | **TITAN'S STRIKE:** +100% damage. -50% cast speed. Cannot multi-hit. On kill: all skills +5% damage for 3s |

**Branch 2: BLADESTORM**
| Node | Type | Tier | Effect |
|---|---|---|---|
| ss_b2_root | minor | 1 | Quick Draw: +4% attack speed |
| ss_b2_m1 | minor | 1 | Follow-Through: 10% chance bonus strike at 50% damage |
| ss_b2_m2 | minor | 2 | Twin Cuts: +3% speed, +1 extra hit at 40% |
| ss_b2_m3 | minor | 2 | Blade Dance: +5% speed per consecutive hit (max 15%) |
| ss_b2_n1 | **notable** | 2 | **Flurry of Steel:** +2 extra hits at 35% each. +8% speed |
| ss_b2_m4 | minor | 3 | Relentless: +5% speed. Hits cannot miss |
| ss_b2_m5 | minor | 3 | Whirlwind Mastery: +10% AoE damage, converts to AoE |
| ss_b2_n2 | **notable** | 3 | **Steel Tempest:** +3 extra hits, AoE. Each hit 10% chance Chill |
| ss_b2_k | **KEYSTONE** | 4 | **THOUSAND CUTS:** 8 hits at 15% each. +50% speed. Cannot crit. Each hit independently rolls debuffs. All skills +5% speed |

**Branch 3: DUELIST'S EDGE**
| Node | Type | Tier | Effect |
|---|---|---|---|
| ss_b3_root | minor | 1 | Precise Thrust: +3% crit |
| ss_b3_m1 | minor | 1 | Find Weakness: +5% crit vs debuffed |
| ss_b3_m2 | minor | 2 | Vital Strike: +10% crit mult, +2% crit |
| ss_b3_m3 | minor | 2 | Surgical Precision: crits apply Bleed (8 DPS, 3s) |
| ss_b3_n1 | **notable** | 2 | **Assassin's Eye:** +6% crit, +25% mult. Crits 20% chance to reset cooldown |
| ss_b3_m4 | minor | 3 | Lethality: +15% crit mult, +3% crit |
| ss_b3_m5 | minor | 3 | Exposed Weakness: crits cause +10% damage taken for 4s |
| ss_b3_n2 | **notable** | 3 | **Perfect Strike:** +50% crit mult vs Bleeding. Crits always max-stack Bleed |
| ss_b3_k | **KEYSTONE** | 4 | **DEATHBLOW:** Crits deal 5x crit mult. Crit chance reduced to base 5% (ignores all +crit). Each crit: all skills +3% crit for 5s |

**Branch 4: RUNEFORGED BLADE**
| Node | Type | Tier | Effect |
|---|---|---|---|
| ss_b4_root | minor | 1 | Ember Coating: 10% damage converted to Fire |
| ss_b4_m1 | minor | 1 | Frost Edge: 15% chance to Chill (3s) |
| ss_b4_m2 | minor | 2 | Lightning Infusion: convert 30% to Lightning, 10% Shock |
| ss_b4_m3 | minor | 2 | Elemental Exploitation: +8% damage per unique debuff on target |
| ss_b4_n1 | **notable** | 2 | **Tri-Element Blade:** Convert 33% each Fire/Cold/Lightning. 10% chance each debuff |
| ss_b4_m4 | minor | 3 | Debuff Duration: +30% debuff duration |
| ss_b4_m5 | minor | 3 | Contagion: on kill, spread all debuffs to next mob |
| ss_b4_n2 | **notable** | 3 | **Elemental Confluence:** +15% per debuff. All 3 elemental debuffs active = +50% bonus |
| ss_b4_k | **KEYSTONE** | 4 | **ELEMENTAL CATACLYSM:** 100% random element each hit. +80% elemental. Every debuff from this skill also applies via other skills for 2s. Cannot deal Physical |

**Branch 5: IRON GUARD**
| Node | Type | Tier | Effect |
|---|---|---|---|
| ss_b5_root | minor | 1 | Battle Recovery: heal 1% maxHp on hit |
| ss_b5_m1 | minor | 1 | Parry: +3% block chance |
| ss_b5_m2 | minor | 2 | Vampiric Edge: leech 3% damage dealt |
| ss_b5_m3 | minor | 2 | Armor Master: add 3% of Armor as flat damage |
| ss_b5_n1 | **notable** | 2 | **Riposte:** On block, fire this skill instantly at 200% damage (bypasses cooldown) |
| ss_b5_m4 | minor | 3 | Undying Warrior: +5% damage while <50% HP, +3% leech |
| ss_b5_m5 | minor | 3 | Fortify: each hit grants 2% DR for 3s (max 10%) |
| ss_b5_n2 | **notable** | 3 | **Retaliation Master:** On block: 300% counter + heal 5% maxHp. +10% block |
| ss_b5_k | **KEYSTONE** | 4 | **BLOOD PACT:** Each cast costs 8% maxHp. 2.5x damage. 15% leech. No regen. On kill: heal 10% maxHp. All skills +8% defense |

**Build Archetypes (20 points):**
- "Execute Bruiser": Brutality + some Crit = massive single-target vs low HP
- "Bladestorm AoE": Speed + some Elemental = many AoE hits applying debuffs
- "Counter-Tank": Iron Guard + some Brutality = unkillable, damage on block
- "Elemental Swordsman": Runeforge + some Speed = multi-debuff stacking
- "Critical Bleeder": Duelist's Edge + some Elemental = massive crit-triggered bleeds

### 4B. Chain Lightning (Spell / Lightning / Projectile)

| Branch | Identity | Notable 1 | Notable 2 | Keystone |
|---|---|---|---|---|
| Overcharge | Raw power | Thunder God: +20% dmg, guaranteed Shock | Lightning Rod: +30% vs 3-stack Shock, consume for burst | SUPERCONDUCTOR: +80% vs Shocked, Shock 5 stacks, -30% vs unshocked |
| Storm Cascade | Chain/multi | Forked Lightning: chain 3 targets | Ball Lightning: AoE, +2 hits, -20% per hit | STORM TEMPEST: chain 5, each +10% amplified, -40% base |
| Voltaic Precision | Crit | Galvanize: +5% crit, crits 25% re-cast | Voltaic Cascade: crits chain 2 at full damage | LIGHTNING SAVANT: +100% crit mult, crits max-stack Shock, miss vs unshocked |
| Tempest Weaver | Element/Debuff | Elemental Storm: random debuff per hit | Elemental Overload: all 4 debuffs = +80% and no expiry 3s | PRISMATIC STORM: all 5 elements, all debuffs every hit, +50% per debuff |
| Stormshield | Defense | Storm Armor: +15 resists, dodge = free cast | Galvanic Ward: stored damage discharged as Lightning | EYE OF THE STORM: +30 resists, Lightning immune, stored damage on 3rd cast |

### 4C. Viper Strike (Attack / Chaos / Melee / DoT)

| Branch | Identity | Notable 1 | Notable 2 | Keystone |
|---|---|---|---|---|
| Virulence | DoT power | Pandemic: Poison +5 max stacks, DPS doubled | Plague Bearer: spread stacks on kill | DEATH'S EMBRACE: 30 max stacks, 3x DPS, -80% hit dmg, all damage is DoT |
| Rapid Strikes | Speed/apply | Venom Frenzy: +3 hits, each rolls Poison | Storm of Blades: +5 hits, AoE, 30% Poison | SWARM: 10 hits at 12%, 40% Poison each, +50% speed, -60% hit dmg |
| Assassin | Crit | Assassinate: crits = Bleed AND max Poison | Deathmark: crits mark target, +30% DoT from all | NIGHTFALL: 4x crit mult, crits apply 5 Poison + Bleed, non-crits deal 0 |
| Plague Doctor | Debuff ctrl | Cocktail of Pain: 2 random debuffs per hit | Patient Zero: on kill, auto-apply all debuffs 5s | TOXICOLOGIST: every hit applies ALL debuffs, +10% per total stack |
| Shadow Dancer | Defense | Drain Life: leech 3% of DoT damage as HP | Venom Mastery: heal 2% per Poison stack ticking | PHANTOM ASSASSIN: +25% evasion, dodge = free cast at 300%, leech 10% DoT |

---

## 5. Cross-Skill Synergies

### 5A. Keystone globalEffects (build-defining, not generic)

Instead of "+5% damage to all skills," keystones should have directional effects:
- Sword TITAN'S STRIKE: "All skills +15% damage for 3s after this kills a mob" (burst window)
- Chain Lightning SUPERCONDUCTOR: "All skills +10% vs Shocked" (rewards Shock exploiters)
- Viper Strike TOXICOLOGIST: "All skill debuffs last 30% longer" (debuff team)
- BLOOD PACT: "All skills +8% defense" (tanky loadout enabler)

### 5B. Proc Nodes That Trigger Other Skills

Notable example nodes:
- "Spell Echo" (Chain Lightning tree): "On cast, 15% chance to trigger slot-2 skill at 50% damage, bypassing cooldown"
- "Battle Flow" (Sword tree): "On kill, next skill in rotation gains +30% damage"
- "Arcane Cascade" (Staff tree): "On crit, cast slot-3 skill for free"

Implementation: `SkillProcEffect.castSkill` references slot index or skill ID. Combat tick checks procs after each cast.

### 5C. Combo / Rotation Rewards

- "Combo Master" notable: "After casting 3 different skills in sequence, 4th cast deals +100% damage"
- "Elemental Cycle" notable: "Cast Fire, Cold, Lightning skill (any order) = all skills +30% for 5s"
- "Debuff Cascade" notable: "4+ unique debuffs on target = buff/passive abilities 200% effective for 5s"

Requires tracking: `lastSkillsCast: string[]` (rolling window, cheap state).

### 5D. Buff/Passive Trees Reference Active Skill

Buff/passive skill trees should have nodes that explicitly synergize:
- Dagger "Shadow Strike" buff tree: "While active, your active skill's crits apply 2 extra Poison stacks"
- Sword "Blade Fury" buff tree: "While active, your active skill's extra hits each deal full damage instead of reduced"

---

## 6. New Systems Needed

### 6A. Enhanced Debuff System

Expand from 4 debuffs to 10. New debuffs and expanded DebuffEffect:

| Debuff | Stackable | Max | Effect |
|---|---|---|---|
| Chilled | No | 1 | +10% damage taken *(existing)* |
| Shocked | Yes | 3 | +15% damage taken per stack *(existing)* |
| Burning | No | 1 | 5 DPS *(existing)* |
| Poisoned | Yes | 10 | 2 DPS per stack *(existing)* |
| **Bleeding** | Yes | 5 | 8 DPS per stack (physical DoT) |
| **Weakened** | No | 1 | Target deals 10% less damage |
| **Blinded** | No | 1 | Target has 20% chance to miss |
| **Vulnerable** | No | 1 | +30% crit damage taken |
| **Cursed** | Yes | 3 | -15% all resists per stack |
| **Slowed** | No | 1 | Target attacks 20% slower |

New DebuffEffect fields needed:
```
reducedDamageDealt?: number   (Weakened)
missChance?: number           (Blinded)
incCritDamageTaken?: number   (Vulnerable)
reducedResists?: number       (Cursed)
reducedAttackSpeed?: number   (Slowed)
```

Integration: Boss/zone attack code in `gameStore.ts` (~line 2060) already processes dodge/block. New effects check here.

### 6B. Combat State Tracking

New ephemeral GameState fields (not persisted, reset on zone switch):

```
consecutiveHits: number        (resets on miss)
lastSkillsCast: string[]       (rolling 4-window for combo detection)
overkillDamage: number         (damage beyond mob's remaining HP)
killStreak: number             (kills without taking damage)
lastCritAt: number             (timestamp for "crit recently")
lastBlockAt: number            (timestamp for "blocked recently")
lastDodgeAt: number            (timestamp for "dodged recently")
tempBuffs: TempBuff[]          (temporary buffs from procs/conditionals)
```

TempBuff: `{ id, effect: AbilityEffect, expiresAt, sourceSkillId, stacks, maxStacks }`

The combat tick (250ms) already tracks hits/crits/blocks/dodges. Each outcome updates these trackers. TempBuffs expire each tick.

### 6C. Template Generation System

With 93 active skills needing 50 nodes each = 4,650 nodes. Hand-crafting all is impractical.

**Approach: Template + Flavor + Override**

1. **5 branch templates** with parameterized nodes (50 base nodes)
2. **Weapon flavor packs** (14 packs) skin templates with thematic names and weapon-appropriate mechanics
3. **Per-skill overrides** (3-5 unique nodes per skill) make each skill's tree truly distinct

```
BranchTemplate:
  branchTheme: 'power' | 'speed' | 'crit' | 'elemental' | 'defense'
  nodes: TemplateNode[]  (10 parameterized nodes)

TemplateNode:
  nodeType, tier
  modifierTemplate(params) -> SkillModifier
  nameTemplate(params) -> string

FlavorParams:
  element, weaponType, skillName, deliveryType, thematicWord
```

This reduces authoring: ~50 template nodes + 14 flavor packs + ~500 custom override nodes (vs 4,650 hand-crafted).

---

## 7. Implementation Phases

| Phase | Scope | Est. Effort |
|---|---|---|
| **Phase 1: Types & Engine** | Expand SkillModifier, ResolvedSkillModifier, DebuffDef, add combat state tracking, new debuffs | 1 sprint |
| **Phase 2: Core Mechanics** | Implement conditional triggers, proc system, charge system, debuff interactions, temp buffs in combat tick | 1-2 sprints |
| **Phase 3: Weapon Trees** | Design + implement all 5 unique branches for each weapon (14 weapons x 50 nodes). Start with 2-3 weapons, iterate. | 3-5 sprints |
| **Phase 4: Buff/Passive Trees** | Extend 42 buff/passive skills with synergy-focused trees | 1-2 sprints |
| **Phase 5: UI** | 50-node graph visualization, charge displays, debuff icons, proc indicators | 1 sprint |

Note: Phase 3 is the largest because every weapon has fully bespoke branches (no generic templates). We'll design 1-2 weapons at a time and refine the pattern before scaling.

**Critical files to modify:**
- `src/types/index.ts` -- all new types (TriggerCondition, ConditionalModifier, SkillProcEffect, DebuffInteraction, SkillChargeConfig, expanded SkillModifier, expanded DebuffEffect, TempBuff, combat state fields)
- `src/engine/skillGraph.ts` -- expanded ResolvedSkillModifier + resolver
- `src/engine/unifiedSkills.ts` -- damage pipeline consumes new modifiers
- `src/store/gameStore.ts` -- combat tick processes procs/conditionals/charges/temp buffs
- `src/data/debuffs.ts` -- new debuff definitions (Bleeding, Weakened, Blinded, Vulnerable, Cursed, Slowed)
- `src/data/skillGraphs/*.ts` -- all tree data files (14 weapon files, each with 6-7 skill graphs of 50 nodes)

### Phase 1 Implementation Notes (Sprint 13A-Phase1)

**Status: COMPLETE** (2026-03-03)

Key decisions made during implementation:
- **`skillProcs` vs `procs`**: Kept existing `procs: { effectId, chance }[]` in `ResolvedSkillModifier` for backward compat with old `procOnHit`. New expanded procs go in `skillProcs: SkillProcEffect[]`.
- **`executeThreshold`**: Uses max-wins resolution (`Math.max`) — most generous threshold wins when multiple nodes contribute.
- **`cannotLeech`**: Boolean OR — any node setting it to true wins.
- **`debuffInteraction`, `chargeConfig`, `fortifyOnHit`, `rampingDamage`, `berserk`**: Last-wins (assignment) — complex objects where only the last allocated node's value applies.
- **`addTag`/`removeTag`**: Collected into `addTags`/`removeTags` arrays in ResolvedSkillModifier since a single node specifies one tag but multiple nodes can contribute.
- **Ephemeral state**: 9 new GameState fields (`consecutiveHits`, `lastSkillsCast`, `lastOverkillDamage`, `killStreak`, `lastCritAt/BlockAt/DodgeAt`, `tempBuffs`, `skillCharges`) — all reset on rehydrate, no save migration needed.
- **New debuffs**: 6 added (`bleeding`, `weakened`, `blinded`, `vulnerable`, `cursed`, `slowed`). `bleeding` uses existing `dotDps` field and works immediately. Other 5 use new effect fields that won't be processed by the combat tick until Phase 2.
- **Tooltip support**: `formatModifier()` in `SkillGraphView.tsx` displays all new fields. Conditional/proc/debuff-interaction fields show summary counts rather than full details.

**Phase 2 pickup points:**
- `src/engine/unifiedSkills.ts` — `rollSkillCast()` needs to evaluate `conditionalMods`, process `skillProcs`, apply `chargeConfig` gain/spend, handle `fortifyOnHit`, compute `rampingDamage`, `splitDamage`
- `src/store/gameStore.ts` — combat tick needs to: tick `tempBuffs` expiry, decay `skillCharges`, evaluate `debuffInteraction` (spread, consume, bonus damage), evaluate `conditionalMods` (TriggerCondition checks against ephemeral state)
- Proc system: `skillProcs` actions (castSkill, resetCooldown, bonusCast, applyBuff, instantDamage)

### Phase 2A Implementation Notes (Sprint 13B-Phase2A)

**Status: COMPLETE** (2026-03-03)

Scope: Straightforward, highest-impact fields. Wired into `tickCombat` with guards so existing graphs produce identical behavior.

**Damage pipeline** (`unifiedSkills.ts:calcSkillDamagePerCast`):
- `damageFromArmor/Evasion/MaxLife`: Added as flat damage (after `flatDamage`, before `%increased` section) so they benefit from all downstream multipliers.
- `chainCount/pierceCount/forkCount`: Idle simplification — bounce mechanics = extra hits at full damage. Added to `hitCount` alongside `extraHits`.

**Enemy debuff effects** (`gameStore.ts:calcEnemyDebuffMods`):
- New pure helper returning `{ damageMult, missChance, atkSpeedSlowMult }` from active debuffs.
- Applied at all 4 incoming damage sites: `applyBossDamage()` helper, `applyZoneDamage()` helper, boss fight main path, clearing main path.
- Weakened: reduces enemy damage dealt. Blinded: chance for enemy to miss entirely. Slowed: increases enemy attack interval.

**Post-roll outgoing modifiers** (`gameStore.ts:tickCombat`):
- Expanded debuff damage amp: `reducedResists` (Cursed) and `incCritDamageTaken` (Vulnerable, only on crits) now stack with `incDamageTaken`.
- `executeThreshold`: 2x damage when target HP% below threshold.
- `berserk`: Damage bonus scales linearly with missing HP%. GraphMod resolved before `damageMult` so berserk can fold in.

**Leech rework:**
- Replaced binary `hasLifeLeech` flag with `totalLeech = LEECH_PERCENT + flagLeech + graphMod.leechPercent`. `cannotLeech` overrides all.
- `effectiveMaxLife = maxLife * (1 - reducedMaxLife/100)` used for regen/leech caps in main path.
- Added `lifeOnHit` (per hit) and `lifeOnKill` (per kill, in death loop).
- Added `selfDamagePercent` (per cast, after leech).

**Incoming damage modifiers:**
- `increasedDamageTaken` + `berserk.damageTakenIncrease` multiply incoming damage at both boss and clearing main path sites.
- `overkillDamage`: Amplifies overkill carry to next mob in death loop.

**Ephemeral state tracking:**
- 7 fields tracked: `consecutiveHits`, `lastSkillsCast`, `killStreak`, `lastOverkillDamage`, `lastCritAt`, `lastBlockAt`, `lastDodgeAt`.
- Kill streak incremented in mob death loop, reset when player takes damage.
- Block/dodge tracked from zone/boss attack results.
- Tracking object spread into all 5 `set()` calls in main path.

### Phase 2B-1 Implementation Notes (Sprint 13B-Phase2B-1)

**State-tracking systems wired into `tickCombat`:**

| System | How It Works | Guard |
|--------|-------------|-------|
| **Ramping Damage** | Global stacks on hits, reset on miss. `damage *= (1 + perHit/100 * stacks)`. Decay after idle. | `graphMod?.rampingDamage` |
| **Fortify on Hit** | Stacks accumulate on hit, all expire together. `calcFortifyDR()` at 4 damage sites, capped 75%. | `graphMod?.fortifyOnHit` |
| **Temp Buffs** | `aggregateTempBuffEffects()` filters expired, stack-scales mults, merges into `combinedAbilityEffect`. | `activeTempBuffs.length > 0` |
| **Charge System** | Per-skill charges: pre-roll bonuses (crit, damage), post-roll gain (hit/crit/kill), spend-all burst, decay. | `graphMod?.chargeConfig` |

**New GameState fields (5):** `rampingStacks`, `rampingLastHitAt`, `fortifyStacks`, `fortifyExpiresAt`, `fortifyDRPerStack`
**New balance constants:** `FORTIFY_MAX_STACKS=20`, `FORTIFY_MAX_DR=0.75`

### Phase 2B-2 Implementation Notes (Sprint 13B-Phase2B-2)

**Evaluation systems wired into `tickCombat`:**

| System | How It Works | Guard |
|--------|-------------|-------|
| **Conditional Modifiers (pre-roll)** | "while" conditions (`whileLowHp`, `whileFullHp`, `whileDebuffActive`, `afterConsecutiveHits`, `onBossPhase`) evaluated before `rollSkillCast`. Modify `effectiveStats.critChance/critMultiplier`, `damageMult`, and `castSpeed`. | `graphMod?.conditionalMods?.length` |
| **Conditional Modifiers (post-roll)** | "on" conditions (`onHit`, `onCrit`, `onBlock`, `onDodge`, `onFirstHit`, `onOverkill`) evaluated after roll. Modify `roll.damage` via `incDamage`, `flatDamage`, `damageMult`. | `graphMod?.conditionalMods?.length && roll.isHit` |
| **Proc Effects** | `evaluateProcs()` runs for `onHit`/`onCrit`/`onKill` triggers. Supports `castSkill`, `bonusCast`, `instantDamage`, `healPercent`, `applyBuff→TempBuff`, `applyDebuff`, `resetCooldown`. Max 1 level (no recursive procs). | `graphMod?.skillProcs?.length` |
| **bonusDamageVsDebuffed** | Extra `%incDamage` when target has specific debuff active. | `graphMod?.debuffInteraction?.bonusDamageVsDebuffed` |
| **debuffEffectBonus** | Multiplier on debuff effects when reading (incDamageTaken, reducedResists, incCritDamageTaken, dotDps). | `graphMod?.debuffInteraction?.debuffEffectBonus` |
| **debuffDurationBonus** | Scales duration when applying graph debuffs and debuffOnCrit. | `graphMod?.debuffInteraction?.debuffDurationBonus` |
| **debuffOnCrit** | Guaranteed debuff application on crit (no chance roll). | `graphMod?.debuffInteraction?.debuffOnCrit && roll.isCrit` |
| **consumeDebuff** | Consumes all stacks of a debuff for burst damage (`damagePerStack * stacks`). Applied in both boss and clearing paths. | `graphMod?.debuffInteraction?.consumeDebuff && roll.isHit` |
| **spreadDebuffOnKill** | Snapshot debuffs pre-death loop, re-apply matching debuffs to new mob after death. | `graphMod?.debuffInteraction?.spreadDebuffOnKill` |
| **onDebuffApplied conditional** | After all debuff application, if more debuffs than before, apply `onDebuffApplied` conditional modifiers to `roll.damage`. | `graphMod?.conditionalMods?.length && debuffsAppliedThisTick` |

**New file:** `src/engine/combatHelpers.ts` (~160 lines) — 3 pure functions (`evaluateCondition`, `evaluateConditionalMods`, `evaluateProcs`) + interfaces (`ConditionContext`, `ConditionalModResult`, `ProcContext`, `ProcResult`).

**New balance constant:** `BLOCK_DODGE_RECENCY_WINDOW = 3000` (ms window for onBlock/onDodge triggers).

**Variable lifetime changes in `tickCombat`:**
- `activeTempBuffs`: `const` → `let` (procs push new TempBuffs)
- `damageMult`: `const` → `let` (pre-roll conditionals modify it)
- `effectiveMaxLife`: hoisted from after-leech to after-graphMod (needed by condition context)

**No save migration. No new persisted state. No UI changes.**

---

## 8. Phase 3 Implementation — Chain Lightning Showcase (SUPERSEDED)

**Status:** SUPERSEDED by Phase 3B (Cross-Skill Synergy Redesign)

The 51-node showcase tree proved that all Phase 2 modifier systems worked, but created a self-contained damage machine with no reason to equip other skills. Phase 3B replaced it with a rotation-focused design.

---

## 8B. Phase 3B — Chain Lightning Cross-Skill Synergy Redesign

**Status:** COMPLETE (2026-03-03)

Replaced the 51-node, 5-branch CL showcase tree with a 15-node, 3-branch rotation engine. CL is now weaker solo but creates conditions and triggers that make other equipped skills matter. This design sets the template for ALL future skill trees.

### Design Principles
- **Aggressive power shift**: CL weaker solo (-20% to -40% base damage on keystones), rotation rewards thoughtful builds
- **Keystones name specific companion skills**: castSkill Frostbolt, castSkill Void Blast, resetCooldown Essence Drain
- **Minors/notables use generic effects**: debuffs, crit, fortify — universally useful
- **Leaner structure**: ~15 nodes, 10 maxPoints (down from 51 nodes / 20 maxPoints). Compact enough to replicate for every skill.

### Tree Structure
- **19 nodes total**: 1 start + 4 per branch (root, minor, notable, keystone) × 3 branches + 3 bridge minors
- **3 branches**: Voltaic Trigger, Tempest Weaver, Stormshield
- **Cross-connect ring**: 3 bridge minors at tier 2 forming B1↔B2↔B3
- **maxPoints: 10** — enough for 1 full branch (4 nodes) + bridges + dip into a second

### Branch Details

**B1: Voltaic Trigger** (Crit Spellslinger)
- Play pattern: CL crits → Frostbolt fires free → Frostbolt AoE exploits Vulnerable. Kill → Frostbolt CD resets.
- Root: +5% crit, +3 flat. Minor: +5% crit mult, 15% onHit Shock, **crits apply Vulnerable (4s)**. Notable: 25% onCrit cast Frostbolt, **onKill reset Frostbolt CD**, guaranteed Shock, +10% crit.
- **CHAIN REACTION** keystone: *"Your critical strikes always cast Void Blast."* 100% onCrit cast Void Blast. -35% CL damage. +5% crit to all skills.

**B2: Tempest Weaver** (Debuff Overload)
- Play pattern: CL paints enemies with 4-5 debuffs. All rotation skills benefit from debuff-stacked enemies.
- Root: +3% damage, 25% onHit Burn. Minor: guaranteed Shock, 20% onHit Chill, **onKill reset Essence Drain CD**. Notable: 25% onHit Chill/Poison, +25% debuff duration, +5% cast speed at 3+ debuffs.
- **PRISMATIC STORM** keystone: *"Your hits always apply Cursed. All debuff effects doubled."* Guaranteed Cursed (4s). debuffEffectBonus 100. -40% CL damage. +15% attack speed to all skills.

**B3: Stormshield** (Reactive Counter-Attacker)
- Play pattern: CL builds fortify. Dodge → cast Void Blast (from notable). Block → cast Frostbolt (from keystone). Defense = offense.
- Root: +3 life on hit, +10 resist. Minor: Fortify (1 stack, 5s, 3% DR), +5 resist. Notable: Fortify (2 stacks, 5s, 4% DR), **onDodge cast Void Blast**, +5% armor→damage, **5% life leech**, **+15 resist**.
- **EYE OF THE STORM** keystone: *"When you block, cast Frostbolt."* Fortify (3 stacks, 6s, 5% DR). -20% CL damage. +10% defense to all skills.

### Engine Work
- **onDodge/onBlock proc triggers**: Added defensive proc evaluation in `gameStore.ts` `tickCombat` after both boss attack and zone attack resolution. When `bossAttackResult.isDodged/isBlocked` or `zoneAttackResult.isDodged/isBlocked`, evaluates `skillProcs` for `onDodge`/`onBlock` triggers. Applies damage directly to enemy (not via `procDamage` which was already applied). Merges temp buffs and debuffs using same patterns as onHit/onCrit procs.
- **Save migration v36**: Resets CL `allocatedNodes` (node IDs changed). Players keep XP/level.

### Modifier Systems Used
| System | Nodes |
|---|---|
| procs/castSkill | B1 n1 (onCrit Frostbolt), B1 k (onCrit Void Blast), B3 n1 (onDodge Void Blast), B3 k (onBlock Frostbolt) |
| procs/resetCooldown | B1 n1 (onKill Frostbolt), B2 m1 (onKill Essence Drain) |
| procs/applyDebuff | B1 m1 (onHit Shock + onCrit Vulnerable), B2 root, B2 m1, B2 n1, x12, x23 |
| conditionalMods (whileDebuffActive) | B2 n1 (threshold=3) |
| debuffInteraction.debuffDurationBonus | B2 n1 |
| debuffInteraction.debuffEffectBonus | B2 k (100 = doubled) |
| applyDebuff (guaranteed) | B1 n1 (Shocked), B2 m1 (Shocked), B2 k (Cursed) |
| fortifyOnHit | B3 m1, B3 n1, B3 k |
| damageFromArmor | B3 n1 |
| leechPercent | B3 n1 |
| lifeOnHit | B3 root, x31 |
| abilityEffect.resistBonus | B3 root, B3 m1, B3 n1, x23 |
| globalEffect | All 3 keystones |
| onDodge trigger | B3 n1 (cast Void Blast) |
| onBlock trigger | B3 k (cast Frostbolt) |

### Power Budget Comparison
| Metric | Old Tree (B1 Keystone) | New Tree (CHAIN REACTION) |
|---|---|---|
| CL self-damage | +50% net (80% conditional - 30% base) | -35% base |
| Cross-skill DPS | ~0 (globalEffect +10% generic) | +35% Frostbolt procs + CD resets |
| Build decision | None (just allocate CL nodes) | "Which companion skills do I equip?" |
| Gameplay feel | Number goes up | Crit → cascade of triggered spells |

---

## 9. Weapon Identity Cheat Sheet

Each weapon's trees should lean into its identity. This is a quick reference for what makes each weapon FEEL different:

| Weapon | Speed | Identity | Signature Branch Flavor |
|---|---|---|---|
| Sword | 1.0x | Balanced, versatile | Crit branch excels (Bleed on crit) |
| Axe | 0.9x | Raw damage, cleave | Power branch excels (Execute theme) |
| Mace | 0.85x | Tanky, stun | Defense branch excels (Stun/Weaken debuffs) |
| Dagger | 1.3x | Fast, poison, crit | Speed + DoT branches (Poison stacking) |
| Greatsword | 0.7x | Huge single-hit | Power keystone: single massive strike |
| Greataxe | 0.65x | Execute specialist | Execute threshold built into base tree |
| Maul | 0.6x | Slowest, hardest | Defense branch: damage from Armor |
| Bow | 0.85x | Ranged precision | Crit branch: sniper theme (first-hit bonus) |
| Crossbow | 0.75x | Ranged power | Chain/fork/pierce mechanics |
| Staff | 0.8x | Balanced caster, AoE | Elemental branch: multi-element mastery |
| Wand | 1.1x | Fast caster | Speed branch: spell echo/cascade |
| Scepter | 0.95x | Hybrid atk/spell | Unique: both Attack and Spell scaling |
| Gauntlet | 0.9x | Spell + armor | Defense branch: damage from Armor + spell |
| Tome | 1.0x | Ability haste | Utility focus: cooldown reduction mastery |
