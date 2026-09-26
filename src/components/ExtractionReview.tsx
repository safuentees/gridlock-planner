import { useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";

type Field = {
  value: unknown;
  evidence_quote: string | null;
  missing_reason: string | null;
};
interface Evaluation {
  model: string;
  target: string;
  totals: {
    gemini: {
      correct_fields: number;
      fields_scored: number;
      nonmissing_correct: number;
      nonmissing_fields: number;
      invented_values: number;
      date_meaning_errors: number;
    };
  };
  latency: { calls: number; median_seconds: number; total_seconds: number };
  pages: {
    case_id: string;
    split: string;
    source: { url: string; title: string; pdf_page: number; sha256: string };
    fields: Record<string, Field>;
    review_status: string;
  }[];
}

export function ExtractionReview() {
  const [data, setData] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/data/extraction-evaluation.json", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Evaluation file unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e));
      });
    return () => controller.abort();
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!data)
    return <p role="status">Loading the document-extraction evaluation…</p>;
  const page = data.pages[pageIndex];
  const totals = data.totals.gemini;
  const exportReview = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schema_version: 1,
            reviewed_at: new Date().toISOString(),
            model: data.model,
            field_acknowledgments: reviewed,
            map_eligible: false,
            training_eligible: false,
            note: "Reviewer acknowledgments only. No coordinates, activity labels or map approval are created.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "GridLock-extraction-review.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section
      aria-labelledby="extraction-title"
      className="rounded-xl border border-stone-200 bg-white p-5"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 id="extraction-title" className="text-lg font-semibold">
            Document extraction · evaluated experiment
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            {data.model} · offline job · source review required
          </p>
        </div>
        <a
          href="/data/extraction-evaluation.json"
          download
          className="text-xs font-medium text-emerald-800 underline"
        >
          Download evaluation
        </a>
      </div>
      <div className="my-4 grid grid-cols-2 gap-4 border-y border-stone-100 py-4 md:grid-cols-4">
        {[
          [
            `${totals.correct_fields}/${totals.fields_scored}`,
            "Fields matched",
          ],
          [
            `${totals.nonmissing_correct}/${totals.nonmissing_fields}`,
            "Nonmissing fields matched",
          ],
          [totals.invented_values, "Unsupported fills observed"],
          [
            `${data.latency.median_seconds.toFixed(1)}s`,
            "Median request latency",
          ],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-stone-500">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-stone-600">
        The task is to extract eight planning fields for the first project on a
        public PDF page. Six known-layout pages matched the deterministic parser
        (48/48); four unfamiliar-layout pages yielded 32/32 matched fields where
        that parser abstains. No custom model was trained.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        Ten deliberately selected pages, one model run each. Gold was visually
        checked by Codex, not independently double-annotated by people. The four
        unfamiliar pages share one report; projects can recur across layouts.
        These results do not establish general accuracy, forecasting skill or
        human time saved. All 80 fields still need source review.
      </p>
      <label className="mt-5 block text-sm font-medium">
        Inspect an extraction
        <select
          value={pageIndex}
          onChange={(e) => setPageIndex(Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white p-2 text-sm"
        >
          {data.pages.map((p, i) => (
            <option key={p.case_id} value={i}>
              {p.source.title} · p. {p.source.pdf_page} ·{" "}
              {p.split.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <a
        href={`${page.source.url}#page=${page.source.pdf_page}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs font-medium text-emerald-800 underline"
      >
        Open source page {page.source.pdf_page}
      </a>
      <p className="mt-2 break-all text-xs text-stone-500">
        Document SHA-256: {page.source.sha256}
      </p>
      <div className="mt-4 divide-y divide-stone-100">
        {Object.entries(page.fields).map(([name, field]) => {
          const id = `${page.case_id}:${name}`;
          return (
            <article key={id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-medium">
                  {name.replaceAll("_", " ")}
                </h3>
                <label className="flex shrink-0 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="accent-emerald-700"
                    checked={reviewed[id] ?? false}
                    onChange={(e) =>
                      setReviewed((old) => ({ ...old, [id]: e.target.checked }))
                    }
                  />
                  Checked against page
                </label>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-600">
                {field.value === null
                  ? "Unknown"
                  : typeof field.value === "string"
                    ? field.value
                    : JSON.stringify(field.value, null, 2)}
              </p>
              {field.evidence_quote ? (
                <blockquote className="mt-2 border-l-2 border-emerald-200 pl-3 text-xs text-stone-500">
                  {field.evidence_quote}
                </blockquote>
              ) : (
                <p className="mt-2 text-xs text-stone-500">
                  {field.missing_reason}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-stone-500">
          Review acknowledgments are separate from extracted values. They do not
          supply coordinates, construction outcomes or approval to map/train.
          Reloading clears these session-only acknowledgments.
        </p>
        <Button
          onClick={exportReview}
          className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium"
        >
          Export review acknowledgments
        </Button>
      </div>
    </section>
  );
}
