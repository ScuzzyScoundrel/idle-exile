import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { isDevMode } from '../../data/devKits';

/** devMode-only floating button (E20 dev tooling): the weapon-kit
 *  picker lives on the character-CREATION screen, which an existing
 *  save never shows — this wipes to a fresh character so creation
 *  (class + weapon kit) is reachable from anywhere, including live. */
export default function DevBadge() {
  const resetGame = useGameStore(s => s.resetGame);
  const [confirming, setConfirming] = useState(false);
  if (!isDevMode()) return null;
  return (
    <div className="fixed bottom-24 right-2 z-50">
      {confirming ? (
        <div className="bg-gray-900 border-2 border-amber-600 rounded-lg p-3 space-y-2 w-60 shadow-xl">
          <div className="text-xs text-amber-300 font-semibold">Wipe save and start a NEW character?</div>
          <div className="text-xs text-gray-400">
            Takes you to class creation — the DEV weapon-kit row lives there.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { resetGame(); setConfirming(false); }}
              className="flex-1 px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs font-bold"
            >
              Wipe &amp; restart
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          title="devMode: start a fresh character (class + weapon kit picker)"
          className="px-2 py-1 rounded-lg border border-amber-600 bg-amber-950/80 text-amber-300 text-xs font-bold shadow-lg hover:bg-amber-900/80"
        >
          DEV ⚒ New Char
        </button>
      )}
    </div>
  );
}
