import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

beforeEach(() => {
  history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the heading and the candidate search", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [], page: 1, pageSize: 10, total: 0 })),
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: "Candidates" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No candidates found" })).toBeInTheDocument();
  });
});
