import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Coordinate, Project } from "../src/types";
import {
  centerPoint,
  compareProjects,
  haversineMiles,
  isNearby,
  milesFromUnit,
} from "../src/lib/comparisons";
import {
  APP_EARTH_RADIUS_MILES,
  candidateRadiusKm,
  prepareSpatialDataset,
  querySpatial,
  querySpatialExport,
  type SpatialQuery,
} from "../src/lib/spatial";
import {
  isCurrentSpatialResponse,
  visibleSpatialState,
  spatialScopeKey,
} from "../src/hooks/useSpatialQuery";

const dataset = JSON.parse(
  readFileSync(new URL("../src/data/projects.json", import.meta.url), "utf8"),
) as Project[];
const fixture = (
  id: string,
  company = "A",
  coordinate: Coordinate | null = [0, 0],
  date: string | null = "2026-01-01",
): Project => ({
  ...structuredClone(dataset[0]),
  id,
  company,
  endpoints: [{ name: id, coordinate }],
  originalDate: date,
  datePrecision: "day",
});
const defaults: SpatialQuery = {
  companies: ["A", "B", "C", "DESC", "GPC"],
  from: "",
  to: "",
  includeUndated: true,
  thresholdMiles: 25,
  timeBudgetMs: Infinity,
  maxCandidates: Infinity,
  maxNeighborsPerOrigin: Infinity,
};
const prepare = (rows: Project[]) =>
  prepareSpatialDataset(rows, {
    datasetVersion: "test",
    geometryVersion: "geometry",
  });
const run = (rows: Project[], options: Partial<SpatialQuery> = {}) =>
  querySpatial(prepare(rows), { ...defaults, ...options });

function seeded(n: number, dense = false): Project[] {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  return Array.from({ length: n }, (_, i) =>
    fixture(
      `p${String(i).padStart(4, "0")}`,
      i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
      dense
        ? [32 + random() / 10, -81 + random() / 10]
        : [-80 + random() * 160, -180 + random() * 360],
    ),
  );
}

