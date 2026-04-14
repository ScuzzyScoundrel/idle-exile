import { CharacterClass, AbilitySkillTree, SkillTreePath } from '../types';

// ─── Warrior ────────────────────────────────────────────────────────────────

const warriorBlood: SkillTreePath = {
  id: 'A',
  name: 'Blood',
  description: 'Sustain through life leech, regeneration, and recovering from the brink.',
  nodes: [
    { id: 'w_blood_1', name: 'Taste of Blood', description: 'Your attacks heal a fraction more.', tier: 1, effect: { defenseMult: 1.05 } },
    { id: 'w_blood_2', name: 'Sanguine Vigor', description: 'Hardened through bloodshed.', tier: 1, effect: { defenseMult: 1.05 } },
    { id: 'w_blood_3', name: 'Crimson Fortitude', description: 'Vitality surges from every kill.', tier: 2, effect: { defenseMult: 1.10 }, requiresNodeId: 'w_blood_2' },
    { id: 'w_blood_4', name: 'Blood Frenzy', description: 'Your ferocity grows as wounds deepen.', tier: 2, effect: { damageMult: 1.08, critChanceBonus: 2 }, requiresNodeId: 'w_blood_1' },
    { id: 'w_blood_5', name: 'Undying Rage', description: 'Sheer will keeps you standing.', tier: 3, effect: { defenseMult: 1.15, resistBonus: 5 }, requiresNodeId: 'w_blood_3' },
    { id: 'w_blood_6', name: 'Lifeblood Harvest', description: 'Every slain foe restores your body.', tier: 3, effect: { defenseMult: 1.15, xpMult: 1.05 }, requiresNodeId: 'w_blood_4' },
    { id: 'w_blood_7', name: 'Sanguine Mastery', description: 'Your body adapts to all punishment.', tier: 4, effect: { defenseMult: 1.25, resistBonus: 10 }, requiresNodeId: 'w_blood_5', isPathPayoff: true },
    { id: 'w_blood_8', name: 'Deathless', description: 'Ignore hazards entirely — your blood shields you.', tier: 4, effect: { ignoreHazards: true, defenseMult: 1.10 }, requiresNodeId: 'w_blood_6', isPathPayoff: true },
  ],
};

const warriorIron: SkillTreePath = {
  id: 'B',
  name: 'Iron',
  description: 'Unyielding armor, shields, and damage reduction.',
  nodes: [
    { id: 'w_iron_1', name: 'Iron Skin', description: 'Steel-hardened flesh reduces all damage.', tier: 1, effect: { defenseMult: 1.08 } },
    { id: 'w_iron_2', name: 'Shield Wall', description: 'Block more reliably under pressure.', tier: 1, effect: { defenseMult: 1.05, resistBonus: 3 } },
    { id: 'w_iron_3', name: 'Bulwark', description: 'A walking fortress of plate and will.', tier: 2, effect: { defenseMult: 1.10, resistBonus: 5 }, requiresNodeId: 'w_iron_1' },
    { id: 'w_iron_4', name: 'Fortified Stance', description: 'Stability in combat grants endurance.', tier: 2, effect: { defenseMult: 1.10 }, requiresNodeId: 'w_iron_2' },
    { id: 'w_iron_5', name: 'Indomitable', description: 'Elemental assaults barely register.', tier: 3, effect: { resistBonus: 10, defenseMult: 1.10 }, requiresNodeId: 'w_iron_3' },
    { id: 'w_iron_6', name: 'Armor Mastery', description: 'Your armor deflects ever more damage.', tier: 3, effect: { defenseMult: 1.20 }, requiresNodeId: 'w_iron_4' },
    { id: 'w_iron_7', name: 'Unbreakable', description: 'Massive damage reduction and elemental immunity.', tier: 4, effect: { defenseMult: 1.30, resistBonus: 15 }, requiresNodeId: 'w_iron_5', isPathPayoff: true },
    { id: 'w_iron_8', name: 'Living Fortress', description: 'Your defense is so absolute it boosts clear speed.', tier: 4, effect: { defenseMult: 1.50, clearSpeedMult: 1.10 }, requiresNodeId: 'w_iron_6', isPathPayoff: true },
  ],
};

