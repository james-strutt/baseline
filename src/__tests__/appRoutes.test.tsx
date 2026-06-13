/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { router } from '@/router';

/*
 * Route-level tests against the real router and the sample data port: they
 * pin the product behaviours the plan calls load-bearing — the plaque as the
 * brand object, favourites organising the hub, provisional times wearing "~",
 * and the courteous-umpire copy voice — so a refactor that breaks any of
 * them fails here, not in front of a user.
 */
async function renderRoute(path: string) {
  await router.navigate({ to: path });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('live hub', () => {
  it('invites the user to follow players before any favourites exist', async () => {
    await renderRoute('/');
    expect(await screen.findByText(/Follow the players you love/)).toBeTruthy();
    expect(await screen.findByText(/All courts/)).toBeTruthy();
  });

  it('pins a favourite player to My Matches, with current rankings beside live names', async () => {
    window.localStorage.setItem('baseline.favourite-players', JSON.stringify([9, 7]));
    await renderRoute('/');
    const rankedNames = await screen.findAllByText(/Bellucci \(68\)/);
    expect(rankedNames.length).toBeGreaterThan(0);
    expect(await screen.findByText(/Next — Djokovic v Lehecka/)).toBeTruthy();
  });

  it('reads results aloud winner-first in While you slept', async () => {
    await renderRoute('/');
    expect(await screen.findByText(/Sinner d\. Fonseca 7-6 7-5/)).toBeTruthy();
  });
});

describe('order of play', () => {
  it('marks provisional times with ~ and "not before" — never pretending precision', async () => {
    await renderRoute('/order-of-play');
    expect(await screen.findByRole('heading', { name: 'Order of Play' })).toBeTruthy();
    const provisionalNotes = await screen.findAllByText(/not before/);
    expect(provisionalNotes.length).toBeGreaterThan(0);
  });
});

describe('rankings', () => {
  it('lets the user follow a player straight from the honours board', async () => {
    await renderRoute('/rankings');
    const followButton = await screen.findByRole('button', { name: 'Follow Novak Djokovic' });
    followButton.click();
    expect(await screen.findByRole('button', { name: 'Unfollow Novak Djokovic' })).toBeTruthy();
  });

  it('reaches players beyond the board by name search', async () => {
    await renderRoute('/rankings');
    const searchInput = await screen.findByLabelText('Search rankings by player name');
    fireEvent.change(searchInput, { target: { value: 'fonseca' } });
    expect(await screen.findByText('Joao Fonseca')).toBeTruthy();
  });

  it('raises the membership panel at the third favourite — the §9 paywall moment', async () => {
    window.localStorage.setItem('baseline.favourite-players', JSON.stringify([9, 6]));
    await renderRoute('/rankings');
    const followButton = await screen.findByRole('button', { name: 'Follow Novak Djokovic' });
    followButton.click();
    expect(await screen.findByText(/The members' enclosure has room for more/i)).toBeTruthy();
    (await screen.findByRole('button', { name: /A\$54\.99\/year/ })).click();
    expect(await screen.findByRole('button', { name: 'Unfollow Novak Djokovic' })).toBeTruthy();
  });
});

describe('players', () => {
  it('offers the top-ten tiles and finds anyone by search', async () => {
    await renderRoute('/players');
    const sinnerFollows = await screen.findAllByRole('button', { name: 'Follow Jannik Sinner' });
    expect(sinnerFollows.length).toBeGreaterThan(0);
    const searchInput = await screen.findByLabelText('Search players by name');
    fireEvent.change(searchInput, { target: { value: 'gauff' } });
    expect(await screen.findByText('Coco Gauff')).toBeTruthy();
  });
});

describe('wake-up brief', () => {
  it('reads like the morning paper: results, today in local time, one storyline', async () => {
    await renderRoute('/brief');
    expect(await screen.findByText(/While you slept/i)).toBeTruthy();
    expect(await screen.findByText(/Today, your time/i)).toBeTruthy();
    expect(await screen.findByText(/Djokovic and Lehecka have met twice/)).toBeTruthy();
  });
});

describe('player page', () => {
  it('shows the file for a known player with honours and the next match in local time', async () => {
    await renderRoute('/players/7');
    expect(await screen.findByText('Novak Djokovic')).toBeTruthy();
    expect(await screen.findByText(/24 Grand Slam titles/)).toBeTruthy();
    expect(await screen.findByText(/Next — Djokovic v Lehecka/)).toBeTruthy();
  });

  it('declines gracefully when the player file does not exist yet', async () => {
    await renderRoute('/players/999');
    expect(await screen.findByText(/We do not have this player's file yet/)).toBeTruthy();
  });
});

describe('match centre', () => {
  it('renders the hero plaque with momentum and the H2H storyline for a live match', async () => {
    await renderRoute('/matches/1001');
    expect(await screen.findByText('Momentum')).toBeTruthy();
    expect(await screen.findByText(/Fritz leads the head-to-head 3–1/)).toBeTruthy();
  });

  it('shows a countdown card, not a plaque, for a match that has not begun', async () => {
    await renderRoute('/matches/1010');
    expect(await screen.findByText(/Next — Djokovic v Lehecka/)).toBeTruthy();
    /* A scheduled match opens on its richest tab (head-to-head); the empty
     * point-by-point copy is still reachable from the Points tab. */
    (await screen.findByRole('tab', { name: 'Points' })).click();
    expect(await screen.findByText(/Point-by-point coverage begins when play does/)).toBeTruthy();
  });

  it('serves stats and the head-to-head record behind the W3 tablist', async () => {
    await renderRoute('/matches/1001');
    (await screen.findByRole('tab', { name: 'Statistics' })).click();
    expect(await screen.findByText('Unforced errors')).toBeTruthy();
    (await screen.findByRole('tab', { name: 'Head-to-head' })).click();
    expect(await screen.findByText(/Naples Final/)).toBeTruthy();
  });
});

describe('alert controls', () => {
  it('lets a follower tune alerts in their own terms, with set scores off by default', async () => {
    window.localStorage.setItem('baseline.favourite-players', JSON.stringify([7]));
    await renderRoute('/players/7');
    const everySetToggle = await screen.findByRole('switch', { name: /Every set/ });
    expect(everySetToggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(everySetToggle);
    expect(everySetToggle.getAttribute('aria-checked')).toBe('true');
  });
});

describe('live hub carousel', () => {
  it('pages through the on-court heroes without auto-advancing', async () => {
    await renderRoute('/');
    expect(await screen.findByText(/3rd set/)).toBeTruthy();
    (await screen.findByRole('button', { name: 'Next match' })).click();
    expect(await screen.findByText(/40–40 · 2nd set/)).toBeTruthy();
  });
});
