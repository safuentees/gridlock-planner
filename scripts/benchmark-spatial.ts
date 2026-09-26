import { writeFileSync } from "node:fs";
import { cpus, platform, release, totalmem } from "node:os";
import type { Project } from "../src/types";
import { compareProjects, isNearby } from "../src/lib/comparisons";
import {
  prepareSpatialDataset,
  querySpatial,
  type SpatialQuery,
} from "../src/lib/spatial";

const SEED = 20260926;
function generate(
  count: number,
  distribution: "sparse" | "dense" | "separated",
): Project[] {
  let seed = SEED;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const source = {
    title: "Seeded synthetic benchmark",
    url: "",
    page: 0,
    asOf: "2026-09-26",
    dateNote: "Not real infrastructure",
  };
  const review = {
    scope: "Synthetic",
    locationNote: "",
    status: "fixture",
    latestDate: null,
    latestDatePrecision: "",
    dateNote: "",
    sourceUrl: "",
    sourcePage: 0,
    warnings: [],
  };
  return Array.from({ length: count }, (_, i): Project => ({
    id: `p${String(i).padStart(6, "0")}`,
    company: i % 2 ? "B" : "A",
    utility: i % 2 ? "B" : "A",
    name: `Fixture ${i}`,
    shortName: `F${i}`,
    state: "fixture",
    endpoints: [
      {
        name: "single point",
        coordinate:
          distribution === "separated"
            ? i % 2
              ? [30, 0]
              : [0, 0]
            : distribution === "dense"
              ? [32 + random() * 0.01, -81 + random() * 0.01]
              : [-80 + random() * 160, -180 + random() * 360],
      },
    ],
    originalDate: `202${(i % 4) + 5}-01-01`,
    originalDateRaw: null,
    dateMeaning: "planned_in_service",
    datePrecision: "day",
    originalSource: source,
    review,
  }));
}
const memory = () => {
  const value = process.memoryUsage();
  return {
    rssMiB: value.rss / 1024 ** 2,
    heapUsedMiB: value.heapUsed / 1024 ** 2,
  };
};
const query: SpatialQuery = {
  companies: ["A", "B"],
  from: "",
  to: "",
  includeUndated: true,
  thresholdMiles: 25,
  limit: 200,
  maxCandidates: 250_000,
  maxNeighborsPerOrigin: 4096,
  timeBudgetMs: 150,
};
const runs = [];
for (const distribution of ["sparse", "dense", "separated"] as const) {
  for (const count of [1000, 10000, 100000]) {
    (globalThis as typeof globalThis & { gc?: () => void }).gc?.();
    const before = memory();
    const rows = generate(count, distribution);
    const afterDataset = memory();
    const prepared = prepareSpatialDataset(rows, {
      datasetVersion: `${distribution}-${count}`,
      geometryVersion: `${distribution}-${count}`,
    });
    const afterBuild = memory();
    let peakSampledRssMiB = afterBuild.rssMiB,
      peakSampledHeapMiB = afterBuild.heapUsedMiB;
    const sample = () => {
      const m = memory();
      peakSampledRssMiB = Math.max(peakSampledRssMiB, m.rssMiB);
      peakSampledHeapMiB = Math.max(peakSampledHeapMiB, m.heapUsedMiB);
    };
    const result = await querySpatial(prepared, query, { onProgress: sample });
    sample();
    const afterQuery = memory();
    const originalIndex = prepared.geometry;
    const reuse = await querySpatial(prepared, {
      ...query,
      from: "2026",
      to: "2027",
      shifts: { A: 1 },
    });
    let oracle: unknown = {
      skipped:
        "Brute force restricted to 1k records; no dense 10k/100k materialization.",
    };
    if (count === 1000) {
      const started = performance.now();
      const all = compareProjects(rows);
      const nearby = all.filter((pair) => isNearby(pair, 25));
      const oracleMs = performance.now() - started;
      const exact = await querySpatial(prepared, {
        ...query,
        timeBudgetMs: Infinity,
        maxCandidates: Infinity,
        maxNeighborsPerOrigin: Infinity,
      });
      const agrees =
        exact.matchedCount === nearby.length &&
        exact.pairs.every(
          (pair, i) =>
            pair.id === nearby[i].id &&
            pair.distanceMiles === nearby[i].distanceMiles,
        );
      if (!agrees) throw new Error(`${distribution}-${count}: oracle mismatch`);
      oracle = {
        ms: oracleMs,
        possibleCount: all.length,
        matchedCount: nearby.length,
        indexedCompleteMs: exact.diagnostics.elapsedMs,
        top200ExactAgreement: agrees,
      };
    }
    const controller = new AbortController();
    let abortSentAt = 0;
    const cancellationStartedAt = performance.now();
    const timer = setTimeout(() => {
      abortSentAt = performance.now();
      controller.abort();
    }, 5);
    const cancellation = await querySpatial(
      prepared,
      {
        ...query,
        thresholdMiles: 15000,
        maxCandidates: Infinity,
        maxNeighborsPerOrigin: Infinity,
        timeBudgetMs: 1000,
      },
      { signal: controller.signal },
    );
    clearTimeout(timer);
    const cancelMeasuredAt = performance.now();
    const run = {
      distribution,
      count,
      buildMs: prepared.buildMs,
      queryMs: result.diagnostics.elapsedMs,
      complete: result.complete,
      reason: result.reason,
      possibleCount: result.possibleCount,
      matchedCount: result.matchedCount,
      matchedCountIsLowerBound: result.matchedCountIsLowerBound,
      retainedPairs: result.pairs.length,
      ...result.diagnostics,
      memory: {
        before,
        afterDataset,
        afterBuild,
        afterQuery,
        peakSampledRssMiB,
        peakSampledHeapMiB,
        note: "RSS and V8 heap sampled at phase boundaries and query progress, not an instrumented absolute peak; source objects included; memory is process-wide.",
      },
      sliderQuery: {
        ms: reuse.diagnostics.elapsedMs,
        sameIndexObject: originalIndex === prepared.geometry,
        reason: reuse.reason,
      },
      cancellation: {
        requestedAfterMs: 5,
        requestDelivered: abortSentAt > 0,
        scheduledToDeliveryMs: abortSentAt
          ? abortSentAt - cancellationStartedAt
          : null,
        observedReason: cancellation.reason,
        elapsedMs: cancellation.diagnostics.elapsedMs,
        deliveryToReturnMs: abortSentAt ? cancelMeasuredAt - abortSentAt : null,
        note: "Stress cancellation deliberately disables candidate/neighbor caps and uses whole-globe radius. Cooperative Node event-loop cancellation: timer delivery can exceed 5ms during one synchronous geokdbush call. Browser worker/render measured separately.",
      },
      oracle,
    };
    runs.push(run);
    console.log(
      `${distribution} ${count}: build ${run.buildMs.toFixed(1)}ms query ${run.queryMs.toFixed(1)}ms ${run.reason}; ${run.matchedCountIsLowerBound ? ">=" : ""}${run.matchedCount} matches, ${run.retainedPairs} retained`,
    );
  }
}
const output = {
  measuredAt: new Date().toISOString(),
  hardware: {
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    platform: platform(),
    release: release(),
    memoryGiB: totalmem() / 1024 ** 3,
    node: process.version,
  },
  seed: SEED,
  configuration: query,
  methodology:
    "Single measured run per distribution/size, shared Node process, no claim of statistically stable latency. Includes filtering and cooperative yields in query time; KDBush preparation separately. Oracle only 1k. Interactive completion is explicitly bounded.",
  browserRendering:
    "Not measured by this Node benchmark; integration owner records real browser render and stale-worker checks separately.",
  runs,
};
writeFileSync(
  new URL("../docs/benchmarks/spatial-2026-09-26.json", import.meta.url),
  JSON.stringify(output, null, 2) + "\n",
);
