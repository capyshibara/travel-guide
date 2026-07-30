/**
 * Vietnamese as a first-class language, not a veneer.
 *
 * The point of these tests is the boundary: Wayfare's own chrome translates, and the
 * traveler's own words — activity names, places, notes, the workbook's column wording —
 * do not. A translation that silently rewrote the itinerary would be a bug, not a
 * feature, so both halves are asserted here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportResult } from '../../domain/types';
import type { Language } from '../../i18n/locale';
import { persistenceStub, renderAt, sampleImport } from '../../test/renderApp';

let stored: ImportResult | null = null;
let language: Language = 'vi';
vi.mock('../../state/persistence', () => persistenceStub(() => stored, () => language));

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
  language = 'vi';
  setViewport('mobile');
  window.location.hash = '';
  document.documentElement.lang = 'en';
});

describe('Vietnamese', () => {
  it('translates the navigation and the document language', async () => {
    await renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Chính' });
    expect(within(nav).getByText('Trang chính')).toBeInTheDocument();
    expect(within(nav).getByText('Lịch trình')).toBeInTheDocument();
    expect(within(nav).getByText('Chi phí')).toBeInTheDocument();
    // Screen readers and hyphenation both depend on this being right.
    expect(document.documentElement.lang).toBe('vi');
  });

  it('leaves the workbook’s own words exactly as the traveler wrote them', async () => {
    await renderApp('/itinerary/2026-08-17');
    // Wayfare's chrome is Vietnamese...
    expect(await screen.findByText(/\d+ hoạt động/)).toBeInTheDocument();
    // ...while the itinerary itself is untouched, English place names and all.
    expect(screen.getByRole('button', { name: /Bromo sunrise trek/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flight SIN → SUB/ })).toBeInTheDocument();
  });

  it('translates the traveler placeholders it invented, since the workbook never named them', async () => {
    await renderApp('/budget');
    // The sample workbook gives departure cities against a bare "A"/"B", so the word
    // "Traveler" is Wayfare's, not the traveler's — it belongs in the catalogue.
    expect(await screen.findByText(/Người A/)).toBeInTheDocument();
    expect(screen.queryByText(/Traveler A/)).not.toBeInTheDocument();
    // The city beside it came from the workbook and is left alone.
    expect(screen.getByText(/Hanoi/)).toBeInTheDocument();
  });

  it('translates parser-generated issue text without inventing data', async () => {
    await renderApp('/issues');
    expect(await screen.findByRole('heading', { level: 1, name: 'Vấn đề dữ liệu' })).toBeInTheDocument();
    // The row reference is generated prose, so it translates; the sheet name does not.
    expect(screen.getAllByText(/dòng \d+/).length).toBeGreaterThan(0);
  });

  it('formats dates and money with Vietnamese conventions', async () => {
    await renderApp('/budget');
    expect(await screen.findByRole('heading', { level: 1, name: 'Chi phí' })).toBeInTheDocument();
    // vi-VN groups thousands with a dot, so a converted total must not read "15,500".
    expect(screen.queryByText(/\d,\d{3}/)).not.toBeInTheDocument();
  });

  it('switches language from the More page and keeps the choice', async () => {
    const user = userEvent.setup();
    language = 'en';
    await renderApp('/more');

    const picker = await screen.findByLabelText('Language');
    expect(screen.getByRole('heading', { level: 1, name: 'More' })).toBeInTheDocument();

    await user.selectOptions(picker, 'vi');
    expect(await screen.findByRole('heading', { level: 1, name: 'Thêm' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('vi');
  });
});
