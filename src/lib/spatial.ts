import KDBush from "kdbush";
import { around } from "geokdbush";
import type { Comparison, Coordinate, Project } from "../types";
import { centerPoint, haversineMiles } from "./comparisons";
import {
  dateRangeBounds,
  exactGapDays,
  overlapsDateRange,
  projectDateBounds,
  shiftDateBounds,
  withinCalendarMonths,
  type DateBounds,
} from "./temporal";

export const APP_EARTH_RADIUS_MILES = 3958.7613;
export const INDEX_EARTH_RADIUS_KM = 6371;
export const INTERACTIVE_RESULT_LIMIT = 200;
export const MAX_EXPORT_PAIRS = 20_000;
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const comparePairRank = (a: Comparison, b: Comparison) =>
  (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity) ||
  lexical(a.id, b.id);

interface PreparedRow {
  project: Project;
  center: Coordinate | null;
  sourceDate: DateBounds | null;
}
interface CompanyIndex {
  company: string;
  index: KDBush;
  rowIndices: number[];
  capCenter: Coordinate;
  capRadiusMiles: number;
}
interface GeometryIndex {
  groups: CompanyIndex[];
  signature: string;
}
export interface PreparedSpatialDataset {
  datasetVersion: string;
  geometryVersion: string;
  rows: PreparedRow[];
  geometry: GeometryIndex;
  buildMs: number;
  indexReused: boolean;
}

/** Call for dataset changes, not every slider change. Dates and centers are prepared once. */
export function prepareSpatialDataset(
  projects: Project[],
  versions: { datasetVersion: string; geometryVersion: string },
  previous?: PreparedSpatialDataset,
): PreparedSpatialDataset {
  if (
    previous?.datasetVersion === versions.datasetVersion &&
    previous.geometryVersion === versions.geometryVersion
  )
    return previous;
  const started = performance.now();
  const sorted = [...projects].sort((a, b) => lexical(a.id, b.id));
  if (new Set(sorted.map((p) => p.id)).size !== sorted.length)
    throw new RangeError("Project IDs must be unique");
  const rows = sorted.map((project) => ({
    project,
    center: centerPoint(project),
    sourceDate: projectDateBounds(project),
  }));
  // A full exact signature avoids collision-based reuse when an uploader supplies
  // a stale geometryVersion. Dates do not invalidate these company-partitioned
  // indexes; a company membership edit does.
  const signature = JSON.stringify(
    rows.map((row) => [row.project.id, row.project.company, row.center]),
  );
  const indexReused = !!previous && previous.geometry.signature === signature;
  let geometry = previous?.geometry;
  if (!indexReused) {
    const memberships = new Map<string, number[]>();
    rows.forEach((row, i) => {
      if (!row.center) return;
      const indices = memberships.get(row.project.company) ?? [];
      indices.push(i);
      memberships.set(row.project.company, indices);
    });
    const groups = [...memberships]
      .sort(([a], [b]) => lexical(a, b))
      .map(([company, rowIndices]) => {
        const index = new KDBush(rowIndices.length, 64, Float64Array);
        for (const rowIndex of rowIndices) {
          const [latitude, longitude] = rows[rowIndex].center!;
          index.add(longitude, latitude); // Libraries are longitude first.
        }
        index.finish();
        const capCenter = rows[rowIndices[0]].center!;
        let capRadiusMiles = 0;
        for (const rowIndex of rowIndices) {
          capRadiusMiles = Math.max(
            capRadiusMiles,
            haversineMiles(capCenter, rows[rowIndex].center!),
          );
        }
        return { company, index, rowIndices, capCenter, capRadiusMiles };
      });
    geometry = { groups, signature };
  }
  return {
    ...versions,
    rows,
    geometry: geometry!,
    buildMs: performance.now() - started,
    indexReused,
  };
}

export interface SpatialQuery {
  companies: string[];
  from: string;
  to: string;
  includeUndated: boolean;
  /** Saved unchecked locations; omitted/empty keeps every otherwise eligible row. */
  excludedProjectIds?: string[];
  /** Omitted/null compares all eligible companies; a value scopes pairs to this row. */
  referenceProjectId?: string | null;
  shifts?: Record<string, number>;
  thresholdMiles: number;
  limit?: number;
  maxCandidates?: number;
  maxNeighborsPerOrigin?: number;
  timeBudgetMs?: number;
  windowMonths?: number;
}
export type QueryStopReason =
  | "complete"
  | "cancelled"
  | "time_budget"
  | "candidate_budget"
  | "neighbor_limit"
  | "invalid_range"
  | "invalid_threshold";
