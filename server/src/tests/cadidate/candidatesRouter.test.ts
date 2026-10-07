import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import type { Candidate } from "../../modules/candidates/candidate.js";
import type { CandidateRepository } from "../../modules/candidates/candidateRepository.js";
import { createInMemoryCandidateRepository } from "../../modules/candidates/inMemoryCandidateRepository.js";

const fixtures: Candidate[] = [
  {
    id: "1",
    name: "Aisha Khan",
    email: "aisha@example.com",
    status: "interviewing",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Marco Silva",
    email: "marco@example.com",
    status: "new",
    updatedAt: "2026-08-21T10:00:00.000Z",
  },
  {
    id: "3",
    name: "Priya Shah",
    email: "priya@example.com",
    status: "hired",
    updatedAt: "2026-08-22T10:00:00.000Z",
  },
];

const app = createApp({
  candidateRepository: createInMemoryCandidateRepository(fixtures),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/candidates", () => {
  it("returns a page of candidates with defaults", async () => {
    const res = await request(app).get("/api/candidates");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [fixtures[2], fixtures[1], fixtures[0]],
      page: 1,
      pageSize: 10,
      total: 3,
    });
  });

  it("applies q, status, page and pageSize from the query string", async () => {
    const filtered = await request(app).get(
      "/api/candidates?q=EXAMPLE&status=new",
    );
    expect(filtered.body).toMatchObject({ data: [fixtures[1]], total: 1 });

    const paged = await request(app).get("/api/candidates?page=2&pageSize=2");
    expect(paged.body).toEqual({
      data: [fixtures[0]],
      page: 2,
      pageSize: 2,
      total: 3,
    });
  });

  it("rejects a pageSize above the maximum", async () => {
    const res = await request(app).get("/api/candidates?pageSize=51");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_QUERY",
        message: "Invalid query parameters",
        details: [
          {
            field: "pageSize",
            message: "pageSize must be an integer between 1 and 50",
          },
        ],
      },
    });
  });

  it("rejects an unknown status", async () => {
    const res = await request(app).get("/api/candidates?status=archived");

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "status" }),
    ]);
  });

  it("rejects a repeated param", async () => {
    const res = await request(app).get("/api/candidates?page=1&page=2");

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "page" }),
    ]);
  });

  it("returns a generic 500 when the repository fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failing: CandidateRepository = {
      findMany: () => Promise.reject(new Error("connection refused")),
    };

    const res = await request(createApp({ candidateRepository: failing })).get(
      "/api/candidates",
    );

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
