import type { CandidateResponse, CandidateStatus } from "../shared/types";

export type FetchCandidatesParams = {
  q: string;
  status: CandidateStatus | "";
  page: number;
  pageSize: number;
};

const FALLBACK_ERROR = "Failed to load candidates";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { error?: { message?: unknown } } | null)?.error
      ?.message;
    return typeof message === "string" ? message : FALLBACK_ERROR;
  } catch {
    return FALLBACK_ERROR;
  }
}

export async function fetchCandidates(
  params: FetchCandidatesParams,
  signal?: AbortSignal,
): Promise<CandidateResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.status) {
    query.set("status", params.status);
  }

  try {
    const response = await fetch(`/api/candidates?${query}`, { signal });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    return (await response.json()) as CandidateResponse;
  } catch (error) {
    throw new Error("Failed to load candidates");
  }
}
