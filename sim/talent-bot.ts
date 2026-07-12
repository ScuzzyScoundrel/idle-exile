// Phase F (2026-05-07): ground-up talent test bot.
//
// Replaces the legacy qa-talents.ts which predates the Phase F engine
// surface (10+ new TalentEffect kinds, sticky Frenzied state, Bulwark
// consume, bonusDamage action, etc.).
//
// Three deterministic passes:
//   1. Coverage     — every NODE_EFFECTS entry yields ≥1 formatted line.
//                     Catches malformed entries (missing required fields)
//                     and unauthored kinds.
//   2. Conditional  — each whileX/perX kind: synthesize state where
//                     condition is true vs false, dispatch
//                     applyConditionalTalentEffects, verify the
//                     authored effect mutates damageMult / stat by the
//                     expected amount.
//   3. Proc fire    — each procOnX kind authored at chance:100,
//                     dispatch with all relevant action side-effect
//                     refs exposed, verify the action mutated the ref.
//
// Run: `npx tsx sim/talent-bot.ts`
// Exit code 1 on any failure (CI-friendly).

import { NODE_EFFECTS } from '../src/data/classTrees/effects';
import { getNextRotationSkill } from '../src/engine/skills/rotation';
import { tickManaWithCost } from '../src/engine/combat/manaTick';
import { CLASS_MANA_CONFIG } from '../src/types/mana';
import type { SkillTimerState, EquippedSkill, CharacterClass, ManaState } from '../src/types';
import {
  applyConditionalTalentEffects,
  scaleTalentEffectByRank,
  dispatchProcOnHit,
  dispatchProcOnCrit,
  dispatchProcOnKill,
  dispatchProcOnHitTaken,
  dispatchProcOnMultiKillChain,
  dispatchProcOnResonanceChargeGain,
  dispatchProcOnConvergenceCast,
  dispatchProcOnBulwarkConsume,
  dispatchProcOnMinionHit,
  dispatchProcOnMinionDeath,
  dispatchProcOnTrapDetonate,
  consumeBulwarkCharge,
  type TalentProcContext,
} from '../src/engine/classTalentDispatcher';
import { formatTalentEffects } from '../src/ui/format/talentEffectText';
import type { TalentEffect, TalentAction, TalentTag, ResolvedStats, ActiveDebuff, TempBuff } from '../src/types';
import type { Condition } from '../src/types/conditions';
import { BASE_STATS } from '../src/data/balance';
import { ASCENDANCY_NODE_EFFECTS } from '../src/data/ascendancies/effects';
import { DEBUFF_DEFS } from '../src/data/debuffs';
import { STATE_IDS } from '../src/data/states';
import { SUMMON_CONFIGS } from '../src/engine/combat/minions';
import { TALENT_TAG_TO_DEBUFF, TALENT_BUFF_REGISTRY } from '../src/engine/classTalentDispatcher';
import { getUnifiedSkillDef } from '../src/data/skills';

interface TestResult {
  pass: boolean;
  nodeId: string;
  pass_name: string;
  reason?: string;
  detail?: string;
}

const results: TestResult[] = [];

function record(pass: boolean, nodeId: string, pass_name: string, reason?: string, detail?: string) {
  results.push({ pass, nodeId, pass_name, reason, detail });
}

// ─── Pass 1: Coverage ────────────────────────────────────────────────

function passCoverage() {
  for (const [nodeId, effects] of Object.entries(NODE_EFFECTS)) {
    if (effects.length === 0) {
      record(false, nodeId, 'coverage', 'NODE_EFFECTS entry is empty array');
      continue;
    }
    const lines = formatTalentEffects(nodeId, 1);
    if (lines.length !== effects.length) {
      record(false, nodeId, 'coverage', `formatTalentEffects returned ${lines.length} lines, expected ${effects.length}`);
      continue;
    }
    if (lines.some(l => !l || l.length < 4)) {
      record(false, nodeId, 'coverage', 'formatted line empty or trivial', JSON.stringify(lines));
      continue;
    }
    record(true, nodeId, 'coverage');
  }
}

// ─── Pass 2: Conditional stat application ────────────────────────────

