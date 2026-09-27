import type { DatePrecision, Project } from "../types";

export const DAY_MS = 86_400_000;
export interface DateBounds {
  precision: Exclude<DatePrecision, "unknown">;
  start: number;
  end: number;
  label: string;
}

function utc(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}
function lastDay(year: number, month: number): number {
  return new Date(utc(year, month + 1, 0)).getUTCDate();
}

/** A month/year is a closed uncertainty interval, never an invented exact day. */
export function parseDateBounds(
  value: string | null,
  precision?: DatePrecision,
): DateBounds | null {
  if (!value || precision === "unknown") return null;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const inferred = match[3] ? "day" : match[2] ? "month" : "year";
  const actual = precision ?? inferred;
  // Accept a legacy normalized day with explicitly lower precision, but never
  // infer a missing month/day from a more precise declaration.
  if (year < 1 || year > 9999) return null;
  if (match[2] && (month < 1 || month > 12)) return null;
  if (match[3] && (day < 1 || day > lastDay(year, month))) return null;
  if (actual === "year") {
    return {
      precision: actual,
      start: utc(year, 1, 1),
      end: utc(year, 12, 31),
      label: match[1],
    };
  }
  if (!match[2]) return null;
  if (actual === "month") {
    return {
      precision: actual,
      start: utc(year, month, 1),
      end: utc(year, month, lastDay(year, month)),
      label: value.slice(0, 7),
    };
  }
  if (!match[3]) return null;
  const start = utc(year, month, day);
  return { precision: actual, start, end: start, label: value };
}

export function projectDateBounds(project: Project): DateBounds | null {
  return parseDateBounds(project.originalDate, project.datePrecision);
}

/** Returns a separate scenario interval; the source Project is never changed. */
export function shiftDateBounds(
  bounds: DateBounds | null,
  years = 0,
): DateBounds | null {
  if (!Number.isSafeInteger(years))
    throw new RangeError("Scenario shifts must be whole calendar years");
  if (!bounds) return null;
  if (years === 0) return bounds;
  const source = new Date(bounds.start);
  const year = source.getUTCFullYear() + years;
  if (year < 1 || year > 9999)
    throw new RangeError("Shifted year must be between 0001 and 9999");
  const yearText = String(year).padStart(4, "0");
  if (bounds.precision === "year") return parseDateBounds(yearText, "year");
  const month = source.getUTCMonth() + 1;
  const prefix = `${yearText}-${String(month).padStart(2, "0")}`;
  if (bounds.precision === "month") return parseDateBounds(prefix, "month");
  const day = Math.min(source.getUTCDate(), lastDay(year, month));
  return parseDateBounds(`${prefix}-${String(day).padStart(2, "0")}`, "day");
}

export function exactGapDays(
  a: DateBounds | null,
  b: DateBounds | null,
): number | null {
  return a?.precision === "day" && b?.precision === "day"
    ? Math.abs(a.start - b.start) / DAY_MS
    : null;
}

export function dateRangeBounds(
  from: string,
  to: string,
): { start: number; end: number; valid: boolean } {
  const a = from ? parseDateBounds(from) : null;
  const b = to ? parseDateBounds(to) : null;
  const start = a?.start ?? -Infinity;
  const end = b?.end ?? Infinity;
  return { start, end, valid: (!from || !!a) && (!to || !!b) && start <= end };
}

/** Overlap means potentially in range; it does not resolve uncertain dates. */
export function overlapsDateRange(
  bounds: DateBounds | null,
  range: ReturnType<typeof dateRangeBounds>,
  includeUndated: boolean,
): boolean {
  return (
    range.valid &&
    (bounds
      ? bounds.start <= range.end && bounds.end >= range.start
      : includeUndated)
  );
}

/** Exact-day month window only. Imprecise dates cannot establish this claim. */
export function withinCalendarMonths(
  a: DateBounds | null,
  b: DateBounds | null,
  months: number,
): boolean {
  if (!Number.isSafeInteger(months) || months < 0)
    throw new RangeError("Month window must be a non-negative whole number");
  if (a?.precision !== "day" || b?.precision !== "day") return false;
  const first = new Date(Math.min(a.start, b.start));
  const later = new Date(Math.max(a.start, b.start));
  const gap =
    (later.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    later.getUTCMonth() -
    first.getUTCMonth();
  if (gap !== months) return gap < months;
  return (
    later.getUTCDate() <=
    Math.min(
      first.getUTCDate(),
      lastDay(later.getUTCFullYear(), later.getUTCMonth() + 1),
    )
  );
}