const warriorFury: SkillTreePath = {
  id: 'C',
  name: 'Fury',
  description: 'Rage-fueled carnage — raw damage, crits, and overwhelming force.',
  nodes: [
    { id: 'w_fury_1', name: 'Wrath', description: 'Your blows carry extra fury.', tier: 1, effect: { damageMult: 1.08 } },
    { id: 'w_fury_2', name: 'Keen Edge', description: 'Sharper weapons find weak points.', tier: 1, effect: { critChanceBonus: 3 } },
    { id: 'w_fury_3', name: 'Berserker\'s Might', description: 'Abandon defense for devastating strikes.', tier: 2, effect: { damageMult: 1.12 }, requiresNodeId: 'w_fury_1' },
    { id: 'w_fury_4', name: 'Vicious Strikes', description: 'Critical hits deal significantly more.', tier: 2, effect: { critMultiplierBonus: 15 }, requiresNodeId: 'w_fury_2' },
    { id: 'w_fury_5', name: 'Overwhelming Force', description: 'Sheer power cleaves through enemies.', tier: 3, effect: { damageMult: 1.15, clearSpeedMult: 1.08 }, requiresNodeId: 'w_fury_3' },
    { id: 'w_fury_6', name: 'Savage Instinct', description: 'Predatory reflexes sharpen your strikes.', tier: 3, effect: { critChanceBonus: 5, critMultiplierBonus: 10 }, requiresNodeId: 'w_fury_4' },
    { id: 'w_fury_7', name: 'Fury Unleashed', description: 'Every clear is an explosion of violence.', tier: 4, effect: { damageMult: 1.25, clearSpeedMult: 1.15 }, requiresNodeId: 'w_fury_5', isPathPayoff: true },
    { id: 'w_fury_8', name: 'Avatar of Carnage', description: 'Double clears — your rage annihilates everything.', tier: 4, effect: { doubleClears: true, damageMult: 1.10 }, requiresNodeId: 'w_fury_6', isPathPayoff: true },
  ],
};

// ─── Mage ───────────────────────────────────────────────────────────────────

const mageArcane: SkillTreePath = {
  id: 'A',
  name: 'Arcane',
  description: 'Charge manipulation — empower discharges and maximize burst windows.',
  nodes: [
    { id: 'm_arcane_1', name: 'Arcane Spark', description: 'Minor magical amplification.', tier: 1, effect: { damageMult: 1.06 } },
    { id: 'm_arcane_2', name: 'Mana Conduit', description: 'Channel energy more efficiently.', tier: 1, effect: { damageMult: 1.06 } },
    { id: 'm_arcane_3', name: 'Overcharge', description: 'Discharges carry more explosive force.', tier: 2, effect: { damageMult: 1.10, critChanceBonus: 2 }, requiresNodeId: 'm_arcane_1' },
    { id: 'm_arcane_4', name: 'Resonance', description: 'Sustained casting builds resonant energy.', tier: 2, effect: { damageMult: 1.08, clearSpeedMult: 1.05 }, requiresNodeId: 'm_arcane_2' },
    { id: 'm_arcane_5', name: 'Arcane Surge', description: 'A torrent of raw magical power.', tier: 3, effect: { damageMult: 1.15, critChanceBonus: 3 }, requiresNodeId: 'm_arcane_3' },
    { id: 'm_arcane_6', name: 'Power Siphon', description: 'Each clear feeds the next discharge.', tier: 3, effect: { damageMult: 1.12, clearSpeedMult: 1.08 }, requiresNodeId: 'm_arcane_4' },
    { id: 'm_arcane_7', name: 'Arcane Cataclysm', description: 'Devastating burst damage from accumulated power.', tier: 4, effect: { damageMult: 1.30, critChanceBonus: 5 }, requiresNodeId: 'm_arcane_5', isPathPayoff: true },
    { id: 'm_arcane_8', name: 'Infinite Discharge', description: 'Double clears on every discharge cycle.', tier: 4, effect: { doubleClears: true, damageMult: 1.10 }, requiresNodeId: 'm_arcane_6', isPathPayoff: true },
  ],
};

const mageElements: SkillTreePath = {
  id: 'B',
  name: 'Elements',
  description: 'Elemental mastery — penetrate resistances and amplify elemental damage.',
  nodes: [
    { id: 'm_elem_1', name: 'Elemental Attunement', description: 'Tune into the primal forces.', tier: 1, effect: { damageMult: 1.05, resistBonus: 3 } },
    { id: 'm_elem_2', name: 'Frost Bite', description: 'Chilling presence weakens foes.', tier: 1, effect: { damageMult: 1.06 } },
    { id: 'm_elem_3', name: 'Searing Flames', description: 'Fire burns through enemy defenses.', tier: 2, effect: { damageMult: 1.10 }, requiresNodeId: 'm_elem_1' },
    { id: 'm_elem_4', name: 'Tempest Call', description: 'Lightning answers your command.', tier: 2, effect: { damageMult: 1.08, critChanceBonus: 3 }, requiresNodeId: 'm_elem_2' },
    { id: 'm_elem_5', name: 'Elemental Convergence', description: 'All elements combine into devastating force.', tier: 3, effect: { damageMult: 1.15, resistBonus: 8 }, requiresNodeId: 'm_elem_3' },
    { id: 'm_elem_6', name: 'Storm Mastery', description: 'Storms rage at your fingertips.', tier: 3, effect: { damageMult: 1.15, critChanceBonus: 4 }, requiresNodeId: 'm_elem_4' },
    { id: 'm_elem_7', name: 'Elemental Avatar', description: 'Become one with the elements — massive resist and damage.', tier: 4, effect: { damageMult: 1.25, resistBonus: 15 }, requiresNodeId: 'm_elem_5', isPathPayoff: true },
    { id: 'm_elem_8', name: 'Primordial Wrath', description: 'Ignore all hazards — elements bow to your will.', tier: 4, effect: { ignoreHazards: true, damageMult: 1.20 }, requiresNodeId: 'm_elem_6', isPathPayoff: true },
  ],
};