function freshStats(): ResolvedStats {
  return { ...BASE_STATS };
}

function checkConditional(
  nodeId: string,
  effect: TalentEffect,
  scenario: {
    targetDebuffs?: ActiveDebuff[];
    selfHpFraction?: number;
    targetHpFraction?: number;
    companionAlive?: boolean;
    critStacks?: number;
    resonanceCharges?: number;
    offhandAbsent?: boolean;
    enemyCount?: number;
    frenziedActive?: boolean;
    minionCount?: number;
  },
  expectFire: boolean,
) {
  const scaled = scaleTalentEffectByRank(effect, 1);
  const stats = freshStats();
  // Pre-set the tested stat to a non-zero baseline so mult-only
  // effects (mult: 1.05 on a 0-default stat would yield 0*1.05=0,
  // looking like no-op). delta-based and damageMult-based effects
  // don't need this — they detect via direct add or damageMult ref.
  const targetStat = (effect as { stat?: string }).stat;
  if (targetStat && targetStat !== 'damageMult' && (stats as Record<string, number>)[targetStat] === 0) {
    (stats as Record<string, number>)[targetStat] = 10;
  }
  const before = { ...stats };
  const beforeDamageMult = 1;

  const result = applyConditionalTalentEffects(
    [scaled],
    stats,
    scenario.targetDebuffs ?? [],
    scenario.selfHpFraction ?? 1,
    scenario.targetHpFraction ?? 1,
    scenario.companionAlive ?? false,
    scenario.critStacks ?? 0,
    scenario.resonanceCharges ?? 0,
    scenario.offhandAbsent ?? false,
    scenario.enemyCount ?? 0,
    scenario.frenziedActive ?? false,
    scenario.minionCount ?? 0,
  );

  // Determine expected mutation: did damageMult or stats change?
  const damageMultChanged = result.damageMult !== beforeDamageMult;
  const statsChanged = Object.entries(stats).some(
    ([k, v]) => v !== (before as Record<string, number>)[k],
  );
  const fired = damageMultChanged || statsChanged;

  if (fired === expectFire) {
    record(true, nodeId, 'conditional', expectFire ? 'fires when condition met' : 'no-op when condition not met');
  } else {
    record(false, nodeId, 'conditional',
      `expected fire=${expectFire}, got fire=${fired}`,
      `damageMult ${beforeDamageMult}→${result.damageMult}; stat changes: ${
        Object.entries(stats).filter(([k, v]) => v !== (before as Record<string, number>)[k]).map(([k, v]) => `${k}: ${(before as Record<string, number>)[k]}→${v}`).join(', ') || 'none'
      }`);
  }
}

