import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/* Defensive: matchMedia is absent under jsdom and the SSG pre-render (plan §5). */
function matchesReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(matchesReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (): void => setPrefersReduced(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return (): void => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}
