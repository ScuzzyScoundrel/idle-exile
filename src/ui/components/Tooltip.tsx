import { useRef, useCallback, type ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTooltipContext } from './TooltipProvider';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
}

export default function Tooltip({ content, children, delay = 200 }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();
  const { openTooltip } = useTooltipContext();

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    openTooltip(content, rect);
  }, [content, openTooltip]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    timerRef.current = setTimeout(show, delay);
  }, [isMobile, delay, show]);

  const handleMouseLeave = useCallback(() => {
    // Cancel pending open, but do NOT close — stays open until click-outside
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleTap = useCallback(() => {
    if (!isMobile) return;
    show();
  }, [isMobile, show]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
      className="relative"
    >
      {children}
    </div>
  );
}
