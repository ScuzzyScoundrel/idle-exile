// ============================================================
// Idle Exile — Minion System (Staff v2 — Witch Doctor)
// Persistent summons with independent HP + attack timers.
// Works in idle AND map mode (both use runCombatTick).
// Works in offline sim (offlineSim.ts calls runCombatTick directly).
// ============================================================

import type { DamageType } from '../../types';

export interface MinionState {
  id: string;               // unique instance id
  type: string;             // 'zombie_dog' | 'fetish' | ...
  hp: number;
  maxHp: number;
  damage: number;           // per attack (snapshot at summon time)
  attackInterval: number;   // seconds between attacks
  nextAttackAt: number;     // timestamp (ms)
  expiresAt: number;        // timestamp (ms)
  element: DamageType;
  sourceSkillId: string;
  /** Cumulative damage dealt by this minion since spawn (for tooltips). */
  damageDealt?: number;
  /** If set, each bite applies this debuff to target. */
  appliesDebuffOnHit?: { debuffId: string; duration: number; stacks: number };
  /** If set, each bite creates this combo state (e.g., 'haunted' for zombie dogs). */
  createsComboStateOnHit?: string;
}

export interface SummonConfig {
  type: string;
  count: number;
  hpPercentOfPlayer: number;    // 0.2 = 20% player max HP
  attackInterval: number;       // seconds
  damagePerSpellPowerRatio: number;  // 0.6 = 60% of spell power per attack
  duration: number;             // seconds
  element: DamageType;
  sourceSkillId: string;
  appliesDebuffOnHit?: { debuffId: string; duration: number; stacks: number };
  createsComboStateOnHit?: string;
}

/** Summon configs keyed by minion-type. Staff's two minion archetypes per SKILL_ROSTER.md. */
export const SUMMON_CONFIGS: Record<string, SummonConfig> = {
  zombie_dog: {
    type: 'zombie_dog',
    count: 2,
    hpPercentOfPlayer: 0.20,
    attackInterval: 2.5,           // was 3s — tighter feel
    damagePerSpellPowerRatio: 0.85, // was 0.6 — buff per playtest, dogs felt weak
    duration: 10,
    element: 'chaos',
    sourceSkillId: 'staff_zombie_dogs',
    createsComboStateOnHit: 'haunted',
  },
  fetish: {
    type: 'fetish',
    count: 4,
    hpPercentOfPlayer: 0.05,        // was 0.10 — glass cannon should die in 1-2 hits
    attackInterval: 1.25,           // was 1.5s — twitchy
    damagePerSpellPowerRatio: 0.40, // was 0.25
    duration: 6,
    element: 'physical',
    sourceSkillId: 'staff_fetish_swarm',
  },
  // Temp spirit minion — spawned by procs (Haunt Spirit's Touch, Locust Hive Spawn, etc.).
  // Default duration 3s — procs can override per-summon via SkillProcEffect.summonMinion.duration.
  spirit_temp: {
    type: 'spirit_temp',
    count: 1,
    hpPercentOfPlayer: 0.10,
    attackInterval: 1.5,
    damagePerSpellPowerRatio: 0.25,
    duration: 3,
    element: 'cold',
    sourceSkillId: 'staff_haunt',
  },
};

/** Re-cast while minions of this type are alive refreshes duration, does NOT add stacks.
 *  Roster contract (SKILL_ROSTER.md line 84). */
export function summonMinions(
  existing: MinionState[],
  config: SummonConfig,
  playerMaxHp: number,
  spellPower: number,
  now: number,
): MinionState[] {
  const sameType = existing.filter(m => m.type === config.type);
  const others = existing.filter(m => m.type !== config.type);

  const hp = playerMaxHp * config.hpPercentOfPlayer;
  const damage = spellPower * config.damagePerSpellPowerRatio;
  const expiresAt = now + config.duration * 1000;

  if (sameType.length > 0) {
    // Refresh: same count, same HP max, refresh duration + attack timer
    const refreshed = sameType.map((m, i) => ({
      ...m,
      maxHp: hp,
      hp: Math.min(m.hp, hp),  // don't heal on refresh — keep damage taken
      damage,                   // pick up new spell power
      expiresAt,
      // Stagger attacks so all N minions don't swing at once
      nextAttackAt: now + (config.attackInterval * 1000 * (i / sameType.length)),
    }));
    return [...others, ...refreshed];
  }

  // Fresh summon — spawn `count` minions with staggered attack timers
  const fresh: MinionState[] = [];
  for (let i = 0; i < config.count; i++) {
    fresh.push({
      id: `${config.type}_${now}_${i}`,
      type: config.type,
      hp,
      maxHp: hp,
      damage,
      attackInterval: config.attackInterval,
      nextAttackAt: now + (config.attackInterval * 1000 * (i / config.count)),
      expiresAt,
      element: config.element,
      sourceSkillId: config.sourceSkillId,
      appliesDebuffOnHit: config.appliesDebuffOnHit,
      createsComboStateOnHit: config.createsComboStateOnHit,
    });
  }
  return [...others, ...fresh];
}

