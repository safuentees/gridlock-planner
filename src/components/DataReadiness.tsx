import {
  ArrowDownToLine,
  ArrowUpRight,
  Database,
  FileCheck2,
  Info,
} from "lucide-react";
import assessment from "../data/forecast_assessment.json";

export function DataReadiness({ compact = false }: { compact?: boolean }) {
  const c = assessment.coverage;
  const years = Object.entries(c.georgia_its_active.need_year_counts);
  const peak = Math.max(...years.map(([, count]) => count));
  return (
    <section
      className="rounded-xl border border-stone-200 bg-white p-5 lg:p-6"
      aria-labelledby={compact ? "readiness-compact" : "readiness-full"}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id={compact ? "readiness-compact" : "readiness-full"}
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Database size={19} className="text-emerald-800" />
            What the full reports support
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            44-page Dominion report + 668-page Georgia Power public report
          </p>
        </div>
        <span className="rounded-md bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-600">
          Forecast readiness assessed
        </span>
      </div>
      <div className="grid grid-cols-2 gap-5 border-y border-stone-100 py-5 md:grid-cols-4">
        {[
          [c.desc.unique_full_project_ids, "Distinct Dominion projects"],
          [c.georgia_its_active.unique_teams_ids, "Active Georgia ITS IDs"],
          [
            c.georgia_its_removed.completed_status_count,
            "Completed-status records",
          ],
          [
            c.georgia_its_removed.exact_actual_completion_dates,
            "Exact actual completion dates",
          ],
        ].map(([count, label]) => (
          <div key={label}>
            <p className="text-2xl font-semibold tabular-nums">{count}</p>
            <p className="mt-1 text-xs text-stone-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        The Georgia summary and detail pages repeat the same 208 IDs, not 416
        independent jobs. Its inventory spans several sponsor codes, not only
        Georgia Power. One planning snapshot per report and past planned dates
        are insufficient to evaluate future construction probabilities.
      </p>
      <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-stone-600">
        <Info size={16} className="mt-0.5 shrink-0 text-emerald-800" />
        <span>
          <strong className="font-semibold text-stone-800">
            Decision: scenarios and reviewed extraction.
          </strong>{" "}
          No forecasting model was trained or validated. A credible experiment
          needs earlier frozen plans, later observed construction intervals and
          location coverage, with later outcomes held out from training.
        </span>
      </p>
      {!compact && (
        <>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article>
              <h3 className="mb-1 text-sm font-semibold">
                Need years in the Georgia ITS snapshot
              </h3>
              <p className="mb-4 text-xs text-stone-500">
                208 unique IDs · planned milestones, not actual jobs per year
              </p>
              <div
                className="space-y-2"
                role="img"
                aria-label={`Need-year counts: ${years.map(([year, count]) => `${year}: ${count}`).join(", ")}.`}
              >
                {years.map(([year, count]) => (
                  <div
                    key={year}
                    className="flex items-center gap-3 text-xs tabular-nums"
                  >
                    <span className="w-9 text-stone-500">{year}</span>
                    <div className="h-3 flex-1 rounded-sm bg-stone-100">
                      <div
                        className="h-full rounded-sm bg-emerald-600"
                        style={{ width: `${(count / peak) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-stone-600">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </article>
            <article>
              <h3 className="mb-3 text-sm font-semibold">
                Validation catches worth keeping
              </h3>
              <ul className="space-y-3 text-sm leading-relaxed text-stone-600">
                <li className="flex gap-2">
                  <FileCheck2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-800"
                  />
                  <span>
                    <strong>3 conflicting need dates</strong> between summary
                    and detail pages.
                  </span>
                </li>
                <li className="flex gap-2">
                  <FileCheck2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-800"
                  />
                  <span>
                    <strong>1 ID is both active and removed.</strong> Both
                    statements stay visible in the catalog.
                  </span>
                </li>
                <li className="flex gap-2">
                  <FileCheck2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-800"
                  />
                  <span>
                    <strong>1 planned start follows its need date.</strong> It
                    is flagged rather than repaired by guesswork.
                  </span>
                </li>
                <li className="flex gap-2">
                  <FileCheck2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-800"
                  />
                  <span>
                    <strong>77 distribution rows lack stable IDs.</strong> They
                    remain separate from the transmission inventory.
                  </span>
                </li>
              </ul>
            </article>
          </div>
          <p className="mt-6 rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
            The larger catalog has no validated coordinates extracted here and
            does not contribute invented points to the map. Multi-phase records
            and repeated sections are not treated as independent outcomes.
            Completed-status rows contain last year’s need dates, not actual
            completion times.
          </p>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-emerald-800">
        <a
          href="/data/full_report_catalog.json"
          download
          className="inline-flex items-center gap-1.5 underline"
        >
          <ArrowDownToLine size={13} />
          Download extracted catalog
        </a>
        <a
          href="/sources/Dominion_2024-2028_Project_Descriptions.pdf"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 underline"
        >
          Dominion report
          <ArrowUpRight size={13} />
        </a>
        <a
          href="/sources/Georgia_Power_2025_IRP_Volume_3_PUBLIC_DISCLOSURE.pdf#page=177"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 underline"
        >
          Georgia ITS inventory
          <ArrowUpRight size={13} />
        </a>
      </div>
    </section>
  );
}
