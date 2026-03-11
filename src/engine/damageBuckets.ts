// ============================================================
// Idle Exile — Damage Bucket Resolution
// Pure functions for resolving damage into typed buckets.
// No store dependency — used by calcSkillDamagePerCast.
// ============================================================

import type {
  ActiveSkillDef, ResolvedStats, DamageType, AilmentType,
  DamageBucket, ConversionSpec, DamageResult, DamageTag,
} from '../types';
import type { ResolvedSkillModifier } from './skillGraph';

// ─── Conversion Resolution ───

/**
 * Combine skill base conversion + graph keystone conversion.
 * Same target: additive, capped at 100%.
 * Different target: graph overrides.
 */
export function resolveConversion(
  baseConversion: ConversionSpec | undefined,
  graphConversion: { from: string; to: string; percent: number } | null | undefined,
): ConversionSpec | null {
  if (!baseConversion && !graphConversion) return null;

  if (!graphConversion) return baseConversion!;

  const graphSpec: ConversionSpec = {
    from: 'physical',
    to: graphConversion.to as DamageType,
    percent: graphConversion.percent,
  };

  if (!baseConversion) return graphSpec;

  // Same target: additive, capped at 100%
  if (baseConversion.to === graphSpec.to) {
    return {
      from: 'physical',
      to: baseConversion.to,
      percent: Math.min(baseConversion.percent + graphSpec.percent, 100),
    };
  }

  // Different target: graph keystone overrides
  return graphSpec;
}

// ─── Bucket Resolution ───

/**
 * Resolve a skill cast into typed damage buckets.
 *
 * 4-step process per design doc:
 * 1. Compute physical base (skill base + graph flat + stat-scaling + weapon/spell)
 * 2. Split by conversion — only the physical base is split
 * 3. Add flat damage to buckets — ALL flat affixes contribute regardless of skill tags
 * 4. Apply % modifiers per bucket, multiply by hitCount
 */
