# Candidate Search: UI and UX Enhancement Spec

Follow-up to [spec.md](./spec.md). The feature works but is unstyled and its interaction model is minimal. This spec adds a visual design and the UX behaviours that the first spec left out of scope.

## 1. Scope

In scope, client only:

- A visual design in plain CSS: layout, typography, table, status badges, styled states.
- Search as you type, replacing the Search button.
- Filters, page and page size stored in the URL.
- A clear-filters control.
- A page-size selector (10, 25, 50).
- Skeleton rows on first load; a dimmed table on later loads.
- Relative dates in the Last updated column.
- A responsive layout that works on a phone.
- Accessibility to WCAG 2.1 AA for everything above.

Out of scope: dark mode, column sorting, numbered page links, a candidate detail view, internationalisation, web fonts, icons libraries, any backend change, any new dependency.

### What this changes in the first spec

| First spec | Now |
| --- | --- |
| Search and status apply on submit | Search applies as you type (debounced); status applies on change |
| "Search" submit button | Removed |
| Page size fixed at 10 | Selectable: 10, 25, 50 |
| URL sync, debounce and page-size selector listed as production considerations | Implemented; remove them from that README list and update the Assumptions list |
| Pagination buttons use `disabled` | They use `aria-disabled` (see section 6) |

The API contract is unchanged.

## 2. Constraints

- No new dependencies. Styling uses a global stylesheet for tokens and base styles, and CSS Modules (built into Vite) for components.
- No router. URL state uses `URLSearchParams` and the History API.
- System font stack. Inline SVG for the two icons needed (search, clear).
- The component must still render and pass its tests in jsdom, which has no layout engine: no logic may depend on measured sizes or media queries evaluated in JavaScript.

## 3. Interaction model

### Search as you type

- The input shows what the user typed immediately. The applied search term updates 300 ms after the last keystroke.
- Pressing Enter applies the current text at once and cancels the pending debounce.
- The applied term is trimmed. If the trimmed value equals the term already applied, no request is made (typing a trailing space does nothing).
- Applying a new term resets to page 1.
- Stale requests are cancelled as today, so a slow response for "ma" can never overwrite the result for "marco".

### Status and page size

- Changing the status select applies immediately and resets to page 1. Any pending debounced text is applied in the same update, so the two never disagree.
- The page-size select offers 10, 25 and 50, defaults to 10, applies immediately and resets to page 1.

### Clear filters

- A clear button (an "×" with the accessible name "Clear search") sits inside the search input whenever it has text. It empties the text, applies at once, and returns focus to the input.
- A "Clear filters" button appears in the filter bar when a search term or a status is applied. It resets both, keeps the page size, and returns to page 1.
- The empty state repeats the "Clear filters" action.

### URL state

The query string is the source of truth for `q`, `status`, `page` and `pageSize`.

- Values equal to the defaults are omitted, so the unfiltered first page is the bare path.
- **Reading**: on load and on `popstate`, state is read from the URL. Invalid values are replaced by defaults before any request is made: an unknown `status` becomes none, a `page` that is not a positive integer becomes 1, a `pageSize` outside 10, 25, 50 becomes 10. The URL is then rewritten with `replaceState` to match. The UI never sends the API a value it knows is invalid.
- **Writing**: text search updates use `replaceState`, so typing does not fill the history. Status, page size, page changes and both clear actions use `pushState`, so the back button undoes them.
- **Back and forward** restore the filters, the page and the text shown in the input.
- **Page past the end**: if a response has `total > 0` but an empty `data` array (a stale or hand-edited link), move to the last page with `replaceState` and fetch that.

## 4. Visual design

### Tokens

Defined as custom properties on `:root` in `client/src/styles/tokens.css`. Components use tokens only, never raw values.

| Group | Tokens |
| --- | --- |
| Colour | `--color-bg: #f8fafc`, `--color-surface: #ffffff`, `--color-border: #e2e8f0`, `--color-text: #0f172a`, `--color-text-muted: #475569`, `--color-accent: #2563eb`, `--color-accent-hover: #1d4ed8`, `--color-danger: #b91c1c`, `--color-danger-bg: #fef2f2`, `--color-focus: #2563eb` |
| Spacing | `--space-1` to `--space-6`: 4, 8, 12, 16, 24, 32 px |
| Type | `--font-sans`: system UI stack; sizes 14, 16, 20, 28 px; weights 400, 500, 600 |
| Shape | `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-pill: 999px`, `--shadow-sm` for the card |

