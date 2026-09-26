import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@base-ui/react/button";
import {
  ArrowLeft,
  Expand,
  Layers,
  Menu,
  Minimize,
  RotateCcw,
  SlidersHorizontal,
  Target,
  UtilityPole,
  X,
  Zap,
} from "lucide-react";
import { cn } from "../lib/cn";

type Panel = "filters" | "comparisons" | null;

export function ExploreWorkspace({
  children,
  panel,
  onPanelChange,
  showEvidence,
  selectedKey,
  onBack,
  mapMode,
  onMapModeChange,
  recordCount,
  pairCount,
  nearbyCount,
  thresholdLabel,
  onReset,
  onFocus,
  canFocus,
  onShowAll,
  exportControl,
  filters,
  comparisons,
  evidence,
}: {
  children: ReactNode;
  panel: Panel;
  onPanelChange: (panel: Panel) => void;
  showEvidence: boolean;
  selectedKey: string | null;
  onBack: () => void;
  mapMode: "points" | "heat";
  onMapModeChange: (mode: "points" | "heat") => void;
  recordCount: number;
  pairCount: number;
  nearbyCount: number;
  thresholdLabel: string;
  onReset: () => void;
  onFocus: () => void;
  canFocus: boolean;
  onShowAll: () => void;
  exportControl: ReactNode;
  filters: ReactNode;
  comparisons: ReactNode;
  evidence: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const comparisonButton = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const drawerContent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel) return;
    if (drawerContent.current) drawerContent.current.scrollTop = 0;
    drawerContent.current?.focus({ preventScroll: true });
  }, [panel, showEvidence, selectedKey]);
  const closePanel = () => {
    onPanelChange(null);
    (panel === "filters" ? filterButton : comparisonButton).current?.focus();
  };
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const action =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  return (
    <main
      id="main-content"
      className={cn("explore-workspace", expanded && "explore-expanded")}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (panel) {
          event.stopPropagation();
          closePanel();
        } else if (expanded) {
          setExpanded(false);
          expandButton.current?.focus();
        }
      }}
    >
      <div className="explore-toolbar">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-widest text-blue-700">
            GEORGIA & SOUTH CAROLINA
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Explore nearby grid work
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            ref={filterButton}
            aria-expanded={panel === "filters"}
            aria-controls="explore-drawer"
            onClick={() =>
              onPanelChange(panel === "filters" ? null : "filters")
            }
            className={cn(
              action,
              panel === "filters" && "border-blue-300 bg-blue-50 text-blue-800",
            )}
          >
            <SlidersHorizontal size={16} /> Filters
          </Button>
          <Button
            ref={comparisonButton}
            aria-expanded={panel === "comparisons"}
            aria-controls="explore-drawer"
            onClick={() =>
              onPanelChange(panel === "comparisons" ? null : "comparisons")
            }
            className={cn(
              action,
              "border-blue-700 bg-blue-700 text-white hover:bg-blue-800",
            )}
          >
            <Menu size={16} /> Comparisons{" "}
            <span className="rounded bg-white/20 px-1.5 tabular-nums">
              {nearbyCount}
            </span>
          </Button>
          <Button
            ref={expandButton}
            aria-label={
              expanded ? "Exit full map view" : "Expand map workspace"
            }
            aria-pressed={expanded}
            title={
              expanded ? "Exit full map view (Escape)" : "Expand map workspace"
            }
            onClick={() => setExpanded((x) => !x)}
            className={action}
          >
            {expanded ? <Minimize size={16} /> : <Expand size={16} />}
          </Button>
        </div>
      </div>
      <div className="explore-summary" aria-live="polite">
        <span>
          <strong>{recordCount}</strong> planning records
        </span>
        <span>
          <strong>{pairCount}</strong> cross-company pairs
        </span>
        <span className="text-blue-800">
          <strong>{nearbyCount}</strong> below {thresholdLabel}
        </span>
      </div>
      <div className={cn("explore-body", panel && "explore-panel-open")}>
        <section className="explore-map" aria-label="Project map">
          {children}
          <div className="map-overlay-controls">
            <Button
              role="switch"
              aria-checked={mapMode === "heat"}
              aria-label="Planning density heatmap"
              onClick={() =>
                onMapModeChange(mapMode === "heat" ? "points" : "heat")
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-xs font-medium shadow-sm"
            >
              <Layers size={15} className="text-slate-600" /> Heatmap
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-9 items-center rounded-full p-0.5",
                  mapMode === "heat" ? "bg-blue-600" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "size-4 rounded-full bg-white shadow-sm transition-transform",
                    mapMode === "heat" && "translate-x-4",
                  )}
                />
              </span>
            </Button>
          </div>
        </section>
        {panel && (
          <aside
            id="explore-drawer"
            className="explore-drawer"
            aria-label={
              panel === "filters"
                ? "Explore filters"
                : "Comparisons and evidence"
            }
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              {panel === "comparisons" && showEvidence ? (
                <Button
                  onClick={onBack}
                  className="flex items-center gap-2 rounded py-1 text-sm font-medium text-blue-700"
                >
                  <ArrowLeft size={16} /> All comparisons
                </Button>
              ) : (
                <h2 className="text-sm font-semibold">
                  {panel === "filters"
                    ? "Explore filters"
                    : "Compare & inspect"}
                </h2>
              )}
              <Button
                onClick={closePanel}
                aria-label="Close panel"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={17} />
              </Button>
            </div>
            {panel === "comparisons" && (
              <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 p-3">
                <Button
                  onClick={onFocus}
                  disabled={!canFocus}
                  className={action}
                >
                  <Target size={14} /> Focus selection
                </Button>
                <Button onClick={onShowAll} className={action}>
                  Show all locations
                </Button>
                <Button onClick={onReset} className={action}>
                  <RotateCcw size={14} /> Reset view
                </Button>
              </div>
            )}
            <div
              ref={drawerContent}
              tabIndex={-1}
              className="explore-drawer-content"
            >
              {panel === "filters" ? (
                <div className="p-5">
                  {filters}
                  <Button
                    onClick={onReset}
                    className={cn(action, "mt-6 w-full")}
                  >
                    <RotateCcw size={14} /> Reset filters
                  </Button>
                </div>
              ) : showEvidence ? (
                evidence
              ) : (
                comparisons
              )}
            </div>
            {panel === "comparisons" && (
              <div className="border-t border-slate-200 p-3">
                {exportControl}
              </div>
            )}
          </aside>
        )}
      </div>
      <div className="explore-legend">
        <span className="flex items-center gap-1.5">
          <UtilityPole size={15} className="text-blue-700" /> Dominion
        </span>
        <span className="flex items-center gap-1.5">
          <Zap size={15} className="text-violet-700" /> Georgia Power
        </span>
        <span className="text-slate-500">
          Dashed line = separation, not a route
        </span>
      </div>
    </main>
  );
}
