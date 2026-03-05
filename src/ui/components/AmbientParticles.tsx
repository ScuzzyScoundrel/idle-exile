import { memo, useMemo } from 'react';

interface ParticleConfig {
  count: number;
  color: string;
  animation: string;
  durationRange: [number, number]; // seconds [min, max]
  sizeRange: [number, number];     // px [min, max]
  opacity: number;
}

const BAND_PARTICLES: Record<number, ParticleConfig> = {
  1: { // Greenlands — floating leaves
    count: 12,
    color: '#34d399',          // emerald-400
    animation: 'particle-leaf',
    durationRange: [10, 15],
    sizeRange: [3, 6],
    opacity: 0.25,
  },
  2: { // Frontier — dust/snow motes
    count: 10,
    color: '#e0f2fe',          // sky-100
    animation: 'particle-dust',
    durationRange: [12, 18],
    sizeRange: [2, 5],
    opacity: 0.2,
  },
  3: { // Contested — rising embers
    count: 14,
    color: '#f97316',          // orange-500
    animation: 'particle-ember',
    durationRange: [6, 10],
    sizeRange: [2, 5],
    opacity: 0.3,
  },
  4: { // Dark Reaches — void wisps
    count: 8,
    color: '#a78bfa',          // violet-400
    animation: 'particle-wisp',
    durationRange: [15, 25],
    sizeRange: [3, 8],
    opacity: 0.2,
  },
  5: { // Shattered Realm — lightning sparks
    count: 10,
    color: '#818cf8',          // indigo-400
    animation: 'particle-spark',
    durationRange: [3, 8],
    sizeRange: [2, 4],
    opacity: 0.3,
  },
  6: { // Endlands — falling ash
    count: 6,
    color: '#7f1d1d',          // red-900
    animation: 'particle-ash',
    durationRange: [20, 30],
    sizeRange: [3, 7],
    opacity: 0.15,
  },
};

// Deterministic pseudo-random from seed (simple hash)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function AmbientParticlesInner({ band }: { band: number }) {
  const config = BAND_PARTICLES[band];

  const particles = useMemo(() => {
    if (!config) return [];
    return Array.from({ length: config.count }, (_, i) => {
      const r1 = seededRandom(i * 7 + band * 31);
      const r2 = seededRandom(i * 13 + band * 47);
      const r3 = seededRandom(i * 19 + band * 59);
      const r4 = seededRandom(i * 23 + band * 67);

      const left = r1 * 100; // % across screen
      const delay = r2 * config.durationRange[1]; // stagger start
      const duration = config.durationRange[0] + r3 * (config.durationRange[1] - config.durationRange[0]);
      const size = config.sizeRange[0] + r4 * (config.sizeRange[1] - config.sizeRange[0]);

      return { left, delay, duration, size, key: `p-${band}-${i}` };
    });
  }, [band, config]);

  if (!config) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-30" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.key}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: config.color,
            opacity: config.opacity,
            animation: `${config.animation} ${p.duration}s ${p.delay}s linear infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}

const AmbientParticles = memo(AmbientParticlesInner);
export default AmbientParticles;
