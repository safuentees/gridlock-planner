import { describe, expect, it } from "vitest";
import {
  mapPresentation,
  MAP_MARKER_LIMIT,
  HEAT_POINT_LIMIT,
} from "../src/lib/mapPresentation";
import {
  monthISO,
  monthEndISO,
  timelineDistribution,
} from "../src/lib/timeline";
import { parseDateBounds } from "../src/lib/temporal";
import data from "../src/data/projects.json";
import type { Coordinate, Project } from "../src/types";

describe("bounded map presentation", () => {
  it("retains all heat weight while limiting markers and pinning selection", () => {
    const projects = Array.from({ length: 20000 }, (_, i) => ({
      ...data[0],
      id: `id-${i}`,
    })) as Project[];
    const centers = new Map(
      projects.map((p, i) => [
        p.id,
        [-80 + (i % 160), -179 + (i % 358)] as Coordinate,
      ]),
    );
    const result = mapPresentation(projects, centers, ["id-19999"]);
    expect(result.markers.length).toBeLessThanOrEqual(MAP_MARKER_LIMIT);
    expect(result.markers.some((r) => r.project.id === "id-19999")).toBe(true);
    expect(result.heat.length).toBeLessThanOrEqual(HEAT_POINT_LIMIT);
    expect(result.heat.reduce((sum, p) => sum + p[2], 0)).toBe(20000);
    expect(new Set(result.markers.map((r) => r.project.id)).size).toBe(
      result.markers.length,
    );
    expect(mapPresentation(projects, centers, ["id-19999"])).toEqual(result);
  });
  it("does not draw unknown locations or invent zero coordinates", () => {
    const projects = data as Project[];
    expect(mapPresentation(projects, new Map()).locatedCount).toBe(0);
    expect(
      mapPresentation(projects, new Map([[projects[0].id, [0, 0]]])).markers[0]
        .center,
    ).toEqual([0, 0]);
  });
});
describe("timeline coverage", () => {
  it("preserves year uncertainty and distinguishes missing dates", () => {
    const d = timelineDistribution([
      parseDateBounds("2028"),
      parseDateBounds("2028-06"),
      parseDateBounds("2028-06-15"),
      null,
    ]);
    expect(d.unknown).toBe(1);
    expect(d.imprecise).toBe(2);
    expect(d.bins).toHaveLength(12);
    expect(d.bins[5].count).toBe(3);
    expect(d.bins[0].count).toBe(1);
  });
  it("handles UTC leap month and upper calendar boundary", () => {
    expect(monthEndISO(2028 * 12 + 1)).toBe("2028-02-29");
    expect(monthISO(1 * 12)).toBe("0001-01");
    const d = timelineDistribution([parseDateBounds("9999-12-31")]);
    expect(d.max).toBe(9999 * 12 + 11);
    expect(d.max).toBeGreaterThan(d.min);
  });
  it("bounds chart bars across centuries without inflating counts", () => {
    const d = timelineDistribution([
      parseDateBounds("1900"),
      parseDateBounds("2200"),
    ]);
    expect(d.bins.length).toBeLessThanOrEqual(72);
    expect(Math.max(...d.bins.map((b) => b.count))).toBe(1);
  });
});