Every text and background pair must meet 4.5:1 contrast; borders and focus rings on controls must meet 3:1.

### Layout

- Page background `--color-bg`. Content is centred in a column with a maximum width of 960 px and 16 px side padding.
- A header with the "Candidates" title and a one-line description.
- A filter bar: search input (grows to fill), status select, "Clear filters" when relevant.
- A results card (`--color-surface`, border, radius, light shadow) containing the table and, in its footer, the results summary, the page-size select and the pagination buttons.

### Table

- Column headers are small, medium weight and muted. Rows have a bottom border and a hover background.
- Name is medium weight. Email is muted and is a `mailto:` link.
- Long names and emails wrap rather than overflow.

### Status badges

A pill with the capitalised status text. Colour supports the text and never replaces it.

| Status | Background | Text |
| --- | --- | --- |
| New | `#dbeafe` | `#1e40af` |
| Contacted | `#fef3c7` | `#92400e` |
| Interviewing | `#ede9fe` | `#5b21b6` |
| Hired | `#dcfce7` | `#166534` |

### Relative dates

- The Last updated column shows a relative time from `Intl.RelativeTimeFormat` with `numeric: "auto"`: "just now" under a minute, then minutes, hours, days (up to 30), months (up to 12), years.
- The value stays inside `<time dateTime={updatedAt}>`, with the full local date and time in its `title`.
- Formatting is a pure function, `formatRelativeTime(iso, now)`, so tests pass a fixed `now`.
- An unparseable date renders as an em dash rather than "Invalid Date".

### Responsive

One DOM, restyled with CSS only.

- **Below 640 px**: the filter bar stacks vertically and controls go full width. The table header is visually hidden and each row becomes a card: name and badge on the first line, email and date below, each value labelled through a `data-label` attribute shown with `::before`. The footer stacks, with Previous and Next side by side at full width.
- Interactive targets are at least 44 px tall on touch layouts.
- No horizontal scrolling at 320 px wide.
- Because `display` changes can strip table semantics in some browsers, the table, rows and cells carry explicit `role` attributes (`table`, `rowgroup`, `row`, `columnheader`, `cell`).

## 5. States

| State | Behaviour |
| --- | --- |
| First load | Skeleton rows in the shape of the table (as many as the page size, at most 10), with a shimmer. Skeletons are `aria-hidden`. |
| Later loads | Current rows stay in place and the table gets `aria-busy="true"`. If the request takes longer than 150 ms the rows dim to 50% opacity; faster responses show no flicker. Filter controls stay usable so the user can keep typing. |
| Success | Table plus footer. Summary reads "Showing 11–20 of 28 candidates". |
| Empty | Inside the card: a heading "No candidates found", a line naming the applied filters (for example: No results for "zzz" with status Hired), and a "Clear filters" button when any filter is applied. |
| Error | Inside the card: a `role="alert"` panel on `--color-danger-bg` with the message and a "Retry" button. The filter bar stays usable. |

A single visually hidden live region (`role="status"`, polite) announces "Loading candidates…" while loading and then the result, for example "28 candidates found" or "No candidates found". Result announcements follow the applied state, so they fire once per debounced search, not per keystroke.

Shimmer and opacity transitions are disabled under `prefers-reduced-motion: reduce`.

## 6. Accessibility

- Every control has a visible label or an accessible name. The search input keeps its visible label.
- A visible focus ring (2 px, `--color-focus`, 2 px offset) on every interactive element, using `:focus-visible`.
- **Pagination buttons use `aria-disabled="true"` in place of the `disabled` attribute**, and ignore activation while disabled. A natively disabled button drops keyboard focus to the document when the user reaches the last page; this keeps focus where it was.
- The pagination group is a `<nav aria-label="Pagination">`. The current position ("Page 2 of 3") is text, not colour.
- The whole feature is operable by keyboard alone, in a logical tab order: search, clear, status, clear filters, table links, page size, Previous, Next.
- Status is conveyed by text; colour is supplementary.
- Zooming to 200% does not hide content or controls.

## 7. Code structure

Under `client/src/`, following the folder structure the project moved to (`Components/` below is `modules/CandidateSearch/Components/`):

