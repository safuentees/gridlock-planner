import type {
  Comparison,
  ExplorationMode,
  Project,
  RuntimeDataset,
} from "../types";
import { centerPoint, haversineMiles } from "./comparisons";
import { exactGapDays, projectDateBounds } from "./temporal";

export function originalComparison(
  pair: Comparison,
  originals: ReadonlyMap<string, Project>,
): Comparison | null {
  const a = originals.get(pair.a.id);
  const b = originals.get(pair.b.id);
  if (!a || !b) return null;
  const aCenter = centerPoint(a);
  const bCenter = centerPoint(b);
  return {
    ...pair,
    a,
    b,
    aCenter,
    bCenter,
    distanceMiles: aCenter && bCenter ? haversineMiles(aCenter, bCenter) : null,
    gapDays: exactGapDays(projectDateBounds(a), projectDateBounds(b)),
  };
}
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+@\t\r]/.test(s) || (/^-.+/.test(s) && !Number.isFinite(Number(s))))
    s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
/** Export exactly the displayed bounded results, with original/effective values explicit. */
export function comparisonCsv(
  pairs: Comparison[],
  dataset: RuntimeDataset,
  source: RuntimeDataset,
  mode: ExplorationMode,
  shifts: Record<string, number>,
  complete: boolean,
  scope: string,
) {
  const originals = new Map(source.projects.map((p) => [p.id, p]));
  const rows: unknown[][] = [
    [
      "pair_id",
      "project_a",
      "project_b",
      "distance_miles_unrounded",
      "effective_milestone_gap_days",
      "mode",
      "a_source_date",
      "a_effective_date",
      "a_precision",
      "a_date_meaning",
      "b_source_date",
      "b_effective_date",
      "b_precision",
      "b_date_meaning",
      "a_assumed_shift_years",
      "b_assumed_shift_years",
      "source_sha256",
      "feature_sha256",
      "search_complete",
      "export_scope",
    ],
  ];
  for (const p of pairs)
    rows.push([
      p.id,
      p.a.id,
      p.b.id,
      p.distanceMiles,
      p.gapDays,
      mode,
      originals.get(p.a.id)?.originalDate,
      p.a.originalDate,
      p.a.datePrecision ?? "day",
      p.a.dateMeaning,
      originals.get(p.b.id)?.originalDate,
      p.b.originalDate,
      p.b.datePrecision ?? "day",
      p.b.dateMeaning,
      shifts[p.a.company] ?? 0,
      shifts[p.b.company] ?? 0,
      dataset.sourceHash,
      dataset.featureHash,
      complete,
      scope,
    ]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
