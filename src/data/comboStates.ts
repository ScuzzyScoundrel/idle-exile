// ============================================================
// Combo State Registry — Phase C3 §8.1 migration source-of-truth
// ============================================================
//
// First-class typed definitions for every combo state in the engine.
// Skills, talents, and UI reference states by id; engine + UI resolve
// metadata (name, description, duration, effect) via this registry.
//
// MIGRATION HISTORY:
//   • Pre-§8.1 (2026-05-04): combo states were implicit — defined inline
//     by their creator skill in `engine/combat/combo.ts:COMBO_STATE_CREATORS`.
//     New Phase C3 weapon pools (Bloodied, Snared, Frenzy, Marked, etc.)
//     and Phase F pair-fusion states (Hunter's Shadow, Cursed Cascade,
//     Element-Mark, etc.) couldn't host their definitions cleanly.
//   • §8.1 migration: states extracted to this registry. Creator/consumer
//     wiring stays in combo.ts; the data lives here.
//
// ADDING A NEW STATE:
//   1. Add an entry to COMBO_STATE_SPECS keyed by stable id.
//   2. (If a skill creates it) wire COMBO_STATE_CREATORS in combo.ts
//      to reference the state id.
//   3. (If a skill consumes it) wire COMBO_STATE_CONSUMERS in combo.ts.
//
// SCHEMA: see `ComboStateSpec` in `src/types/combat.ts`.

import type { ComboStateSpec } from '../types';

