import Tooltip from '../components/Tooltip';
import { formatMatName, getMatTooltip, getMatIcon } from './craftingHelpers';

interface MaterialPillProps {
  materialId: string;
  have: number;
  need: number;
  variant?: 'default' | 'gold';
  onMaterialClick?: (materialId: string) => void;
}

export default function MaterialPill({ materialId, have, need, variant = 'default', onMaterialClick }: MaterialPillProps) {
  const met = have >= need;

  let colorClass: string;
  if (variant === 'gold') {
    colorClass = met ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400';
  } else {
    colorClass = met ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400';
  }

  const icon = variant === 'gold' ? '\uD83D\uDCB0' : getMatIcon(materialId);
  const displayName = variant === 'gold' ? `${need}` : formatMatName(materialId);
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
