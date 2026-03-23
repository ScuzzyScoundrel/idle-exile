import { useState } from 'react';

/** Collapsible combat data drawer.
 *  Default: single-line DPS summary. Tap to expand full content. */

interface CombatDataDrawerProps {
  summaryText: string;
  children: React.ReactNode;
}

export default function CombatDataDrawer({ summaryText, children }: CombatDataDrawerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="panel-inset rounded-lg overflow-hidden">
      {/* Summary bar — always visible, tappable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-[10px] text-gray-500">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="text-[11px] text-gray-400 font-mono truncate flex-1">{summaryText}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-2 pb-1.5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
