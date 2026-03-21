interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tutorialStep?: number;
}

const TABS = [
  { id: 'zones', label: 'Zones', icon: '\uD83C\uDF0D' },
  { id: 'inventory', label: 'Loot', icon: '\uD83C\uDF92' },
  { id: 'crafting', label: 'Craft', icon: '\uD83D\uDD28' },
  { id: 'character', label: 'Hero', icon: '\u2694\uFE0F' },
];

// Which tabs pulse at each tutorial step
const PULSE_MAP: Record<number, string> = {
  1: 'inventory',  // Pulse Loot tab
  2: 'zones',      // Pulse Zones tab
  5: 'crafting',   // Pulse Craft tab
};

export default function NavBar({ activeTab, onTabChange, tutorialStep = 0 }: NavBarProps) {
  const pulseTabId = PULSE_MAP[tutorialStep];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 py-2"
      style={{ background: 'transparent' }}>
      <div className="flex justify-center gap-2 max-w-4xl xl:max-w-7xl mx-auto">
        {TABS.map((tab) => {
          const shouldPulse = tab.id === pulseTabId && activeTab !== tab.id;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex flex-col items-center py-2 px-5 text-xs transition-all
                rounded-lg border backdrop-blur-md
                ${isActive
                  ? 'bg-gray-950/90 border-theme-text-accent/40 text-theme-text-accent nav-glow'
                  : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'}
                ${shouldPulse ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
              `}
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