describe("indexed geographic correctness", () => {
  it("retains original 25 possible, six strict nearby and exact detailed distance", async () => {
    const result = await run(dataset);
    const oracle = compareProjects(dataset).filter((pair) =>
      isNearby(pair, 25),
    );
    expect(result.complete).toBe(true);
    expect(result.possibleCount).toBe(25);
    expect(result.matchedCount).toBe(6);
    expect(result.pairs).toEqual(oracle);
    expect(
      result.pairs.find((p) => p.id === "DESC_3::GPC_3")!.distanceMiles,
    ).toBeCloseTo(7.5480907, 7);
  });
  it("matches brute force unrounded ranking on seeded sparse and clustered fixtures", async () => {
    for (const dense of [false, true]) {
      const rows = seeded(120, dense);
      const oracle = compareProjects(rows).filter((p) => isNearby(p, 25));
      const result = await run(rows, { limit: 200 });
      expect(result.complete).toBe(true);
      expect(result.pairs).toEqual(oracle.slice(0, 200));
      expect(result.matchedCount).toBe(oracle.length);
      expect(result.possibleCount).toBe(compareProjects(rows).length);
    }
  });
  it("prunes separated utility clusters without semantic-predicate full-tree scans", async () => {
    for (const n of [200, 400, 800, 5000]) {
      const rows = Array.from({ length: n }, (_, i) =>
        fixture(
          `${i < n / 2 ? "a" : "b"}${i}`,
          i < n / 2 ? "A" : "B",
          i < n / 2 ? [0, 0] : [30, 0],
        ),
      );
      const result = await run(rows, { maxCandidates: 250_000 });
      expect(result.complete).toBe(true);
      expect(result.matchedCount).toBe(0);
      expect(result.diagnostics.visitedPointCount).toBe(0);
      expect(result.diagnostics.radiusPrunedGroups).toBe(n / 2);
    }
  });
  it("keeps radius retrieval independent of date eligibility and handles company order independently of project ID", async () => {
    const rows = [
      fixture("z", "A", [0, 0], "2026-01-01"),
      fixture("a", "Z", [0, 0.1], "2026-01-02"),
      fixture("b", "Z", [0, 0.2], "2024-01-01"),
    ];
    const result = await run(rows, {
      companies: ["A", "Z"],
      from: "2026",
      to: "2026",
    });
    expect(result.pairs).toEqual(
      compareProjects(rows.slice(0, 2)).filter((pair) => isNearby(pair, 25)),
    );
    expect(result.diagnostics.candidateCount).toBe(2);
    expect(result.diagnostics.exactDistanceCount).toBe(1);
    const first = prepare(rows);
    const changed = rows.map((row, i) => (i ? row : { ...row, company: "Z" }));
    expect(
      prepareSpatialDataset(
        changed,
        { datasetVersion: "company-edit", geometryVersion: "geometry" },
        first,
      ).geometry,
    ).not.toBe(first.geometry);
  });
  it("uses longitude first, handles dateline/polar single points and does not repair the regional arithmetic midpoint", async () => {
    const rows = [
      fixture("a", "A", [1, 179.9]),
      fixture("b", "B", [1, -179.9]),
      fixture("c", "A", [89.99, -100]),
      fixture("d", "B", [89.99, 80]),
    ];
    expect((await run(rows)).pairs).toEqual(
      compareProjects(rows).filter((p) => isNearby(p, 25)),
    );
    const regional = fixture("regional");
    regional.endpoints = [
      { name: "west", coordinate: [0, 179] },
      { name: "east", coordinate: [0, -179] },
    ];
    expect(centerPoint(regional)).toEqual([0, 0]); // preserved proxy, not a global route centroid
    expect(
      (await run([regional, fixture("single", "B", [0, 0])])).pairs[0]
        .distanceMiles,
    ).toBe(0);
  });
  it("reconciles Earth radii and applies exact strict boundaries including hemisphere-scale radii", async () => {
    const a = fixture("a", "A", [0, 0]);
    const b = fixture("b", "B", [
      0,
      ((25 / APP_EARTH_RADIUS_MILES) * 180) / Math.PI,
    ]);
    const distance = haversineMiles(
      a.endpoints[0].coordinate!,
      b.endpoints[0].coordinate!,
    );
    expect(candidateRadiusKm(distance)).toBeGreaterThan(
      (distance / APP_EARTH_RADIUS_MILES) * 6371,
    );
    expect((await run([a, b], { thresholdMiles: distance })).matchedCount).toBe(
      0,
    );
    expect(
      (await run([a, b], { thresholdMiles: distance + 1e-9 })).matchedCount,
    ).toBe(1);
    expect(
      (await run([a, b], { thresholdMiles: distance - 1e-9 })).matchedCount,
    ).toBe(0);
    expect(
      (
        await run([a, b], {
          thresholdMiles: milesFromUnit(40.2336, "km") + 1e-9,
        })
      ).matchedCount,
    ).toBe(1);
    const antipode = fixture("z", "B", [0, 180]);
    expect(
      (await run([a, antipode], { thresholdMiles: 15000 })).matchedCount,
    ).toBe(1);
  });
  it("rejects duplicate IDs, encodes stable pair IDs, keeps ties stable and unknown geometry out of nearby matches", async () => {
    const rows = [
      fixture("b?", "B"),
      fixture("a::", "A"),
      fixture("c", "B"),
      fixture("missing", "C", null),
    ];
    const result = await run(rows);
    expect(result.possibleCount).toBe(5);
    expect(result.pairs.map((p) => p.id)).toEqual([
      "a%3A%3A::b%3F",
      "a%3A%3A::c",
    ]);
    expect((await run([...rows].reverse())).pairs).toEqual(result.pairs);
    expect(() => prepare([rows[0], rows[0]])).toThrow("unique");
    expect((await run([fixture("only")])).pairs).toEqual([]);
  });
});

