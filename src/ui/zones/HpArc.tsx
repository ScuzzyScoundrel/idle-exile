/** Semicircular HP arc using conic-gradient.
 *  Green > 60%, Yellow > 30%, Red <= 30%.
 *  ES shown as thin outer ring. HP number centered. */

interface HpArcProps {
  currentHp: number;
  maxHp: number;
  currentEs?: number;
  maxEs?: number;
  size?: number; // px, default 64
  fortifyGlow?: boolean;
}

export default function HpArc({ currentHp, maxHp, currentEs = 0, maxEs = 0, size = 64, fortifyGlow = false }: HpArcProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const esPct = maxEs > 0 ? Math.max(0, Math.min(100, (currentEs / maxEs) * 100)) : 0;

  // Only fill the bottom semicircle (180-360deg range)
  // Map 0-100% to 180-360deg
  const fillDeg = 180 + (pct / 100) * 180;
  const hpColor = pct > 60 ? '#22c55e' : pct > 30 ? '#eab308' : '#ef4444';
  const trackColor = 'rgba(30,30,30,0.8)';

  // ES ring: thin outer border
  const esRingDeg = maxEs > 0 ? 180 + (esPct / 100) * 180 : 180;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* ES outer ring (if applicable) */}
      {maxEs > 0 && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 180deg, #3b82f6 0deg, #3b82f6 ${esRingDeg - 180}deg, rgba(30,30,30,0.5) ${esRingDeg - 180}deg, rgba(30,30,30,0.5) 180deg, transparent 180deg)`,
            padding: 2,
          }}
        >
          <div className="w-full h-full rounded-full bg-gray-950" />
        </div>
      )}

      {/* HP arc */}
      <div
        className={`absolute rounded-full ${fortifyGlow ? 'animate-fortify-arc' : ''}`}
        style={{
          inset: maxEs > 0 ? 4 : 0,
          background: `conic-gradient(from 180deg, ${hpColor} 0deg, ${hpColor} ${fillDeg - 180}deg, ${trackColor} ${fillDeg - 180}deg, ${trackColor} 180deg, transparent 180deg)`,
        }}
      >
        {/* Inner cutout for donut effect */}
        <div
          className="absolute rounded-full bg-gray-950/95 flex items-center justify-center"
          style={{ inset: size * 0.15 }}
        >
          {/* HP number */}
          <div className="text-center">
            <div className="font-bold text-white leading-none" style={{ fontSize: size * 0.18 }}>
              {Math.ceil(currentHp)}
            </div>
            <div className="text-gray-500 leading-none" style={{ fontSize: size * 0.11 }}>
              /{maxHp}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