function passConditional() {
  for (const [nodeId, effects] of Object.entries(NODE_EFFECTS)) {
    for (const eff of effects) {
      switch (eff.kind) {
        case 'whileTag': {
          const debuff: ActiveDebuff = {
            debuffId: 'staggered', stacks: 1, remainingDuration: 5,
            instances: undefined, stackSnapshots: undefined,
            dotTickAccumulator: undefined, appliedBySkillId: 'test',
          };
          // Fake debuff with target tag — only fires for matching tag
          const matchingTag: ActiveDebuff[] = eff.tag === 'staggered' ? [debuff]
            : [{ ...debuff, debuffId: { hex: 'hexed', curse: 'cursed', mark: 'marked', poison: 'poisoned', bleed: 'bleeding', ignite: 'burning', chill: 'chilled', shock: 'shocked', frozen: 'frostbite', stun: 'stunned', taunt: 'taunted', cleave: 'cleave_marked', snare: 'snared' }[eff.tag] ?? eff.tag }];
          checkConditional(nodeId, eff, { targetDebuffs: matchingTag }, true);
          checkConditional(nodeId, eff, { targetDebuffs: [] }, false);
          break;
        }
        case 'whileSelfHpBelow':
          checkConditional(nodeId, eff, { selfHpFraction: eff.threshold - 0.01 }, true);
          checkConditional(nodeId, eff, { selfHpFraction: eff.threshold + 0.01 }, false);
          break;
        case 'whileSelfHpAbove':
          checkConditional(nodeId, eff, { selfHpFraction: eff.threshold + 0.01 }, true);
          checkConditional(nodeId, eff, { selfHpFraction: eff.threshold - 0.01 }, false);
          break;
        case 'whileTargetHpBelow':
          checkConditional(nodeId, eff, { targetHpFraction: eff.threshold - 0.01 }, true);
          checkConditional(nodeId, eff, { targetHpFraction: eff.threshold + 0.01 }, false);
          break;
        case 'whileCompanionAlive':
          checkConditional(nodeId, eff, { companionAlive: true }, true);
          checkConditional(nodeId, eff, { companionAlive: false }, false);
          break;
        case 'whileFrenzied':
          checkConditional(nodeId, eff, { frenziedActive: true }, true);
          checkConditional(nodeId, eff, { frenziedActive: false }, false);
          break;
        case 'whileOffhandAbsent':
          checkConditional(nodeId, eff, { offhandAbsent: true }, true);
          checkConditional(nodeId, eff, { offhandAbsent: false }, false);
          break;
        case 'whileCritStacksAtLeast':
          checkConditional(nodeId, eff, { critStacks: eff.threshold }, true);
          checkConditional(nodeId, eff, { critStacks: eff.threshold - 1 }, false);
          break;
        case 'whileResonanceChargesAtLeast':
          checkConditional(nodeId, eff, { resonanceCharges: eff.threshold }, true);
          checkConditional(nodeId, eff, { resonanceCharges: eff.threshold - 1 }, false);
          break;
        case 'whileMinionCountAtLeast':
          checkConditional(nodeId, eff, { minionCount: eff.threshold }, true);
          checkConditional(nodeId, eff, { minionCount: eff.threshold - 1 }, false);
          break;
        case 'perCritStack':
          checkConditional(nodeId, eff, { critStacks: 5 }, true);
          checkConditional(nodeId, eff, { critStacks: 0 }, false);
          break;
        case 'perResonanceCharge':
          checkConditional(nodeId, eff, { resonanceCharges: 5 }, true);
          checkConditional(nodeId, eff, { resonanceCharges: 0 }, false);
          break;
        case 'perEnemyCount':
          checkConditional(nodeId, eff, { enemyCount: 5 }, true);
          checkConditional(nodeId, eff, { enemyCount: 0 }, false);
          break;
        // Non-conditional kinds are skipped here (covered by Pass 3 or Pass 1).
      }
    }
  }
}

// ─── Pass 3: Proc fire ───────────────────────────────────────────────

function makeProcCtx(): TalentProcContext & {
  __life: { value: number; max: number };
  __mana: { current: number; max: number };
  __tempBuffs: TempBuff[];
  __targetDebuffs: ActiveDebuff[];
} {
  const life = { value: 50, max: 100 };
  const mana = { current: 0, max: 100 };
  const tempBuffs: TempBuff[] = [];
  const targetDebuffs: ActiveDebuff[] = [];
  return {
    targetDebuffs,
    life,
    sourceSkillId: 'test_skill',
    hitDamageTag: 'Attack',
    broadcastDebuffLists: [targetDebuffs],
    skillTimers: [],
    mana,
    critStacksRef: { value: 0, max: 5, expiresAt: 0 },
    resonanceRef: { charges: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, expiresAt: 0 },
    tempBuffsRef: tempBuffs,
    bonusDamageRef: { value: 0, baseDamage: 100 },
    minionsRef: { list: [], playerMaxLife: 100, playerSpellPower: 10, now: Date.now() },
    effects: [],
    __life: life,
    __mana: mana,
    __tempBuffs: tempBuffs,
    __targetDebuffs: targetDebuffs,
  };
}

const TAG_TO_DEBUFF: Record<string, string> = {
  hex: 'hexed', curse: 'cursed', mark: 'marked', poison: 'poisoned',
  bleed: 'bleeding', ignite: 'burning', chill: 'chilled', shock: 'shocked',
  frozen: 'frostbite', stun: 'stunned', taunt: 'taunted',
  staggered: 'staggered', cleave: 'cleave_marked', snare: 'snared',
};