describe("preparation, filtering and bounded output", () => {
  it("reuses geometry across dates, filters and shifts; detects changed centers despite stale geometry version", async () => {
    const rows = seeded(20);
    const first = prepare(rows);
    expect(
      prepareSpatialDataset(
        rows,
        { datasetVersion: "test", geometryVersion: "geometry" },
        first,
      ),
    ).toBe(first);
    const changedDates = rows.map((p) => ({
      ...p,
      originalDate: "2027-01-01",
    }));
    const second = prepareSpatialDataset(
      changedDates,
      { datasetVersion: "date-edit", geometryVersion: "geometry" },
      first,
    );
    expect(second.geometry).toBe(first.geometry);
    expect(second.indexReused).toBe(true);
    await querySpatial(second, {
      ...defaults,
      from: "2026",
      to: "2026",
      shifts: { A: -1, B: -1, C: -1 },
    });
    expect(second.geometry).toBe(first.geometry);
    const moved = structuredClone(changedDates);
    moved[0].endpoints[0].coordinate = [0, 0];
    expect(
      prepareSpatialDataset(
        moved,
        { datasetVersion: "move", geometryVersion: "geometry" },
        second,
      ).geometry,
    ).not.toBe(first.geometry);
  });
  it("keeps original sources and exact gaps separate from shifts and uncertain source precision", async () => {
    const rows = [
      fixture("a", "A", [0, 0], "2024-02-29"),
      fixture("b", "B", [0, 0], "2025-03-01"),
      {
        ...fixture("c", "C", [0, 0], "2025-02"),
        datePrecision: "month" as const,
      },
    ];
    const before = structuredClone(rows);
    const result = await run(rows, {
      from: "2025-02-28",
      to: "2025-03-01",
      shifts: { A: 1 },
      includeUndated: false,
    });
    expect(result.eligibleProjectIds).toEqual(["a", "b", "c"]);
    expect(result.uncertainDateCount).toBe(1);
    expect(result.pairs.find((p) => p.id === "a::b")!.gapDays).toBe(1);
    expect(result.pairs.find((p) => p.id === "a::c")!.gapDays).toBeNull();
    expect(result.pairs[0].a.originalDate).toBe("2024-02-29");
    expect(rows).toEqual(before);
    expect((await run(rows, { companies: [] })).possibleCount).toBe(0);
    expect((await run(rows, { from: "invalid" })).reason).toBe("invalid_range");
    expect((await run(rows, { thresholdMiles: -1 })).reason).toBe(
      "invalid_threshold",
    );
  });
  it("counts complete matches without storing them all and labels interrupted counts as lower bounds", async () => {
    const rows = seeded(100, true);
    const full = await run(rows, { limit: 7 });
    expect(full.pairs).toHaveLength(7);
    expect(full.complete).toBe(true);
    expect(full.matchedCount).toBeGreaterThan(3000);
    const partial = await run(rows, { limit: 7, maxNeighborsPerOrigin: 8 });
    expect(partial.pairs).toHaveLength(7);
    expect(partial.complete).toBe(false);
    expect(partial.reason).toBe("neighbor_limit");
    expect(partial.matchedCount).toBe(8);
    expect(partial.matchedCountIsLowerBound).toBe(true);
    expect(partial.possibleCount).toBe(full.possibleCount);
    expect((await run(rows, { maxCandidates: 10 })).reason).toBe(
      "candidate_budget",
    );
    expect((await run(rows, { timeBudgetMs: 0.00001 })).reason).toBe(
      "time_budget",
    );
  });
  it("yields for cancellation, suppresses stale response IDs and makes export limits explicit", async () => {
    const controller = new AbortController();
    let yields = 0;
    const result = await querySpatial(prepare(seeded(200, true)), defaults, {
      signal: controller.signal,
      yieldControl: async () => {
        yields++;
        controller.abort();
      },
    });
    expect(yields).toBe(1);
    expect(result.reason).toBe("cancelled");
    expect(result.matchedCountIsLowerBound).toBe(true);
    expect(
      isCurrentSpatialResponse({ requestId: 1, datasetVersion: "a" }, 2, "a"),
    ).toBe(false);
    expect(
      isCurrentSpatialResponse({ requestId: 2, datasetVersion: "a" }, 2, "b"),
    ).toBe(false);
    expect(
      isCurrentSpatialResponse({ requestId: 2, datasetVersion: "b" }, 2, "b"),
    ).toBe(true);
    const ready = {
      status: "ready" as const,
      result,
      resultThresholdMiles: defaults.thresholdMiles,
      progress: result.diagnostics,
      error: null,
    };
    expect(
      visibleSpatialState(
        { inputKey: "old-threshold", state: ready },
        "new-threshold",
      ),
    ).toEqual({
      status: "loading",
      result: null,
      resultThresholdMiles: null,
      progress: null,
      error: null,
    });
    expect(
      visibleSpatialState({ inputKey: "current", state: ready }, "current"),
    ).toBe(ready);
    const exported = await querySpatialExport(prepare(seeded(30, true)), {
      ...defaults,
      limit: 4,
    });
    expect(exported.pairs).toHaveLength(4);
    expect(exported.matchedCount).toBeGreaterThan(4);
    await expect(run(dataset, { limit: 20_001 })).rejects.toThrow("20000");
  });
});

