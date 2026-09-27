import { useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";
import { formatDate } from "./EvidencePanel";

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

function fieldText(value: unknown): string {
  if (value === null || value === undefined) return "Unknown";
  if (Array.isArray(value))
    return value.length ? value.map(fieldText).join("\n") : "None supplied";
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    if ("value" in item && typeof item.meaning === "string") {
      const date =
        typeof item.value === "string"
          ? formatDate(item.value)
          : "Date unknown";
      const meaning = item.meaning.replaceAll("_", " ");
      const phase = typeof item.phase === "string" ? item.phase : null;
      const precision =
        typeof item.precision === "string" &&
        item.precision !== "day" &&
        item.precision !== "year"
          ? `${item.precision} precision`
          : null;
      return [date, meaning, phase, precision].filter(Boolean).join(" · ");
    }
    return Object.entries(item)
      .map(([key, entry]) => `${key.replaceAll("_", " ")}: ${fieldText(entry)}`)
      .join(" · ");
  }
  return String(value);
}

export function ExtractionReview() {
  const [data, setData] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/data/extraction-evaluation.json", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Evaluation file unavailable");
        return r.json();
      })
      .then((next: Evaluation) => {
        if (!Array.isArray(next.pages) || !next.pages.length)
          throw new Error("No extraction pages are available.");
        if (!controller.signal.aborted) setData(next);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e));
      });
    return () => controller.abort();
  }, [attempt]);
  if (error)
    return (
      <section
        className="rounded-xl border border-stone-200 bg-white p-5"
        aria-label="Document review unavailable"
      >
        <p role="alert" className="text-pretty text-sm text-stone-600">
          Could not load the document review. {error}
        </p>
        <Button
          onClick={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
          className="mt-3 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium hover:bg-stone-50"
        >
          Try again
        </Button>
      </section>
    );
  if (!data)
    return (
      <p role="status" className="text-pretty text-sm text-stone-500">
        Loading document review…
      </p>
    );
  const selectedIndex = data.pages[pageIndex] ? pageIndex : 0;
  const page = data.pages[selectedIndex];
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
      <h2 id="extraction-title" className="text-balance text-lg font-semibold">
        Review extracted details
      </h2>
      <p className="mt-1 text-pretty text-sm text-stone-600">
        Gemini document-extraction experiment. Verify each field against its
        source; this does not forecast construction.
      </p>
      <p className="mt-2 text-pretty text-xs text-stone-500">
        Selected-page checks used Codex without independent human double review.
        Every extracted field still needs source review.
      </p>
      <label className="mt-5 block text-sm font-medium">
        Source page
        <select
          value={selectedIndex}
          onChange={(e) => setPageIndex(Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white p-2 text-sm"
        >
          {data.pages.map((p, i) => (
            <option key={p.case_id} value={i}>
              {p.source.title} · p. {p.source.pdf_page}
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
      <details className="mt-3 text-xs text-stone-500">
        <summary className="cursor-pointer font-medium">Source details</summary>
        <div className="mt-2 space-y-2">
          <p className="break-words text-pretty">
            {data.model} · {page.split.replaceAll("_", " ")} ·{" "}
            {page.review_status.replaceAll("_", " ")}
          </p>
          <p className="break-all text-pretty">
            Document SHA-256: {page.source.sha256}
          </p>
          <a
            href="/data/extraction-evaluation.json"
            download
            className="inline-block font-medium text-emerald-800 underline"
          >
            Download evaluation
          </a>
        </div>
      </details>
      <div className="mt-4 divide-y divide-stone-100">
        {Object.entries(page.fields).map(([name, field]) => {
          const id = `${page.case_id}:${name}`;
          return (
            <article key={id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-balance text-sm font-medium">
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
              <p className="mt-1 whitespace-pre-wrap break-words text-pretty text-sm tabular-nums text-stone-600">
                {fieldText(field.value)}
              </p>
              {field.evidence_quote ? (
                <blockquote className="mt-2 border-l-2 border-emerald-200 pl-3 text-pretty text-xs text-stone-500">
                  {field.evidence_quote}
                </blockquote>
              ) : (
                <p className="mt-2 text-pretty text-xs text-stone-500">
                  {field.missing_reason}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-pretty text-xs text-stone-500">
          Checks last for this session and do not approve mapping or model
          training. Export them before reloading.
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
