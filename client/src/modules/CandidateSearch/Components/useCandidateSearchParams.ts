import { useCallback, useEffect, useRef, useState } from "react";
import { CANDIDATE_STATUSES, type CandidateStatus } from "../../../shared/types";

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type SearchState = {
  q: string;
  status: CandidateStatus | "";
  page: number;
  pageSize: number;
};

export type HistoryMode = "push" | "replace";

type Patch = Partial<SearchState>;
/** A patch, or a function of the current state returning a patch (null to do nothing). */
export type SearchStateUpdate = Patch | ((current: SearchState) => Patch | null);

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** Reads search state from a query string, replacing anything invalid with its default. */
export function parseSearchState(search: string): SearchState {
  const params = new URLSearchParams(search);

  const status = params.get("status") ?? "";
  const page = params.get("page") ?? "";
  const pageSize = Number(params.get("pageSize"));

  return {
    q: (params.get("q") ?? "").trim(),
    status: (CANDIDATE_STATUSES as readonly string[]).includes(status)
      ? (status as CandidateStatus)
      : "",
    page: POSITIVE_INTEGER.test(page) ? Number(page) : 1,
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize)
      ? pageSize
      : DEFAULT_PAGE_SIZE,
  };
}

/** Writes search state as a query string, leaving out values equal to their default. */
export function serializeSearchState(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) {
    params.set("q", state.q);
  }
  if (state.status) {
    params.set("status", state.status);
  }
  if (state.page !== 1) {
    params.set("page", String(state.page));
  }
  if (state.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(state.pageSize));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function writeUrl(state: SearchState, mode: HistoryMode): void {
  const search = serializeSearchState(state);
  if (search === window.location.search) {
    return;
  }
  const url = `${window.location.pathname}${search}${window.location.hash}`;
  if (mode === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}

function isSameState(a: SearchState, b: SearchState): boolean {
  return a.q === b.q && a.status === b.status && a.page === b.page && a.pageSize === b.pageSize;
}

export type UseCandidateSearchParamsOptions = {
  /** Called when the user moves through history with back or forward. */
  onPopState?: (state: SearchState) => void;
};

/**
 * Keeps the search state in the URL's query string, which is the source of
 * truth: the state survives a refresh, can be linked, and follows back and
 * forward.
 */
export function useCandidateSearchParams(options: UseCandidateSearchParamsOptions = {}) {
  const [state, setState] = useState(() => parseSearchState(window.location.search));
  const stateRef = useRef(state);
  const onPopStateRef = useRef(options.onPopState);

  useEffect(() => {
    onPopStateRef.current = options.onPopState;
  });

  useEffect(() => {
    // Canonicalise whatever URL the page was opened with.
    writeUrl(stateRef.current, "replace");

    const handlePopState = () => {
      const next = parseSearchState(window.location.search);
      writeUrl(next, "replace");
      stateRef.current = next;
      setState(next);
      onPopStateRef.current?.(next);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const update = useCallback((change: SearchStateUpdate, mode: HistoryMode) => {
    const current = stateRef.current;
    const patch = typeof change === "function" ? change(current) : change;
    if (!patch) {
      return;
    }
    const next = { ...current, ...patch };
    if (isSameState(current, next)) {
      return;
    }
    writeUrl(next, mode);
    stateRef.current = next;
    setState(next);
  }, []);

  return { state, update };
}
