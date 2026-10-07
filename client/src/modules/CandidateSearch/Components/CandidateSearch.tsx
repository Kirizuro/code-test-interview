import { useEffect, useRef, useState } from "react";
import styles from "./CandidateSearch.module.css";
import { CandidateTable } from "./CandidateTable";
import controls from "./controls.module.css";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";
import { statusLabel } from "../../../shared/statusLabel";
import type { CandidateStatus } from "../../../shared/types";
import { PAGE_SIZE_OPTIONS, useCandidateSearchParams } from "./useCandidateSearchParams";
import { useCandidates } from "./useCandidates";
import { useDebouncedCallback } from "./useDebouncedCallback";

const SEARCH_DEBOUNCE_MS = 300;
const MAX_SKELETON_ROWS = 10;

function describeFilters(q: string, status: CandidateStatus | ""): string {
  if (q && status) {
    return `No results for "${q}" with status ${statusLabel(status)}.`;
  }
  if (q) {
    return `No results for "${q}".`;
  }
  if (status) {
    return `No candidates with status ${statusLabel(status)}.`;
  }
  return "There are no candidates yet.";
}

function describeCount(total: number): string {
  if (total === 0) {
    return "No candidates found";
  }
  return total === 1 ? "1 candidate found" : `${total} candidates found`;
}

export function CandidateSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  const { state, update } = useCandidateSearchParams({
    onPopState: (next) => {
      applyTextLater.cancel();
      setText(next.q);
    },
  });
  // What the input shows. The applied term in `state.q` follows it after the debounce.
  const [text, setText] = useState(state.q);

  const { data, isLoading, error, retry } = useCandidates(state);

  function applyText(value: string) {
    const q = value.trim();
    update((current) => (current.q === q ? null : { q, page: 1 }), "replace");
  }
  const applyTextLater = useDebouncedCallback(applyText, SEARCH_DEBOUNCE_MS);

  const hasAppliedFilters = state.q !== "" || state.status !== "";

  // A stale or hand-edited link can point past the last page.
  const isPastEnd = !!data && data.total > 0 && data.data.length === 0;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / state.pageSize)) : 1;
  useEffect(() => {
    if (isPastEnd && !isLoading && data.page === state.page && state.page > lastPage) {
      update({ page: lastPage }, "replace");
    }
  }, [isPastEnd, isLoading, data, state.page, lastPage, update]);

  const isEmpty = !!data && data.total === 0;
  const candidates = data && !isPastEnd ? data.data : null;

  let announcement = "";
  if (isLoading) {
    announcement = "Loading candidates…";
  } else if (data && !isPastEnd) {
    announcement = describeCount(data.total);
  }

  function clearFilters() {
    applyTextLater.cancel();
    setText("");
    update({ q: "", status: "", page: 1 }, "push");
  }

  return (
    <section aria-label="Candidate search" className={styles.root}>
      <FilterBar
        text={text}
        status={state.status}
        hasAppliedFilters={hasAppliedFilters}
        inputRef={inputRef}
        onTextChange={(value) => {
          setText(value);
          applyTextLater.schedule(value);
        }}
        onSubmit={() => {
          applyTextLater.cancel();
          applyText(text);
        }}
        onStatusChange={(status) => {
          // Apply any text still waiting on the debounce in the same step.
          applyTextLater.cancel();
          update({ q: text.trim(), status, page: 1 }, "push");
        }}
        onClearSearch={() => {
          applyTextLater.cancel();
          setText("");
          update((current) => (current.q === "" ? null : { q: "", page: 1 }), "push");
          inputRef.current?.focus();
        }}
        onClearFilters={clearFilters}
      />

      <p role="status" className="visually-hidden">
        {announcement}
      </p>

      <div className={styles.card}>
        {error ? (
          <div role="alert" className={`${styles.message} ${styles.error}`}>
            <h2 className={styles.messageTitle}>Could not load candidates</h2>
            <p className={styles.messageText}>{error}</p>
            <button
              type="button"
              className={`${controls.button} ${styles.messageAction}`}
              onClick={retry}
            >
              Retry
            </button>
          </div>
        ) : isEmpty ? (
          <div className={styles.message}>
            <h2 className={styles.messageTitle}>No candidates found</h2>
            <p className={styles.messageText}>{describeFilters(state.q, state.status)}</p>
            {hasAppliedFilters && (
              <button
                type="button"
                className={`${controls.button} ${controls.buttonPrimary} ${styles.messageAction}`}
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <CandidateTable
              candidates={candidates}
              skeletonRows={Math.min(state.pageSize, MAX_SKELETON_ROWS)}
              isBusy={isLoading}
            />
            {data && candidates ? (
              <Pagination
                page={state.page}
                pageSize={state.pageSize}
                total={data.total}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                isLoading={isLoading}
                onPageChange={(page) => update({ page }, "push")}
                onPageSizeChange={(pageSize) => {
                  applyTextLater.cancel();
                  update({ q: text.trim(), pageSize, page: 1 }, "push");
                }}
              />
            ) : (
              <div className={styles.footerPlaceholder} aria-hidden="true" />
            )}
          </>
        )}
      </div>
    </section>
  );
}
