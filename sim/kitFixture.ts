// ============================================================
// Shared kit fixture + policy runner for the economy harnesses
// (sim/gambit-ab.ts GATEs E0-E4c, sim/qa-variation.ts GATE E5).
// Extracted VERBATIM from gambit-ab (whose verdicts are the parity
// golden) — createFixtureState gained the optional talentRanks param.
// ============================================================

import { resetRng } from './rng';
import { setClock, advanceClock, getNow } from './clock';
import { runCombatTick } from '../src/engine/combat/tick';
import { createCharacter, resolveStats } from '../src/engine/character';
import { createResourceState } from '../src/engine/classResource';
import { ZONE_DEFS } from '../src/data/zones';
import type { GameState, ActiveDebuff, MobInPack, EquippedSkill, CharacterClass } from '../src/types';
import type { RotationPolicy } from '../src/types/rotation';

export function createMobPack(count: number, hp: number): MobInPack[] {
  const now = getNow();
  return Array.from({ length: count }, (_, i) => ({
    hp, maxHp: hp,
    debuffs: [] as ActiveDebuff[],
    nextAttackAt: now + 1000 + i * 500,
    rare: null, damageElement: 'physical' as any, physRatio: 1.0,
  }));
}


// Encounter mix (E15): equal total pack HP (1800) across shapes so
// kill counts stay comparable. Last shape = long-ST boss-like window.
export const ENCOUNTER_MIX: Array<[count: number, hp: number]> = [
  [3, 600], [1, 1800], [5, 360], [1, 3600],
];

export function createFixtureState(
  cls: CharacterClass,
  weaponType: string,
  skills: string[],
  rotationPolicy: RotationPolicy | null,
  talentRanks: Record<string, number> = {},
): GameState {
  const char = createCharacter('GambitBot', cls);
  char.level = 20;
  char.xpToNext = 99999;
  char.equipment = {
    mainhand: {
      id: `ab_${weaponType}`, baseId: `crude_${weaponType}`, name: `AB ${weaponType}`,
      slot: 'mainhand', rarity: 'rare' as any, iLvl: 20,
      prefixes: [], suffixes: [],
      weaponType,
      baseStats: { flatPhysDamage: 15, baseAttackSpeed: 10, baseCritChance: 5, accuracy: 80, evasion: 60 },
      baseDamageMin: 20, baseDamageMax: 40, baseSpellPower: 10,
    },
  } as any;
  char.stats = resolveStats(char);
  const now = getNow();
  const zone = ZONE_DEFS[2] ?? ZONE_DEFS[0];
  const skillBar: (EquippedSkill | null)[] = Array(8).fill(null);
  const skillTimers: any[] = [];
  const skillProgress: Record<string, any> = {};
  for (let i = 0; i < skills.length; i++) {
    skillBar[i] = { skillId: skills[i], autoCast: true };
    skillTimers.push({ skillId: skills[i], activatedAt: null, cooldownUntil: null });
    skillProgress[skills[i]] = { skillId: skills[i], xp: 0, level: 20, allocatedNodes: [], allocatedRanks: {} };
  }
  return {
    character: char, inventory: [], currencies: {} as any, materials: {}, gold: 0,
    bagSlots: [], bagStash: {}, bank: { tabs: [] },
    currentZoneId: zone.id, idleStartTime: 1, idleMode: 'combat',
    gatheringSkills: {} as any, gatheringEquipment: {}, selectedGatheringProfession: null,
    professionEquipment: {}, craftingSkills: {} as any, ownedPatterns: [],
    autoSalvageMinRarity: 'common', autoDisposalAction: 'salvage', craftAutoSalvageMinRarity: 'common',
    offlineProgress: null, abilityProgress: {}, clearStartedAt: 0, currentClearTime: 0,
    currentHp: char.stats.maxLife, currentEs: 0,
    combatPhase: 'clearing', bossState: null, zoneClearCounts: {}, combatPhaseStartedAt: now,
    classResource: createResourceState(cls), classSelected: true, totalKills: 0, fastestClears: {},
    skillBar, skillProgress, skillTimers, talentAllocations: [], talentRanks,
    activeDebuffs: [], consecutiveHits: 0, lastSkillsCast: [], lastOverkillDamage: 0,
    killStreak: 0, lastCritAt: 0, lastBlockAt: 0, lastDodgeAt: 0, dodgeEntropy: 50,
    tempBuffs: [], skillCharges: {}, channelState: null,
    critStacks: 0, critStacksExpiresAt: 0,
    resonanceCharges: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, resonanceExpiresAt: 0,
    frenziedActive: false,
    rotationPolicy,
    rampingStacks: 0, rampingLastHitAt: 0,
    fortifyStacks: 0, fortifyExpiresAt: 0, fortifyDRPerStack: 0,
    deathStreak: 0, lastDeathTime: 0,
    comboStates: [], activeTraps: [], bladeWardExpiresAt: 0, bladeWardHits: 0,
    elementTransforms: {}, lastHitMobTypeId: null, freeCastUntil: {}, lastProcTriggerAt: {},
    lastClearResult: null, lastSkillActivation: 0, nextActiveSkillAt: 0,
    // Autos were silently OFF for the first four gate runs (undefined
    // timer => 'now >= undefined' is false). ON since E4c: live play has
    // autos, and the Berserker bootstraps entirely through them.
    nextAutoAttackAt: 0,
    packMobs: createMobPack(3, 600), currentPackSize: 3, targetedMobId: null,
    currentMobTypeId: 'thicket_crawler', mobKillCounts: {}, bossKillCounts: {}, totalZoneClears: {},
    dailyQuests: { questDate: '', quests: [], progress: {} },
    craftLog: [], craftOutputBuffer: [], gemInventory: [], zoneMasteryClaimed: {},
    invasionState: { activeInvasions: {}, bandCooldowns: {} },
    tutorialStep: 99, hasSeenCraftingHint: true, lastSaveTime: now,
  } as GameState;
}

