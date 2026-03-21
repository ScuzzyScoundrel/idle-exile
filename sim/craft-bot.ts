// ============================================================
// Craft Bot — headless crafting profession simulation
// Simulates a bot that gathers, refines, and crafts items
// ============================================================

import type {
  GatheringSkills,
  GatheringProfession,
  CraftingSkills,
  CraftingProfession,
  CraftingRecipeDef,
  RefinementRecipeDef,
  ZoneDef,
  Item,
} from '../src/types';

import { installRng } from './rng';
import { installClock, advanceClock } from './clock';

// Engine imports
import { addGatheringXp, calcGatherClearTime, calcGatheringYield, createDefaultGatheringSkills, canGatherInZone } from '../src/engine/gathering';
import { addCraftingXp, canCraftRecipe, executeCraft, getCraftingXpForTier } from '../src/engine/craftingProfessions';
import { canRefine, refine, getRefinementChain } from '../src/engine/refinement';
import { rollRareMaterialDrop, calcRareFindBonus } from '../src/engine/rareMaterials';

// Data imports
import { ZONE_DEFS } from '../src/data/zones';
import { GATHERING_BAND_REQUIREMENTS, GATHERING_MILESTONES } from '../src/data/gatheringProfessions';
import { createDefaultCraftingSkills } from '../src/data/craftingProfessions';
import { getRecipesForProfession, CRAFTING_RECIPES } from '../src/data/craftingRecipes';
import { REFINEMENT_RECIPES } from '../src/data/refinement';
import { MATERIAL_DROP_MIN, MATERIAL_DROP_MAX, CRAFTING_XP_PER_TIER } from '../src/data/balance';

import type {
  CraftBotConfig,
  CraftBotSummary,
  CraftClearLog,
  CraftedItemLog,
  RareMaterialLog,
  CraftStrategy,
} from './craft-strategies';

// ─── Constants ───────────────────────────────────────────

const MAX_LEVEL = 60;
const CLEARS_PER_LEVEL = 50;
const SNAPSHOT_INTERVAL = 100;
const GATHERING_MILESTONE_LEVELS = [10, 15, 25, 30, 50, 75, 90, 100];
const CRAFTING_MILESTONE_LEVELS = [15, 30, 50, 75, 90];

// ─── Mapping: gathering prof → refinement track ──────────

const GATHERING_TO_REFINEMENT_TRACK: Record<GatheringProfession, string> = {
  mining: 'ore',
  logging: 'wood',
  skinning: 'leather',
  herbalism: 'herb',
  fishing: 'fish',
};

// Build a set of all raw material IDs used as refinement inputs per track
const REFINEMENT_RAW_MATS = new Map<string, Set<string>>();
for (const recipe of REFINEMENT_RECIPES) {
  let set = REFINEMENT_RAW_MATS.get(recipe.track);
  if (!set) {
    set = new Set();
    REFINEMENT_RAW_MATS.set(recipe.track, set);
  }
  set.add(recipe.rawMaterialId);
}

// ─── CraftBot ────────────────────────────────────────────

export class CraftBot {
  private config: CraftBotConfig;
  private strategy: CraftStrategy;

  // State
  private gatheringSkills: GatheringSkills;
  private craftingSkills: CraftingSkills;
  private materials: Record<string, number> = {};
  private gold = 500; // starting gold
  private characterLevel = 1;

  // Counters
  private totalClears = 0;
  private totalSimTimeSec = 0;
  private totalRefines = 0;
  private totalCrafts = 0;
  private totalGoldSpent = 0;

  // Tracking
  private totalGathered: Record<string, number> = {};
  private totalRefined: Record<string, number> = {};
  private totalSpentOnCrafts: Record<string, number> = {};
  private refinesPerTier: Record<number, number> = {};
  private craftsPerTier: Record<number, number> = {};
  private craftedItems: CraftedItemLog[] = [];
  private rareDrops: RareMaterialLog[] = [];
  private snapshots: CraftClearLog[] = [];
  private gatheringMilestones: Record<number, number> = {};
  private craftingMilestones: Record<number, number> = {};

