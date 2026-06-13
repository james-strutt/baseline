import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useUserClock } from '@/hooks/useUserClock';

const NAV_LINK_CLASS =
  'shrink-0 font-body text-[15px] text-ink-muted transition-colors hover:text-ribbon';
const ACTIVE_NAV_PROPS = { className: 'shrink-0 font-body text-[15px] text-ribbon' };

const NAV_ITEMS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/', label: 'Live' },
  { to: '/order-of-play', label: 'Order of Play' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/players', label: 'Players' },
  { to: '/brief', label: 'Brief' },
];

/*
 * Masthead in Libre Caslon with the user's clock always visible (plan §4.3),
 * over the single gilt hairline. Nav drops to a second, scrollable row on
 * narrow screens.
 */
export function Masthead(): ReactElement {
  const { clockLabel } = useUserClock();
  return (
    <header className="border-b border-gilt bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="font-display text-3xl tracking-[0.02em]">
          Baseline
        </Link>
        <span className="ml-auto flex items-center gap-3 lg:order-3">
          <span aria-label="your local time" className="font-score text-sm tabular-nums">
            ◷ {clockLabel}
          </span>
          <ThemeToggle />
        </span>
        <nav
          aria-label="primary"
          className="-mb-1 hidden w-full items-center gap-5 overflow-x-auto pb-1 sm:flex lg:order-2 lg:ml-auto lg:w-auto lg:justify-end"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={NAV_LINK_CLASS}
              activeOptions={{ exact: item.to === '/' }}
              activeProps={ACTIVE_NAV_PROPS}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
