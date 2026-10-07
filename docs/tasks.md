# Candidate Search: Tasks

Implementation tasks for [spec.md](./spec.md). Do them in order; each lists what it depends on. A task is done when its checks pass and `npm run typecheck` is clean.

Conventions that apply to every task:

- Server imports use the `.js` extension (`NodeNext`).
- Import test helpers from `vitest` explicitly; globals are not enabled.
- Tests build their own fixtures and never rely on `seedCandidates`.
- No new dependencies.

## Backend

### T1. Domain types

- [x] Create `server/src/candidates/candidate.ts`.
- Export `CANDIDATE_STATUSES` as a `const` array, `CandidateStatus` derived from it, `Candidate`, and `CandidateResponse`.
- Export an `isCandidateStatus(value: string): value is CandidateStatus` guard for the parser to reuse.

Depends on: nothing. Check: typecheck.

### T2. Repository interface and in-memory implementation

- [x] Create `server/src/candidates/candidateRepository.ts` with `CandidateQuery` and `CandidateRepository` (`findMany` returning `Promise<{ items, total }>`), as in spec section 4.
- [x] Create `server/src/candidates/inMemoryCandidateRepository.ts` exporting `createInMemoryCandidateRepository(candidates: readonly Candidate[])`.
  - Filter: `search` is a case-insensitive substring match on `name` or `email`; `status` is an exact match; both combine with AND.
  - Sort: `updatedAt` descending, then `id` ascending. Sort a copy; never mutate the input array.
  - `total` is the count after filtering and before slicing. `items` is `slice(offset, offset + limit)`.

Depends on: T1. Check: covered by T4's tests.

### T3. Seed data

- [x] Create `server/src/candidates/seedCandidates.ts` exporting `seedCandidates: Candidate[]`.
- The 3 candidates from the challenge, unchanged, plus about 25 more: ids `4` onward, all four statuses represented several times, distinct `updatedAt` ISO strings, `@example.com` emails.

Depends on: T1. Check: typecheck; at least 21 entries so the UI has three pages.

### T4. `listCandidates` use case and tests

- [x] Create `server/src/candidates/listCandidates.ts` with `ListCandidatesParams` and `listCandidates(repository, params)`.
  - Trim `q`; pass it as `search` only when non-empty.
  - `offset = (page - 1) * pageSize`, `limit = pageSize`.
  - Return `{ data, page, pageSize, total }`.
- [x] Create `server/src/candidates/listCandidates.test.ts` using the in-memory repository with a small fixture set:
  - Defaults return everything, newest `updatedAt` first; ties break by `id`.
  - `q` matches name case-insensitively.
  - `q` matches email.
  - `q` with surrounding whitespace behaves like the trimmed value; whitespace-only `q` returns everything.
  - `status` filters.
  - `q` and `status` combine with AND.
  - `page: 2, pageSize: 2` returns the right slice, and `total` is the full match count.
  - A page past the end returns `data: []` with the correct `total`.

Depends on: T2. Check: `npm test -w server`.

### T5. Query parser and tests

- [x] Create `server/src/candidates/parseListCandidatesQuery.ts` with `FieldError`, `ParseResult` and `parseListCandidatesQuery(query: unknown)`.
  - Reads only `q`, `status`, `page`, `pageSize`; ignores other keys.
  - Any of the four that is present but not a string (array or object) is an error for that field.
  - `q`: any string is accepted; empty after trimming means absent.
  - `status`: empty string means absent; otherwise must pass `isCandidateStatus`.
  - `page`: absent means 1; otherwise must match `^\d+$` and be 1 or greater.
  - `pageSize`: absent means 10; otherwise must match `^\d+$` and be from 1 to 50.
  - Collect every field error before returning; do not stop at the first.
  - Keep the page-size limits as named constants (`DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`).
- [x] Create `server/src/candidates/parseListCandidatesQuery.test.ts`:
  - `{}` gives `page: 1`, `pageSize: 10`, no `q`, no `status`.
  - Valid values are parsed to numbers and a typed status.
  - `it.each` over invalid `page`: `"0"`, `"-1"`, `"1.5"`, `"abc"`, `""`.
  - `it.each` over invalid `pageSize`: `"0"`, `"51"`, `"-5"`, `"ten"`, `""`.
  - Boundaries `pageSize: "1"` and `"50"` are accepted.
  - Invalid `status`: `"archived"`, `"Hired"`.
  - Empty `q` and empty `status` are treated as absent.
  - Array values (repeated params) are rejected.
  - Two invalid fields produce two entries in `errors`.

Depends on: T1, T4 (for `ListCandidatesParams`). Check: `npm test -w server`.

### T6. Router, app wiring, error handling and tests

- [x] Create `server/src/candidates/candidatesRouter.ts` exporting `createCandidatesRouter(repository)`.
  - `GET /`: parse `req.query`; on failure respond `400` with the `INVALID_QUERY` body from spec section 3; on success respond `200` with the `listCandidates` result.
  - The handler contains no filtering or pagination logic.
