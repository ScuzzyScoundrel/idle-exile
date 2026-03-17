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
  | 'ailmentTickSpeedMult';

export type ResolvedStats = Record<StatKey, number>;