export interface SpatialProgress {
  processedOrigins: number;
  totalOrigins: number;
  candidateCount: number;
  matchedCount: number;
  elapsedMs: number;
}
export interface SpatialDiagnostics extends SpatialProgress {
  visitedPointCount: number;
  exactDistanceCount: number;
  radiusPrunedGroups: number;
  buildMs: number;
  indexBytes: number;
  indexReused: boolean;
}
export interface SpatialQueryResult {
  pairs: Comparison[];
  complete: boolean;
  reason: QueryStopReason;
  possibleCount: number;
  matchedCount: number;
  matchedCountIsLowerBound: boolean;
  eligibleProjectIds: string[];
  uncertainDateCount: number;
  diagnostics: SpatialDiagnostics;
}
export interface QueryControl {
  signal?: AbortSignal;
  onProgress?: (progress: SpatialProgress) => void;
  yieldControl?: () => Promise<void>;
}
const yieldToEventLoop = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Index distances use R=6371 km, so transfer the angular radius, not miles→km.
 * A tiny angular guard avoids rejecting floating-point boundary candidates.
 * geokdbush folds finite radii beyond πR through sine; use its documented
 * unbounded radius at/above the antipode and apply the exact final predicate.
 */
export function candidateRadiusKm(thresholdMiles: number): number {
  const angle = thresholdMiles / APP_EARTH_RADIUS_MILES + 1e-10;
  return angle >= Math.PI ? Infinity : angle * INDEX_EARTH_RADIUS_KM;
}

/** A bounded max heap: rank/storage depend on retained rows, never all matches. */
class BestPairs {
  values: Comparison[] = [];
  constructor(private limit: number) {}
  add(pair: Comparison) {
    const heap = this.values;
    if (heap.length === this.limit) {
      if (comparePairRank(pair, heap[0]) >= 0) return;
      heap[0] = pair;
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= heap.length) break;
        if (
          child + 1 < heap.length &&
          comparePairRank(heap[child + 1], heap[child]) > 0
        )
          child++;
        if (comparePairRank(heap[i], heap[child]) >= 0) break;
        [heap[i], heap[child]] = [heap[child], heap[i]];
        i = child;
      }
    } else {
      heap.push(pair);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (comparePairRank(heap[parent], heap[i]) >= 0) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      }
    }
  }
}
function positiveLimit(value: number, label: string, infinity = false): number {
  if (infinity && value === Infinity) return value;
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError(`${label} must be a positive whole number`);
  return value;
}

/** Bounded radius search. Incomplete results are the best visited pairs only,
 * not necessarily the globally nearest pairs. Counts remain honest lower bounds.
 */
