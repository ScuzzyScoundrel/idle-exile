import { Item, Affix, Rarity, AffixTier } from '../../types';
import { formatAffix } from '../../engine/items';
import { slotIcon } from '../slotConfig';

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

function AffixLine({ affix }: { affix: Affix }) {
  return (
    <div className={`text-xs ${TIER_COLORS[affix.tier] || 'text-gray-400'}`}>
      {formatAffix(affix)}
      <span className="text-gray-600 ml-1">(T{affix.tier})</span>
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
  return (
    <div
      onClick={onClick}
      className={`
        border rounded-lg p-2 cursor-pointer transition-all
        ${RARITY_COLORS[item.rarity]}
        ${selected ? 'ring-2 ring-white scale-105' : 'hover:scale-102 hover:brightness-110'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-sm">{slotIcon(item.slot)}</span>
        <span className={`text-sm font-semibold truncate ${RARITY_TEXT[item.rarity]}`}>
          {item.name}
        </span>
      </div>

      {/* Item info */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <span>iLvl {item.iLvl}</span>
        <span>{'\u2022'}</span>
        <span>{item.rarity}</span>
        <span>{'\u2022'}</span>
        <span>{item.prefixes.length + item.suffixes.length} affixes</span>
      </div>

      {/* Base Stats */}
      {!compact && Object.entries(item.baseStats).length > 0 && (
        <div className="text-xs text-gray-500 mb-1">
          {Object.entries(item.baseStats).map(([key, val]) => (
            <span key={key} className="mr-2">{val} base {key}</span>
          ))}
        </div>
      )}

      {/* Affixes */}
      {!compact && (
        <div className="space-y-0.5">
          {item.prefixes.map((a, i) => <AffixLine key={`p-${i}`} affix={a} />)}
          {item.suffixes.map((a, i) => <AffixLine key={`s-${i}`} affix={a} />)}
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
