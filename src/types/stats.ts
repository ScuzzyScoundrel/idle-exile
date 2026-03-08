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
  | 'attackSpeed'
  | 'accuracy'
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
  // Delivery
  | 'incMeleeDamage'
  | 'incProjectileDamage'
  | 'incAoEDamage'
  | 'incDoTDamage'
  | 'incChannelDamage'
  | 'critChance'
  | 'critMultiplier'
  | 'abilityHaste'
  // Defensive
  | 'maxLife'
  | 'incMaxLife'
  | 'lifeRegen'
  | 'armor'
  | 'evasion'
  | 'blockChance'
  | 'fireResist'
  | 'coldResist'
  | 'lightningResist'
  | 'chaosResist'
  // Energy Shield
  | 'energyShield'
  | 'incEnergyShield'
  | 'esRecharge'
  // Utility
  | 'movementSpeed'
  | 'itemQuantity'
  | 'itemRarity'
  // Sustain
  | 'ailmentDuration'
  | 'lifeLeechPercent'
  | 'lifeOnHit'
  | 'lifeOnKill'
  // Build depth
  | 'cooldownRecovery'
  | 'fortifyEffect'
  | 'damageTakenReduction';

export type ResolvedStats = Record<StatKey, number>;