const mageMind: SkillTreePath = {
  id: 'C',
  name: 'Mind',
  description: 'Spell mastery, knowledge, and accelerated growth.',
  nodes: [
    { id: 'm_mind_1', name: 'Keen Intellect', description: 'A sharp mind learns faster.', tier: 1, effect: { xpMult: 1.08 } },
    { id: 'm_mind_2', name: 'Spell Focus', description: 'Concentrated casting deals more damage.', tier: 1, effect: { damageMult: 1.06 } },
    { id: 'm_mind_3', name: 'Thirst for Knowledge', description: 'Combat experience accumulates faster.', tier: 2, effect: { xpMult: 1.10, materialDropMult: 1.08 }, requiresNodeId: 'm_mind_1' },
    { id: 'm_mind_4', name: 'Mental Fortitude', description: 'A resilient mind resists damage.', tier: 2, effect: { defenseMult: 1.08, damageMult: 1.06 }, requiresNodeId: 'm_mind_2' },
    { id: 'm_mind_5', name: 'Sage Wisdom', description: 'Deep understanding of magical lore.', tier: 3, effect: { xpMult: 1.15, itemDropMult: 1.10 }, requiresNodeId: 'm_mind_3' },
    { id: 'm_mind_6', name: 'Arcane Precision', description: 'Surgical spell accuracy.', tier: 3, effect: { damageMult: 1.12, critChanceBonus: 4 }, requiresNodeId: 'm_mind_4' },
    { id: 'm_mind_7', name: 'Omniscience', description: 'Unmatched XP and material acquisition.', tier: 4, effect: { xpMult: 1.25, materialDropMult: 1.20, itemDropMult: 1.15 }, requiresNodeId: 'm_mind_5', isPathPayoff: true },
    { id: 'm_mind_8', name: 'Grand Magister', description: 'Supreme spellwork — damage and clear speed mastery.', tier: 4, effect: { damageMult: 1.30, clearSpeedMult: 1.15 }, requiresNodeId: 'm_mind_6', isPathPayoff: true },
  ],
};

// ─── Ranger ─────────────────────────────────────────────────────────────────

const rangerPredator: SkillTreePath = {
  id: 'A',
  name: 'Predator',
  description: 'Hunt with lethal precision — damage, crits, and relentless accuracy.',
  nodes: [
    { id: 'r_pred_1', name: 'Hunter\'s Eye', description: 'Keen sight finds weak spots.', tier: 1, effect: { critChanceBonus: 3 } },
    { id: 'r_pred_2', name: 'Lethal Draw', description: 'Every shot carries killing intent.', tier: 1, effect: { damageMult: 1.08 } },
    { id: 'r_pred_3', name: 'Marked for Death', description: 'Targets become easier to hit fatally.', tier: 2, effect: { critChanceBonus: 3, critMultiplierBonus: 10 }, requiresNodeId: 'r_pred_1' },
    { id: 'r_pred_4', name: 'Piercing Shots', description: 'Arrows tear through armor.', tier: 2, effect: { damageMult: 1.10 }, requiresNodeId: 'r_pred_2' },
    { id: 'r_pred_5', name: 'Apex Predator', description: 'Top of the food chain.', tier: 3, effect: { damageMult: 1.15, critChanceBonus: 4 }, requiresNodeId: 'r_pred_3' },
    { id: 'r_pred_6', name: 'Relentless Barrage', description: 'A storm of projectiles finds every gap.', tier: 3, effect: { damageMult: 1.15, clearSpeedMult: 1.08 }, requiresNodeId: 'r_pred_4' },
    { id: 'r_pred_7', name: 'Deadeye', description: 'Perfect accuracy — devastating crits on every salvo.', tier: 4, effect: { critChanceBonus: 8, critMultiplierBonus: 20, damageMult: 1.15 }, requiresNodeId: 'r_pred_5', isPathPayoff: true },
    { id: 'r_pred_8', name: 'Kill Shot', description: 'Double clears — each arrow fells two foes.', tier: 4, effect: { doubleClears: true, damageMult: 1.10 }, requiresNodeId: 'r_pred_6', isPathPayoff: true },
  ],
};