export function resolveDamageBuckets(
  skill: ActiveSkillDef,
  stats: ResolvedStats,
  weaponAvgDmg: number,
  weaponSpellPower: number,
  graphMod?: ResolvedSkillModifier,
  weaponConversion?: ConversionSpec,
): DamageResult {
  const isAttack = skill.tags.includes('Attack');
  const isSpell = skill.tags.includes('Spell');

  // Effective tags for delivery-type modifier matching (AoE conversion, tag add/remove)
  let tags: readonly DamageTag[] = skill.tags;
  if (graphMod?.convertToAoE && !tags.includes('AoE')) {
    tags = [...tags, 'AoE' as DamageTag];
  }
  if (graphMod?.addTags) {
    for (const t of graphMod.addTags) {
      if (!tags.includes(t)) tags = [...tags, t];
    }
  }
  if (graphMod?.removeTags) {
    tags = tags.filter(t => !graphMod.removeTags.includes(t));
  }

  // ── Step 1: Compute physical base ──
  let physBase = skill.baseDamage;

  // Graph flat damage bonus
  if (graphMod?.flatDamage) physBase += graphMod.flatDamage;

  // Damage-from-stat scaling
  if (graphMod?.damageFromArmor) physBase += stats.armor * (graphMod.damageFromArmor / 100);
  if (graphMod?.damageFromEvasion) physBase += stats.evasion * (graphMod.damageFromEvasion / 100);
  if (graphMod?.damageFromMaxLife) physBase += stats.maxLife * (graphMod.damageFromMaxLife / 100);

  // Weapon/spell power scaling
  if (isAttack) {
    physBase += weaponAvgDmg * skill.weaponDamagePercent;
    physBase += stats.flatPhysDamage; // flat phys routes through conversion
  }
  if (isSpell) {
    physBase += (weaponSpellPower + stats.spellPower) * skill.spellPowerRatio;
  }

  if (physBase <= 0 && !hasAnyFlatDamage(stats, isAttack, isSpell)) {
    return { total: 0, buckets: [] };
  }

  // ── Step 2: Split by conversion ──
  // Merge skill + graph + weapon conversions into per-element map
  const skillGraphConversion = resolveConversion(skill.baseConversion, graphMod?.convertElement);

  const conversionMap = new Map<DamageType, number>();
  if (skillGraphConversion && skillGraphConversion.percent > 0) {
    conversionMap.set(skillGraphConversion.to, skillGraphConversion.percent);
  }
  if (weaponConversion && weaponConversion.percent > 0) {
    const existing = conversionMap.get(weaponConversion.to) ?? 0;
    conversionMap.set(weaponConversion.to, existing + weaponConversion.percent);
  }

  // Cap total conversion at 100%
  let totalConvPct = 0;
  for (const pct of conversionMap.values()) totalConvPct += pct;
  if (totalConvPct > 100) {
    const scale = 100 / totalConvPct;
    for (const [type, pct] of conversionMap) {
      conversionMap.set(type, pct * scale);
    }
  }

  // Bucket accumulators
  const buckets: Record<DamageType, number> = {
    physical: 0,
    cold: 0,
    lightning: 0,
    fire: 0,
    chaos: 0,
  };

  if (physBase > 0) {
    if (conversionMap.size > 0) {
      let remaining = physBase;
      for (const [type, pct] of conversionMap) {
        const converted = physBase * (pct / 100);
        buckets[type] += converted;
        remaining -= converted;
      }
      buckets.physical += Math.max(0, remaining);
    } else {
      buckets.physical += physBase;
    }
  }

  // ── Step 3: Add flat damage to buckets ──
  // ALL flat affixes contribute regardless of skill tags
  if (isAttack) {
    buckets.fire += stats.flatAtkFireDamage;
    buckets.cold += stats.flatAtkColdDamage;
    buckets.lightning += stats.flatAtkLightningDamage;
    buckets.chaos += stats.flatAtkChaosDamage;
  }
  if (isSpell) {
    // Spells don't get flat phys from gear (no flatPhysDamage for spells)
    buckets.fire += stats.flatSpellFireDamage;
    buckets.cold += stats.flatSpellColdDamage;
    buckets.lightning += stats.flatSpellLightningDamage;
    buckets.chaos += stats.flatSpellChaosDamage;
  }

  // ── Step 4: Apply % modifiers per bucket ──

  // Shared modifiers (source + delivery + graph)
  let shared = 0;
  if (isAttack) shared += stats.incAttackDamage;
  if (isSpell) shared += stats.incSpellDamage;
  if (tags.includes('Melee'))      shared += stats.incMeleeDamage;
  if (tags.includes('Projectile')) shared += stats.incProjectileDamage;
  if (tags.includes('AoE'))        shared += stats.incAoEDamage;
  if (tags.includes('DoT'))        shared += stats.incDoTDamage;
  if (tags.includes('Channel'))    shared += stats.incChannelDamage;
  if (graphMod?.incDamage) shared += graphMod.incDamage;

  // Per-bucket multipliers
  if (buckets.physical > 0) {
    const inc = stats.incPhysDamage + shared;
    buckets.physical *= (1 + inc / 100);
  }
  if (buckets.cold > 0) {
    const inc = stats.incColdDamage + stats.incElementalDamage + shared;
    buckets.cold *= (1 + inc / 100);
  }
  if (buckets.lightning > 0) {
    const inc = stats.incLightningDamage + stats.incElementalDamage + shared;
    buckets.lightning *= (1 + inc / 100);
  }
  if (buckets.fire > 0) {
    const inc = stats.incFireDamage + stats.incElementalDamage + shared;
    buckets.fire *= (1 + inc / 100);
  }
  if (buckets.chaos > 0) {
    const inc = stats.incChaosDamage + shared;
    buckets.chaos *= (1 + inc / 100);
  }

  // Penetration: "more" multiplier per element (gear + graph, additive then applied as more)
  const firePen = stats.firePenetration + (graphMod?.firePenetration ?? 0);
  const coldPen = stats.coldPenetration + (graphMod?.coldPenetration ?? 0);
  const lightPen = stats.lightningPenetration + (graphMod?.lightningPenetration ?? 0);
  const chaosPen = stats.chaosPenetration + (graphMod?.chaosPenetration ?? 0);
  if (buckets.fire > 0 && firePen > 0)
    buckets.fire *= (1 + firePen / 100);
  if (buckets.cold > 0 && coldPen > 0)
    buckets.cold *= (1 + coldPen / 100);
  if (buckets.lightning > 0 && lightPen > 0)
    buckets.lightning *= (1 + lightPen / 100);
  if (buckets.chaos > 0 && chaosPen > 0)
    buckets.chaos *= (1 + chaosPen / 100);

  // ── Hit count ──
  const bounceHits = (graphMod?.chainCount ?? 0) + (graphMod?.pierceCount ?? 0) + (graphMod?.forkCount ?? 0);
  const hitCount = (skill.hitCount ?? 1) + (graphMod?.extraHits ?? 0) + bounceHits;

  // Build result buckets (only non-zero)
  const resultBuckets: DamageBucket[] = [];
  let total = 0;
  for (const type of ['physical', 'cold', 'lightning', 'fire', 'chaos'] as DamageType[]) {
    const amount = buckets[type] * hitCount;
    if (amount > 0) {
      resultBuckets.push({ type, amount });
      total += amount;
    }
  }

  return { total, buckets: resultBuckets };
}