  // Alternation counter for dual-gathering
  private gatherAltCounter = 0;

  constructor(config: CraftBotConfig) {
    this.config = config;
    this.strategy = config.strategy;

    // Install fresh RNG + clock for this bot
    installRng(config.seed);
    installClock();

    this.gatheringSkills = createDefaultGatheringSkills();
    this.craftingSkills = createDefaultCraftingSkills();
  }

  run(): CraftBotSummary {
    for (let i = 0; i < this.config.maxClears; i++) {
      this.totalClears++;

      // 1. Pick zone and gathering profession for this clear
      const { zone, profession } = this.pickZone();
      if (!zone) break; // no valid zone (shouldn't happen)

      // 2. Gather
      this.gatherClear(zone, profession);

      // 3. Advance character level (simplified: 1 per CLEARS_PER_LEVEL clears)
      this.advanceCharLevel();

      // 4. Refine all possible
      this.refineAll();

      // 5. Craft when ready
      if (this.strategy.craftingProfession) {
        this.craftWhenReady();
      }

      // 6. Earn gold from clears
      this.earnGold(zone);

      // 7. Log snapshot every SNAPSHOT_INTERVAL clears
      if (this.totalClears % SNAPSHOT_INTERVAL === 0) {
        this.logSnapshot();
      }
    }

    // Final snapshot
    this.logSnapshot();

    return this.buildSummary();
  }

  // ─── Zone Selection ──────────────────────────────────

  private pickZone(): { zone: ZoneDef | null; profession: GatheringProfession } {
    // Determine which gathering profession to use this clear
    let profession = this.strategy.primaryGathering;

    if (this.strategy.secondaryGathering) {
      // Alternate between primary and secondary every clear
      this.gatherAltCounter++;
      if (this.gatherAltCounter % 2 === 0) {
        profession = this.strategy.secondaryGathering;
      }
    }

    const skillLevel = this.gatheringSkills[profession].level;
    const track = GATHERING_TO_REFINEMENT_TRACK[profession];
    const neededMats = REFINEMENT_RAW_MATS.get(track);

    // Filter zones that:
    // 1. Have this gathering type
    // 2. Skill level meets band requirement
    const validZones = ZONE_DEFS.filter(z =>
      z.gatheringTypes.includes(profession) &&
      canGatherInZone(skillLevel, z),
    );

    if (validZones.length === 0) {
      // Fallback: use band 1 zones of this type
      const fallback = ZONE_DEFS.find(z => z.gatheringTypes.includes(profession) && z.band === 1);
      return { zone: fallback ?? ZONE_DEFS[0], profession };
    }

    // Prefer zones that drop refinement-chain raw materials for this track.
    // Among those, pick highest band. If none drop track mats, fall back to highest band.
    const zonesWithTrackMats = neededMats
      ? validZones.filter(z => z.materialDrops.some(m => neededMats.has(m)))
      : validZones;

    const candidates = zonesWithTrackMats.length > 0 ? zonesWithTrackMats : validZones;

    const bestZone = candidates.reduce((best, z) =>
      z.band > best.band || (z.band === best.band && z.bandIndex > best.bandIndex) ? z : best,
    );

    return { zone: bestZone, profession };
  }

  // ─── Gathering ───────────────────────────────────────