const rangerWarden: SkillTreePath = {
  id: 'B',
  name: 'Warden',
  description: 'Evasion, natural resilience, and survivalist instincts.',
  nodes: [
    { id: 'r_ward_1', name: 'Nature\'s Grace', description: 'Light on your feet, hard to pin down.', tier: 1, effect: { defenseMult: 1.06 } },
    { id: 'r_ward_2', name: 'Bark Skin', description: 'Toughened by the wilds.', tier: 1, effect: { defenseMult: 1.06, resistBonus: 3 } },
    { id: 'r_ward_3', name: 'Wind Walker', description: 'Dodge with preternatural speed.', tier: 2, effect: { defenseMult: 1.10 }, requiresNodeId: 'r_ward_1' },
    { id: 'r_ward_4', name: 'Thick Hide', description: 'Endure punishment like the great beasts.', tier: 2, effect: { defenseMult: 1.10, resistBonus: 5 }, requiresNodeId: 'r_ward_2' },
    { id: 'r_ward_5', name: 'Untouchable', description: 'Attacks pass harmlessly through your afterimage.', tier: 3, effect: { defenseMult: 1.15, resistBonus: 8 }, requiresNodeId: 'r_ward_3' },
    { id: 'r_ward_6', name: 'Regenerative Bond', description: 'Nature heals those who serve it.', tier: 3, effect: { defenseMult: 1.15 }, requiresNodeId: 'r_ward_4' },
    { id: 'r_ward_7', name: 'One with Nature', description: 'Ignore all environmental hazards.', tier: 4, effect: { ignoreHazards: true, defenseMult: 1.15 }, requiresNodeId: 'r_ward_5', isPathPayoff: true },
    { id: 'r_ward_8', name: 'Ironwood Guardian', description: 'Massive defense and resist bonuses.', tier: 4, effect: { defenseMult: 1.50, resistBonus: 15 }, requiresNodeId: 'r_ward_6', isPathPayoff: true },
  ],
};

const rangerPathfinder: SkillTreePath = {
  id: 'C',
  name: 'Pathfinder',
  description: 'Tracking, scavenging, and finding hidden treasures.',
  nodes: [
    { id: 'r_path_1', name: 'Keen Tracker', description: 'Your tracking skills uncover more loot.', tier: 1, effect: { itemDropMult: 1.08 } },
    { id: 'r_path_2', name: 'Resourceful', description: 'Waste nothing — gather more materials.', tier: 1, effect: { materialDropMult: 1.08 } },
    { id: 'r_path_3', name: 'Scavenger', description: 'Find items others would miss.', tier: 2, effect: { itemDropMult: 1.10, materialDropMult: 1.08 }, requiresNodeId: 'r_path_1' },
    { id: 'r_path_4', name: 'Trail Blazer', description: 'Move faster through zones.', tier: 2, effect: { clearSpeedMult: 1.08, xpMult: 1.05 }, requiresNodeId: 'r_path_2' },
    { id: 'r_path_5', name: 'Master Forager', description: 'Every zone yields bountiful resources.', tier: 3, effect: { materialDropMult: 1.15, itemDropMult: 1.10 }, requiresNodeId: 'r_path_3' },
    { id: 'r_path_6', name: 'Scout\'s Instinct', description: 'Experience and speed from exploration.', tier: 3, effect: { xpMult: 1.10, clearSpeedMult: 1.10 }, requiresNodeId: 'r_path_4' },
    { id: 'r_path_7', name: 'Treasure Hunter', description: 'Dramatically increased drop rates for everything.', tier: 4, effect: { itemDropMult: 1.25, materialDropMult: 1.25, xpMult: 1.10 }, requiresNodeId: 'r_path_5', isPathPayoff: true },
    { id: 'r_path_8', name: 'Master Explorer', description: 'Clear speed and XP mastery from a lifetime of exploration.', tier: 4, effect: { clearSpeedMult: 1.20, xpMult: 1.20 }, requiresNodeId: 'r_path_6', isPathPayoff: true },
  ],
};

// ─── Rogue ──────────────────────────────────────────────────────────────────

