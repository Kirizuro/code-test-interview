import type { Candidate } from "./candidate.js";
import type { CandidateQuery, CandidateRepository } from "./candidateRepository.js";

function byNewestThenId(a: Candidate, b: Candidate): number {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt < b.updatedAt ? 1 : -1;
  }
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

export function createInMemoryCandidateRepository(
  candidates: readonly Candidate[],
): CandidateRepository {
  return {
    async findMany({ search, status, offset, limit }: CandidateQuery) {
      const needle = search?.toLowerCase();

      const matches = candidates
        .filter((candidate) => {
          if (status && candidate.status !== status) {
            return false;
          }
          if (!needle) {
            return true;
          }
          return (
            candidate.name.toLowerCase().includes(needle) ||
            candidate.email.toLowerCase().includes(needle)
          );
        })
        .sort(byNewestThenId);

      return {
        items: matches.slice(offset, offset + limit),
        total: matches.length,
      };
    },
  };
}
