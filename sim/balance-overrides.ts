// ============================================================
// Sim-only balance overrides — mutate game data BEFORE bots run
// ============================================================

import { SET_BONUS_DEFS } from '../src/data/setBonuses';

// ─── ITERATION 6 ─────────────────────────────────────────────
// Plate sensitivity (DTR 10 baseline):
//   heal 0: +13%    heal 1: -31%     → 44pp per 1% heal
//   Target -25% → interpolate: heal ≈ 0.8

// --- PLATE ---
SET_BONUS_DEFS.plate.thresholds[6] = { damageTakenReduction: 10, lifeRecoveryPerHit: 0.8 };

// --- LEATHER: locked in ---
SET_BONUS_DEFS.leather.thresholds[4] = { evasion: 40 };
SET_BONUS_DEFS.leather.thresholds[6] = { lifeOnDodgePercent: 1, critMultiplier: 20 };

// --- CLOTH: locked in ---
SET_BONUS_DEFS.cloth.thresholds[6] = { esCombatRecharge: 40, maxLife: 200, allResist: 20, critChance: 3, critMultiplier: 5 };

console.log('[balance-overrides] ITERATION 6');
console.log('  Plate 6pc:', JSON.stringify(SET_BONUS_DEFS.plate.thresholds[6]));
