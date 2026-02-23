import { Item, Affix } from '../../types';
import { formatAffix, calcItemPower } from '../../engine/items';

const RARITY_COLORS: Record<string, string> = {
  normal: 'border-gray-500 bg-gray-900',
  magic: 'border-blue-500 bg-blue-950',
  rare: 'border-yellow-500 bg-yellow-950',
  unique: 'border-orange-500 bg-orange-950',
};

const RARITY_TEXT: Record<string, string> = {
  normal: 'text-gray-300',
  magic: 'text-blue-400',
  rare: 'text-yellow-400',
  unique: 'text-orange-400',
};

const SLOT_ICONS: Record<string, string> = {
  weapon: '\u2694\uFE0F',
  chest: '\uD83D\uDEE1\uFE0F',
  boots: '\uD83E\uDD7E',
  ring: '\uD83D\uDC8D',
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-blue-400',
  3: 'text-gray-400',
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

export default function ItemCard({ item, onClick, selected, compact, comparison }: ItemCardProps) {
  const power = calcItemPower(item);
  const compPower = comparison ? calcItemPower(comparison) : null;
  const powerDiff = compPower !== null ? power - compPower : null;

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
        <span className="text-sm">{SLOT_ICONS[item.slot]}</span>
        <span className={`text-sm font-semibold truncate ${RARITY_TEXT[item.rarity]}`}>
          {item.name}
        </span>
      </div>

      {/* Power Score */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <span>iLvl {item.iLvl}</span>
        <span>\u2022</span>
        <span>Power: {power}</span>
        {powerDiff !== null && (
          <span className={powerDiff > 0 ? 'text-green-400' : powerDiff < 0 ? 'text-red-400' : 'text-gray-500'}>
            ({powerDiff > 0 ? '+' : ''}{powerDiff})
          </span>
        )}
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
