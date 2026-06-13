import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface MembershipPanelProps {
  onContinue(): void;
  onDismiss(): void;
}

const PLUS_BENEFITS = [
  'Unlimited players',
  'Walk-on & set alerts',
  'Live Activities & widgets',
  'The daily Wake-up Brief',
  'No advertising',
];

/*
 * The W11 paywall, shown at the third-favourite moment (plan §9.2). Ribbon
 * purple + gilt is the premium identity, used nowhere else in the free app.
 * A real focus-trapped dialog: focus enters on open, Escape and the backdrop
 * dismiss, focus returns to the opener on close.
 */
export function MembershipPanel({ onContinue, onDismiss }: MembershipPanelProps): ReactElement {
  const dialogRef = useFocusTrap<HTMLDivElement>(onDismiss);

  /* Remove the rest of the app from the accessibility tree and tab order
   * while the dialog is open (aria-modal alone does not do this). */
  useEffect(() => {
    const shell = document.getElementById('app-shell');
    shell?.setAttribute('inert', '');
    return (): void => shell?.removeAttribute('inert');
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-centre-court-deep/70 p-6"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Baseline Plus membership"
        aria-describedby="membership-pitch"
        tabIndex={-1}
        className="w-full max-w-md space-y-5 rounded-plaque border border-gilt bg-canvas p-6 outline-none"
        onClick={(event): void => event.stopPropagation()}
      >
        <div className="rounded-plaque border border-gilt bg-centre-court p-5">
          <p className="font-display text-lg uppercase tracking-[0.18em] text-gilt">
            The members&apos; enclosure has room for more
          </p>
        </div>
        <p id="membership-pitch" className="font-body text-[15px]">
          Two players come with every membership. Plus removes the limit.
        </p>
        <ul className="space-y-1.5 font-body text-[15px]">
          {PLUS_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-baseline gap-2">
              <span className="text-ribbon">♥</span>
              {benefit}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onContinue}
          className="w-full cursor-pointer rounded-plaque bg-ribbon px-4 py-3 font-body text-[15px] text-chalk transition-opacity hover:opacity-90"
        >
          A$54.99/year — two months free
        </button>
        <p className="text-center font-body text-sm text-ink-muted">or A$6.99 monthly</p>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full cursor-pointer pt-1 text-center font-body text-sm text-ink-muted transition-colors hover:text-ribbon"
        >
          Perhaps later
        </button>
      </div>
    </div>,
    document.body,
  );
}
