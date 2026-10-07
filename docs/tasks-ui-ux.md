# Candidate Search UI and UX: Tasks

Implementation tasks for [spec-ui-ux.md](./spec-ui-ux.md). Do them in order. A task is done when its checks pass, `npm run typecheck -w client` is clean and `npm test -w client` is green; no task may leave the suite red.

Implementation notes (differences from the task text below):

- Files live in the structure the project moved to during implementation: components and hooks in `client/src/modules/CandidateSearch/Components/`, formatters in `client/src/shared/`, tests in `client/src/candidates/`.
- The debounce hook is `useDebouncedCallback` (schedule, flush, cancel) rather than `useDebouncedValue`: debouncing the action avoids a chain of effects reacting to a debounced value.
- The error tests assert the generic "Failed to load candidates" message, because `candidatesApi.ts` currently replaces every error with it.

Conventions that apply to every task:

- Client only. No file under `server/` changes.
- No new dependencies. No router.
- Components use tokens (`var(--…)`), never raw colour, spacing or radius values.
- Class names come from CSS Modules. Tests query by role, label and text, never by class name.
- No logic may read layout or evaluate media queries in JavaScript.
- Import test helpers from `vitest` explicitly.

## Foundations

### U1. Tokens, global styles and page shell

- [x] Create `client/src/styles/tokens.css` with the custom properties from spec section 4 (colour, spacing, type, shape).
- [x] Create `client/src/styles/global.css`: box-sizing reset, body background and font, base heading and link styles, the `:focus-visible` ring (2 px `--color-focus`, 2 px offset), a `.visually-hidden` utility, and a `prefers-reduced-motion: reduce` rule that removes animations and transitions.
- [x] Import both once in `client/src/main.tsx`.
- [x] Update `client/src/App.tsx` with the page shell: centred column (max 960 px, 16 px side padding), header with the "Candidates" title and a one-line description. Add `App.module.css`.

Depends on: nothing. Check: existing tests still pass; build succeeds with the CSS bundled.

### U2. `formatRelativeTime`

- [x] Create `client/src/candidates/formatRelativeTime.ts` exporting `formatRelativeTime(iso: string, now: Date, locale?: string): string`.
  - Under 1 minute: "just now". Then minutes, hours, days (up to 30), months (up to 12), years, via `Intl.RelativeTimeFormat` with `numeric: "auto"`.
  - Unparseable input returns "—".
- [x] Export `formatFullDateTime(iso)` for the `title` attribute (local date and time, medium style); also returns "—" for invalid input.
- [x] Create `formatRelativeTime.test.ts` with a fixed `now` and locale `"en"`: just now, minutes, hours, "yesterday", days, months, years, invalid date.

Depends on: nothing. Check: tests.

### U3. `StatusBadge`

- [x] Create `client/src/candidates/StatusBadge.tsx` and `.module.css`: a pill with the capitalised status text and the colour pair for that status from spec section 4.
- [x] Move the `capitalise` helper out of `CandidateSearch.tsx` to a shared spot so the badge and the status select both use it.
- [x] Test: each status renders its text.

Depends on: U1. Check: tests.

## Restructure and style (behaviour unchanged)

### U4. Split `CandidateSearch` into presentational components

- [x] Create `FilterBar.tsx`, `CandidateTable.tsx` and `Pagination.tsx` in `client/src/candidates/`, each taking props and holding no fetch logic. `CandidateSearch.tsx` composes them and remains the only exported entry point used by `App`.
- [x] `CandidateTable` uses `StatusBadge`, renders the email as a `mailto:` link, and shows the date with `formatRelativeTime` inside `<time dateTime title>`. It accepts a `now` prop defaulting to the current time so tests can fix it.
- [x] Add explicit roles to the table markup: `table`, `rowgroup`, `row`, `columnheader`, `cell`. Add a `data-label` attribute to each cell with its column name.
- [x] Behaviour stays exactly as it is: Search button, submit-to-apply, fixed page size, `disabled` pagination buttons.

Depends on: U2, U3. Check: the existing `CandidateSearch.test.tsx` passes unmodified, apart from the date cell if it asserted on visible date text.

### U5. Desktop styling

