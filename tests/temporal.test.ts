import { describe, expect, it } from "vitest";
import {
  dateRangeBounds,
  exactGapDays,
  overlapsDateRange,
  parseDateBounds,
  shiftDateBounds,
  withinCalendarMonths,
} from "../src/lib/temporal";

describe("source precision and separate scenario intervals", () => {
  it("preserves day/month/year precision and inclusive uncertainty bounds", () => {
    const day = parseDateBounds("2024-02-29")!;
    expect(day.start).toBe(day.end);
    const month = parseDateBounds("2024-02", "month")!;
    expect(new Date(month.end).toISOString().slice(0, 10)).toBe("2024-02-29");
    const year = parseDateBounds("2024", "year")!;
    expect(new Date(year.start).toISOString().slice(0, 10)).toBe("2024-01-01");
    expect(new Date(year.end).toISOString().slice(0, 10)).toBe("2024-12-31");
    expect(parseDateBounds("2024-01-01", "year")!.label).toBe("2024");
    expect(exactGapDays(month, day)).toBeNull();
    expect(exactGapDays(day, parseDateBounds("2024-03-01"))).toBe(1);
  });
  it("rejects invalid or overstated precision and retains unknowns", () => {
    for (const value of [
      null,
      "",
      "2026-02-29",
      "0000",
      "2026-13",
      "2026-00-01",
      "2026-01-00",
      "2026-1-01",
      "2026-01-01T00:00:00Z",
    ])
      expect(parseDateBounds(value)).toBeNull();
    expect(parseDateBounds("2026", "day")).toBeNull();
    expect(parseDateBounds("2026-02", "day")).toBeNull();
    expect(parseDateBounds("2026-01-01", "unknown")).toBeNull();
    expect(parseDateBounds("0099-02-28")!.label).toBe("0099-02-28");
  });
  it("shifts calendar bounds without mutating source values, including leap days and years 1..9999", () => {
    const source = parseDateBounds("2024-02-29")!;
    const before = { ...source };
    expect(shiftDateBounds(source, 1)!.label).toBe("2025-02-28");
    expect(shiftDateBounds(parseDateBounds("2024-02"), 1)!.label).toBe(
      "2025-02",
    );
    expect(shiftDateBounds(parseDateBounds("2024"), -1)!.label).toBe("2023");
    expect(source).toEqual(before);
    expect(shiftDateBounds(null, 0)).toBeNull();
    expect(() => shiftDateBounds(source, 0.5)).toThrow("whole");
    expect(() => shiftDateBounds(parseDateBounds("0001"), -1)).toThrow("9999");
    expect(() => shiftDateBounds(parseDateBounds("9999"), 1)).toThrow("9999");
  });
  it("filters imprecise dates by potential overlap and exact month windows only when justified", () => {
    const range = dateRangeBounds("2026-02-15", "2026-02-20");
    expect(overlapsDateRange(parseDateBounds("2026-02"), range, false)).toBe(
      true,
    );
    expect(overlapsDateRange(parseDateBounds("2026-03"), range, false)).toBe(
      false,
    );
    expect(overlapsDateRange(null, range, true)).toBe(true);
    expect(overlapsDateRange(null, range, false)).toBe(false);
    expect(dateRangeBounds("2027", "2026").valid).toBe(false);
    expect(
      withinCalendarMonths(
        parseDateBounds("2026-01-31"),
        parseDateBounds("2026-02-28"),
        1,
      ),
    ).toBe(true);
    expect(
      withinCalendarMonths(
        parseDateBounds("2026-01-31"),
        parseDateBounds("2026-03-01"),
        1,
      ),
    ).toBe(false);
    expect(
      withinCalendarMonths(
        parseDateBounds("2026-01"),
        parseDateBounds("2026-02"),
        1,
      ),
    ).toBe(false);
  });
});
