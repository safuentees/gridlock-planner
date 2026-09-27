import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Comparison, Company, Project } from "../types";
import {
  centerPoint,
  isNearby,
  milesFromUnit,
  milesToUnit,
} from "../lib/comparisons";
import { MapOverlayPanel } from "./MapOverlayPanel";

type DistanceUnit = "mi" | "km";
type MapTheme = "light" | "dark";

interface Props {
  projects: Project[];
  comparisons?: Comparison[];
  selected: Comparison | null;
  selectedProjectId?: string | null;
  mode: "points" | "heat";
  fitRequest: number;
  fitAll?: boolean;
  explorerControls?: boolean;
  websiteThresholdMiles?: number;
  websiteUnit?: DistanceUnit;
  onProjectSelect: (id: string) => void;
}

const METERS_PER_MILE = 1609.344;
const defaultColors: Record<Company, string> = {
  DESC: "#047857",
  GPC: "#57534e",
};
const utilityNames: Record<Company, string> = {
  DESC: "Dominion Energy South Carolina",
  GPC: "Georgia Power",
};

function wholeUnitMiles(miles: number, unit: DistanceUnit): number {
  return milesFromUnit(Math.round(milesToUnit(miles, unit)), unit);
}

function iconSvg(company: Company): string {
  return company === "DESC"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 2.8 5.7 13h5.5l-.9 8.2L18.5 10h-5.6l.9-7.2Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5-6.3 19M12 2.5l6.3 19M7.5 16h9M9 11h6M10.5 6h3M4.5 11h15M3 16h18M6.3 21.5h11.4"/></svg>';
}

