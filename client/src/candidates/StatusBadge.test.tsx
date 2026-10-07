import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../modules/CandidateSearch/Components/StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["new", "New"],
    ["contacted", "Contacted"],
    ["interviewing", "Interviewing"],
    ["hired", "Hired"],
  ] as const)("shows the %s status as text", (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
