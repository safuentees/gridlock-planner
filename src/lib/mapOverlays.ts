import type { Comparison, Coordinate, Project } from "../types";
import { isNearby, milesToUnit } from "./comparisons";

export const MAP_CONNECTOR_LIMIT = 1;

/** These radii illustrate center-point proximity, never the size of project work. */
export function proximityRadiusMeters(thresholdMiles: number): number | null {
  const radius = (thresholdMiles * 1609.344) / 2;
  return Number.isFinite(radius) && thresholdMiles > 0 ? radius : null;
}

export function proximityRadiusLabel(
  thresholdMiles: number,
  unit: "mi" | "km",
): string | null {
  if (proximityRadiusMeters(thresholdMiles) === null) return null;
  const value = milesToUnit(thresholdMiles / 2, unit);
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit} radius`;
}

/** Split only the displayed connector at the dateline; never change source centers. */
export function connectionSegments(
  a: Coordinate,
  b: Coordinate,
): Coordinate[][] {
  if (Math.abs(b[1] - a[1]) <= 180) return [[a, b]];
  const edge = a[1] >= 0 ? 180 : -180;
  const wrappedB = b[1] + (a[1] >= 0 ? 360 : -360);
  if (wrappedB === a[1]) {
    return [
      [a, [b[0], a[1]]],
      [[a[0], b[1]], b],
    ];
  }
  const fraction = (edge - a[1]) / (wrappedB - a[1]);
  const latitude = a[0] + (b[0] - a[0]) * fraction;
  return [
    [a, [latitude, edge]],
    [[latitude, -edge], b],
  ];
}

/** Visual midpoint of the displayed separation, including dateline wrapping. */
export function connectionLabelPoint(a: Coordinate, b: Coordinate): Coordinate {
  const longitudeDelta = ((b[1] - a[1] + 540) % 360) - 180;
  return [(a[0] + b[0]) / 2, ((a[1] + longitudeDelta / 2 + 540) % 360) - 180];
}

interface MapConnection {
  comparison: Comparison;
  aCenter: Coordinate;
  bCenter: Coordinate;
  matched: boolean;
  selected: boolean;
}

function sameCenter(a: Coordinate | null, b: Coordinate | null | undefined) {
  return !!a && !!b && a[0] === b[0] && a[1] === b[1];
}

/** Exact supplied results only. Current centers reject stale geometry; a selected
 * comparison can overlay the bounded list without becoming a nearby match. */
export function mapConnections(
  matches: readonly Comparison[],
  selected: Comparison | null,
  projects: readonly Project[],
  centers: ReadonlyMap<string, Coordinate | null>,
  thresholdMiles: number,
) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const current = (pair: Comparison) =>
    pair.a.id !== pair.b.id &&
    pair.a.company !== pair.b.company &&
    byId.get(pair.a.id)?.company === pair.a.company &&
    byId.get(pair.b.id)?.company === pair.b.company &&
    sameCenter(pair.aCenter, centers.get(pair.a.id)) &&
    sameCenter(pair.bCenter, centers.get(pair.b.id));
  const key = (pair: Comparison) =>
    JSON.stringify([pair.a.id, pair.b.id].sort());
  const valid = new Map<string, Comparison>();
  for (const pair of matches) {
    if (current(pair) && isNearby(pair, thresholdMiles))
      valid.set(key(pair), pair);
  }
  // A single labeled measurement is easier to interpret than an unlabelled web.
  const connections: MapConnection[] =
    selected && current(selected)
      ? [
          {
            comparison: selected,
            aCenter: centers.get(selected.a.id)!,
            bCenter: centers.get(selected.b.id)!,
            matched: valid.has(key(selected)),
            selected: true,
          },
        ]
      : [];
  const counterpartIds = new Map<string, Set<string>>();
  const matchUtilities = new Map<string, Set<string>>();
  for (const pair of valid.values()) {
    for (const [project, counterpart] of [
      [pair.a, pair.b],
      [pair.b, pair.a],
    ]) {
      const ids = counterpartIds.get(project.id) ?? new Set<string>();
      ids.add(counterpart.id);
      counterpartIds.set(project.id, ids);
      const companies = matchUtilities.get(project.id) ?? new Set<string>();
      companies.add(counterpart.company);
      matchUtilities.set(project.id, companies);
    }
  }
  return {
    connections,
    matchedProjectIds: new Set(counterpartIds.keys()),
    matchCounts: new Map(
      [...counterpartIds].map(([id, ids]) => [id, ids.size]),
    ),
    matchUtilities,
    providedMatchCount: valid.size,
  };
}
