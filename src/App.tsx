import { useMemo, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Input } from "@base-ui/react/input";
import { Slider } from "@base-ui/react/slider";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ExternalLink,
  Network,
  Target,
} from "lucide-react";
import projectData from "./data/projects.json";
import type { Company, Comparison, Project } from "./types";
import {
  centerPoint,
  compareProjects,
  filterProjects,
  isNearby,
  milesToUnit,
  milesFromUnit,
} from "./lib/comparisons";
import { cn } from "./lib/cn";
import { ProjectMap } from "./components/ProjectMap";
import { ExploreWorkspace } from "./components/ExploreWorkspace";
import { displayProjectName } from "./lib/projectLabels";
import { EvidencePanel } from "./components/EvidencePanel";

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
            <Slider.Indicator className="rounded-full bg-emerald-700" />
            <Slider.Thumb
              aria-labelledby="threshold-label"
              className="size-4 rounded-full border-2 border-emerald-700 bg-white shadow-sm"
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
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
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
    <div className="flex min-h-0 flex-col bg-white">
      <div className="border-b border-stone-100 p-4">
        <h2 className="text-base font-semibold">Cross-company comparisons</h2>
        <p className="mt-1 text-xs text-stone-500">
          Sorted by distance · nearest first
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
          pairs.map((pair) => (
            <Button
              key={pair.id}
              onClick={() => onSelect(pair)}
              aria-pressed={selected?.id === pair.id}
              className={cn(
                "flex w-full items-start gap-3 border-b border-stone-100 p-4 text-left last:border-b-0 hover:bg-stone-50",
                selected?.id === pair.id && "bg-blue-50 hover:bg-blue-50",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-stone-800">
                  {displayProjectName(pair.a)}
                </span>
                <span className="my-1 block text-xs text-stone-400">with</span>
                <span className="block text-xs font-semibold text-stone-800">
                  {displayProjectName(pair.b)}
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
  const [explorePanel, setExplorePanel] = useState<
    "filters" | "comparisons" | null
  >(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [fitAll, setFitAll] = useState(false);
  function focusMap(all = false) {
    setFitAll(all);
    setFitRequest((x) => x + 1);
  }
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
  const selectedProject = projectId
    ? (filtered.find((p) => p.id === projectId) ?? null)
    : null;
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
    setShowEvidence(false);
    focusMap(true);
  }
  function pickPair(p: Comparison) {
    setSelectedId(p.id);
    setProjectId(null);
    setShowEvidence(true);
    setExplorePanel("comparisons");
  }
  function openCase() {
    reset();
    const pair = compareProjects(PROJECTS).find(
      (p) =>
        [p.a.id, p.b.id].includes("DESC_3") &&
        [p.a.id, p.b.id].includes("GPC_3"),
    );
    if (pair) pickPair(pair);
    focusMap();
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4"
      >
        Skip to main content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Network size={21} strokeWidth={1.8} />
          </div>
          <span className="text-xl font-semibold">GridLock</span>
          <span className="hidden border-l border-stone-200 pl-4 text-sm text-stone-400 sm:inline">
            Planning explorer
          </span>
        </div>
        <div className="hidden items-center gap-2 text-xs text-stone-400 xl:flex">
          <span className="size-1.5 rounded-full bg-stone-400" />
          ShellHacks 2026 · Proof of concept
        </div>
      </header>

      <ExploreWorkspace
        panel={explorePanel}
        onPanelChange={setExplorePanel}
        showEvidence={showEvidence && Boolean(selected || selectedProject)}
        selectedKey={selectedProject?.id ?? selected?.id ?? null}
        onBack={() => {
          setShowEvidence(false);
          setProjectId(null);
        }}
        mapMode={mapMode}
        onMapModeChange={setMapMode}
        recordCount={filtered.length}
        pairCount={pairs.length}
        nearbyCount={nearby.length}
        thresholdLabel={`${Number(milesToUnit(threshold, unit).toFixed(1))} ${unit}`}
        onReset={reset}
        onFocus={() => focusMap()}
        canFocus={
          Boolean(selected?.aCenter && selected?.bCenter) ||
          Boolean(selectedProject && centerPoint(selectedProject))
        }
        onShowAll={() => focusMap(true)}
        exportControl={
          <DownloadComparisons pairs={pairs} threshold={threshold} />
        }
        filters={
          <>
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
                      className="flex size-4 items-center justify-center rounded border border-stone-300 bg-white data-[checked]:border-emerald-700 data-[checked]:bg-emerald-700"
                    >
                      <Checkbox.Indicator>
                        <Check size={12} className="text-white" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span>{c.label}</span>
                    <span
                      className={cn(
                        "ml-auto size-2.5",
                        c.id === "DESC"
                          ? "rounded-full bg-blue-600"
                          : "rounded-sm bg-violet-600",
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
                  className="flex size-4 items-center justify-center rounded border border-stone-300 data-[checked]:border-emerald-700 data-[checked]:bg-emerald-700"
                >
                  <Checkbox.Indicator>
                    <Check size={12} className="text-white" />
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
                className="flex w-full items-start justify-between gap-2 text-left text-sm font-medium text-emerald-800"
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
          </>
        }
        comparisons={
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
        }
        evidence={
          <EvidencePanel
            comparison={selected}
            project={selectedProject}
            unit={unit}
          />
        }
      >
        <ProjectMap
          projects={filtered}
          selected={selected}
          selectedProjectId={projectId}
          fitAll={fitAll}
          mode={mapMode}
          fitRequest={fitRequest}
          onProjectSelect={(id) => {
            setProjectId(id);
            setShowEvidence(true);
            setExplorePanel("comparisons");
          }}
        />
      </ExploreWorkspace>

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
