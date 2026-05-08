// ============================================================
// Stats — foundational stat types used across all domains
// ============================================================

export type StatKey =
  // Attack
  | 'flatPhysDamage'
  | 'flatAtkFireDamage'
  | 'flatAtkColdDamage'
  | 'flatAtkLightningDamage'
  | 'flatAtkChaosDamage'
  | 'baseAttackSpeed'
  | 'incAttackSpeed'
  | 'attackSpeed'
  | 'accuracy'
  | 'baseCritChance'
  | 'incCritChance'
  | 'incPhysDamage'
  | 'incAttackDamage'
  // Spell
  | 'spellPower'
  | 'flatSpellFireDamage'
  | 'flatSpellColdDamage'
  | 'flatSpellLightningDamage'
  | 'flatSpellChaosDamage'
  | 'castSpeed'
  | 'incSpellDamage'
  // Shared Offensive
  | 'incElementalDamage'
  | 'incFireDamage'
  | 'incColdDamage'
  | 'incLightningDamage'
  | 'incChaosDamage'
  // Multiplicative Offense
  | 'firePenetration'
  | 'coldPenetration'
  | 'lightningPenetration'
  | 'chaosPenetration'
  | 'dotMultiplier'
  | 'weaponMastery'
  // Delivery
  | 'incMeleeDamage'
  | 'incProjectileDamage'
  | 'incAoEDamage'
  | 'incDoTDamage'
  | 'incChannelDamage'
  | 'critChance'
  | 'critMultiplier'
  // abilityHaste removed — attack/cast speed now reduce cooldowns
  // Defensive
  | 'maxLife'
  | 'incMaxLife'
  | 'lifeRegen'
  | 'armor'
  | 'incArmor'
  | 'evasion'
  | 'incEvasion'
  | 'blockChance'
  | 'fireResist'
  | 'coldResist'
  | 'lightningResist'
  | 'chaosResist'
  | 'allResist'
  // Energy Shield
  | 'energyShield'
  | 'incEnergyShield'
  | 'esRecharge'
  | 'esCombatRecharge'
  // Utility
  | 'movementSpeed'
  | 'itemQuantity'
  | 'itemRarity'
  // Sustain
  | 'ailmentDuration'
  | 'lifeLeechPercent'
  | 'lifeOnHit'
  | 'lifeOnKill'
  | 'lifeOnDodgePercent'
  | 'lifeRecoveryPerHit'
  // Build depth
  | 'cooldownRecovery'
  | 'fortifyEffect'
  | 'damageTakenReduction'
  // Armor-to-Elemental (plate exclusive)
  | 'armorToElemental'
  // Unique item mechanics
  | 'doublePoisonHalfDamage'
  | 'alwaysChill'
  | 'incDamageVsChilled'
  | 'damageOnHitSelfPercent'
  | 'incDamagePerMissingLifePercent'
  | 'onHitGainDamagePercent'
  | 'onHitGainDamageMaxStacks'
  | 'enhancedCurseEffect'
  | 'moreDotVsCursed'
  | 'dodgeGrantsAttackSpeedPercent'
  | 'dodgeAttackSpeedMaxStacks'
  | 'physToFireConversion'
  | 'burnExplosionPercent'
  | 'moreDotDamage'
  | 'cannotLeech'
  | 'buffExpiryResetCd'
  | 'extraChaosDamagePercent'
  | 'maxLifePenaltyPercent'
  // Ailment scaling (Dagger v2)
  | 'ailmentPotency'
  | 'ailmentTickSpeedMult'
  // Phase A Change 3 — Ailment proc chance stats (per-hit roll)
  | 'ailmentChanceAll'       // flat % added to every ailment chance
  | 'ailmentChanceBleed'
  | 'ailmentChanceBurn'
  | 'ailmentChanceChill'
  | 'ailmentChanceShock'
  | 'ailmentChancePoison'
  | 'ailmentChanceOnCrit'    // flat % added to every ailment chance on crit hits
  // Phase F (2026-05-06): companion-modifier stats. Sum across talent
  // effects; consumed by minions.ts companion config + tick.ts companion
  // tick path. Default 0 (no modifier).
  | 'companionDamage'        // % bonus damage on companion attacks
  | 'companionHp'            // % bonus HP on companion summons
  | 'companionAttackSpeed'   // % bonus attack speed (fewer seconds between attacks)
  | 'companionSummonManaCost' // flat reduction to summon mana cost
  // Phase F (2026-05-07): AoE skills hit +N additional enemies.
  // Folded into skillChains at chain-resolution site for AoE-tagged
  // skills only.
  | 'aoeTargetCount'
  // Phase F (2026-05-07): registered for talent authoring (Brs Jg
  // cleave_reach / mountain capstone / etc.). Currently silent-ignore
  // — wiring into AoE skill geometry is a follow-on slice.
  | 'aoeRadius';

export type ResolvedStats = Record<StatKey, number>;
