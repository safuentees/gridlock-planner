import { useState } from "react";
import { Search, FileText } from "lucide-react";
import type { Project } from "../types";
import { ProjectRecord } from "./EvidencePanel";

export function EvidenceWorkspace({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const visible = projects.filter((project) => {
    const searchable = [
      project.id,
      project.name,
      project.utility,
      project.company,
      project.state,
      ...project.endpoints.map((endpoint) => endpoint.name),
    ]
      .join(" ")
      .toLowerCase();
    return (
      searchable.includes(query.trim().toLowerCase()) &&
      (!attentionOnly || project.review.warnings.length > 0)
    );
  });
  return (
    <section className="mt-6" aria-labelledby="records-title">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 lg:p-6">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-800">
          <FileText size={16} /> RECORD REVIEW
        </p>
        <h2 id="records-title" className="text-2xl font-semibold text-blue-950">
          Check the evidence, record by record
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-900">
          Match the project identity, inspect its approximate location,
          distinguish the milestone meaning, and open the original source.
          Workbook IDs identify supplied examples; they are not utility project
          numbers.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <label className="min-w-0 flex-1 text-xs font-semibold text-blue-950">
            Search identity or location
            <span className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3">
              <Search size={16} className="shrink-0 text-blue-700" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Project, workbook ID, utility, endpoint or state"
                className="min-w-0 w-full bg-transparent py-3 text-sm font-normal text-stone-900"
                type="search"
              />
            </span>
          </label>
          <label className="flex items-center gap-2 py-3 text-sm text-blue-950">
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(event) => setAttentionOnly(event.target.checked)}
              className="size-4 accent-blue-700"
            />{" "}
            With review warnings
          </label>
        </div>
        <p className="mt-3 text-xs text-blue-800" role="status">
          {visible.length} of {projects.length} supplied records · Blue:
          information and sources · Amber: review attention
        </p>
      </div>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        {visible.map((project) => (
          <ProjectRecord key={project.id} project={project} />
        ))}
      </div>
      {visible.length === 0 && (
        <p className="rounded-xl border border-blue-200 bg-white p-6 text-sm text-stone-600">
          No matching records. Try another project name or clear the
          review-warning filter.
        </p>
      )}
    </section>
  );
}