export interface Telemetry {
  spenderSkillId: string | null;   // stack-at-spend + wet-rate tracking
  chargeStateId: string | null;    // player-side combo state = "the ledger"
  windowStateId: string | null;    // e.g. 'opening' (Wave E1+); null pre-E1
  spendCost: number;               // mana cost used for the below-cost counter
}

export interface ArmStats {
  totalDamage: number; kills: number; deaths: number;
  casts: Map<string, number>;
  critTicks: number; hitTicks: number;
  manaMin: number; manaBelowCostTicks: number; ticks: number;
  spendStacks: number[]; wetSpends: number; totalSpends: number;
  windowsCreated: number;
}

export function runPolicy(
  cls: CharacterClass,
  weaponType: string,
  bar: string[],
  rotationPolicy: RotationPolicy | null,
  ticks: number,
  seed: number,
  tel: Telemetry,
  talentRanks: Record<string, number> = {},
): ArmStats {
  resetRng(seed);
  setClock(1_000_000);
  let s = createFixtureState(cls, weaponType, bar, rotationPolicy, talentRanks);
  const st: ArmStats = {
    totalDamage: 0, kills: 0, deaths: 0, casts: new Map(),
    critTicks: 0, hitTicks: 0,
    manaMin: Infinity, manaBelowCostTicks: 0, ticks,
    spendStacks: [], wetSpends: 0, totalSpends: 0,
    windowsCreated: 0,
  };
  let prevWindow = false;
  const dtSec = 0.5;
  let encounterIdx = 0;
  for (let i = 0; i < ticks; i++) {
    // Pre-tick snapshot for at-spend telemetry (consumption happens
    // inside the cast, so pre-tick stacks == stacks at spend).
    const preStacks = tel.chargeStateId
      ? s.comboStates.filter(c => c.stateId === tel.chargeStateId).reduce((a, c) => a + c.stacks, 0)
      : 0;
    const preWindow = tel.windowStateId
      ? s.comboStates.some(c => c.stateId === tel.windowStateId && c.stacks > 0)
      : false;

    const out = runCombatTick(s, dtSec, getNow());
    s = { ...s, ...out.patch };
    st.totalDamage += (out.result.damageDealt ?? 0) + (out.result.dotDamage ?? 0);
    st.kills += out.result.mobKills ?? 0;
    if (out.result.isHit) {
      st.hitTicks++;
      if (out.result.isCrit) st.critTicks++;
    }
    if (out.result.skillFired && out.result.skillId) {
      st.casts.set(out.result.skillId, (st.casts.get(out.result.skillId) ?? 0) + 1);
      if (tel.spenderSkillId && out.result.skillId === tel.spenderSkillId) {
        st.totalSpends++;
        st.spendStacks.push(preStacks);
        if (preWindow) st.wetSpends++;
      }
    }
    // Window-creation telemetry: rising edge of the window state.
    if (tel.windowStateId) {
      const nowWindow = s.comboStates.some(c => c.stateId === tel.windowStateId && c.stacks > 0);
      if (nowWindow && !prevWindow) st.windowsCreated++;
      prevWindow = nowWindow;
    }
    const mana = (s.character as any).mana;
    if (mana) {
      if (mana.current < st.manaMin) st.manaMin = mana.current;
      if (mana.current < tel.spendCost) st.manaBelowCostTicks++;
    }

    // E15 death reset: a death costs the ramp (debuffs/buffs wiped by
    // the death patch) but no longer zeroes the rest of the run.
    if (out.result.zoneDeath || s.combatPhase === 'zone_defeat') {
      st.deaths++;
      s = {
        ...s,
        combatPhase: 'clearing',
        combatPhaseStartedAt: getNow(),
        currentHp: s.character.stats.maxLife,
        currentEs: 0,
      };
    }
    if (s.packMobs.length === 0 || s.packMobs.every(m => m.hp <= 0)) {
      encounterIdx = (encounterIdx + 1) % ENCOUNTER_MIX.length;
      const [count, hp] = ENCOUNTER_MIX[encounterIdx];
      s = { ...s, packMobs: createMobPack(count, hp), currentPackSize: count };
    }
    advanceClock(dtSec * 1000);
  }
  return st;
}

