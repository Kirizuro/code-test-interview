# Candidate Search: Implementation Spec

Spec for the code challenge: a candidate search feature with an Express API and a React component, both in TypeScript, backed by in-memory data.

## 1. Scope

In scope:

- `listCandidates` backend function, exposed at `GET /api/candidates`.
- `CandidateSearch` React component with search, status filter, pagination, loading, error and empty states.
- Tests on both sides.
- README section with assumptions and production considerations.

Out of scope: authentication, a real ATS or database, a sort parameter, debounced search, syncing filters to the URL, a page-size selector, visual styling beyond a readable table, a shared types package.

## 2. Starting point

The repo is an npm workspace with two packages, already scaffolded and passing.

| Package | Stack | Notes |
| --- | --- | --- |
| `server` | Express 5, TypeScript, Vitest, supertest | ESM with `NodeNext`: relative imports need the `.js` extension. `createApp()` in `src/app.ts`, port 3001. |
| `client` | Vite, React 19, TypeScript, Vitest, jsdom, React Testing Library, user-event | Dev server proxies `/api` to `http://localhost:3001`. |

Root scripts: `npm run dev:server`, `npm run dev:client`, `npm test`, `npm run typecheck`, `npm run build`.

No new dependencies are needed. Do not add any (no zod, msw, axios, react-query).

## 3. API contract

### `GET /api/candidates`

| Param | Rule | Default |
| --- | --- | --- |
| `q` | String. Trimmed. Case-insensitive substring match against `name` or `email`. Empty after trimming means no search. | none |
| `status` | One of `new`, `contacted`, `interviewing`, `hired` (exact, lowercase). Empty string means no filter. | none |
| `page` | Integer, 1 or greater. | `1` |
| `pageSize` | Integer from 1 to 50. | `10` |

`q` and `status` combine with AND. Results are ordered by `updatedAt` descending, then `id` ascending as a tie-breaker, so pagination is stable.

### Success: `200`

```ts
type CandidateResponse = {
  data: Candidate[];
  page: number;
  pageSize: number;
  total: number; // matches before pagination
};
```

A `page` past the last page is valid: `200` with `data: []` and the real `total`.

### Validation failure: `400`

Validation is strict. Invalid values are rejected, never silently corrected. All invalid fields are reported in one response.

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

Invalid cases:

- `page`: not matching `^\d+$`, or less than 1. Examples: `0`, `-1`, `1.5`, `abc`, empty string.
- `pageSize`: not matching `^\d+$`, less than 1, or greater than 50. `pageSize=51` is a `400`, not clamped to 50.
- `status`: any non-empty value outside the four statuses, including wrong case (`Hired`).
- Any of the four params supplied more than once or as a nested value (Express parses these as arrays or objects).

Unknown query params are ignored.

### Unexpected failure: `500`

An Express error-handling middleware returns `{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }` and logs the error. No stack traces or internal messages in the response.

## 4. Backend design

All files under `server/src/candidates/` unless noted.

| File | Responsibility |
| --- | --- |
| `candidate.ts` | `CandidateStatus`, `Candidate`, `CandidateResponse`, and `CANDIDATE_STATUSES` (a `const` array the status type is derived from, reused by validation). |
| `candidateRepository.ts` | The `CandidateRepository` interface. This is the seam a PostgreSQL or ATS implementation replaces. |
| `inMemoryCandidateRepository.ts` | `createInMemoryCandidateRepository(candidates)`. Filters, sorts and slices an array. |
| `seedCandidates.ts` | The 3 candidates from the challenge plus about 25 more (ids `4` onward, all four statuses, distinct `updatedAt` values) so pagination is visible in the UI. |
| `listCandidates.ts` | The use case. Turns validated params into a repository query and shapes the response. |
| `parseListCandidatesQuery.ts` | Turns the raw Express query into validated params or a list of field errors. Pure function, no Express types beyond `unknown` input. |
| `candidatesRouter.ts` | `createCandidatesRouter(repository)`. Parse, call `listCandidates`, respond. No filtering or pagination logic here. |

```ts
// candidateRepository.ts
export type CandidateQuery = {
  search?: string;          // already trimmed, non-empty
  status?: CandidateStatus;
  offset: number;
  limit: number;
};

export interface CandidateRepository {
  findMany(query: CandidateQuery): Promise<{ items: Candidate[]; total: number }>;
}

// listCandidates.ts
export type ListCandidatesParams = {
  q?: string;
  status?: CandidateStatus;
  page: number;
  pageSize: number;
};

export function listCandidates(
  repository: CandidateRepository,
  params: ListCandidatesParams,
): Promise<CandidateResponse>;

// parseListCandidatesQuery.ts
export type FieldError = { field: string; message: string };
export type ParseResult =
  | { ok: true; params: ListCandidatesParams }
  | { ok: false; errors: FieldError[] };

export function parseListCandidatesQuery(query: unknown): ParseResult;
```

Design notes:

- The repository interface is async and takes `offset`/`limit` plus filters, which maps directly onto SQL `WHERE ... ORDER BY ... LIMIT ... OFFSET` or an ATS list endpoint. Filtering sits behind the interface because a real store must do it, not the application.
- `listCandidates` owns the page-to-offset arithmetic and the response shape. It trusts its typed params; untrusted input goes through the parser first.
- `createApp` in `server/src/app.ts` takes an optional `{ candidateRepository }` and defaults to the in-memory repository with seed data. Tests inject their own fixtures. The error middleware is registered there, after the routes.
- Keep the existing `/api/health` route.

