import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

const SIDEBAR_WIDTH_KEY = 'mengindex_sidebar_width_v1';
const DEFAULT_SIDEBAR_WIDTH = 264;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 520;

function loadSavedSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= MIN_SIDEBAR_WIDTH && n <= MAX_SIDEBAR_WIDTH) {
      return n;
    }
  } catch {
    // Ignore storage read failures
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => loadSavedSidebarWidth());
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  const handleStartSidebarResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeStartXRef.current = e.clientX;
      resizeStartWidthRef.current = sidebarWidth;
      setIsResizingSidebar(true);
    },
    [sidebarWidth]
  );

  const handleResetSidebarWidth = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(DEFAULT_SIDEBAR_WIDTH));
    } catch {
      // Ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartXRef.current;
      const next = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeStartWidthRef.current + delta)
      );
      setSidebarWidth(next);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setSidebarWidth((current) => {
        try {
          localStorage.setItem(SIDEBAR_WIDTH_KEY, String(current));
        } catch {
          // Ignore storage failures
        }
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingSidebar]);

  return {
    sidebarWidth,
    isResizingSidebar,
    handleStartSidebarResize,
    handleResetSidebarWidth,
  };
}
