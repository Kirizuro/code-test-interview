import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseSearchState,
  serializeSearchState,
  useCandidateSearchParams,
} from "../modules/CandidateSearch/Components/useCandidateSearchParams";

const defaults = { q: "", status: "", page: 1, pageSize: 10 };

beforeEach(() => {
  history.replaceState(null, "", "/");
});

describe("parseSearchState", () => {
  it("returns the defaults for an empty query string", () => {
    expect(parseSearchState("")).toEqual(defaults);
  });

  it("reads valid values", () => {
    expect(parseSearchState("?q=%20aisha%20&status=hired&page=3&pageSize=25")).toEqual({
      q: "aisha",
      status: "hired",
      page: 3,
      pageSize: 25,
    });
  });

  it.each([
    ["?status=archived", { status: "" }],
    ["?status=Hired", { status: "" }],
    ["?page=0", { page: 1 }],
    ["?page=-2", { page: 1 }],
    ["?page=1.5", { page: 1 }],
    ["?page=abc", { page: 1 }],
    ["?pageSize=7", { pageSize: 10 }],
    ["?pageSize=51", { pageSize: 10 }],
    ["?pageSize=abc", { pageSize: 10 }],
  ])("replaces the invalid value in %s with its default", (search, expected) => {
    expect(parseSearchState(search)).toEqual({ ...defaults, ...expected });
  });
});

describe("serializeSearchState", () => {
  it("omits values equal to their defaults", () => {
    expect(serializeSearchState({ q: "", status: "", page: 1, pageSize: 10 })).toBe("");
  });

  it("writes the values that differ", () => {
    expect(serializeSearchState({ q: "a b", status: "new", page: 2, pageSize: 50 })).toBe(
      "?q=a+b&status=new&page=2&pageSize=50",
    );
  });
});

describe("useCandidateSearchParams", () => {
  it("reads its initial state from the URL", () => {
    history.replaceState(null, "", "/?q=aisha&status=interviewing&page=2");

    const { result } = renderHook(() => useCandidateSearchParams());

    expect(result.current.state).toEqual({ q: "aisha", status: "interviewing", page: 2, pageSize: 10 });
    expect(location.search).toBe("?q=aisha&status=interviewing&page=2");
  });

  it("rewrites an invalid URL to match the sanitised state", () => {
    history.replaceState(null, "", "/?status=foo&page=abc&pageSize=7&q=marco");
    const entries = history.length;

    const { result } = renderHook(() => useCandidateSearchParams());

    expect(result.current.state).toEqual({ ...defaults, q: "marco" });
    expect(location.search).toBe("?q=marco");
    expect(history.length).toBe(entries);
  });

  it("replaces the current history entry when asked to", () => {
    const { result } = renderHook(() => useCandidateSearchParams());
    const entries = history.length;

    act(() => result.current.update({ q: "marco" }, "replace"));

    expect(result.current.state.q).toBe("marco");
    expect(location.search).toBe("?q=marco");
    expect(history.length).toBe(entries);
  });

  it("adds a history entry when asked to", () => {
    const { result } = renderHook(() => useCandidateSearchParams());
    const entries = history.length;

    act(() => result.current.update({ status: "hired" }, "push"));

    expect(location.search).toBe("?status=hired");
    expect(history.length).toBe(entries + 1);
  });

  it("does not touch history when nothing changes", () => {
    const { result } = renderHook(() => useCandidateSearchParams());
    const entries = history.length;
    const before = result.current.state;

    act(() => result.current.update({ page: 1 }, "push"));
    act(() => result.current.update(() => null, "push"));

    expect(history.length).toBe(entries);
    expect(result.current.state).toBe(before);
  });

  it("applies consecutive updates on top of each other", () => {
    const { result } = renderHook(() => useCandidateSearchParams());

    act(() => {
      result.current.update({ q: "marco" }, "replace");
      result.current.update((current) => ({ page: current.page + 1 }), "push");
    });

    expect(result.current.state).toEqual({ ...defaults, q: "marco", page: 2 });
    expect(location.search).toBe("?q=marco&page=2");
  });

  it("follows back navigation and reports it", async () => {
    const onPopState = vi.fn();
    const { result } = renderHook(() => useCandidateSearchParams({ onPopState }));
    act(() => result.current.update({ status: "hired" }, "push"));

    act(() => history.back());

    await waitFor(() => expect(result.current.state.status).toBe(""));
    expect(location.search).toBe("");
    expect(onPopState).toHaveBeenCalledExactlyOnceWith(defaults);
  });
});
