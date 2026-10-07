import type { Candidate, CandidateStatus } from "./candidate.js";

export type CandidateQuery = {
  /** Already trimmed and non-empty. Matched case-insensitively against name or email. */
  search?: string;
  status?: CandidateStatus;
  offset: number;
  limit: number;
};

export type CandidatePage = {
  items: Candidate[];
  /** Number of matches before offset and limit are applied. */
  total: number;
};

/**
 * The seam between the use case and the data source. Results are ordered by
 * updatedAt descending, then id ascending. A PostgreSQL or ATS-backed
 * implementation replaces the in-memory one behind this interface.
 */
export interface CandidateRepository {
  findMany(query: CandidateQuery): Promise<CandidatePage>;
}