/** A single attack produced by a minion this tick. tick.ts applies these to the target. */
export interface MinionAttack {
  damage: number;
  element: DamageType;
  sourceSkillId: string;
  appliesDebuffOnHit?: { debuffId: string; duration: number; stacks: number };
  createsComboStateOnHit?: string;
}

/** Advance minion timers and emit attacks for any minion whose timer matured.
 *  Attacks target the pack front (or boss) — tick.ts decides by combat phase. */
export function stepMinions(
  minions: MinionState[],
  dtSec: number,
  now: number,
): { minions: MinionState[]; attacks: MinionAttack[] } {
  const attacks: MinionAttack[] = [];
  const updated: MinionState[] = [];

  for (const m of minions) {
    // Expired by time → drop
    if (now >= m.expiresAt) continue;
    // Killed by damage → drop
    if (m.hp <= 0) continue;

    let next = m.nextAttackAt;
    let attacksThisTick = 0;
    // Fire as many attacks as the interval allows this tick (normally 1)
    while (now >= next) {
      attacks.push({
        damage: m.damage,
        element: m.element,
        sourceSkillId: m.sourceSkillId,
        appliesDebuffOnHit: m.appliesDebuffOnHit,
        createsComboStateOnHit: m.createsComboStateOnHit,
      });
      attacksThisTick++;
      next += m.attackInterval * 1000;
    }

    updated.push({
      ...m,
      nextAttackAt: next,
      damageDealt: (m.damageDealt ?? 0) + attacksThisTick * m.damage,
    });
  }

  // dtSec currently unused — reserved for future continuous-damage minions (DoT auras, etc.)
  void dtSec;
  return { minions: updated, attacks };
}

/** Incoming damage front-loads onto the first alive minion. Overkill cascades
 *  to the next alive minion, then out to the player. This makes glass-cannon
 *  fetishes pop in 1-2 hits instead of all chip-damaging in lockstep, while
 *  dogs (tanks) still absorb several hits before dying. */
export function absorbDamage(
  minions: MinionState[],
  incomingDamage: number,
): { minions: MinionState[]; remainingDamage: number } {
  if (minions.length === 0 || incomingDamage <= 0) {
    return { minions, remainingDamage: incomingDamage };
  }
  const updated = minions.map(m => ({ ...m }));
  let remaining = incomingDamage;
  for (const m of updated) {
    if (remaining <= 0) break;
    if (m.hp <= 0) continue;
    if (remaining >= m.hp) {
      remaining -= m.hp;
      m.hp = 0;
    } else {
      m.hp -= remaining;
      remaining = 0;
    }
  }
  return { minions: updated, remainingDamage: remaining };
}

/** Mass Sacrifice spirit_link detonation: each linked minion's remaining HP dealt as AoE.
 *  `typeFilter`: if set, only detonate minions of that type. Returns total damage + empty minion list
 *  (sacrificed minions are consumed). */
export function detonateMinions(
  minions: MinionState[],
  typeFilter?: string,
): { remaining: MinionState[]; damage: number; element: DamageType | null } {
  const detonated = typeFilter ? minions.filter(m => m.type === typeFilter) : minions;
  const remaining = typeFilter ? minions.filter(m => m.type !== typeFilter) : [];
  const damage = detonated.reduce((sum, m) => sum + m.hp, 0);
  // Element: use first detonated minion's element (zombie dogs → chaos, fetishes → physical/fire)
  const element = detonated[0]?.element ?? null;
  return { remaining, damage, element };
}