const rogueShadow: SkillTreePath = {
  id: 'A',
  name: 'Shadow',
  description: 'Critical strikes from the darkness — burst damage and assassination.',
  nodes: [
    { id: 'ro_shad_1', name: 'Backstab', description: 'Strike from the shadows for extra damage.', tier: 1, effect: { critChanceBonus: 3 } },
    { id: 'ro_shad_2', name: 'Poison Tip', description: 'Coated blades deal lingering damage.', tier: 1, effect: { damageMult: 1.08 } },
    { id: 'ro_shad_3', name: 'Ambush', description: 'Surprise attacks are devastating.', tier: 2, effect: { critChanceBonus: 4, critMultiplierBonus: 10 }, requiresNodeId: 'ro_shad_1' },
    { id: 'ro_shad_4', name: 'Twist the Knife', description: 'Critical wounds bleed profusely.', tier: 2, effect: { damageMult: 1.10, critMultiplierBonus: 8 }, requiresNodeId: 'ro_shad_2' },
    { id: 'ro_shad_5', name: 'Death Mark', description: 'Mark your target for execution.', tier: 3, effect: { critChanceBonus: 5, damageMult: 1.12 }, requiresNodeId: 'ro_shad_3' },
    { id: 'ro_shad_6', name: 'Shadow Strike', description: 'Attacks from shadow deal immense damage.', tier: 3, effect: { damageMult: 1.18, critMultiplierBonus: 12 }, requiresNodeId: 'ro_shad_4' },
    { id: 'ro_shad_7', name: 'Perfect Assassination', description: 'Every strike aims for the kill — massive crit bonuses.', tier: 4, effect: { critChanceBonus: 10, critMultiplierBonus: 25, damageMult: 1.15 }, requiresNodeId: 'ro_shad_5', isPathPayoff: true },
    { id: 'ro_shad_8', name: 'Deathblow', description: 'Lethal efficiency — double clears from assassination.', tier: 4, effect: { doubleClears: true, critChanceBonus: 5 }, requiresNodeId: 'ro_shad_6', isPathPayoff: true },
  ],
};

const rogueSwiftness: SkillTreePath = {
  id: 'B',
  name: 'Swiftness',
  description: 'Momentum and speed — clear zones with blinding efficiency.',
  nodes: [
    { id: 'ro_swift_1', name: 'Quick Step', description: 'Move through combat with agility.', tier: 1, effect: { clearSpeedMult: 1.06 } },
    { id: 'ro_swift_2', name: 'Fleet Footed', description: 'Light steps avoid danger.', tier: 1, effect: { clearSpeedMult: 1.05, defenseMult: 1.04 } },
    { id: 'ro_swift_3', name: 'Momentum', description: 'Each kill accelerates the next.', tier: 2, effect: { clearSpeedMult: 1.08, damageMult: 1.05 }, requiresNodeId: 'ro_swift_1' },
    { id: 'ro_swift_4', name: 'Evasive Maneuvers', description: 'Dance between attacks untouched.', tier: 2, effect: { defenseMult: 1.08, clearSpeedMult: 1.05 }, requiresNodeId: 'ro_swift_2' },
    { id: 'ro_swift_5', name: 'Blinding Speed', description: 'Move faster than the eye can follow.', tier: 3, effect: { clearSpeedMult: 1.12, damageMult: 1.08 }, requiresNodeId: 'ro_swift_3' },
    { id: 'ro_swift_6', name: 'Acrobatic Dodge', description: 'Impossible to pin down.', tier: 3, effect: { defenseMult: 1.12, clearSpeedMult: 1.08 }, requiresNodeId: 'ro_swift_4' },
    { id: 'ro_swift_7', name: 'Velocity', description: 'Supreme clear speed — a blur of blades.', tier: 4, effect: { clearSpeedMult: 1.25, damageMult: 1.15 }, requiresNodeId: 'ro_swift_5', isPathPayoff: true },
    { id: 'ro_swift_8', name: 'Untouchable', description: 'Maximum evasion — ignore hazards through pure speed.', tier: 4, effect: { ignoreHazards: true, clearSpeedMult: 1.15 }, requiresNodeId: 'ro_swift_6', isPathPayoff: true },
  ],
};

const rogueCunning: SkillTreePath = {
  id: 'C',
  name: 'Cunning',
  description: 'Clever tricks, extra loot, and profitable exploits.',
  nodes: [
    { id: 'ro_cun_1', name: 'Sticky Fingers', description: 'A talent for finding valuables.', tier: 1, effect: { itemDropMult: 1.08 } },
    { id: 'ro_cun_2', name: 'Street Smarts', description: 'Experience comes faster for the cunning.', tier: 1, effect: { xpMult: 1.06 } },
    { id: 'ro_cun_3', name: 'Opportunist', description: 'Exploit every opening for profit.', tier: 2, effect: { itemDropMult: 1.10, materialDropMult: 1.08 }, requiresNodeId: 'ro_cun_1' },
    { id: 'ro_cun_4', name: 'Cunning Plan', description: 'Careful planning yields better results.', tier: 2, effect: { xpMult: 1.08, damageMult: 1.05 }, requiresNodeId: 'ro_cun_2' },
    { id: 'ro_cun_5', name: 'Master Thief', description: 'Legendary ability to find hidden treasures.', tier: 3, effect: { itemDropMult: 1.15, materialDropMult: 1.12 }, requiresNodeId: 'ro_cun_3' },
    { id: 'ro_cun_6', name: 'Silver Tongue', description: 'Talk your way into better deals.', tier: 3, effect: { xpMult: 1.12, clearSpeedMult: 1.06 }, requiresNodeId: 'ro_cun_4' },
    { id: 'ro_cun_7', name: 'King of Thieves', description: 'Maximum loot from every encounter.', tier: 4, effect: { itemDropMult: 1.25, materialDropMult: 1.25, xpMult: 1.10 }, requiresNodeId: 'ro_cun_5', isPathPayoff: true },
    { id: 'ro_cun_8', name: 'Mastermind', description: 'Supreme cunning — damage and clear speed through intellect.', tier: 4, effect: { damageMult: 1.25, clearSpeedMult: 1.15, xpMult: 1.10 }, requiresNodeId: 'ro_cun_6', isPathPayoff: true },
  ],
};

