import type { Rarity } from '../../types';
import { getRareMaterialDef } from '../../data/rareMaterials';
import { getPatternDef } from '../../data/craftingPatterns';
import { getGemDef, GEM_TIER_NAMES, GEM_TIER_COLORS } from '../../data/gems';
import { RARITY_TEXT, RARITY_BORDER, RARITY_BG } from './zoneConstants';
import type { SessionSummary as SessionSummaryType } from './zoneHelpers';

export default function SessionSummaryPanel({ session }: { session: SessionSummaryType }) {
  if (session.totalClears <= 0) return null;

  return (
    <div className="panel-stone p-3 space-y-2">
      {/* Clear count — prominent */}
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{session.totalClears}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">Clears</div>
      </div>

      {/* Stat row — gold / XP / items */}
      <div className="grid grid-cols-3 gap-2">
        {session.goldEarned > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center">
            <div className="text-xs font-bold text-yellow-400">{session.goldEarned.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Gold</div>
          </div>
        )}
        {session.gatheringXp > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center">
            <div className="text-xs font-bold text-green-400">+{session.gatheringXp.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Gather XP</div>
          </div>
        )}
        {Object.values(session.itemsByRarity).some(v => v > 0) && (
          <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center">
            <div className="text-xs font-bold text-white">
              {Object.values(session.itemsByRarity).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-gray-500">Items</div>
          </div>
        )}
      </div>

      {/* Materials */}
      {Object.keys(session.materials).length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Materials</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(session.materials).map(([mat, count]) => (
              <span key={mat} className="bg-gray-800 rounded px-1.5 py-0.5 text-xs text-gray-300">
                {mat.replace(/_/g, ' ')} <span className="text-white font-semibold">x{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rare Materials — highlighted cards */}
      {Object.keys(session.rareMaterials).length > 0 && (
        <div>
          <div className="text-xs text-purple-400 font-semibold mb-1">Rare Finds</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(session.rareMaterials).map(([matId, count]) => {
              const def = getRareMaterialDef(matId);
              const rarityColor = def ? RARITY_TEXT[def.rarity as Rarity] ?? 'text-gray-300' : 'text-gray-300';
              const rarityBorder = def ? RARITY_BORDER[def.rarity as Rarity] ?? 'border-gray-600' : 'border-gray-600';
              return (
                <span key={matId} className={`bg-gray-800/80 border ${rarityBorder} rounded-md px-2 py-1 text-xs ${rarityColor} animate-pulse`}>
                  {def?.icon ?? ''} {def?.name ?? matId.replace(/_/g, ' ')} <span className="text-white font-semibold">x{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Patterns Found — purple/gold highlight */}
      {session.patternDrops.length > 0 && (
        <div>
          <div className="text-xs text-yellow-400 font-semibold mb-1">Patterns Found</div>
          <div className="flex flex-wrap gap-1">
            {session.patternDrops.map((patId, idx) => {
              const patDef = getPatternDef(patId);
              return (
                <span key={`${patId}-${idx}`} className="bg-yellow-900/30 border border-yellow-600/50 rounded-md px-2 py-1 text-xs text-yellow-300 animate-pulse">
                  {'\uD83D\uDCDC'} {patDef?.name ?? patId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Gems Found */}
      {session.gemDrops.length > 0 && (
        <div>
          <div className="text-xs text-cyan-400 font-semibold mb-1">Gems Found</div>
          <div className="flex flex-wrap gap-1">
            {session.gemDrops.map((gem, idx) => {
              const def = getGemDef(gem.type);
              return (
                <span key={`gem-${idx}`} className={`bg-gray-800/80 border border-cyan-700/50 rounded-md px-2 py-1 text-xs ${GEM_TIER_COLORS[gem.tier]}`}>
                  {def.icon} {GEM_TIER_NAMES[gem.tier]} {def.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Currencies — golden highlight */}
      {Object.keys(session.currencies).length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Currencies</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(session.currencies).map(([curr, count]) => (
              <span key={curr} className="bg-yellow-900/30 border border-yellow-700/50 rounded px-2 py-0.5 text-xs text-yellow-300">
                {curr} <span className="text-white font-semibold">x{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items by rarity — colored badges */}
      {Object.values(session.itemsByRarity).some(v => v > 0) && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Items by Rarity</div>
          <div className="flex flex-wrap gap-1">
            {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as Rarity[]).map(r => {
              const count = session.itemsByRarity[r];
              if (count === 0) return null;
              return (
                <span key={r} className={`${RARITY_BG[r]} ${RARITY_TEXT[r]} px-2 py-0.5 rounded-full text-xs font-semibold`}>
                  {count} {r}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-salvage tally */}
      {session.itemsSalvaged > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-amber-400">
            {session.itemsSalvaged} auto-salvaged
          </span>
          <span className="text-xs text-amber-300 font-semibold">
            +{session.dustEarned.toLocaleString()} essence
          </span>
        </div>
      )}
    </div>
  );
}
