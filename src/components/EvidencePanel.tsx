import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { utilityShortLabel } from "./UtilityIcon";
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

function EvidenceDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger className="group flex w-full items-center justify-between gap-2 rounded-md py-2 text-left text-xs font-medium text-stone-700 hover:text-stone-950">
        {title}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="shrink-0 group-data-[panel-open]:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Panel keepMounted className="data-[closed]:hidden">
        <div className="space-y-3 pb-3 text-pretty text-xs leading-relaxed text-stone-600">
          {children}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

function ProjectRecord({ project }: { project: Project }) {
  const center = centerPoint(project);
  const located = project.endpoints.filter(
    (endpoint) => endpoint.coordinate,
  ).length;
  return (
    <article className="min-w-0 space-y-2 py-4">
      <p className="break-words text-pretty text-xs text-stone-500">
        {utilityShortLabel(project.company)}
        {project.state ? ` · ${project.state}` : ""}
      </p>
      <h3 className="text-balance break-words text-sm font-medium leading-snug text-stone-900">
        {project.shortName}
      </h3>
      <dl className="space-y-0.5 text-xs leading-relaxed">
        <dt className="text-stone-600">
          {
            {
              need_date: "Need date",
              planned_in_service: "Planned in-service date",
              planned_start: "Planned start date",
              unknown: "Date meaning not supplied",
            }[project.dateMeaning]
          }
        </dt>
        <dd className="text-sm font-medium tabular-nums text-stone-900">
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
          className="inline-flex items-center gap-1 text-xs text-emerald-800 underline underline-offset-2"
        >
          Read source, page {project.originalSource.page}
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      ) : (
        <p className="break-words text-pretty text-xs text-stone-600">
          Imported source: {project.originalSource.title}
        </p>
      )}
      <p className="text-pretty text-xs text-stone-500">
        {center ? "Approximate location" : "Location not supplied"}
      </p>
      <EvidenceDisclosure title="Source and location details">
        <p className="break-words text-pretty">
          <strong className="font-medium text-stone-800">
            Full source name:
          </strong>{" "}
          {project.name}
        </p>
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
      </EvidenceDisclosure>
      <EvidenceDisclosure title="Research notes">
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
      </EvidenceDisclosure>
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
    <section aria-label="Source records">
      <h2 className="text-balance text-xs font-medium text-stone-800">
        Source records
      </h2>
      {!records.length && (
        <p className="text-xs text-stone-500">
          Select a project or comparison to see its dates and source reports.
        </p>
      )}
      <div className="divide-y divide-stone-100">
        {records.map((record) => (
          <ProjectRecord key={record.id} project={record} />
        ))}
      </div>
    </section>
  );
}
