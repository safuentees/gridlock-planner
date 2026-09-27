import { useEffect, useMemo, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Input } from "@base-ui/react/input";
import { Slider } from "@base-ui/react/slider";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  FileText,
  FlaskConical,
  Layers,
  MapPin,
  Network,
  RotateCcw,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import projectData from "./data/projects.json";
import type { Company, Comparison, Project, Scenario } from "./types";
import {
  compareProjects,
  filterProjects,
  isNearby,
  milesToUnit,
  milesFromUnit,
  buildScenarioSummary,
} from "./lib/comparisons";
import { cn } from "./lib/cn";
import { ProjectMap } from "./components/ProjectMap";
import { formatDate } from "./components/EvidencePanel";
import { EvidenceWorkspace } from "./components/EvidenceWorkspace";
import { DataReadiness } from "./components/DataReadiness";

const PROJECTS = projectData as Project[];
const companies: { id: Company; label: string; short: string }[] = [
  { id: "DESC", label: "Dominion Energy SC", short: "Dominion" },
  { id: "GPC", label: "Georgia Power", short: "Georgia Power" },
];
const control =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40";
const tab =
  "rounded-md px-3 py-2 text-sm font-medium text-stone-500 data-[active]:bg-white data-[active]:text-stone-900 data-[active]:shadow-sm";
const numberInput =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm tabular-nums";

function IntegerControl({
  id,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const n = Number(draft);
  const valid =
    draft.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
  return (
    <>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={draft}
        aria-invalid={!valid}
        aria-describedby={!valid ? `${id}-error` : undefined}
        onValueChange={(v) => {
          setDraft(v);
          const next = Number(v);
          if (
            v.trim() !== "" &&
            Number.isInteger(next) &&
            next >= min &&
            next <= max
          )
            onChange(next);
        }}
        onBlur={() => setDraft(String(value))}
        className={numberInput}
      />
      {!valid && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          Enter a whole number from {min} to {max}. Last valid setting still
          applies.
        </p>
      )}
    </>
  );
}

