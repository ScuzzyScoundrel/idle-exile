import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

interface TutorialOverlayProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const STEP_BANNERS: Record<number, string> = {
  1: 'Click your weapon, then tap Equip!',
  2: 'Head to Zones to find an adventure!',
  3: 'Select a zone, then hit Start Idle Run!',
  4: 'Try Gathering mode! Toggle at the top.',
  5: 'Check out the Craft tab!',
  6: 'Materials \u2192 Refine \u2192 Craft. Gather resources, refine them, then craft gear!',
};

export default function TutorialOverlay({ activeTab, onTabChange }: TutorialOverlayProps) {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const equipment = useGameStore((s) => s.character.equipment);
  const idleStartTime = useGameStore((s) => s.idleStartTime);
  const idleMode = useGameStore((s) => s.idleMode);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);

  // Auto-advance: Step 1 -> 2 when mainhand equipped
  useEffect(() => {
    if (tutorialStep === 1 && equipment.mainhand) {
      advanceTutorial(2);
    }
  }, [tutorialStep, equipment.mainhand, advanceTutorial]);

  // Auto-advance: Step 2 -> 3 when user navigates to zones tab
  useEffect(() => {
    if (tutorialStep === 2 && activeTab === 'zones') {
      advanceTutorial(3);
    }
  }, [tutorialStep, activeTab, advanceTutorial]);

  // Auto-advance: Step 3 -> 4 when idle run starts
  useEffect(() => {
    if (tutorialStep === 3 && idleStartTime !== null) {
      advanceTutorial(4);
    }
  }, [tutorialStep, idleStartTime, advanceTutorial]);

  // Auto-advance: Step 4 -> 5 when gathering mode selected
  useEffect(() => {
    if (tutorialStep === 4 && idleMode === 'gathering') {
      advanceTutorial(5);
    }
  }, [tutorialStep, idleMode, advanceTutorial]);

  // Auto-advance: Step 5 -> 6 when user navigates to crafting tab
  useEffect(() => {
    if (tutorialStep === 5 && activeTab === 'crafting') {
      advanceTutorial(6);
    }
  }, [tutorialStep, activeTab, advanceTutorial]);

  // No banner for step 0 (done) or unknown steps
  if (tutorialStep === 0 || !STEP_BANNERS[tutorialStep]) return null;

  const bannerText = STEP_BANNERS[tutorialStep];

  // Step 2: auto-navigate to zones when banner appears
  const handleBannerClick = () => {
    if (tutorialStep === 2) {
      onTabChange('zones');
    } else if (tutorialStep === 5) {
      onTabChange('crafting');
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
      <div
        className={`
          bg-yellow-900/95 border-2 border-yellow-500 rounded-xl px-4 py-3
          shadow-lg shadow-yellow-500/20 max-w-md text-center
          animate-bounce
          ${tutorialStep === 6 || tutorialStep === 2 || tutorialStep === 5 ? 'pointer-events-auto cursor-pointer' : ''}
        `}
        onClick={handleBannerClick}
      >
        <div className="text-yellow-300 text-sm font-bold">{bannerText}</div>
        {tutorialStep === 6 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              advanceTutorial(0);
            }}
            className="mt-2 px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition-colors pointer-events-auto"
          >
            Got it!
          </button>
        )}
      </div>
    </div>
  );
}
