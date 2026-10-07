import type { CandidateStatus } from "./types";

export function statusLabel(status: CandidateStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
