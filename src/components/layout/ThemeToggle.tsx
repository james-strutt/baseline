import type { ReactElement } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/hooks/useTheme';

/* Hairline glyph in currentColor — never optic. Label names the current state
 * in the courteous-umpire register; the control cycles system → daylight → evening. */
const THEME_PRESENTATION: Record<ThemeMode, { glyph: string; label: string }> = {
  system: { glyph: '◐', label: 'Lighting — following your device' },
  light: { glyph: '☀', label: 'Lighting — daylight' },
  dark: { glyph: '☾', label: 'Lighting — evening' },
};

export function ThemeToggle(): ReactElement {
  const { mode, cycleMode } = useTheme();
  const { glyph, label } = THEME_PRESENTATION[mode];
  return (
    <button
      type="button"
      onClick={cycleMode}
      aria-label={label}
      title={label}
      className="shrink-0 font-body text-base leading-none text-ink-muted transition-colors hover:text-ribbon"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
