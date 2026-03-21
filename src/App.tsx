import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import TooltipProvider from './ui/components/TooltipProvider';
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
import { useZoneTheme } from './ui/hooks/useZoneTheme';
import AmbientParticles from './ui/components/AmbientParticles';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; retries: number }> {
  state: { error: Error | null; retries: number } = { error: null, retries: 0 };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React crash:', error, info.componentStack);
    // Auto-retry DOM manipulation errors (caused by browser extensions modifying React's DOM)
    const isDomError = error.message.includes('removeChild') || error.message.includes('insertBefore')
      || error.message.includes('appendChild') || error.message.includes('not a child');
    if (isDomError && this.state.retries < 3) {
      this.setState(prev => ({ error: null, retries: prev.retries + 1 }));
    }
  }
  render() {
    if (this.state.error) {
      const isDomError = this.state.error.message.includes('removeChild') || this.state.error.message.includes('not a child');
      return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-red-700 rounded-xl p-8 max-w-lg space-y-4">
            <h2 className="text-xl font-bold text-red-400">Something Crashed</h2>
            {isDomError && (
              <p className="text-sm text-yellow-400">
                This is usually caused by a browser extension (ad blocker, Grammarly, translate, etc.) modifying the page.
                Try disabling extensions or using incognito mode.
              </p>
            )}
            <pre className="text-xs text-red-300 bg-gray-800 rounded p-3 overflow-auto max-h-60 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex gap-3">
              <button onClick={() => this.setState({ error: null, retries: 0 })}
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
  const band = useZoneTheme();
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const offlineProgress = useGameStore((s) => s.offlineProgress);
  const classSelected = useGameStore((s) => s.classSelected);
  const currentZoneId = useGameStore((s) => s.currentZoneId);
  const isRunning = useGameStore((s) => s.idleStartTime !== null);
  const [activeTab, setActiveTab] = useState(() =>
    tutorialStep === 1 ? 'inventory' : 'zones'
  );

  // DEV: max level for visual testing — remove before merge
  useEffect(() => {
    if (import.meta.env.DEV) {
      const state = useGameStore.getState();
      if (state.character.level < 60) {
        useGameStore.setState({
          character: { ...state.character, level: 60, xp: 0, xpToNext: 0 },
        });
      }
    }
  }, []);

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

  const vignetteClass = band > 0 ? `vignette-band-${band}` : 'vignette-none';

  return (
    <div className="min-h-screen bg-dungeon text-gray-100" data-band={band}>
      {/* Full scene background — unique illustration per zone */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-[2s]"
        style={{
          backgroundImage: `url(/images/backgrounds/${currentZoneId ?? 'idle-tavern'}.png)`,
          opacity: currentZoneId ? 0.3 : 0.35,
        }} />
      {/* Soft vignette to keep edges readable */}
      <div className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.45) 100%)`,
        }} />
      {/* Zone foreground layers — transparent border overlays from top/bottom edges */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-40 transition-all duration-[2s]"
        style={{
          backgroundImage: 'var(--fg-top)',
          backgroundSize: 'auto 100%',
          backgroundPosition: 'center top',
          backgroundRepeat: 'repeat-x',
          height: '60px',
          opacity: 0.45,
        }} />
      {/* Footer frame disabled — header-only for cleaner UI */}
      {/* Zone vignette overlay */}
      <div className={`fixed inset-0 pointer-events-none z-30 vignette-overlay ${vignetteClass}`} />
      {/* Ambient floating particles */}
      {band > 0 && <AmbientParticles band={band} />}

      <TopBar />
      <CombatStatusBar />

      {offlineProgress && <OfflineProgressModal />}

      <TutorialOverlay activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area — padded for top and bottom bars + optional combat status bar.
          All screens stay mounted (hidden via CSS) so local state persists across tab switches. */}
      <main className={`relative z-10 mx-2 rounded-xl ${isRunning ? 'mt-[88px]' : 'mt-14'} mb-16
        bg-gray-950/70 backdrop-blur-lg border border-white/5`}>
        <div className="p-3">
          <div className={activeTab === 'zones' ? '' : 'hidden'}><ZoneScreen /></div>
          <div className={activeTab === 'inventory' ? '' : 'hidden'}><InventoryScreen /></div>
          <div className={activeTab === 'crafting' ? '' : 'hidden'}><CraftingScreen /></div>
          <div className={activeTab === 'character' ? '' : 'hidden'}><CharacterScreen /></div>
        </div>
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} tutorialStep={tutorialStep} />
    </div>
  );
}

export default function AppWithBoundary() {
  return <ErrorBoundary><TooltipProvider><App /></TooltipProvider></ErrorBoundary>;
}