## 5. Frontend design

> The interaction model, page size and file locations in this section were later changed by [spec-ui-ux.md](./spec-ui-ux.md).

All files under `client/src/candidates/`.

| File | Responsibility |
| --- | --- |
| `types.ts` | `Candidate`, `CandidateStatus`, `CandidateResponse`, `CANDIDATE_STATUSES`. Duplicated from the server on purpose (see README notes). |
| `candidatesApi.ts` | `fetchCandidates(params, signal)`. Builds the query string, omits empty `q` and `status`, throws an `Error` carrying the server's `error.message` on non-2xx, or a generic message on network or parse failure. |
| `useCandidates.ts` | Hook that takes the applied `{ q, status, page }`, fetches, and returns `{ data, isLoading, error, retry }`. Aborts the in-flight request when params change or on unmount, and ignores aborted results. |
| `CandidateSearch.tsx` | The component. |

`App.tsx` renders `<CandidateSearch />` under the existing heading.

### Behaviour

- **Controls**: a labelled text input ("Search by name or email"), a labelled status select ("All statuses" plus the four statuses), and a "Search" submit button, all in one `<form>`.
- **Draft vs applied**: typing or changing the select edits draft state only. Submitting the form (button or Enter) applies both values and resets to page 1. Nothing is fetched until submit, apart from the initial load.
- **Initial load**: fetches page 1 with no filters on mount.
- **Results**: a table with columns Name, Email, Status, Last updated. Status is shown capitalised. The date is rendered in a `<time dateTime={updatedAt}>` using `toLocaleDateString(undefined, { dateStyle: "medium" })`.
- **Pagination**: "Previous" and "Next" buttons, with "Page X of Y" and the total count. Page size is fixed at 10. Previous is disabled on page 1; Next is disabled when `page * pageSize >= total`; both are disabled while loading.
- **Loading**: a `role="status"` "Loading candidates…" message. On later loads the previous rows stay visible so the layout does not jump.
- **Error**: a `role="alert"` message with a "Retry" button that repeats the same request. Rows from the previous request are not shown alongside an error.
- **Empty**: "No candidates match your search." when `total` is 0.

## 6. Tests

Vitest on both sides. Each test builds its own fixtures; nothing depends on the seed data.

`server/src/candidates/listCandidates.test.ts` (in-memory repository with fixtures):

- Returns all candidates, newest `updatedAt` first, with defaults.
- `q` matches name case-insensitively; `q` matches email; surrounding whitespace is ignored.
- `status` filters; `q` and `status` combine with AND.
- Pagination returns the right slice and `total` reflects all matches, not the page.
- A page past the end returns empty `data` with the correct `total`.

`server/src/candidates/parseListCandidatesQuery.test.ts`:

- Empty query gives `page: 1`, `pageSize: 10`, no filters.
- Table-driven invalid values for `page`, `pageSize` (including `51`) and `status`.
- Multiple invalid fields are all reported.
- Repeated params are rejected; empty `q` and `status` are treated as absent.

`server/src/candidates/candidatesRouter.test.ts` (supertest, injected repository):

- `200` with the response shape for a valid request.
- `400` with `INVALID_QUERY` and `details` for a bad `pageSize`.
- `500` with `INTERNAL_ERROR` when the repository throws.

`client/src/candidates/CandidateSearch.test.tsx` (`fetch` stubbed with `vi.stubGlobal`, interactions through `user-event`):

- Shows the loading state, then rows with name, email, status and date.
- Submitting a search and status requests the right query string and page 1.
- Next and Previous request the adjacent page and are disabled at the bounds.
- A failed request shows the alert; Retry refetches and recovers.
- Zero results shows the empty message.

## 7. README

Replace nothing; add sections for how to run and test, then:

**Assumptions**: strict validation with `400` (including `pageSize` over 50); fixed sort order; substring search; a page past the end is an empty `200`; search applies on submit; page size fixed in the UI; types duplicated between packages.

**Production considerations**: PostgreSQL repository with a trigram or full-text index for search, and keyset pagination for large tables; an ATS client behind the same interface with sync, caching and rate-limit handling; authentication and per-tenant authorisation; candidate data is PII, so access logging and no PII in logs; a max length on `q` and rate limiting; structured logging and request IDs; a shared types package or an OpenAPI schema; debounced search and URL-synced filters; accessibility review.

## 8. Build order

1. `candidate.ts`, repository interface, in-memory repository, seed data.
2. `listCandidates` with its tests.
3. `parseListCandidatesQuery` with its tests.
4. Router, `createApp` wiring, error middleware, route tests.
5. Client `types.ts`, `candidatesApi.ts`, `useCandidates.ts`.
6. `CandidateSearch` with its tests; mount in `App`.
7. README.

## 9. Done when

- `npm run typecheck`, `npm test` and `npm run build` pass from the root.
- With both dev servers running, searching, filtering and paging work in the browser, and stopping the API shows the error state with a working Retry.
- No response ever contains more than 50 candidates.
- No dependencies were added beyond the scaffold.
