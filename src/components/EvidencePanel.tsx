import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Info,
  BookOpen,
} from "lucide-react";
import type { Comparison, Project } from "../types";
import { centerPoint, milesToUnit } from "../lib/comparisons";

export const formatDate = (date: string | null) =>
  date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not supplied";
export const sourceLink = (url: string, page: number) => `${url}#page=${page}`;

function ProjectRecord({ project }: { project: Project }) {
  const center = centerPoint(project);
  const located = project.endpoints.filter((x) => x.coordinate).length;
  return (
    <article className="min-w-0 rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-stone-500">
          {project.company} · {project.id}
        </span>
        <span className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-600">
          {project.state}
        </span>
      </div>
      <h3 className="mb-3 text-base font-semibold leading-snug">
        {project.name}
      </h3>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
            <CalendarDays size={13} />
            {project.dateMeaning === "need_date"
              ? "Original need date"
              : "Original planned in-service date"}
          </dt>
          <dd className="font-medium tabular-nums">
            {formatDate(project.originalDate)}
          </dd>
          <dd className="mt-0.5 text-xs text-stone-500">
            Construction start / end: not supplied in this workbook
          </dd>
        </div>
        <div>
          <dt className="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
            <MapPin size={13} />
            Representative point · approximate
          </dt>
          <dd className="tabular-nums">
            {center
              ? `${center[0].toFixed(6)}, ${center[1].toFixed(6)}`
              : "Location unknown"}
          </dd>
          <dd className="mt-0.5 text-xs text-stone-500">
            {located === 2
              ? "Arithmetic midpoint of two supplied endpoints"
              : located === 1
                ? "One located endpoint used as the proxy"
                : "No usable endpoint coordinates"}
          </dd>
        </div>
      </dl>
      <details className="mt-4 border-t border-stone-100 pt-3">
        <summary className="cursor-pointer text-xs font-medium text-stone-600">
          Inspect supplied endpoints
        </summary>
        <ul className="mt-3 space-y-2 text-xs">
          {project.endpoints.map((e, i) => (
            <li key={i}>
              <span className="font-medium">{e.name}</span>
              <br />
              <span className="tabular-nums text-stone-500">
                {e.coordinate
                  ? e.coordinate.map((x) => x.toFixed(6)).join(", ")
                  : "Coordinates missing"}
              </span>
            </li>
          ))}
        </ul>
      </details>
      <a
        href={sourceLink(
          project.originalSource.url,
          project.originalSource.page,
        )}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex items-start gap-1.5 text-xs font-medium text-emerald-800 underline"
      >
        <BookOpen size={13} className="mt-0.5 shrink-0" />
        <span>
          {project.originalSource.title} · PDF p. {project.originalSource.page}
        </span>
        <ArrowUpRight size={13} className="shrink-0" />
      </a>
      <p className="mt-2 text-xs text-stone-500">
        {project.originalSource.asOf}. {project.originalSource.dateNote}
      </p>
      <details className="mt-4 rounded-lg bg-stone-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-stone-700">
          Research notes · originals unchanged
        </summary>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-stone-600">
          <p className="text-pretty text-stone-500">
            {project.review.reviewedOn
              ? `Review checked ${formatDate(project.review.reviewedOn)}.`
              : "This record has not been reviewed."}{" "}
            Milestone source:{" "}
            {project.review.sourceAsOf || "source date not available"}.
          </p>
          <p>
            <strong>Work scope:</strong> {project.review.scope}
          </p>
          <p>{project.review.locationNote}</p>
          <p className="text-pretty">
            <strong>Reviewed status:</strong>{" "}
            {project.review.status.replaceAll("_", " ")}.
            {project.review.statusEvidenceDate && (
              <> Reported {formatDate(project.review.statusEvidenceDate)}.</>
            )}
          </p>
          {project.review.statusSourceUrl && (
            <a
              className="inline-flex items-center gap-1 font-medium text-emerald-800 underline"
              href={
                project.review.statusSourcePage
                  ? sourceLink(
                      project.review.statusSourceUrl,
                      project.review.statusSourcePage,
                    )
                  : project.review.statusSourceUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              Open status evidence
              {project.review.statusSourcePage
                ? ` · PDF p. ${project.review.statusSourcePage}`
                : ""}{" "}
              <ArrowUpRight size={12} />
            </a>
          )}
          <p>
            <strong>Reviewed milestone:</strong>{" "}
            {project.review.latestDate || "Unknown"} (
            {project.review.latestDatePrecision} precision).{" "}
            {project.review.dateNote}
          </p>
          {project.review.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
          {project.review.sourceUrl && (
            <a
              className="inline-flex items-center gap-1 font-medium text-emerald-800 underline"
              href={sourceLink(
                project.review.sourceUrl,
                project.review.sourcePage,
              )}
              target="_blank"
              rel="noreferrer"
            >
              Open milestone source · PDF p. {project.review.sourcePage}{" "}
              <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      </details>
    </article>
  );
}

export function EvidencePanel({
  comparison,
  project,
  unit = "mi",
}: {
  comparison: Comparison | null;
  project: Project | null;
  unit?: "mi" | "km";
}) {
  if (!comparison && !project)
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Inspect the evidence</h2>
        <p className="mt-2 text-sm text-stone-500">
          Select a comparison or a project on the map to see its source,
          location and missing information.
        </p>
      </section>
    );
  const records = comparison
    ? [comparison.a, comparison.b]
    : project
      ? [project]
      : [];
  return (
    <section
      aria-labelledby="evidence-title"
      className="border-t border-stone-200 bg-stone-50 p-5 lg:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold text-emerald-800">
            EVIDENCE
          </p>
          <h2 id="evidence-title" className="text-xl font-semibold">
            {comparison
              ? "Why these projects appear together"
              : "Inside this planning record"}
          </h2>
        </div>
      </div>
      {comparison && (
        <div className="mb-4 flex flex-wrap gap-x-7 gap-y-3 rounded-lg border border-stone-200 bg-white p-4 text-sm">
          <div>
            <span className="block text-xs text-stone-500">
              Point separation
            </span>
            <strong className="tabular-nums">
              {comparison.distanceMiles === null
                ? "Unknown"
                : `${milesToUnit(comparison.distanceMiles, unit).toFixed(2)} ${unit}`}
            </strong>
          </div>
          <div>
            <span className="block text-xs text-stone-500">
              Original milestone gap
            </span>
            <strong className="tabular-nums">
              {comparison.gapDays === null
                ? "Unknown"
                : `${comparison.gapDays.toLocaleString()} days`}
            </strong>
          </div>
          <div>
            <span className="block text-xs text-stone-500">
              Distance method
            </span>
            <strong>Center-point haversine</strong>
          </div>
          <div>
            <span className="block text-xs text-stone-500">
              Construction overlap
            </span>
            <strong>Not established</strong>
          </div>
        </div>
      )}
      <div className="grid gap-4">
        {records.map((p) => (
          <ProjectRecord key={p.id} project={p} />
        ))}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Nearness is a reason to investigate. These approximate locations and
        planning milestones do not establish a shared route, simultaneous
        construction or savings.
      </p>
    </section>
  );
}
