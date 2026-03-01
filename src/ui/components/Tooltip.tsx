import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
}

export default function Tooltip({ content, children, delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const x = Math.min(rect.left + rect.width / 2, window.innerWidth - 120);
      const y = rect.top - 4;
      setPos({ x: Math.max(8, x), y });
    }
  }, []);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      updatePos();
      setVisible(true);
    }, delay);
  }, [delay, updatePos]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const handleTap = useCallback(() => {
    if (!isMobile) return;
    if (visible) {
      setVisible(false);
    } else {
      updatePos();
      setVisible(true);
    }
  }, [isMobile, visible, updatePos]);

  // Tap-outside dismiss on mobile
  useEffect(() => {
    if (!isMobile || !visible) return;
    const handler = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [isMobile, visible]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={isMobile ? undefined : show}
      onMouseLeave={isMobile ? undefined : hide}
      onClick={handleTap}
      className="relative"
    >
      {children}
      {visible && (
        <div
          className="fixed z-[9999] px-2.5 py-1.5 rounded bg-gray-900 border border-gray-600 shadow-lg text-xs text-gray-200 max-w-[200px] whitespace-normal pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
