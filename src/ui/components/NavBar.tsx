interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'zones', label: 'Zones', icon: '\uD83C\uDF0D' },
  { id: 'inventory', label: 'Loot', icon: '\uD83C\uDF92' },
  { id: 'crafting', label: 'Craft', icon: '\uD83D\uDD28' },
  { id: 'character', label: 'Hero', icon: '\u2694\uFE0F' },
];

export default function NavBar({ activeTab, onTabChange }: NavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <div className="flex justify-around max-w-4xl mx-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex flex-col items-center py-2 px-4 text-xs transition-colors
              ${activeTab === tab.id ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