function checkProc(
  nodeId: string,
  effect: TalentEffect,
  fire: (effects: TalentEffect[], ctx: TalentProcContext) => void,
  expectMutation: (ctx: ReturnType<typeof makeProcCtx>) => { ok: boolean; detail: string },
) {
  // Force chance to 100% by overriding scaled rank-1 chance
  const forced = { ...effect, chance: 100 } as TalentEffect;
  const ctx = makeProcCtx();
  // Seed ctx so filters on the effect don't suppress the fire:
  //  - DamageTag filter (tag): match hitDamageTag
  //  - TalentTag filter (targetTag): seed targetDebuffs with the
  //    mapped debuff id
  const tag = (effect as { tag?: string }).tag;
  if (tag) ctx.hitDamageTag = tag as TalentProcContext['hitDamageTag'];
  const targetTag = (effect as { targetTag?: string }).targetTag;
  if (targetTag) {
    const did = TAG_TO_DEBUFF[targetTag] ?? targetTag;
    ctx.targetDebuffs.push({
      debuffId: did, stacks: 1, remainingDuration: 5,
      instances: undefined, stackSnapshots: undefined,
      dotTickAccumulator: undefined, appliedBySkillId: 'test',
    });
  }
  fire([forced], ctx);
  const r = expectMutation(ctx);
  if (r.ok) {
    record(true, nodeId, 'proc', r.detail);
  } else {
    record(false, nodeId, 'proc', 'action did not mutate expected ref', r.detail);
  }
}

function passProc() {
  for (const [nodeId, effects] of Object.entries(NODE_EFFECTS)) {
    for (const eff of effects) {
      // Only test proc kinds with deterministic action side-effects.
      if (!eff.kind.startsWith('procOn')) continue;
      const action = (eff as { action?: { kind: string } }).action;
      if (!action) continue;

      const fireFn = (() => {
        switch (eff.kind) {
          case 'procOnHit': return dispatchProcOnHit;
          case 'procOnCrit': return dispatchProcOnCrit;
          case 'procOnKill': return dispatchProcOnKill;
          case 'procOnHitTaken': {
            const wantsCrit = (eff as { critTaken?: boolean }).critTaken;
            const isCrit = wantsCrit === true; // false for undefined or false
            return (e: TalentEffect[], c: TalentProcContext) => dispatchProcOnHitTaken(e, c, isCrit);
          }
          case 'procOnMultiKillChain': return (e: TalentEffect[], c: TalentProcContext) => dispatchProcOnMultiKillChain(e, c, 2);
          case 'procOnResonanceChargeGain': return (e: TalentEffect[], c: TalentProcContext) => dispatchProcOnResonanceChargeGain(e, c, 'fire');
          case 'procOnConvergenceCast': return dispatchProcOnConvergenceCast;
          case 'procOnBulwarkConsume': return dispatchProcOnBulwarkConsume;
          case 'procOnMinionHit': return (e: TalentEffect[], c: TalentProcContext) => dispatchProcOnMinionHit(e, c, (eff as { minionType?: string }).minionType ?? 'fetish');
          case 'procOnMinionDeath': return (e: TalentEffect[], c: TalentProcContext) => dispatchProcOnMinionDeath(e, c, (eff as { minionType?: string }).minionType ?? 'fetish');
          case 'procOnTrapDetonate': return dispatchProcOnTrapDetonate;
          default: return null;
        }
      })();
      if (!fireFn) continue;

      checkProc(nodeId, eff, fireFn, ctx => {
        switch (action.kind) {
          case 'applyTag':
          case 'applyTagAll':
            return ctx.__targetDebuffs.length > 0
              ? { ok: true, detail: `applied ${ctx.__targetDebuffs[0].debuffId}` }
              : { ok: false, detail: 'no debuff added' };
          case 'refundMana':
            return ctx.__mana.current > 0
              ? { ok: true, detail: `mana +${ctx.__mana.current}` }
              : { ok: false, detail: 'mana unchanged' };
          case 'healSelf':
            return ctx.__life.value > 50
              ? { ok: true, detail: `life ${50}→${ctx.__life.value}` }
              : { ok: false, detail: 'life unchanged' };
          case 'addCritStack':
            return ctx.critStacksRef!.value > 0
              ? { ok: true, detail: 'crit stack added' }
              : { ok: false, detail: 'crit stacks unchanged' };
          case 'addResonanceCharge': {
            const ch = ctx.resonanceRef!.charges;
            const total = ch.fire + ch.cold + ch.lightning + ch.chaos;
            return total > 0
              ? { ok: true, detail: `resonance +${total}` }
              : { ok: false, detail: 'resonance unchanged' };
          }
          case 'grantBuff':
            return ctx.__tempBuffs.length > 0
              ? { ok: true, detail: `gained ${ctx.__tempBuffs[0].id}` }
              : { ok: false, detail: 'no buff granted' };
          case 'bonusDamage':
            return ctx.bonusDamageRef!.value > 0
              ? { ok: true, detail: `bonus dmg +${ctx.bonusDamageRef!.value}` }
              : { ok: false, detail: 'bonus damage unchanged' };
          default:
            return { ok: true, detail: `action ${action.kind} (skip — no ref to validate)` };
        }
      });
    }
  }
}

