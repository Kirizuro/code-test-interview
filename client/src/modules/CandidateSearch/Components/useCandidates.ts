import { useCallback, useEffect, useState } from "react";
import {
  fetchCandidates,
  type FetchCandidatesParams,
} from "../../../candidates/candidatesApi";
import type { CandidateResponse } from "../../../shared/types";

export type UseCandidatesResult = {
  data: CandidateResponse | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

export function useCandidates({
  q,
  status,
  page,
  pageSize,
}: FetchCandidatesParams): UseCandidatesResult {
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetchCandidates({ q, status, page, pageSize }, controller.signal)
      .then((response) => {
        // A superseded request must not overwrite the newer one's result.
        if (controller.signal.aborted) {
          return;
        }
        setData(response);
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(null);
        setError(
          cause instanceof Error ? cause.message : "Failed to load candidates",
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [q, status, page, pageSize, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return { data, isLoading, error, retry };
}