| File | Responsibility |
| --- | --- |
| `styles/tokens.css`, `styles/global.css` | Tokens; reset, base typography, focus ring, a `.visually-hidden` utility. Imported once in `main.tsx`. |
| `Components/CandidateSearch.tsx` + `.module.css` | Composition and layout. Still the single exported entry point. |
| `Components/FilterBar.tsx` | Search input, clear button, status select, "Clear filters". |
| `Components/CandidateTable.tsx` | Table, rows, skeleton rows. |
| `Components/StatusBadge.tsx` | The pill. |
| `Components/Pagination.tsx` | Summary, page-size select, Previous and Next. |
| `Components/useCandidateSearchParams.ts` | Reads, sanitises and writes URL state; subscribes to `popstate`. Returns the applied state and setters that choose push or replace. |
| `Components/useDebouncedCallback.ts` | Debounced function with `schedule`, `flush` and `cancel`. |
| `Components/controls.module.css` | Shared input, select and button styles. |
| `shared/formatRelativeTime.ts`, `shared/statusLabel.ts` | Pure formatters. |
| `candidates/*.test.ts(x)` | Tests, beside the existing component test. |

`useCandidates` and `candidatesApi` are unchanged apart from receiving `pageSize` from state. Presentational components take props and hold no fetch logic, so each can be tested alone.

## 8. Tests

Existing component tests are updated for the new model (no Search button, `aria-disabled` on pagination). Debounce tests use fake timers with `userEvent.setup({ advanceTimers })`. Each test resets the URL with `history.replaceState` in `beforeEach`.

`formatRelativeTime.test.ts`: just now, minutes, hours, yesterday, days, months, years, and an invalid date.

`useCandidateSearchParams.test.ts`:

- Reads valid state from the URL; omits defaults when writing.
- Sanitises an unknown status, a bad page and an unsupported page size, and rewrites the URL.
- Text changes replace the history entry; status and page changes push one.
- `popstate` updates the returned state.

`CandidateSearch.test.tsx`:

- First load shows skeleton rows, then data; skeletons are hidden from assistive tech.
- Typing "marco" makes one request after 300 ms, not five.
- Enter applies immediately.
- Typing trailing whitespace makes no request.
- Changing status requests at once with page 1 and includes pending text.
- Changing page size requests `pageSize=25` and page 1.
- The clear button empties the input, refetches and refocuses it.
- "Clear filters" appears only when a filter is applied and resets both.
- Loading the page at `?q=aisha&status=interviewing&page=2` requests exactly that and fills the controls.
- Back after a status change restores the previous results and controls.
- A response with `total > 0` and no rows moves to the last page.
- The empty state names the filters and offers "Clear filters".
- Next on the last page is `aria-disabled`, keeps focus, and clicking it makes no request.
- The live region announces the result count.
- Status badges render the status text.

Visual and responsive behaviour cannot be asserted in jsdom; it is checked manually (section 10).

## 9. Build order

1. Tokens, global styles, page layout and header.
2. `StatusBadge`, `formatRelativeTime` with tests.
3. Split `CandidateSearch` into `FilterBar`, `CandidateTable`, `Pagination`; style them. Behaviour unchanged, existing tests still pass.
4. Skeleton rows, dimmed reloading, styled empty and error states, live region.
5. `useCandidateSearchParams` with tests; move state into the URL.
6. `useDebouncedCallback`; switch to search as you type; remove the Search button.
7. Clear controls and the page-size selector.
8. `aria-disabled` pagination and the focus rules.
9. Responsive styles.
10. Update the tests listed above and the README.

## 10. Done when

Browser verification procedure: the implementer does not start the dev servers. Once the automated checks pass, ask the user to run `npm run dev:server` and `npm run dev:client`, wait for them to confirm, then carry out the browser checks below against the running app.

- `npm run typecheck`, `npm test` and `npm run build` pass from the root, and neither `package.json` has new dependencies.
- In the browser at 1280 px and at 375 px: every state in section 5 looks intentional, nothing overflows, and the layout does not jump between loading and loaded.
- Typing a name filters without pressing anything; refresh, a copied link, and back and forward all reproduce the same view.
- The whole flow can be completed with the keyboard, focus is always visible, and focus is never lost when paging to the first or last page.
- A Lighthouse accessibility audit of the page reports no failures.
- The README's Assumptions and Production considerations match the new behaviour.
