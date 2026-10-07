import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateSearch } from "../modules/CandidateSearch/Components/CandidateSearch";
import type { Candidate } from "../shared/types";

const aisha: Candidate = {
  id: "1",
  name: "Aisha Khan",
  email: "aisha@example.com",
  status: "interviewing",
  updatedAt: "2026-08-20T10:00:00.000Z",
};
const marco: Candidate = {
  id: "2",
  name: "Marco Silva",
  email: "marco@example.com",
  status: "new",
  updatedAt: "2026-08-21T10:00:00.000Z",
};
const priya: Candidate = {
  id: "3",
  name: "Priya Shah",
  email: "priya@example.com",
  status: "hired",
  updatedAt: "2026-08-22T10:00:00.000Z",
};
// 15 candidates: two pages of 10. "Extra 08" is the first row of page 2.
const extras: Candidate[] = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: String(index + 4),
    name: `Extra ${number}`,
    email: `extra${number}@example.com`,
    status: "contacted",
    updatedAt: "2026-08-01T10:00:00.000Z",
  };
});
const everyone = [aisha, marco, priya, ...extras];

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stands in for the API: filters and paginates `everyone` like the server does. */
async function serveCandidates(input: RequestInfo | URL): Promise<Response> {
  const { searchParams } = new URL(String(input), "http://localhost");
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page"));
  const pageSize = Number(searchParams.get("pageSize"));

  const matches = everyone.filter(
    (candidate) =>
      (!status || candidate.status === status) &&
      (candidate.name.toLowerCase().includes(q) || candidate.email.toLowerCase().includes(q)),
  );

  return json({
    data: matches.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: matches.length,
  });
}

/** Query params of the nth fetch call (1-based, default the latest), as a plain object. */
function requestedQuery(call = fetchMock.mock.calls.length): Record<string, string> {
  const url = new URL(String(fetchMock.mock.calls[call - 1]?.[0]), "http://localhost");
  expect(url.pathname).toBe("/api/candidates");
  return Object.fromEntries(url.searchParams);
}

const searchInput = () => screen.getByLabelText("Search by name or email");
const statusSelect = () => screen.getByLabelText("Status");
const nextButton = () => screen.getByRole("button", { name: "Next" });
const previousButton = () => screen.getByRole("button", { name: "Previous" });

async function renderLoaded() {
  const user = userEvent.setup();
  render(<CandidateSearch />);
  await screen.findByText("Aisha Khan");
  return user;
}