describe("saved location eligibility and reference comparisons", () => {
  it("applies saved exclusions together with company/date filters while reusing geometry", async () => {
    const rows = [
      fixture("a", "A"),
      fixture("b", "B"),
      fixture("past", "B", [0, 0], "2024-01-01"),
      fixture("other", "C"),
    ];
    const prepared = prepare(rows);
    const geometry = prepared.geometry;
    const query = {
      ...defaults,
      companies: ["A", "B"],
      from: "2026",
      to: "2026",
    };
    const enabled = await querySpatial(prepared, query);
    expect(enabled.eligibleProjectIds).toEqual(["a", "b"]);
    expect(enabled.pairs.map((pair) => pair.id)).toEqual(["a::b"]);
    expect(
      await querySpatial(prepared, { ...query, excludedProjectIds: [] }),
    ).toMatchObject({ pairs: enabled.pairs, possibleCount: 1 });
    const excluded = await querySpatial(prepared, {
      ...query,
      excludedProjectIds: ["b", "not-in-dataset"],
    });
    expect(excluded.eligibleProjectIds).toEqual(["a"]);
    expect(excluded.possibleCount).toBe(0);
    expect(excluded.pairs).toEqual([]);
    expect(prepared.geometry).toBe(geometry);
    expect((await querySpatial(prepared, query)).pairs).toEqual(enabled.pairs);
  });

  it("queries a last-sorting reference directly instead of filtering the global top 200", async () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) =>
        fixture(`cluster-${String(i).padStart(2, "0")}`, i < 15 ? "A" : "B"),
      ),
      fixture("z-reference", "Z", [0, 1]),
      fixture("a-neighbor", "A", [0, 1.01]),
    ];
    const settings = { companies: ["A", "B", "Z"] };
    const global = await run(rows, settings);
    expect(global.pairs).toHaveLength(200);
    expect(global.matchedCount).toBe(226);
    expect(
      global.pairs.some(
        (pair) => pair.a.id === "z-reference" || pair.b.id === "z-reference",
      ),
    ).toBe(false);
    const reference = await run(rows, {
      ...settings,
      referenceProjectId: "z-reference",
    });
    expect(reference.complete).toBe(true);
    expect(reference.possibleCount).toBe(31);
    expect(reference.matchedCount).toBe(1);
    expect(reference.pairs.map((pair) => pair.id)).toEqual([
      "a-neighbor::z-reference",
    ]);
    expect(reference.eligibleProjectIds).toEqual(global.eligibleProjectIds);
    expect(reference.diagnostics.totalOrigins).toBe(1);
    expect(reference.pairs).toEqual(
      compareProjects(rows).filter(
        (pair) =>
          (pair.a.id === "z-reference" || pair.b.id === "z-reference") &&
          isNearby(pair, 25),
      ),
    );
    expect(
      (await run(rows, { ...settings, referenceProjectId: null })).pairs,
    ).toEqual(global.pairs);
  });

  it("returns no pairs for unknown/ineligible references without narrowing map eligibility", async () => {
    const rows = [
      fixture("a", "A"),
      fixture("b", "B"),
      fixture("reference", "C", [0, 0], "2024-01-01"),
    ];
    for (const settings of [
      { referenceProjectId: "unknown" },
      { referenceProjectId: "reference", excludedProjectIds: ["reference"] },
      { referenceProjectId: "reference", companies: ["A", "B"] },
      { referenceProjectId: "reference", from: "2026", to: "2026" },
    ]) {
      const result = await run(rows, settings);
      expect(result.complete).toBe(true);
      expect(result.possibleCount).toBe(0);
      expect(result.pairs).toEqual([]);
      expect(result.eligibleProjectIds).toContain("a");
      expect(result.eligibleProjectIds).toContain("b");
    }
    const unlocated = rows.map((row) =>
      row.id === "reference"
        ? { ...row, endpoints: [{ name: "unknown", coordinate: null }] }
        : row,
    );
    const missingPoint = await run(unlocated, {
      referenceProjectId: "reference",
    });
    expect(missingPoint).toMatchObject({
      complete: true,
      possibleCount: 2,
      matchedCount: 0,
      pairs: [],
    });
    expect(missingPoint.eligibleProjectIds).toEqual(["a", "b", "reference"]);
    expect(missingPoint.diagnostics.visitedPointCount).toBe(0);
  });

  it("retains reference-specific limits, cancellation and scenario eligibility without mutating sources", async () => {
    const rows = [
      fixture("reference", "Z", [0, 0], "2024-01-01"),
      ...Array.from({ length: 12 }, (_, i) =>
        fixture(`neighbor-${i}`, "A", [0, i / 1000]),
      ),
    ];
    const before = structuredClone(rows);
    const prepared = prepare(rows);
    const geometry = prepared.geometry;
    const query = {
      ...defaults,
      companies: ["A", "Z"],
      referenceProjectId: "reference",
      from: "2026",
      to: "2026",
      shifts: { Z: 2 },
      excludedProjectIds: ["neighbor-0"],
      limit: 2,
      maxNeighborsPerOrigin: 4,
    };
    const limited = await querySpatial(prepared, query);
    expect(limited).toMatchObject({
      complete: false,
      reason: "neighbor_limit",
      possibleCount: 11,
      matchedCount: 3,
      matchedCountIsLowerBound: true,
    });
    expect(limited.pairs).toHaveLength(2);
    expect(
      limited.pairs.every(
        (pair) => pair.a.id === "reference" || pair.b.id === "reference",
      ),
    ).toBe(true);
    expect(limited.pairs.every((pair) => pair.gapDays === 0)).toBe(true);
    const controller = new AbortController();
    const cancelled = await querySpatial(prepared, query, {
      signal: controller.signal,
      yieldControl: async () => controller.abort(),
    });
    expect(cancelled.reason).toBe("cancelled");
    expect(cancelled.possibleCount).toBe(11);
    expect(prepared.geometry).toBe(geometry);
    expect(rows).toEqual(before);
  });

  it("keeps reference boundaries strict and treats zero radius as a valid complete empty query", async () => {
    const rows = [fixture("a", "A", [0, 0]), fixture("z", "Z", [0, 0.1])];
    const distance = haversineMiles([0, 0], [0, 0.1]);
    const reference = { companies: ["A", "Z"], referenceProjectId: "z" };
    expect(
      (await run(rows, { ...reference, thresholdMiles: distance }))
        .matchedCount,
    ).toBe(0);
    expect(
      (await run(rows, { ...reference, thresholdMiles: distance + 1e-9 }))
        .matchedCount,
    ).toBe(1);
    for (const settings of [{ companies: ["A", "Z"] }, reference]) {
      const result = await run(rows, {
        ...settings,
        thresholdMiles: 0,
        maxCandidates: 1,
        timeBudgetMs: 0.00001,
      });
      expect(result).toMatchObject({
        complete: true,
        reason: "complete",
        possibleCount: 1,
        matchedCount: 0,
        matchedCountIsLowerBound: false,
        pairs: [],
      });
      expect(result.eligibleProjectIds).toEqual(["a", "z"]);
      expect(result.diagnostics.visitedPointCount).toBe(0);
    }
    const coincident = rows.map((row) => ({
      ...row,
      endpoints: [{ name: "same", coordinate: [0, 0] as Coordinate }],
    }));
    expect(
      (await run(coincident, { ...reference, thresholdMiles: 0 })).matchedCount,
    ).toBe(0);
  });
});

