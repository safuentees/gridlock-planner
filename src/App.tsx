import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Slider } from "@base-ui/react/slider";
import {
  ArrowDownToLine,
  ChevronRight,
  Layers,
  MapPin,
  Network,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import projectData from "./data/projects.json";
import metadata from "./data/metadata.json";
import type {
  Comparison,
  ExplorationMode,
  Project,
  ProjectOverride,
  RuntimeDataset,
} from "./types";
import {
  centerPoint,
  compareProjects,
  milesFromUnit,
  milesToUnit,
} from "./lib/comparisons";
import { createDemoDataset, applyOverrides } from "./lib/datasets";
import { projectDateBounds, shiftDateBounds } from "./lib/temporal";
import { monthISO, monthEndISO, timelineDistribution } from "./lib/timeline";
import { useSpatialQuery } from "./hooks/useSpatialQuery";
import { cn } from "./lib/cn";
import { originalComparison, comparisonCsv } from "./lib/exports";
const ProjectMap = lazy(() =>
  import("./components/ProjectMap").then((m) => ({ default: m.ProjectMap })),
);
import { EvidencePanel, formatDate } from "./components/EvidencePanel";
import { DataReadiness } from "./components/DataReadiness";
import { TimelineControl } from "./components/TimelineControl";
const ImportWizard = lazy(() =>
  import("./components/ImportWizard").then((m) => ({
    default: m.ImportWizard,
  })),
);
import { OverridesPanel } from "./components/OverridesPanel";
const ExtractionReview = lazy(() =>
  import("./components/ExtractionReview").then((m) => ({
    default: m.ExtractionReview,
  })),
);

const control =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40";
const field =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm tabular-nums";
const PROJECTS = projectData as Project[];
const EMPTY_SHIFTS: Record<string, number> = {};

function download(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [dataset, setDataset] = useState<RuntimeDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptance, setAcceptance] = useState(0);
  const accept = (d: RuntimeDataset) => {
    setDataset(d);
    setAcceptance((n) => n + 1);
  };
  const restore = () => {
    void createDemoDataset(PROJECTS, metadata.workbookSha256)
      .then(accept)
      .catch((e) => setError(String(e)));
  };
  useEffect(restore, []);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-stone-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-800 p-2 text-white">
              <Network size={22} />
            </span>
            <div>
              <h1 className="text-xl font-semibold">GridLock</h1>
              <p className="text-xs text-stone-500">
                Find nearby plans. Investigate the evidence.
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Sperry challenge · planning intelligence
          </p>
        </div>
      </header>
      {error && (
        <p role="alert" className="p-5">
          {error}
        </p>
      )}
      {dataset ? (
        <DatasetWorkspace
          key={`${dataset.id}:${acceptance}`}
          source={dataset}
          onAccept={accept}
          onRestore={restore}
        />
      ) : (
        <p role="status" className="p-8">
          Preparing the supplied examples…
        </p>
      )}
      <footer className="mx-auto flex max-w-screen-2xl flex-wrap justify-between gap-3 px-5 py-6 text-xs text-stone-500">
        <span>
          Approximate locations and planning milestones. Construction overlap is
          not established.
        </span>
        <a
          href="/THIRD_PARTY_NOTICES.txt"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Third-party notices
        </a>
      </footer>
    </div>
  );
}

