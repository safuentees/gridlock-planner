import type {
  Comparison,
  Coordinate,
  Filters,
  Project,
  Scenario,
} from "../types";

const EARTH_RADIUS_MILES = 3958.7613;
const KM_PER_MILE = 1.609344;
const DAY_MS = 86_400_000;

function validCoordinate(value: Coordinate | null): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Math.abs(value[0]) <= 90 &&
    Number.isFinite(value[1]) &&
    Math.abs(value[1]) <= 180
  );
}

/** Arithmetic mean of complete, valid endpoint pairs; a single endpoint is a proxy. */
export function centerPoint(project: Project): Coordinate | null {
  const points = project.endpoints
    .map((endpoint) => endpoint.coordinate)
    .filter(validCoordinate);
  if (!points.length) return null;
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
}

export function haversineMiles(a: Coordinate, b: Coordinate): number {
  if (!validCoordinate(a) || !validCoordinate(b))
    throw new RangeError("Invalid geographic coordinate");
  const [latA, lonA, latB, lonB] = [...a, ...b].map(
    (value) => (value * Math.PI) / 180,
  );
  const h =
    Math.sin((latB - latA) / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin((lonB - lonA) / 2) ** 2;
  const bounded = Math.min(1, Math.max(0, h));
  return (
    2 *
    EARTH_RADIUS_MILES *
    Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded))
  );
}

/** Strict ISO calendar dates only; no timezone parsing or rollover of invalid dates. */
function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  result.setUTCHours(0, 0, 0, 0);
  return result.getUTCFullYear() === year &&
    result.getUTCMonth() === month - 1 &&
    result.getUTCDate() === day
    ? result
    : null;
}

function lexical(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Each unordered cross-company pair appears once, with stable IDs and null distances last. */
export function compareProjects(projects: Project[]): Comparison[] {
  const sorted = [...projects].sort((a, b) => lexical(a.id, b.id));
  if (new Set(sorted.map((project) => project.id)).size !== sorted.length) {
    throw new RangeError("Project IDs must be unique");
  }
  const comparisons: Comparison[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.company === b.company) continue;
      const aCenter = centerPoint(a);
      const bCenter = centerPoint(b);
      const aDate = parseDate(a.originalDate);
      const bDate = parseDate(b.originalDate);
      comparisons.push({
        id: `${encodeURIComponent(a.id)}::${encodeURIComponent(b.id)}`,
        a,
        b,
        aCenter,
        bCenter,
        distanceMiles:
          aCenter && bCenter ? haversineMiles(aCenter, bCenter) : null,
        gapDays:
          aDate && bDate
            ? Math.abs(aDate.getTime() - bDate.getTime()) / DAY_MS
            : null,
      });
    }
  }
  return comparisons.sort((a, b) => {
    if (a.distanceMiles === null && b.distanceMiles !== null) return 1;
    if (a.distanceMiles !== null && b.distanceMiles === null) return -1;
    return (
      (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0) || lexical(a.id, b.id)
    );
  });
}

/** Inclusive calendar-date bounds; an empty bound is open. No selected companies means no rows. */
export function filterProjects(
  projects: Project[],
  filters: Filters,
): Project[] {
  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  if (
    (filters.from && !from) ||
    (filters.to && !to) ||
    (from && to && from > to)
  )
    return [];
  return projects.filter((project) => {
    if (!filters.companies.includes(project.company)) return false;
    const date = parseDate(project.originalDate);
    if (!date) return filters.includeUndated;
    return (!from || date >= from) && (!to || date <= to);
  });
}

/** Chosen proof-of-concept boundary: strictly less than the unrounded threshold. */
export function isNearby(
  comparison: Comparison,
  thresholdMiles: number,
): boolean {
  return (
    comparison.distanceMiles !== null &&
    Number.isFinite(comparison.distanceMiles) &&
    comparison.distanceMiles >= 0 &&
    Number.isFinite(thresholdMiles) &&
    thresholdMiles > 0 &&
    comparison.distanceMiles < thresholdMiles
  );
}

