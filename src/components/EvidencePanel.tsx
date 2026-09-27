import { ArrowUpRight, BookOpen, CalendarDays, MapPin } from "lucide-react";
import type { Comparison, Project } from "../types";
import { centerPoint } from "../lib/comparisons";

export const formatDate = (date: string | null) =>
  date && /^\d{4}$/.test(date)
    ? `${date} (year only)`
    : date && /^\d{4}-\d{2}$/.test(date)
      ? new Date(`${date}-01T00:00:00Z`).toLocaleDateString("en-US", {
          timeZone: "UTC",
          month: "long",
          year: "numeric",
        })
      : date
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
  const located = project.endpoints.filter(
    (endpoint) => endpoint.coordinate,
  ).length;
  return (
    <article className="min-w-0 rounded-xl border border-stone-200 bg-white p-4">
      <p className="mb-2 break-words text-pretty text-xs font-medium text-stone-500">
        {project.company}
        {project.state ? ` · ${project.state}` : ""}
      </p>
      <h3 className="text-balance break-words text-base font-semibold leading-snug">
        {project.name}
      </h3>
      <dl className="mt-4 text-sm">
        <dt className="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
          <CalendarDays size={13} aria-hidden="true" />
          {
            {
              need_date: "Source need date",
              planned_in_service: "Source planned in-service date",
              planned_start: "Source planned start",
              unknown: "Source date · meaning unknown",
            }[project.dateMeaning]
          }
        </dt>
        <dd className="font-semibold tabular-nums">
          {formatDate(project.originalDate)}
        </dd>
      </dl>
      {project.originalSource.url ? (
        <a
          href={sourceLink(
            project.originalSource.url,
            project.originalSource.page,
          )}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 underline underline-offset-2"
        >
          <BookOpen size={14} aria-hidden="true" />
          Open original source · p. {project.originalSource.page}
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      ) : (
        <p className="mt-3 break-words text-pretty text-xs text-stone-600">
          Imported source: {project.originalSource.title}
        </p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-pretty text-xs text-stone-500">
        <MapPin size={13} aria-hidden="true" />
        {center ? "Approximate location" : "Location not supplied"}
      </p>
      <details className="mt-4 border-t border-stone-100 pt-3">
        <summary className="cursor-pointer text-xs font-medium text-stone-600">
          Source and location details
        </summary>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-stone-600">
          <p className="break-words text-pretty font-medium">
            {project.originalSource.title}
          </p>
          <p className="text-pretty">
            {project.originalSource.asOf}. {project.originalSource.dateNote}
          </p>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Utility</dt>
              <dd className="break-words">{project.utility}</dd>
            </div>
            <div>
              <dt className="font-medium">Source record ID</dt>
              <dd className="break-all">
                {project.sourceProjectId || project.id}
              </dd>
            </div>
            {project.sourceProjectId && (
              <div>
                <dt className="font-medium">Imported record ID</dt>
                <dd className="break-all">{project.id}</dd>
              </div>
            )}
            {(project.sourceSheet || project.sourceRow) && (
              <div>
                <dt className="font-medium">File location</dt>
                <dd className="break-words tabular-nums">
                  {project.sourceSheet || "Sheet not supplied"}
                  {project.sourceRow ? ` · row ${project.sourceRow}` : ""}
                </dd>
              </div>
            )}
            <div>
              <dt className="font-medium">Date as supplied</dt>
              <dd className="tabular-nums">
                {project.originalDateRaw || "Not supplied"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Approximate map point · latitude, longitude
              </dt>
              <dd className="tabular-nums">
                {center
                  ? `${center[0].toFixed(6)}, ${center[1].toFixed(6)}`
                  : "Unknown"}
              </dd>
              <dd>
                {located === 2
                  ? "Midpoint of two supplied endpoints"
                  : located === 1
                    ? "Uses the one located endpoint"
                    : "No endpoint coordinates supplied"}
              </dd>
            </div>
          </dl>
          <ul className="space-y-2" aria-label="Supplied endpoints">
            {project.endpoints.map((endpoint, index) => (
              <li key={index}>
                <span className="break-words font-medium">{endpoint.name}</span>
                <br />
                <span className="tabular-nums text-stone-500">
                  {endpoint.coordinate
                    ? endpoint.coordinate
                        .map((value) => value.toFixed(6))
                        .join(", ")
                    : "Coordinates missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>
      <details className="mt-3 border-t border-stone-100 pt-3">
        <summary className="cursor-pointer text-xs font-medium text-stone-600">
          Research notes
        </summary>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-stone-600">
          <p className="text-pretty text-stone-500">
            {project.review.reviewedOn
              ? `Review checked ${formatDate(project.review.reviewedOn)}.`
              : "This record has not been reviewed."}{" "}
            Milestone source:{" "}
            {project.review.sourceAsOf || "source date not available"}.
          </p>
          <p className="text-pretty">
            <strong>Work scope:</strong> {project.review.scope}
          </p>
          <p className="text-pretty">{project.review.locationNote}</p>
          <p className="text-pretty">
            <strong>Reported status:</strong>{" "}
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
                ? ` · p. ${project.review.statusSourcePage}`
                : ""}
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          )}
          <p className="text-pretty">
            <strong>Reviewed milestone:</strong>{" "}
            <span className="tabular-nums">
              {project.review.latestDate || "Unknown"}
            </span>{" "}
            ({project.review.latestDatePrecision} precision).{" "}
            {project.review.dateNote}
          </p>
          {project.review.warnings.map((warning, index) => (
            <p key={index} className="text-pretty">
              {warning}
            </p>
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
              Open milestone source · p. {project.review.sourcePage}
              <ArrowUpRight size={12} aria-hidden="true" />
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
}: {
  comparison: Comparison | null;
  project: Project | null;
}) {
  const records = comparison
    ? [comparison.a, comparison.b]
    : project
      ? [project]
      : [];
  return (
    <section
      aria-labelledby="evidence-title"
      className="border-t border-stone-200 bg-stone-50 p-3"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="evidence-title"
            className="text-balance text-lg font-semibold"
          >
            Timing and evidence
          </h2>
          <p className="mt-1 text-pretty text-xs text-stone-500">
            {records.length
              ? "Construction timing remains unconfirmed."
              : "Select a project or comparison to see its dates and source reports."}
          </p>
        </div>
      </div>
      {comparison && (
        <p className="mb-4 text-pretty text-sm text-stone-600">
          {comparison.gapDays === null ? (
            "Exact gap between source dates unknown."
          ) : (
            <>
              <strong className="font-semibold tabular-nums">
                {comparison.gapDays.toLocaleString()} days
              </strong>{" "}
              between the source dates.
            </>
          )}
        </p>
      )}
      <div className="grid gap-3">
        {records.map((record) => (
          <ProjectRecord key={record.id} project={record} />
        ))}
      </div>
    </section>
  );
}
