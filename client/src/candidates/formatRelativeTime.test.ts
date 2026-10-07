import { describe, expect, it } from "vitest";
import { formatFullDateTime, formatRelativeTime } from "../shared/formatRelativeTime";

const now = new Date("2026-10-07T12:00:00.000Z");
const relative = (iso: string) => formatRelativeTime(iso, now, "en");

describe("formatRelativeTime", () => {
  it.each([
    ["2026-10-07T11:59:30.000Z", "just now"],
    ["2026-10-07T11:55:00.000Z", "5 minutes ago"],
    ["2026-10-07T09:00:00.000Z", "3 hours ago"],
    ["2026-10-06T12:00:00.000Z", "yesterday"],
    ["2026-10-04T12:00:00.000Z", "3 days ago"],
    ["2026-09-07T12:00:00.000Z", "30 days ago"],
    ["2026-09-01T12:00:00.000Z", "last month"],
    ["2026-07-01T12:00:00.000Z", "3 months ago"],
    ["2025-10-07T12:00:00.000Z", "last year"],
    ["2023-10-07T12:00:00.000Z", "3 years ago"],
  ])("formats %s as %j", (iso, expected) => {
    expect(relative(iso)).toBe(expected);
  });

  it("handles dates in the future", () => {
    expect(relative("2026-10-09T12:00:00.000Z")).toBe("in 2 days");
  });

  it("returns a dash for an unparseable date", () => {
    expect(relative("not a date")).toBe("—");
    expect(formatFullDateTime("not a date")).toBe("—");
  });
});

describe("formatFullDateTime", () => {
  it("includes the date and the time", () => {
    const formatted = formatFullDateTime("2026-08-20T10:00:00.000Z", "en-US");

    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
