import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Accordion } from "@base-ui/react/accordion";
import { Switch } from "@base-ui/react/switch";
import {
  ArrowDownToLine,
  ChevronDown,
  HelpCircle,
  Menu,
  Focus,
  Expand,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  Comparison,
  ExplorationMode,
  Project,
  ProjectOverride,
  RuntimeDataset,
} from "../types";
import { centerPoint, compareProjects, milesToUnit } from "../lib/comparisons";
import { projectDateBounds, shiftDateBounds } from "../lib/temporal";
import { monthISO, monthEndISO, timelineDistribution } from "../lib/timeline";
import { useSpatialQuery } from "../hooks/useSpatialQuery";
import { cn } from "../lib/cn";
import { originalComparison, comparisonCsv } from "../lib/exports";
import { distanceLabel, type DistanceUnit } from "../lib/distanceControl";
import { EvidencePanel, formatDate } from "./EvidencePanel";
import { TimelineControl } from "./TimelineControl";
import { DistanceControl } from "./DistanceControl";
import { YearShiftControl } from "./YearShiftControl";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { UtilityIcon, utilityLabel, utilityShortLabel } from "./UtilityIcon";
const ProjectMap = lazy(() =>
  import("./ProjectMap").then((m) => ({ default: m.ProjectMap })),
);
const control =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40";
const field =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm tabular-nums";
const EMPTY_SHIFTS: Record<string, number> = {};
const displayName = (p: Project) =>
  p.company === "GPC" && p.id === "GPC_1" && p.shortName === "Evans–Thurmond #5"
    ? "Evans–Thurmond · line #5"
    : p.shortName;
const dateMeaning = (p: Project) => p.dateMeaning.replaceAll("_", " ");
const specifications = (p: Project) =>
  p.name.match(/\b\d+(?:\.\d+)?\s*kV\b/i)?.[0].replace(/\s*kV/i, " kV") ??
  "Specifications in source";