beforeEach(() => {
  history.replaceState(null, "", "/");
  fetchMock.mockReset();
  fetchMock.mockImplementation(serveCandidates);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CandidateSearch", () => {
  describe("loading and results", () => {
    it("shows skeleton rows, then the candidates", async () => {
      render(<CandidateSearch />);

      expect(screen.getAllByTestId("skeleton-row")).toHaveLength(10);
      // Only the header row is exposed to assistive tech while loading.
      expect(screen.getAllByRole("row")).toHaveLength(1);
      expect(screen.getByRole("status")).toHaveTextContent("Loading candidates…");

      const row = (await screen.findByText("Aisha Khan")).closest("tr")!;
      expect(within(row).getByRole("link", { name: "aisha@example.com" })).toHaveAttribute(
        "href",
        "mailto:aisha@example.com",
      );
      expect(within(row).getByText("Interviewing")).toBeInTheDocument();
      expect(row.querySelector("time")).toHaveAttribute("datetime", aisha.updatedAt);

      expect(screen.queryByTestId("skeleton-row")).not.toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(11);
      expect(screen.getByRole("status")).toHaveTextContent("15 candidates found");
      expect(screen.getByText("Showing 1–10 of 15 candidates")).toBeInTheDocument();
      expect(requestedQuery(1)).toEqual({ page: "1", pageSize: "10" });
    });

    it("keeps the rows in place and marks the table busy while reloading", async () => {
      const user = await renderLoaded();
      let respond!: (response: Response) => void;
      fetchMock.mockImplementationOnce(() => new Promise((resolve) => (respond = resolve)));

      await user.click(nextButton());

      expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByText("Aisha Khan")).toBeInTheDocument();
      expect(screen.queryByTestId("skeleton-row")).not.toBeInTheDocument();

      await act(async () => respond(await serveCandidates("/api/candidates?page=2&pageSize=10")));

      expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false");
      expect(screen.getByText("Extra 08")).toBeInTheDocument();
    });
  });

  describe("search as you type", () => {
    it("makes one request, 300 ms after the last keystroke", async () => {
      render(<CandidateSearch />);
      await screen.findByText("Aisha Khan");
      const entries = history.length;
      vi.useFakeTimers();

      // fireEvent, not user-event: user-event waits on timers that are faked here.
      for (const typed of ["m", "ma", "mar", "marc", "marco"]) {
        fireEvent.change(searchInput(), { target: { value: typed } });
        await act(() => vi.advanceTimersByTimeAsync(50));
      }
      await act(() => vi.advanceTimersByTimeAsync(249));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(requestedQuery()).toEqual({ q: "marco", page: "1", pageSize: "10" });
      expect(location.search).toBe("?q=marco");
      // Typing replaces the current history entry.
      expect(history.length).toBe(entries);

      vi.useRealTimers();
      expect(await screen.findByText("Showing 1–1 of 1 candidate")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("1 candidate found");
      expect(screen.queryByText("Aisha Khan")).not.toBeInTheDocument();
    });

    it("applies immediately on Enter", async () => {
      const user = await renderLoaded();

      await user.type(searchInput(), "marco{Enter}");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(requestedQuery()).toMatchObject({ q: "marco" });
    });

    it("makes no request when only whitespace is added", async () => {
      const user = await renderLoaded();
      await user.type(searchInput(), "marco{Enter}");
      await screen.findByText("Showing 1–1 of 1 candidate");

      await user.type(searchInput(), "  {Enter}");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(searchInput()).toHaveValue("marco  ");
    });

    it("returns to the first page when the search changes", async () => {
      const user = await renderLoaded();
      await user.click(nextButton());
      await screen.findByText("Extra 08");

      await user.type(searchInput(), "extra{Enter}");

      expect(requestedQuery()).toEqual({ q: "extra", page: "1", pageSize: "10" });
    });
  });

  describe("status filter", () => {
    it("applies at once, on page 1, together with text still waiting on the debounce", async () => {
      const user = await renderLoaded();
      await user.click(nextButton());
      await screen.findByText("Extra 08");

      await user.type(searchInput(), "extra");
      await user.selectOptions(statusSelect(), "contacted");

      expect(requestedQuery()).toEqual({
        q: "extra",
        status: "contacted",
        page: "1",
        pageSize: "10",
      });
      expect(location.search).toBe("?q=extra&status=contacted");
    });
  });

  describe("page size", () => {
    it("requests the chosen size from page 1", async () => {
      const user = await renderLoaded();
      await user.click(nextButton());
      await screen.findByText("Extra 08");

      await user.selectOptions(screen.getByLabelText("Rows per page"), "25");

      expect(requestedQuery()).toEqual({ page: "1", pageSize: "25" });
      expect(await screen.findByText("Showing 1–15 of 15 candidates")).toBeInTheDocument();
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
      expect(location.search).toBe("?pageSize=25");
    });
  });

  describe("clearing", () => {
    it("clears the search from the button inside the input and refocuses it", async () => {
      const user = await renderLoaded();
      expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
      await user.type(searchInput(), "marco{Enter}");
      await screen.findByText("Showing 1–1 of 1 candidate");

      await user.click(screen.getByRole("button", { name: "Clear search" }));

      expect(searchInput()).toHaveValue("");
      expect(searchInput()).toHaveFocus();
      expect(requestedQuery()).toEqual({ page: "1", pageSize: "10" });
      expect(await screen.findByText("Aisha Khan")).toBeInTheDocument();
    });

    it("offers Clear filters only when a filter is applied, and resets both", async () => {
      const user = await renderLoaded();
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
      await user.type(searchInput(), "example{Enter}");
      await user.selectOptions(statusSelect(), "hired");
      await screen.findByText("Showing 1–1 of 1 candidate");

      await user.click(screen.getByRole("button", { name: "Clear filters" }));

      expect(searchInput()).toHaveValue("");
      expect(statusSelect()).toHaveValue("");
      expect(requestedQuery()).toEqual({ page: "1", pageSize: "10" });
      expect(location.search).toBe("");
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("names the applied filters and offers to clear them", async () => {
      const user = await renderLoaded();
      await user.type(searchInput(), "zzz{Enter}");
      await user.selectOptions(statusSelect(), "hired");

      expect(await screen.findByRole("heading", { name: "No candidates found" })).toBeInTheDocument();
      expect(screen.getByText('No results for "zzz" with status Hired.')).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("No candidates found");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      // One in the filter bar, one in the empty state.
      const clearButtons = screen.getAllByRole("button", { name: "Clear filters" });
      expect(clearButtons).toHaveLength(2);
      await user.click(clearButtons[1]!);

      expect(await screen.findByText("Aisha Khan")).toBeInTheDocument();
    });
  });

  describe("URL state", () => {
    it("starts from the filters and page in the URL", async () => {
      history.replaceState(null, "", "/?q=extra&status=contacted&page=2");

      render(<CandidateSearch />);

      expect(await screen.findByText("Extra 11")).toBeInTheDocument();
      expect(requestedQuery(1)).toEqual({
        q: "extra",
        status: "contacted",
        page: "2",
        pageSize: "10",
      });
      expect(searchInput()).toHaveValue("extra");
      expect(statusSelect()).toHaveValue("contacted");
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });

    it("replaces invalid values in the URL before asking the API", async () => {
      history.replaceState(null, "", "/?status=foo&page=abc&pageSize=7");

      await renderLoaded();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(requestedQuery(1)).toEqual({ page: "1", pageSize: "10" });
      expect(location.search).toBe("");
    });

    it("moves to the last page when the URL points past it", async () => {
      history.replaceState(null, "", "/?page=99");

      render(<CandidateSearch />);

      expect(await screen.findByText("Extra 08")).toBeInTheDocument();
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
      expect(location.search).toBe("?page=2");
    });

    it("restores the previous view on back", async () => {
      const user = await renderLoaded();
      await user.type(searchInput(), "example{Enter}");
      await user.selectOptions(statusSelect(), "hired");
      await screen.findByText("Showing 1–1 of 1 candidate");
      expect(location.search).toBe("?q=example&status=hired");

      act(() => history.back());

      // The status change is undone; the typed search stayed in the same entry.
      await waitFor(() => expect(statusSelect()).toHaveValue(""));
      expect(searchInput()).toHaveValue("example");
      expect(location.search).toBe("?q=example");
      expect(await screen.findByText("Aisha Khan")).toBeInTheDocument();

      act(() => history.forward());

      await waitFor(() => expect(statusSelect()).toHaveValue("hired"));
      expect(await screen.findByText("Showing 1–1 of 1 candidate")).toBeInTheDocument();
    });

    it("restores the search text on back after clearing", async () => {
      const user = await renderLoaded();
      await user.type(searchInput(), "marco{Enter}");
      await user.click(screen.getByRole("button", { name: "Clear search" }));
      await screen.findByText("Aisha Khan");

      act(() => history.back());

      await waitFor(() => expect(searchInput()).toHaveValue("marco"));
      expect(await screen.findByText("Showing 1–1 of 1 candidate")).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("moves between pages and updates the URL", async () => {
      const user = await renderLoaded();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

      await user.click(nextButton());

      expect(await screen.findByText("Extra 08")).toBeInTheDocument();
      expect(requestedQuery()).toMatchObject({ page: "2" });
      expect(screen.getByText("Showing 11–15 of 15 candidates")).toBeInTheDocument();
      expect(location.search).toBe("?page=2");

      await user.click(previousButton());

      expect(await screen.findByText("Aisha Khan")).toBeInTheDocument();
      expect(requestedQuery()).toMatchObject({ page: "1" });
      expect(location.search).toBe("");
    });

    it("marks the buttons disabled at the bounds without dropping focus", async () => {
      const user = await renderLoaded();
      expect(previousButton()).toHaveAttribute("aria-disabled", "true");
      expect(nextButton()).toHaveAttribute("aria-disabled", "false");

      await user.click(previousButton());
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await user.click(nextButton());
      await screen.findByText("Extra 08");

      expect(nextButton()).toHaveAttribute("aria-disabled", "true");
      expect(nextButton()).not.toBeDisabled();
      expect(nextButton()).toHaveFocus();
      expect(previousButton()).toHaveAttribute("aria-disabled", "false");

      await user.click(nextButton());
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("errors", () => {
    it("shows an error for a rejected request and keeps the filters usable", async () => {
      fetchMock.mockImplementation(async () =>
        json({ error: { code: "INVALID_QUERY", message: "Invalid query parameters" } }, 400),
      );

      render(<CandidateSearch />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load candidates");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(searchInput()).toBeEnabled();
      expect(statusSelect()).toBeEnabled();
    });

    it("recovers on retry after a failed request", async () => {
      const user = userEvent.setup();
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      render(<CandidateSearch />);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Failed to load candidates");

      await user.click(within(alert).getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("Aisha Khan")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
