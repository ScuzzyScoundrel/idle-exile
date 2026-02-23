import { useState } from 'react';
import TopBar from './ui/components/TopBar';
import NavBar from './ui/components/NavBar';
import ZoneScreen from './ui/screens/ZoneScreen';
import InventoryScreen from './ui/screens/InventoryScreen';
import CraftingScreen from './ui/screens/CraftingScreen';
import CharacterScreen from './ui/screens/CharacterScreen';

function App() {
  const [activeTab, setActiveTab] = useState('zones');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar />

      {/* Main content area — padded for top and bottom bars */}
      <main className="max-w-lg mx-auto px-3 pt-16 pb-20">
        {activeTab === 'zones' && <ZoneScreen />}
        {activeTab === 'inventory' && <InventoryScreen />}
        {activeTab === 'crafting' && <CraftingScreen />}
        {activeTab === 'character' && <CharacterScreen />}
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
