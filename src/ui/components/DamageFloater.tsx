export interface FloaterEntry {
  id: number;
  damage: number;
  isCrit: boolean;
  isHit: boolean;
  isEnemyAttack?: boolean;
  isDodged?: boolean;
  isBlocked?: boolean;
  isBossCrit?: boolean;
  isProc?: boolean;
}

export function DamageFloaters({ floaters }: { floaters: FloaterEntry[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {floaters.map((f, i) => (
        <div
          key={f.id}
          className={`absolute font-bold ${
            f.isEnemyAttack
              ? f.isDodged
                ? 'text-blue-400 text-sm'
                : f.isBlocked
                  ? 'text-orange-400 text-sm'
                  : f.isBossCrit
                    ? 'text-red-300 text-base'
                    : 'text-red-400 text-sm'
              : f.isProc
                ? 'text-purple-400 text-sm'
                : !f.isHit
                  ? 'text-gray-400 text-sm'
                  : f.isCrit
                    ? 'text-yellow-300 text-lg'
                    : 'text-white text-sm'
          }`}
          style={{
            left: f.isEnemyAttack ? '20%' : '50%',
            top: `${25 - i * 8}%`,
            transform: 'translateX(-50%)',
            animation: 'float-damage 1s ease-out forwards',
          }}
        >
          {f.isEnemyAttack
            ? f.isDodged
              ? 'DODGE'
              : `-${Math.round(f.damage)}`
            : f.isHit
              ? Math.round(f.damage)
              : 'MISS'}
        </div>
      ))}
    </div>
  );
}
