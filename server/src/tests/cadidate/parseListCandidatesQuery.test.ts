import { describe, expect, it } from "vitest";
import { parseListCandidatesQuery } from "../../modules/candidates/parseListCandidatesQuery.js";

function errorFields(query: unknown): string[] {
  const result = parseListCandidatesQuery(query);
  return result.ok ? [] : result.errors.map((error) => error.field);
}

describe("parseListCandidatesQuery", () => {
  it("applies defaults to an empty query", () => {
    expect(parseListCandidatesQuery({})).toEqual({
      ok: true,
      params: { page: 1, pageSize: 10 },
    });
  });

  it("parses valid values", () => {
    expect(
      parseListCandidatesQuery({ q: " aisha ", status: "hired", page: "3", pageSize: "25" }),
    ).toEqual({
      ok: true,
      params: { q: "aisha", status: "hired", page: 3, pageSize: 25 },
    });
  });

  it("ignores unknown params", () => {
    expect(parseListCandidatesQuery({ sort: "name" })).toEqual({
      ok: true,
      params: { page: 1, pageSize: 10 },
    });
  });

  it.each(["0", "-1", "1.5", "abc", "", " 2", "1e2"])("rejects page=%j", (page) => {
    expect(errorFields({ page })).toEqual(["page"]);
  });

  it.each(["0", "51", "-5", "ten", "", "10.0"])("rejects pageSize=%j", (pageSize) => {
    expect(errorFields({ pageSize })).toEqual(["pageSize"]);
  });

  it.each(["1", "50"])("accepts the boundary pageSize=%j", (pageSize) => {
    expect(parseListCandidatesQuery({ pageSize })).toMatchObject({
      ok: true,
      params: { pageSize: Number(pageSize) },
    });
  });

  it.each(["archived", "Hired", " new"])("rejects status=%j", (status) => {
    expect(errorFields({ status })).toEqual(["status"]);
  });

  it("treats empty q and status as absent", () => {
    expect(parseListCandidatesQuery({ q: "   ", status: "" })).toEqual({
      ok: true,
      params: { page: 1, pageSize: 10 },
    });
  });

  it("rejects repeated or nested params", () => {
    expect(
      errorFields({ q: ["a", "b"], status: ["new", "hired"], page: ["1", "2"], pageSize: { gt: "1" } }),
    ).toEqual(["q", "status", "page", "pageSize"]);
  });

  it("reports every invalid field at once", () => {
    const result = parseListCandidatesQuery({ status: "archived", page: "0", pageSize: "500" });

    expect(result).toEqual({
      ok: false,
      errors: [
        { field: "status", message: "status must be one of: new, contacted, interviewing, hired" },
        { field: "page", message: "page must be an integer greater than or equal to 1" },
        { field: "pageSize", message: "pageSize must be an integer between 1 and 50" },
      ],
    });
  });
});