  private gatherClear(zone: ZoneDef, profession: GatheringProfession): void {
    const skillLevel = this.gatheringSkills[profession].level;
    const prevLevel = skillLevel;

    // Clear time for sim tracking
    const clearTime = calcGatherClearTime(skillLevel, zone);
    this.totalSimTimeSec += clearTime;
    advanceClock(clearTime * 1000);

    // Material drops: uniform(MATERIAL_DROP_MIN, MATERIAL_DROP_MAX)
    const baseMats = MATERIAL_DROP_MIN + Math.floor(Math.random() * (MATERIAL_DROP_MAX - MATERIAL_DROP_MIN + 1));
    const yieldMult = calcGatheringYield(skillLevel);
    let matCount = Math.round(baseMats * yieldMult);

    // Double gather milestone check
    const doubleChance = this.getDoubleGatherChance(skillLevel);
    if (doubleChance > 0 && Math.random() < doubleChance) {
      matCount *= 2;
    }

    // Distribute materials across zone's material drops
    for (let i = 0; i < matCount; i++) {
      const mat = zone.materialDrops[Math.floor(Math.random() * zone.materialDrops.length)];
      this.materials[mat] = (this.materials[mat] ?? 0) + 1;
      this.totalGathered[mat] = (this.totalGathered[mat] ?? 0) + 1;
    }

    // Gathering XP: 5 * zone.band
    const gatherXp = 5 * zone.band;
    this.gatheringSkills = addGatheringXp(this.gatheringSkills, profession, gatherXp);

    // Track gathering milestones — only for primary profession (gates band access)
    const newLevel = this.gatheringSkills[profession].level;
    if (newLevel > prevLevel && profession === this.strategy.primaryGathering) {
      for (const ml of GATHERING_MILESTONE_LEVELS) {
        if (newLevel >= ml && prevLevel < ml && !(ml in this.gatheringMilestones)) {
          this.gatheringMilestones[ml] = this.totalClears;
        }
      }
    }

    // Rare material drops
    const rareFindBonus = calcRareFindBonus(skillLevel);
    const rareDrop = rollRareMaterialDrop(profession, zone.band, rareFindBonus);
    if (rareDrop) {
      this.materials[rareDrop.id] = (this.materials[rareDrop.id] ?? 0) + 1;
      this.totalGathered[rareDrop.id] = (this.totalGathered[rareDrop.id] ?? 0) + 1;
      this.rareDrops.push({
        id: rareDrop.id,
        rarity: rareDrop.rarity,
        clearNum: this.totalClears,
      });
    }
  }

  private getDoubleGatherChance(skillLevel: number): number {
    let chance = 0;
    for (const ms of GATHERING_MILESTONES) {
      if (skillLevel >= ms.level && ms.type === 'double_gather') {
        chance += ms.value;
      }
    }
    return chance;
  }

  // ─── Character Level ─────────────────────────────────

  private advanceCharLevel(): void {
    const targetLevel = Math.min(MAX_LEVEL, 1 + Math.floor(this.totalClears / CLEARS_PER_LEVEL));
    this.characterLevel = targetLevel;
  }

  // ─── Gold ────────────────────────────────────────────

  private earnGold(zone: ZoneDef): void {
    // Simplified gold: ~3 * band^1.4 per clear
    const goldPerClear = Math.round(3 * Math.pow(zone.band, 1.4));
    this.gold += goldPerClear;
  }

  // ─── Refinement ──────────────────────────────────────

  private refineAll(): void {
    // Get relevant refinement tracks based on our gathering professions
    const tracks = new Set<string>();
    tracks.add(GATHERING_TO_REFINEMENT_TRACK[this.strategy.primaryGathering]);
    if (this.strategy.secondaryGathering) {
      tracks.add(GATHERING_TO_REFINEMENT_TRACK[this.strategy.secondaryGathering]);
    }

    // Also check cloth track if materials exist (some zones drop cloth-related mats)
    // Add all tracks that we might have materials for
    for (const recipe of REFINEMENT_RECIPES) {
      if ((this.materials[recipe.rawMaterialId] ?? 0) >= recipe.rawAmount) {
        tracks.add(recipe.track);
      }
    }

    // Greedy: refine up the chain while materials allow
    let refined = true;
    while (refined) {
      refined = false;
      for (const track of tracks) {
        const chain = getRefinementChain(track as any);
        for (const recipe of chain) {
          while (canRefine(recipe, this.materials, this.gold)) {
            const result = refine(recipe, this.materials, this.gold);

            // Track what was consumed
            this.totalRefined[recipe.outputId] = (this.totalRefined[recipe.outputId] ?? 0) + 1;
            this.refinesPerTier[recipe.tier] = (this.refinesPerTier[recipe.tier] ?? 0) + 1;
            this.totalRefines++;

            if (this.gold !== result.newGold) {
              this.totalGoldSpent += (this.gold - result.newGold);
            }

            this.materials = result.newMaterials;
            this.gold = result.newGold;
            refined = true;
          }
        }
      }
    }
  }