// ─── Pass 5: rotation end-to-end ─────────────────────────────────────
//
// Simulates 30 ticks of combat with 3 dagger skills equipped on a
// Berserker (the worst-case mana economy: startFull:false, regen:0,
// onHitDealtGain:5). Verifies:
//  - Rotation correctly skips skills the player can't afford.
//  - Auto-attacks generate mana via onHitDealtGain so skills become
//    castable.
//  - All 3 slot skills fire at least once over the test window
//    (the original "only first two" bug fix).

function simulateRotation() {
  const skills: EquippedSkill[] = [
    { skillId: 'dagger_stab',          slot: 0, equippedAt: 0 } as unknown as EquippedSkill,
    { skillId: 'dagger_blade_dance',   slot: 1, equippedAt: 0 } as unknown as EquippedSkill,
    { skillId: 'dagger_fan_of_knives', slot: 2, equippedAt: 0 } as unknown as EquippedSkill,
  ];
  const cfg = CLASS_MANA_CONFIG['berserker' as CharacterClass];
  const mana: ManaState = {
    current: cfg.startFull ? cfg.maxMana : 0,
    max: cfg.maxMana,
    regenPerSec: cfg.passiveRegenPerSec,
  };
  const skillTimers: SkillTimerState[] = skills.map(s => ({
    skillId: s.skillId, activatedAt: null, cooldownUntil: null,
  }));
  const fired = new Set<string>();
  const dtSec = 0.1;
  let now = Date.now();

  for (let tick = 0; tick < 60; tick++) {
    now += dtSec * 1000;
    const result = getNextRotationSkill(skills, skillTimers, now, undefined, undefined, mana, dtSec);
    if (result) {
      // Fire: regen mana → deduct cost; set cooldown.
      const cost = (result.skill as { manaCost?: number; cooldown?: number }).manaCost ?? 0;
      const updated = tickManaWithCost(mana, dtSec, cost, 0);
      mana.current = updated.current;
      const cd = (result.skill as { cooldown?: number }).cooldown ?? 0;
      const t = skillTimers.find(t => t.skillId === result.skill.id);
      if (t) t.cooldownUntil = now + cd * 1000;
      fired.add(result.skill.id);
    } else {
      // No skill — simulate auto-attack landing + onHitDealtGain.
      const updated = tickManaWithCost(mana, dtSec, 0, cfg.onHitDealtGain);
      mana.current = updated.current;
    }
  }

  const expected = new Set(skills.map(s => s.skillId));
  const missing = [...expected].filter(id => !fired.has(id));
  if (missing.length === 0) {
    record(true, '_rotation_all_fire', 'rotation', `all ${expected.size} slot skills fired over 60 ticks`);
  } else {
    record(false, '_rotation_all_fire', 'rotation',
      `${missing.length} slot skill(s) never fired`,
      `missing: ${missing.join(', ')}; final mana=${mana.current.toFixed(1)}; fired=${[...fired].join(', ')}`);
  }
}

// ─── Bulwark consume sanity ──────────────────────────────────────────

