import { useState } from 'react';
import TopBar from './ui/components/TopBar';
import NavBar from './ui/components/NavBar';
import ZoneScreen from './ui/screens/ZoneScreen';
import InventoryScreen from './ui/screens/InventoryScreen';
import CharacterScreen from './ui/screens/CharacterScreen';

function App() {
  const [activeTab, setActiveTab] = useState('zones');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar />

      {/* Main content area — padded for top and bottom bars.
          All screens stay mounted (hidden via CSS) so local state persists across tab switches. */}
      <main className="max-w-4xl mx-auto px-3 pt-16 pb-20">
        <div className={activeTab === 'zones' ? '' : 'hidden'}><ZoneScreen /></div>
        <div className={activeTab === 'inventory' ? '' : 'hidden'}><InventoryScreen /></div>
        <div className={activeTab === 'character' ? '' : 'hidden'}><CharacterScreen /></div>
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
