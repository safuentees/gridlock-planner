import { useEffect, useId, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../map.css";
import type { Comparison, Coordinate, Project } from "../types";
import { cn } from "../lib/cn";
import { milesToUnit } from "../lib/comparisons";
import { mapPresentation } from "../lib/mapPresentation";
import {
  connectionSegments,
  mapConnections,
  proximityRadiusLabel,
  proximityRadiusMeters,
} from "../lib/mapOverlays";
import { UtilityIcon, utilityKind, utilityLabel } from "./UtilityIcon";

interface Props {
  projects: Project[];
  centers: ReadonlyMap<string, Coordinate | null>;
  selected: Comparison | null;
  selectedProjectId?: string | null;
  mode: "points" | "heat";
  appearance?: "light" | "dark";
  showCircles?: boolean;
  thresholdMiles?: number;
  unit?: "mi" | "km";
  matches?: Comparison[];
  fitRequest: number;
  fitAll?: boolean;
  onProjectSelect: (id: string) => void;
  onPairSelect?: (id: string) => void;
}

const NO_MATCHES: Comparison[] = [];
const UTILITY_SPRITES = ["DESC", "GPC", "other"];

function tooltip(text: string) {
  const label = document.createElement("span");
  label.textContent = text;
  return label;
}

function markerIcon(
  company: string,
  spriteId: string,
  selected: boolean,
  matched: boolean,
) {
  const pin = document.createElement("span");
  pin.className = "utility-map-pin";
  pin.dataset.utility = utilityKind(company);
  pin.dataset.selected = String(selected);
  pin.dataset.matched = String(matched);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${spriteId}-${utilityKind(company)}`);
  svg.append(use);
  pin.append(svg);
  return L.divIcon({
    className: "gridlock-marker",
    html: pin,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function ProjectMap({
  projects,
  centers,
  selected,
  selectedProjectId,
  mode,
  appearance = "light",
  showCircles = false,
  thresholdMiles = 25,
  unit = "mi",
  matches = NO_MATCHES,
  fitRequest,
  fitAll,
  onProjectSelect,
  onPairSelect,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const heat = useRef<L.HeatLayer | null>(null);
  const spriteId = useId();
  const [heatReady, setHeatReady] = useState(false);
  const [heatError, setHeatError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const callback = useRef(onProjectSelect);
  const pairCallback = useRef(onPairSelect);
  callback.current = onProjectSelect;
  pairCallback.current = onPairSelect;
  const presentation = useMemo(
    () =>
      mapPresentation(
        projects,
        centers,
        [selected?.a.id, selected?.b.id, selectedProjectId].filter(
          (id): id is string => !!id,
        ),
      ),
    [projects, centers, selected, selectedProjectId],
  );
  const overlay = useMemo(
    () => mapConnections(matches, selected, projects, centers, thresholdMiles),
    [matches, selected, projects, centers, thresholdMiles],
  );
  const radius = proximityRadiusMeters(thresholdMiles);
  const radiusLabel = proximityRadiusLabel(thresholdMiles, unit);

  useEffect(() => {
    if (!element.current) return;
    const view = L.map(element.current, {
      zoomControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      inertia: false,
      scrollWheelZoom: false,
      minZoom: 2,
      maxZoom: 17,
    }).setView([32.55, -81.9], 7);
    map.current = view;
    L.control.zoom({ position: "bottomright" }).addTo(view);
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
        maxZoom: 19,
      },
    ).addTo(view);
    let errors = 0;
    tiles.on("tileerror", () => {
      errors += 1;
      if (errors > 2) setTileError(true);
    });
    tiles.on("tileload", () => setTileError(false));
    layers.current = L.layerGroup().addTo(view);
    (window as Window & { L?: typeof L }).L = L;
    let disposed = false;
    import("leaflet.heat")
      .then(() => {
        if (!disposed) setHeatReady(true);
      })
      .catch(() => {
        if (!disposed) setHeatError(true);
      });
    const resize = new ResizeObserver(() =>
      view.invalidateSize({ animate: false }),
    );
    resize.observe(element.current);
    return () => {
      disposed = true;
      resize.disconnect();
      view.remove();
      map.current = null;
      layers.current = null;
      heat.current = null;
    };
  }, []);

  useEffect(() => {
    const view = map.current;
    const group = layers.current;
    if (!view || !group) return;
    group.clearLayers();
    if (heat.current) {
      heat.current.remove();
      heat.current = null;
    }
    if (mode === "heat" && heatReady) {
      heat.current = L.heatLayer(presentation.heat, {
        radius: 40,
        blur: 25,
        maxZoom: 9,
        minOpacity: 0.28,
        max: Math.max(3, ...presentation.heat.map((p) => p[2])),
        gradient: {
          0.15: "#22c55e",
          0.45: "#facc15",
          0.7: "#f97316",
          1: "#dc2626",
        },
      }).addTo(view);
    }
    if (showCircles && radius !== null) {
      for (const { project: p, center } of presentation.markers) {
        const circle = L.circle(center, {
          radius,
          className: cn(
            "proximity-circle",
            `utility-${utilityKind(p.company)}`,
          ),
          weight: 1.5,
          opacity: 0.7,
          fill: false,
          bubblingMouseEvents: false,
        });
        circle.bindTooltip(
          tooltip(
            `${p.shortName} · ${utilityLabel(p.company)} · ${radiusLabel} for proximity, not a work footprint`,
          ),
          { sticky: true },
        );
        circle.on("click", () => callback.current(p.id));
        circle.addTo(group);
        // The matching marker provides the same action through Leaflet's keyboard control.
        circle.getElement()?.setAttribute("aria-hidden", "true");
      }
    }
    for (const connection of overlay.connections) {
      const {
        comparison: pair,
        aCenter,
        bCenter,
        matched,
        selected: active,
      } = connection;
      const label = `${active ? "Selected comparison" : "Nearby comparison"}: ${pair.a.shortName} / ${pair.b.shortName}${pair.distanceMiles === null ? "" : ` · ${milesToUnit(pair.distanceMiles, unit).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`} between approximate locations`;
      const points = connectionSegments(aCenter, bCenter);
      const path = L.polyline(points, {
        className: cn("map-connection", active && "is-selected"),
        weight: active ? 3 : 2,
        opacity: active ? 0.95 : 0.7,
        dashArray: matched ? "6 5" : "3 7",
        interactive: false,
      }).addTo(group);
      path.getElement()?.setAttribute("data-pair-id", pair.id);
      path.getElement()?.setAttribute("data-matched", String(matched));
      // A wider transparent target is easier to select than a thin dashed line.
      const target = L.polyline(points, {
        className: "map-connection-hit",
        weight: 14,
        opacity: 0,
        interactive: !!pairCallback.current,
        bubblingMouseEvents: false,
      })
        .bindTooltip(tooltip(label), { sticky: true })
        .addTo(group);
      target.on("click", () => pairCallback.current?.(pair.id));
      target.getElement()?.setAttribute("data-pair-target", pair.id);
      // The comparisons list provides the equivalent native keyboard button.
      target.getElement()?.setAttribute("aria-hidden", "true");
    }
    for (const { project: p, center } of presentation.markers) {
      const active =
        selected?.a.id === p.id ||
        selected?.b.id === p.id ||
        selectedProjectId === p.id;
      const marker = L.marker(center, {
        icon: markerIcon(
          p.company,
          spriteId,
          active,
          overlay.matchedProjectIds.has(p.id),
        ),
        keyboard: true,
        title: `${p.shortName}, ${utilityLabel(p.company)}, approximate location`,
        zIndexOffset: active ? 1000 : 0,
      });
      marker.bindTooltip(
        tooltip(`${p.shortName} · ${utilityLabel(p.company)}`),
        { direction: "top", offset: [0, -12] },
      );
      marker.on("click", () => callback.current(p.id));
      marker.addTo(group);
      marker.getElement()?.setAttribute("data-project-id", p.id);
      marker
        .getElement()
        ?.setAttribute(
          "aria-label",
          `${p.shortName}, ${utilityLabel(p.company)}, select project`,
        );
    }
  }, [
    presentation,
    overlay,
    selected,
    selectedProjectId,
    mode,
    heatReady,
    showCircles,
    radius,
    radiusLabel,
    unit,
    spriteId,
    !!onPairSelect,
  ]);

  useEffect(() => {
    const view = map.current;
    if (!view) return;
    const allPoints = () =>
      projects
        .map((p) => centers.get(p.id) ?? null)
        .filter((point): point is Coordinate => point !== null);
    const selectedPoints = selected
      ? [centers.get(selected.a.id), centers.get(selected.b.id)].filter(
          (point): point is Coordinate => !!point,
        )
      : selectedProjectId && centers.get(selectedProjectId)
        ? [centers.get(selectedProjectId)!]
        : [];
    const points = fitAll
      ? allPoints()
      : selected || selectedProjectId
        ? selectedPoints
        : allPoints();
    if (!points.length) return;
    // Wait for the initial layout; appearance and panel changes never request a fit.
    const frame = requestAnimationFrame(() => {
      const size = view.getSize();
      const desktop = size.x >= 768;
      view.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [
          desktop ? 40 : 25,
          Math.min(desktop ? 120 : 150, size.y * 0.3),
        ],
        paddingBottomRight: [
          desktop ? 430 : 25,
          Math.min(desktop ? 180 : 200, size.y * 0.3),
        ],
        maxZoom: 11,
        animate: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitRequest]); // Fit is an explicit user action, not a side effect of every filter.

  return (
    <div
      className="gridlock-map relative h-full min-h-64 w-full overflow-hidden"
      data-appearance={appearance}
      data-map-mode={mode}
      data-marker-count={presentation.markers.length}
      data-circle-count={
        showCircles && radius !== null ? presentation.markers.length : 0
      }
      data-connector-count={overlay.connections.length}
      data-heat-point-count={
        mode === "heat" && heatReady ? presentation.heat.length : 0
      }
    >
      <svg className="pointer-events-none absolute size-0" aria-hidden="true">
        <defs>
          {UTILITY_SPRITES.map((company) => (
            <symbol
              key={company}
              id={`${spriteId}-${utilityKind(company)}`}
              viewBox="0 0 24 24"
            >
              <UtilityIcon
                company={company}
                size={24}
                className="text-current"
              />
            </symbol>
          ))}
        </defs>
      </svg>
      <div
        ref={element}
        className="h-full min-h-64 w-full"
        aria-label="Interactive map of approximate project locations"
      />
      <div
        className="pointer-events-none absolute top-3 left-1/2 z-20 w-64 max-w-[calc(100%-7rem)] -translate-x-1/2 space-y-2"
        data-map-notices
      >
        {(showCircles || (mode === "heat" && heatReady)) && (
          <div className="map-notice rounded-md border px-3 py-2 text-xs shadow-sm">
            {showCircles && radiusLabel && (
              <p className="text-pretty tabular-nums">
                <span className="font-medium">{radiusLabel}</span> · proximity
                circles, not work footprints
              </p>
            )}
            {mode === "heat" && heatReady && (
              <div className={cn(showCircles && "mt-2")} data-heat-legend>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">Planning density</span>
                  <span className="flex gap-0.5" aria-hidden="true">
                    {[
                      "bg-green-500",
                      "bg-yellow-400",
                      "bg-orange-500",
                      "bg-red-600",
                    ].map((color) => (
                      <span key={color} className={cn("h-2 w-4", color)} />
                    ))}
                  </span>
                  <span>Low → high</span>
                </div>
                <p className="map-notice-secondary text-pretty">
                  Equal record weights; relative to zoom.
                  {presentation.cellDegrees > 0
                    ? ` Combined in ${presentation.cellDegrees}° cells.`
                    : ""}
                </p>
              </div>
            )}
          </div>
        )}
        {presentation.locatedCount > presentation.markers.length && (
          <p
            className="map-notice rounded-md border p-2 text-xs text-pretty tabular-nums"
            data-map-sampling
          >
            {presentation.markers.length.toLocaleString()} of{" "}
            {presentation.locatedCount.toLocaleString()} locations shown
            {showCircles ? " with circles" : ""}. Selection stays visible.
            {mode === "heat" ? " Heat includes every location." : ""}
          </p>
        )}
        {overlay.shownMatchCount < overlay.providedMatchCount && (
          <p className="map-notice rounded-md border p-2 text-xs text-pretty tabular-nums">
            Showing {overlay.shownMatchCount} of{" "}
            {overlay.providedMatchCount.toLocaleString()} supplied matches.
          </p>
        )}
        {tileError && (
          <p
            role="status"
            className="map-notice rounded-md border p-2 text-xs text-pretty shadow-sm"
          >
            Basemap unavailable. Project points and comparisons still work.
          </p>
        )}
        {mode === "heat" && heatError && (
          <p
            role="status"
            className="map-notice rounded-md border p-2 text-xs text-pretty"
          >
            Heat layer unavailable. Project points are still shown.
          </p>
        )}
      </div>
    </div>
  );
}
