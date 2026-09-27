import { describe, expect, it } from "vitest";
import data from "../src/data/projects.json";
import type { Comparison, Coordinate, Project } from "../src/types";
import { centerPoint, compareProjects, isNearby } from "../src/lib/comparisons";
import {
  mapPresentation,
  MAP_MARKER_LIMIT,
  HEAT_POINT_LIMIT,
} from "../src/lib/mapPresentation";
import {
  connectionLabelPoint,
  connectionSegments,
  mapConnections,
  MAP_CONNECTOR_LIMIT,
  proximityRadiusLabel,
  proximityRadiusMeters,
} from "../src/lib/mapOverlays";
import {
  utilityKind,
  utilityLabel,
  utilityShortLabel,
} from "../src/components/UtilityIcon";

const projects = data as Project[];
const centers = new Map(projects.map((p) => [p.id, centerPoint(p)]));
const pairs = compareProjects(projects);
const nearby = pairs.filter((pair) => isNearby(pair, 25));

describe("map proximity overlays", () => {
  it("uses exactly half the physical threshold, with labels in the chosen units", () => {
    expect(proximityRadiusMeters(25)).toBeCloseTo(20116.8, 8);
    expect(proximityRadiusLabel(25, "mi")).toBe("12.5 mi radius");
    expect(proximityRadiusLabel(25, "km")).toBe("20.12 km radius");
    expect(proximityRadiusMeters(40 / 1.609344)).toBeCloseTo(20000, 8);
    for (const value of [0, -1, NaN, Infinity, Number.MAX_VALUE]) {
      expect(proximityRadiusMeters(value)).toBeNull();
      expect(proximityRadiusLabel(value, "km")).toBeNull();
    }
  });

  it("never infers a nearby match from the visible points or selected comparison", () => {
    const result = mapConnections([], nearby[0], projects, centers, 25);
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0]).toMatchObject({
      selected: true,
      matched: false,
    });
    expect(result.matchedProjectIds.size).toBe(0);
    expect(result.providedMatchCount).toBe(0);
    expect(mapConnections([], null, projects, centers, 25).connections).toEqual(
      [],
    );
  });

  it("counts the six supplied demo matches while drawing only the selected measurement", () => {
    const original = JSON.stringify(projects);
    const result = mapConnections(pairs, nearby[0], projects, centers, 25);
    expect(result.providedMatchCount).toBe(6);
    expect(result.connections).toHaveLength(1);
    expect(Object.fromEntries(result.matchCounts)).toEqual({
      DESC_1: 1,
      DESC_2: 1,
      DESC_3: 2,
      DESC_5: 2,
      GPC_1: 2,
      GPC_2: 2,
      GPC_3: 2,
    });
    expect([...result.matchUtilities.get("DESC_3")!]).toEqual(["GPC"]);
    expect(
      mapConnections(pairs, null, projects, centers, 25).connections,
    ).toEqual([]);
    expect(result.connections[0].comparison.id).toBe(nearby[0].id);
    expect(result.connections[0].selected).toBe(true);
    expect(
      mapConnections(
        [nearby[0]],
        null,
        projects,
        centers,
        nearby[0].distanceMiles!,
      ).connections,
    ).toEqual([]);
    expect(projects.find((p) => p.id === "GPC_1")!.shortName).toContain("#5");
    expect(JSON.stringify(projects)).toBe(original);
  });

  it("drops missing, stale, same-utility and duplicate pair results", () => {
    const pair = nearby[0];
    expect(
      mapConnections([pair, pair], pair, projects, centers, 25)
        .providedMatchCount,
    ).toBe(1);
    expect(
      mapConnections(
        [pair],
        pair,
        projects.filter((p) => p.id !== pair.a.id),
        centers,
        25,
      ).connections,
    ).toEqual([]);
    const moved = new Map(centers);
    moved.set(pair.a.id, [0, 0]);
    expect(
      mapConnections([pair], pair, projects, moved, 25).connections,
    ).toEqual([]);
    moved.set(pair.a.id, null);
    expect(
      mapConnections([pair], pair, projects, moved, 25).connections,
    ).toEqual([]);
    const sameCompany = { ...pair, b: { ...pair.b, company: pair.a.company } };
    expect(
      mapConnections([sameCompany], null, projects, centers, 25).connections,
    ).toEqual([]);
  });

  it("bounds measurements and pins a selected pair while keeping sampling and heat bounded", () => {
    const many = Array.from({ length: 10000 }, (_, i) => ({
      ...projects[i % 10],
      id: `p-${i}`,
      company: i === 0 ? "DESC" : "GPC",
    }));
    const points = new Map(
      many.map((p, i) => [p.id, [32 + i / 100000, -81] as Coordinate]),
    );
    const comparisons: Comparison[] = many.slice(1, 501).map((p) => ({
      id: `pair-${p.id}`,
      a: many[0],
      b: { ...p, company: "GPC" },
      aCenter: points.get(many[0].id)!,
      bCenter: points.get(p.id)!,
      distanceMiles: 1,
      gapDays: 0,
    }));
    const selected = comparisons[499];
    const result = mapConnections(comparisons, selected, many, points, 25);
    expect(result.connections).toHaveLength(MAP_CONNECTOR_LIMIT);
    expect(result.connections[0].comparison.id).toBe(selected.id);
    expect(result.providedMatchCount).toBe(500);
    expect(result.matchCounts.get(many[0].id)).toBe(500);
    const display = mapPresentation(many, points, [
      selected.a.id,
      selected.b.id,
      many[9999].id,
    ]);
    expect(display.markers.length).toBeLessThanOrEqual(MAP_MARKER_LIMIT);
    expect(
      display.markers.filter((item) =>
        [selected.a.id, selected.b.id, many[9999].id].includes(item.project.id),
      ),
    ).toHaveLength(3);
    expect(display.heat.length).toBeLessThanOrEqual(HEAT_POINT_LIMIT);
    expect(display.heat.reduce((sum, point) => sum + point[2], 0)).toBe(10000);
  });

  it("deduplicates counterparts across reversed or repeated pair IDs and rejects stale utility membership", () => {
    const pair = nearby[0];
    const reverse: Comparison = {
      ...pair,
      id: "reverse-copy",
      a: pair.b,
      b: pair.a,
      aCenter: pair.bCenter,
      bCenter: pair.aCenter,
    };
    const result = mapConnections(
      [pair, reverse, { ...pair, id: "another-copy" }],
      reverse,
      projects,
      centers,
      25,
    );
    expect(result.providedMatchCount).toBe(1);
    expect(result.matchCounts.get(pair.a.id)).toBe(1);
    expect(result.matchCounts.get(pair.b.id)).toBe(1);
    expect(result.connections[0].matched).toBe(true);
    const changed = projects.map((p) =>
      p.id === pair.a.id ? { ...p, company: "Updated utility" } : p,
    );
    expect(
      mapConnections([pair], pair, changed, centers, 25).matchedProjectIds.size,
    ).toBe(0);
    expect(
      mapConnections([pair], pair, changed, centers, 25).connections,
    ).toEqual([]);
  });

  it("measures a selected outside-limit pair without giving either endpoint a match", () => {
    const pair = pairs.find(
      (p) => !isNearby(p, 25) && p.distanceMiles !== null,
    )!;
    const result = mapConnections([pair], pair, projects, centers, 25);
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].matched).toBe(false);
    expect(result.matchCounts.size).toBe(0);
  });

  it("positions separation labels between displayed points, including the dateline", () => {
    expect(connectionLabelPoint([32, -81], [34, -83])).toEqual([33, -82]);
    expect(connectionLabelPoint([10, 179.5], [11, -179.5])).toEqual([
      10.5, -180,
    ]);
    expect(connectionLabelPoint([11, -179.5], [10, 179.5])).toEqual([
      10.5, -180,
    ]);
  });

  it("splits dateline connectors without moving or mutating either source center", () => {
    const a: Coordinate = [10, 179.5];
    const b: Coordinate = [11, -179.5];
    expect(connectionSegments(a, b)).toEqual([
      [a, [10.5, 180]],
      [[10.5, -180], b],
    ]);
    expect(connectionSegments(b, a)).toEqual([
      [b, [10.5, -180]],
      [[10.5, 180], a],
    ]);
    expect(connectionSegments([10, 180], [11, -180])).toEqual([
      [
        [10, 180],
        [11, 180],
      ],
      [
        [10, -180],
        [11, -180],
      ],
    ]);
    expect(a).toEqual([10, 179.5]);
    expect(b).toEqual([11, -179.5]);
    expect(connectionSegments([32, -81], [33, -82])).toEqual([
      [
        [32, -81],
        [33, -82],
      ],
    ]);
  });
});

describe("utility presentation", () => {
  it("pairs known names with distinct icons and preserves imported utility names", () => {
    expect(utilityKind("DESC")).toBe("dominion");
    expect(utilityLabel("DESC")).toBe("Dominion Energy South Carolina");
    expect(utilityShortLabel("DESC")).toBe("Dominion Energy SC");
    expect(utilityKind("GPC")).toBe("georgia");
    expect(utilityLabel("GPC")).toBe("Georgia Power");
    expect(utilityKind("Regional Electric")).toBe("other");
    expect(utilityLabel("Regional Electric")).toBe("Regional Electric");
  });
});
