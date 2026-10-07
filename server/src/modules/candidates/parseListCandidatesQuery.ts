import { CANDIDATE_STATUSES, isCandidateStatus } from "./candidate.js";
import type { ListCandidatesParams } from "./listCandidates.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export type FieldError = { field: string; message: string };

export type ParseResult =
  | { ok: true; params: ListCandidatesParams }
  | { ok: false; errors: FieldError[] };

const INTEGER = /^\d+$/;

function parseInteger(value: string): number | undefined {
  return INTEGER.test(value) ? Number(value) : undefined;
}

export function parseListCandidatesQuery(query: unknown): ParseResult {
  const raw = (typeof query === "object" && query !== null ? query : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const params: ListCandidatesParams = { page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };

  // Repeated or nested params arrive from Express as arrays or objects.
  const readString = (field: string): string | undefined => {
    const value = raw[field];
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      errors.push({ field, message: `${field} must be provided once as a single value` });
      return undefined;
    }
    return value;
  };

  const q = readString("q")?.trim();
  if (q) {
    params.q = q;
  }

  const status = readString("status");
  if (status) {
    if (isCandidateStatus(status)) {
      params.status = status;
    } else {
      errors.push({
        field: "status",
        message: `status must be one of: ${CANDIDATE_STATUSES.join(", ")}`,
      });
    }
  }

  const page = readString("page");
  if (page !== undefined) {
    const parsed = parseInteger(page);
    if (parsed === undefined || parsed < 1) {
      errors.push({ field: "page", message: "page must be an integer greater than or equal to 1" });
    } else {
      params.page = parsed;
    }
  }

  const pageSize = readString("pageSize");
  if (pageSize !== undefined) {
    const parsed = parseInteger(pageSize);
    if (parsed === undefined || parsed < 1 || parsed > MAX_PAGE_SIZE) {
      errors.push({
        field: "pageSize",
        message: `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      });
    } else {
      params.pageSize = parsed;
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, params };
}
