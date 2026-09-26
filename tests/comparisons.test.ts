import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  Comparison,
  Coordinate,
  Filters,
  Project,
  Scenario,
} from "../src/types";
import {
  buildScenarioSummary,
  centerPoint,
  compareProjects,
  filterProjects,
  haversineMiles,
  isNearby,
  milesFromUnit,
  milesToUnit,
  scenarioProjects,
  scenarioYearProjects,
  shiftDateYears,
} from "../src/lib/comparisons";

function project(
  id: string,
  company: Project["company"],
  coordinate: Coordinate | null = [0, 0],
  date: string | null = "2026-01-01",
): Project {
  return {
    id,
    company,
    utility: company,
    name: id,
    shortName: id,
    state: "test",
    endpoints: [{ name: "Fixture endpoint", coordinate }],
    originalDate: date,
    originalDateRaw: date,
    dateMeaning: "planned_in_service",
    originalSource: {
      title: "Independent fixture",
      url: "",
      page: 1,
      asOf: "2026",
      dateNote: "",
    },
    review: {
      scope: "Fixture",
      locationNote: "",
      status: "test",
      latestDate: null,
      latestDatePrecision: "",
      dateNote: "",
      sourceUrl: "",
      sourcePage: 1,
      warnings: [],
    },
  };
}

const dataset = JSON.parse(
  readFileSync(new URL("../src/data/projects.json", import.meta.url), "utf8"),
) as Project[];
const filters: Filters = {
  companies: ["DESC", "GPC"],
  from: "",
  to: "",
  includeUndated: true,
};
const scenario: Scenario = {
  targetYear: 2026,
  shifts: { DESC: 0, GPC: 0 },
  windowMonths: 1,
};

describe("location proxies and spherical distance", () => {
  it("averages valid complete coordinates, falls back to one, and never synthesizes zero from missing points", () => {
    const p = project("a", "DESC");
    p.endpoints = [
      { name: "First", coordinate: [30, -82] },
      { name: "Second", coordinate: [34, -80] },
    ];
    expect(centerPoint(p)).toEqual([32, -81]);
    p.endpoints[1].coordinate = null;
    expect(centerPoint(p)).toEqual([30, -82]);
    p.endpoints[0].coordinate = null;
    expect(centerPoint(p)).toBeNull();
    expect(centerPoint({ ...p, endpoints: [] })).toBeNull();
    p.endpoints = [
      { name: "Invalid latitude", coordinate: [91, 0] },
      { name: "Invalid longitude", coordinate: [0, 181] },
      { name: "Not finite", coordinate: [NaN, 0] },
      { name: "Only real point", coordinate: [0, 0] },
    ];
    expect(centerPoint(p)).toEqual([0, 0]);
  });

  it("matches independent equatorial and antipodal distances, handles coincident points and validates inputs", () => {
    // Equatorial arc lengths are radius × angle, independently of the haversine formula.
    expect(haversineMiles([0, 0], [0, 1])).toBeCloseTo(69.093418985531, 9);
    expect(haversineMiles([0, 0], [0, 180])).toBeCloseTo(12436.81541739558, 7);
    expect(haversineMiles([32, -81], [32, -81])).toBe(0);
    expect(haversineMiles([1, 179.9], [1, -179.9])).toBeLessThan(14);
    expect(() => haversineMiles([Infinity, 0], [0, 0])).toThrow(RangeError);
  });
});

describe("all original workbook comparisons", () => {
  it("evaluates all 25 pairs and reproduces all six rounded distances and exact milestone gaps", () => {
    expect(dataset).toHaveLength(10);
    const comparisons = compareProjects(dataset);
    expect(comparisons).toHaveLength(25);
    expect(new Set(comparisons.map((pair) => pair.id)).size).toBe(25);
    const nearby = comparisons.filter((pair) => isNearby(pair, 25));
    expect(
      nearby.map((pair) => [
        pair.a.id,
        pair.b.id,
        Number(pair.distanceMiles!.toFixed(2)),
        pair.gapDays,
      ]),
    ).toEqual([
      ["DESC_2", "GPC_1", 4.09, 3074],
      ["DESC_3", "GPC_2", 5.65, 152],
      ["DESC_3", "GPC_3", 7.55, 517],
      ["DESC_1", "GPC_1", 8.01, 3074],
      ["DESC_5", "GPC_2", 14.34, 365],
      ["DESC_5", "GPC_3", 14.81, 730],
    ]);
    expect(comparisons[6].distanceMiles).toBeCloseTo(64.76831195006194, 9);
  });

  it("expands comparisons for an unseen project instead of using a programmed match list", () => {
    const extra = project("DESC_NEW", "DESC", [32, -81], "2028-02-29");
    const comparisons = compareProjects([...dataset, extra]);
    expect(comparisons).toHaveLength(30);
    expect(
      comparisons.filter(
        (pair) => pair.a.id === extra.id || pair.b.id === extra.id,
      ),
    ).toHaveLength(5);
    expect(compareProjects([extra])).toEqual([]);
    expect(compareProjects([extra, project("DESC_OTHER", "DESC")])).toEqual([]);
  });
});