- [x] Update `server/src/app.ts`:
  - `createApp(options?: { candidateRepository?: CandidateRepository })`, defaulting to the in-memory repository with `seedCandidates`.
  - Mount the router at `/api/candidates`. Keep `/api/health`.
  - Register a four-argument error middleware after the routes: log with `console.error`, respond `500` with the `INTERNAL_ERROR` body. Express 5 forwards rejected async handlers to it automatically.
- [x] Create `server/src/candidates/candidatesRouter.test.ts` with supertest and an injected fixture repository:
  - `200` with `data`, `page`, `pageSize`, `total` for a plain request.
  - `q`, `status`, `page` and `pageSize` from the query string reach the result.
  - `400` with `error.code === "INVALID_QUERY"` and a `pageSize` entry in `details` for `pageSize=51`.
  - `400` for `status=archived`.
  - `500` with `error.code === "INTERNAL_ERROR"` when the injected repository rejects; silence `console.error` with a spy in that test.

Depends on: T3, T4, T5. Check: `npm test -w server`, and `curl "localhost:3001/api/candidates?q=aisha"` against `npm run dev:server`.

## Frontend

### T7. Client types and API function

- [x] Create `client/src/candidates/types.ts` with `CANDIDATE_STATUSES`, `CandidateStatus`, `Candidate`, `CandidateResponse`.
- [x] Create `client/src/candidates/candidatesApi.ts` exporting `fetchCandidates(params: { q: string; status: CandidateStatus | ""; page: number; pageSize: number }, signal?: AbortSignal): Promise<CandidateResponse>`.
  - Build the query with `URLSearchParams`; omit `q` and `status` when empty.
  - On a non-2xx response, throw an `Error` whose message is the body's `error.message` when present, otherwise "Failed to load candidates".
  - Let `AbortError` propagate untouched so the hook can ignore it.

Depends on: T6 for the contract only. Check: typecheck; behaviour covered by T9's tests.

### T8. `useCandidates` hook

- [x] Create `client/src/candidates/useCandidates.ts` exporting `useCandidates({ q, status, page, pageSize })` returning `{ data, isLoading, error, retry }`.
  - Fetch in an effect keyed on the four params plus a retry counter.
  - Create an `AbortController` per request and abort it in the effect cleanup.
  - On start: set loading, clear the error, keep the previous `data`.
  - On success: set `data`. On failure: set `error` and clear `data`. On abort: do nothing.
  - `retry` increments the counter to repeat the same request.

Depends on: T7. Check: typecheck; behaviour covered by T9's tests.

### T9. `CandidateSearch` component and tests

- [x] Create `client/src/candidates/CandidateSearch.tsx`:
  - Draft state for the input and select; applied state `{ q, status, page }` passed to `useCandidates` with `pageSize` 10.
  - One `<form>` with a labelled search input, a labelled status select ("All statuses" plus the four statuses, capitalised), and a "Search" submit button. Submit applies both drafts and sets page 1.
  - Table with Name, Email, Status, Last updated. Status capitalised; date in `<time dateTime={updatedAt}>` via `toLocaleDateString(undefined, { dateStyle: "medium" })`.
  - "Previous" and "Next" buttons, "Page X of Y", and the total count. Previous disabled on page 1; Next disabled when `page * pageSize >= total`; both disabled while loading.
  - Loading: `role="status"` "Loading candidates…", with the previous rows left in place.
  - Error: `role="alert"` with the message and a "Retry" button; no table.
  - Empty: "No candidates match your search." when `total` is 0; no table.
- [x] Update `client/src/App.tsx` to render `<CandidateSearch />` under the heading. `App.test.tsx` then needs `fetch` stubbed, or its assertion moved into the component tests.
- [x] Create `client/src/candidates/CandidateSearch.test.tsx`, stubbing `fetch` with `vi.stubGlobal` and restoring it in `afterEach`, using `user-event` and `findBy*` queries:
  - Shows the loading status, then a row with name, email, capitalised status and a `<time>` with the right `dateTime`.
  - Typing a query, choosing a status and submitting calls `fetch` with `q`, `status` and `page=1`.
  - Typing without submitting does not trigger a second `fetch`.
  - With `total: 25`, Previous is disabled on page 1; clicking Next requests `page=2`; on the last page Next is disabled.
  - Submitting a new search from page 2 requests `page=1`.
  - A `400` response shows the server's `error.message` in the alert.
  - A rejected `fetch` shows the alert; clicking Retry refetches and the rows appear.
  - `total: 0` shows the empty message.

Depends on: T8. Check: `npm test -w client`.

## Wrap-up

### T10. README

- [x] Create `README.md` at the root: what this is, prerequisites (Node 22), install, run (two terminals), test, the API contract in brief with one `curl` example, then the Assumptions and Production considerations lists from spec section 7.

Depends on: T6, T9.

### T11. Final verification

- [x] `npm run typecheck`, `npm test` and `npm run build` pass from the root.
- [x] With both dev servers running, check in the browser: initial list, search by name, search by email, status filter, both combined, Next and Previous across three pages, a search with no results.
- [x] Stop the API server, trigger a search, confirm the error state; restart it and confirm Retry recovers.
- [x] `curl "localhost:3001/api/candidates?pageSize=51"` returns `400`; `pageSize=50` returns at most 50 items.
- [x] `git diff` on both `package.json` files shows no dependencies beyond the scaffold.

Depends on: everything above.
