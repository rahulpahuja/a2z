import { useEffect } from 'react';

const MILESTONES = [25, 50, 75, 100];

// Reports how far through an article a visitor has scrolled, once per milestone.
export function readPercent(rect, viewportHeight) {
  if (!rect || !rect.height) return 0;
  const seen = Math.min(rect.height, Math.max(0, viewportHeight - rect.top));
  return Math.round((seen / rect.height) * 100);
}

export function useReadDepth(ref, onMilestone, enabled) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const fired = new Set();
    let frame = 0;
    const check = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const percent = readPercent(element.getBoundingClientRect(), window.innerHeight);
      MILESTONES.forEach((m) => {
        if (percent >= m && !fired.has(m)) {
          fired.add(m);
          onMilestone(m);
        }
      });
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, onMilestone, enabled]);
}
