import { describe, expect, it } from "vitest";
import type { Candidate } from "../../modules/candidates/candidate.js";
import { createInMemoryCandidateRepository } from "../../modules/candidates/inMemoryCandidateRepository.js";
import { listCandidates } from "../../modules/candidates/listCandidates.js";

const fixtures: Candidate[] = [
  { id: "1", name: "Aisha Khan", email: "aisha@example.com", status: "interviewing", updatedAt: "2026-08-20T10:00:00.000Z" },
  { id: "2", name: "Marco Silva", email: "marco@example.com", status: "new", updatedAt: "2026-08-21T10:00:00.000Z" },
  { id: "3", name: "Priya Shah", email: "priya@example.com", status: "hired", updatedAt: "2026-08-22T10:00:00.000Z" },
  { id: "4", name: "Silvia Marconi", email: "s.marconi@work.test", status: "new", updatedAt: "2026-08-23T10:00:00.000Z" },
  { id: "10", name: "Omar Haddad", email: "omar@example.com", status: "contacted", updatedAt: "2026-08-19T10:00:00.000Z" },
  { id: "9", name: "Lena Fischer", email: "lena@example.com", status: "contacted", updatedAt: "2026-08-19T10:00:00.000Z" },
];

const repository = createInMemoryCandidateRepository(fixtures);
const defaults = { page: 1, pageSize: 10 };

const ids = (candidates: Candidate[]) => candidates.map((candidate) => candidate.id);

describe("listCandidates", () => {
  it("returns every candidate, newest first, breaking ties by id", async () => {
    const result = await listCandidates(repository, defaults);

    expect(ids(result.data)).toEqual(["4", "3", "2", "1", "9", "10"]);
    expect(result).toMatchObject({ page: 1, pageSize: 10, total: 6 });
  });

  it("does not reorder the source data", async () => {
    await listCandidates(repository, defaults);

    expect(fixtures[0]?.id).toBe("1");
  });

  it("matches the name case-insensitively", async () => {
    const result = await listCandidates(repository, { ...defaults, q: "AISHA" });

    expect(ids(result.data)).toEqual(["1"]);
  });

  it("matches the email", async () => {
    const result = await listCandidates(repository, { ...defaults, q: "work.test" });

    expect(ids(result.data)).toEqual(["4"]);
  });

  it("matches a substring of either field", async () => {
    const result = await listCandidates(repository, { ...defaults, q: "marco" });

    expect(ids(result.data)).toEqual(["4", "2"]);
  });

  it("ignores whitespace around the search term", async () => {
    const result = await listCandidates(repository, { ...defaults, q: "  priya  " });

    expect(ids(result.data)).toEqual(["3"]);
  });

  it("treats a whitespace-only search as no search", async () => {
    const result = await listCandidates(repository, { ...defaults, q: "   " });

    expect(result.total).toBe(6);
  });

  it("filters by status", async () => {
    const result = await listCandidates(repository, { ...defaults, status: "new" });

    expect(ids(result.data)).toEqual(["4", "2"]);
  });

  it("requires both the search and the status to match", async () => {
    const result = await listCandidates(repository, { ...defaults, q: "example.com", status: "new" });

    expect(ids(result.data)).toEqual(["2"]);
    expect(result.total).toBe(1);
  });

  it("returns the requested page and the total across all pages", async () => {
    const result = await listCandidates(repository, { page: 2, pageSize: 2 });

    expect(ids(result.data)).toEqual(["2", "1"]);
    expect(result).toMatchObject({ page: 2, pageSize: 2, total: 6 });
  });

  it("returns an empty page past the end, keeping the total", async () => {
    const result = await listCandidates(repository, { page: 5, pageSize: 10 });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(6);
  });
});