export function ProjectMap({
  projects,
  comparisons = [],
  selected,
  selectedProjectId,
  mode,
  fitRequest,
  fitAll,
  explorerControls = false,
  websiteThresholdMiles = 25,
  websiteUnit = "mi",
  onProjectSelect,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const heat = useRef<L.HeatLayer | null>(null);
  const [heatReady, setHeatReady] = useState(false);
  const [heatError, setHeatError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [mapThresholdMiles, setMapThresholdMiles] = useState(
    wholeUnitMiles(websiteThresholdMiles, websiteUnit),
  );
  const [mapUnit, setMapUnit] = useState<DistanceUnit>(websiteUnit);
  const [companyVisible, setCompanyVisible] = useState<
    Record<Company, boolean>
  >({
    DESC: true,
    GPC: true,
  });
  const [locationVisible, setLocationVisible] = useState<
    Record<string, boolean>
  >({});
  const [showRadius, setShowRadius] = useState(true);
  const [theme, setTheme] = useState<MapTheme>("light");
  const [companyColors, setCompanyColors] = useState(defaultColors);
  const [mapSelectedPairId, setMapSelectedPairId] = useState<string | null>(
    null,
  );
  const [mapSelectedProjectId, setMapSelectedProjectId] = useState<
    string | null
  >(null);
  const externalSettings = useRef({
    thresholdMiles: websiteThresholdMiles,
    unit: websiteUnit,
  });
  const callback = useRef(onProjectSelect);
  callback.current = onProjectSelect;

  useEffect(() => {
    const previous = externalSettings.current;
    if (previous.unit !== websiteUnit) {
      setMapUnit(websiteUnit);
      setMapThresholdMiles(wholeUnitMiles(websiteThresholdMiles, websiteUnit));
    } else if (previous.thresholdMiles !== websiteThresholdMiles) {
      setMapThresholdMiles(wholeUnitMiles(websiteThresholdMiles, mapUnit));
    }
    externalSettings.current = {
      thresholdMiles: websiteThresholdMiles,
      unit: websiteUnit,
    };
  }, [websiteThresholdMiles, websiteUnit, mapUnit]);

  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          companyVisible[project.company] &&
          locationVisible[project.id] !== false,
      ),
    [projects, companyVisible, locationVisible],
  );
  const visibleProjectIds = useMemo(
    () => new Set(visibleProjects.map((project) => project.id)),
    [visibleProjects],
  );
  const mapMatches = useMemo(
    () =>
      comparisons.filter(
        (pair) =>
          visibleProjectIds.has(pair.a.id) &&
          visibleProjectIds.has(pair.b.id) &&
          isNearby(pair, mapThresholdMiles),
      ),
    [comparisons, visibleProjectIds, mapThresholdMiles],
  );
  const pairLayoutCount = useMemo(
    () =>
      comparisons.filter((pair) => isNearby(pair, mapThresholdMiles)).length,
    [comparisons, mapThresholdMiles],
  );
  const mapSelectedPair =
    mapMatches.find((pair) => pair.id === mapSelectedPairId) ?? null;
  const mapSelectedProject =
    mapSelectedProjectId === null
      ? (projects.find((project) => project.id === selectedProjectId) ?? null)
      : (projects.find((project) => project.id === mapSelectedProjectId) ??
        null);
  const activePair = mapSelectedPair ?? selected;
  const distanceValue = Math.round(milesToUnit(mapThresholdMiles, mapUnit));
  const distanceMax = Math.round(milesToUnit(250, mapUnit));

  const selectProject = useCallback((id: string) => {
    setMapSelectedProjectId(id);
    setMapSelectedPairId(null);
    callback.current(id);
  }, []);
  const selectMapProject = useCallback((id: string) => {
    setMapSelectedProjectId(id);
    setMapSelectedPairId(null);
  }, []);
  const selectPair = useCallback((pair: Comparison) => {
    setMapSelectedPairId(pair.id);
    setMapSelectedProjectId("");
  }, []);

  useEffect(() => {
    if (!element.current) return;
    const view = L.map(element.current, {
      zoomControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      inertia: false,
      scrollWheelZoom: false,
      minZoom: 5,
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
    const located = visibleProjects.flatMap((project) => {
      const center = centerPoint(project);
      return center ? [{ project, center }] : [];
    });
    const highlightedIds = new Set(
      mapMatches.flatMap((pair) => [pair.a.id, pair.b.id]),
    );
    if (mode === "heat" && heatReady) {
      heat.current = L.heatLayer(
        located.map(
          ({ center }) => [center[0], center[1], 1] as [number, number, number],
        ),
        {
          radius: 40,
          blur: 25,
          maxZoom: 9,
          minOpacity: 0.28,
          max: 3,
          gradient: {
            0.1: "#d1fae5",
            0.4: "#6ee7b7",
            0.7: "#10b981",
            1: "#065f46",
          },
        },
      ).addTo(view);
    }

    for (const { project, center } of located) {
      const highlighted = highlightedIds.has(project.id);
      const active =
        activePair?.a.id === project.id ||
        activePair?.b.id === project.id ||
        mapSelectedProjectId === project.id ||
        selectedProjectId === project.id;
      const radiusMeters = (mapThresholdMiles / 2) * METERS_PER_MILE;
      const color = companyColors[project.company];
      if (explorerControls && showRadius && mapThresholdMiles > 0) {
        const circle = L.circle(center, {
          radius: radiusMeters,
          color: highlighted ? "#f59e0b" : color,
          weight: highlighted ? 3 : 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: mode === "heat" ? 0.035 : 0.085,
          dashArray: highlighted ? "7 5" : undefined,
        }).addTo(group);
        circle.on("click", () => {
          const pair = mapMatches.find(
            (candidate) =>
              candidate.a.id === project.id || candidate.b.id === project.id,
          );
          if (pair) selectPair(pair);
          else selectMapProject(project.id);
        });
      }
      const marker = L.divIcon({
        className: "gridlock-marker",
        html: `<span class="utility-marker ${project.company === "DESC" ? "utility-marker-desc" : "utility-marker-gpc"} ${active ? "utility-marker-selected" : ""}" style="--utility-color:${color}">${iconSvg(project.company)}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const markerLayer = L.marker(center, {
        icon: marker,
        keyboard: true,
        title: `${project.shortName}, ${utilityNames[project.company]}, approximate location`,
        opacity: mode === "heat" && !active ? 0.7 : 1,
      });
      const label = document.createElement("span");
      label.textContent = `${project.shortName} · ${utilityNames[project.company]} · approximate location`;
      markerLayer.bindTooltip(label, { direction: "top", offset: [0, -12] });
      markerLayer.on("click", () => selectProject(project.id));
      markerLayer.addTo(group);
    }
    if (
      activePair?.aCenter &&
      activePair?.bCenter &&
      visibleProjectIds.has(activePair.a.id) &&
      visibleProjectIds.has(activePair.b.id)
    ) {
      L.polyline([activePair.aCenter, activePair.bCenter], {
        color: "#f59e0b",
        weight: 3,
        opacity: 0.95,
        dashArray: "5 7",
        interactive: false,
      }).addTo(group);
    }
  }, [
    visibleProjects,
    visibleProjectIds,
    mapMatches,
    mapThresholdMiles,
    companyColors,
    showRadius,
    explorerControls,
    activePair,
    mapSelectedProjectId,
    selectedProjectId,
    mode,
    heatReady,
    selectPair,
    selectProject,
    selectMapProject,
  ]);

  useEffect(() => {
    if (!map.current || fitRequest === 0) return;
    const single = projects.find((project) => project.id === selectedProjectId);
    const center = single ? centerPoint(single) : null;
    const points = fitAll
      ? projects
          .map(centerPoint)
          .filter((point): point is [number, number] => point !== null)
      : center
        ? [center]
        : selected?.aCenter && selected?.bCenter
          ? [selected.aCenter, selected.bCenter]
          : projects
              .map(centerPoint)
              .filter((point): point is [number, number] => point !== null);
    if (points.length)
      map.current.fitBounds(L.latLngBounds(points), {
        padding: [70, 70],
        maxZoom: 11,
        animate: false,
      });
  }, [fitRequest]);

  return (
    <div
      className={`relative h-full min-h-96 w-full overflow-hidden bg-stone-100 ${theme === "dark" ? "gridlock-map-dark" : ""}`}
    >
      <div
        ref={element}
        className="h-full min-h-96 w-full"
        aria-label="Interactive map of approximate project locations"
      />
      {tileError && (
        <p
          role="status"
          className="map-status-message absolute left-3 z-20 max-w-xs rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600 shadow-sm"
        >
          Basemap unavailable. Project points, comparisons and controls still
          work.
        </p>
      )}
      {mode === "heat" && heatError && (
        <p
          role="status"
          className="map-status-message absolute left-3 z-20 rounded-md bg-white p-3 text-xs"
        >
          Heat layer unavailable. Project points are still shown.
        </p>
      )}
      {mode === "heat" && heatReady && (
        <div
          className={`absolute ${explorerControls ? "bottom-[8.5rem]" : "bottom-12"} left-3 z-20 max-w-[calc(100%-4rem)] rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-xs shadow-sm`}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium">Planning density</span>
            <span className="flex gap-0.5" aria-hidden="true">
              {[
                "bg-emerald-100",
                "bg-emerald-300",
                "bg-emerald-500",
                "bg-emerald-800",
              ].map((className) => (
                <span key={className} className={`h-2 w-5 ${className}`} />
              ))}
            </span>
            <span>Low → high</span>
          </div>
          <p className="text-stone-500">
            One equal-weight point per record; relative to this zoom.
          </p>
        </div>
      )}
      {explorerControls && (
        <MapOverlayPanel
          projects={projects}
          matches={mapMatches}
          pairLayoutCount={pairLayoutCount}
          companyVisible={companyVisible}
          locationVisible={locationVisible}
          distanceValue={distanceValue}
          distanceMax={distanceMax}
          unit={mapUnit}
          showRadius={showRadius}
          theme={theme}
          companyColors={companyColors}
          selectedPair={mapSelectedPair}
          selectedProject={mapSelectedProject}
          onCompanyToggle={(company) =>
            setCompanyVisible((current) => ({
              ...current,
              [company]: !current[company],
            }))
          }
          onLocationToggle={(id) =>
            setLocationVisible((current) => ({
              ...current,
              [id]: current[id] === false,
            }))
          }
          onDistanceChange={(value) =>
            setMapThresholdMiles(milesFromUnit(value, mapUnit))
          }
          onUnitChange={(nextUnit) => {
            setMapThresholdMiles((current) =>
              wholeUnitMiles(current, nextUnit),
            );
            setMapUnit(nextUnit);
          }}
          onRadiusToggle={() => setShowRadius((visible) => !visible)}
          onThemeChange={setTheme}
          onCompanyColorChange={(company, color) =>
            setCompanyColors((current) => ({ ...current, [company]: color }))
          }
          onPairSelect={selectPair}
          onProjectSelect={(project) => selectMapProject(project.id)}
          onClearSelection={() => setMapSelectedPairId(null)}
        />
      )}
    </div>
  );
}