// ─── Witchdoctor ────────────────────────────────────────────────────────────

const wdVoodoo: SkillTreePath = {
  id: 'A',
  name: 'Voodoo',
  description: 'Chaos mastery — hexes burn deeper, curses linger longer.',
  nodes: [
    { id: 'wd_voodoo_1', name: 'Dark Intent',       description: 'Your chaos magic cuts sharper.',              tier: 1, effect: { damageMult: 1.06 } },
    { id: 'wd_voodoo_2', name: 'Whispering Veil',   description: 'Unseen spirits lend their malice.',           tier: 1, effect: { damageMult: 1.05, resistBonus: 3 } },
    { id: 'wd_voodoo_3', name: 'Blighted Touch',    description: 'Every hex festers with extra venom.',          tier: 2, effect: { damageMult: 1.10 }, requiresNodeId: 'wd_voodoo_1' },
    { id: 'wd_voodoo_4', name: 'Soul Wound',        description: 'Corrupted wounds heal slowly for foes.',       tier: 2, effect: { damageMult: 1.08, critChanceBonus: 2 }, requiresNodeId: 'wd_voodoo_2' },
    { id: 'wd_voodoo_5', name: 'Unraveling Curse',  description: 'Targets decay faster under your gaze.',        tier: 3, effect: { damageMult: 1.15, clearSpeedMult: 1.05 }, requiresNodeId: 'wd_voodoo_3' },
    { id: 'wd_voodoo_6', name: 'Witch\'s Sight',    description: 'See past the veil — weak points exposed.',     tier: 3, effect: { critChanceBonus: 4, critMultiplierBonus: 10 }, requiresNodeId: 'wd_voodoo_4' },
    { id: 'wd_voodoo_7', name: 'Reaper of Fate',    description: 'Your curses gather power without end.',         tier: 4, effect: { damageMult: 1.25, critMultiplierBonus: 15 }, requiresNodeId: 'wd_voodoo_5', isPathPayoff: true },
    { id: 'wd_voodoo_8', name: 'Dread Sovereign',   description: 'Fear itself works in your favor — bonus loot.', tier: 4, effect: { damageMult: 1.15, itemDropMult: 1.15 }, requiresNodeId: 'wd_voodoo_6', isPathPayoff: true },
  ],
};

const wdSpirits: SkillTreePath = {
  id: 'B',
  name: 'Spirits',
  description: 'Command the dead — minions strike harder and last longer.',
  nodes: [
    { id: 'wd_spirits_1', name: 'Gravewalker',       description: 'Your spirits respond faster to your will.',   tier: 1, effect: { damageMult: 1.06 } },
    { id: 'wd_spirits_2', name: 'Ritual Binding',    description: 'Bind more spirits to your service.',           tier: 1, effect: { damageMult: 1.05, defenseMult: 1.03 } },
    { id: 'wd_spirits_3', name: 'Fetish Army',       description: 'Your swarms grow bolder in numbers.',           tier: 2, effect: { damageMult: 1.10, clearSpeedMult: 1.04 }, requiresNodeId: 'wd_spirits_1' },
    { id: 'wd_spirits_4', name: 'Undying Servants',  description: 'Minions endure far longer in combat.',          tier: 2, effect: { damageMult: 1.08, defenseMult: 1.08 }, requiresNodeId: 'wd_spirits_2' },
    { id: 'wd_spirits_5', name: 'Hollow Chorus',     description: 'Lost souls amplify your every spell.',          tier: 3, effect: { damageMult: 1.15 }, requiresNodeId: 'wd_spirits_3' },
    { id: 'wd_spirits_6', name: 'Spirit Shepherd',   description: 'Restless dead provide yield — more materials.', tier: 3, effect: { materialDropMult: 1.15, damageMult: 1.08 }, requiresNodeId: 'wd_spirits_4' },
    { id: 'wd_spirits_7', name: 'Lord of the Dead',  description: 'Your summons are legion — damage and clears.', tier: 4, effect: { damageMult: 1.20, clearSpeedMult: 1.12 }, requiresNodeId: 'wd_spirits_5', isPathPayoff: true },
    { id: 'wd_spirits_8', name: 'Spirit Ascendant',  description: 'The veil bends to you — double clears.',        tier: 4, effect: { doubleClears: true, damageMult: 1.10 }, requiresNodeId: 'wd_spirits_6', isPathPayoff: true },
  ],
};

