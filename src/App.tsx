import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import {
  ArrowDownToLine,
  ChevronRight,
  Layers,
  MapPin,
  Network,
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
import { DataTools } from "./components/DataTools";
import { TimelineControl } from "./components/TimelineControl";

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
    setError(null);
    void createDemoDataset(PROJECTS, metadata.workbookSha256)
      .then(accept)
      .catch((e) => setError(String(e)));
  };
  useEffect(restore, []);
  useEffect(() => {
    if (!acceptance) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById("dataset-title")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [acceptance]);
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
                Find nearby projects. Compare timing. Review evidence.
              </p>
            </div>
          </div>
        </div>
      </header>
      {error && (
        <p role="alert" className="p-5">
          {error}
          <Button onClick={restore} className={cn(control, "ml-3")}>
            Try again
          </Button>
        </p>
      )}
      {dataset ? (
        <DatasetWorkspace
          key={`${dataset.id}:${acceptance}`}
          source={dataset}
          onAccept={accept}
          onRestore={restore}
        />
      ) : !error ? (
        <p role="status" className="p-8">
          Preparing the supplied examples…
        </p>
      ) : null}
      <footer className="mx-auto flex max-w-screen-2xl flex-wrap justify-between gap-3 px-5 py-6 text-xs text-stone-500">
        <span>
          Proximity and planned dates do not establish simultaneous construction
          or savings.
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
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const [overrides, setOverrides] = useState<ProjectOverride[]>([]);
  const [effective, setEffective] = useState(source);
  const [applying, setApplying] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
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
        <div className="min-w-0">
          <h2
            id="dataset-title"
            tabIndex={-1}
            className="break-words text-base font-semibold"
          >
            {source.name}
          </h2>
          <p className="mt-1 text-sm tabular-nums text-stone-600">
            {source.projects.length.toLocaleString()} projects ·{" "}
            {source.kind === "demo" ? "Historical sample" : "Uploaded dataset"}
            {overrides.length > 0 &&
              ` · ${overrides.length} corrections applied`}
          </p>
        </div>
        <DataTools
          triggerRef={toolsTrigger}
          source={source}
          overrides={overrides}
          onChange={setOverrides}
          selectedProjectId={selectedProjectId}
          onAccept={onAccept}
          onRestore={onRestore}
        />
      </section>
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
        onNeedData={() => toolsTrigger.current?.click()}
      />
    </main>
  );
}

