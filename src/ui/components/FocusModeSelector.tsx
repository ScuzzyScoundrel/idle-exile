import { useGameStore } from '../../store/gameStore';
import { FOCUS_MODE_DEFS } from '../../data/focusModes';
import type { FocusMode } from '../../types';

export default function FocusModeSelector() {
  const { focusMode, setFocusMode } = useGameStore();

  return (
    <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
      {FOCUS_MODE_DEFS.map((mode) => {
        const isActive = focusMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => setFocusMode(mode.id as FocusMode)}
            className={`
              flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-all
              ${isActive
                ? 'bg-yellow-600 text-black'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
              }
            `}
            title={`${mode.name}: ${mode.description}\nClear Speed: ${mode.clearSpeedMult}x | Items: ${mode.itemDropMult}x | Mats: ${mode.materialDropMult}x | Currency: ${mode.currencyDropMult}x`}
          >
            <span className="block text-center">
              <span className="text-sm">{mode.icon}</span>
              <span className="block text-[10px] mt-0.5">{mode.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
