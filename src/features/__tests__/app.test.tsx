/**
 * Critical UI states, exercised through the real app shell and router.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportResult } from '../../domain/types';
import { persistenceStub, renderAt, sampleImport } from '../../test/renderApp';

let stored: ImportResult | null = null;
vi.mock('../../state/persistence', () => persistenceStub(() => stored));

// jsdom has no layout engine, so matchMedia must be stubbed to pick a breakpoint.
function setViewport(kind: 'mobile' | 'desktop') {
  window.matchMedia = ((query: string) => ({
    matches: kind === 'desktop' && /min-width:\s*(768|1200)px/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

async function renderApp(route = '/') {
  const { App } = await import('../../app/App');
  return renderAt(<App />, route);
}

beforeEach(() => {
  stored = sampleImport();
  setViewport('mobile');
  window.location.hash = '';
});

describe('empty state', () => {
  it('sends someone with no trip to the import screen', async () => {
    stored = null;
    await renderApp('/');
    expect(await screen.findByRole('heading', { name: /upload your trip workbook/i })).toBeInTheDocument();
    expect(screen.getByText(/read entirely inside your browser/i)).toBeInTheDocument();
  });
});

describe('trip home', () => {
  it('shows the trip, travelers and booking progress within one glance', async () => {
    await renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Java 2026/i })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Traveler A/i }).length).toBeGreaterThan(0);
    // Booking progress is on the hero as "done / total".
    expect(screen.getByText(/^\d+ \/ \d+$/)).toBeInTheDocument();
  });

  it('surfaces a warning banner for data issues and links to them', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    const review = await screen.findByRole('button', { name: /^Review/ });
    await user.click(review);
    expect(await screen.findByRole('heading', { level: 1, name: /data issues/i })).toBeInTheDocument();
  });
});

describe('itinerary', () => {
  it('renders a day as a timeline, not a table', async () => {
    await renderApp('/itinerary/2026-08-17');
    expect(await screen.findByRole('heading', { level: 1, name: /Aug 17/i })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bromo sunrise trek/i })).toBeInTheDocument();
  });

  it('marks an activity that runs past midnight', async () => {
    await renderApp('/itinerary/2026-08-17');
    const card = await screen.findByRole('button', { name: /Bromo sunrise trek/i });
    expect(within(card).getByText('23:40')).toBeInTheDocument();
    expect(within(card).getByText('+1')).toBeInTheDocument();
  });

  it('filters the day by traveler and offers a way back', async () => {
    const user = userEvent.setup();
    await renderApp('/itinerary/2026-08-19');
    expect(await screen.findByRole('button', { name: /Gardens by the Bay/i })).toBeInTheDocument();

    // Traveler B has nothing on this day.
    await user.click(screen.getByRole('button', { name: /^Traveler B$/ }));
    expect(await screen.findByText(/Nothing for this traveler/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show all travelers/i }));
    expect(await screen.findByRole('button', { name: /Gardens by the Bay/i })).toBeInTheDocument();
  });

  it('flags an activity with no traveler assignment rather than guessing', async () => {
    const user = userEvent.setup();
    await renderApp('/itinerary/2026-08-18');
    await user.click(await screen.findByRole('button', { name: /Laundry and repack/i }));
    expect(await screen.findByText(/did not say which traveler this is for/i)).toBeInTheDocument();
  });
});

describe('activity detail', () => {
  it('shows base and fallback costs in the original currency with a converted line', async () => {
    const user = userEvent.setup();
    await renderApp('/itinerary/2026-08-17');
    await user.click(await screen.findByRole('button', { name: /Bromo sunrise trek/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /Bromo sunrise trek/i })).toBeInTheDocument();
    expect(screen.getByText(/IDR\s*250,000/)).toBeInTheDocument();
    expect(screen.getByText(/IDR\s*320,000/)).toBeInTheDocument();
    // 1 USD = 15,500 IDR
    expect(screen.getByText(/≈\s*\$16\.13/)).toBeInTheDocument();
  });

  it('hides the source-of-truth detail behind progressive disclosure', async () => {
    const user = userEvent.setup();
    await renderApp('/itinerary/2026-08-17');
    await user.click(await screen.findByRole('button', { name: /Bromo sunrise trek/i }));

    expect(screen.queryByText(/Itinerary, row/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show where this came from/i }));
    expect(await screen.findByText(/Itinerary, row/i)).toBeInTheDocument();
  });

  it('lets an activity be marked done', async () => {
    const user = userEvent.setup();
    await renderApp('/itinerary/2026-08-17');
    await user.click(await screen.findByRole('button', { name: /Bromo sunrise trek/i }));

    await user.click(screen.getByRole('button', { name: /mark as done/i }));
    expect(await screen.findByRole('button', { name: /^Done$/ })).toBeInTheDocument();
  });
});

describe('bookings', () => {
  it('groups by urgency with "book now" first', async () => {
    await renderApp('/bookings');
    const headings = await screen.findAllByRole('heading', { level: 2 });
    const labels = headings.map((h) => h.textContent ?? '');
    expect(labels[0]).toMatch(/Book now/);
    expect(labels.join(' ')).toMatch(/Book 7–14 days before/);
    expect(labels.join(' ')).toMatch(/Book 1–3 days before/);
  });

  it('persists a status the traveler sets', async () => {
    const user = userEvent.setup();
    await renderApp('/bookings');

    const rows = await screen.findAllByRole('button', { name: /change status/i });
    await user.click(rows[0]!);

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Confirmed$/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0);
  });
});

describe('budget', () => {
  it('switches every amount between base and fallback', async () => {
    const user = userEvent.setup();
    await renderApp('/budget');

    expect(await screen.findByText(/group total/i)).toBeInTheDocument();
    const base = screen.getByText(/2 travelers · base scenario/i);
    expect(base).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Fallback$/ }));
    expect(await screen.findByText(/2 travelers · fallback scenario/i)).toBeInTheDocument();
  });

  it('states the exchange-rate assumption rather than hiding the conversion', async () => {
    await renderApp('/budget');
    expect(await screen.findByText(/1 USD = 15,500 IDR/)).toBeInTheDocument();
  });
});

describe('sources', () => {
  it('separates verified sources from assumptions', async () => {
    const user = userEvent.setup();
    await renderApp('/sources');

    expect(await screen.findByText(/Bromo entrance fee/i)).toBeInTheDocument();
    expect(screen.getByText(/Ijen permit price/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Verified/ }));
    expect(await screen.findByText(/Bromo entrance fee/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ijen permit price/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when a search matches nothing', async () => {
    const user = userEvent.setup();
    await renderApp('/sources');
    await user.type(await screen.findByRole('searchbox', { name: /search sources/i }), 'zzzz');
    expect(await screen.findByText(/no sources match/i)).toBeInTheDocument();
  });
});

describe('data issues', () => {
  it('lists issues with their sheet and row, and lets them be reviewed', async () => {
    const user = userEvent.setup();
    await renderApp('/issues');

    expect(await screen.findByText(/No traveler assigned/i)).toBeInTheDocument();
    const openCount = screen.getByRole('button', { name: /^Open \(\d+\)$/ }).textContent ?? '';

    await user.click(screen.getAllByRole('button', { name: /mark as reviewed/i })[0]!);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Open \(\d+\)$/ }).textContent).not.toBe(openCount),
    );
  });

  it('never claims to have changed the workbook', async () => {
    await renderApp('/issues');
    expect(await screen.findByText(/original file is never changed/i)).toBeInTheDocument();
  });
});

describe('navigation', () => {
  it('uses a five-item bottom nav on mobile', async () => {
    await renderApp('/');
    const nav = await screen.findByRole('navigation', { name: /primary/i });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Home', 'Itinerary', 'Budget', 'Bookings', 'More']);
  });

  it('swaps the bottom nav for a sidebar on desktop', async () => {
    setViewport('desktop');
    await renderApp('/');
    const nav = await screen.findByRole('navigation', { name: /primary/i });
    const labels = within(nav).getAllByRole('link').map((l) => l.textContent ?? '');
    expect(labels.some((l) => l.includes('Sources'))).toBe(true);
    expect(labels.some((l) => l.includes('More'))).toBe(false);
  });

  it('keeps every hash route reachable directly, as GitHub Pages requires', async () => {
    for (const [route, heading] of [
      ['/budget', /^Budget$/],
      ['/bookings', /booking checklist/i],
      ['/sources', /sources & assumptions/i],
      ['/issues', /data issues/i],
      ['/more', /^More$/],
    ] as const) {
      const view = await renderApp(route);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      view.unmount();
    }
  });
});