function Workspace({
  source,
  dataset,
  overrides,
  onProjectFocus,
  onNeedData,
}: {
  source: RuntimeDataset;
  dataset: RuntimeDataset;
  overrides: ProjectOverride[];
  onProjectFocus: (id: string | null) => void;
  onNeedData: () => void;
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
      exhaustive && mode === "planned" && filtered.length <= 20
        ? compareProjects(filtered)
        : null,
    [exhaustive, mode, filtered],
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
    document.getElementById("project-map")?.focus();
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
  const [radiusDraft, setRadiusDraft] = useState<string | null>(null);
  const radiusValue =
    radiusDraft ?? String(Number(milesToUnit(thresholdMiles, unit).toFixed(4)));
  const radiusInvalid =
    !radiusValue.trim() ||
    !Number.isFinite(Number(radiusValue)) ||
    milesFromUnit(Number(radiusValue), unit) < 0.1 ||
    milesFromUnit(Number(radiusValue), unit) > 500;
  const resetFilters = () => {
    setCompanies(availableCompanies);
    setCompanySearch("");
    setChosenRange(null);
    setIncludeUndated(true);
    setThresholdMiles(25);
    setRadiusDraft(null);
    setWindowMonths(null);
    setExhaustive(false);
  };
  const exportPairs = (rows: Comparison[], scope: string) =>
    download(
      "GridLock-comparisons.csv",
      comparisonCsv(
        rows,
        dataset,
        source,
        mode,
        activeShifts,
        allPairs ? true : !!results?.complete,
        scope,
      ),
    );
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <section
        aria-label="Project filters"
        className="grid gap-5 border-b border-stone-200 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5"
      >
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold">Utilities</legend>
          {availableCompanies.length > 12 && (
            <label className="mt-2 block text-sm">
              Find utility
              <input
                type="search"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className={cn(field, "mt-1")}
              />
            </label>
          )}
          <div className="mt-2 flex max-h-28 flex-wrap gap-x-5 gap-y-2 overflow-auto">
            {visibleCompanies.map((c) => (
              <label
                key={c}
                className="flex min-w-0 items-center gap-2 text-sm"
              >
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
                <span className="break-words">{c}</span>
              </label>
            ))}
          </div>
          {availableCompanies.length > 100 && (
            <p className="mt-2 text-xs tabular-nums text-stone-600">
              First 100 matches shown. Search for others. {companies.length}{" "}
              selected.
            </p>
          )}
          <div className="mt-2 flex gap-4 text-xs">
            <Button
              className="py-1 text-emerald-800 underline"
              onClick={() => setCompanies(availableCompanies)}
            >
              Select all utilities
            </Button>
            <Button
              className="py-1 text-stone-600 underline"
              onClick={() => setCompanies([])}
            >
              Clear utilities
            </Button>
          </div>
        </fieldset>
        <div>
          <label htmlFor="radius" className="text-sm font-semibold">
            Distance between projects
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="radius"
              type="number"
              step="any"
              min={milesToUnit(0.1, unit)}
              max={milesToUnit(500, unit)}
              value={radiusValue}
              aria-invalid={radiusInvalid}
              aria-describedby="radius-help"
              onChange={(e) => {
                const text = e.target.value;
                setRadiusDraft(text);
                const n = Number(text);
                if (
                  text.trim() &&
                  Number.isFinite(n) &&
                  milesFromUnit(n, unit) >= 0.1 &&
                  milesFromUnit(n, unit) <= 500
                )
                  setThresholdMiles(milesFromUnit(n, unit));
              }}
              className={field}
            />
            <select
              aria-label="Distance units"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value as "mi" | "km");
                setRadiusDraft(null);
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <option value="mi">mi</option>
              <option value="km">km</option>
            </select>
          </div>
          <p
            id="radius-help"
            className="mt-2 text-xs tabular-nums text-stone-600"
            role={radiusInvalid ? "alert" : undefined}
          >
            {radiusInvalid
              ? `Enter ${milesToUnit(0.1, unit).toFixed(2)}–${milesToUnit(500, unit).toFixed(2)} ${unit}. Results still use ${milesToUnit(thresholdMiles, unit).toFixed(2)} ${unit}.`
              : `Strictly under ${milesToUnit(thresholdMiles, unit).toFixed(2)} ${unit} · approximate centers.`}
          </p>
        </div>
        <details className="min-w-0 sm:col-span-2 lg:col-span-1">
          <summary className="cursor-pointer text-sm font-semibold">
            More filters & what-if
            {mode === "what_if" && (
              <span className="ml-2 font-normal text-emerald-800">Active</span>
            )}
          </summary>
          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeUndated}
                onChange={(e) => setIncludeUndated(e.target.checked)}
                className="mt-0.5 size-4 accent-emerald-700"
              />
              Include unknown milestone dates
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={mode === "what_if"}
                onChange={(e) => {
                  setMode(e.target.checked ? "what_if" : "planned");
                  setExhaustive(false);
                }}
                className="mt-0.5 size-4 accent-emerald-700"
              />
              Try schedule assumptions
            </label>
            {mode === "what_if" && (
              <section
                aria-label="Schedule assumptions"
                className="space-y-3 border-l-2 border-emerald-200 pl-3"
              >
                <p className="text-xs text-stone-600">
                  Shift current milestones by whole years. Originals stay
                  unchanged.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {visibleCompanies.map((c) => (
                    <label key={c} className="text-xs">
                      {c} year shift
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
                <label className="block text-xs">
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
                <p className="text-xs text-stone-600">
                  A gap limit needs two exact dates. It does not establish
                  construction overlap.
                </p>
                <Button
                  className="text-xs font-medium text-emerald-800 underline"
                  onClick={() => {
                    setShifts({});
                    setWindowMonths(null);
                    setChosenRange(null);
                  }}
                >
                  Reset assumptions
                </Button>
              </section>
            )}
            {dataset.projects.length <= 20 && mode === "planned" && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exhaustive}
                  onChange={(e) => setExhaustive(e.target.checked)}
                  className="mt-0.5 size-4 accent-emerald-700"
                />
                Include comparisons outside the distance limit
              </label>
            )}
            <Button
              className="text-xs font-medium text-emerald-800 underline"
              onClick={resetFilters}
            >
              Reset filters
            </Button>
          </div>
        </details>
      </section>
      <TimelineControl
        distribution={distribution}
        range={range}
        onChange={setChosenRange}
        assumed={mode === "what_if"}
      />
      {mode === "what_if" && (
        <p
          role="status"
          className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-900"
        >
          What-if assumptions are active. Dates below are assumed; original
          dates remain in the evidence.
        </p>
      )}
      <div className="grid lg:grid-cols-5">
        <section
          id="project-map"
          tabIndex={-1}
          aria-label="Project map"
          className="min-w-0 lg:col-span-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
            <p role="status" className="text-sm tabular-nums text-stone-600">
              {search.status === "loading"
                ? "Updating projects…"
                : `${filtered.length.toLocaleString()} of ${sourceCount.toLocaleString()} projects in view`}
            </p>
            <div className="flex items-center gap-2">
              <div
                role="group"
                aria-label="Map display"
                className="flex rounded-lg bg-stone-100 p-1"
              >
                {(
                  [
                    ["points", "Map"],
                    ["heat", "Heat"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    aria-pressed={mapMode === value}
                    onClick={() => setMapMode(value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium",
                      mapMode === value
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-600",
                    )}
                  >
                    {value === "points" ? (
                      <MapPin size={13} className="mr-1 inline" />
                    ) : (
                      <Layers size={13} className="mr-1 inline" />
                    )}
                    {label}
                  </Button>
                ))}
              </div>
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
          <a
            className="block px-4 py-2 text-xs text-emerald-800 underline"
            href="#rank-title"
          >
            Skip map to comparisons
          </a>
          <div className="h-80 sm:h-96 lg:h-[28rem]">
            <Suspense
              fallback={
                <div
                  role="status"
                  className="flex h-full items-center justify-center bg-stone-100 text-sm text-stone-600"
                >
                  Loading map…
                </div>
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
          <p className="border-t border-stone-200 px-4 py-2 text-xs text-stone-600">
            Approximate project locations. A connecting line shows separation,
            not a shared route.
          </p>
        </section>
        <section
          aria-labelledby="rank-title"
          className="flex min-w-0 flex-col border-t border-stone-200 lg:col-span-2 lg:border-t-0 lg:border-l"
        >
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="rank-title"
                tabIndex={-1}
                className="text-base font-semibold"
              >
                {allPairs ? "All comparisons" : "Nearby comparisons"}
              </h2>
              <Button
                disabled={
                  !pairs.length || search.status === "loading" || radiusInvalid
                }
                onClick={() =>
                  exportPairs(
                    pairs,
                    allPairs
                      ? "all selected dataset pairs"
                      : "displayed bounded nearby results",
                  )
                }
                className={cn(control, "text-xs tabular-nums")}
              >
                <ArrowDownToLine size={13} className="mr-1 inline" />
                Export {pairs.length} pairs
              </Button>
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {allPairs
                ? `${pairs.length} pairs, including distant or unknown locations.`
                : results
                  ? `${results.complete ? "" : "At least "}${results.matchedCount.toLocaleString()} matches · ${results.complete ? "nearest first" : "partial search"}`
                  : "Find projects from different utilities."}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              Select a pair to compare its timing and evidence below.
            </p>
            {results &&
              !allPairs &&
              (!results.complete || results.matchedCount > pairs.length) && (
                <p
                  role="status"
                  className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs tabular-nums text-stone-700"
                >
                  {results.complete
                    ? `Showing the closest ${pairs.length} of ${results.matchedCount.toLocaleString()} matches. Export includes these rows only.`
                    : `Partial results: ${pairs.length} best pairs visited, not necessarily the closest overall. Narrow the distance, utilities or dates. Export includes these rows only.`}
                </p>
              )}
          </div>
          {search.error ? (
            <div className="px-4 pb-5">
              <p role="alert" className="text-sm text-stone-700">
                {search.error}
              </p>
              <Button className={cn(control, "mt-3")} onClick={search.retry}>
                Retry search
              </Button>
            </div>
          ) : search.status === "loading" ? (
            <div className="px-4 pb-5" role="status">
              <p className="text-sm text-stone-600">
                Finding nearby comparisons…
              </p>
              <div aria-hidden="true" className="mt-4 space-y-4">
                {[0, 1, 2].map((n) => (
                  <div
                    key={n}
                    className="space-y-2 border-t border-stone-100 pt-3"
                  >
                    <div className="h-3 w-3/4 rounded bg-stone-100" />
                    <div className="h-3 w-1/2 rounded bg-stone-100" />
                  </div>
                ))}
              </div>
              <Button
                className={cn(control, "mt-4 text-xs")}
                onClick={search.cancel}
              >
                Cancel search
              </Button>
            </div>
          ) : pairs.length === 0 ? (
            <div className="px-4 pb-6">
              <p className="text-sm text-stone-600">
                {availableCompanies.length < 2
                  ? "This dataset needs records from at least two utilities."
                  : companies.length < 2
                    ? "Select at least two utilities to compare their projects."
                    : "No pairs match these filters."}
              </p>
              <Button
                className={cn(control, "mt-3")}
                onClick={
                  availableCompanies.length < 2
                    ? onNeedData
                    : companies.length < 2
                      ? () => setCompanies(availableCompanies)
                      : resetFilters
                }
              >
                {availableCompanies.length < 2
                  ? "Open data tools"
                  : companies.length < 2
                    ? "Select all utilities"
                    : "Reset filters"}
              </Button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border-t border-stone-100 lg:h-96 lg:max-h-none lg:flex-1 lg:basis-0">
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
                        "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50",
                        selectedId === p.id && "bg-emerald-50",
                      )}
                    >
                      <span className="mt-0.5 w-4 shrink-0 text-xs tabular-nums text-stone-500">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {p.a.shortName}
                          <span className="mx-1 font-normal text-stone-500">
                            ↔
                          </span>
                          {p.b.shortName}
                        </span>
                        <span className="mt-1 block text-xs text-stone-600">
                          {p.a.company} / {p.b.company}
                        </span>
                        <span className="mt-1 block text-xs tabular-nums text-stone-600">
                          {p.gapDays === null
                            ? "Timing gap unknown"
                            : `${p.gapDays.toLocaleString()} days between ${mode === "what_if" ? "assumed" : overrides.length ? "current" : "source"} milestones`}
                        </span>
                      </span>
                      <strong className="mt-0.5 shrink-0 whitespace-nowrap text-sm tabular-nums">
                        {p.distanceMiles === null
                          ? "Unknown"
                          : `${milesToUnit(p.distanceMiles, unit).toFixed(2)} ${unit}`}
                      </strong>
                      <ChevronRight
                        size={15}
                        className="mt-0.5 shrink-0 text-stone-500"
                      />
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(selected || project) && (
            <div className="border-t border-stone-200 bg-emerald-50 px-4 py-3">
              <a
                href="#timing-evidence"
                className="text-sm font-medium text-emerald-900 underline"
              >
                View selected timing and evidence ↓
              </a>
            </div>
          )}
        </section>
      </div>
      {selectedRecords.length > 0 && (
        <section
          id="timing-evidence"
          tabIndex={-1}
          aria-label="Selected timing and evidence"
          className="scroll-mt-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3">
            <p className="text-sm font-medium">
              {selected ? "Selected comparison" : "Selected project"}
            </p>
            {selected && (
              <Button
                className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-40"
                disabled={radiusInvalid}
                onClick={() =>
                  exportPairs(
                    [selected],
                    "selected comparison from displayed results",
                  )
                }
              >
                <ArrowDownToLine size={14} className="mr-2 inline" />
                Export selected pair
              </Button>
            )}
          </div>
          {(mode === "what_if" ||
            selectedRecords.some((p) =>
              overrides.some((o) => o.projectId === p.id),
            )) && (
            <div className="border-t border-stone-200 bg-emerald-50 px-5 py-4">
              <h2 className="text-sm font-semibold">
                Corrections and assumptions
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {selectedRecords.map((p) => (
                  <div key={p.id} className="text-sm">
                    <strong className="font-medium">{p.shortName}</strong>
                    <p className="mt-1 tabular-nums text-stone-700">
                      Original:{" "}
                      {formatDate(originals.get(p.id)?.originalDate ?? null)}
                      <br />
                      Current: {formatDate(p.originalDate)} ·{" "}
                      {p.dateMeaning.replaceAll("_", " ")}
                      {mode === "what_if" && (
                        <>
                          <br />
                          Assumed ({activeShifts[p.company] ?? 0} years):{" "}
                          {shiftDateBounds(
                            projectDateBounds(p),
                            activeShifts[p.company] ?? 0,
                          )?.label ?? "unknown"}
                        </>
                      )}
                    </p>
                    {overrides
                      .filter((o) => o.projectId === p.id)
                      .map((o, i) => (
                        <p key={i} className="mt-1 text-xs text-stone-600">
                          Correction reason: {o.reason}
                        </p>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <EvidencePanel
            comparison={originalSelection}
            project={project ? (originals.get(project.id) ?? null) : null}
            onFocus={focus}
          />
        </section>
      )}
    </div>
  );
}
