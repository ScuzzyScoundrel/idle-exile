/** Scene wrapper — transparent container so the full-page zone backdrop shows through. */

interface CombatSceneProps {
  zoneId: string;
  children: React.ReactNode;
}

export default function CombatScene({ zoneId: _zoneId, children }: CombatSceneProps) {
  return (
    <div className="rounded-lg overflow-hidden relative bg-gray-950/50 backdrop-blur-sm border border-white/5" style={{ minHeight: '14rem' }}>
      {/* Accent glow */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ boxShadow: 'inset 0 0 30px 8px rgb(var(--theme-accent) / 0.06)' }}
      />
      {/* Content */}
      <div className="relative z-10 p-1">
        {children}
      </div>
    </div>
  );
}