function DownloadComparisons({
  pairs,
  threshold,
}: {
  pairs: Comparison[];
  threshold: number;
}) {
  function download() {
    const head = [
      "project_a",
      "project_b",
      "distance_miles",
      "milestone_gap_days",
      "threshold_miles",
      "within_threshold",
      "construction_overlap",
    ];
    const rows = pairs.map((p) => [
      p.a.id,
      p.b.id,
      p.distanceMiles ?? "",
      p.gapDays ?? "",
      threshold,
      isNearby(p, threshold),
      "unknown",
    ]);
    const blob = new Blob(
      [[head, ...rows].map((r) => r.join(",")).join("\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gridlock-comparisons.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Button
      onClick={download}
      className={cn(control, "flex items-center gap-2 text-xs")}
    >
      <ArrowDownToLine size={14} />
      Export comparisons
    </Button>
  );
}

function Metric({
  value,
  label,
  note,
}: {
  value: number | string;
  label: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-3xl font-semibold tabular-nums text-stone-900">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-stone-500">{label}</p>
      {note && <p className="mt-1 text-xs text-stone-400">{note}</p>}
    </div>
  );
}

function ThresholdControl({
  miles,
  unit,
  onMiles,
  onUnit,
}: {
  miles: number;
  unit: "mi" | "km";
  onMiles: (x: number) => void;
  onUnit: (x: "mi" | "km") => void;
}) {
  const shown = milesToUnit(miles, unit);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label
          id="threshold-label"
          className="text-xs font-semibold text-stone-600"
        >
          Nearby distance
        </label>
        <div className="flex rounded-md bg-stone-100 p-0.5">
          {(["mi", "km"] as const).map((u) => (
            <Button
              key={u}
              aria-pressed={u === unit}
              onClick={() => onUnit(u)}
              className={cn(
                "rounded px-2 py-1 text-xs",
                unit === u
                  ? "bg-white font-semibold text-stone-800 shadow-sm"
                  : "text-stone-500",
              )}
            >
              {u}
            </Button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-3xl font-semibold tabular-nums">
        {Number(shown.toFixed(1))}
        <span className="ml-1.5 text-base font-normal text-stone-500">
          {unit === "mi" ? "miles" : "kilometers"}
        </span>
      </p>
      <Slider.Root
        value={shown}
        min={0}
        max={unit === "mi" ? 250 : 402.336}
        step={unit === "mi" ? 1 : 0.5}
        onValueChange={(value) => onMiles(milesFromUnit(Number(value), unit))}
      >
        <Slider.Control className="flex h-5 w-full cursor-pointer items-center">
          <Slider.Track className="h-1.5 w-full rounded-full bg-stone-200">
            <Slider.Indicator className="rounded-full bg-blue-800" />
            <Slider.Thumb
              aria-labelledby="threshold-label"
              className="size-4 rounded-full border-2 border-blue-800 bg-white shadow-sm"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="mt-3 flex gap-2">
        {[10, 25, 50].map((v) => (
          <Button
            key={v}
            onClick={() => onMiles(milesFromUnit(v, unit))}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs tabular-nums",
              Math.abs(shown - v) < 0.001
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-stone-200 text-stone-500",
            )}
          >
            {v} {unit}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        Straight-line distance between approximate representative points.
        Includes distances strictly below this threshold.
      </p>
    </div>
  );
}

function PairList({
  pairs,
  selected,
  onSelect,
  unit,
  threshold,
  allCount,
  reset,
  showAll,
  onShowAll,
}: {
  pairs: Comparison[];
  selected: Comparison | null;
  onSelect: (p: Comparison) => void;
  unit: "mi" | "km";
  threshold: number;
  allCount: number;
  reset: () => void;
  showAll: boolean;
  onShowAll: (b: boolean) => void;
}) {
  return (
    <div className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white lg:max-h-[38rem]">
      <div className="border-b border-stone-100 p-4">
        <h2 className="text-base font-semibold">Cross-company comparisons</h2>
        <p className="mt-1 text-xs text-stone-500">
          Ranked by distance, nearest first
        </p>
        <Tabs.Root
          value={showAll ? "all" : "nearby"}
          onValueChange={(v) => onShowAll(v === "all")}
          className="mt-3"
        >
          <Tabs.List className="flex rounded-lg bg-stone-100 p-1">
            <Tabs.Tab value="nearby" className={cn(tab, "flex-1 text-xs")}>
              Nearby
            </Tabs.Tab>
            <Tabs.Tab value="all" className={cn(tab, "flex-1 text-xs")}>
              All {allCount} pairs
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {pairs.length === 0 ? (
          <div className="p-6">
            <Target className="mb-3 text-stone-400" size={24} />
            <h3 className="font-medium">No comparisons in this view</h3>
            <p className="mt-2 text-sm text-stone-500">
              Nearby comparisons need two companies and records inside your date
              and distance filters.
            </p>
            <Button onClick={reset} className={cn(control, "mt-4")}>
              Reset filters
            </Button>
          </div>
        ) : (
          pairs.map((pair, index) => (
            <Button
              key={pair.id}
              onClick={() => onSelect(pair)}
              aria-pressed={selected?.id === pair.id}
              className={cn(
                "flex w-full items-start gap-3 border-b border-stone-100 p-4 text-left last:border-b-0 hover:bg-stone-50",
                selected?.id === pair.id && "bg-blue-50/70 hover:bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                  selected?.id === pair.id
                    ? "bg-blue-800 text-white"
                    : "bg-stone-100 text-stone-500",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-stone-800">
                  {pair.a.shortName}
                </span>
                <span className="my-1 block text-xs text-stone-400">with</span>
                <span className="block text-xs font-semibold text-stone-800">
                  {pair.b.shortName}
                </span>
                <span className="mt-2 block text-xs text-stone-500">
                  {pair.gapDays === null
                    ? "Milestone gap unknown"
                    : `${pair.gapDays.toLocaleString()} days between milestones`}
                </span>
                {!isNearby(pair, threshold) && (
                  <span className="mt-1 block text-xs text-stone-400">
                    {pair.distanceMiles === null
                      ? "Location incomplete"
                      : "Outside distance threshold"}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums">
                  {pair.distanceMiles === null
                    ? "—"
                    : milesToUnit(pair.distanceMiles, unit).toFixed(2)}
                </span>
                <span className="text-xs text-stone-500">{unit}</span>
              </span>
            </Button>
          ))
        )}
      </div>
      <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
        Proximity candidates, not confirmed coordination opportunities.
      </p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<"explore" | "scenarios" | "methods">(
    "explore",
  );
  const [threshold, setThreshold] = useState(25);
  const [unit, setUnit] = useState<"mi" | "km">("mi");
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([
    "DESC",
    "GPC",
  ]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeUndated, setIncludeUndated] = useState(true);
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [fitAll, setFitAll] = useState(false);
  function focusMap(all = false) {
    setFitAll(all);
    setFitRequest((x) => x + 1);
  }
  const [scenario, setScenario] = useState<Scenario>({
    targetYear: 2028,
    shifts: { DESC: 3, GPC: 1 },
    windowMonths: 12,
  });
  const invalidRange = Boolean(from && to && from > to);
  const filtered = useMemo(
    () =>
      invalidRange
        ? []
        : filterProjects(PROJECTS, {
            companies: selectedCompanies,
            from,
            to,
            includeUndated,
          }),
    [selectedCompanies, from, to, includeUndated, invalidRange],
  );
  const pairs = useMemo(() => compareProjects(filtered), [filtered]);
  const nearby = useMemo(
    () => pairs.filter((p) => isNearby(p, threshold)),
    [pairs, threshold],
  );
  const shownPairs = showAll ? pairs : nearby;
  const selected = projectId
    ? null
    : (shownPairs.find((p) => p.id === selectedId) ?? shownPairs[0] ?? null);
  const scenarioResult = useMemo(
    () => buildScenarioSummary(PROJECTS, scenario, threshold),
    [scenario, threshold],
  );
  const baseline = useMemo(
    () =>
      buildScenarioSummary(
        PROJECTS,
        { ...scenario, shifts: { DESC: 0, GPC: 0 } },
        threshold,
      ),
    [scenario.targetYear, scenario.windowMonths, threshold],
  );
  function reset() {
    setThreshold(25);
    setUnit("mi");
    setSelectedCompanies(["DESC", "GPC"]);
    setFrom("");
    setTo("");
    setIncludeUndated(true);
    setShowAll(false);
    setSelectedId(null);
    setProjectId(null);
    focusMap(true);
  }
  function pickPair(p: Comparison) {
    setSelectedId(p.id);
    setProjectId(null);
  }
  function inspectScenario(pair: Comparison) {
    reset();
    setShowAll(true);
    setSelectedId(pair.id);
    focusMap();
    setPage("explore");
  }
  function openCase() {
    reset();
    const pair = compareProjects(PROJECTS).find(
      (p) =>
        [p.a.id, p.b.id].includes("DESC_3") &&
        [p.a.id, p.b.id].includes("GPC_3"),
    );
    if (pair) setSelectedId(pair.id);
    focusMap();
    setPage("explore");
  }

  return (
    <div className="gridlock-app min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4"
      >
        Skip to main content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-800">
            <Network size={21} strokeWidth={1.8} />
          </div>
          <span className="text-xl font-semibold">GridLock</span>
          <span className="hidden border-l border-stone-200 pl-4 text-sm text-stone-400 sm:inline">
            Planning explorer
          </span>
        </div>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {(
            [
              { id: "explore", label: "Explore", icon: Compass },
              { id: "scenarios", label: "Schedule shifts", icon: FlaskConical },
              { id: "methods", label: "Data & evidence", icon: FileText },
            ] as const
          ).map((item) => (
            <Button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-current={page === item.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                page === item.id
                  ? "bg-blue-50 text-blue-800"
                  : "text-stone-500 hover:bg-stone-50",
              )}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </Button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 text-xs text-stone-400 xl:flex">
          <span className="size-1.5 rounded-full bg-stone-400" />
          ShellHacks 2026 · Proof of concept
        </div>
      </header>

      {page === "explore" && (
        <div className="flex flex-col lg:flex-row">
          <aside
            aria-label="Explore filters"
            className="shrink-0 border-b border-stone-200 bg-white p-5 lg:w-72 lg:border-r lg:border-b-0 lg:p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal size={16} />
                Explore filters
              </h2>
              <Button
                onClick={reset}
                aria-label="Reset filters"
                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <RotateCcw size={15} />
              </Button>
            </div>
            <ThresholdControl
              miles={threshold}
              unit={unit}
              onMiles={setThreshold}
              onUnit={setUnit}
            />
            <fieldset className="mt-7 border-t border-stone-100 pt-5">
              <legend className="float-left mb-4 w-full text-xs font-semibold text-stone-600">
                Companies
              </legend>
              <div className="clear-both space-y-3">
                {companies.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2.5 text-sm"
                  >
                    <Checkbox.Root
                      checked={selectedCompanies.includes(c.id)}
                      onCheckedChange={(checked) =>
                        setSelectedCompanies((x) =>
                          checked
                            ? [...new Set([...x, c.id])]
                            : x.filter((v) => v !== c.id),
                        )
                      }
                      className="flex size-4 items-center justify-center rounded border border-stone-300 bg-white data-[checked]:border-blue-800 data-[checked]:bg-blue-50"
                    >
                      <Checkbox.Indicator>
                        <Check size={12} />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span>{c.label}</span>
                    <span
                      className={cn(
                        "ml-auto size-2.5",
                        c.id === "DESC"
                          ? "rounded-full bg-blue-800"
                          : "rounded-sm bg-stone-600",
                      )}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-7 border-t border-stone-100 pt-5">
              <h3 className="mb-3 text-xs font-semibold text-stone-600">
                Original milestone dates
              </h3>
              <label
                className="mb-1 block text-xs text-stone-500"
                htmlFor="date-from"
              >
                From
              </label>
              <Input
                id="date-from"
                type="date"
                value={from}
                onValueChange={setFrom}
                className={cn(numberInput, "date-input mb-3")}
              />
              <label
                className="mb-1 block text-xs text-stone-500"
                htmlFor="date-to"
              >
                Through
              </label>
              <Input
                id="date-to"
                type="date"
                value={to}
                onValueChange={setTo}
                className={cn(numberInput, "date-input")}
              />
              {invalidRange && (
                <p role="alert" className="mt-2 text-xs text-red-700">
                  The start date must be on or before the end date.
                </p>
              )}
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-stone-500">
                <Checkbox.Root
                  checked={includeUndated}
                  onCheckedChange={setIncludeUndated}
                  className="flex size-4 items-center justify-center rounded border border-stone-300 data-[checked]:border-blue-800 data-[checked]:bg-blue-50"
                >
                  <Checkbox.Indicator>
                    <Check size={12} />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                Include records without a date
              </label>
              <p className="mt-3 text-xs leading-relaxed text-stone-400">
                Planned in-service or need dates. These are not verified
                construction windows.
              </p>
            </div>
            <div className="mt-7 border-t border-stone-100 pt-5">
              <p className="mb-2 text-xs font-semibold text-stone-600">
                Start with a case
              </p>
              <Button
                onClick={openCase}
                aria-label="Inspect Jasper–Okatie and Goshen–Georgia Pacific case"
                className="flex w-full items-start justify-between gap-2 text-left text-sm font-medium text-blue-800"
              >
                <span>
                  Jasper–Okatie
                  <br />
                  <span className="text-xs font-normal text-stone-500">
                    with Goshen–McIntosh
                  </span>
                </span>
                <ArrowRight size={16} className="mt-1 shrink-0" />
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-stone-400">
                The reviewed Goshen work section ends at Georgia Pacific.
                Inspect the scope notes.
              </p>
            </div>
          </aside>
          <main id="main-content" className="min-w-0 flex-1">
            <div className="p-5 lg:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-blue-800">
                    GEORGIA & SOUTH CAROLINA
                  </p>
                  <h1 className="text-3xl font-semibold">
                    Explore nearby grid work
                  </h1>
                  <p className="mt-2 text-sm text-stone-500">
                    Find proximity candidates, then inspect what the sources
                    actually say.
                  </p>
                </div>
                <DownloadComparisons pairs={pairs} threshold={threshold} />
              </div>
              <div className="mb-5 flex flex-wrap items-center gap-7 border-y border-stone-200 py-4 sm:gap-12">
                <Metric
                  value={filtered.length}
                  label="Planning records shown"
                />
                <Metric
                  value={pairs.length}
                  label="Cross-company comparisons"
                />
                <Metric
                  value={nearby.length}
                  label={`Within ${Number(milesToUnit(threshold, unit).toFixed(1))} ${unit}`}
                />
                <p className="max-w-xs text-xs leading-relaxed text-stone-500">
                  Supplied historical planning records.
                  <br />
                  Original values preserved; research notes available on
                  inspection.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white xl:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
                    <div className="flex rounded-lg bg-stone-100 p-1">
                      {(["points", "heat"] as const).map((mode) => (
                        <Button
                          key={mode}
                          aria-pressed={mapMode === mode}
                          onClick={() => setMapMode(mode)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                            mapMode === mode
                              ? "bg-white text-stone-900 shadow-sm"
                              : "text-stone-500",
                          )}
                        >
                          {mode === "points" ? (
                            <MapPin size={13} />
                          ) : (
                            <Layers size={13} />
                          )}
                          {mode === "points" ? "Project points" : "Heat map"}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() => focusMap()}
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-50"
                    >
                      <Target size={13} />
                      Focus selection
                    </Button>
                    <Button
                      onClick={() => focusMap(true)}
                      className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-50"
                    >
                      Show all locations
                    </Button>
                  </div>
                  <div className="h-96 sm:h-[30rem]">
                    <ProjectMap
                      projects={filtered}
                      selected={selected}
                      selectedProjectId={projectId}
                      fitAll={fitAll}
                      mode={mapMode}
                      fitRequest={fitRequest}
                      onProjectSelect={setProjectId}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <i className="size-2 rounded-full bg-blue-800" />
                      Dominion
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="size-2 rounded-sm bg-stone-600" />
                      Georgia Power
                    </span>
                    <span className="ml-auto">
                      Dashed line = measured separation, not a route
                    </span>
                  </div>
                </section>
                <PairList
                  pairs={shownPairs}
                  selected={selected}
                  onSelect={pickPair}
                  unit={unit}
                  threshold={threshold}
                  allCount={pairs.length}
                  reset={reset}
                  showAll={showAll}
                  onShowAll={setShowAll}
                />
              </div>
            </div>
          </main>
        </div>
      )}

      {page === "scenarios" && (
        <main id="main-content" className="mx-auto max-w-7xl p-5 lg:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-blue-800">
                EXPLICIT ASSUMPTIONS
              </p>
              <h1 className="text-3xl font-semibold">
                Changes in schedule
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
                Shift the supplied milestones and explore a target year. This is
                a deterministic planning scenario, not a forecast of actual
                construction.
              </p>
            </div>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
              Scenario · no probabilities
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            <section className="space-y-6 rounded-xl border border-stone-200 bg-white p-5">
              <div>
                <label
                  htmlFor="scenario-year"
                  className="mb-2 block text-xs font-semibold text-stone-600"
                >
                  Target calendar year
                </label>
                <IntegerControl
                  id="scenario-year"
                  min={2023}
                  max={2045}
                  value={scenario.targetYear}
                  onChange={(n) =>
                    setScenario((x) => ({ ...x, targetYear: n }))
                  }
                />
              </div>
              {companies.map((c) => (
                <div key={c.id}>
                  <label
                    htmlFor={`shift-${c.id}`}
                    className="mb-2 block text-xs font-semibold text-stone-600"
                  >
                    {c.short} shift in years
                  </label>
                  <IntegerControl
                    id={`shift-${c.id}`}
                    min={-10}
                    max={10}
                    value={scenario.shifts[c.id]}
                    onChange={(n) =>
                      setScenario((x) => ({
                        ...x,
                        shifts: { ...x.shifts, [c.id]: n },
                      }))
                    }
                  />
                  <p className="mt-1 text-xs text-stone-400">
                    {scenario.shifts[c.id] >= 0 ? "+" : ""}
                    {scenario.shifts[c.id]} years from original milestones
                  </p>
                </div>
              ))}
              <div>
                <label
                  htmlFor="scenario-gap"
                  className="mb-2 block text-xs font-semibold text-stone-600"
                >
                  Maximum milestone gap in months
                </label>
                <IntegerControl
                  id="scenario-gap"
                  min={0}
                  max={36}
                  value={scenario.windowMonths}
                  onChange={(n) =>
                    setScenario((x) => ({ ...x, windowMonths: n }))
                  }
                />
              </div>
              <ThresholdControl
                miles={threshold}
                unit={unit}
                onMiles={setThreshold}
                onUnit={setUnit}
              />
              <Button
                onClick={() =>
                  setScenario((x) => ({ ...x, shifts: { DESC: 0, GPC: 0 } }))
                }
                className={cn(control, "w-full text-xs")}
              >
                Remove schedule shifts
              </Button>
            </section>
            <div className="min-w-0 space-y-5 lg:col-span-3">
              <div className="grid grid-cols-2 gap-5 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-4">
                <Metric
                  value={baseline.projects.length}
                  label="Original records in year"
                />
                <Metric
                  value={scenarioResult.projects.length}
                  label="After assumed shifts"
                />
                <Metric
                  value={baseline.sameMilestoneWindow.length}
                  label="Baseline nearby pairs"
                  note="Also within milestone gap"
                />
                <Metric
                  value={scenarioResult.sameMilestoneWindow.length}
                  label="Scenario nearby pairs"
                  note="Also within milestone gap"
                />
              </div>
              <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-100 p-4">
                  <h2 className="font-semibold">
                    Scenario concentrations in {scenario.targetYear}
                  </h2>
                  <span className="text-xs text-stone-500">
                    Original locations retained
                  </span>
                </div>
                <div className="h-96">
                  <ProjectMap
                    projects={scenarioResult.projects}
                    selected={scenarioResult.sameMilestoneWindow[0] ?? null}
                    mode="heat"
                    fitRequest={0}
                    onProjectSelect={(id) => {
                      reset();
                      setProjectId(id);
                      focusMap();
                      setPage("explore");
                    }}
                  />
                </div>
                <p className="px-4 py-3 text-xs text-stone-500">
                  Heat describes the shifted planning records in the selected
                  year, not predicted job locations. Unchanged baseline uses the
                  same year, radius and milestone-gap setting.
                </p>
              </section>
              <section className="rounded-xl border border-stone-200 bg-white p-5">
                <h2 className="mb-3 font-semibold">
                  Comparisons under these assumptions
                </h2>
                {scenarioResult.sameMilestoneWindow.length ? (
                  <div className="divide-y divide-stone-100">
                    {scenarioResult.sameMilestoneWindow.map((pair) => (
                      <div
                        key={pair.id}
                        className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {pair.a.shortName} + {pair.b.shortName}
                          </p>
                          <p className="mt-1 text-xs tabular-nums text-stone-500">
                            {formatDate(pair.a.originalDate)} →{" "}
                            {formatDate(pair.b.originalDate)} · shifted
                            milestones
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums">
                            {milesToUnit(pair.distanceMiles ?? 0, unit).toFixed(
                              2,
                            )}{" "}
                            {unit}{" "}
                            <span className="text-stone-400">
                              / {pair.gapDays} days
                            </span>
                          </p>
                          <Button
                            onClick={() => inspectScenario(pair)}
                            className="mt-2 text-xs font-medium text-blue-800 underline"
                          >
                            View on map
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    No cross-company pair meets this scenario’s year, distance
                    and milestone-gap settings. Adjust a shift or target year to
                    explore another assumption.
                  </p>
                )}
                <p className="mt-3 text-xs text-stone-400">
                  Both shifted milestones must fall in the target year. The
                  later date must be on or before the earlier date plus the
                  selected calendar months, clamped to month end. This does not
                  establish actual construction overlap or savings.
                </p>
              </section>
            </div>
          </div>
          <div className="mt-6">
            <DataReadiness compact />
          </div>
        </main>
      )}

      {page === "methods" && (
        <main
          id="main-content"
          className="evidence-page mx-auto max-w-6xl p-5 lg:p-8"
        >
          <p className="mb-2 text-xs font-semibold text-blue-800">
            TRACEABLE BY DESIGN
          </p>
          <h1 className="text-3xl font-semibold">Data and evidence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">
            The working map starts with ten supplied examples. The full reports
            were also assessed for additional records and whether they support a
            credible forecasting experiment.
          </p>
          <section className="my-6 grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Compass size={18} className="text-blue-800" />
                Explainable proximity
              </h2>
              <p className="text-sm leading-relaxed text-stone-600">
                Average the two named endpoint coordinates, or use the one
                available endpoint. Calculate straight-line haversine distance
                between those approximate representative points. Evaluate every
                distinct cross-company pair and rank by distance.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                The 25-mile default is adjustable. We use strictly below the
                selected threshold and display two decimals while calculating
                with unrounded values. Changing display units preserves the
                physical threshold: 25 miles = 40.2336 km.
              </p>
              <p className="mt-3 text-xs text-stone-500">
                Sperry’s user-supplied clarification permits either center or
                closest-point methods and either cutoff. Center points were
                selected for a reproducible first prototype.
              </p>
            </article>
            <article className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <CircleHelp size={18} className="text-blue-800" />
                What the dates mean
              </h2>
              <p className="text-sm leading-relaxed text-stone-600">
                Dominion examples contain planned in-service dates. The Georgia
                Power examples copy need dates from a December 2024 planning
                snapshot. Neither field establishes actual construction start,
                finish or simultaneous activity.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Original spreadsheet values drive the map, filters and
                comparisons. Later scope corrections, completion statements and
                changed schedules remain separate research notes. Missing values
                stay unknown.
              </p>
              <a
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-800 underline"
                href="/sources/Projects_Overlaps.xlsx"
              >
                <ArrowDownToLine size={14} />
                Download unchanged source workbook
              </a>
            </article>
          </section>
          <DataReadiness />
          <EvidenceWorkspace projects={PROJECTS} />
        </main>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-6 py-4 text-xs text-stone-400">
        <span>GridLock · Public planning records, explicit assumptions.</span>
        <a
          href="https://shellhacks-2026.devpost.com/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 hover:text-stone-700"
        >
          ShellHacks 2026
          <ExternalLink size={12} />
        </a>
      </footer>
    </div>
  );
}
