import { useGameStore } from '../../store/gameStore';
import { getMaterialTraceInfo } from '../../data/materialTraceability';
import { formatMatName, getMatIcon } from './craftingHelpers';
import { CraftIcon, resolveMaterialMeta } from '../craftIcon';

interface MaterialDetailModalProps {
  materialId: string;
  onClose: () => void;
}

export default function MaterialDetailModal({ materialId, onClose }: MaterialDetailModalProps) {
  const materials = useGameStore(s => s.materials);
  const count = materials[materialId] ?? 0;
  const trace = getMaterialTraceInfo(materialId);
  const meta = resolveMaterialMeta(materialId);
  const displayName = meta?.name ?? formatMatName(materialId);
  const icon = getMatIcon(materialId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          {meta
            ? <CraftIcon category={meta.category} id={materialId} fallback={meta.emoji} size="xl" />
            : <span className="text-3xl">{icon}</span>
          }
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">{displayName}</h3>
            <span className="text-sm text-gray-400">Owned: <span className="text-white font-semibold">{count}</span></span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none px-2"
          >
            {'\u2715'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Drops From */}
          {(trace.dropSources.zones.length > 0 || trace.dropSources.mobs.length > 0) && (
            <Section title="Drops From" icon="\uD83D\uDDFA\uFE0F">
              {trace.dropSources.zones.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-xs text-gray-500 font-semibold">Zones (gathering):</span>
                  {trace.dropSources.zones.map(z => (
                    <div key={z} className="text-xs text-green-400 pl-2">{z}</div>
                  ))}
                </div>
              )}
              {trace.dropSources.mobs.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  <span className="text-xs text-gray-500 font-semibold">Mobs (combat):</span>
                  {dedupeByName(trace.dropSources.mobs).map(m => (
                    <div key={m.name + m.zone} className="text-xs text-amber-400 pl-2">
                      {'\uD83D\uDC80'} {m.name} <span className="text-gray-500">({m.zone})</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Produced By */}
          {trace.producedByRecipes.length > 0 && (
            <Section title="Produced By" icon="\u2699\uFE0F">
              {trace.producedByRecipes.map(r => (
                <div key={r.id} className="text-xs pl-2">
                  <span className={typeColor(r.type)}>{typeIcon(r.type)} {r.name}</span>
                  <span className="text-gray-500 ml-1">({r.type})</span>
                </div>
              ))}
            </Section>
          )}

          {/* Used In */}
          {trace.usedInRecipes.length > 0 && (
            <Section title="Used In" icon="\uD83D\uDD28">
              {groupByType(trace.usedInRecipes).map(([type, recipes]) => (
                <div key={type} className="space-y-0.5 mt-1">
                  <span className="text-xs text-gray-500 font-semibold capitalize">{type} recipes:</span>
                  {recipes.map(r => (
                    <div key={r.id} className="text-xs pl-2">
                      <span className={typeColor(r.type)}>{typeIcon(r.type)} {r.name}</span>
                      {r.profession && <span className="text-gray-500 ml-1">({r.profession})</span>}
                    </div>
                  ))}
                </div>
              ))}
            </Section>
          )}

          {/* Nothing found */}
          {trace.dropSources.zones.length === 0 && trace.dropSources.mobs.length === 0 &&
           trace.producedByRecipes.length === 0 && trace.usedInRecipes.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              No traceability data found for this material.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold text-gray-300 mb-1">{icon} {title}</div>
      <div className="bg-gray-800/60 rounded-lg p-2">{children}</div>
    </div>
  );
}

function typeIcon(type: string): string {
  if (type === 'refine') return '\u2697\uFE0F';
  return '\uD83D\uDD28';
}

function typeColor(type: string): string {
  if (type === 'refine') return 'text-amber-400';
  return 'text-blue-400';
}

function groupByType(recipes: { type: string; name: string; id: string; profession?: string }[]): [string, typeof recipes][] {
  const groups = new Map<string, typeof recipes>();
  for (const r of recipes) {
    if (!groups.has(r.type)) groups.set(r.type, []);
    groups.get(r.type)!.push(r);
  }
  return Array.from(groups.entries());
}

function dedupeByName(mobs: { name: string; zone: string }[]): { name: string; zone: string }[] {
  const seen = new Set<string>();
  return mobs.filter(m => {
    const key = m.name + '|' + m.zone;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
