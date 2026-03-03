import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { isQuestComplete } from '../../engine/dailyQuests';
import type { QuestDef, QuestProgress, QuestObjectiveType } from '../../types';

// Quest type colors
const QUEST_TYPE_COLOR: Record<QuestObjectiveType, string> = {
  kill_mob: 'text-red-400',
  clear_zone: 'text-blue-400',
  defeat_boss: 'text-yellow-400',
};

const QUEST_TYPE_LABEL: Record<QuestObjectiveType, string> = {
  kill_mob: 'Kill',
  clear_zone: 'Clear',
  defeat_boss: 'Boss',
};

// Format material ID to display name (snake_case → Title Case)
function formatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function QuestRow({ quest, progress, onClaim }: {
  quest: QuestDef;
  progress: QuestProgress | undefined;
  onClaim: (questId: string) => void;
}) {
  const current = progress?.current ?? 0;
  const required = quest.objective.required;
  const complete = isQuestComplete(quest, progress);
  const claimed = progress?.claimed ?? false;
  const pct = Math.min(100, (current / required) * 100);

  return (
    <div className={`rounded px-2 py-1.5 ${claimed ? 'bg-gray-800/30 opacity-60' : complete ? 'bg-green-900/30 border border-green-600/50' : 'bg-gray-800/40'}`}>
      <div className="flex justify-between items-center text-xs mb-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold text-[10px] uppercase ${QUEST_TYPE_COLOR[quest.objective.type]}`}>
            {QUEST_TYPE_LABEL[quest.objective.type]}
          </span>
          <span className="text-gray-200">
            {quest.objective.type === 'kill_mob' && `Kill ${required} ${quest.objective.targetName}`}
            {quest.objective.type === 'clear_zone' && `Clear ${quest.objective.targetName} ${required}x`}
            {quest.objective.type === 'defeat_boss' && `Defeat ${quest.objective.targetName} ${required}x`}
          </span>
        </div>
        <span className="text-gray-400 text-[10px]">{current}/{required}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full transition-all duration-300 ${claimed ? 'bg-gray-600' : complete ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Rewards + Claim */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          {quest.reward.gold && <span className="text-yellow-400">{quest.reward.gold}g</span>}
          {quest.reward.xp && <span className="text-cyan-400">{quest.reward.xp} XP</span>}
          {quest.reward.currencies && Object.entries(quest.reward.currencies).map(([cur, qty]) => (
            qty ? <span key={cur} className="text-purple-400">{qty} {formatName(cur)}</span> : null
          ))}
        </div>
        {complete && !claimed && (
          <button
            onClick={() => onClaim(quest.id)}
            className="text-[10px] px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold animate-pulse"
          >
            Claim
          </button>
        )}
        {claimed && (
          <span className="text-[10px] text-gray-500">Claimed</span>
        )}
      </div>
    </div>
  );
}

export default function DailyQuestPanel({ currentZoneId }: { currentZoneId?: string | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const [countdown, setCountdown] = useState('');
  const dailyQuests = useGameStore(s => s.dailyQuests);
  const claimQuestReward = useGameStore(s => s.claimQuestReward);
  const checkDailyQuestReset = useGameStore(s => s.checkDailyQuestReset);

  // Ensure quests are generated
  useEffect(() => {
    checkDailyQuestReset();
  }, [checkDailyQuestReset]);

  // Countdown to midnight UTC
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${hours}h ${mins}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  if (dailyQuests.quests.length === 0) return null;

  // Group quests by band
  const questsByBand: Record<number, QuestDef[]> = {};
  for (const q of dailyQuests.quests) {
    if (!questsByBand[q.band]) questsByBand[q.band] = [];
    questsByBand[q.band].push(q);
  }

  const totalQuests = dailyQuests.quests.length;
  const claimedCount = Object.values(dailyQuests.progress).filter(p => p.claimed).length;
  const completedCount = dailyQuests.quests.filter(q => isQuestComplete(q, dailyQuests.progress[q.id])).length;

  // Check if any quests are relevant to the current zone
  const relevantQuestIds = new Set<string>();
  if (currentZoneId) {
    for (const q of dailyQuests.quests) {
      if (q.objective.targetId === currentZoneId) relevantQuestIds.add(q.id);
      // Also check if mob is from this zone (for kill quests)
      if (q.objective.type === 'kill_mob') {
        // We'll highlight these with a border
        relevantQuestIds.add(q.id);
      }
    }
  }

  return (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex justify-between items-center px-3 py-1.5 text-xs hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold">Daily Quests</span>
          <span className="text-gray-500">{claimedCount}/{totalQuests}</span>
          {completedCount > claimedCount && (
            <span className="text-green-400 text-[10px] animate-pulse">{completedCount - claimedCount} ready!</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px]">Resets {countdown}</span>
          <span className="text-gray-500">{collapsed ? '+' : '-'}</span>
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-2">
          {Object.entries(questsByBand).sort(([a], [b]) => Number(a) - Number(b)).map(([band, quests]) => (
            <div key={band}>
              <div className="text-[10px] text-gray-500 font-semibold mb-0.5 px-1">Band {band}</div>
              <div className="space-y-1">
                {quests.map(q => (
                  <QuestRow
                    key={q.id}
                    quest={q}
                    progress={dailyQuests.progress[q.id]}
                    onClaim={claimQuestReward}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
