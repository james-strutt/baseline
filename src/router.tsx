import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Masthead } from '@/components/layout/Masthead';
import { useScoreAnnouncer } from '@/hooks/useScoreAnnouncer';
import { BriefPage } from '@/routes/BriefPage';
import { LiveHubPage } from '@/routes/LiveHubPage';
import { MatchCentrePage } from '@/routes/MatchCentrePage';
import { OrderOfPlayPage } from '@/routes/OrderOfPlayPage';
import { PlayerPage } from '@/routes/PlayerPage';
import { PlayersPage } from '@/routes/PlayersPage';
import { RankingsPage } from '@/routes/RankingsPage';

function RootLayout(): ReactElement {
  const scoreAnnouncement = useScoreAnnouncer();
  return (
    <div id="app-shell" className="min-h-screen">
      <a href="#main-content" className="sr-only skip-link font-body text-sm">
        Skip to scores
      </a>
      <Masthead />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 outline-none sm:px-6 sm:py-8 sm:pb-10 lg:px-10 lg:py-10"
      >
        <Outlet />
      </main>
      <BottomTabBar />
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {scoreAnnouncement}
      </div>
    </div>
  );
}

function RouteErrorState(): ReactElement {
  return (
    <p className="mx-auto max-w-5xl px-4 py-6 font-body text-sm text-ink-muted">
      Play suspended — this page could not be loaded. Refresh to resume.
    </p>
  );
}

function RouteNotFoundState(): ReactElement {
  return (
    <p className="font-body text-sm text-ink-muted">
      Nothing at this address.{' '}
      <Link to="/" className="text-ribbon underline">
        Back to the live hub.
      </Link>
    </p>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: RouteErrorState,
  notFoundComponent: RouteNotFoundState,
});

const liveHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LiveHubPage,
});

const orderOfPlayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/order-of-play',
  component: OrderOfPlayPage,
});

const rankingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rankings',
  component: RankingsPage,
});

const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

const playerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/$playerId',
  component: PlayerPage,
});

const briefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/brief',
  component: BriefPage,
});

const matchCentreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$fixtureId',
  component: MatchCentrePage,
});

const routeTree = rootRoute.addChildren([
  liveHubRoute,
  orderOfPlayRoute,
  rankingsRoute,
  playersRoute,
  playerRoute,
  briefRoute,
  matchCentreRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
