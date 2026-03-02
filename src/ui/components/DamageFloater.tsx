export interface FloaterEntry {
  id: number;
  damage: number;
  isCrit: boolean;
  isHit: boolean;
  left: number; // 20-80% horizontal offset
}

export function DamageFloaters({ floaters }: { floaters: FloaterEntry[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {floaters.map(f => (
        <div
          key={f.id}
          className={`absolute top-1/4 font-bold ${
            !f.isHit
              ? 'text-gray-400 text-sm'
              : f.isCrit
                ? 'text-yellow-300 text-lg'
                : 'text-white text-sm'
          }`}
          style={{
            left: `${f.left}%`,
            animation: 'float-damage 1s ease-out forwards',
          }}
        >
          {f.isHit ? f.damage : 'MISS'}
        </div>
      ))}
    </div>
  );
}
