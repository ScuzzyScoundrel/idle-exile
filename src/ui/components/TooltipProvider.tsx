import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipState {
  content: ReactNode;
  triggerRect: DOMRect;
}

interface TooltipContextValue {
  openTooltip: (content: ReactNode, triggerRect: DOMRect) => void;
  closeTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function useTooltipContext() {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('useTooltipContext must be used inside <TooltipProvider>');
  return ctx;
}

const PADDING = 8;

export default function TooltipProvider({ children }: { children: ReactNode }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);

  const openTooltip = useCallback((content: ReactNode, triggerRect: DOMRect) => {
    openedAtRef.current = Date.now();
    setTooltip({ content, triggerRect });
  }, []);

  const closeTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  // Click-outside dismiss (with 150ms grace period to avoid self-dismiss)
  useEffect(() => {
    if (!tooltip) return;
    const handler = (e: PointerEvent) => {
      if (Date.now() - openedAtRef.current < 150) return;
      if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) return;
      setTooltip(null);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [tooltip]);

  // Compute position with viewport clamping
  let style: React.CSSProperties = {};
  if (tooltip) {
    const { triggerRect } = tooltip;
    const vw = window.innerWidth;

    // Prefer above trigger, flip below if too close to top
    const preferAbove = triggerRect.top > 80;
    const top = preferAbove
      ? triggerRect.top - 4
      : triggerRect.bottom + 4;
    const transform = preferAbove ? 'translateY(-100%)' : 'translateY(0)';

    // Horizontal: center on trigger, clamp within viewport
    let left = triggerRect.left + triggerRect.width / 2;
    // We'll clamp after render via the ref, but do a rough clamp now
    left = Math.max(PADDING + 100, Math.min(left, vw - PADDING - 100));

    style = { position: 'fixed', left, top, transform: `translateX(-50%) ${transform}`, zIndex: 9999 };
  }

  // Post-render viewport clamp (horizontal)
  useEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    if (rect.left < PADDING) {
      el.style.left = `${PADDING + rect.width / 2}px`;
    } else if (rect.right > vw - PADDING) {
      el.style.left = `${vw - PADDING - rect.width / 2}px`;
    }
  }, [tooltip]);

  return (
    <TooltipContext.Provider value={{ openTooltip, closeTooltip }}>
      {children}
      {tooltip && createPortal(
        <div
          ref={tooltipRef}
          className="px-2.5 py-1.5 panel-iron shadow-lg text-xs text-gray-200 max-w-[220px] whitespace-normal"
          style={style}
        >
          {tooltip.content}
        </div>,
        document.body,
      )}
    </TooltipContext.Provider>
  );
}
