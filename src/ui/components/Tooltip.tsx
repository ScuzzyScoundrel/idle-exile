import { useState, useRef, useCallback, type ReactNode } from 'react';

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

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const x = Math.min(rect.left + rect.width / 2, window.innerWidth - 120);
        const y = rect.top - 4;
        setPos({ x: Math.max(8, x), y });
      }
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} className="relative">
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