// ─── Ailment Chance Resolution ───

/**
 * Calculate ailment proc chances based on damage type composition.
 * Built but not wired into combat loop — needs baseAilmentChance per skill.
 */
export function resolveAilmentChances(
  buckets: DamageBucket[],
  total: number,
  baseAilmentChance: number,
  bonuses?: Partial<Record<AilmentType, number>>,
): Record<AilmentType, number> {
  const result: Record<AilmentType, number> = {
    bleed: 0,
    chill: 0,
    shock: 0,
    burn: 0,
    poison: 0,
  };

  if (total <= 0 || baseAilmentChance <= 0) return result;

  // Calculate proportions
  let physProportion = 0;
  let coldProportion = 0;
  let lightningProportion = 0;
  let fireProportion = 0;
  let chaosProportion = 0;

  for (const b of buckets) {
    const proportion = b.amount / total;
    switch (b.type) {
      case 'physical': physProportion += proportion; break;
      case 'cold': coldProportion += proportion; break;
      case 'lightning': lightningProportion += proportion; break;
      case 'fire': fireProportion += proportion; break;
      case 'chaos': chaosProportion += proportion; break;
    }
  }

  // Base chance scaled by proportion
  result.bleed = baseAilmentChance * physProportion;
  result.chill = baseAilmentChance * coldProportion;
  result.shock = baseAilmentChance * lightningProportion;
  result.burn = baseAilmentChance * fireProportion;
  result.poison = baseAilmentChance * (physProportion + chaosProportion);

  // Flat bonus chance additive on top
  if (bonuses) {
    for (const ailment of Object.keys(bonuses) as AilmentType[]) {
      result[ailment] += bonuses[ailment] ?? 0;
    }
  }

  return result;
}

// ─── Helpers ───

function hasAnyFlatDamage(stats: ResolvedStats, isAttack: boolean, isSpell: boolean): boolean {
  if (isAttack) {
    return stats.flatAtkFireDamage > 0
      || stats.flatAtkColdDamage > 0
      || stats.flatAtkLightningDamage > 0
      || stats.flatAtkChaosDamage > 0;
  }
  if (isSpell) {
    return stats.flatSpellFireDamage > 0
      || stats.flatSpellColdDamage > 0
      || stats.flatSpellLightningDamage > 0
      || stats.flatSpellChaosDamage > 0;
  }
  return false;
}
