import type { Comparison, Project, ProjectOverride } from "../types";
import { projectDateBounds, shiftDateBounds } from "./temporal";

/** Deliberately omit coordinates, complete uploads and unrelated project records. */
export function pairRecommendationContext(
  pair: Comparison,
  original: Comparison,
  options: {
    datasetKind: "demo" | "upload";
    mode: "planned" | "what_if";
    thresholdMiles: number;
    partialResults: boolean;
    shifts: Record<string, number>;
    overrides: ProjectOverride[];
  },
) {
  const milestone = (p: Project) =>
    JSON.stringify({
      date: p.originalDate,
      precision: projectDateBounds(p)?.precision ?? "unknown",
      meaning: p.dateMeaning,
    });
  const project = (effective: Project, source: Project) => ({
    name: effective.name,
    utility: effective.utility,
    sourceMilestone: milestone(source),
    effectiveMilestone: milestone(effective),
    assumedMilestone:
      options.mode === "what_if"
        ? JSON.stringify({
            shiftedYears: options.shifts[effective.company] ?? 0,
            date:
              shiftDateBounds(
                projectDateBounds(effective),
                options.shifts[effective.company] ?? 0,
              )?.label ?? null,
          })
        : null,
    evidence: JSON.stringify({
      sourceName: source.name,
      sourceAsOf: source.originalSource.asOf,
      sourceDateNote: source.originalSource.dateNote,
      research: source.review,
      corrections: options.overrides
        .filter((o) => o.projectId === effective.id)
        .map((o) => ({ reason: o.reason, fields: Object.keys(o.patch) })),
    }),
  });
  return {
    datasetKind: options.datasetKind,
    mode: options.mode,
    distanceMiles: pair.distanceMiles,
    sourceDistanceMiles: original.distanceMiles,
    thresholdMiles: options.thresholdMiles,
    milestoneGapDays: pair.gapDays,
    partialResults: options.partialResults,
    projects: [project(pair.a, original.a), project(pair.b, original.b)],
  };
}
export type PairRecommendationContext = ReturnType<
  typeof pairRecommendationContext
>;