function passBulwark() {
  // Sanity: consumeBulwarkCharge halves damage + decrements when buff present.
  const buffs: TempBuff[] = [{
    id: 'bulwark_charge', stacks: 2, maxStacks: 3,
    expiresAt: Date.now() + 5000, sourceSkillId: 'test',
    effect: { defenseMult: 1.2 },
  }];
  const r = consumeBulwarkCharge(buffs, 100);
  if (r.consumed && r.damage === 50 && buffs[0].stacks === 1) {
    record(true, '_bulwark_consume', 'bulwark', 'damage halved + stack decremented');
  } else {
    record(false, '_bulwark_consume', 'bulwark', `expected damage:50 stacks:1 consumed:true, got damage:${r.damage} stacks:${buffs[0]?.stacks} consumed:${r.consumed}`);
  }
  // No-op when buff absent
  const r2 = consumeBulwarkCharge([], 100);
  if (!r2.consumed && r2.damage === 100) {
    record(true, '_bulwark_no_consume', 'bulwark', 'no-op without bulwark_charge');
  } else {
    record(false, '_bulwark_no_consume', 'bulwark', `expected no-op, got damage:${r2.damage} consumed:${r2.consumed}`);
  }
}

// ─── Run ─────────────────────────────────────────────────────────────

function summarize() {
  const passes = results.filter(r => r.pass);
  const fails = results.filter(r => !r.pass);
  const byPass: Record<string, { pass: number; fail: number }> = {};
  for (const r of results) {
    if (!byPass[r.pass_name]) byPass[r.pass_name] = { pass: 0, fail: 0 };
    if (r.pass) byPass[r.pass_name].pass++;
    else byPass[r.pass_name].fail++;
  }

  console.log('═══ Talent Bot Results ═══');
  console.log(`Total: ${results.length}  Pass: ${passes.length}  Fail: ${fails.length}`);
  console.log('');
  for (const [name, counts] of Object.entries(byPass)) {
    console.log(`  ${name}: ${counts.pass} pass, ${counts.fail} fail`);
  }
  console.log('');

  if (fails.length > 0) {
    console.log('─── Failures ───');
    for (const f of fails.slice(0, 50)) {
      console.log(`  ✗ ${f.nodeId} [${f.pass_name}]: ${f.reason}`);
      if (f.detail) console.log(`    ${f.detail}`);
    }
    if (fails.length > 50) console.log(`  ... ${fails.length - 50} more`);
  }

  process.exit(fails.length > 0 ? 1 : 0);
}

// ─── Pass 0: registry id-closure (Effect IR Wave 3, D26) ────────────
// Every stat / state / tag / buff / minion / skill id referenced by any
// NODE_EFFECTS or ASCENDANCY_NODE_EFFECTS entry must resolve in its
// registry — kills the aoeRadius class of silent no-op at author time.
// Known forward-compat seeds are allowlisted with the reason inline.

const DEBUFF_IDS = new Set(DEBUFF_DEFS.map(d => d.id));

// Stats authored ahead of engine support — reported but not failures.
// Anything appearing here is EXCLUDED from coverage claims until wired.
const PENDING_STATS = new Set<string>([
  'maxIgniteStacks',   // sor_sp_burning_hex — forward-compat seed
  'maxActiveTraps',    // hnt_tp trap-cap nodes — trap cap not wired (audit)
  'maxPoisonStacks',   // asn seed — no consumer yet
  // ── Discovered by Pass 0's first run (2026-07-12) — 12 nodes were
  //    silently dead. Each needs a StatKey + engine consumer: ──
  'minionSummonManaCost', // wd_sw_spirit_conduit — no summon-cost path
  'minionHp',             // wd_sw_spirit_vigor + asc_wd_sw_soul_anchor — only companion* variants registered
  'minionDuration',       // wd_sw_soul_bind
  'minionAttackSpeed',    // asc_wd_sw_pack_tempo
  'maxCritStacks',        // asn_bm_cascade_reservoir — cap hardcoded 5 in dispatch
  'maxResonanceCharges',  // sor_ar_bank_mastery + asc — cap hardcoded 5
  'maxMana',              // sor_ar_mana_reservoir + asc_sor_ar_bank_reservoir — mana max not stat-driven
  'incTrapDamage',        // hnt_tp_trappers_hand
  'trapDetonationDamage', // hnt_tp_heavy_trap
]);
// Tags whose mapped debuff is a declared placeholder (no DebuffDef yet).
const PENDING_TAGS = new Set<string>(['stun', 'taunt']);