describe("distance refresh presentation", () => {
  const versions = {
    datasetVersion: "features-a",
    geometryVersion: "geometry-a",
  };
  it("retains a coherent completed result only while distance changes", async () => {
    const result = await run(seeded(10, true));
    const state = {
      status: "ready" as const,
      result,
      resultThresholdMiles: 25,
      progress: result.diagnostics,
      error: null,
    };
    const scopeKey = spatialScopeKey(versions, defaults);
    const pending = visibleSpatialState(
      { inputKey: "old", scopeKey, state },
      "new",
      spatialScopeKey(versions, { ...defaults, thresholdMiles: 0 }),
    );
    expect(pending.status).toBe("loading");
    expect(pending.result).toBe(result);
    expect(pending.resultThresholdMiles).toBe(25);
    expect(pending.progress).toBeNull();
    // Repeated rapid changes retain the same coherent snapshot, not a false zero.
    const next = visibleSpatialState(
      { inputKey: "new", scopeKey, state: pending },
      "newest",
      scopeKey,
    );
    expect(next.result).toBe(result);
    expect(next.resultThresholdMiles).toBe(25);
  });
  it("clears retained results synchronously for scope, dataset, retry and error changes", async () => {
    const result = await run(seeded(10, true));
    const state = {
      status: "ready" as const,
      result,
      resultThresholdMiles: 25,
      progress: result.diagnostics,
      error: null,
    };
    const scopeKey = spatialScopeKey(versions, defaults);
    const scopes = [
      spatialScopeKey({ ...versions, datasetVersion: "features-b" }, defaults),
      spatialScopeKey({ ...versions, geometryVersion: "geometry-b" }, defaults),
      spatialScopeKey(versions, { ...defaults, companies: [] }),
      spatialScopeKey(versions, { ...defaults, from: "2020-01-01" }),
      spatialScopeKey(versions, { ...defaults, referenceProjectId: "another" }),
      spatialScopeKey(versions, {
        ...defaults,
        excludedProjectIds: ["excluded"],
      }),
      spatialScopeKey(versions, { ...defaults, shifts: { A: 1 } }),
      spatialScopeKey(versions, defaults, 1),
    ];
    for (const changedScope of scopes) {
      const pending = visibleSpatialState(
        { inputKey: "old", scopeKey, state },
        "new",
        changedScope,
      );
      expect(pending.result).toBeNull();
      expect(pending.resultThresholdMiles).toBeNull();
    }
    const error = {
      status: "error" as const,
      result: null,
      resultThresholdMiles: null,
      progress: null,
      error: "Worker failed",
    };
    expect(
      visibleSpatialState(
        { inputKey: "new", scopeKey, state: error },
        "new",
        scopeKey,
      ),
    ).toBe(error);
  });
});
