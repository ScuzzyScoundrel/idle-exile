#!/bin/bash
set -e
cd /home/jerris/idle-exile
BAL=src/data/balance.ts

restore() { cp src/data/balance.ts.bak "$BAL"; }

run_sim() {
  local label="$1"
  echo ""
  echo "========================================"
  echo "  SCENARIO: $label"
  echo "========================================"
  npx tsx sim/runner.ts --archetype poison --armor any --gear-strat balanced --bots 10 --max-clears 5000 2>&1 | tail -40
  npx tsx sim/runner.ts --archetype "crit assassin" --armor any --gear-strat balanced --bots 10 --max-clears 5000 2>&1 | tail -40
  npx tsx sim/runner.ts --archetype "shadow dodge" --armor any --gear-strat balanced --bots 10 --max-clears 5000 2>&1 | tail -40
}

# --- BASELINE (current values) ---
restore
run_sim "BASELINE (current)"

# --- SCENARIO A: Mobs Hit Harder + No Boss Cap ---
restore
sed -i 's/export const ZONE_DMG_BASE = 6;/export const ZONE_DMG_BASE = 10;/' "$BAL"
sed -i 's/export const BOSS_MAX_DMG_RATIO = 0.40;/export const BOSS_MAX_DMG_RATIO = 99.0;/' "$BAL"
sed -i 's/export const BOSS_DAMAGE_MULT = 1.75;/export const BOSS_DAMAGE_MULT = 2.5;/' "$BAL"
run_sim "A: Mobs Hit Harder (DMG_BASE=10, BOSS_MULT=2.5, no boss cap)"

# --- SCENARIO B: Regen Nerf + No Boss Cap ---
restore
sed -i 's/lifeRegen: 3,/lifeRegen: 1,/' "$BAL"
sed -i 's/export const CLEAR_REGEN_RATIO = 0.12;/export const CLEAR_REGEN_RATIO = 0.06;/' "$BAL"
sed -i 's/export const BASE_REGEN_CAP_RATIO = 0.30;/export const BASE_REGEN_CAP_RATIO = 0.20;/' "$BAL"
sed -i 's/export const BOSS_MAX_DMG_RATIO = 0.40;/export const BOSS_MAX_DMG_RATIO = 99.0;/' "$BAL"
run_sim "B: Regen Nerf (lifeRegen=1, REGEN=0.06, CAP=0.20, no boss cap)"

# --- SCENARIO C: Armor Fix + Overlevel + No Boss Cap ---
restore
sed -i 's/export const ARMOR_COEFFICIENT = 2;/export const ARMOR_COEFFICIENT = 5;/' "$BAL"
sed -i 's/export const OVERLEVEL_DAMAGE_FLOOR = 0.30;/export const OVERLEVEL_DAMAGE_FLOOR = 0.50;/' "$BAL"
sed -i 's/export const BOSS_MAX_DMG_RATIO = 0.40;/export const BOSS_MAX_DMG_RATIO = 99.0;/' "$BAL"
run_sim "C: Armor Fix + Overlevel (ARMOR_COEFF=5, OVERLVL_FLOOR=0.50, no boss cap)"

# --- SCENARIO D: Full Rebalance (moderate combined) ---
restore
sed -i 's/export const ZONE_DMG_BASE = 6;/export const ZONE_DMG_BASE = 9;/' "$BAL"
sed -i 's/lifeRegen: 3,/lifeRegen: 1.5,/' "$BAL"
sed -i 's/export const ARMOR_COEFFICIENT = 2;/export const ARMOR_COEFFICIENT = 4;/' "$BAL"
sed -i 's/export const CLEAR_REGEN_RATIO = 0.12;/export const CLEAR_REGEN_RATIO = 0.08;/' "$BAL"
sed -i 's/export const BASE_REGEN_CAP_RATIO = 0.30;/export const BASE_REGEN_CAP_RATIO = 0.20;/' "$BAL"
sed -i 's/export const OVERLEVEL_DAMAGE_FLOOR = 0.30;/export const OVERLEVEL_DAMAGE_FLOOR = 0.50;/' "$BAL"
sed -i 's/export const BOSS_MAX_DMG_RATIO = 0.40;/export const BOSS_MAX_DMG_RATIO = 99.0;/' "$BAL"
sed -i 's/export const BOSS_DAMAGE_MULT = 1.75;/export const BOSS_DAMAGE_MULT = 2.25;/' "$BAL"
run_sim "D: Full Rebalance (DMG=9, regen=1.5, armor=4, regen=0.08/0.20, overlvl=0.50, boss=2.25)"

# --- Restore original ---
restore
echo ""
echo "=== ALL SCENARIOS COMPLETE. balance.ts restored. ==="