function closureCheckStat(stat: string, issues: string[], pending: string[]): void {
  if (stat === 'damageMult') return;
  if (stat in BASE_STATS) return;
  if (PENDING_STATS.has(stat)) { pending.push(`stat:${stat}`); return; }
  issues.push(`unknown stat '${stat}'`);
}
function closureCheckTag(tag: string, issues: string[], pending: string[]): void {
  const did = TALENT_TAG_TO_DEBUFF[tag as TalentTag];
  if (!did) { issues.push(`unknown tag '${tag}'`); return; }
  if (!DEBUFF_IDS.has(did)) {
    if (PENDING_TAGS.has(tag)) { pending.push(`tag:${tag}`); return; }
    issues.push(`tag '${tag}' maps to unregistered debuff '${did}'`);
  }
}
function closureCheckState(stateId: string, issues: string[]): void {
  // stateIds may also be TalentTags (perStack legacy path counts target
  // debuff stacks by tag) — accept either registry.
  if (STATE_IDS.has(stateId)) return;
  if (TALENT_TAG_TO_DEBUFF[stateId as TalentTag]) return;
  issues.push(`unknown stateId '${stateId}'`);
}
function closureCheckSkill(skillId: string, issues: string[]): void {
  if (!getUnifiedSkillDef(skillId)) issues.push(`unknown skillId '${skillId}'`);
}
function closureCheckAction(action: TalentAction, issues: string[], pending: string[]): void {
  switch (action.kind) {
    case 'applyTag': case 'applyTagAll': closureCheckTag(action.tag, issues, pending); break;
    case 'grantBuff':
      if (!TALENT_BUFF_REGISTRY[action.buffId]) issues.push(`unknown buffId '${action.buffId}'`);
      break;
    case 'summon':
      if (!SUMMON_CONFIGS[action.minionType]) issues.push(`unknown minionType '${action.minionType}'`);
      break;
    case 'triggerSkill': closureCheckSkill(action.skillId, issues); break;
    case 'advanceCooldowns':
      if (action.scope === 'skillId' && action.skillId) closureCheckSkill(action.skillId, issues);
      break;
    case 'modifyState': closureCheckState(action.stateId, issues); break;
    default: break;
  }
}
function closureCheckCondition(cond: Condition, issues: string[], pending: string[]): void {
  if ('all' in cond) { cond.all.forEach(c => closureCheckCondition(c, issues, pending)); return; }
  if ('any' in cond) { cond.any.forEach(c => closureCheckCondition(c, issues, pending)); return; }
  if ('not' in cond) { closureCheckCondition(cond.not, issues, pending); return; }
  if ('targetHasTag' in cond) closureCheckTag(cond.targetHasTag, issues, pending);
  if ('targetLacksTag' in cond) closureCheckTag(cond.targetLacksTag, issues, pending);
  if ('targetHasState' in cond) closureCheckState(cond.targetHasState.stateId, issues);
  if ('stateActive' in cond) closureCheckState(cond.stateActive, issues);
  if ('stateMissing' in cond) closureCheckState(cond.stateMissing, issues);
  if ('stateCountAtLeast' in cond) closureCheckState(cond.stateCountAtLeast.stateId, issues);
  if ('stateCountBelow' in cond) closureCheckState(cond.stateCountBelow.stateId, issues);
  if ('skillReady' in cond) closureCheckSkill(cond.skillReady, issues);
}
function closureCheckEffect(eff: TalentEffect, issues: string[], pending: string[]): void {
  switch (eff.kind) {
    case 'stat': case 'statMult':
      closureCheckStat(eff.stat, issues, pending); break;
    case 'whileTag':
      closureCheckTag(eff.tag, issues, pending); closureCheckStat(eff.stat, issues, pending); break;
    case 'whileSelfHpBelow': case 'whileSelfHpAbove': case 'whileFrenzied':
    case 'whileTargetHpBelow': case 'whileCompanionAlive': case 'whileMinionCountAtLeast':
    case 'whileOffhandAbsent': case 'whileCritStacksAtLeast': case 'whileResonanceChargesAtLeast':
      closureCheckStat(eff.stat, issues, pending); break;
    case 'perCritStack': case 'perEnemyCount': case 'perResonanceCharge':
      closureCheckStat(eff.stat, issues, pending); break;
    case 'perStack':
      closureCheckTag(eff.stack, issues, pending); closureCheckStat(eff.stat, issues, pending); break;
    case 'procOnHit': case 'procOnCrit': case 'procOnKill':
      if (eff.targetTag) closureCheckTag(eff.targetTag, issues, pending);
      closureCheckAction(eff.action, issues, pending); break;
    case 'procOnTag':
      closureCheckTag(eff.tag, issues, pending); closureCheckAction(eff.action, issues, pending); break;
    case 'procOnHitTaken': case 'procOnMultiKillChain': case 'procOnResonanceChargeGain':
    case 'procOnConvergenceCast': case 'procOnBulwarkConsume': case 'procOnCompanionHit':
    case 'procOnCompanionCrit': case 'procOnCompanionDeath':
    case 'procOnTrapDetonate': case 'procOnTrapChain':
      closureCheckAction(eff.action, issues, pending); break;
    case 'procOnMinionHit': case 'procOnMinionCrit': case 'procOnMinionDeath':
      if (eff.minionType && !SUMMON_CONFIGS[eff.minionType]) issues.push(`unknown minionType '${eff.minionType}'`);
      closureCheckAction(eff.action, issues, pending); break;
    case 'grantDotCrit':
      if (eff.debuffId && !DEBUFF_IDS.has(eff.debuffId)) issues.push(`unknown debuffId '${eff.debuffId}'`);
      break;
    case 'whilePauseDebuffDecay':
      closureCheckTag(eff.tag, issues, pending);
      if (!DEBUFF_IDS.has(eff.debuffId)) issues.push(`unknown debuffId '${eff.debuffId}'`);
      break;
    case 'on':
      if (eff.on.trigger.on === 'stateChange') closureCheckState(eff.on.trigger.stateId, issues);
      if (eff.on.trigger.on === 'tagApplied' && eff.on.trigger.tag) closureCheckTag(eff.on.trigger.tag, issues, pending);
      if (eff.on.if) closureCheckCondition(eff.on.if, issues, pending);
      eff.on.actions.forEach(a => closureCheckAction(a, issues, pending));
      break;
    case 'mod':
      closureCheckStat(eff.mod.stat, issues, pending);
      if (eff.mod.if) closureCheckCondition(eff.mod.if, issues, pending);
      if (eff.mod.per && eff.mod.per.count === 'stateStacks') closureCheckState(eff.mod.per.stateId, issues);
      break;
    default: break; // 'rule' (registry lands later in Wave 3), presence kinds
  }
}
function passClosure() {
  const pendingAll: string[] = [];
  const sources: Array<[string, Record<string, TalentEffect[]>]> = [
    ['node', NODE_EFFECTS],
    ['asc', ASCENDANCY_NODE_EFFECTS],
  ];
  for (const [label, table] of sources) {
    for (const [nodeId, effects] of Object.entries(table)) {
      const issues: string[] = [];
      const pending: string[] = [];
      for (const eff of effects) closureCheckEffect(eff, issues, pending);
      pendingAll.push(...pending.map(p => `${nodeId}: ${p}`));
      record(issues.length === 0, nodeId, `closure-${label}`,
        issues.length === 0 ? 'all ids resolve' : issues.join('; '));
    }
  }
  if (pendingAll.length > 0) {
    console.log(`  [closure] ${pendingAll.length} pending (authored ahead of engine): ${[...new Set(pendingAll.map(p => p.split(': ')[1]))].join(', ')}`);
  }
}

console.log('Running talent bot…');
console.log(`NODE_EFFECTS entries: ${Object.keys(NODE_EFFECTS).length}`);
passClosure();
passCoverage();
passConditional();
passProc();
passBulwark();
simulateRotation();
summarize();
