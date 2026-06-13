import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'baseline-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const MODE_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

function applyTheme(mode: ThemeMode): void {
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
}

export interface UseThemeReturn {
  mode: ThemeMode;
  cycleMode(): void;
}

/*
 * Light/dark/system theme. The blocking script in index.html sets the initial
 * class before first paint (no 4am white flash); this hook owns subsequent
 * changes and follows the OS while in system mode.
 */
export function useTheme(): UseThemeReturn {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);

  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleChange = (): void => applyTheme('system');
    mediaQuery.addEventListener('change', handleChange);
    return (): void => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const cycleMode = useCallback((): void => {
    setMode((current) => {
      const next = MODE_CYCLE[(MODE_CYCLE.indexOf(current) + 1) % MODE_CYCLE.length] ?? 'system';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Persistence is best-effort (Safari private mode throws).
      }
      return next;
    });
  }, []);

  return { mode, cycleMode };
}