describe("comparison rules", () => {
  it("keeps unknown geometry/date gaps unknown, sorts null last and breaks distance ties by stable ID", () => {
    const a = project("a", "DESC", [0, 0], "2024-02-28");
    const b = project("b", "GPC", [0, 1], "2024-03-01");
    const c = project("c", "GPC", [0, 1], null);
    const d = project("d", "GPC", null, "2026-02-30");
    const comparisons = compareProjects([d, c, a, b]);
    expect(comparisons.map((pair) => pair.id)).toEqual([
      "a::b",
      "a::c",
      "a::d",
    ]);
    expect(comparisons.map((pair) => pair.gapDays)).toEqual([2, null, null]);
    expect(comparisons[2].distanceMiles).toBeNull();
    expect(compareProjects([a, b, c, d])).toEqual(comparisons);
    expect(() => compareProjects([a, { ...b, id: "a" }])).toThrow("unique");
  });

  it("uses the strict unrounded cutoff, with zero not a false match and unknown never close", () => {
    const pair = compareProjects([
      project("a", "DESC"),
      project("b", "GPC"),
    ])[0];
    const at = (distanceMiles: number | null): Comparison => ({
      ...pair,
      distanceMiles,
    });
    expect(isNearby(at(24.999), 25)).toBe(true);
    expect(isNearby(at(25), 25)).toBe(false);
    expect(isNearby(at(25.001), 25)).toBe(false);
    expect(isNearby(at(0), 0)).toBe(false);
    expect(isNearby(at(0), 0.001)).toBe(true);
    expect(isNearby(at(null), 25)).toBe(false);
    expect(isNearby(at(NaN), 25)).toBe(false);
    expect(isNearby(at(1), NaN)).toBe(false);
    expect(isNearby(at(1), -1)).toBe(false);
  });

  it("converts units exactly without treating 25 miles as exactly 40 kilometers", () => {
    expect(milesToUnit(25, "km")).toBeCloseTo(40.2336, 12);
    expect(milesToUnit(25, "mi")).toBe(25);
    expect(milesFromUnit(40, "km")).toBeCloseTo(24.854847689493, 10);
    expect(milesFromUnit(25, "mi")).toBe(25);
    expect(milesFromUnit(milesToUnit(13.721, "km"), "km")).toBeCloseTo(
      13.721,
      12,
    );
  });
});

describe("date and company filters", () => {
  const rows = [
    project("jan", "DESC", [0, 0], "2026-01-01"),
    project("dec", "GPC", [0, 0], "2026-12-31"),
    project("before", "DESC", [0, 0], "2025-12-31"),
    project("after", "GPC", [0, 0], "2027-01-01"),
    project("unknown", "DESC", null, null),
    project("invalid", "GPC", null, "2026-02-30"),
  ];
  it("includes both calendar boundaries and treats invalid/missing dates according to the undated control", () => {
    const bounds = {
      ...filters,
      from: "2026-01-01",
      to: "2026-12-31",
      includeUndated: false,
    };
    expect(filterProjects(rows, bounds).map((p) => p.id)).toEqual([
      "jan",
      "dec",
    ]);
    expect(
      filterProjects(rows, { ...bounds, includeUndated: true }).map(
        (p) => p.id,
      ),
    ).toEqual(["jan", "dec", "unknown", "invalid"]);
    expect(
      filterProjects(rows, {
        ...filters,
        to: "2026-01-01",
        includeUndated: false,
      }).map((p) => p.id),
    ).toEqual(["jan", "before"]);
  });
  it("honors company selection including none, empty bounds and invalid ranges", () => {
    expect(filterProjects(rows, { ...filters, companies: [] })).toEqual([]);
    expect(
      filterProjects(rows, { ...filters, companies: ["DESC"] }).map(
        (p) => p.id,
      ),
    ).toEqual(["jan", "before", "unknown"]);
    expect(filterProjects(rows, filters)).toHaveLength(6);
    expect(
      filterProjects(rows, {
        ...filters,
        from: "2027-01-01",
        to: "2026-12-31",
      }),
    ).toEqual([]);
    expect(filterProjects(rows, { ...filters, from: "invalid" })).toEqual([]);
  });
});

