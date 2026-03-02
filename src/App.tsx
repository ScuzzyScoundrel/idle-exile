import { useState, Component, type ReactNode, type ErrorInfo } from 'react';
import TopBar from './ui/components/TopBar';
import NavBar from './ui/components/NavBar';
import TutorialOverlay from './ui/components/TutorialOverlay';
import OfflineProgressModal from './ui/components/OfflineProgressModal';
import ClassPicker from './ui/components/ClassPicker';
import ZoneScreen from './ui/screens/ZoneScreen';
import InventoryScreen from './ui/screens/InventoryScreen';
import CharacterScreen from './ui/screens/CharacterScreen';
import CraftingScreen from './ui/screens/CraftingScreen';
import CombatStatusBar from './ui/components/CombatStatusBar';
import { useGameStore } from './store/gameStore';
import { useTabGuard } from './ui/hooks/useTabGuard';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('React crash:', error, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-red-700 rounded-xl p-8 max-w-lg space-y-4">
            <h2 className="text-xl font-bold text-red-400">Something Crashed</h2>
            <pre className="text-xs text-red-300 bg-gray-800 rounded p-3 overflow-auto max-h-60 whitespace-pre-wrap">
              {this.state.error.message}{'\n'}{this.state.error.stack}
            </pre>
            <div className="flex gap-3">
              <button onClick={() => this.setState({ error: null })}
                className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-semibold">Retry</button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg font-semibold">Reset Save</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const tabBlocked = useTabGuard();
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const offlineProgress = useGameStore((s) => s.offlineProgress);
  const classSelected = useGameStore((s) => s.classSelected);
  const isRunning = useGameStore((s) => s.idleStartTime !== null);
  const [activeTab, setActiveTab] = useState(() =>
    tutorialStep === 1 ? 'inventory' : 'zones'
  );

  // Block duplicate tabs to prevent localStorage conflicts
  if (tabBlocked) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-red-700 rounded-xl p-8 max-w-md text-center space-y-4">
          <div className="text-4xl">&#9888;&#65039;</div>
          <h2 className="text-xl font-bold text-red-400">Game Open in Another Tab</h2>
          <p className="text-gray-400 text-sm">
            Idle Exile is already running in another browser tab. Only one tab can be active
            at a time to prevent save data conflicts.
          </p>
          <p className="text-gray-500 text-xs">
            Close the other tab, then refresh this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show class picker if no class chosen yet (new game or reset)
  if (!classSelected) {
    return <ClassPicker />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar />
      <CombatStatusBar />

      {offlineProgress && <OfflineProgressModal />}

      <TutorialOverlay activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area — padded for top and bottom bars + optional combat status bar.
          All screens stay mounted (hidden via CSS) so local state persists across tab switches. */}
      <main className={`max-w-4xl xl:max-w-7xl mx-auto px-3 ${isRunning ? 'pt-[88px]' : 'pt-16'} pb-20`}>
        <div className={activeTab === 'zones' ? '' : 'hidden'}><ZoneScreen /></div>
        <div className={activeTab === 'inventory' ? '' : 'hidden'}><InventoryScreen /></div>
        <div className={activeTab === 'crafting' ? '' : 'hidden'}><CraftingScreen /></div>
        <div className={activeTab === 'character' ? '' : 'hidden'}><CharacterScreen /></div>
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} tutorialStep={tutorialStep} />
    </div>
  );
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
