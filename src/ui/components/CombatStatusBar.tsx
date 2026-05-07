import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONE_DEFS } from '../../data/zones';
import { BOSS_INTERVAL } from '../../data/balance';
import { GATHERING_PROFESSION_DEFS } from '../../data/gatheringProfessions';
import { calcGatheringXpRequired } from '../../engine/gathering';
import { resolveStats } from '../../engine/character';

// Player-facing labels + colors for active minion types. Labels are
// short to fit inline HUD pills. Add a new entry when authoring a new
// minion (per engine/combat/minions.ts MinionState.type strings).
const MINION_STYLE: Record<string, { label: string; color: string }> = {
  zombie_dog: { label: 'Dogs',    color: 'bg-amber-800/70 text-amber-100' },
  fetish:     { label: 'Fetish',  color: 'bg-purple-800/70 text-purple-100' },
  spirit:     { label: 'Spirit',  color: 'bg-cyan-800/70 text-cyan-100' },
  zombie:     { label: 'Zombie',  color: 'bg-stone-700/70 text-stone-100' },
  hawk:       { label: 'Hawk',    color: 'bg-sky-800/70 text-sky-100' },
  wolf:       { label: 'Wolf',    color: 'bg-slate-700/70 text-slate-100' },
  panther:    { label: 'Panther', color: 'bg-zinc-800/70 text-zinc-100' },
  // Phase F F4 follow-on (2026-05-06): Hunter Beastmaster companion.
  companion:  { label: 'Pet',    color: 'bg-emerald-800/70 text-emerald-100' },
  spirit_temp:{ label: 'Spirit', color: 'bg-cyan-700/70 text-cyan-100' },
};

// Player-facing labels + colors for each ailment debuff. Labels are
// short to fit inline pills in the HUD; colors mirror the damage type.
const AILMENT_STYLE: Record<string, { label: string; color: string }> = {
  poisoned:   { label: 'Pois', color: 'bg-green-700/70 text-green-100' },
  bleeding:   { label: 'Bleed', color: 'bg-red-800/70 text-red-100' },
  burning:    { label: 'Burn', color: 'bg-orange-700/70 text-orange-100' },
  chilled:    { label: 'Chill', color: 'bg-cyan-700/70 text-cyan-100' },
  shocked:    { label: 'Shock', color: 'bg-yellow-700/70 text-yellow-100' },
  frostbite:  { label: 'Froz', color: 'bg-blue-800/70 text-blue-100' },
  hexed:      { label: 'Hex', color: 'bg-pink-700/70 text-pink-100' },
  cursed:     { label: 'Curse', color: 'bg-purple-700/70 text-purple-100' },
  marked:     { label: 'Mark', color: 'bg-amber-700/70 text-amber-100' },
  // Phase F (2026-05-06/07): new enemy debuffs from talent procs.
  staggered:    { label: 'Stag', color: 'bg-orange-800/70 text-orange-100' },
  cleave_marked:{ label: 'Cleave', color: 'bg-rose-700/70 text-rose-100' },
  snared:       { label: 'Snare', color: 'bg-teal-800/70 text-teal-100' },
};

// Phase F (2026-05-07): player tempBuff styles. Sourced from
// TALENT_BUFF_REGISTRY entries; one pill per stack-able buff. Display
// label + stack count + soonest expiry.
const PLAYER_BUFF_STYLE: Record<string, { label: string; color: string }> = {
  bone_armor:        { label: 'Bone',   color: 'bg-slate-600/70 text-slate-100' },
  spirit_shield:     { label: 'Shield', color: 'bg-cyan-600/70 text-cyan-100' },
  precision_charge:  { label: 'Aim',    color: 'bg-amber-600/70 text-amber-100' },
  ironclad_stance:   { label: 'Iron',   color: 'bg-stone-600/70 text-stone-100' },
  bulwark_charge:    { label: 'Bulwark',color: 'bg-sky-700/70 text-sky-100' },
  cleave_strike:     { label: 'CleaveStrike', color: 'bg-rose-600/70 text-rose-100' },
  saturation_tempo:  { label: 'Saturation', color: 'bg-violet-600/70 text-violet-100' },
  necro_stack:       { label: 'Necro',  color: 'bg-fuchsia-700/70 text-fuchsia-100' },
};

