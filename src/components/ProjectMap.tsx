import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Comparison, Coordinate, Project } from "../types";
import { mapPresentation } from "../lib/mapPresentation";

interface Props {
  projects: Project[];
  centers: ReadonlyMap<string, Coordinate | null>;
  selected: Comparison | null;
  selectedProjectId?: string | null;
  mode: "points" | "heat";
  fitRequest: number;
  fitAll?: boolean;
  onProjectSelect: (id: string) => void;
}

export function ProjectMap({
  projects,
  centers,
  selected,
  selectedProjectId,
  mode,
  fitRequest,
  fitAll,
  onProjectSelect,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const heat = useRef<L.HeatLayer | null>(null);
  const [heatReady, setHeatReady] = useState(false);
  const [heatError, setHeatError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const callback = useRef(onProjectSelect);
  callback.current = onProjectSelect;
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
    L.control
      .scale({ imperial: true, metric: true, position: "bottomleft" })
      .addTo(view);
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
          0.1: "#d1fae5",
          0.4: "#6ee7b7",
          0.7: "#10b981",
          1: "#065f46",
        },
      }).addTo(view);
    }
    for (const { project: p, center } of presentation.markers) {
      const active =
        selected?.a.id === p.id ||
        selected?.b.id === p.id ||
        selectedProjectId === p.id;
      const icon = L.divIcon({
        className: "gridlock-marker",
        html: `<span class="project-pin ${p.company === "GPC" ? "pin-square" : "pin-circle"} ${active ? "pin-selected" : ""}"><span></span></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker(center, {
        icon,
        keyboard: true,
        title: `${p.shortName}, ${p.company}, approximate location`,
        opacity: mode === "heat" && !active ? 0.7 : 1,
      });
      const label = document.createElement("span");
      label.textContent = `${p.shortName} · ${p.company}`;
      marker.bindTooltip(label, { direction: "top", offset: [0, -10] });
      marker.on("click", () => callback.current(p.id));
      marker.addTo(group);
    }
    if (
      selected?.aCenter &&
      selected?.bCenter &&
      projects.some((p) => p.id === selected.a.id) &&
      projects.some((p) => p.id === selected.b.id)
    ) {
      L.polyline([selected.aCenter, selected.bCenter], {
        color: "#047857",
        weight: 2,
        opacity: 0.75,
        dashArray: "5 7",
        interactive: false,
      }).addTo(group);
    }
  }, [projects, presentation, selected, selectedProjectId, mode, heatReady]);

  useEffect(() => {
    if (!map.current || fitRequest === 0) return;
    const center = selectedProjectId ? centers.get(selectedProjectId) : null;
    const points = fitAll
      ? projects
          .map((p) => centers.get(p.id) ?? null)
          .filter((x): x is [number, number] => x !== null)
      : center
        ? [center]
        : selected?.aCenter && selected?.bCenter
          ? [selected.aCenter, selected.bCenter]
          : projects
              .map((p) => centers.get(p.id) ?? null)
              .filter((x): x is [number, number] => x !== null);
    if (points.length)
      map.current.fitBounds(L.latLngBounds(points), {
        padding: [70, 70],
        maxZoom: 11,
        animate: false,
      });
  }, [fitRequest]); // Fit is an explicit user action, not a side effect of every filter.

  return (
    <div className="relative h-full min-h-96 w-full overflow-hidden bg-stone-100">
      <div
        ref={element}
        className="h-full min-h-96 w-full"
        aria-label="Interactive map of approximate project locations"
      />
      {presentation.locatedCount > presentation.markers.length && (
        <p className="absolute left-3 top-3 z-20 max-w-xs rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-600">
          Showing {presentation.markers.length.toLocaleString()} sampled markers
          of {presentation.locatedCount.toLocaleString()} located records. Heat
          includes every located record. Selected records stay visible.
        </p>
      )}
      {tileError && (
        <p
          role="status"
          className="absolute top-3 left-3 z-20 max-w-xs rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600 shadow-sm"
        >
          Basemap unavailable. Project points, comparisons and controls still
          work.
        </p>
      )}
      {mode === "heat" && heatError && (
        <p
          role="status"
          className="absolute top-3 left-3 z-20 rounded-md bg-white p-3 text-xs"
        >
          Heat layer unavailable. Project points are still shown.
        </p>
      )}
      {mode === "heat" && heatReady && (
        <div className="absolute bottom-12 left-3 z-20 max-w-[calc(100%-4rem)] rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium">Planning density</span>
            <span className="flex gap-0.5" aria-hidden="true">
              {[
                "bg-emerald-100",
                "bg-emerald-300",
                "bg-emerald-500",
                "bg-emerald-800",
              ].map((x) => (
                <span key={x} className={`h-2 w-5 ${x}`} />
              ))}
            </span>
            <span>Low → high</span>
          </div>
          <p className="text-stone-500">
            Each record has equal weight; relative to this zoom.
            {presentation.cellDegrees > 0
              ? ` Aggregated in ${presentation.cellDegrees}° cells.`
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}