describe("explicit scenarios, never a forecast", () => {
  it("shifts whole years with leap-day clamping and keeps invalid dates unknown", () => {
    expect(shiftDateYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(shiftDateYears("2024-02-29", 4)).toBe("2028-02-29");
    expect(shiftDateYears("2024-02-29", -1)).toBe("2023-02-28");
    expect(shiftDateYears("2026-12-31", 1)).toBe("2027-12-31");
    expect(shiftDateYears("2026-02-30", 1)).toBeNull();
    expect(shiftDateYears("2028", 1)).toBeNull();
    expect(shiftDateYears(null, 1)).toBeNull();
    expect(() => shiftDateYears("2026-01-01", 0.5)).toThrow(RangeError);
  });

  it("filters the target year after company shifts and preserves input dates, source text and nested data", () => {
    const rows = [
      project("a", "DESC", [30, -80], "2024-02-29"),
      project("b", "GPC", [30, -81], "2026-12-31"),
      project("missing", "DESC", null, null),
    ];
    const before = structuredClone(rows);
    const settings = {
      ...scenario,
      targetYear: 2025,
      shifts: { DESC: 1, GPC: -1 },
    };
    const shifted = scenarioProjects(rows, settings);
    expect(shifted.map((p) => p.originalDate)).toEqual([
      "2025-02-28",
      "2025-12-31",
      null,
    ]);
    expect(shifted[0].originalDateRaw).toBe("2024-02-29");
    expect(scenarioYearProjects(rows, settings).map((p) => p.id)).toEqual([
      "a",
      "b",
    ]);
    shifted[0].endpoints[0].coordinate![0] = 55;
    shifted[0].review.warnings.push("Only in clone");
    expect(rows).toEqual(before);
    expect(settings.shifts).toEqual({ DESC: 1, GPC: -1 });
  });

  it("uses an inclusive calendar-month window, clamps month end and only counts nearby pairs", () => {
    const rows = [
      project("a", "DESC", [0, 0], "2026-01-31"),
      project("b", "GPC", [0, 0.1], "2026-02-28"),
      project("c", "GPC", [0, 0.1], "2026-03-01"),
      project("d", "GPC", [0, 2], "2026-02-01"),
    ];
    const summary = buildScenarioSummary(rows, scenario, 25);
    expect(summary.comparisons).toHaveLength(3);
    expect(summary.nearby).toHaveLength(2);
    expect(summary.sameMilestoneWindow.map((pair) => pair.id)).toEqual([
      "a::b",
    ]);
    const reversed = buildScenarioSummary([rows[1], rows[0]], scenario, 25);
    expect(reversed.sameMilestoneWindow).toHaveLength(1);
    const laterIdFirst = [
      project("a", "DESC", [0, 0], "2026-02-28"),
      project("b", "GPC", [0, 0], "2026-01-31"),
    ];
    expect(
      buildScenarioSummary(laterIdFirst, scenario, 25).sameMilestoneWindow,
    ).toHaveLength(1);
    expect(
      buildScenarioSummary(rows, { ...scenario, windowMonths: 0 }, 25)
        .sameMilestoneWindow,
    ).toEqual([]);
    expect(
      buildScenarioSummary(
        [project("a", "DESC"), project("b", "GPC")],
        { ...scenario, windowMonths: 0 },
        25,
      ).sameMilestoneWindow,
    ).toHaveLength(1);
  });

  it("keeps leap-year month boundaries distinct from a fixed 30-day approximation", () => {
    const rows = [
      project("a", "DESC", [0, 0], "2028-01-31"),
      project("b", "GPC", [0, 0], "2028-02-29"),
      project("c", "GPC", [0, 0], "2028-03-01"),
    ];
    const summary = buildScenarioSummary(
      rows,
      { ...scenario, targetYear: 2028 },
      25,
    );
    expect(summary.sameMilestoneWindow.map((pair) => pair.id)).toEqual([
      "a::b",
    ]);
    expect(() =>
      buildScenarioSummary(rows, { ...scenario, windowMonths: -1 }, 25),
    ).toThrow(RangeError);
  });

  it("keeps wider valid calendar windows monotonic instead of overflowing the date representation", () => {
    const rows = [
      project("a", "DESC", [0, 0], "2026-01-31"),
      project("b", "GPC", [0, 0], "2026-12-31"),
    ];
    expect(
      buildScenarioSummary(rows, { ...scenario, windowMonths: 11 }, 25)
        .sameMilestoneWindow,
    ).toHaveLength(1);
    expect(
      buildScenarioSummary(
        rows,
        { ...scenario, windowMonths: Number.MAX_SAFE_INTEGER },
        25,
      ).sameMilestoneWindow,
    ).toHaveLength(1);
  });

  it("does not mutate dataset records, sorting, endpoint coordinates or scenario inputs", () => {
    const before = structuredClone(dataset);
    const settings = {
      ...scenario,
      targetYear: 2027,
      shifts: { DESC: 2, GPC: 0 },
    };
    const settingsBefore = structuredClone(settings);
    centerPoint(dataset[0]);
    compareProjects(dataset);
    filterProjects(dataset, filters);
    buildScenarioSummary(dataset, settings, 25);
    expect(dataset).toEqual(before);
    expect(settings).toEqual(settingsBefore);
  });
});