function download(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="flex h-6 w-10 shrink-0 items-center rounded-full bg-stone-300 p-0.5 data-[checked]:bg-emerald-800"
      >
        <Switch.Thumb className="size-5 rounded-full bg-white data-[checked]:translate-x-4" />
      </Switch.Root>
    </label>
  );
}
function useNarrowScreen() {
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function PlanningWorkspace({
  toolContainer,
  source,
  dataset,
  overrides,
  onProjectFocus,
  onNeedData,
}: {
  toolContainer: HTMLElement | null;
  source: RuntimeDataset;
  dataset: RuntimeDataset;
  overrides: ProjectOverride[];
  onProjectFocus: (id: string | null) => void;
  onNeedData: () => void;
}) {
  const narrow = useNarrowScreen();
  const [workspace, setWorkspace] = useState<HTMLDivElement | null>(null);
  const comparisonTrigger = useRef<HTMLButtonElement>(null);
  const [panelOpen, setPanelOpen] = useState(
    () => !window.matchMedia("(max-width: 1023px)").matches,
  );
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
        .filter((c) =>
          `${c} ${utilityLabel(c)}`
            .toLowerCase()
            .includes(companySearch.toLowerCase()),
        )
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
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const excludedProjectIds = useMemo(() => [...excluded], [excluded]);
  const [locationSearch, setLocationSearch] = useState("");
  const locationMatches = useMemo(
    () =>
      dataset.projects.filter((p) =>
        `${p.name} ${p.shortName} ${p.id} ${p.utility}`
          .toLowerCase()
          .includes(locationSearch.toLowerCase()),
      ),
    [dataset.projects, locationSearch],
  );
  const locations = locationMatches.slice(0, 100);
  const [mode, setMode] = useState<ExplorationMode>("planned");
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const [includeUndated, setIncludeUndated] = useState(true);
  const [thresholdMiles, setThresholdMiles] = useState(25);
  const [unit, setUnit] = useState<DistanceUnit>("mi");
  const [heatmap, setHeatmap] = useState(false);
  const [showCircles, setShowCircles] = useState(true);
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
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
  const invalidAssumptions =
    mode === "what_if" &&
    Object.entries(shifts).some(([company, shift]) => {
      const bounds = shiftLimits.get(company) ?? { min: -20, max: 20 };
      return (
        !Number.isSafeInteger(shift) || shift < bounds.min || shift > bounds.max
      );
    });
  // Date corrections can make a retained assumption invalid. Pause matching
  // explicitly rather than throwing, clamping, or silently changing assumptions.
  const activeShifts =
    mode === "what_if" && !invalidAssumptions ? shifts : EMPTY_SHIFTS;
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
          .filter(
            ({ p }) => selectedCompanies.has(p.company) && !excluded.has(p.id),
          )
          .map((r) => r.bounds),
      ),
    [dated, selectedCompanies, excluded],
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
      companies: invalidAssumptions ? [] : companies,
      excludedProjectIds,
      referenceProjectId: referenceId,
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
      invalidAssumptions,
      excludedProjectIds,
      referenceId,
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
  // Every visible result and circle uses the same completed-query threshold.
  // The input can move ahead while a worker query is pending.
  const displayedThreshold = search.resultThresholdMiles ?? thresholdMiles;
  const eligibleKey = useMemo(
    () => JSON.stringify(results?.eligibleProjectIds ?? []),
    [results?.eligibleProjectIds],
  );
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
    [eligibleKey, projectById],
  );
  const eligibleIds = useMemo(
    () => new Set(results?.eligibleProjectIds ?? []),
    [eligibleKey],
  );
  const allPairs = useMemo(
    () =>
      exhaustive && mode === "planned" && filtered.length <= 20
        ? compareProjects(filtered).filter(
            (p) =>
              !referenceId || p.a.id === referenceId || p.b.id === referenceId,
          )
        : null,
    [exhaustive, mode, filtered, referenceId],
  );
  const pairs = allPairs ?? results?.pairs ?? [];
  const qualifying = useMemo(
    () =>
      pairs.filter(
        (p) => p.distanceMiles !== null && p.distanceMiles < displayedThreshold,
      ),
    [pairs, displayedThreshold],
  );
  const selected = pairs.find((p) => p.id === selectedId) ?? null;
  const reference = referenceId ? (projectById.get(referenceId) ?? null) : null;
  const selectedRecords = selected
    ? [selected.a, selected.b]
    : reference
      ? [reference]
      : [];
  const originalSelection = selected
    ? originalComparison(selected, originals)
    : null;
  const matchCount = allPairs
    ? qualifying.length
    : (results?.matchedCount ?? null);
  const partialSearch = !allPairs && !!results && !results.complete;
  const partialMatchDisplay =
    !allPairs &&
    !!results &&
    (!results.complete || results.matchedCount > qualifying.length);
  const toggleCompany = (company: string) =>
    setCompanies((old) =>
      old.includes(company)
        ? old.filter((c) => c !== company)
        : [...old, company],
    );
  const selectProject = (id: string) => {
    setReferenceId(id);
    setSelectedId(null);
    onProjectFocus(id);
    setPanelOpen(true);
  };
  const selectPair = (id: string) => {
    setSelectedId(id);
    onProjectFocus(null);
    setPanelOpen(true);
  };
  const focus = () => {
    setFitAll(false);
    setFitRequest((n) => n + 1);
    if (narrow) setPanelOpen(false);
  };
  const resetFilters = () => {
    setCompanies(availableCompanies);
    setCompanySearch("");
    setExcluded(new Set());
    setChosenRange(null);
    setIncludeUndated(true);
    setThresholdMiles(25);
    setWindowMonths(null);
    setExhaustive(false);
    setReferenceId(null);
    setSelectedId(null);
    onProjectFocus(null);
  };
  const exportPairs = (rows: Comparison[], scope: string) =>
    search.status !== "loading" &&
    download(
      "GridLock-comparisons.csv",
      comparisonCsv(
        rows,
        dataset,
        source,
        mode,
        activeShifts,
        allPairs ? true : !!results?.complete,
        `${scope}; reference=${referenceId ?? "none"}; strict_threshold_miles=${displayedThreshold}; display_unit=${unit}`,
      ),
    );
  const changedRecordIds = useMemo(
    () => new Set(overrides.map((o) => o.projectId)),
    [overrides],
  );
  const filterSummary = `${filtered.length.toLocaleString()} ${filtered.length === 1 ? "project" : "projects"}`;
  const selectedEvidence = selectedRecords.length > 0 && (
    <section aria-label="Selected timing and evidence">
      <div className="space-y-3 p-4">
        <h2 tabIndex={-1} className="text-base font-semibold">
          {selected ? "Selected comparison" : "Reference evidence"}
        </h2>
        {selected && (
          <>
            <p className="text-sm">
              {utilityLabel(selected.a.company)} ↔{" "}
              {utilityLabel(selected.b.company)}
            </p>
            <p className="text-sm tabular-nums">
              Approximate separation:{" "}
              {selected.distanceMiles === null
                ? "unknown"
                : `${distanceLabel(selected.distanceMiles, unit)} ${unit}`}
              .{" "}
              {selected.distanceMiles !== null &&
              selected.distanceMiles < displayedThreshold
                ? "Qualifies under"
                : "Does not qualify under"}{" "}
              the strict {distanceLabel(displayedThreshold, unit)} {unit}{" "}
              distance limit.
            </p>
            <p className="text-xs text-stone-600">
              {selected.gapDays === null
                ? "An exact milestone gap requires two exact-day dates."
                : `${selected.gapDays.toLocaleString()} days between ${mode === "what_if" ? "assumed" : "effective"} milestones.`}{" "}
              Nearby points and planned dates do not establish simultaneous
              construction, shared routes or savings.
            </p>
            <Button
              className={cn(
                control,
                results &&
                  search.status === "loading" &&
                  "disabled:opacity-100",
              )}
              disabled={search.status === "loading"}
              onClick={() =>
                exportPairs(
                  [selected],
                  "selected comparison from displayed results",
                )
              }
            >
              <ArrowDownToLine size={14} />
              Export selected pair
            </Button>
            {results && !results.complete && (
              <p className="text-xs text-stone-600">
                This pair comes from a partial search. Export records that
                limitation.
              </p>
            )}
          </>
        )}
        {(mode === "what_if" ||
          selectedRecords.some((p) => changedRecordIds.has(p.id))) && (
          <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <h3 className="text-sm font-semibold">
              Corrections and assumptions
            </h3>
            {selectedRecords.map((p) => (
              <div key={p.id} className="text-xs">
                <strong>{displayName(p)}</strong>
                <p className="mt-1 tabular-nums">
                  Original:{" "}
                  {formatDate(originals.get(p.id)?.originalDate ?? null)}
                  <br />
                  Current: {formatDate(p.originalDate)} · {dateMeaning(p)}
                  {mode === "what_if" && (
                    <>
                      <br />
                      Assumed ({activeShifts[p.company] ?? 0} years):{" "}
                      {invalidAssumptions
                        ? "Unavailable until assumptions are valid"
                        : (shiftDateBounds(
                            projectDateBounds(p),
                            activeShifts[p.company] ?? 0,
                          )?.label ?? "unknown")}
                    </>
                  )}
                </p>
                {overrides
                  .filter((o) => o.projectId === p.id)
                  .map((o, i) => (
                    <p key={i} className="mt-1">
                      Correction reason: {o.reason}
                    </p>
                  ))}
              </div>
            ))}
          </section>
        )}
        {selectedRecords.some(
          (p) => p.id === "GPC_1" && p.company === "GPC",
        ) && (
          <p className="text-xs text-stone-600">
            “#5” is part of the source line designation, not a comparison rank.
            The source describes work on the Euchee Creek–Thurmond section; the
            workbook supplies broader Evans–Thurmond endpoints.
          </p>
        )}
      </div>
      <EvidencePanel
        comparison={originalSelection}
        project={
          !selected && reference ? (originals.get(reference.id) ?? null) : null
        }
      />
      <p className="p-4 text-xs text-stone-500">
        {source.kind === "demo"
          ? "Historical sample; current opportunities are unverified. "
          : "Uploaded planning records. "}
        All locations are approximate. Dates retain their source meanings.
      </p>
    </section>
  );

  return (
    <div
      ref={setWorkspace}
      className="relative min-h-0 flex-1 overflow-hidden"
      aria-label="Planning workspace"
    >
      <section
        id="project-map"
        tabIndex={-1}
        aria-label="Project map"
        className="absolute inset-0"
      >
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
            selectedProjectId={
              reference && eligibleIds.has(reference.id) ? reference.id : null
            }
            mode={heatmap ? "heat" : "points"}
            appearance={appearance}
            showCircles={showCircles}
            thresholdMiles={displayedThreshold}
            unit={unit}
            matches={qualifying}
            matchesIncomplete={partialMatchDisplay}
            fitRequest={fitRequest}
            fitAll={fitAll}
            onProjectSelect={selectProject}
            onPairSelect={selectPair}
          />
        </Suspense>
      </section>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto max-w-full space-y-2">
          <div
            role="group"
            aria-label="Utility visibility"
            className="flex max-w-full flex-wrap gap-2"
          >
            {availableCompanies.slice(0, 4).map((company) => (
              <Button
                key={company}
                aria-pressed={selectedCompanies.has(company)}
                aria-label={`${utilityShortLabel(company)} ${selectedCompanies.has(company) ? "enabled" : "disabled"}`}
                onClick={() => toggleCompany(company)}
                className={cn(
                  control,
                  "shadow-sm",
                  !selectedCompanies.has(company) &&
                    "bg-stone-100 text-stone-500",
                )}
              >
                <UtilityIcon company={company} size={16} />
                <span className="sm:hidden">{company}</span>
                <span className="hidden sm:inline">
                  {utilityShortLabel(company)}
                </span>
                <span className="sr-only">
                  {selectedCompanies.has(company) ? "enabled" : "disabled"}
                </span>
              </Button>
            ))}
          </div>
          <p
            role="status"
            className="hidden w-fit max-w-80 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs tabular-nums text-stone-600 shadow-sm sm:block"
          >
            {search.status === "loading" && !results
              ? "Updating projects…"
              : filterSummary}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <WorkspaceDialog
            triggerContainer={toolContainer}
            label="Filters"
            icon={<SlidersHorizontal size={17} />}
          >
            <div className="space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold">Utilities</legend>
                {availableCompanies.length > 4 && (
                  <label className="mt-2 block text-xs">
                    Find utility
                    <input
                      type="search"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className={cn(field, "mt-1")}
                    />
                  </label>
                )}
                <div className="mt-2 flex max-h-36 flex-wrap gap-3 overflow-auto">
                  {visibleCompanies.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.has(c)}
                        onChange={() => toggleCompany(c)}
                        className="size-4 accent-emerald-700"
                      />
                      <UtilityIcon company={c} size={15} />
                      {utilityLabel(c)}
                    </label>
                  ))}
                </div>
                {availableCompanies.length > 100 && (
                  <p className="mt-2 text-xs">
                    First 100 matching utilities shown. Search for others.
                  </p>
                )}
                <div className="mt-2 flex gap-4">
                  <Button
                    className="text-xs underline"
                    onClick={() => setCompanies(availableCompanies)}
                  >
                    Enable all utilities
                  </Button>
                  <Button
                    className="text-xs underline"
                    onClick={() => setCompanies([])}
                  >
                    Hide all utilities
                  </Button>
                </div>
              </fieldset>
              <details className="border-y border-stone-200 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Locations{" "}
                  <span className="font-normal tabular-nums text-stone-500">
                    ({dataset.projects.length - excluded.size} checked)
                  </span>
                </summary>
                <label className="mt-3 block text-xs">
                  Find location
                  <input
                    type="search"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className={cn(field, "mt-1")}
                    placeholder="Name, utility or source ID"
                  />
                </label>
                <ul
                  aria-label="Location selections"
                  className="mt-2 max-h-40 divide-y divide-stone-100 overflow-y-auto"
                >
                  {locations.map((p) => (
                    <li key={p.id} className="py-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Include ${displayName(p)}`}
                          checked={!excluded.has(p.id)}
                          onChange={(e) =>
                            setExcluded((old) => {
                              const next = new Set(old);
                              if (e.target.checked) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            })
                          }
                          className="mt-1 size-4 shrink-0 accent-emerald-700"
                        />
                        <UtilityIcon
                          company={p.company}
                          size={17}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <Dialog.Close
                            onClick={() => selectProject(p.id)}
                            aria-pressed={referenceId === p.id}
                            className="block w-full text-left text-sm font-medium hover:underline"
                          >
                            {displayName(p)}
                          </Dialog.Close>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {specifications(p)} ·{" "}
                            {!results
                              ? search.status === "loading"
                                ? "Updating eligibility…"
                                : "Eligibility unavailable"
                              : eligibleIds.has(p.id)
                                ? "Eligible"
                                : selectedCompanies.has(p.company)
                                  ? excluded.has(p.id)
                                    ? "Unchecked"
                                    : "Outside date filter"
                                  : "Utility hidden"}
                            {!centers.get(p.id) ? " · no location" : ""}
                          </p>
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-stone-600">
                              Location details
                            </summary>
                            <p className="mt-1 text-xs">{p.name}</p>
                            <p className="mt-1 text-xs tabular-nums">
                              {formatDate(p.originalDate)} · {dateMeaning(p)}
                            </p>
                            <p className="mt-1 text-xs">
                              ID: {p.sourceProjectId || p.id}. Approximate
                              representative point.
                            </p>
                            <Dialog.Close
                              className="mt-1 text-xs underline"
                              onClick={() => selectProject(p.id)}
                            >
                              Inspect source evidence
                            </Dialog.Close>
                          </details>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {locationMatches.length > 100 && (
                  <p className="mt-2 text-xs">
                    Showing first 100 of{" "}
                    {locationMatches.length.toLocaleString()} matching
                    locations. Narrow your search; unchecked locations remain
                    searchable.
                  </p>
                )}
                {!locations.length && (
                  <p className="mt-2 text-xs">
                    No locations match this search.
                  </p>
                )}
              </details>
              <TimelineControl
                distribution={distribution}
                range={range}
                onChange={setChosenRange}
                assumed={mode === "what_if"}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeUndated}
                  onChange={(e) => setIncludeUndated(e.target.checked)}
                  className="size-4 accent-emerald-700"
                />
                Include unknown milestone dates
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mode === "what_if"}
                  onChange={(e) => {
                    setMode(e.target.checked ? "what_if" : "planned");
                    setExhaustive(false);
                  }}
                  className="size-4 accent-emerald-700"
                />
                Try schedule assumptions
              </label>
              {mode === "what_if" && (
                <section
                  aria-label="Schedule assumptions"
                  className="space-y-3 border-l-2 border-emerald-200 pl-3"
                >
                  <p className="text-xs text-stone-600">
                    Whole-year shifts change assumed milestones only. Originals
                    stay unchanged.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleCompanies.map((c) => (
                      <YearShiftControl
                        key={c}
                        company={c}
                        value={shifts[c] ?? 0}
                        min={shiftLimits.get(c)?.min ?? -20}
                        max={shiftLimits.get(c)?.max ?? 20}
                        onChange={(n) => {
                          setShifts((old) => ({ ...old, [c]: n }));
                          setChosenRange(null);
                        }}
                      />
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
                    className="text-xs underline"
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
              <Button className={control} onClick={resetFilters}>
                Reset filters and location selections
              </Button>
            </div>
          </WorkspaceDialog>
          <WorkspaceDialog
            triggerContainer={toolContainer}
            label="Map settings"
            icon={<Settings2 size={17} />}
          >
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Dialog.Close
                  className={control}
                  disabled={
                    selected
                      ? !selected.aCenter && !selected.bCenter
                      : !reference ||
                        !eligibleIds.has(reference.id) ||
                        !centers.get(reference.id)
                  }
                  onClick={focus}
                  aria-label="Focus selection"
                >
                  <Focus size={14} />
                  Focus
                </Dialog.Close>
                <Dialog.Close
                  className={control}
                  disabled={!filtered.some((p) => centers.get(p.id))}
                  aria-label="Show all locations"
                  onClick={() => {
                    setFitAll(true);
                    setFitRequest((n) => n + 1);
                    if (narrow) setPanelOpen(false);
                  }}
                >
                  <Expand size={14} />
                  Show all
                </Dialog.Close>
              </div>
              <Toggle label="Heatmap" checked={heatmap} onChange={setHeatmap} />
              <Toggle
                label="Radius circles"
                checked={showCircles}
                onChange={setShowCircles}
              />
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  Map appearance
                </legend>
                <div role="group" className="flex gap-2">
                  {(["light", "dark"] as const).map((a) => (
                    <Button
                      key={a}
                      aria-pressed={a === appearance}
                      onClick={() => setAppearance(a)}
                      className={cn(
                        control,
                        a === appearance && "border-emerald-700 bg-emerald-50",
                      )}
                    >
                      {a === "light" ? "Light" : "Dark"}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-stone-600">
                Visual overlays do not change comparison eligibility. Circles
                have a radius of {distanceLabel(displayedThreshold / 2, unit)}{" "}
                {unit}, half the distance limit.
              </p>
            </div>
          </WorkspaceDialog>
          <WorkspaceDialog
            triggerContainer={toolContainer}
            label="Map help"
            icon={<HelpCircle size={17} />}
          >
            <div className="space-y-4 text-sm text-stone-600">
              <p className="font-medium text-stone-900">Map legend</p>
              {availableCompanies.slice(0, 100).map((c) => (
                <p key={c} className="flex items-center gap-2">
                  <UtilityIcon company={c} size={20} />
                  {utilityLabel(c)}
                </p>
              ))}
              {availableCompanies.length > 100 && (
                <p>
                  First 100 utilities shown; find other utilities in Filters.
                </p>
              )}
              <p>
                Icons identify the utility, not an asset type. Checked locations
                participate when their utility and date filters also allow them.
                Unchecked locations stay available in the location list.
              </p>
              <p>
                A selection outline identifies the inspected project or pair.
                Green circles and numbered badges identify projects in displayed
                nearby pairs. A badge counts other-utility partners, not
                utilities. Select a marker to inspect its pairs, or select a
                pair for one solid distance line. That line measures approximate
                separation; it is not a route or an electrical connection.
              </p>
              <p>
                Each circle is {distanceLabel(displayedThreshold / 2, unit)}{" "}
                {unit} in radius: half of the{" "}
                {distanceLabel(displayedThreshold, unit)} {unit} limit. Two
                equal circles overlap at qualifying separations. Exact tangency
                is excluded. Circles are a proximity aid, not footprints or
                service territories.
              </p>
              <p>
                Heat colors run green → yellow → orange → red from low to high
                project density, relative to zoom. They do not count matching
                pairs or indicate risk, construction activity or savings. Every
                located project has equal weight. Sampling and aggregation are
                labeled on the map.
              </p>
              <p>
                Distances use approximate representative points and the exact
                strict “less than” rule; displayed distances are rounded.
                Switching km/mi preserves physical distance. The fixed maximum
                is 250 km (155.342798 mi). Whole-unit slider steps include that
                exact converted endpoint. Typed entries must be integers;
                converted values may contain decimals.
              </p>
              <p>
                Source dates are planning milestones with their original
                meanings and precision. Historical examples are not verified
                current opportunities. Proximity and plans do not establish
                simultaneous construction or savings.
              </p>
              <a
                className="underline"
                href="/THIRD_PARTY_NOTICES.txt"
                target="_blank"
                rel="noreferrer"
              >
                Third-party notices
              </a>
            </div>
          </WorkspaceDialog>
          <Dialog.Root
            open={panelOpen}
            onOpenChange={setPanelOpen}
            modal={narrow}
            disablePointerDismissal={!narrow}
          >
            <Dialog.Trigger
              ref={comparisonTrigger}
              className={cn(
                control,
                "shadow-sm",
                panelOpen && "border-emerald-700",
              )}
            >
              <Menu size={17} />
              Comparisons
            </Dialog.Trigger>
            <Dialog.Portal container={workspace} keepMounted>
              {narrow && (
                <Dialog.Backdrop className="fixed inset-0 z-20 bg-stone-900/30 data-[closed]:hidden" />
              )}
              <Dialog.Popup
                initialFocus={narrow ? true : false}
                finalFocus={comparisonTrigger}
                className="comparison-panel absolute right-3 z-30 flex w-96 max-w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg data-[closed]:hidden"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
                  <Dialog.Title className="text-base font-semibold">
                    Comparisons
                  </Dialog.Title>
                  <Button
                    disabled={!pairs.length || search.status === "loading"}
                    onClick={() =>
                      exportPairs(
                        pairs,
                        allPairs
                          ? "all eligible dataset pairs"
                          : "displayed bounded nearby results",
                      )
                    }
                    className={cn(
                      control,
                      results &&
                        search.status === "loading" &&
                        "disabled:opacity-100",
                    )}
                  >
                    <ArrowDownToLine size={13} />
                    Export {pairs.length} pairs
                  </Button>
                  <Dialog.Close
                    aria-label="Close comparisons"
                    className="rounded-lg p-2 hover:bg-stone-100"
                  >
                    <X size={18} />
                  </Dialog.Close>
                </div>
                <div
                  className="min-h-0 overflow-y-auto overscroll-contain"
                  id="comparison-content"
                  aria-busy={search.status === "loading"}
                >
                  <div
                    className={cn(
                      "space-y-3",
                      (reference ||
                        mode === "what_if" ||
                        allPairs ||
                        partialMatchDisplay) &&
                        "p-4",
                    )}
                  >
                    <Dialog.Description className="sr-only">
                      Expand a comparison to inspect its planned timing and
                      source evidence. Select it again to collapse.
                    </Dialog.Description>

                    {mode === "what_if" && (
                      <strong className="mb-2 block text-xs text-emerald-900">
                        {invalidAssumptions
                          ? "Results paused: a retained year shift exceeds the corrected date range. Update or reset assumptions in Filters. "
                          : "What-if active: "}
                        {Object.entries(shifts)
                          .filter(([, n]) => n !== 0)
                          .map(
                            ([c, n]) =>
                              `${utilityShortLabel(c)} ${n > 0 ? "+" : ""}${n}y`,
                          )
                          .join("; ") || "no year shifts"}
                        {invalidAssumptions
                          ? ". Not applied."
                          : ". Assumed milestones only."}
                      </strong>
                    )}
                    {reference && (
                      <div
                        tabIndex={-1}
                        aria-label="Reference project"
                        className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                      >
                        <p className="text-xs text-stone-500">
                          Reference project
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {displayName(reference)}
                        </p>
                        <p className="mt-1 text-xs">
                          Other-utility projects within{" "}
                          {distanceLabel(displayedThreshold, unit)} {unit}.
                        </p>
                        {results && !eligibleIds.has(reference.id) && (
                          <p className="mt-2 text-xs font-medium">
                            This reference is excluded by current utility,
                            location or date filters. Its original evidence
                            remains available below.
                          </p>
                        )}
                        {!centers.get(reference.id) && (
                          <p className="mt-2 text-xs">
                            No supplied location: nearby separation cannot be
                            calculated.
                          </p>
                        )}
                        {!selected && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs underline">
                              Reference evidence
                            </summary>
                            {selectedEvidence}
                          </details>
                        )}
                        <Button
                          className="mt-2 text-xs underline"
                          onClick={() => {
                            setReferenceId(null);
                            setSelectedId(null);
                            onProjectFocus(null);
                          }}
                        >
                          Compare all locations
                        </Button>
                      </div>
                    )}
                    {allPairs && (
                      <p className="text-xs text-stone-600">
                        Including distant or unknown locations.
                      </p>
                    )}
                    {results &&
                      !allPairs &&
                      (!results.complete ||
                        results.matchedCount > pairs.length) && (
                        <p
                          role="status"
                          className="rounded-lg border border-stone-300 bg-stone-50 p-3 text-xs"
                        >
                          {results.complete
                            ? `Showing closest ${pairs.length} of ${results.matchedCount.toLocaleString()} matches. Export contains these rows only.`
                            : `Partial results: ${pairs.length} best pairs visited, not necessarily closest overall. Narrow distance, utilities or dates. Export contains these rows only.`}
                        </p>
                      )}
                  </div>
                  {search.error ? (
                    <div className="px-4 pb-4">
                      <p role="alert" className="text-sm">
                        {search.error}
                      </p>
                      <Button
                        className={cn(control, "mt-3")}
                        onClick={search.retry}
                      >
                        Retry search
                      </Button>
                    </div>
                  ) : search.status === "loading" && !results ? (
                    <div className="px-4 pb-4" role="status">
                      <p className="text-sm">Finding nearby comparisons…</p>
                      <div aria-hidden="true" className="mt-3 space-y-3">
                        {[0, 1, 2].map((n) => (
                          <div key={n} className="h-10 rounded bg-stone-100" />
                        ))}
                      </div>
                      <Button
                        className={cn(control, "mt-3")}
                        onClick={search.cancel}
                      >
                        Cancel search
                      </Button>
                    </div>
                  ) : !pairs.length ? (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-stone-600">
                        {invalidAssumptions
                          ? "Update or reset the invalid year shift in Filters."
                          : displayedThreshold === 0
                            ? "Zero distance excludes every pair under the strict rule."
                            : availableCompanies.length < 2
                              ? "This dataset needs at least two utilities."
                              : reference && !eligibleIds.has(reference.id)
                                ? "The reference must pass all filters to participate."
                                : "No pairs match these filters."}
                      </p>
                      <Button
                        className={cn(control, "mt-3")}
                        onClick={
                          invalidAssumptions
                            ? () => {
                                setShifts({});
                                setChosenRange(null);
                                setWindowMonths(null);
                              }
                            : availableCompanies.length < 2
                              ? onNeedData
                              : resetFilters
                        }
                      >
                        {invalidAssumptions
                          ? "Reset assumptions"
                          : availableCompanies.length < 2
                            ? "Open data tools"
                            : "Reset filters"}
                      </Button>
                    </div>
                  ) : (
                    <Accordion.Root<string>
                      render={<ol />}
                      aria-label="Ranked comparisons"
                      value={selected ? [selected.id] : []}
                      onValueChange={(ids) => {
                        setSelectedId(ids[0] ?? null);
                        onProjectFocus(null);
                      }}
                      className="divide-y divide-stone-100"
                    >
                      {pairs.map((p) => (
                        <Accordion.Item key={p.id} value={p.id} render={<li />}>
                          <Accordion.Header render={<h3 />}>
                            <Accordion.Trigger
                              className={cn(
                                "flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-stone-50",
                                selectedId === p.id && "bg-emerald-50",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start gap-2 text-sm font-medium">
                                  <UtilityIcon
                                    company={p.a.company}
                                    size={15}
                                    className="mt-0.5"
                                  />
                                  <span>
                                    <span className="sr-only">
                                      {utilityLabel(p.a.company)}:{" "}
                                    </span>
                                    {displayName(p.a)}
                                  </span>
                                </span>
                                <span className="mt-1 flex items-start gap-2 text-sm font-medium">
                                  <UtilityIcon
                                    company={p.b.company}
                                    size={15}
                                    className="mt-0.5"
                                  />
                                  <span>
                                    <span className="sr-only">
                                      {utilityLabel(p.b.company)}:{" "}
                                    </span>
                                    {displayName(p.b)}
                                  </span>
                                </span>
                                <span className="mt-1 block text-xs tabular-nums text-stone-600">
                                  {p.gapDays === null
                                    ? "Exact timing gap unknown"
                                    : `${p.gapDays.toLocaleString()} days between ${mode === "what_if" ? "assumed" : overrides.length ? "current" : "source"} milestones`}
                                </span>
                                {allPairs &&
                                  (p.distanceMiles === null ||
                                    p.distanceMiles >= displayedThreshold) && (
                                    <span className="mt-1 block text-xs font-medium">
                                      {p.distanceMiles === null
                                        ? "Location unknown"
                                        : "Outside distance limit"}
                                    </span>
                                  )}
                              </span>
                              <strong className="shrink-0 text-xs tabular-nums">
                                {p.distanceMiles === null
                                  ? "Unknown"
                                  : `${milesToUnit(p.distanceMiles, unit).toFixed(2)} ${unit}`}
                              </strong>
                              <ChevronDown
                                size={14}
                                aria-hidden="true"
                                className={cn(
                                  "shrink-0",
                                  selectedId === p.id && "rotate-180",
                                )}
                              />
                            </Accordion.Trigger>
                          </Accordion.Header>
                          <Accordion.Panel>
                            {selectedId === p.id && selectedEvidence}
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                    </Accordion.Root>
                  )}
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <div className="order-first flex w-full justify-center xl:absolute xl:inset-x-0 xl:top-0 xl:w-auto">
          <section
            aria-label="Nearby match overview"
            aria-busy={search.status === "loading"}
            className="map-match-overview pointer-events-auto rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div role="status" aria-live="polite" aria-atomic="true">
              {invalidAssumptions ? (
                <p className="text-sm font-medium">Results paused</p>
              ) : search.error ? (
                <p className="text-sm font-medium">Search unavailable</p>
              ) : matchCount === null ? (
                <p className="text-sm text-stone-600">Finding nearby pairs…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <strong
                      className={cn(
                        "text-5xl font-semibold tabular-nums",
                        matchCount > 0 ? "text-emerald-700" : "text-stone-500",
                      )}
                    >
                      {partialSearch && (
                        <span className="mb-0.5 block text-xs font-medium">
                          At least
                        </span>
                      )}
                      {matchCount.toLocaleString()}
                    </strong>
                    <div>
                      <h2 className="text-lg font-semibold">
                        {mode === "what_if" ? "What-if" : "Nearby"}{" "}
                        {reference ? "reference " : ""}
                        {matchCount === 1 ? "pair" : "pairs"}
                      </h2>
                      <p className="text-sm text-stone-600">
                        Under {distanceLabel(displayedThreshold, unit)} {unit}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
      <div className="map-distance pointer-events-auto absolute bottom-7 left-3 z-10">
        <DistanceControl
          miles={thresholdMiles}
          unit={unit}
          onChange={setThresholdMiles}
          onUnitChange={setUnit}
        />
      </div>
    </div>
  );
}
