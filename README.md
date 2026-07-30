# Wayfare

Wayfare turns a messy trip-planning Excel workbook into a clear, glanceable day-by-day guide you can follow on your
phone during the trip itself — itinerary, budget, bookings and sources, without ever looking like a spreadsheet.

Everything happens in your browser. Your workbook is never uploaded.

---

## Contents

- [What it does](#what-it-does)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Workbook format](#workbook-format)
- [Recognized sheets and columns](#recognized-sheets-and-columns)
- [How values are interpreted](#how-values-are-interpreted)
- [Languages](#languages)
- [Privacy and local processing](#privacy-and-local-processing)
- [Clearing your data](#clearing-your-data)
- [Architecture](#architecture)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Known limitations](#known-limitations)

---

## What it does

Upload an `.xlsx` or `.xlsm` workbook. Wayfare works out what each sheet is for, extracts what it can, and builds:

| Screen | What it's for |
| --- | --- |
| **Import** | Drag-and-drop upload, detected-sheet list, extraction summary, warnings |
| **Trip home** | Countdown, what's on now or next, today's schedule, budget and booking progress |
| **Itinerary** | Day-by-day vertical timeline with sticky day tabs and traveler filters |
| **Activity detail** | Times, route, practical needs, booking action, base/fallback cost, source link |
| **Budget** | Base/fallback switcher, per-traveler and group totals, category breakdown |
| **Bookings** | Actionable checklist grouped by urgency, with statuses you can set |
| **Sources** | Searchable source library, separating verified facts from assumptions |
| **Data issues** | Everything that couldn't be read cleanly, with the sheet and row to fix |

Anything Wayfare cannot read becomes a reported issue rather than a silent gap or an invented value.

The interface is available in **English** and **Vietnamese** (**More → Appearance → Language**). Your workbook's own
words are never translated — see [Languages](#languages).

## Getting started

Requires **Node 22** or newer.

```bash
npm install
npm run dev
```

Then open the printed URL. There is a **sample workbook** on the import screen if you don't have one to hand.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check and produce a static build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the whole project |
| `npm run typecheck` | Strict TypeScript check, no emit |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run sample` | Regenerate `public/sample-trip.xlsx` |

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` lints, type-checks, tests, builds and deploys on every push to `main`.

### Required repository settings

1. **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.
   (Not "Deploy from a branch" — the workflow uploads an artifact.)
2. **Settings → Actions → General → Workflow permissions**: **Read and write permissions** must be allowed.
   The workflow already requests the specific scopes it needs (`pages: write`, `id-token: write`).
3. Push to `main`. The first run creates the `github-pages` environment automatically.

Your site appears at `https://<username>.github.io/<repository>/`.

If the deploy job fails with **"Branch is not allowed to deploy to github-pages"**, the environment has a deployment
branch rule that does not match the branch you pushed. Fix it under **Settings → Environments → github-pages →
Deployment branches and tags** — either allow `main`, or set the rule to "No restriction". This most often bites when
`main` is not the repository's default branch.

### Why it works under a subpath

- `vite.config.ts` sets `base: './'`, so every asset is referenced relatively. No username or repository name is
  hard-coded anywhere, and the same build works at a domain root, under a project subpath, or opened from disk.
- Routing is hash-based (`#/itinerary/2026-08-17`). The server only ever sees `index.html`, so **refreshing or opening
  a deep link cannot 404** — no SPA fallback or `404.html` trick is needed.
- The build contains no absolute `localhost` URLs.

To deploy somewhere else, just serve `dist/` as static files. No backend, no server-side routes.

## Workbook format

Wayfare expects roughly four kinds of sheet. **None of them are required**, and names do not have to match — an
Overview-only workbook produces a partial trip and tells you what is missing.

- **Overview** — trip-level facts as label/value pairs (title, dates, travelers, exchange rate, budgets)
- **Itinerary** — one row per activity
- **Booking options** — one row per thing to book
- **Sources** — one row per fact or assumption

The workbook's own language is preserved. Wayfare recognizes English, Indonesian and Vietnamese column headings, and
never rewrites your text.

## Recognized sheets and columns

Matching is case-, space-, punctuation- and accent-insensitive: `Start Time`, `start_time` and `START-TIME` are the
same column. When a sheet name is unhelpful, Wayfare falls back to recognising the sheet by its columns — the sample
workbook's sources sheet is called `Sheet4` on purpose to demonstrate this.

### Sheet names

| Role | Recognized names |
| --- | --- |
| Overview | overview, summary, trip, trip info, dashboard, general, ringkasan, tổng quan |
| Itinerary | itinerary, schedule, plan, days, day-by-day, timeline, agenda, jadwal, lịch trình |
| Booking options | booking options, bookings, to book, reservations, checklist, pemesanan |
| Sources | sources, references, links, research, citations, sumber, nguồn |
| Budget | budget, costs, expenses, spend, anggaran, chi phí |

### Itinerary columns

| Field | Recognized headings |
| --- | --- |
| Date | date, tanggal, ngày, datum, fecha |
| Day | day, day number, weekday, hari |
| Start time | start, start time, from, begin, departure, time, jam mulai |
| End time | end, end time, until, finish, arrival, jam selesai |
| Duration | duration, length, how long, lama, thời gian |
| Country | country, negara, quốc gia |
| City / area | city, area, town, region, kota, thành phố |
| Segment type | segment type, type, category, kind, mode, jenis |
| Route / place | route, place, location, from-to, venue, tempat |
| Activity | activity, description, item, title, name, kegiatan, hoạt động |
| Food / toilet / shower / sleep / recovery | food, meal, makan · toilet, wc, restroom · shower, mandi · sleep, overnight, tidur · recovery, rest, istirahat |
| Booking / action | booking, action, required action, to do, reservation |
| Currency | currency, curr, ccy, mata uang |
| Base cost | base cost, base, cost, price, amount, biaya, chi phí |
| Fallback cost | fallback cost, fallback, alt cost, worst case, max cost |
| Converted cost | converted, converted cost, cost usd |
| Source URL | source, source url, url, link, reference, sumber |
| Notes | notes, remarks, comments, catatan, ghi chú |
| Traveler | traveler, travellers, who, person, assigned to, pax, peserta |

### Booking columns

`item` · `recommended plan` · `target price` · `fallback price` · `booking channel` (where, platform, provider, via) ·
`booking timing` (when, book by, deadline) · `confirmation` (booking ref, PNR) · `url` · `status` · `traveler`

**Timing** is bucketed into: Book now · Book 7–14 days before · Book 1–3 days before · Arrange on arrival ·
Pay on site · No action required. Numeric lead times ("book 10 days before") are read directly.

**Status** is read as: Not started · Researching · Ready to book · Booked · Confirmed.

### Source columns

`topic` · `supported fact or assumption` · `url` · `notes`

Sources are classified by what the row actually contains, never asserted:

- **Verified** — has a working link
- **Assumption** — no link, or hedging language ("assumed", "around", "roughly")
- **Needs recheck** — the link doesn't work, or the row flags the fact as unconfirmed

### Overview labels

`trip title` · `destinations` · `start date` / `end date` / `travel dates` · `traveler count` · `traveler A departure
city` · `base currency` · `exchange rate` · `base budget` · `fallback budget` · `per traveler total` · `group total` ·
`assumption` · `warning`

## How values are interpreted

- **Dates** are read as naive calendar dates and converted with pure UTC arithmetic, so a 14 August itinerary shows as
  14 August in every timezone. Excel's 1900 leap-year quirk is reproduced faithfully.
- **Ambiguous numeric dates are read day-first**: `03/07/2026` is 3 July. When the first number can't be a day
  (`07/25/2026`), it's read month-first instead.
- **Numbers** handle both grouping conventions. A single separator followed by exactly three digits is a thousands
  group, so `15,500` and `250.000` are fifteen-and-a-half thousand and two-hundred-fifty thousand — not decimals.
- **Times** accept `07:30`, `7.30`, `7h30`, `7:30 PM` and `7pm`. An **end time before the start** means the activity
  runs past midnight, not that the data is wrong — it's marked "+1 day" and the duration is computed accordingly.
- **Merged cells** are expanded, so a merged day header applies to every row it spans. Blank date cells inherit the
  day above them.
- **Formulas** use Excel's cached result. Error values (`#REF!`, `#N/A`) are treated as empty rather than shown as data.
- **URLs** must be `http(s)` and parse. A cell's real hyperlink beats its display text. Anything else — `javascript:`,
  `data:`, a malformed link — is dropped and reported, and the text is kept visible so nothing is lost.
- **Currencies** are converted only with a rate your workbook declared, in either direction. Wayfare never invents or
  chains a rate; amounts it can't convert are shown on their own items and reported as excluded from totals.
- **Traveler assignment** understands `A`, `Traveler A`, names, `Shared`, `Both`, `All`, `A & B`, `A + B`, `A, B`.
  A blank assignment stays unassigned — it is never quietly turned into "shared".

Nothing is invented. Every unreadable value becomes an entry on the **Data issues** page with its sheet and row.

## Languages

Wayfare's interface ships in **English** and **Vietnamese**, picked under **More → Appearance → Language**. On a first
visit the language is taken from the browser's own preference; after that your choice is remembered on the device and
survives clearing the trip.

The dividing line is deliberate and load-bearing:

| | Language |
| --- | --- |
| Wayfare's own chrome — navigation, buttons, headings, empty states, warnings | Translated |
| Text the traveler wrote — activity names, places, notes, booking actions, source facts, traveler names, category and column wording | **Shown verbatim, always** |
| Prose Wayfare generates *about* your data — data-issue titles and explanations, "Overlaps X", "Day 4 of 13" | Translated |
| Placeholders Wayfare invented — "Traveler A" where the workbook gave only a head count or a bare "A" | Translated |

So a Vietnamese workbook opened with the English interface keeps its Vietnamese activity names, and an English workbook
opened with the Vietnamese interface keeps its English ones. Translating a traveler's own itinerary would be a bug.

Dates, numbers and currency follow the chosen language, but keep your region where the two agree: an American reading
the English interface still gets `Aug 17` and `$16.13`, while the Vietnamese interface gives `17 thg 8` and `16,13 US$`.

### Adding a language

1. Copy `src/i18n/vi.ts`, translate the values, and type the export as `Messages`.
2. Add the code to `LANGUAGES` and `CATALOGUES` in `src/i18n/locale.ts`, and set `meta.locale` to a BCP 47 tag.
3. Check the fonts cover the script — the three families are loaded with their `latin`, `latin-ext` and `vietnamese`
   subsets, so a new script may need another `@fontsource` subset in `src/styles/tokens/fonts.css`.

`Messages` is derived from `src/i18n/en.ts`, so anything missing from a new catalogue is a **compile error**, not a
blank space at runtime. There is no silent fall-back to English.

`src/i18n/en.ts` is the only place UI copy lives; parsing code carries message *codes* (`IssueMessage`,
`ConnectionMessage`) and never prose, which is what makes generated sentences translatable at render time.

## Privacy and local processing

- Your workbook is parsed **entirely in your browser**. It is never uploaded, and no analytics, telemetry or error
  reporting leaves the device.
- The **original file is not stored**. Only the normalized trip is saved, in IndexedDB, so you can come back to it.
- Fonts and icons are bundled with the app, so no third-party requests are made at runtime.
- Parse failures are deliberately not logged — the underlying error can contain fragments of your workbook.
- If your browser blocks local storage (private mode, disabled IndexedDB, full quota), the app says so and runs as an
  in-memory session instead of failing.

## Clearing your data

**More → Your data → Clear trip data.** This deletes the imported trip, your booking statuses and your completed
activities from the device. Your spreadsheet file is untouched and can be re-imported at any time.

To clear it manually: open DevTools → Application → Storage, delete the `wayfare` IndexedDB database and the
`wayfare.preferences.v1` localStorage key. Or use "Clear site data" for the origin.

## Architecture

```
src/
├── domain/          Normalized model (types) + derived views (selectors, money)
├── import/          Workbook parsing — the only place SheetJS is imported
│   ├── aliases.ts     Sheet-name and column-header alias tables
│   ├── grid.ts        Worksheet -> cell grid (merges, formulas, hyperlinks)
│   ├── coerce.ts      Dates, times, money, URLs
│   ├── roles.ts       Which sheet is which
│   ├── mappers/       One per sheet role
│   └── buildTrip.ts   Orchestration -> ImportResult
├── i18n/            Message catalogues (en, vi), active-language runtime
├── design-system/   Reusable components, built from the Wayfare design system
├── features/        One folder per page
├── state/           Trip context + typed IndexedDB/localStorage abstraction
├── app/             Shell, hash router, error boundaries
└── styles/tokens/   Design tokens as CSS custom properties
```

Key decisions:

- **Parsing is completely separate from presentation.** No component knows what a worksheet is; the importer emits
  domain types and nothing else crosses that line.
- **Imported ids are content-derived** (`stableId`), so re-importing a corrected workbook keeps your booking statuses,
  completed activities and dismissed issues.
- **Imported data is immutable.** Your own edits live alongside it as `overrides`, never mixed in.
- **The parser never produces prose.** Anything it needs to say is a typed message code that the UI words in the active
  language, so the same import reads correctly in either language without being re-parsed.
- **The parser is code-split.** SheetJS is ~400 kB and only needed at import time, so the initial load is ~94 kB gzipped.

### About the SheetJS dependency

We depend on `@e965/xlsx`, an npm-registry republication of the official **SheetJS 0.20.3** release. SheetJS stopped
publishing to npm at 0.18.5, and that version carries CVE-2023-30533 (prototype pollution) and CVE-2024-22363
(ReDoS) — both relevant when every parsed workbook is untrusted input.

To use the vendor's own distribution instead:

```bash
npm rm @e965/xlsx
npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

then change the import in `src/import/sheetjs.ts` to `from 'xlsx'`. The API is identical, and that file is the only
place the library is referenced.

## Design system

The UI implements the **Wayfare design system**: Horizon Teal on warm stone neutrals, Plus Jakarta Sans / Public Sans /
IBM Plex Mono, an 8pt grid, and a traveler-identity colour system (indigo A, amber B, teal shared) used consistently
for avatar rings, the 4px `ActivityCard` left border and filter chips. Tokens live in `src/styles/tokens/` as CSS
custom properties; components consume them via CSS Modules.

### Font delivery

The design system loads its three families from Google Fonts. We ship the **same three families** self-hosted via
`@fontsource` (all are SIL OFL 1.1, so redistribution is permitted). This is a delivery change, not a substitution:
it removes a third-party request and keeps the type correct when the app is opened offline in an airport, which is the
product's stated primary context. IBM Plex Mono has no variable build on npm, so its 400/500/600 weights are loaded as
static files — the only weights the system uses.

### Icons

The design system specifies Lucide line icons loaded from a CDN. We use the `lucide-react` package instead — same icon
set, bundled and tree-shaken, so it works offline and makes no third-party request.

### Accessibility deltas from the shipped tokens

Four token values differ from the design system as delivered. Each is the minimum change needed to reach WCAG 2.2 AA,
and each keeps the hue and the role it was given. Measured contrast ratios:

| Token | Was | Now | Why |
| --- | --- | --- | --- |
| `--amber-600` | `oklch(62% .15 65)` | `oklch(52% .13 62)` | Used as `--status-warning`, i.e. as *text* ("Ready to book"). Was **3.24:1** on its own tinted background, now **4.91:1**. `--amber-500` is untouched and still carries every decorative amber fill. |
| `--green-600` | `oklch(52% .14 148)` | `oklch(49% .13 148)` | Same reason. Was **4.41:1** on `--green-100`, now **5.04:1**. |
| `--traveler-a-text`, `--traveler-b-text` | — (new) | `oklch(47% .15 295)`, `oklch(47% .13 55)` | Avatar initials on a tinted disc. Traveler B was **2.84:1**, now **5.95:1**. The identity hues `--traveler-a`/`--traveler-b` are **unchanged**, so avatar rings, the `ActivityCard` stripe and filter chips look exactly as designed. |
| `--border-control` | — (new) | `oklch(62% .012 65)` | WCAG 1.4.11 wants 3:1 for a control's boundary; `--border-default` is **1.58:1**. Now **3.65:1**, used only on form controls and outlined buttons. `--border-subtle`/`--border-default` are unchanged and still draw every decorative card hairline. |

One structural change: the design system's `AppHeader` renders its title as an `h1`, but so does every page beneath it.
Here the header title is a plain element — it is persistent chrome labelling where you are, like a browser tab — and
each page owns the document's single `h1`.

## Accessibility

Targeting WCAG 2.2 AA:

- 44×44 px minimum touch targets on every interactive element
- Visible keyboard focus everywhere (2px primary outline, 2px offset)
- Semantic HTML, one `h1` per page, no skipped heading levels — both verified in the browser
- Status is always icon + label + colour, never colour alone
- Modals and bottom sheets trap focus, close on Escape, lock background scroll and restore focus on close
- A skip link is the first tab stop; focus and scroll move to the main region on navigation
- `prefers-reduced-motion` disables all transitions and animations
- All type is in `rem`, so it scales with the browser's text-size setting
- Converted currency and per-cent values are also given as text, never chart-only
- Actions that depend on an optional browser API (Web Share, Clipboard) are **hidden when unavailable** rather than
  shown as buttons that do nothing

## Known limitations

- **The sample workbook uses fixed dates** (14–26 August 2026). Once that window passes it will read as a past trip,
  and the countdown and "happening now" states won't be exercised. Regenerate it with `npm run sample` after editing
  the dates in `scripts/make-sample-workbook.mjs`.
- **Ambiguous numeric dates are assumed day-first.** A workbook written US-style with days ≤ 12 (`07/03/2026` meaning
  7 March) will be misread. Use ISO dates or real Excel date cells to be unambiguous.
- **Exchange rates are single-hop.** With `USD→IDR` declared, SGD amounts cannot be converted. They are shown on their
  own items and reported as excluded from totals rather than guessed at.
- **Source-to-activity linking is deliberately conservative** — an exact URL match, or a topic appearing as a whole
  phrase in the activity title. Some genuine relationships will be missed; the alternative links nearly everything to
  nearly everything.
- **Per-traveler totals exclude unassigned activities.** Splitting them would mean guessing whose they are.
- **Only the first four travelers get a distinct identity colour**, matching the design system's palette.
- **No editing.** Wayfare reads workbooks; it never writes them. Fix your spreadsheet and re-import — your booking
  statuses and completed activities carry over.
- **Very large workbooks** (>20 MB) are refused, since the whole file is parsed in memory in the browser.
- **Dark mode** is implemented and selectable under More, but the design system ships light as the default and light is
  what has been visually reviewed in depth.
- **The Vietnamese catalogue has not been reviewed by a native speaker.** It is complete and consistent, and the
  register was chosen deliberately (plain imperative, dropped pronouns, no plural inflection), but a native pass would
  be worth having before it is relied on. Every string is in one file, `src/i18n/vi.ts`.
- **The sample workbook is written in English.** The language switch changes Wayfare's own wording, so the sample's
  activity names stay English in the Vietnamese interface — that is the intended behaviour, not a gap, but it means the
  sample does not demonstrate a Vietnamese-language workbook.
