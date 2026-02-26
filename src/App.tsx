import { useState } from 'react';
import TopBar from './ui/components/TopBar';
import NavBar from './ui/components/NavBar';
import TutorialOverlay from './ui/components/TutorialOverlay';
import OfflineProgressModal from './ui/components/OfflineProgressModal';
import ZoneScreen from './ui/screens/ZoneScreen';
import InventoryScreen from './ui/screens/InventoryScreen';
import CharacterScreen from './ui/screens/CharacterScreen';
import CraftingScreen from './ui/screens/CraftingScreen';
import { useGameStore } from './store/gameStore';

function App() {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const offlineProgress = useGameStore((s) => s.offlineProgress);
  const [activeTab, setActiveTab] = useState(() =>
    tutorialStep === 1 ? 'inventory' : 'zones'
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar />

      {offlineProgress && <OfflineProgressModal />}

      <TutorialOverlay activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area — padded for top and bottom bars.
          All screens stay mounted (hidden via CSS) so local state persists across tab switches. */}
      <main className="max-w-4xl mx-auto px-3 pt-16 pb-20">
        <div className={activeTab === 'zones' ? '' : 'hidden'}><ZoneScreen /></div>
        <div className={activeTab === 'inventory' ? '' : 'hidden'}><InventoryScreen /></div>
        <div className={activeTab === 'crafting' ? '' : 'hidden'}><CraftingScreen /></div>
        <div className={activeTab === 'character' ? '' : 'hidden'}><CharacterScreen /></div>
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} tutorialStep={tutorialStep} />
    </div>
  );
}

export default App;