export function milesToUnit(miles: number, unit: "mi" | "km"): number {
  return unit === "km" ? miles * KM_PER_MILE : miles;
}

export function milesFromUnit(value: number, unit: "mi" | "km"): number {
  return unit === "km" ? value / KM_PER_MILE : value;
}

function lastDay(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month + 1, 0);
  return date.getUTCDate();
}

/** A leap-day anniversary becomes February 28 in a non-leap year. Invalid dates stay unknown. */
export function shiftDateYears(
  value: string | null,
  years: number,
): string | null {
  if (!Number.isSafeInteger(years))
    throw new RangeError("Scenario year shifts must be whole years");
  const date = parseDate(value);
  if (!date) return null;
  const year = date.getUTCFullYear() + years;
  if (year < 1 || year > 9999)
    throw new RangeError("Shifted year is outside the supported calendar");
  const day = Math.min(date.getUTCDate(), lastDay(year, date.getUTCMonth()));
  date.setUTCFullYear(year, date.getUTCMonth(), day);
  return date.toISOString().slice(0, 10);
}

/** Deep clones keep scenario adjustments separate from the supplied records and their evidence. */
export function scenarioProjects(
  projects: Project[],
  scenario: Scenario,
): Project[] {
  return projects.map((project) => ({
    ...structuredClone(project),
    originalDate: shiftDateYears(
      project.originalDate,
      scenario.shifts[project.company],
    ),
  }));
}

export function scenarioYearProjects(
  projects: Project[],
  scenario: Scenario,
): Project[] {
  if (
    !Number.isInteger(scenario.targetYear) ||
    scenario.targetYear < 1 ||
    scenario.targetYear > 9999
  ) {
    throw new RangeError("Scenario target year must be a calendar year");
  }
  return scenarioProjects(projects, scenario).filter(
    (project) =>
      parseDate(project.originalDate)?.getUTCFullYear() === scenario.targetYear,
  );
}

/** Inclusive window from the earlier milestone plus UTC calendar months, clamped at month end. */
function sameMonthWindow(comparison: Comparison, months: number): boolean {
  const a = parseDate(comparison.a.originalDate);
  const b = parseDate(comparison.b.originalDate);
  if (!a || !b) return false;
  const earlier = a <= b ? a : b;
  const later = a <= b ? b : a;
  const monthGap =
    (later.getUTCFullYear() - earlier.getUTCFullYear()) * 12 +
    later.getUTCMonth() -
    earlier.getUTCMonth();
  if (monthGap !== months) return monthGap < months;
  // Equivalent to adding UTC months to the earlier date with month-end clamping,
  // without overflowing Date for large, otherwise valid window values.
  const endDay = Math.min(
    earlier.getUTCDate(),
    lastDay(later.getUTCFullYear(), later.getUTCMonth()),
  );
  return later.getUTCDate() <= endDay;
}

export function buildScenarioSummary(
  projects: Project[],
  scenario: Scenario,
  thresholdMiles: number,
): {
  projects: Project[];
  comparisons: Comparison[];
  nearby: Comparison[];
  sameMilestoneWindow: Comparison[];
} {
  if (
    !Number.isSafeInteger(scenario.windowMonths) ||
    scenario.windowMonths < 0
  ) {
    throw new RangeError(
      "Milestone window must be a non-negative whole number of months",
    );
  }
  const shifted = scenarioYearProjects(projects, scenario);
  const comparisons = compareProjects(shifted);
  const nearby = comparisons.filter((comparison) =>
    isNearby(comparison, thresholdMiles),
  );
  return {
    projects: shifted,
    comparisons,
    nearby,
    sameMilestoneWindow: nearby.filter((comparison) =>
      sameMonthWindow(comparison, scenario.windowMonths),
    ),
  };
}