- [x] Add `.module.css` files for `CandidateSearch`, `FilterBar`, `CandidateTable` and `Pagination`.
- [x] Filter bar: search input grows to fill, with an inline SVG search icon; status select beside it.
- [x] Results card: surface background, border, radius, light shadow. Table inside; footer with the summary and pagination.
- [x] Table: muted small headers, row borders, hover background, medium-weight names, muted email links, wrapping for long values.
- [x] Buttons and form controls: consistent height, border, radius, hover and disabled looks.

Depends on: U4. Check: tests pass; build succeeds.

## States

### U6. Loading, empty, error and announcements

- [x] Skeleton rows on first load (no data yet): `min(pageSize, 10)` rows in the table's shape with a shimmer, all `aria-hidden`.
- [x] Later loads: keep current rows, set `aria-busy="true"`, and dim to 50% opacity through a CSS transition with a 150 ms delay so fast responses do not flicker. Filter controls stay enabled while loading.
- [x] Replace the visible loading paragraph with a single visually hidden `role="status"` live region: "Loading candidates…" while loading, then "N candidates found" / "1 candidate found" / "No candidates found".
- [x] Results summary in the footer: "Showing 11–20 of 28 candidates".
- [x] Empty state inside the card: heading "No candidates found" plus a line naming the applied filters (search term in quotes, status capitalised).
- [x] Error state inside the card: `role="alert"` panel on `--color-danger-bg` with the message and "Retry". The filter bar stays usable.
- [x] Update tests: skeleton rows appear first and are hidden from assistive tech; the live region announces loading and then the count; the summary text; the empty state names the filters. Adjust existing assertions that relied on the old loading paragraph or empty message.

Depends on: U5. Check: tests.

## Interaction model

### U7. URL state

- [x] Create `client/src/candidates/useCandidateSearchParams.ts`.
  - State: `{ q, status, page, pageSize }`, read from `window.location.search` on mount and on `popstate`.
  - Sanitise on read: unknown `status` becomes `""`; `page` not a positive integer becomes 1; `pageSize` not in 10, 25, 50 becomes 10; `q` is trimmed. If sanitising changed anything, rewrite the URL with `replaceState`.
  - Write: an `update(patch, { history: "push" | "replace" })` function. Serialise with defaults omitted, so the unfiltered first page is the bare path. Skip the history call when the URL would not change.
  - Export the page-size options and defaults as constants.
- [x] Create `useCandidateSearchParams.test.ts`: reads valid state; omits defaults; sanitises each bad value and rewrites the URL; replace vs push (assert on `history.length` or spies); `popstate` updates state. Reset the URL in `beforeEach`.
- [x] Wire it into `CandidateSearch`: applied filters and page now come from the hook. Submitting the form pushes; Previous and Next push. The input and select initialise from, and resync to, the URL state.
- [x] Page past the end: when a response has `total > 0` and empty `data`, replace to the last page.
- [x] Add `history.replaceState(null, "", "/")` to `beforeEach` in `CandidateSearch.test.tsx` and `App.test.tsx`.
- [x] Component tests: loading at `?q=aisha&status=interviewing&page=2` requests exactly that and fills the controls; an invalid URL is sanitised before the request; back after a page change restores the previous page; the past-the-end redirect.

Depends on: U6. Check: tests.

### U8. Search as you type

