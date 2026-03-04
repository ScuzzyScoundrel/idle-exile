import { Item, Affix, Rarity, AffixTier, ArmorType } from '../../types';
import { formatAffix, getBestTierForILvl } from '../../engine/items';
import { slotIcon } from '../slotConfig';
import { formatCorruptionAffix } from '../../data/corruptionAffixes';

const ARMOR_TYPE_BADGE: Record<ArmorType, { label: string; cls: string }> = {
  plate:   { label: 'Plate',   cls: 'bg-gray-600 text-gray-200' },
  leather: { label: 'Leather', cls: 'bg-amber-900 text-amber-200' },
  cloth:   { label: 'Cloth',   cls: 'bg-purple-900 text-purple-200' },
};

const WEAPON_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  sword:      { label: '1H Sword',      cls: 'bg-red-900 text-red-200' },
  axe:        { label: '1H Axe',        cls: 'bg-red-900 text-red-200' },
  mace:       { label: '1H Mace',       cls: 'bg-red-900 text-red-200' },
  dagger:     { label: '1H Dagger',     cls: 'bg-yellow-900 text-yellow-200' },
  scepter:    { label: '1H Scepter',    cls: 'bg-yellow-900 text-yellow-200' },
  wand:       { label: '1H Wand',       cls: 'bg-blue-900 text-blue-200' },
  gauntlet:   { label: '1H Gauntlet',   cls: 'bg-blue-900 text-blue-200' },
  greatsword: { label: '2H Greatsword', cls: 'bg-red-900 text-red-200' },
  greataxe:   { label: '2H Greataxe',   cls: 'bg-red-900 text-red-200' },
  maul:       { label: '2H Maul',       cls: 'bg-red-900 text-red-200' },
  bow:        { label: '2H Bow',        cls: 'bg-green-900 text-green-200' },
  crossbow:   { label: '2H Crossbow',   cls: 'bg-green-900 text-green-200' },
  staff:      { label: '2H Staff',      cls: 'bg-blue-900 text-blue-200' },
  tome:       { label: '2H Tome',       cls: 'bg-blue-900 text-blue-200' },
};

const OFFHAND_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  shield: { label: 'Shield', cls: 'bg-gray-600 text-gray-200' },
  focus:  { label: 'Focus',  cls: 'bg-blue-900 text-blue-200' },
  quiver: { label: 'Quiver', cls: 'bg-green-900 text-green-200' },
};

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'border-green-600 bg-green-950',
  uncommon: 'border-blue-500 bg-blue-950',
  rare: 'border-yellow-500 bg-yellow-950',
  epic: 'border-purple-500 bg-purple-950',
  legendary: 'border-orange-500 bg-orange-950',
};

const RARITY_TEXT: Record<Rarity, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-orange-400',
  2: 'text-purple-400',
  3: 'text-yellow-400',
  4: 'text-blue-400',
  5: 'text-blue-400',
  6: 'text-blue-300',
  7: 'text-green-400',
  8: 'text-green-300',
  9: 'text-gray-400',
  10: 'text-gray-500',
};

function AffixLine({ affix, bestTier }: { affix: Affix; bestTier: AffixTier }) {
  const isBest = affix.tier === bestTier;
  return (
    <div className={`text-xs ${TIER_COLORS[affix.tier] || 'text-gray-400'}`}>
      {formatAffix(affix)}
      <span className="text-gray-600 ml-1">(T{affix.tier})</span>
      {isBest && <span className="text-yellow-500 ml-1" title="Best tier for this item level">★</span>}
    </div>
  );
}

interface ItemCardProps {
  item: Item;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  comparison?: Item | null;
}

export default function ItemCard({ item, onClick, selected, compact }: ItemCardProps) {
  const borderClass = item.isCorrupted ? 'border-fuchsia-500 bg-fuchsia-950' : RARITY_COLORS[item.rarity];
  return (
    <div
      onClick={onClick}
      className={`
        border rounded-lg p-2 cursor-pointer transition-all
        ${borderClass}
        ${selected ? 'ring-2 ring-white scale-105' : 'hover:scale-102 hover:brightness-110'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-sm">{slotIcon(item.slot)}</span>
        <span className={`text-sm font-semibold truncate ${item.isCorrupted ? 'text-fuchsia-300' : RARITY_TEXT[item.rarity]}`}>
          {item.name}
        </span>
        {item.isCorrupted && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-fuchsia-800 text-fuchsia-200 font-bold shrink-0">VOID</span>
        )}
        {item.isProfessionGear && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-teal-800 text-teal-300 font-bold shrink-0">PROF</span>
        )}
        {item.armorType && ARMOR_TYPE_BADGE[item.armorType] && (
          <span className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none shrink-0 ${ARMOR_TYPE_BADGE[item.armorType].cls}`}>
            {ARMOR_TYPE_BADGE[item.armorType].label}
          </span>
        )}
        {item.weaponType && WEAPON_TYPE_BADGE[item.weaponType] && (
          <span className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none shrink-0 ${WEAPON_TYPE_BADGE[item.weaponType].cls}`}>
            {WEAPON_TYPE_BADGE[item.weaponType].label}
          </span>
        )}
        {item.offhandType && OFFHAND_TYPE_BADGE[item.offhandType] && (
          <span className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none shrink-0 ${OFFHAND_TYPE_BADGE[item.offhandType].cls}`}>
            {OFFHAND_TYPE_BADGE[item.offhandType].label}
          </span>
        )}
      </div>

      {/* Item info */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <span>iLvl {item.iLvl}</span>
        <span>{'\u2022'}</span>
        <span>{item.rarity}</span>
        <span>{'\u2022'}</span>
        <span>{item.prefixes.length + item.suffixes.length} affixes</span>
        <span>{'\u2022'}</span>
        <span className="text-gray-500">T{getBestTierForILvl(item.iLvl)}+</span>
      </div>

      {/* Base Stats */}
      {!compact && Object.entries(item.baseStats).length > 0 && (
        <div className="text-xs text-gray-500 mb-1">
          {Object.entries(item.baseStats).map(([key, val]) => (
            <span key={key} className="mr-2">{val} base {key}</span>
          ))}
        </div>
      )}

      {/* Corruption Implicit */}
      {!compact && item.implicit && (
        <div className="text-xs text-fuchsia-400 mb-0.5 border-b border-fuchsia-800 pb-0.5">
          {formatCorruptionAffix(item.implicit)}
        </div>
      )}

      {/* Affixes */}
      {!compact && (
        <div className="space-y-0.5">
          {item.prefixes.map((a, i) => <AffixLine key={`p-${i}`} affix={a} bestTier={getBestTierForILvl(item.iLvl)} />)}
          {item.suffixes.map((a, i) => <AffixLine key={`s-${i}`} affix={a} bestTier={getBestTierForILvl(item.iLvl)} />)}
        </div>
      )}

      {compact && (
        <div className="text-xs text-gray-500">
          {item.prefixes.length + item.suffixes.length} affixes
        </div>
      )}
    </div>
  );
}