export const COMBO_STATE_SPECS: Record<string, ComboStateSpec> = {
  // ────────────────────────────────────────────
  // Dagger v2 (Assassin) — pre-§8.1 hardcoded states
  // ────────────────────────────────────────────
  exposed: {
    id: 'exposed',
    name: 'Exposed',
    description: 'Vulnerable to follow-up. Next non-Stab skill deals +25% damage.',
    defaultDuration: 3,
    maxStacks: 1,
    defaultEffect: { incDamage: 25 },
    category: 'target',
    side: 'target',
  },
  dance_momentum: {
    id: 'dance_momentum',
    name: 'Dance Momentum',
    description: 'Triple-target sweep momentum. Next single-target skill splashes 1 adjacent enemy at 50% damage.',
    defaultDuration: 4,
    maxStacks: 1,
    defaultEffect: { incDamage: 15 },
    category: 'self',
    side: 'player',
  },
  deep_wound: {
    id: 'deep_wound',
    name: 'Deep Wound',
    description: 'Bleeding wound primed for execution. Consuming it detonates 50% of remaining ailment ticks instantly.',
    // COMBAT_ECONOMY_DESIGN §2.1: retired at baseline (no creator wires it);
    // reborn as the Venomcraft "Fester" talent state. Effect converted to
    // the generic E10 detonateDotPercent field (old: stateId-hardcoded burst).
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { detonateDotPercent: 50, burstElement: 'chaos' },
    category: 'target',
    side: 'target',
  },
  // ── COMBAT_ECONOMY_DESIGN §2 (Wave E1): the Assassin economy ──
  momentum: {
    id: 'momentum',
    name: 'Momentum',
    description: 'The Assassin\'s ledger. Built +1 per builder cast (max 5, refreshed on gain). Assassinate consumes ALL stacks: +30% damage per stack, PERFECT at 5 (×3 + advances other cooldowns 1s). Fan of Knives spends the same pool at +20%/stack.',
    defaultDuration: 10,
    maxStacks: 5,
    defaultEffect: { incDamagePerStackConsumed: 30, capBonus: { incDamage: 200, advanceOthersSec: 1 } },
    category: 'stack',
    side: 'player',
  },
  opening: {
    id: 'opening',
    name: 'Opening',
    description: 'A fleeting gap in the enemy\'s guard (3s, opened by builder crits, 3s internal cooldown). Spending Momentum inside it: ×2.25 damage and refunds 3 Momentum.',
    defaultDuration: 3.0,
    maxStacks: 1,
    defaultEffect: { incDamage: 125, refundStacks: { stateId: 'momentum', amount: 3 } },
    category: 'self',
    side: 'player',
  },
  // ── COMBAT_ECONOMY_DESIGN §3 (Wave E3): the Hunter economy ──
  quiver: {
    id: 'quiver',
    name: 'Quiver',
    description: 'The Hunter\'s ledger. Arrow Shot +1, Rapid Fire +3 (max 6, refreshed on gain — gains past 6 are wasted). Snipe consumes ALL stacks: +30% damage per stack, PERFECT at 6 (×2.5, guaranteed crit, advances other cooldowns 1s). Pierce Volley spends the same pool at +15%/stack.',
    defaultDuration: 10,
    maxStacks: 6,
    defaultEffect: { incDamagePerStackConsumed: 30, capBonus: { incDamage: 150, guaranteedCrit: true, advanceOthersSec: 1 } },
    category: 'stack',
    side: 'player',
  },
  vulnerable: {
    id: 'vulnerable',
    name: 'Vulnerable',
    description: 'A killing angle on a Marked target (3s, opened by crits vs Marked, 3s internal cooldown). Spending Quiver inside it: ×2 damage and refunds 2 Quiver.',
    defaultDuration: 3.0,
    maxStacks: 1,
    defaultEffect: { incDamage: 100, refundStacks: { stateId: 'quiver', amount: 2 } },
    category: 'self',
    side: 'player',
  },
  // ── COMBAT_ECONOMY_DESIGN §5 (Wave E4): the Sorcerer economy ──
  attunement: {
    id: 'attunement',
    name: 'Attunement',
    description: 'The Sorcerer\'s ledger. Elemental bolts build +1 (max 5, refreshed on gain). Void Blast consumes ALL stacks: +30% damage per stack, PERFECT at 5 (×2.5 + advances other cooldowns 1s). Volley Convergence spends the same pool at +15%/stack.',
    defaultDuration: 10,
    maxStacks: 5,
    defaultEffect: { incDamagePerStackConsumed: 30, capBonus: { incDamage: 150, advanceOthersSec: 1 } },
    category: 'stack',
    side: 'player',
  },
  arcane_surge: {
    id: 'arcane_surge',
    name: 'Arcane Surge',
    description: 'Raw power crackles loose (3s, opened by bolt crits, 3s internal cooldown). Spending Attunement inside it: ×2.25 damage and refunds 4 Attunement.',
    defaultDuration: 3.0,
    maxStacks: 1,
    defaultEffect: { incDamage: 125, refundStacks: { stateId: 'attunement', amount: 4 } },
    category: 'self',
    side: 'player',
  },
  // ── Wave E4c (owner Q6 = option b): the Berserker economy ──
  fury_charge: {
    id: 'fury_charge',
    name: 'Fury',
    description: 'The Berserker\'s ledger. Flail strikes build +1, TAKING a hit builds +1 (max 8, hit-taken fury has a 2s cooldown). Crushing Blow consumes ALL stacks: +22% damage per stack, PERFECT at 8 (×2 + advances other cooldowns 1s).',
    defaultDuration: 10,
    maxStacks: 8,
    defaultEffect: { incDamagePerStackConsumed: 22, capBonus: { incDamage: 100, advanceOthersSec: 1 } },
    category: 'stack',
    side: 'player',
  },
  rampage: {
    id: 'rampage',
    name: 'Rampage',
    description: 'Fury boils over — crossing full Fury opens a Rampage (3s). Spending Fury inside it: ×1.5 damage and refunds 3 Fury.',
    defaultDuration: 3.0,
    maxStacks: 1,
    defaultEffect: { incDamage: 50, refundStacks: { stateId: 'fury_charge', amount: 3 } },
    category: 'self',
    side: 'player',
  },
  shadow_mark: {
    id: 'shadow_mark',
    name: 'Shadow Mark',
    description: 'Marked from the shadows. Consumed by next skill — per-skill bonus depending on which skill consumes it.',
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { incDamage: 20 },
    category: 'target',
    side: 'target',
  },
  chain_surge: {
    id: 'chain_surge',
    name: 'Chain Surge',
    description: 'Lightning rebound. Next single-target skill chains to 1 additional enemy.',
    defaultDuration: 3,
    maxStacks: 1,
    defaultEffect: { incDamage: 10 },
    category: 'self',
    side: 'player',
  },
  shadow_momentum: {
    id: 'shadow_momentum',
    name: 'Shadow Momentum',
    description: 'Stealth tempo. Next skill cooldown starts 2s earlier.',
    defaultDuration: 2,
    maxStacks: 1,
    defaultEffect: { cooldownAcceleration: 2 },
    category: 'self',
    side: 'player',
  },

  // ────────────────────────────────────────────
  // Staff v2 (Witchdoctor) — pre-§8.1 hardcoded states
  // ────────────────────────────────────────────
  plagued: {
    id: 'plagued',
    name: 'Plagued',
    description: 'Infested with locusts. Pandemic vector — transfers to nearest enemy on host death.',
    defaultDuration: 6,
    maxStacks: 1,
    defaultEffect: { incDamage: 0 },
    category: 'target',
    side: 'target',
    carrierDeath: { mode: 'transfer' },
  },
  haunted: {
    id: 'haunted',
    name: 'Haunted',
    description: 'A spirit clings to the target. Consumed by Spirit Barrage for guaranteed crit + 30% bonus.',
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { incDamage: 30, guaranteedCrit: true },
    category: 'target',
    side: 'target',
    carrierDeath: { mode: 'chain', freshDuration: 6 },
  },
  hexed: {
    id: 'hexed',
    name: 'Hexed',
    description: 'Cursed by voodoo. Consumed by Soul Harvest for 2× damage.',
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { incDamage: 100 },
    category: 'target',
    side: 'target',
  },
  soul_stack: {
    id: 'soul_stack',
    name: 'Soul Stack',
    description: 'The Witch Doctor\'s ledger. Soul Harvest reaps +2 (max 6). Bouncing Skull consumes ALL stacks: +30% damage and +1 bounce per stack, PERFECT at 6 (×3 + advances other cooldowns 1s). Mass Sacrifice devours them for its own ritual.',
    defaultDuration: 10,
    maxStacks: 6,
    defaultEffect: { extraChains: 1, incDamagePerStackConsumed: 30, capBonus: { incDamage: 200, advanceOthersSec: 1 } },
    category: 'stack',
    side: 'player',
  },
  ritual_frenzy: {
    id: 'ritual_frenzy',
    name: 'Ritual Frenzy',
    description: 'The spirits howl (3s, opened by Locust Swarm crits, 5s internal cooldown). Spending Soul Stacks inside it: ×2 damage and refunds 3 souls.',
    defaultDuration: 3.0,
    maxStacks: 1,
    defaultEffect: { incDamage: 100, refundStacks: { stateId: 'soul_stack', amount: 3 } },
    category: 'self',
    side: 'player',
  },
  spirit_link: {
    id: 'spirit_link',
    name: 'Spirit Link',
    description: 'Bond between summoner and minion. Active while a minion lives.',
    defaultDuration: 999,           // effectively infinite — pruned via minion subsystem
    maxStacks: 1,
    defaultEffect: { incDamage: 0 },
    category: 'aura',
    side: 'player',
  },

  // ────────────────────────────────────────────
  // Phase C3 weapon-pool states (NEW — flail/claws/scythe/bow/etc.)
  // ────────────────────────────────────────────
  bloodied: {
    id: 'bloodied',
    name: 'Bloodied',
    description: 'Wounded and primed for execution. Berserker combo state — applied by direct hits while you are <50% HP.',
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { incDamage: 25 },
    category: 'target',
    side: 'target',
  },
  snared: {
    id: 'snared',
    name: 'Snared',
    description: 'Caught in a trap or net. Attack speed -50%.',
    defaultDuration: 3,
    maxStacks: 1,
    defaultEffect: { incDamage: 0 },
    category: 'target',
    side: 'target',
  },
  disarmed: {
    id: 'disarmed',
    name: 'Disarmed',
    description: 'Weapon wrapped or knocked aside. Attack speed -25%.',
    defaultDuration: 3,
    maxStacks: 1,
    defaultEffect: { incDamage: 0 },
    category: 'target',
    side: 'target',
  },
  frenzy: {
    id: 'frenzy',
    name: 'Frenzy',
    description: 'The claws ledger — bloodlust that spoils. Built +1 per claw builder (+3 from Death by 1000 Cuts), max 6; ALL stacks expire 6s after the last gain. Frenzy Strike consumes ALL stacks: +30% damage per stack, PERFECT at 6 (+150% and other cooldowns advance 1s). Crimson Tempest spends the same pool against every enemy.',
    // Ravage kit (claws Wave A): duration 6 is THE claws twist — the
    // anti-hold clock. Blind/offline refresh it by casting; only a
    // policy that WAITS gets bitten, which is why claws REQUIRES a
    // cap-dump rule (inverts the dagger no-cap-dump law, which was
    // derived from a 10s free-hold ledger).
    defaultDuration: 6,
    maxStacks: 6,
    defaultEffect: { incDamagePerStackConsumed: 30, capBonus: { incDamage: 150, advanceOthersSec: 1 } },
    category: 'stack',
    side: 'player',
  },
  arterial: {
    id: 'arterial',
    name: 'Arterial Rip',
    description: 'A torn artery (3s), opened by claw crits against a BLEEDING target (4s internal cooldown). Spending Frenzy inside it: double damage, refunds 2 Frenzy, and detonates 40% of the target\'s remaining bleed as an instant burst.',
    defaultDuration: 3.0,
    maxStacks: 1,
    defaultEffect: { incDamage: 100, refundStacks: { stateId: 'frenzy', amount: 2 }, detonateDotPercent: 40 },
    category: 'self',
    side: 'player',
  },
  marked: {
    id: 'marked',
    name: 'Hunter\'s Mark',
    description: 'Tracked by the Hunter. +30% crit chance to next attack against this target. +25% damage taken.',
    defaultDuration: 8,
    maxStacks: 1,
    defaultEffect: { incCritChance: 30, incDamage: 25 },
    category: 'target',
    side: 'target',
  },
  marked_for_cleave: {
    id: 'marked_for_cleave',
    name: 'Marked for Cleave',
    description: 'Tagged for AoE follow-up. Your next AoE skill deals +50% damage to this target.',
    defaultDuration: 4,
    maxStacks: 1,
    defaultEffect: { incDamage: 50 },
    category: 'target',
    side: 'target',
  },
  sundered: {
    id: 'sundered',
    name: 'Sundered',
    description: 'Armor cracked. Target takes +15% physical damage.',
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { incDamage: 15 },
    category: 'target',
    side: 'target',
  },

  // ────────────────────────────────────────────
  // Phase F pair-fusion states (DATA-ONLY for now)
  // Engine wiring lands when pair-fusion mechanics implement.
  // ────────────────────────────────────────────
  crit_stack: {
    id: 'crit_stack',
    name: 'Crit Stack',
    description: 'Cascade momentum. Each stack compounds crit damage on Cascade-eligible payoffs. Asn signature.',
    defaultDuration: 6,
    maxStacks: 5,
    defaultEffect: { incCritMultiplier: 10 },
    category: 'stack',
    side: 'target',                  // Cascade lives on the target
    pairArchetype: 'Assassin',       // Class signature, but used by Asn pairs (Blood Cultist, Dark Reaver, etc.)
  },
  resonance_charge: {
    id: 'resonance_charge',
    name: 'Resonance Charge',
    description: 'Elemental charge built up. At 4 unique elements, next cast becomes Convergence. Sor signature.',
    defaultDuration: 999,             // persistent until Convergence consumes
    maxStacks: 4,                     // 4 unique elements: fire / cold / lightning / chaos
    defaultEffect: { incDamage: 0 },
    category: 'stack',
    side: 'player',
    pairArchetype: 'Sorcerer',
  },
  self_bloodied: {
    id: 'self_bloodied',
    name: 'Self-Bloodied',
    description: 'You are wounded. While <50% HP, +25% damage to Marked targets. Spellreaver fusion.',
    defaultDuration: 999,             // persistent — driven by HP threshold
    maxStacks: 1,
    defaultEffect: { incDamage: 25 },
    category: 'self',
    side: 'player',
    pairArchetype: 'Spellreaver',
  },
  hunters_shadow: {
    id: 'hunters_shadow',
    name: 'Hunter\'s Shadow',
    description: 'Fused Mark + Shadow Mark. +30% crit chance AND +25% damage taken. Refreshed by Cascade crits. Nightstalker fusion.',
    defaultDuration: 8,
    maxStacks: 1,
    defaultEffect: { incCritChance: 30, incDamage: 25 },
    category: 'fusion',
    side: 'target',
    fusion: { combines: ['marked', 'shadow_mark'], pair: 'Nightstalker' },
    pairArchetype: 'Nightstalker',
  },
  cursed_cascade: {
    id: 'cursed_cascade',
    name: 'Cursed Cascade',
    description: 'Crit on Hexed target. On death: Hex + DoTs spread to nearest enemy with full duration. Blood Cultist fusion.',
    defaultDuration: 5,
    maxStacks: 1,
    defaultEffect: { incDamage: 0 },
    category: 'fusion',
    side: 'target',
    fusion: { combines: ['hexed', 'crit_stack'], pair: 'Blood Cultist' },
    pairArchetype: 'Blood Cultist',
    carrierDeath: { mode: 'transfer' },
  },
  element_mark: {
    id: 'element_mark',
    name: 'Element-Mark',
    description: 'Marked with the next-cycle element. Marked target takes +25% damage from that element\'s ailment. Arcane Archer fusion.',
    defaultDuration: 8,
    maxStacks: 1,
    defaultEffect: { incDamage: 25 },
    category: 'fusion',
    side: 'target',
    fusion: { combines: ['marked', 'resonance_charge'], pair: 'Arcane Archer' },
    pairArchetype: 'Arcane Archer',
  },
  tracking_spirit: {
    id: 'tracking_spirit',
    name: 'Tracking Spirit',
    description: 'Spirit released by a cursed-trapped death. Follows you for 10s. Consumed by next Hunter\'s Mark — adds 50% of dead target\'s max HP as chaos damage to new target. Soul Trapper fusion.',
    defaultDuration: 10,
    maxStacks: 5,
    defaultEffect: { incDamage: 0 },
    category: 'fusion',
    side: 'player',
    fusion: { combines: ['hexed', 'snared'], pair: 'Soul Trapper' },
    pairArchetype: 'Soul Trapper',
    carrierDeath: { mode: 'spawn_spirit' },
  },
};

/** Lookup a combo state spec by id. Returns undefined for unknown ids. */
export function getComboStateSpec(stateId: string): ComboStateSpec | undefined {
  return COMBO_STATE_SPECS[stateId];
}

/** All combo state specs as an array — useful for UI iteration / debug tooling. */
export function getAllComboStateSpecs(): ComboStateSpec[] {
  return Object.values(COMBO_STATE_SPECS);
}

/** All states matching a pair archetype (e.g. all "Blood Cultist" states). */
export function getComboStateSpecsByPair(pairArchetype: string): ComboStateSpec[] {
  return Object.values(COMBO_STATE_SPECS).filter(s => s.pairArchetype === pairArchetype);
}

/** All states for a side (player / target). */
export function getComboStateSpecsBySide(side: 'player' | 'target'): ComboStateSpec[] {
  return Object.values(COMBO_STATE_SPECS).filter(s => s.side === side);
}
