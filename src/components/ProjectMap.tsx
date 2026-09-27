import { useEffect, useId, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../map.css";
import type { Comparison, Coordinate, Project } from "../types";
import { cn } from "../lib/cn";
import { milesToUnit } from "../lib/comparisons";
import { mapPresentation } from "../lib/mapPresentation";
import {
  connectionLabelPoint,
  connectionSegments,
  mapConnections,
  proximityRadiusLabel,
  proximityRadiusMeters,
} from "../lib/mapOverlays";
import { UtilityIcon, utilityKind, utilityLabel } from "./UtilityIcon";
import {
  HEAT_BLUR,
  HEAT_RADIUS,
  relativeHeatMaximum,
} from "../lib/heatPresentation";

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
  matchesIncomplete?: boolean;
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

/** Leaflet.heat 0.2.0 leaves requested animation frames alive on removal.
 * A synchronous _reset can also clear _frame before its queued callback runs.
 * Guard this instance's redraw as well as cancelling the tracked frame; never
 * patch the shared plugin prototype. Recheck these internals on a dependency bump.
 */
function createHeatLayer(
  points: L.HeatLatLngTuple[],
  options: L.HeatMapOptions,
) {
  const layer = L.heatLayer(points, options);
  const internals = layer as unknown as {
    _frame: number | null | undefined;
    _map: L.Map | null | undefined;
    _redraw: () => void;
  };
  const redraw = internals._redraw;
  internals._redraw = () => {
    if (!internals._map) {
      internals._frame = null;
      return;
    }
    redraw.call(layer);
  };
  const onRemove = layer.onRemove;
  layer.onRemove = function (view) {
    if (internals._frame != null) {
      L.Util.cancelAnimFrame(internals._frame);
      internals._frame = null;
    }
    return onRemove.call(this, view);
  };
  return layer;
}

function markerIcon(
  company: string,
  spriteId: string,
  selected: boolean,
  matchCount: number,
  accessibleLabel: string,
) {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "utility-map-pin";
  pin.setAttribute("aria-label", accessibleLabel);
  pin.dataset.utility = utilityKind(company);
  pin.dataset.selected = String(selected);
  pin.dataset.matched = String(matchCount > 0);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${spriteId}-${utilityKind(company)}`);
  svg.append(use);
  pin.append(svg);
  if (matchCount > 0) {
    const badge = document.createElement("span");
    badge.className = "map-match-badge";
    badge.textContent = matchCount.toLocaleString("en-US");
    badge.setAttribute("aria-hidden", "true");
    pin.append(badge);
  }
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
  showCircles = true,
  thresholdMiles = 25,
  unit = "mi",
  matches = NO_MATCHES,
  matchesIncomplete = false,
  fitRequest,
  fitAll,
  onProjectSelect,
  onPairSelect,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const lastFittedRequest = useRef<number | null>(null);
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
  // Selection and distance change overlays, not the density inputs. Reuse the
  // heat canvas until its coordinates/weights or display mode actually change.
  const heatKey = useMemo(
    () => JSON.stringify(presentation.heat),
    [presentation.heat],
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
    lastFittedRequest.current = null;
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
    if (!view || mode !== "heat" || !heatReady) return;
    const points = JSON.parse(heatKey) as [number, number, number][];
    const updateHeatScale = () => {
      if (!heat.current) return;
      const zoom = view.getZoom();
      const projected = points.map(([lat, lon, weight]) => {
        const point = view.project([lat, lon], zoom);
        return [point.x, point.y, weight] as const;
      });
      heat.current.setOptions({
        max: relativeHeatMaximum(projected),
        maxZoom: zoom,
      });
    };
    if (mode === "heat" && heatReady) {
      heat.current = createHeatLayer(points, {
        radius: HEAT_RADIUS,
        blur: HEAT_BLUR,
        maxZoom: view.getZoom(),
        minOpacity: 0.06,
        max: 3,
        gradient: {
          0.15: "#22c55e",
          0.45: "#facc15",
          0.7: "#f97316",
          1: "#dc2626",
        },
      }).addTo(view);
      updateHeatScale();
      view.on("zoomend", updateHeatScale);
    }
    return () => {
      view.off("zoomend", updateHeatScale);
      heat.current?.remove();
      heat.current = null;
    };
  }, [heatKey, mode, heatReady]);

  useEffect(() => {
    const view = map.current;
    const group = layers.current;
    if (!view || !group) return;
    group.clearLayers();
    const matchSummary = (id: string) => {
      const count = overlay.matchCounts.get(id) ?? 0;
      if (!count) return "No matches in the displayed comparisons";
      const utilities = [...(overlay.matchUtilities.get(id) ?? [])]
        .map(utilityLabel)
        .join(", ");
      return `${count.toLocaleString("en-US")} ${matchesIncomplete ? "displayed " : ""}${count === 1 ? "match" : "matches"} with ${utilities}`;
    };
    if (showCircles && radius !== null) {
      for (const { project: p, center } of presentation.markers) {
        const circle = L.circle(center, {
          radius,
          className: cn(
            "proximity-circle",
            overlay.matchedProjectIds.has(p.id) && "is-matched",
          ),
          weight: overlay.matchedProjectIds.has(p.id) ? 2.5 : 1,
          opacity: overlay.matchedProjectIds.has(p.id) ? 0.9 : 0.45,
          fill: mode !== "heat" && overlay.matchedProjectIds.has(p.id),
          fillOpacity: 0.08,
          bubblingMouseEvents: false,
        });
        circle.bindTooltip(
          tooltip(
            `${p.shortName}. ${utilityLabel(p.company)}. ${matchSummary(p.id)}. ${radiusLabel} for proximity, not a work footprint.`,
          ),
          { sticky: true },
        );
        circle.on("click", () => callback.current(p.id));
        circle.addTo(group);
        circle.getElement()?.setAttribute("data-circle-project-id", p.id);
        circle
          .getElement()
          ?.setAttribute(
            "data-matched",
            String(overlay.matchedProjectIds.has(p.id)),
          );
        // The marker's native button provides the same keyboard action.
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
      const distanceLabel =
        pair.distanceMiles === null
          ? "Distance unavailable"
          : `Approx. ${milesToUnit(pair.distanceMiles, unit).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit} apart`;
      const label = `Selected comparison: ${pair.a.shortName} and ${pair.b.shortName}. ${distanceLabel}. Representative-point separation, not a route.`;
      const points = connectionSegments(aCenter, bCenter);
      const path = L.polyline(points, {
        className: cn("map-connection", active && "is-selected"),
        weight: 3,
        opacity: 0.95,
        interactive: false,
      }).addTo(group);
      path.getElement()?.setAttribute("data-pair-id", pair.id);
      path.getElement()?.setAttribute("data-matched", String(matched));
      L.tooltip({
        permanent: true,
        direction: "center",
        className: "map-distance-label",
        interactive: false,
      })
        .setLatLng(connectionLabelPoint(aCenter, bCenter))
        .setContent(tooltip(distanceLabel))
        .addTo(group);
      // A wider transparent target keeps the separation easy to inspect.
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
          overlay.matchCounts.get(p.id) ?? 0,
          `${p.shortName}, ${utilityLabel(p.company)}, ${matchSummary(p.id)}, select project`,
        ),
        // The native button supplies Enter/Space activation and the only tab stop.
        keyboard: false,
        title: `${p.shortName}, ${utilityLabel(p.company)}, ${matchSummary(p.id)}, approximate location`,
        zIndexOffset: active ? 1000 : 0,
      });
      marker.bindTooltip(
        tooltip(
          `${p.shortName}. ${utilityLabel(p.company)}. ${matchSummary(p.id)}.`,
        ),
        { direction: "top", offset: [0, -20] },
      );
      marker.on("click", () => callback.current(p.id));
      marker.addTo(group);
      marker.getElement()?.setAttribute("data-project-id", p.id);
      marker
        .getElement()
        ?.setAttribute(
          "data-match-count",
          String(overlay.matchCounts.get(p.id) ?? 0),
        );
    }
  }, [
    presentation,
    overlay,
    matchesIncomplete,
    selected,
    selectedProjectId,
    mode,
    showCircles,
    radius,
    radiusLabel,
    unit,
    spriteId,
    !!onPairSelect,
  ]);

  useEffect(() => {
    const view = map.current;
    if (!view || lastFittedRequest.current === fitRequest) return;
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
    // An empty request leaves the current view intact and stays pending until
    // usable locations arrive. A newer request cancels the previous pending fit.
    if (!points.length) return;
    // Wait for the initial layout; appearance and panel changes never request a fit.
    const frame = requestAnimationFrame(() => {
      if (map.current !== view || lastFittedRequest.current === fitRequest)
        return;
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
      lastFittedRequest.current = fitRequest;
    });
    return () => cancelAnimationFrame(frame);
  }, [fitRequest, projects, centers, selected, selectedProjectId, fitAll]);

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
      data-matched-project-count={overlay.matchedProjectIds.size}
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
        className="pointer-events-none absolute z-20 w-64 max-w-[calc(100%-7rem)] space-y-2"
        data-map-notices
      >
        {mode === "heat" && heatReady && (
          <div className="map-notice rounded-md border px-3 py-2 text-xs shadow-sm">
            {mode === "heat" && heatReady && (
              <div data-heat-legend>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">Density</span>
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
                  Equal weights. Rescales with zoom.
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
