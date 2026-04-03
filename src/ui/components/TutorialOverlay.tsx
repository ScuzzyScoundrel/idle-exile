import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUiStore } from '../../store/uiStore';

interface TutorialOverlayProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TOTAL_STEPS = 10;

interface StepDef {
  title: string;
  text: string;
  /** 'auto' = advances on game-state change, 'next' = manual Next button, 'done' = final Got it */
  advance: 'auto' | 'next' | 'done';
  /** Clicking the banner navigates to this tab */
  navigateTo?: string;
}

const STEPS: Record<number, StepDef> = {
  1: {
    title: 'Welcome, Exile!',
    text: 'Your adventure begins on the Hero tab. Your Bags below hold all your loot \u2014 open them to find your starting gear!',
    advance: 'next',
  },
  2: {
    title: 'Equip Your Gear',
    text: 'Tap an item in your bag, then hit Equip to power up! On mobile, hold an item to quick-equip it.',
    advance: 'auto',
  },
  3: {
    title: 'Weapon Skills',
    text: 'Your weapon unlocks combat Skills! Check the Skills section below your bags. Each skill has damage types (Physical, Fire, Cold, Lightning, Chaos) and levels up through combat.',
    advance: 'next',
  },
  4: {
    title: 'Skill Bar & Talents',
    text: 'Equip skills to your Skill Bar \u2014 tap an empty slot, then pick a skill. Each skill has its own talent tree you can invest points into as it levels up. More slots unlock as you gain levels!',
    advance: 'next',
  },
  5: {
    title: 'Time to Fight!',
    text: 'Head to the World tab to explore zones and battle monsters.',
    advance: 'auto',
    navigateTo: 'world',
  },
  6: {
    title: 'Start an Idle Run',
    text: 'Select a zone and hit Start Idle Run! Your hero fights automatically \u2014 earning XP, gold, and gear drops.',
    advance: 'auto',
  },
  7: {
    title: 'Try Gathering',
    text: 'Toggle to Gathering mode at the top! Collect ores, herbs, and hides to fuel your crafting.',
    advance: 'auto',
  },
  8: {
    title: 'Visit the Forge',
    text: 'Time to craft! Head to the Forge tab to refine raw materials into powerful gear and upgrades.',
    advance: 'auto',
    navigateTo: 'crafting',
  },
  9: {
    title: 'Gear Upgrades Matter',
    text: 'Better gear = faster clears = rarer loot. Sell old items for gold, disenchant them for crafting materials, or stash extras in your bank!',
    advance: 'next',
  },
  10: {
    title: 'Idle Never Stops',
    text: 'Your hero keeps farming even when you close the browser! Whatever you leave running \u2014 Combat or Gathering \u2014 continues in the background. Go forth, Exile!',
    advance: 'done',
  },
};

export default function TutorialOverlay({ activeTab, onTabChange }: TutorialOverlayProps) {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const equipment = useGameStore((s) => s.character.equipment);
  const idleStartTime = useGameStore((s) => s.idleStartTime);
  const idleMode = useGameStore((s) => s.idleMode);
  const advanceTutorial = useUiStore((s) => s.advanceTutorial);

  // Auto-advance: Step 2 → 3 when mainhand equipped
  useEffect(() => {
    if (tutorialStep === 2 && equipment.mainhand) {
      advanceTutorial(3);
    }
  }, [tutorialStep, equipment.mainhand, advanceTutorial]);

  // Auto-advance: Step 5 → 6 when user navigates to world tab
  useEffect(() => {
    if (tutorialStep === 5 && activeTab === 'world') {
      advanceTutorial(6);
    }
  }, [tutorialStep, activeTab, advanceTutorial]);

  // Auto-advance: Step 6 → 7 when idle run starts
  useEffect(() => {
    if (tutorialStep === 6 && idleStartTime !== null) {
      advanceTutorial(7);
    }
  }, [tutorialStep, idleStartTime, advanceTutorial]);

  // Auto-advance: Step 7 → 8 when gathering mode selected
  useEffect(() => {
    if (tutorialStep === 7 && idleMode === 'gathering') {
      advanceTutorial(8);
    }
  }, [tutorialStep, idleMode, advanceTutorial]);

  // Auto-advance: Step 8 → 9 when user navigates to crafting tab
  useEffect(() => {
    if (tutorialStep === 8 && activeTab === 'crafting') {
      advanceTutorial(9);
    }
  }, [tutorialStep, activeTab, advanceTutorial]);

  const step = STEPS[tutorialStep];
  if (!step) return null;

  const handleBannerClick = () => {
    if (step.navigateTo) onTabChange(step.navigateTo);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    advanceTutorial(tutorialStep + 1);
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    advanceTutorial(0);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    advanceTutorial(0);
  };

  const isClickable = !!step.navigateTo;

  return (
    <div className="fixed top-16 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
      <div
        className={`
          bg-yellow-900/95 border-2 border-yellow-500 rounded-xl px-5 py-4
          shadow-lg shadow-yellow-500/20 max-w-md w-full text-center space-y-2
          ${isClickable ? 'pointer-events-auto cursor-pointer' : ''}
          ${step.advance === 'auto' ? 'animate-bounce' : ''}
        `}
        onClick={handleBannerClick}
      >
        {/* Header row: step counter, title, skip button */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 text-[10px] font-bold shrink-0">{tutorialStep}/{TOTAL_STEPS}</span>
          <span className="text-yellow-300 text-sm font-bold flex-1">{step.title}</span>
          <button
            onClick={handleSkip}
            className="text-yellow-700 hover:text-yellow-400 text-xs font-bold pointer-events-auto shrink-0"
            title="Skip tutorial"
          >
            Skip
          </button>
        </div>

        {/* Body */}
        <p className="text-yellow-200/90 text-xs leading-relaxed">{step.text}</p>

        {/* Action buttons */}
        {step.advance === 'next' && (
          <button
            onClick={handleNext}
            className="px-5 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition-colors pointer-events-auto"
          >
            Next
          </button>
        )}
        {step.advance === 'done' && (
          <button
            onClick={handleDone}
            className="px-5 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition-colors pointer-events-auto"
          >
            Got it &mdash; let&apos;s go!
          </button>
        )}
      </div>
    </div>
  );
}
