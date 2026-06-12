import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

const TAB_BASE_CLASS =
  'flex h-13 flex-1 items-center justify-center px-1 text-center font-body text-[11px] uppercase leading-[1.2] tracking-[0.08em]';
const TAB_CLASS = `${TAB_BASE_CLASS} text-centre-court/60`;
const ACTIVE_TAB_PROPS = { className: `${TAB_BASE_CLASS} text-ribbon` };

const TAB_ITEMS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/', label: 'Live' },
  { to: '/order-of-play', label: 'Order of Play' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/players', label: 'Players' },
  { to: '/brief', label: 'Brief' },
];

/*
 * The §4.3 mobile tab bar — fixed to the bottom like a native iOS app, with
 * safe-area padding for the home indicator. Hidden from sm upward where the
 * masthead nav takes over.
 */
export function BottomTabBar(): ReactElement {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gilt bg-whites pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="primary"
    >
      <div className="flex">
        {TAB_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={TAB_CLASS}
            activeOptions={{ exact: item.to === '/' }}
            activeProps={ACTIVE_TAB_PROPS}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
