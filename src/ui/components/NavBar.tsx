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
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <div className="flex justify-around max-w-4xl mx-auto">
        {TABS.map((tab) => {
          const shouldPulse = tab.id === pulseTabId && activeTab !== tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex flex-col items-center py-2 px-4 text-xs transition-colors
                ${activeTab === tab.id ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}
                ${shouldPulse ? 'ring-2 ring-yellow-400 rounded-lg animate-pulse' : ''}
              `}
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