  // ─── Crafting ────────────────────────────────────────

  private craftWhenReady(): void {
    const profession = this.strategy.craftingProfession!;
    const recipes = getRecipesForProfession(profession);

    // Sort by tier descending so we try highest tier first
    const sorted = [...recipes]
      .filter(r => !r.requiredCatalyst)  // skip unique recipes (need rare mats)
      .sort((a, b) => b.tier - a.tier);

    // Try to craft one item per clear (greedy: highest tier first)
    for (const recipe of sorted) {
      // Override: 0 gold cost for crafting in sim (isolate material flow)
      if (canCraftRecipeZeroGold(recipe, this.craftingSkills, this.materials)) {
        const prevLevel = this.craftingSkills[profession].level;

        // Deduct materials
        for (const { materialId, amount } of recipe.materials) {
          this.materials[materialId] = (this.materials[materialId] ?? 0) - amount;
          this.totalSpentOnCrafts[materialId] = (this.totalSpentOnCrafts[materialId] ?? 0) + amount;
        }

        // Generate item
        const item = executeCraft(recipe);

        // Track crafted item
        this.craftedItems.push({
          recipeTier: recipe.tier,
          rarity: item.rarity,
          affixCount: item.prefixes.length + item.suffixes.length,
          iLvl: item.iLvl,
          clearNum: this.totalClears,
        });

        // Grant crafting XP
        const xp = getCraftingXpForTier(recipe.tier);
        this.craftingSkills = addCraftingXp(this.craftingSkills, profession, xp);

        // Track crafting milestones
        const newLevel = this.craftingSkills[profession].level;
        if (newLevel > prevLevel) {
          for (const ml of CRAFTING_MILESTONE_LEVELS) {
            if (newLevel >= ml && prevLevel < ml && !(ml in this.craftingMilestones)) {
              this.craftingMilestones[ml] = this.totalClears;
            }
          }
        }

        this.totalCrafts++;
        this.craftsPerTier[recipe.tier] = (this.craftsPerTier[recipe.tier] ?? 0) + 1;

        break; // one craft per clear
      }
    }
  }

  // ─── Snapshot ────────────────────────────────────────

  private logSnapshot(): void {
    const profession = this.strategy.craftingProfession;
    const gatheringLevels: Record<GatheringProfession, number> = {
      mining: this.gatheringSkills.mining.level,
      herbalism: this.gatheringSkills.herbalism.level,
      skinning: this.gatheringSkills.skinning.level,
      logging: this.gatheringSkills.logging.level,
      fishing: this.gatheringSkills.fishing.level,
    };

    // Highest band this bot can access
    let highestBand = 1;
    for (let b = 6; b >= 1; b--) {
      if (this.gatheringSkills[this.strategy.primaryGathering].level >= (GATHERING_BAND_REQUIREMENTS[b] ?? 999)) {
        highestBand = b;
        break;
      }
    }

    this.snapshots.push({
      clearNum: this.totalClears,
      gatheringLevels,
      craftingLevel: profession ? this.craftingSkills[profession].level : 0,
      characterLevel: this.characterLevel,
      totalMaterials: { ...this.materials },
      totalRefines: this.totalRefines,
      totalCrafts: this.totalCrafts,
      highestBand,
      gold: this.gold,
    });
  }

  // ─── Summary ─────────────────────────────────────────