function DatasetWorkspace({
  source,
  onAccept,
  onRestore,
}: {
  source: RuntimeDataset;
  onAccept: (d: RuntimeDataset) => void;
  onRestore: () => void;
}) {
  const [overrides, setOverrides] = useState<ProjectOverride[]>([]);
  const [effective, setEffective] = useState(source);
  const [applying, setApplying] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    setApplying(true);
    setLayerError(null);
    void applyOverrides(source, overrides)
      .then((d) => {
        if (id === request.current) {
          setEffective(d);
          setApplying(false);
        }
      })
      .catch((e) => {
        if (id === request.current) {
          setLayerError(String(e));
          setApplying(false);
        }
      });
    return () => {
      request.current++;
    };
  }, [source, overrides]);
  return (
    <main className="mx-auto max-w-screen-2xl px-3 py-5 sm:px-5">
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{source.name}</h2>
          <p className="mt-1 text-xs text-stone-500">
            {source.projects.length.toLocaleString()} source records ·{" "}
            {source.kind === "demo"
              ? "historical demonstration"
              : "uploaded dataset"}{" "}
            · {overrides.length} correction{overrides.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className={control} onClick={() => setImportOpen((v) => !v)}>
            <Upload size={14} className="mr-2 inline" />
            Import CSV / XLSX
          </Button>
          <Button className={control} onClick={() => setEditOpen((v) => !v)}>
            Review corrections
          </Button>
          {source.kind === "upload" && (
            <Button className={control} onClick={onRestore}>
              <RotateCcw size={14} className="mr-2 inline" />
              Restore demo
            </Button>
          )}
        </div>
      </section>
      {importOpen && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-5">
          <Suspense fallback={<p role="status">Loading importer…</p>}>
            <ImportWizard
              onAccept={(d) => {
                setImportOpen(false);
                onAccept(d);
              }}
              onCancel={() => setImportOpen(false)}
            />
          </Suspense>
        </div>
      )}
      {editOpen && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-5">
          <OverridesPanel
            dataset={source}
            overrides={overrides}
            onChange={setOverrides}
            selectedProjectId={selectedProjectId ?? undefined}
          />
        </div>
      )}
      {layerError && (
        <p
          role="alert"
          className="mb-4 rounded border border-stone-300 bg-white p-3 text-sm"
        >
          {layerError}
        </p>
      )}
      {applying && (
        <p role="status" className="p-3 text-sm">
          Applying the separate correction layer…
        </p>
      )}
      <Workspace
        source={source}
        dataset={effective}
        overrides={overrides}
        onProjectFocus={setSelectedProjectId}
      />
      <details
        onToggle={(e) => setMethodsOpen(e.currentTarget.open)}
        className="mt-5 rounded-xl border border-stone-200 bg-white p-5"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Data, methods and model evaluation
        </summary>
        <div className="mt-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <article className="text-sm leading-relaxed text-stone-600">
              <h3 className="mb-2 font-semibold text-stone-900">
                How to read the map
              </h3>
              <p>
                The arithmetic midpoint of available endpoints represents each
                record. A single endpoint is a fallback. Distances are
                straight-line haversine using Earth radius 3,958.7613 miles.
                Nearby means strictly less than the selected radius, before
                rounding. 25 miles is 40.2336 km.
              </p>
              <p className="mt-2">
                Planned dates preserve source meaning and precision. Need dates
                and in-service dates are different milestones; neither is
                observed construction. What-if year shifts are explicit
                assumptions. Approximate points do not establish routes or
                shared work.
              </p>
            </article>
            <article className="text-sm leading-relaxed text-stone-600">
              <h3 className="mb-2 font-semibold text-stone-900">
                Source provenance
              </h3>
              <p className="break-all text-xs">
                Original source SHA-256: {source.sourceHash}
              </p>
              <p className="mt-2">
                Uploaded records stay in this browser session. Download
                corrections before refreshing. Original files, annotations and
                source records remain unchanged.
              </p>
              {source.kind === "demo" && (
                <a
                  href="/sources/Projects_Overlaps.xlsx"
                  download
                  className="mt-3 inline-block font-medium text-emerald-800 underline"
                >
                  Download unchanged source workbook
                </a>
              )}
              <p className="mt-2">
                Sperry's clarification accepts centers or closest points and
                either distance cutoff when explained. Other prize eligibility
                is not claimed here.
              </p>
            </article>
          </div>
          <DataReadiness />
          {methodsOpen && (
            <Suspense fallback={<p role="status">Loading evaluation…</p>}>
              <ExtractionReview />
            </Suspense>
          )}
        </div>
      </details>
    </main>
  );
}