const wdPlague: SkillTreePath = {
  id: 'C',
  name: 'Plague',
  description: 'Pandemic mastery — sickness spreads between targets.',
  nodes: [
    { id: 'wd_plague_1', name: 'Contagion',         description: 'Your afflictions seek new hosts.',             tier: 1, effect: { damageMult: 1.06 } },
    { id: 'wd_plague_2', name: 'Putrid Haze',       description: 'The air itself turns toxic around you.',        tier: 1, effect: { damageMult: 1.05, resistBonus: 4 } },
    { id: 'wd_plague_3', name: 'Festering Strike',  description: 'Your attacks leave deeper wounds.',             tier: 2, effect: { damageMult: 1.10, critChanceBonus: 2 }, requiresNodeId: 'wd_plague_1' },
    { id: 'wd_plague_4', name: 'Miasma',            description: 'Spreading clouds sap enemy vigor.',             tier: 2, effect: { damageMult: 1.08, clearSpeedMult: 1.04 }, requiresNodeId: 'wd_plague_2' },
    { id: 'wd_plague_5', name: 'Pandemic Bloom',    description: 'DoTs compound when targets die — chain rot.',   tier: 3, effect: { damageMult: 1.15, clearSpeedMult: 1.08 }, requiresNodeId: 'wd_plague_3' },
    { id: 'wd_plague_6', name: 'Corrupted Earth',   description: 'Hazards sustain you rather than harm.',         tier: 3, effect: { defenseMult: 1.15, resistBonus: 8 }, requiresNodeId: 'wd_plague_4' },
    { id: 'wd_plague_7', name: 'Plague Lord',       description: 'Your pestilence knows no bounds.',              tier: 4, effect: { damageMult: 1.25, clearSpeedMult: 1.15 }, requiresNodeId: 'wd_plague_5', isPathPayoff: true },
    { id: 'wd_plague_8', name: 'Immune',            description: 'Ignore hazards — disease cannot touch you.',    tier: 4, effect: { ignoreHazards: true, resistBonus: 10 }, requiresNodeId: 'wd_plague_6', isPathPayoff: true },
  ],
};

// ─── Assassin ───────────────────────────────────────────────────────────────

const asShadow: SkillTreePath = {
  id: 'A',
  name: 'Shadow',
  description: 'Stealth and precision — crits from unseen angles.',
  nodes: [
    { id: 'as_shadow_1', name: 'Silent Steps',      description: 'You move unseen through the fray.',             tier: 1, effect: { defenseMult: 1.05 } },
    { id: 'as_shadow_2', name: 'Unseen Edge',       description: 'Blades you cannot see cut deeper.',              tier: 1, effect: { critChanceBonus: 3 } },
    { id: 'as_shadow_3', name: 'Phantom Grip',      description: 'Every strike finds its mark.',                   tier: 2, effect: { critChanceBonus: 4, damageMult: 1.06 }, requiresNodeId: 'as_shadow_1' },
    { id: 'as_shadow_4', name: 'Nightblade',        description: 'Your crits bite with deadly intent.',            tier: 2, effect: { critMultiplierBonus: 20 }, requiresNodeId: 'as_shadow_2' },
    { id: 'as_shadow_5', name: 'Shadow Meld',       description: 'Dodge more blows — mist cannot be struck.',      tier: 3, effect: { defenseMult: 1.15 }, requiresNodeId: 'as_shadow_3' },
    { id: 'as_shadow_6', name: 'Ghostwalker',       description: 'Crits crush utterly — each blow ends futures.',  tier: 3, effect: { critChanceBonus: 5, critMultiplierBonus: 20 }, requiresNodeId: 'as_shadow_4' },
    { id: 'as_shadow_7', name: 'Umbral Executioner',description: 'Peak lethality — crits carve through packs.',    tier: 4, effect: { critChanceBonus: 8, critMultiplierBonus: 30 }, requiresNodeId: 'as_shadow_5', isPathPayoff: true },
    { id: 'as_shadow_8', name: 'Veil of Night',     description: 'The shadow guards you — ignore hazards.',        tier: 4, effect: { ignoreHazards: true, defenseMult: 1.10 }, requiresNodeId: 'as_shadow_6', isPathPayoff: true },
  ],
};