  private buildSummary(): CraftBotSummary {
    const profession = this.strategy.craftingProfession;
    const painPoints = this.detectPainPoints();

    return {
      strategyName: this.strategy.name,
      seed: this.config.seed,
      totalClears: this.totalClears,
      totalSimTimeSec: this.totalSimTimeSec,

      finalGatheringLevels: {
        mining: this.gatheringSkills.mining.level,
        herbalism: this.gatheringSkills.herbalism.level,
        skinning: this.gatheringSkills.skinning.level,
        logging: this.gatheringSkills.logging.level,
        fishing: this.gatheringSkills.fishing.level,
      },
      finalCraftingLevel: profession ? this.craftingSkills[profession].level : 0,
      finalCharacterLevel: this.characterLevel,

      gatheringMilestones: this.gatheringMilestones,
      craftingMilestones: this.craftingMilestones,

      totalGathered: { ...this.totalGathered },
      totalRefined: { ...this.totalRefined },
      totalSpentOnCrafts: { ...this.totalSpentOnCrafts },
      finalSurplus: { ...this.materials },

      refinesPerTier: { ...this.refinesPerTier },
      totalRefines: this.totalRefines,

      totalCrafts: this.totalCrafts,
      craftsPerTier: { ...this.craftsPerTier },
      craftedItems: this.craftedItems,

      rareDrops: this.rareDrops,

      finalGold: this.gold,
      totalGoldSpent: this.totalGoldSpent,

      painPoints,
      snapshots: this.snapshots,
    };
  }

  // ─── Pain Point Detection ────────────────────────────

  private detectPainPoints(): string[] {
    const points: string[] = [];
    const profession = this.strategy.craftingProfession;

    // 1. Gathering XP walls — look for huge gaps between band requirements
    const primaryLevel = this.gatheringSkills[this.strategy.primaryGathering].level;
    for (const [band, reqLevel] of Object.entries(GATHERING_BAND_REQUIREMENTS)) {
      const b = Number(band);
      if (primaryLevel < reqLevel && b <= 4) {
        points.push(`Gathering wall: stuck below band ${b} (need L${reqLevel}, have L${primaryLevel})`);
        break; // only report first wall
      }
    }

    // 2. Material starvation — crafting profession exists but 0 crafts
    if (profession && this.totalCrafts === 0 && this.totalClears > 500) {
      points.push(`Material starvation: ${this.totalClears} clears but 0 crafts for ${profession}`);
    }

    // 3. Surplus pileup — raw materials with no refined output
    for (const [matId, count] of Object.entries(this.materials)) {
      if (count > 200) {
        points.push(`Surplus pileup: ${matId} = ${count}`);
      }
    }

    // 4. Crafting skill stuck — have mats but level too low
    if (profession) {
      const craftLevel = this.craftingSkills[profession].level;
      if (craftLevel < 15 && this.totalClears > 1000) {
        points.push(`Crafting skill stuck at L${craftLevel} after ${this.totalClears} clears`);
      }
    }

    // 5. No rare drops after many clears
    if (this.rareDrops.length === 0 && this.totalClears > 500) {
      points.push(`No rare material drops after ${this.totalClears} clears`);
    }

    // 6. T5/T6 inaccessible — never reached band 5/6
    if (this.totalClears >= this.config.maxClears && primaryLevel < 75) {
      points.push(`Never reached band 5 (L${primaryLevel}/${75} gathering required)`);
    }

    return points;
  }
}

// ─── Helper: canCraftRecipe with 0 gold cost ───────────

function canCraftRecipeZeroGold(
  recipe: CraftingRecipeDef,
  skills: CraftingSkills,
  materials: Record<string, number>,
): boolean {
  // Check profession level
  if (skills[recipe.profession].level < recipe.requiredLevel) return false;

  // Check materials (but NOT gold — sim override)
  for (const { materialId, amount } of recipe.materials) {
    if ((materials[materialId] ?? 0) < amount) return false;
  }

  // Skip recipes requiring catalyst materials
  if (recipe.requiredCatalyst) return false;

  return true;
}
