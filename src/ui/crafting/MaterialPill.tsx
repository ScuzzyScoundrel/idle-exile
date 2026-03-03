import Tooltip from '../components/Tooltip';
import { formatMatName, getMatTooltip, getMatIcon } from './craftingHelpers';
import { getComponentMeta } from '../../data/componentRecipes';

interface MaterialPillProps {
  materialId: string;
  have: number;
  need: number;
  /** 'component' uses teal color scheme instead of default green/red */
  variant?: 'default' | 'component' | 'gold';
  onMaterialClick?: (materialId: string) => void;
}

export default function MaterialPill({ materialId, have, need, variant = 'default', onMaterialClick }: MaterialPillProps) {
  const met = have >= need;

  let colorClass: string;
  if (variant === 'gold') {
    colorClass = met ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400';
  } else if (variant === 'component') {
    colorClass = met ? 'bg-teal-900/30 text-teal-400' : 'bg-red-900/30 text-red-400';
  } else {
    colorClass = met ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400';
  }

  const icon = variant === 'gold' ? '\uD83D\uDCB0' : variant === 'component' ? '\uD83E\uDDE9' : getMatIcon(materialId);
  const displayName = variant === 'gold'
    ? `${need}`
    : variant === 'component'
    ? (getComponentMeta(materialId)?.name ?? formatMatName(materialId))
    : formatMatName(materialId);
  const tooltipText = variant === 'gold' ? 'Gold cost' : (getMatTooltip(materialId) ?? displayName);

  const pill = (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs cursor-help ${colorClass} ${onMaterialClick ? 'hover:ring-1 hover:ring-white/30' : ''}`}
      onClick={onMaterialClick ? (e) => { e.stopPropagation(); onMaterialClick(materialId); } : undefined}
    >
      {icon} {variant === 'gold' ? null : <>{displayName} </>}{have}/{need}
    </span>
  );

  return <Tooltip content={tooltipText}>{pill}</Tooltip>;
}