const asVenom: SkillTreePath = {
  id: 'B',
  name: 'Venom',
  description: 'Toxins that sap, wither, and unmake — your poison is legendary.',
  nodes: [
    { id: 'as_venom_1', name: 'Envenomed Blades',   description: 'Your weapons drip with slow death.',            tier: 1, effect: { damageMult: 1.06 } },
    { id: 'as_venom_2', name: 'Hollow Fang',        description: 'Poisons linger beyond reason.',                  tier: 1, effect: { damageMult: 1.05, critChanceBonus: 2 } },
    { id: 'as_venom_3', name: 'Seeping Wound',      description: 'DoTs tick faster and hit harder.',               tier: 2, effect: { damageMult: 1.10, critMultiplierBonus: 10 }, requiresNodeId: 'as_venom_1' },
    { id: 'as_venom_4', name: 'Numb Agony',         description: 'Foes stumble under layered afflictions.',        tier: 2, effect: { damageMult: 1.08, clearSpeedMult: 1.04 }, requiresNodeId: 'as_venom_2' },
    { id: 'as_venom_5', name: 'Rot Cascade',        description: 'Poisoned kills spread their toxin.',             tier: 3, effect: { damageMult: 1.15, clearSpeedMult: 1.08 }, requiresNodeId: 'as_venom_3' },
    { id: 'as_venom_6', name: 'Mithridate',         description: 'Immune to poison — chaos resist ratchets up.',   tier: 3, effect: { resistBonus: 12, defenseMult: 1.08 }, requiresNodeId: 'as_venom_4' },
    { id: 'as_venom_7', name: 'Widow\'s Kiss',      description: 'Legendary venom — DoTs devastate.',              tier: 4, effect: { damageMult: 1.30 }, requiresNodeId: 'as_venom_5', isPathPayoff: true },
    { id: 'as_venom_8', name: 'Toxicologist',       description: 'Herbs fall to your expertise — yield surge.',    tier: 4, effect: { materialDropMult: 1.20, damageMult: 1.10 }, requiresNodeId: 'as_venom_6', isPathPayoff: true },
  ],
};

const asBlades: SkillTreePath = {
  id: 'C',
  name: 'Blades',
  description: 'Dual-wielding mastery — relentless attack tempo.',
  nodes: [
    { id: 'as_blades_1', name: 'Swift Strikes',     description: 'Your blade arm never rests.',                   tier: 1, effect: { damageMult: 1.06 } },
    { id: 'as_blades_2', name: 'Dual Focus',        description: 'Both hands move as one.',                        tier: 1, effect: { critChanceBonus: 2, damageMult: 1.04 } },
    { id: 'as_blades_3', name: 'Whirling Steel',    description: 'Blades move faster than eye can track.',         tier: 2, effect: { damageMult: 1.10, clearSpeedMult: 1.06 }, requiresNodeId: 'as_blades_1' },
    { id: 'as_blades_4', name: 'Precise Tempo',     description: 'Rhythm becomes a weapon.',                       tier: 2, effect: { critChanceBonus: 3, critMultiplierBonus: 10 }, requiresNodeId: 'as_blades_2' },
    { id: 'as_blades_5', name: 'Stormcut',          description: 'Your combo rhythm cleaves packs.',                tier: 3, effect: { damageMult: 1.15, clearSpeedMult: 1.10 }, requiresNodeId: 'as_blades_3' },
    { id: 'as_blades_6', name: 'Bladesinger',       description: 'Dance of steel — haste crowned with precision.',  tier: 3, effect: { critChanceBonus: 5, clearSpeedMult: 1.05 }, requiresNodeId: 'as_blades_4' },
    { id: 'as_blades_7', name: 'Flurry Ascendant',  description: 'Unmatched tempo — clears multiply.',              tier: 4, effect: { clearSpeedMult: 1.20, damageMult: 1.15 }, requiresNodeId: 'as_blades_5', isPathPayoff: true },
    { id: 'as_blades_8', name: 'Duelist Supreme',   description: 'Every fight is a performance — double clears.',  tier: 4, effect: { doubleClears: true, critMultiplierBonus: 15 }, requiresNodeId: 'as_blades_6', isPathPayoff: true },
  ],
};

// ─── Export ─────────────────────────────────────────────────────────────────

export const CLASS_TALENT_TREES: Record<CharacterClass, AbilitySkillTree> = {
  warrior: { paths: [warriorBlood, warriorIron, warriorFury], maxPoints: 24 },
  mage:    { paths: [mageArcane, mageElements, mageMind], maxPoints: 24 },
  ranger:  { paths: [rangerPredator, rangerWarden, rangerPathfinder], maxPoints: 24 },
  rogue:   { paths: [rogueShadow, rogueSwiftness, rogueCunning], maxPoints: 24 },
  witchdoctor: { paths: [wdVoodoo, wdSpirits, wdPlague], maxPoints: 24 },
  assassin:    { paths: [asShadow, asVenom, asBlades], maxPoints: 24 },
};
