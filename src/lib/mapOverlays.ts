import type { Comparison, Coordinate, Project } from "../types";
import { isNearby, milesToUnit } from "./comparisons";

export const MAP_CONNECTOR_LIMIT = 200;

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
  const ids = new Set(projects.map((p) => p.id));
  const current = (pair: Comparison) =>
    pair.a.id !== pair.b.id &&
    pair.a.company !== pair.b.company &&
    ids.has(pair.a.id) &&
    ids.has(pair.b.id) &&
    sameCenter(pair.aCenter, centers.get(pair.a.id)) &&
    sameCenter(pair.bCenter, centers.get(pair.b.id));
  const valid = new Map<string, Comparison>();
  for (const pair of matches) {
    if (current(pair) && isNearby(pair, thresholdMiles))
      valid.set(pair.id, pair);
  }
  const ordered: Comparison[] = [];
  if (selected && current(selected)) ordered.push(selected);
  for (const pair of valid.values()) {
    if (pair.id !== selected?.id && ordered.length < MAP_CONNECTOR_LIMIT)
      ordered.push(pair);
  }
  const connections: MapConnection[] = ordered.map((comparison) => ({
    comparison,
    aCenter: centers.get(comparison.a.id)!,
    bCenter: centers.get(comparison.b.id)!,
    matched: valid.has(comparison.id),
    selected: comparison.id === selected?.id,
  }));
  const matchedProjectIds = new Set<string>();
  for (const pair of valid.values()) {
    matchedProjectIds.add(pair.a.id);
    matchedProjectIds.add(pair.b.id);
  }
  return {
    connections,
    matchedProjectIds,
    providedMatchCount: valid.size,
    shownMatchCount: connections.filter((pair) => pair.matched).length,
  };
}
