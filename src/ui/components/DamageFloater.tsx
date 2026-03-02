export interface FloaterEntry {
  id: number;
  damage: number;
  isCrit: boolean;
  isHit: boolean;
}

export function DamageFloaters({ floaters }: { floaters: FloaterEntry[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {floaters.map((f, i) => (
        <div
          key={f.id}
          className={`absolute font-bold ${
            !f.isHit
              ? 'text-gray-400 text-sm'
              : f.isCrit
                ? 'text-yellow-300 text-lg'
                : 'text-white text-sm'
          }`}
          style={{
            left: '50%',
            top: `${25 - i * 8}%`,
            transform: 'translateX(-50%)',
            animation: 'float-damage 1s ease-out forwards',
          }}
        >
          {f.isHit ? Math.round(f.damage) : 'MISS'}
        </div>
      ))}
    </div>
  );
}