- [x] Create `client/src/candidates/useDebouncedValue.ts`: returns the debounced value plus `flush()` and `cancel()`; clears its timer on unmount. Unit test with fake timers.
- [x] In `CandidateSearch`: the input text is local state; 300 ms after the last change the trimmed text is applied with `replace` and page 1. If the trimmed text equals the applied term, do nothing.
- [x] Enter flushes immediately. Keep the `<form>` with `onSubmit` for this; remove the Search button.
- [x] Status change applies immediately with `push` and page 1, and includes any pending text in the same update (flush, do not drop).
- [x] On `popstate`, cancel any pending debounce and set the input text from the URL.
- [x] Update tests, using `vi.useFakeTimers()` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`: typing "marco" makes one request after 300 ms; Enter applies at once; trailing whitespace makes no request; status change requests immediately with page 1 and the pending text; typing does not add history entries. Rewrite the tests that clicked "Search".

Depends on: U7. Check: tests.

### U9. Clear controls and page-size selector

- [x] Clear button inside the search input, shown when it has text: inline SVG "×", accessible name "Clear search". Empties the text, cancels the debounce, applies at once with `push`, returns focus to the input.
- [x] "Clear filters" button in the filter bar, shown when a search term or status is applied: resets both, keeps the page size, page 1, `push`. Repeat it in the empty state.
- [x] Page-size select in the footer, labelled "Rows per page", options 10, 25, 50: applies immediately, page 1, `push`. Pass `pageSize` from URL state to `useCandidates`; remove the `PAGE_SIZE` constant. Skeleton row count and the summary follow it.
- [x] Tests: the clear button empties, refetches and refocuses; "Clear filters" is absent with no filters, present with one, and resets both; the empty state offers it; changing page size requests `pageSize=25` and `page=1`; `?pageSize=25` in the URL is honoured.

Depends on: U8. Check: tests.

## Accessibility and responsive

### U10. Pagination focus and keyboard pass

- [x] Switch Previous and Next from `disabled` to `aria-disabled="true"`, with the click handler ignoring activation while disabled or loading, and a disabled look driven by the `[aria-disabled="true"]` selector.
- [x] Walk the tab order in the markup: search, clear, status, clear filters, table links, page size, Previous, Next. Fix any DOM order that breaks it.
- [x] Confirm every control has a visible label or accessible name, and that the focus ring is visible on each (including the clear button inside the input).
- [x] Tests: Next on the last page has `aria-disabled="true"`, keeps focus after the click that got there, and clicking it again makes no request. Replace the old `toBeDisabled` / `toBeEnabled` assertions.

Depends on: U9. Check: tests.

### U11. Responsive styles

- [x] Below 640 px, CSS only:
  - Filter bar stacks; controls go full width.
  - Table header visually hidden (not `display: none`, so it stays in the accessibility tree). Each row becomes a card: name and badge on the first line, email and date below, labels from `data-label` via `::before`.
  - Footer stacks; Previous and Next sit side by side at full width.
  - Interactive targets at least 44 px tall.
- [x] No horizontal scroll at 320 px: check long emails wrap (`overflow-wrap: anywhere`).
- [x] Skeleton rows follow the card shape at this width.

Depends on: U10. Check: tests pass; build succeeds. Visual confirmation happens in U13.

## Wrap-up

### U12. README and first-spec alignment

- [x] Update `README.md`:
  - Layout section: add the new files.
  - Tests section: add the new test files and cases.
  - Assumptions: replace "Search applies on submit" and "Page size is fixed at 10" with the new behaviour; add the URL rules (invalid values sanitised in the browser, typing replaces history, discrete changes push, past-the-end goes to the last page) and "relative dates use the browser locale".
  - Production considerations: remove debounced search, URL-synced filters and the page-size selector from the UX bullet; add dark mode, column sorting and visual regression tests.
- [x] Add a one-line note at the top of `docs/spec.md` section 5 pointing to `spec-ui-ux.md` for the superseded behaviours.

Depends on: U11.

### U13. Final verification

- [x] `npm run typecheck`, `npm test` and `npm run build` pass from the root.
- [x] Neither `package.json` has dependencies beyond the scaffold.
- [ ] **Stop and ask the user to run `npm run dev:server` and `npm run dev:client`. Do not start them yourself. Continue only after they confirm.**
- [ ] In the browser at 1280 px wide:
  - First load shows skeletons then the table, with no layout jump.
  - Typing a name filters without pressing anything; Enter applies at once.
  - Status change, page-size change, Next and Previous each update the URL and the results.
  - Refresh reproduces the view; back and forward step through status and page changes and restore the input text.
  - Hand-edited URLs: `?status=foo&page=abc&pageSize=7` loads the default view with a cleaned URL; `?page=99` lands on the last page.
  - Clear search and "Clear filters" both work; a search with no matches shows the empty state naming the filters.
  - Keyboard only: complete a search, filter and page to the last page; the focus ring is always visible and focus stays on Next when it becomes disabled.
- [ ] Resize to 375 px and to 320 px: rows are cards, controls are full width, nothing scrolls horizontally.
- [ ] Ask the user to stop the API server; confirm the styled error state; ask them to restart it; confirm Retry recovers.
- [ ] Run a Lighthouse accessibility audit on the page; fix any failures and rerun.
- [ ] Tick off every task in this file.

Depends on: everything above.
