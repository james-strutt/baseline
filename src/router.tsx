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
import { BriefPage } from '@/routes/BriefPage';
import { LiveHubPage } from '@/routes/LiveHubPage';
import { MatchCentrePage } from '@/routes/MatchCentrePage';
import { OrderOfPlayPage } from '@/routes/OrderOfPlayPage';
import { PlayerPage } from '@/routes/PlayerPage';
import { PlayersPage } from '@/routes/PlayersPage';
import { RankingsPage } from '@/routes/RankingsPage';

function RootLayout(): ReactElement {
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-10 lg:px-10 lg:py-10">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}

function RouteErrorState(): ReactElement {
  return (
    <p className="mx-auto max-w-5xl px-4 py-6 font-body text-sm text-centre-court/70">
      Play suspended — this page hit a fault. Refresh to resume.
    </p>
  );
}

function RouteNotFoundState(): ReactElement {
  return (
    <p className="font-body text-sm text-centre-court/70">
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