function Workspace({
  source,
  dataset,
  overrides,
  onProjectFocus,
}: {
  source: RuntimeDataset;
  dataset: RuntimeDataset;
  overrides: ProjectOverride[];
  onProjectFocus: (id: string | null) => void;
}) {
  const availableCompanies = useMemo(
    () => [...new Set(dataset.projects.map((p) => p.company))].sort(),
    [dataset.projects],
  );
  const [companies, setCompanies] = useState(availableCompanies);
  const [companySearch, setCompanySearch] = useState("");
  const selectedCompanies = useMemo(() => new Set(companies), [companies]);
  const visibleCompanies = useMemo(
    () =>
      availableCompanies
        .filter((c) => c.toLowerCase().includes(companySearch.toLowerCase()))
        .slice(0, 100),
    [availableCompanies, companySearch],
  );
  const previousCompanies = useRef(availableCompanies);
  useEffect(() => {
    const previous = new Set(previousCompanies.current);
    const available = new Set(availableCompanies);
    setCompanies((old) => [
      ...old.filter((c) => available.has(c)),
      ...availableCompanies.filter((c) => !previous.has(c)),
    ]);
    previousCompanies.current = availableCompanies;
  }, [availableCompanies]);
  const [mode, setMode] = useState<ExplorationMode>("planned");
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const activeShifts = mode === "what_if" ? shifts : EMPTY_SHIFTS;
  const [includeUndated, setIncludeUndated] = useState(true);
  const [thresholdMiles, setThresholdMiles] = useState(25);
  const [unit, setUnit] = useState<"mi" | "km">("mi");
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [fitAll, setFitAll] = useState(false);
  const [exhaustive, setExhaustive] = useState(false);
  const [windowMonths, setWindowMonths] = useState<number | null>(null);
  const sourceDates = useMemo(
    () => dataset.projects.map((p) => ({ p, bounds: projectDateBounds(p) })),
    [dataset.projects],
  );
  const shiftLimits = useMemo(() => {
    const limits = new Map<string, { min: number; max: number }>();
    for (const { p, bounds } of sourceDates) {
      if (!bounds) continue;
      const year = new Date(bounds.start).getUTCFullYear();
      const limit = limits.get(p.company) ?? { min: -20, max: 20 };
      limit.min = Math.max(limit.min, 1 - year);
      limit.max = Math.min(limit.max, 9999 - year);
      limits.set(p.company, limit);
    }
    return limits;
  }, [sourceDates]);
  const dated = useMemo(
    () =>
      sourceDates.map(({ p, bounds }) => ({
        p,
        bounds: shiftDateBounds(bounds, activeShifts[p.company] ?? 0),
      })),
    [sourceDates, activeShifts],
  );
  const distribution = useMemo(
    () =>
      timelineDistribution(
        dated
          .filter(({ p }) => selectedCompanies.has(p.company))
          .map((r) => r.bounds),
      ),
    [dated, selectedCompanies],
  );
  const [chosenRange, setChosenRange] = useState<[number, number] | null>(null);
  const range: [number, number] = chosenRange
    ? [
        Math.max(distribution.min, Math.min(distribution.max, chosenRange[0])),
        Math.max(distribution.min, Math.min(distribution.max, chosenRange[1])),
      ]
    : [distribution.min, distribution.max];
  const query = useMemo(
    () => ({
      companies,
      from: monthISO(range[0]) + "-01",
      to: monthEndISO(range[1]),
      includeUndated,
      shifts: activeShifts,
      thresholdMiles,
      limit: 200,
      timeBudgetMs: 200,
      maxCandidates: 250000,
      ...(mode === "what_if" && windowMonths !== null ? { windowMonths } : {}),
    }),
    [
      companies,
      range[0],
      range[1],
      includeUndated,
      activeShifts,
      thresholdMiles,
      mode,
      windowMonths,
    ],
  );
  const search = useSpatialQuery(
    dataset.projects,
    {
      datasetVersion: dataset.featureHash,
      geometryVersion: dataset.geometryVersion,
    },
    query,
  );
  const results = search.result;
  const projectById = useMemo(
    () => new Map(dataset.projects.map((p) => [p.id, p])),
    [dataset.projects],
  );
  const originals = useMemo(
    () => new Map(source.projects.map((p) => [p.id, p])),
    [source.projects],
  );
  const centers = useMemo(
    () => new Map(dataset.projects.map((p) => [p.id, centerPoint(p)])),
    [dataset.geometryVersion],
  );
  const filtered = useMemo(
    () =>
      results
        ? results.eligibleProjectIds.flatMap((id) => {
            const p = projectById.get(id);
            return p ? [p] : [];
          })
        : [],
    [results, projectById],
  );
  const allPairs = useMemo(
    () =>
      exhaustive && filtered.length <= 20 ? compareProjects(filtered) : null,
    [exhaustive, filtered],
  );
  const pairs = allPairs ?? results?.pairs ?? [];
  const selected = pairs.find((p) => p.id === selectedId) ?? null;
  const project =
    projectId && results?.eligibleProjectIds.includes(projectId)
      ? (projectById.get(projectId) ?? null)
      : null;
  const originalSelection = selected
    ? originalComparison(selected, originals)
    : null;
  const selectedRecords = selected
    ? [selected.a, selected.b]
    : project
      ? [project]
      : [];
  const focus = () => {
    setFitAll(false);
    setFitRequest((n) => n + 1);
  };
  const selectPair = (id: string) => {
    setSelectedId(id);
    setProjectId(null);
    onProjectFocus(null);
  };
  const selectProject = (id: string) => {
    setProjectId(id);
    setSelectedId(null);
    onProjectFocus(id);
  };
  const sourceCount = dataset.projects.length;
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
        <div
          role="group"
          aria-label="Date interpretation"
          className="flex rounded-lg bg-stone-100 p-1"
        >
          {(
            [
              ["planned", "Planned"],
              ["what_if", "What-if"],
              ["forecast", "Forecast"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setExhaustive(false);
              }}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium",
                mode === value
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500",
              )}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-stone-500">
          Ranked by distance · evidence before action
        </span>
      </div>
      {mode === "forecast" && (
        <section
          aria-label="Forecast unavailable"
          className="border-b border-stone-200 bg-stone-50 px-5 py-4"
        >
          <h2 className="text-sm font-semibold">
            Forecast estimates unavailable
          </h2>
          <p className="mt-1 max-w-4xl text-sm text-stone-600">
            Target: documented field-construction activity for a known project
            in a future month, using information available at the forecast
            cutoff. The reports lack verified activity intervals and linked
            historical snapshots. Missing activity is unknown. No forecast was
            trained; the map below continues to show source plans.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            The evaluated Gemini experiment extracts document fields. It does
            not predict construction. Changed uploads or features require a new
            compatible inference manifest before estimates can be shown.
          </p>
        </section>
      )}
      <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-5 border-b border-stone-200 bg-stone-50 p-5 lg:border-r lg:border-b-0">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Utilities</h2>
            {availableCompanies.length > 12 && (
              <label className="mb-3 block text-xs">
                Find utility
                <input
                  type="search"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className={cn(field, "mt-1")}
                />
              </label>
            )}
            <div className="mb-3 flex gap-3 text-xs">
              <Button
                className="text-emerald-800 underline"
                onClick={() => setCompanies(availableCompanies)}
              >
                Select all utilities
              </Button>
              <Button
                className="text-stone-600 underline"
                onClick={() => setCompanies([])}
              >
                Clear utilities
              </Button>
            </div>
            {availableCompanies.length > 100 && (
              <p className="mb-2 text-xs text-stone-500">
                First 100 matching utilities shown. Search to find others.{" "}
                {companies.length.toLocaleString()} selected.
              </p>
            )}
            <div className="max-h-48 space-y-3 overflow-auto">
              {visibleCompanies.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.has(c)}
                    onChange={(e) =>
                      setCompanies((old) =>
                        e.target.checked
                          ? [...old, c]
                          : old.filter((v) => v !== c),
                      )
                    }
                    className="size-4 accent-emerald-700"
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <label htmlFor="radius" className="text-sm font-semibold">
                Distance radius
              </label>
              <select
                aria-label="Distance units"
                value={unit}
                onChange={(e) => setUnit(e.target.value as "mi" | "km")}
                className="rounded border border-stone-200 bg-white p-1 text-xs"
              >
                <option value="mi">mi</option>
                <option value="km">km</option>
              </select>
            </div>
            <input
              id="radius"
              type="number"
              min={milesToUnit(0.1, unit)}
              max={unit === "mi" ? 500 : 804.672}
              step="any"
              value={Number(milesToUnit(thresholdMiles, unit).toFixed(4))}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (
                  Number.isFinite(n) &&
                  milesFromUnit(n, unit) >= 0.1 &&
                  milesFromUnit(n, unit) <= 500
                )
                  setThresholdMiles(milesFromUnit(n, unit));
              }}
              className={field}
            />
            <Slider.Root
              value={thresholdMiles}
              min={0.1}
              max={500}
              step={0.1}
              onValueChange={setThresholdMiles}
              className="mt-2"
            >
              <Slider.Control className="relative flex h-7 items-center">
                <Slider.Track className="h-1 w-full rounded-full bg-stone-200">
                  <Slider.Indicator className="rounded-full bg-emerald-700" />
                  <Slider.Thumb
                    aria-label="Distance radius in miles"
                    className="size-4 rounded-full border-2 border-emerald-700 bg-white"
                  />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>
            <p className="text-xs text-stone-500">
              Strictly less than {milesToUnit(thresholdMiles, unit).toFixed(2)}{" "}
              {unit}. Approximate centers.
            </p>
          </div>
          <label className="flex items-start gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={includeUndated}
              onChange={(e) => setIncludeUndated(e.target.checked)}
              className="mt-0.5 size-4 accent-emerald-700"
            />
            Include unknown milestone dates
          </label>
          {mode === "what_if" && (
            <section className="border-t border-stone-200 pt-4">
              <h2 className="text-sm font-semibold">Assumed year shifts</h2>
              <p className="mt-1 text-xs text-stone-500">
                Applied to source milestones. Zero means unchanged.
              </p>
              <div className="mt-3 space-y-3">
                {visibleCompanies.map((c) => (
                  <label key={c} className="block text-xs">
                    {c}
                    <input
                      type="number"
                      min={shiftLimits.get(c)?.min ?? -20}
                      max={shiftLimits.get(c)?.max ?? 20}
                      step={1}
                      value={shifts[c] ?? 0}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (
                          Number.isInteger(n) &&
                          n >= (shiftLimits.get(c)?.min ?? -20) &&
                          n <= (shiftLimits.get(c)?.max ?? 20)
                        ) {
                          setShifts((old) => ({ ...old, [c]: n }));
                          setChosenRange(null);
                        }
                      }}
                      className={cn(field, "mt-1")}
                    />
                  </label>
                ))}
              </div>
              <label className="mt-4 block text-xs">
                Maximum milestone gap
                <select
                  value={windowMonths ?? ""}
                  onChange={(e) =>
                    setWindowMonths(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  className={cn(field, "mt-1")}
                >
                  <option value="">No gap restriction</option>
                  {[0, 3, 6, 12, 24].map((n) => (
                    <option key={n} value={n}>
                      {n} calendar months
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-stone-500">
                With a gap restriction, imprecise or missing dates are excluded.
                This compares milestones, not construction overlap.
              </p>
              <Button
                className="mt-3 text-xs font-medium text-emerald-800 underline"
                onClick={() => {
                  setShifts({});
                  setChosenRange(null);
                  setWindowMonths(null);
                }}
              >
                Reset assumptions
              </Button>
            </section>
          )}
          <p className="border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
            {source.kind === "demo"
              ? "Historical examples from the supplied workbook. Research updates are annotations, not replacements."
              : "Uploaded records have independent identities and no inherited demo research."}
          </p>
        </aside>
        <div className="min-w-0">
          <TimelineControl
            distribution={distribution}
            range={range}
            onChange={setChosenRange}
            assumed={mode === "what_if"}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
            <p role="status" className="text-sm tabular-nums text-stone-600">
              {search.status === "loading"
                ? "Searching…"
                : `${filtered.length.toLocaleString()} of ${sourceCount.toLocaleString()} records in view`}
            </p>
            <div className="flex gap-2">
              <Button
                aria-pressed={mapMode === "points"}
                onClick={() => setMapMode("points")}
                className={cn(control, "text-xs")}
              >
                <MapPin size={13} className="mr-1 inline" />
                Map
              </Button>
              <Button
                aria-pressed={mapMode === "heat"}
                onClick={() => setMapMode("heat")}
                className={cn(control, "text-xs")}
              >
                <Layers size={13} className="mr-1 inline" />
                Heat
              </Button>
              <Button
                className={cn(control, "text-xs")}
                onClick={() => {
                  setFitAll(true);
                  setFitRequest((n) => n + 1);
                }}
              >
                Fit all
              </Button>
            </div>
          </div>
          <div className="h-[28rem] lg:h-[32rem]">
            <Suspense
              fallback={
                <p role="status" className="p-6">
                  Loading map…
                </p>
              }
            >
              <ProjectMap
                projects={filtered}
                centers={centers}
                selected={selected}
                selectedProjectId={project?.id ?? null}
                mode={mapMode}
                fitRequest={fitRequest}
                fitAll={fitAll}
                onProjectSelect={selectProject}
              />
            </Suspense>
          </div>
        </div>
      </div>
      <section
        aria-labelledby="rank-title"
        className="border-t border-stone-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div>
            <h2 id="rank-title" className="text-lg font-semibold">
              {allPairs
                ? "All fixture comparisons"
                : "Nearby cross-utility plans"}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {results
                ? `${results.complete ? "" : "At least "}${results.matchedCount.toLocaleString()} nearby matches · ${results.possibleCount.toLocaleString()} possible cross-utility pairs before distance/gap checks.`
                : "Select utilities and a date range to search."}
            </p>
            {results && (
              <p className="mt-1 text-xs text-stone-500">
                {results.complete
                  ? `Search complete. ${results.matchedCount > results.pairs.length ? "Showing the closest 200." : "All nearby matches shown."}`
                  : `Search bounded (${results.reason.replaceAll("_", " ")}). Showing the best visited pairs, not necessarily the global closest. Narrow the radius, utilities or dates.`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {dataset.projects.length <= 20 && mode === "planned" && (
              <Button
                className={cn(control, "text-xs")}
                onClick={() => setExhaustive((v) => !v)}
              >
                {exhaustive ? "Nearby only" : "Inspect all fixture pairs"}
              </Button>
            )}
            <Button
              disabled={!pairs.length || search.status === "loading"}
              onClick={() =>
                download(
                  "GridLock-displayed-comparisons.csv",
                  comparisonCsv(
                    pairs,
                    dataset,
                    source,
                    mode,
                    activeShifts,
                    allPairs ? true : !!results?.complete,
                    allPairs
                      ? "all fixture pairs"
                      : "displayed bounded nearby results",
                  ),
                )
              }
              className={cn(control, "text-xs")}
            >
              <ArrowDownToLine size={13} className="mr-1 inline" />
              Export {pairs.length} displayed
            </Button>
            {search.status === "loading" && (
              <Button
                className={cn(control, "text-xs")}
                onClick={search.cancel}
              >
                <X size={13} className="mr-1 inline" />
                Cancel
              </Button>
            )}
          </div>
        </div>
        {search.error && (
          <p role="alert" className="px-5 pb-4 text-sm">
            {search.error}
          </p>
        )}
        {search.status === "loading" ? (
          <p className="px-5 pb-5 text-sm text-stone-500">
            Preparing candidates; changing filters cancels obsolete work.
          </p>
        ) : pairs.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-stone-500">
            No comparisons to show. Select two utilities, widen the dates or
            radius, or include unknown dates.
          </p>
        ) : (
          <div className="max-h-96 overflow-auto border-t border-stone-100">
            <ol
              aria-label="Ranked comparisons"
              className="divide-y divide-stone-100"
            >
              {pairs.map((p, i) => (
                <li key={p.id}>
                  <Button
                    aria-pressed={selectedId === p.id}
                    onClick={() => selectPair(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-stone-50",
                      selectedId === p.id && "bg-emerald-50",
                    )}
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-stone-400">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {p.a.shortName}{" "}
                        <span className="font-normal text-stone-400">↔</span>{" "}
                        {p.b.shortName}
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">
                        {p.a.company} / {p.b.company} ·{" "}
                        {p.gapDays === null
                          ? "Milestone gap unknown"
                          : `${p.gapDays.toLocaleString()} days between ${mode === "what_if" ? "assumed" : overrides.length ? "effective" : "source"} milestones`}
                      </span>
                    </span>
                    <strong className="whitespace-nowrap text-sm tabular-nums">
                      {p.distanceMiles === null
                        ? "Unknown"
                        : `${milesToUnit(p.distanceMiles, unit).toFixed(2)} ${unit}`}
                    </strong>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-stone-400"
                    />
                  </Button>
                </li>
              ))}
            </ol>
          </div>
        )}
        {results && (
          <details className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
            <summary className="cursor-pointer">Search diagnostics</summary>
            <p className="mt-2 tabular-nums">
              {results.diagnostics.candidateCount.toLocaleString()} candidates ·{" "}
              {results.diagnostics.exactDistanceCount.toLocaleString()} exact
              distances · {results.diagnostics.elapsedMs.toFixed(1)} ms query ·{" "}
              {results.diagnostics.buildMs.toFixed(1)} ms dataset preparation ·{" "}
              {(results.diagnostics.indexBytes / 1048576).toFixed(2)} MiB index
              · {results.uncertainDateCount.toLocaleString()} imprecise dates in
              view. Results bounded to 200; displayed export is bounded to those
              rows. Dense output can be quadratic.
            </p>
          </details>
        )}
      </section>
      {selectedRecords.length > 0 &&
        (mode === "what_if" || overrides.length > 0) && (
          <section className="border-t border-stone-200 bg-emerald-50 px-5 py-4">
            <h2 className="text-sm font-semibold">
              Applied layers · original evidence below
            </h2>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {selectedRecords.map((p) => (
                <div key={p.id} className="text-xs leading-relaxed">
                  <strong>{p.shortName}</strong>
                  <p>
                    Source:{" "}
                    {formatDate(originals.get(p.id)?.originalDate ?? null)} ·
                    Effective corrected date: {formatDate(p.originalDate)}
                    {mode === "what_if"
                      ? ` · Assumption: ${activeShifts[p.company] ?? 0} years → ${shiftDateBounds(projectDateBounds(p), activeShifts[p.company] ?? 0)?.label ?? "unknown"}`
                      : ""}
                  </p>
                  {overrides
                    .filter((o) => o.projectId === p.id)
                    .map((o, i) => (
                      <p key={i}>Correction reason: {o.reason}</p>
                    ))}
                </div>
              ))}
            </div>
          </section>
        )}
      <EvidencePanel
        comparison={originalSelection}
        project={project ? (originals.get(project.id) ?? null) : null}
        onFocus={focus}
      />
    </div>
  );
}