export async function querySpatial(
  prepared: PreparedSpatialDataset,
  query: SpatialQuery,
  control: QueryControl = {},
): Promise<SpatialQueryResult> {
  const started = performance.now();
  const limit = positiveLimit(
    query.limit ?? INTERACTIVE_RESULT_LIMIT,
    "Result limit",
  );
  if (limit > MAX_EXPORT_PAIRS)
    throw new RangeError(`Result limit cannot exceed ${MAX_EXPORT_PAIRS}`);
  const maxCandidates = positiveLimit(
    query.maxCandidates ?? 250_000,
    "Candidate budget",
    true,
  );
  const neighborLimit = positiveLimit(
    query.maxNeighborsPerOrigin ?? 4096,
    "Neighbor limit",
    true,
  );
  const timeBudget = query.timeBudgetMs ?? 150;
  if (!(timeBudget > 0)) throw new RangeError("Time budget must be positive");
  if (
    query.windowMonths !== undefined &&
    (!Number.isSafeInteger(query.windowMonths) || query.windowMonths < 0)
  )
    throw new RangeError("Month window must be a non-negative whole number");
  const range = dateRangeBounds(query.from, query.to);
  const companies = new Set(query.companies);
  const excluded = new Set(query.excludedProjectIds ?? []);
  const referenceMode = query.referenceProjectId != null;
  let referenceIndex = -1;
  const eligible = new Uint8Array(prepared.rows.length);
  const dates: (DateBounds | null)[] = new Array(prepared.rows.length);
  const counts = new Map<string, number>();
  const eligibleProjectIds: string[] = [];
  const origins: number[] = [];
  let uncertainDateCount = 0;
  for (let i = 0; i < prepared.rows.length; i++) {
    const row = prepared.rows[i];
    if (!companies.has(row.project.company) || excluded.has(row.project.id))
      continue;
    const date = shiftDateBounds(
      row.sourceDate,
      query.shifts?.[row.project.company] ?? 0,
    );
    dates[i] = date;
    if (!overlapsDateRange(date, range, query.includeUndated)) continue;
    eligible[i] = 1;
    if (referenceMode && row.project.id === query.referenceProjectId)
      referenceIndex = i;
    eligibleProjectIds.push(row.project.id);
    if (date && date.precision !== "day") uncertainDateCount++;
    counts.set(row.project.company, (counts.get(row.project.company) ?? 0) + 1);
    if (row.center) origins.push(i);
  }
  // Eligibility is shared by the map and comparison scope. An unlocated but
  // eligible reference still has possible comparisons, with no measurable pairs.
  const possibleCount = referenceMode
    ? referenceIndex < 0
      ? 0
      : eligibleProjectIds.length -
        (counts.get(prepared.rows[referenceIndex].project.company) ?? 0)
    : (eligibleProjectIds.length ** 2 -
        [...counts.values()].reduce((sum, n) => sum + n * n, 0)) /
      2;
  const groups = prepared.geometry.groups.filter((group) =>
    counts.has(group.company),
  );
  const lastCompany = groups.at(-1)?.company;
  // A dedicated reference search cannot lose its neighbors to unrelated pairs
  // in the globally retained top results. Its company may sort first or last.
  const queryOrigins = referenceMode
    ? referenceIndex >= 0 && prepared.rows[referenceIndex].center
      ? [referenceIndex]
      : []
    : origins.filter(
        (i) =>
          lastCompany !== undefined &&
          lexical(prepared.rows[i].project.company, lastCompany) < 0,
      );
  const best = new BestPairs(limit);
  let processedOrigins = 0,
    candidateCount = 0,
    matchedCount = 0,
    visitedPointCount = 0,
    exactDistanceCount = 0,
    radiusPrunedGroups = 0;
  let reason: QueryStopReason = !range.valid
    ? "invalid_range"
    : !(Number.isFinite(query.thresholdMiles) && query.thresholdMiles >= 0)
      ? "invalid_threshold"
      : "complete";
  const progress = (): SpatialProgress => ({
    processedOrigins,
    totalOrigins: queryOrigins.length,
    candidateCount,
    matchedCount,
    elapsedMs: performance.now() - started,
  });
  const stop = (): QueryStopReason | null =>
    control.signal?.aborted
      ? "cancelled"
      : performance.now() - started >= timeBudget
        ? "time_budget"
        : visitedPointCount >= maxCandidates
          ? "candidate_budget"
          : null;

  let lastYield = started;
  if (
    reason === "complete" &&
    query.thresholdMiles > 0 &&
    queryOrigins.length &&
    possibleCount
  ) {
    control.onProgress?.(progress());
    await (control.yieldControl ?? yieldToEventLoop)();
    lastYield = performance.now();
    originLoop: for (const i of queryOrigins) {
      const a = prepared.rows[i];
      let originCandidates = 0;
      for (const group of groups) {
        // Global search visits each company pair in one direction; reference
        // search must visit all other companies, regardless of lexical order.
        if (
          referenceMode
            ? group.company === a.project.company
            : lexical(group.company, a.project.company) <= 0
        )
          continue;
        const stopped = stop();
        if (stopped) {
          reason = stopped;
          break originLoop;
        }
        // Triangle inequality supplies a conservative company-level lower
        // bound. This also avoids geokdbush's loose node bounds on coincident,
        // separated clusters. A 0.01-mile guard is deliberately much larger than
        // double-precision great-circle roundoff, including near antipodes.
        if (
          haversineMiles(a.center!, group.capCenter) >
          query.thresholdMiles + group.capRadiusMiles + 0.01
        ) {
          radiusPrunedGroups++;
          continue;
        }
        let candidates: number[];
        const remaining = neighborLimit - originCandidates;
        try {
          candidates = around(
            group.index,
            a.center![1],
            a.center![0],
            remaining === Infinity ? Infinity : remaining + 1,
            candidateRadiusKm(query.thresholdMiles),
            () => {
              visitedPointCount++;
              if (visitedPointCount % 64 === 0) {
                const halt = stop();
                if (halt) throw halt;
              }
              // CRITICAL: do not semantically filter in geokdbush's predicate.
              // It checks radius only after accepted points reach its queue;
              // rejecting points here can turn an empty radius query into a
              // full-tree scan. Time/ID eligibility is checked after retrieval.
              return true;
            },
          );
        } catch (error) {
          if (
            error === "cancelled" ||
            error === "candidate_budget" ||
            error === "time_budget"
          ) {
            reason = error;
            break originLoop;
          }
          throw error;
        }
        const truncated = candidates.length > remaining;
        if (truncated) candidates.length = remaining;
        originCandidates += candidates.length;
        candidateCount += candidates.length;
        for (const id of candidates) {
          const j = group.rowIndices[id];
          if (!eligible[j]) continue;
          const b = prepared.rows[j];
          exactDistanceCount++;
          // Canonical endpoint order also keeps floating-point arithmetic
          // identical to the unchanged oracle, not merely mathematically equal.
          const [first, second] = i < j ? [a, b] : [b, a];
          const distanceMiles = haversineMiles(first.center!, second.center!);
          if (distanceMiles >= query.thresholdMiles) continue;
          if (
            query.windowMonths !== undefined &&
            !withinCalendarMonths(dates[i], dates[j], query.windowMonths)
          )
            continue;
          matchedCount++;
          best.add({
            id: `${encodeURIComponent(first.project.id)}::${encodeURIComponent(second.project.id)}`,
            a: first.project,
            b: second.project,
            aCenter: first.center,
            bCenter: second.center,
            distanceMiles,
            gapDays: exactGapDays(dates[i], dates[j]),
          });
        }
        if (truncated) {
          reason = "neighbor_limit";
          break originLoop;
        }
        if (performance.now() - lastYield >= 8) {
          control.onProgress?.(progress());
          await (control.yieldControl ?? yieldToEventLoop)();
          lastYield = performance.now();
        }
      }
      processedOrigins++;
      if (performance.now() - lastYield >= 8) {
        control.onProgress?.(progress());
        await (control.yieldControl ?? yieldToEventLoop)();
        lastYield = performance.now();
      }
    }
  }
  if (control.signal?.aborted) reason = "cancelled";
  const complete =
    reason === "complete" ||
    reason === "invalid_range" ||
    reason === "invalid_threshold";
  control.onProgress?.(progress());
  return {
    pairs: best.values.sort(comparePairRank),
    complete,
    reason,
    possibleCount,
    matchedCount,
    matchedCountIsLowerBound: !complete,
    eligibleProjectIds,
    uncertainDateCount,
    diagnostics: {
      ...progress(),
      visitedPointCount,
      exactDistanceCount,
      radiusPrunedGroups,
      buildMs: prepared.buildMs,
      indexBytes: prepared.geometry.groups.reduce(
        (sum, group) => sum + group.index.data.byteLength,
        0,
      ),
      indexReused: prepared.indexReused,
    },
  };
}

/** Explicit bounded export. Callers must label the retained count and whether
 * search/counts completed. A download never silently requests unlimited pairs.
 * For the small original fixture compareProjects remains the exhaustive oracle.
 */
export function querySpatialExport(
  prepared: PreparedSpatialDataset,
  query: SpatialQuery,
  control?: QueryControl,
) {
  return querySpatial(
    prepared,
    {
      ...query,
      limit: Math.min(query.limit ?? MAX_EXPORT_PAIRS, MAX_EXPORT_PAIRS),
      maxCandidates: query.maxCandidates ?? 1_000_000,
      timeBudgetMs: query.timeBudgetMs ?? 2000,
      maxNeighborsPerOrigin: query.maxNeighborsPerOrigin ?? MAX_EXPORT_PAIRS,
    },
    control,
  );
}
