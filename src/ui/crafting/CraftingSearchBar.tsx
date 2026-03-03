interface CraftingSearchBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  haveMats: boolean;
  onHaveMatsToggle: () => void;
  showing: number;
  total: number;
}

export default function CraftingSearchBar({
  search, onSearchChange, haveMats, onHaveMatsToggle, showing, total,
}: CraftingSearchBarProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-2 py-1.5">
      {/* Search input */}
      <div className="relative flex-1">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
          {'\uD83D\uDD0D'}
        </span>
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full bg-gray-700 text-xs text-gray-200 rounded pl-7 pr-2 py-1.5 border border-gray-600 focus:border-gray-400 focus:outline-none placeholder-gray-500"
        />
      </div>

      {/* Have Mats toggle */}
      <button
        onClick={onHaveMatsToggle}
        className={`px-2 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ${
          haveMats
            ? 'bg-green-700 text-green-200 ring-1 ring-green-500'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
      >
        Have Mats
      </button>

      {/* Count */}
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {showing}/{total}
      </span>
    </div>
  );
}
