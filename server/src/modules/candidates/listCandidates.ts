import type { CandidateResponse, CandidateStatus } from "./candidate.js";
import type { CandidateRepository } from "./candidateRepository.js";

export type ListCandidatesParams = {
  q?: string;
  status?: CandidateStatus;
  page: number;
  pageSize: number;
};

export async function listCandidates(
  repository: CandidateRepository,
  params: ListCandidatesParams,
): Promise<CandidateResponse> {
  const { status, page, pageSize } = params;
  const search = params.q?.trim();

  const { items, total } = await repository.findMany({
    search: search || undefined,
    status,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  return { data: items, page, pageSize, total };
}
