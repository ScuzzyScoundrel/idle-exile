import { useGameStore } from '../../store/gameStore';
import { REFINEMENT_TRACK_DEFS } from '../../data/refinement';
import { AFFIX_CATALYST_DEFS } from '../../data/affixCatalysts';
import { RARE_MATERIAL_DEFS, getRareMaterialDef } from '../../data/rareMaterials';
import { isComponentMaterial, getComponentMeta } from '../../data/componentRecipes';
import { CraftIcon, resolveMaterialMeta } from '../craftIcon';
import Tooltip from '../components/Tooltip';
import { RARITY_TEXT, RARITY_BORDER, RARITY_GRADIENT } from './craftingConstants';
import { rawToTrack, refinedToTrack, formatMatName, getMatTooltip } from './craftingHelpers';
import type { Rarity, RefinementTrack } from '../../types';

interface MatItem {
  id: string;
  count: number;
  icon?: string;
  color?: string;
  subtitle?: string;
  rarity?: Rarity;
  isAffix?: boolean;
}

interface MaterialsPanelProps {
  onMaterialClick?: (materialId: string) => void;
}

export default function MaterialsPanel({ onMaterialClick }: MaterialsPanelProps) {
  const { materials } = useGameStore();

  const affixCatIds = new Set(AFFIX_CATALYST_DEFS.map(d => d.id));
  const rareIds = new Set(RARE_MATERIAL_DEFS.map(d => d.id));
  const miscIds = new Set(['enchanting_essence', 'magic_essence']);

  // Group by track
  const trackGroups = new Map<RefinementTrack, MatItem[]>();
  const affixCats: MatItem[] = [];
  const rare: MatItem[] = [];
  const misc: MatItem[] = [];
  const components: MatItem[] = [];

  for (const [id, count] of Object.entries(materials)) {
    if (count <= 0) continue;

    if (isComponentMaterial(id)) {
      const meta = getComponentMeta(id);
      components.push({
        id, count,
        icon: '\uD83E\uDDE9',
        color: 'text-teal-400',
        subtitle: meta ? `${meta.variant} (B${meta.band})` : undefined,
      });
    } else if (affixCatIds.has(id)) {
      const def = AFFIX_CATALYST_DEFS.find(d => d.id === id);
      affixCats.push({
        id, count,
        icon: def?.icon,
        color: 'text-cyan-400',
        subtitle: def ? `\u2192 +${def.guaranteedAffix.replace(/_/g, ' ')}` : undefined,
        isAffix: true,
      });
    } else if (rareIds.has(id)) {
      const def = getRareMaterialDef(id);
      rare.push({
        id, count,
        icon: def?.icon,
        color: def ? RARITY_TEXT[def.rarity as Rarity] : undefined,
        subtitle: def ? `${def.rarity} catalyst` : undefined,
        rarity: def?.rarity as Rarity,
      });
    } else if (miscIds.has(id)) {
      misc.push({ id, count });
    } else {
      // Raw or refined — group by track
      const track = rawToTrack.get(id) ?? refinedToTrack.get(id);
      if (track) {
        if (!trackGroups.has(track)) trackGroups.set(track, []);
        trackGroups.get(track)!.push({ id, count });
      } else {
        misc.push({ id, count });
      }
    }
  }

  const sections: { label: string; icon: string; items: MatItem[] }[] = [];

  // Add track groups in canonical order
  for (const trackDef of REFINEMENT_TRACK_DEFS) {
    const items = trackGroups.get(trackDef.id);
    if (items && items.length > 0) {
      sections.push({ label: trackDef.name, icon: trackDef.icon, items });
    }
  }
  if (components.length > 0) sections.push({ label: 'Components', icon: '\uD83E\uDDE9', items: components });
  if (affixCats.length > 0) sections.push({ label: 'Affix Catalysts', icon: '\u2697\uFE0F', items: affixCats });
  if (rare.length > 0) sections.push({ label: 'Rare Materials', icon: '\uD83D\uDC8E', items: rare });
  if (misc.length > 0) sections.push({ label: 'Misc', icon: '\uD83D\uDCE6', items: misc });

  if (sections.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
        No materials yet. Go gathering or fight some monsters!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map(sec => (
        <div key={sec.label}>
          <div className="text-sm font-semibold text-gray-400 border-b border-gray-700/50 pb-1 mb-2">{sec.icon} {sec.label}</div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
            {sec.items.map(item => {
              const tooltipContent = getMatTooltip(item.id);
              const meta = resolveMaterialMeta(item.id);
              const border = item.rarity ? RARITY_BORDER[item.rarity] : item.isAffix ? 'border-cyan-600' : 'border-gray-600';
              const grad = item.rarity ? RARITY_GRADIENT[item.rarity] : '';
              const card = (
                <div
                  className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center overflow-hidden ${item.rarity ? '' : 'bg-gray-900'} ${border} ${onMaterialClick ? 'cursor-pointer hover:ring-1 hover:ring-white/30' : ''}`}
                  onClick={onMaterialClick ? () => onMaterialClick(item.id) : undefined}
                >
                  {item.rarity && (
                    <div className={`absolute inset-0 bg-gradient-to-t ${grad} to-transparent pointer-events-none`} />
                  )}
                  {meta
                    ? <CraftIcon category={meta.category} id={item.id} fallback={meta.emoji} size="xl" className="relative z-10" />
                    : <span className="text-3xl">{item.icon ?? '\uD83E\uDEA8'}</span>}
                  <span className="absolute top-0 right-0 bg-black/70 text-white text-[10px] font-bold px-1 rounded-bl z-10">{item.count}</span>
                  <span className="relative z-10 text-[10px] sm:text-xs text-gray-400 text-center leading-tight truncate w-full px-0.5 mt-auto">{meta?.name ?? formatMatName(item.id)}</span>
                </div>
              );
              return tooltipContent ? (
                <Tooltip key={item.id} content={tooltipContent}>{card}</Tooltip>
              ) : (
                <div key={item.id}>{card}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
