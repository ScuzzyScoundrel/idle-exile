import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import MaterialsPanel from '../crafting/MaterialsPanel';
import RefinePanel from '../crafting/RefinePanel';
import CraftPanel from '../crafting/CraftPanel';
import PatternPanel from '../crafting/PatternPanel';
import ProfessionGearPanel from '../crafting/ProfessionGearPanel';
import MaterialDetailModal from '../crafting/MaterialDetailModal';

type SubTab = 'materials' | 'refine' | 'patterns' | 'craft' | 'gear';

export default function CraftingScreen() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const [subTab, setSubTab] = useState<SubTab>('materials');
  const [traceModalMaterialId, setTraceModalMaterialId] = useState<string | null>(null);

  const handleMaterialClick = (materialId: string) => {
    setTraceModalMaterialId(materialId);
  };

  return (
    <div className="max-w-4xl xl:max-w-7xl mx-auto space-y-3">
      <h2 className="text-lg font-bold text-yellow-400">Crafting</h2>

      {/* 5-tab toggle */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {([
          { key: 'materials' as const, icon: '\uD83E\uDEA8', label: 'Materials' },
          { key: 'refine' as const, icon: '\u2697\uFE0F', label: 'Refine' },
          { key: 'patterns' as const, icon: '\uD83D\uDCDC', label: 'Patterns' },
          { key: 'craft' as const, icon: '\uD83D\uDD28', label: 'Craft' },
          { key: 'gear' as const, icon: '\u2699\uFE0F', label: 'Prof. Gear' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 py-2 px-1 rounded-md text-xs sm:text-sm font-bold transition-all ${
              subTab === tab.key
                ? tab.key === 'craft' ? 'bg-blue-600 text-white'
                  : tab.key === 'refine' ? 'bg-amber-600 text-white'
                  : tab.key === 'patterns' ? 'bg-yellow-700 text-white'
                  : tab.key === 'gear' ? 'bg-teal-700 text-white'
                  : 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            } ${tutorialStep === 6 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'materials' ? <MaterialsPanel onMaterialClick={handleMaterialClick} />
        : subTab === 'refine' ? <RefinePanel />
        : subTab === 'patterns' ? <PatternPanel />
        : subTab === 'gear' ? <ProfessionGearPanel />
        : <CraftPanel onMaterialClick={handleMaterialClick} />}

      {/* Material traceability modal */}
      {traceModalMaterialId && (
        <MaterialDetailModal
          materialId={traceModalMaterialId}
          onClose={() => setTraceModalMaterialId(null)}
        />
      )}
    </div>
  );
}