export default function CombatStatusBar() {
  const idleStartTime = useGameStore(s => s.idleStartTime);
  const currentZoneId = useGameStore(s => s.currentZoneId);
  const currentHp = useGameStore(s => s.currentHp);
  const combatPhase = useGameStore(s => s.combatPhase);
  const bossState = useGameStore(s => s.bossState);
  const clearStartedAt = useGameStore(s => s.clearStartedAt);
  const currentClearTime = useGameStore(s => s.currentClearTime);
  const zoneClearCounts = useGameStore(s => s.zoneClearCounts);
  const idleMode = useGameStore(s => s.idleMode);
  const selectedGatheringProfession = useGameStore(s => s.selectedGatheringProfession);
  const character = useGameStore(s => s.character);
  const gatheringSkills = useGameStore(s => s.gatheringSkills);
  const currentEs = useGameStore(s => s.currentEs);
  // Phase E follow-up (Combat HUD wire-up 2026-05-05) — surface mana,
  // swing timer, and front-mob ailment stacks that the engine has been
  // emitting silently since Phase A.
  const nextAutoAttackAt = useGameStore(s => s.nextAutoAttackAt);
  const packMobs = useGameStore(s => s.packMobs);
  const activeDebuffs = useGameStore(s => s.activeDebuffs);
  const activeMinions = useGameStore(s => s.activeMinions);
  // Phase F (2026-05-06/07): player-state subscriptions for new HUD pills.
  const tempBuffs = useGameStore(s => s.tempBuffs);
  const frenziedActive = useGameStore(s => s.frenziedActive);
  const critStacks = useGameStore(s => s.critStacks);
  const critStacksExpiresAt = useGameStore(s => s.critStacksExpiresAt);
  const resonanceCharges = useGameStore(s => s.resonanceCharges);
  const resonanceExpiresAt = useGameStore(s => s.resonanceExpiresAt);

  // Tick for smooth progress bar animation
  const [, setTick] = useState(0);
  useEffect(() => {
    if (idleStartTime === null) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [idleStartTime]);

  // Don't render when no run is active
  if (idleStartTime === null || !currentZoneId) return null;

  const zone = ZONE_DEFS.find(z => z.id === currentZoneId);
  if (!zone) return null;

  const maxHp = resolveStats(character).maxLife;

  // --- Gathering mode ---
  if (idleMode === 'gathering' && selectedGatheringProfession) {
    const profDef = GATHERING_PROFESSION_DEFS.find(p => p.id === selectedGatheringProfession);
    const skill = gatheringSkills[selectedGatheringProfession];
    const xpNeeded = calcGatheringXpRequired(skill.level);
    const xpPct = xpNeeded > 0 ? Math.min(100, (skill.xp / xpNeeded) * 100) : 0;

    // Gathering clear progress
    const nowMs = Date.now();
    const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1;
    const gatherProgress = clearDurationMs > 0
      ? Math.min(100, Math.max(0, ((nowMs - clearStartedAt) / clearDurationMs) * 100))
      : 0;

    return (
      <div className="fixed bottom-14 left-0 right-0 z-40 px-2 py-1">
        <div className="flex items-center gap-2 max-w-4xl xl:max-w-7xl mx-auto text-xs">
          <div className="flex items-center gap-3 flex-1 bg-gray-950/90 backdrop-blur-md
            rounded-lg px-3 py-1.5 border border-white/10">
            <span className="text-gray-300 font-semibold truncate shrink-0">{zone.name}</span>
            <span className="text-emerald-400 shrink-0">
              {profDef?.icon} {profDef?.name} Lv.{skill.level}
            </span>
            <div className="flex-1 min-w-0">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                     style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="w-16 shrink-0">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full"
                     style={{ width: `${gatherProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Combat mode ---
  const maxEs = resolveStats(character).energyShield;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const hpColor = hpPct > 60 ? 'bg-green-500' : hpPct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const esPct = maxEs > 0 ? Math.max(0, Math.min(100, (currentEs / maxEs) * 100)) : 0;

  // Mana (Phase A — engine consumes; Phase E follow-up — UI surfaces).
  const mana = character.mana;
  const manaPct = mana && mana.max > 0
    ? Math.max(0, Math.min(100, (mana.current / mana.max) * 100))
    : 0;

  // Swing timer — seconds until next auto-attack. Negative ms means
  // "ready to swing" (engine fires on next tick).
  const swingMsRemaining = nextAutoAttackAt - Date.now();
  const swingReady = swingMsRemaining <= 0;
  const swingSecLabel = swingReady ? '◉' : `${(swingMsRemaining / 1000).toFixed(1)}s`;

  // Active ailments on the front target. During clearing this is the
  // first mob in the pack; during a boss fight this is the boss-attached
  // ephemeral list at `state.activeDebuffs`. Filter to known ailments.
  const targetDebuffs = combatPhase === 'boss_fight'
    ? (activeDebuffs ?? [])
    : (packMobs[0]?.debuffs ?? []);
  const ailmentPills = targetDebuffs
    .filter(d => AILMENT_STYLE[d.debuffId])
    .map(d => ({
      id: `${d.debuffId}_${d.appliedBySkillId}`,
      style: AILMENT_STYLE[d.debuffId],
      stacks: d.stacks,
    }));

  // Active minions, grouped by type for compact HUD pills. The engine
  // tracks per-instance state; we only show count + soonest expiry per
  // type (e.g. "Dogs ×3 — 8s") to keep the bar scannable.
  const minionGroups: Record<string, { count: number; soonestExpiry: number }> = {};
  for (const m of activeMinions ?? []) {
    if (!minionGroups[m.type]) minionGroups[m.type] = { count: 0, soonestExpiry: Infinity };
    minionGroups[m.type].count++;
    minionGroups[m.type].soonestExpiry = Math.min(minionGroups[m.type].soonestExpiry, m.expiresAt);
  }
  const minionPills = Object.entries(minionGroups).map(([type, group]) => ({
    type,
    style: MINION_STYLE[type] ?? { label: type, color: 'bg-gray-700/70 text-gray-200' },
    count: group.count,
    remainingSec: Math.max(0, (group.soonestExpiry - Date.now()) / 1000),
  }));

  // Phase F (2026-05-06/07): player-state pills for new talent-driven
  // mechanics. Frenzied flag, Crit Cascade stacks, Resonance charges,
  // active tempBuffs (Bulwark / Ironclad / Necro / etc).
  const nowMsForPills = Date.now();
  const totalResonance = resonanceCharges
    ? resonanceCharges.fire + resonanceCharges.cold + resonanceCharges.lightning + resonanceCharges.chaos
    : 0;
  const playerStatePills: { id: string; label: string; color: string; count?: number; remainingSec?: number; title: string }[] = [];
  if (frenziedActive) {
    playerStatePills.push({
      id: 'frenzied',
      label: 'Frenzied',
      color: 'bg-red-700/70 text-red-100',
      title: 'Sticky Frenzied state — entered at <50% HP, exits at >75% HP',
    });
  }
  if (critStacks > 0 && critStacksExpiresAt > nowMsForPills) {
    playerStatePills.push({
      id: 'critstacks',
      label: 'Crit',
      color: 'bg-yellow-600/70 text-yellow-100',
      count: critStacks,
      remainingSec: Math.max(0, (critStacksExpiresAt - nowMsForPills) / 1000),
      title: `Crit Cascade × ${critStacks} (decays in 4s after last crit)`,
    });
  }
  if (totalResonance > 0 && resonanceExpiresAt > nowMsForPills) {
    const els: string[] = [];
    if (resonanceCharges.fire) els.push(`F${resonanceCharges.fire}`);
    if (resonanceCharges.cold) els.push(`C${resonanceCharges.cold}`);
    if (resonanceCharges.lightning) els.push(`L${resonanceCharges.lightning}`);
    if (resonanceCharges.chaos) els.push(`X${resonanceCharges.chaos}`);
    playerStatePills.push({
      id: 'resonance',
      label: 'Res',
      color: 'bg-indigo-700/70 text-indigo-100',
      count: totalResonance,
      remainingSec: Math.max(0, (resonanceExpiresAt - nowMsForPills) / 1000),
      title: `Resonance ${els.join(' ')} (decays in 6s after last elemental hit)`,
    });
  }
  // tempBuffs grouped by id, surfaced via PLAYER_BUFF_STYLE.
  const buffGroups: Record<string, { stacks: number; expiresAt: number }> = {};
  for (const b of tempBuffs ?? []) {
    if (b.expiresAt <= nowMsForPills) continue;
    if (!buffGroups[b.id]) buffGroups[b.id] = { stacks: 0, expiresAt: 0 };
    buffGroups[b.id].stacks += b.stacks;
    buffGroups[b.id].expiresAt = Math.max(buffGroups[b.id].expiresAt, b.expiresAt);
  }
  for (const [id, group] of Object.entries(buffGroups)) {
    const style = PLAYER_BUFF_STYLE[id];
    if (!style) continue;
    playerStatePills.push({
      id: `buff_${id}`,
      label: style.label,
      color: style.color,
      count: group.stacks > 1 ? group.stacks : undefined,
      remainingSec: Math.max(0, (group.expiresAt - nowMsForPills) / 1000),
      title: `${style.label} × ${group.stacks}`,
    });
  }

  // Clear progress (mob HP)
  const nowMs = Date.now();
  const clearDurationMs = currentClearTime > 0 ? currentClearTime * 1000 : 1;
  const clearProgress = combatPhase === 'clearing' && clearDurationMs > 0
    ? Math.min(100, Math.max(0, ((nowMs - clearStartedAt) / clearDurationMs) * 100))
    : 0;

  // Boss countdown
  const zoneClears = zoneClearCounts[currentZoneId] || 0;
  const bossIn = BOSS_INTERVAL - (zoneClears % BOSS_INTERVAL);

  // Phase badge
  const phaseBadge = (() => {
    switch (combatPhase) {
      case 'boss_fight': return { text: 'BOSS', color: 'bg-red-600 text-white' };
      case 'boss_victory': return { text: 'VICTORY', color: 'bg-yellow-600 text-white' };
      case 'boss_defeat': return { text: 'DEFEAT', color: 'bg-red-800 text-red-200' };
      case 'zone_defeat': return { text: 'DEAD', color: 'bg-red-900 text-red-300' };
      default: return null;
    }
  })();

  // Boss HP bar (during boss_fight)
  const bossHpPct = bossState && bossState.bossMaxHp > 0
    ? Math.max(0, Math.min(100, (bossState.bossCurrentHp / bossState.bossMaxHp) * 100))
    : 0;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 px-2 py-1">
      <div className="flex items-center gap-2 max-w-4xl xl:max-w-7xl mx-auto text-xs
        bg-gray-950/90 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10">
        {/* Zone name */}
        <span className="text-gray-300 font-semibold truncate shrink-0">{zone.name}</span>

        {/* Player HP bar (+ ES bar + Mana bar if applicable) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-gray-400 shrink-0">HP</span>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${hpColor} rounded-full transition-all duration-150`}
                   style={{ width: `${hpPct}%` }} />
            </div>
            {maxEs > 0 && (
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-150"
                     style={{ width: `${esPct}%` }} />
              </div>
            )}
            {mana && mana.max > 0 && (
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-150"
                     style={{ width: `${manaPct}%` }} />
              </div>
            )}
          </div>
          <span className="text-gray-400 font-mono shrink-0 leading-tight text-right">
            <span>{Math.ceil(currentHp)}/{maxHp}</span>
            {maxEs > 0 && <span className="block text-blue-400 text-[10px]">ES:{Math.ceil(currentEs)}/{maxEs}</span>}
            {mana && mana.max > 0 && <span className="block text-indigo-300 text-[10px]">M:{Math.ceil(mana.current)}/{mana.max}</span>}
          </span>
          {/* Swing-timer indicator — next auto-attack countdown. */}
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${
              swingReady ? 'bg-emerald-700/70 text-emerald-100' : 'bg-gray-700/70 text-gray-300'
            }`}
            title="Next auto-attack swing"
          >
            {swingSecLabel}
          </span>
        </div>

        {/* Active minion pills — grouped by type, shows count + soonest expiry. */}
        {minionPills.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {minionPills.map(pill => (
              <span
                key={pill.type}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${pill.style.color}`}
                title={`${pill.style.label} × ${pill.count} (${pill.remainingSec.toFixed(0)}s)`}
              >
                {pill.style.label}<span className="font-bold ml-0.5">×{pill.count}</span>
                {pill.remainingSec > 0 && pill.remainingSec < 60 && (
                  <span className="text-[9px] opacity-70 ml-1">{pill.remainingSec.toFixed(0)}s</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Phase F: player-state pills — Frenzied, Crit Cascade, Resonance,
            and TALENT_BUFF_REGISTRY tempBuffs (Bulwark, Ironclad, Necro, etc.) */}
        {playerStatePills.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {playerStatePills.map(pill => (
              <span
                key={pill.id}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${pill.color}`}
                title={pill.title}
              >
                {pill.label}
                {pill.count !== undefined && <span className="font-bold ml-0.5">×{pill.count}</span>}
                {pill.remainingSec !== undefined && pill.remainingSec > 0 && pill.remainingSec < 60 && (
                  <span className="text-[9px] opacity-70 ml-1">{pill.remainingSec.toFixed(0)}s</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Mob progress OR Boss HP */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {combatPhase === 'boss_fight' && bossState ? (
            <>
              <span className="text-red-400 shrink-0 truncate">{bossState.bossName}</span>
              <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-150"
                     style={{ width: `${bossHpPct}%` }} />
              </div>
            </>
          ) : combatPhase === 'clearing' ? (
            <>
              <span className="text-gray-400 shrink-0">Mob</span>
              <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full"
                     style={{ width: `${100 - clearProgress}%` }} />
              </div>
            </>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Ailment stack pills — front mob in clearing, boss in boss_fight. */}
        {ailmentPills.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 max-w-[200px] overflow-hidden">
            {ailmentPills.slice(0, 6).map(pill => (
              <span
                key={pill.id}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${pill.style.color}`}
                title={`${pill.style.label} × ${pill.stacks}`}
              >
                {pill.style.label}{pill.stacks > 1 && <span className="font-bold ml-0.5">×{pill.stacks}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Boss countdown or phase badge */}
        {phaseBadge ? (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${phaseBadge.color} shrink-0`}>
            {phaseBadge.text}
          </span>
        ) : (
          <span className="text-gray-500 shrink-0">Boss in {bossIn}</span>
        )}
      </div>
    </div>
  );
}
