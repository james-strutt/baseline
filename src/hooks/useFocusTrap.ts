import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/*
 * Make a modal behave as its role promises: focus moves in on open, Tab is
 * trapped, Escape dismisses, and focus is restored to the opener on close.
 */
export function useFocusTrap<T extends HTMLElement>(onDismiss: () => void): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  /* Held in a ref so an unstable onDismiss can't tear down and re-run the
   * trap (which would yank focus back mid-session). */
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    /* Focus the dialog itself (tabIndex -1) so its name/role is announced. */
    container.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        dismissRef.current();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const items = focusables();
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return containerRef;
}
