# Candidate Search

A small candidate-search feature for a recruiting platform: an Express API and a React component, both in TypeScript, backed by in-memory data.

The design is described in [docs/spec.md](docs/spec.md) and [docs/spec-ui-ux.md](docs/spec-ui-ux.md), and the work breakdown in [docs/tasks.md](docs/tasks.md) and [docs/tasks-ui-ux.md](docs/tasks-ui-ux.md).

## Run it

Requires Node 22.

```sh
npm install
npm run dev:server   # API on http://localhost:3001
npm run dev:client   # UI on http://localhost:5173, in a second terminal
```

The Vite dev server proxies `/api` to the API.

```sh
npm test             # server and client tests
npm run typecheck
npm run build
```

## Layout

```
server/src/
  modules/candidates/
    candidate.ts                     types and the list of statuses
    candidateRepository.ts           the data-source interface
    inMemoryCandidateRepository.ts   filtering, ordering and slicing over an array
    seedCandidates.ts                the 3 candidates from the brief plus 25 more
    listCandidates.ts                the use case: validated params in, response out
    parseListCandidatesQuery.ts      raw query string values in, params or field errors out
    candidatesRouter.ts              GET handler: parse, call, respond
  tests/cadidate/                    tests for the three modules above
client/src/
  styles/                            design tokens and global styles
  shared/
    types.ts                         Candidate, CandidateStatus, CandidateResponse
    statusLabel.ts                   display text for a status
    formatRelativeTime.ts            "3 days ago" and the full date for tooltips
  candidates/
    candidatesApi.ts                 fetchCandidates
    *.test.ts(x)                     client tests
  modules/CandidateSearch/Components/
    CandidateSearch.tsx              the component: composes everything below
    FilterBar.tsx                    search input, clear button, status select
    CandidateTable.tsx               rows, status badges, skeleton rows
    StatusBadge.tsx                  the status pill
    Pagination.tsx                   summary, rows per page, Previous and Next
    useCandidates.ts                 request state, cancellation, retry
    useCandidateSearchParams.ts      search state kept in the URL
    useDebouncedCallback.ts          debounce with flush and cancel
```

The route handler holds no filtering or pagination logic. To move to PostgreSQL or an ATS client, write another implementation of `CandidateRepository` and pass it to `createApp({ candidateRepository })`; nothing else changes.

## API

`GET /api/candidates`

| Param | Rule | Default |
| --- | --- | --- |
| `q` | Case-insensitive substring match on name or email | none |
| `status` | `new`, `contacted`, `interviewing` or `hired` | none |
| `page` | Integer, 1 or greater | `1` |
| `pageSize` | Integer from 1 to 50 | `10` |

```sh
curl "http://localhost:3001/api/candidates?q=aisha&status=interviewing"
```

```json
{
  "data": [
    {
      "id": "1",
      "name": "Aisha Khan",
      "email": "aisha@example.com",
      "status": "interviewing",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1
}
```

Invalid parameters return `400` with every bad field listed:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Invalid query parameters",
    "details": [
      { "field": "pageSize", "message": "pageSize must be an integer between 1 and 50" }
    ]
  }
}
```

Unexpected failures return `500` with `{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }`.

## Tests

- `listCandidates.test.ts`: search by name and email, status filter, both combined, ordering, pagination, a page past the end.
- `parseListCandidatesQuery.test.ts`: defaults, valid values, and table-driven invalid values for each parameter.
- `candidatesRouter.test.ts`: the HTTP contract for 200, 400 and 500, through supertest.
- `CandidateSearch.test.tsx`: skeleton loading, rows, debounced search, Enter, status and page-size changes, both clear actions, URL state with back and forward, the past-the-end redirect, pagination bounds and focus, the empty state, and error with retry. `fetch` is replaced by a small in-test stand-in for the API.
- `useCandidateSearchParams.test.ts`: reading, sanitising and writing URL state; push versus replace; back navigation.
- `useDebouncedCallback.test.ts`, `formatRelativeTime.test.ts`, `StatusBadge.test.tsx`: the small units.

Layout, colours and responsive behaviour are not covered by automated tests; jsdom has no layout engine.

## Assumptions

- **Invalid input is rejected, not corrected.** A bad `page`, `pageSize` or `status` returns `400`. This includes `pageSize` above 50: the request fails rather than being silently clamped, so a client never receives a different page size than it asked for.
- **Empty `q` and `status` mean "not provided"**, since HTML forms send empty values. An empty `page` or `pageSize` is invalid.
- **Results are ordered by `updatedAt`, newest first**, then by `id`, so pages are stable. There is no sort parameter.
- **Search is a substring match** on name or email, not fuzzy or tokenised.
- **A page past the last one is valid** and returns an empty `data` array with the real `total`.
- **Search applies as you type**, 300 ms after the last keystroke, or at once on Enter. Status and rows per page (10, 25 or 50) apply as soon as they change. Each of these returns to page 1.
- **The URL holds the search state** (`q`, `status`, `page`, `pageSize`), so a view can be refreshed or linked. Typing replaces the current history entry; status, page and page-size changes add one, so back undoes them.
- **Invalid values in the URL are replaced with defaults in the browser** before any request, so a hand-edited link never triggers the API's `400`. A link to a page past the last one moves to the last page.
- **Dates are relative** ("3 days ago") in the browser's locale, with the full date and time in a tooltip.
- **Light theme only.**
- **Types are duplicated** between server and client rather than shared through a third package, to keep the challenge small.

## Production considerations

- **Data source.** A PostgreSQL repository with a trigram or full-text index for the search, and keyset pagination in place of offsets once the table is large. An ATS client (Bullhorn, HubSpot) fits behind the same interface, with a sync job, caching and rate-limit handling, since ATS APIs are slow and quota-limited.
- **Security.** Authentication and per-tenant authorisation on the endpoint. Candidate records are personal data: access should be audited and names and emails kept out of logs.
- **Abuse limits.** A maximum length on `q` and rate limiting on the endpoint.
- **Observability.** Structured logging with request IDs, in place of the `console.error` in the error handler, plus latency and error-rate metrics.
- **Contract.** A shared types package or an OpenAPI schema so the client and server cannot drift.
- **UX.** Dark mode, column sorting, numbered page links, and visual regression tests for the layout and responsive styles.
