import { memo, useMemo, type CSSProperties } from 'react';

interface ParticleConfig {
  count: number;
  color: string;
  animation: string;
  durationRange: [number, number];
  sizeRange: [number, number];
  opacity: number;
  /** Extra inline styles applied to each particle for shape/glow variation */
  shapeStyle: CSSProperties;
}

const BAND_PARTICLES: Record<number, ParticleConfig> = {
  1: { // Greenlands — elongated leaf motes
    count: 12,
    color: '#34d399',
    animation: 'particle-leaf',
    durationRange: [10, 15],
    sizeRange: [5, 10],
    opacity: 0.35,
    shapeStyle: {
      borderRadius: '60% 40% 60% 40%', // leaf-like
      boxShadow: '0 0 4px rgba(52, 211, 153, 0.4)',
    },
  },
  2: { // Frontier — soft round snow/dust
    count: 10,
    color: '#e0f2fe',
    animation: 'particle-dust',
    durationRange: [12, 18],
    sizeRange: [3, 7],
    opacity: 0.3,
    shapeStyle: {
      borderRadius: '50%',
      boxShadow: '0 0 6px rgba(224, 242, 254, 0.5)',
    },
  },
  3: { // Contested — bright embers rising
    count: 14,
    color: '#fb923c',
    animation: 'particle-ember',
    durationRange: [6, 10],
    sizeRange: [3, 7],
    opacity: 0.45,
    shapeStyle: {
      borderRadius: '50%',
      boxShadow: '0 0 8px 2px rgba(249, 115, 22, 0.6)',
    },
  },
  4: { // Dark Reaches — glowing void wisps
    count: 8,
    color: '#a78bfa',
    animation: 'particle-wisp',
    durationRange: [15, 25],
    sizeRange: [6, 14],
    opacity: 0.25,
    shapeStyle: {
      borderRadius: '50%',
      boxShadow: '0 0 12px 4px rgba(167, 139, 250, 0.5)',
      filter: 'blur(1px)',
    },
  },
  5: { // Shattered Realm — sharp lightning sparks
    count: 10,
    color: '#a5b4fc',
    animation: 'particle-spark',
    durationRange: [3, 8],
    sizeRange: [2, 5],
    opacity: 0.5,
    shapeStyle: {
      borderRadius: '20%',
      boxShadow: '0 0 6px 2px rgba(129, 140, 248, 0.7)',
    },
  },
  6: { // Endlands — large slow falling ash flakes
    count: 6,
    color: '#991b1b',
    animation: 'particle-ash',
    durationRange: [20, 30],
    sizeRange: [6, 12],
    opacity: 0.2,
    shapeStyle: {
      borderRadius: '40% 60% 50% 50%',
      boxShadow: '0 0 3px rgba(127, 29, 29, 0.3)',
    },
  },
};

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
      const r5 = seededRandom(i * 29 + band * 73);

      const left = r1 * 100;
      const delay = r2 * config.durationRange[1];
      const duration = config.durationRange[0] + r3 * (config.durationRange[1] - config.durationRange[0]);
      const size = config.sizeRange[0] + r4 * (config.sizeRange[1] - config.sizeRange[0]);
      // Aspect ratio jitter: width can be 0.6x-1.4x of height for organic feel
      const widthMult = 0.6 + r5 * 0.8;

      return { left, delay, duration, size, widthMult, key: `p-${band}-${i}` };
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
            width: p.size * p.widthMult,
            height: p.size,
            backgroundColor: config.color,
            opacity: config.opacity,
            animation: `${config.animation} ${p.duration}s ${p.delay}s linear infinite`,
            willChange: 'transform',
            ...config.shapeStyle,
          }}
        />
      ))}
    </div>
  );
}

const AmbientParticles = memo(AmbientParticlesInner);
export default AmbientParticles;
