const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const INVALID = "—";

/**
 * "3 days ago", "yesterday", "last month". Takes `now` as an argument so the
 * result is deterministic for a given pair of inputs.
 */
export function formatRelativeTime(iso: string, now: Date, locale?: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return INVALID;
  }

  const diff = then - now.getTime();
  const elapsed = Math.abs(diff);
  if (elapsed < MINUTE) {
    return "just now";
  }

  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const signed = (amount: number) => (diff < 0 ? -amount : amount);

  if (elapsed < HOUR) {
    return format.format(signed(Math.floor(elapsed / MINUTE)), "minute");
  }
  if (elapsed < DAY) {
    return format.format(signed(Math.floor(elapsed / HOUR)), "hour");
  }
  if (elapsed < 31 * DAY) {
    return format.format(signed(Math.floor(elapsed / DAY)), "day");
  }

  const months = Math.floor(elapsed / (30 * DAY));
  if (months < 12) {
    return format.format(signed(months), "month");
  }
  return format.format(signed(Math.max(1, Math.floor(elapsed / (365 * DAY)))), "year");
}

export function formatFullDateTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return INVALID;
  }
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}
