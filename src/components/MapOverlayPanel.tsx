import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Settings2,
  X,
} from "lucide-react";
import type { Comparison, Company, Project } from "../types";
import { centerPoint, milesToUnit } from "../lib/comparisons";
import { formatDate, sourceLink } from "./EvidencePanel";

type DistanceUnit = "mi" | "km";
type MapTheme = "light" | "dark";

interface Props {
  projects: Project[];
  matches: Comparison[];
  pairLayoutCount: number;
  companyVisible: Record<Company, boolean>;
  locationVisible: Record<string, boolean>;
  distanceValue: number;
  distanceMax: number;
  unit: DistanceUnit;
  showRadius: boolean;
  theme: MapTheme;
  companyColors: Record<Company, string>;
  selectedPair: Comparison | null;
  selectedProject: Project | null;
  onCompanyToggle: (company: Company) => void;
  onLocationToggle: (id: string) => void;
  onDistanceChange: (value: number) => void;
  onUnitChange: (unit: DistanceUnit) => void;
  onRadiusToggle: () => void;
  onThemeChange: (theme: MapTheme) => void;
  onCompanyColorChange: (company: Company, color: string) => void;
  onPairSelect: (pair: Comparison) => void;
  onProjectSelect: (project: Project) => void;
  onClearSelection: () => void;
}

const companyNames: Record<Company, string> = {
  DESC: "Dominion Energy SC",
  GPC: "Georgia Power",
};

function UtilityIcon({
  company,
  color,
  size = "sm",
}: {
  company: Company;
  color: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`map-utility-icon ${company === "DESC" ? "map-utility-desc" : "map-utility-gpc"} ${size === "md" ? "map-utility-icon-md" : ""}`}
      style={{ backgroundColor: color }}
      aria-label={companyNames[company]}
      title={companyNames[company]}
    >
      {company === "DESC" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.8 2.8 5.7 13h5.5l-.9 8.2L18.5 10h-5.6l.9-7.2Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 2.5-6.3 19M12 2.5l6.3 19M7.5 16h9M9 11h6M10.5 6h3M4.5 11h15M3 16h18M6.3 21.5h11.4" />
        </svg>
      )}
    </span>
  );
}

export function MapOverlayPanel({
  projects,
  matches,
  pairLayoutCount,
  companyVisible,
  locationVisible,
  distanceValue,
  distanceMax,
  unit,
  showRadius,
  theme,
  companyColors,
  selectedPair,
  selectedProject,
  onCompanyToggle,
  onLocationToggle,
  onDistanceChange,
  onUnitChange,
  onRadiusToggle,
  onThemeChange,
  onCompanyColorChange,
  onPairSelect,
  onProjectSelect,
  onClearSelection,
}: Props) {
  const [editingDistance, setEditingDistance] = useState(false);
  const [distanceDraft, setDistanceDraft] = useState(String(distanceValue));
  const [distanceError, setDistanceError] = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 700,
  );
  const [pairsOpen, setPairsOpen] = useState(true);
  const [locationsOpen, setLocationsOpen] = useState(true);

  useEffect(() => {
    setDistanceDraft(String(distanceValue));
    setDistanceError("");
  }, [distanceValue]);

  function commitDistance() {
    const value = Number(distanceDraft);
    if (!/^\d+$/.test(distanceDraft.trim()) || !Number.isInteger(value)) {
      setDistanceError("Only Whole Numbers Allowed!");
      return;
    }
    if (value < 0 || value > distanceMax) {
      setDistanceError(`Enter a whole number from 0 to ${distanceMax}.`);
      return;
    }
    onDistanceChange(value);
    setDistanceError("");
    setEditingDistance(false);
  }

  const markMiles = [10, 25, 50, 100, 250];
  const marks = markMiles.map((miles) => Math.round(milesToUnit(miles, unit)));

  return (
    <>
      <div className="map-company-filters" aria-label="Map company filters">
        {(["DESC", "GPC"] as const).map((company) => (
          <button
            key={company}
            type="button"
            aria-pressed={companyVisible[company]}
            onClick={() => onCompanyToggle(company)}
            className={`map-company-filter ${companyVisible[company] ? "is-active" : ""}`}
          >
            <UtilityIcon company={company} color={companyColors[company]} />
            <span>{companyNames[company]}</span>
          </button>
        ))}
      </div>

      <section
        className="map-distance-panel"
        aria-label="Map distance settings"
      >
        <div className="map-distance-heading">
          <span className="text-xs font-semibold text-stone-700">
            Map distance
          </span>
          <div className="map-unit-switch" aria-label="Map distance units">
            {(["mi", "km"] as const).map((nextUnit) => (
              <button
                key={nextUnit}
                type="button"
                aria-pressed={unit === nextUnit}
                onClick={() => onUnitChange(nextUnit)}
              >
                {nextUnit}
              </button>
            ))}
          </div>
        </div>
        <div className="map-distance-value">
          {editingDistance ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                commitDistance();
              }}
            >
              <input
                autoFocus
                type="number"
                step="1"
                min="0"
                max={distanceMax}
                value={distanceDraft}
                aria-label={`Exact map distance in ${unit}`}
                aria-invalid={Boolean(distanceError)}
                onChange={(event) => {
                  setDistanceDraft(event.target.value);
                  setDistanceError("");
                }}
                onBlur={commitDistance}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDistanceDraft(String(distanceValue));
                    setDistanceError("");
                    setEditingDistance(false);
                  }
                }}
              />
              <span>{unit}</span>
              <button type="submit" aria-label="Apply map distance">
                Apply
              </button>
            </form>
          ) : (
            <button
              type="button"
              title="Double-click to type an exact whole-number distance"
              onDoubleClick={() => {
                setDistanceDraft(String(distanceValue));
                setEditingDistance(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") setEditingDistance(true);
              }}
            >
              {distanceValue} <span>{unit}</span>
            </button>
          )}
        </div>
        <div
          className="map-range-wrap"
          onDoubleClick={() => {
            setDistanceDraft(String(distanceValue));
            setEditingDistance(true);
          }}
          title="Double-click to type an exact whole-number distance"
        >
          <input
            type="range"
            min="0"
            max={distanceMax}
            step="1"
            value={Math.min(distanceMax, Math.max(0, distanceValue))}
            aria-label={`Map distance threshold from 0 to ${distanceMax} ${unit}`}
            onChange={(event) => {
              const value = Number(event.target.value);
              setDistanceDraft(String(value));
              setDistanceError("");
              onDistanceChange(value);
            }}
          />
          <div className="map-range-marks" aria-hidden="true">
            {marks.map((mark) => (
              <span
                key={`${unit}-${mark}`}
                style={{ left: `${(mark / distanceMax) * 100}%` }}
              >
                <i />
                <small>{mark}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="map-distance-footer">
          <span>0 {unit}</span>
          <span>
            {distanceMax} {unit}
          </span>
        </div>
        {distanceError && (
          <p role="alert" className="map-distance-error">
            {distanceError}
          </p>
        )}
        <p className="map-distance-hint">
          Double-click the value or slider to type a whole number. The map
          threshold filters this map’s match list only.
        </p>
      </section>

      {resultsVisible ? (
        <section className="map-results-panel">
          <div className="map-results-heading">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                Map results
              </p>
              <h2>
                {matches.length} pairs · {projects.length} locations
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="map-icon-button"
                aria-label={legendOpen ? "Close map legend" : "Open map legend"}
                aria-expanded={legendOpen}
                onClick={() => setLegendOpen((open) => !open)}
              >
                {legendOpen ? <X size={16} /> : <CircleHelp size={16} />}
              </button>
              <details className="map-settings-menu">
                <summary aria-label="Map settings" title="Map settings">
                  <Settings2 size={16} />
                </summary>
                <div className="map-settings-popover">
                  <p className="font-semibold">Map settings</p>
                  <label>
                    Basemap
                    <select
                      value={theme}
                      onChange={(event) =>
                        onThemeChange(event.target.value as MapTheme)
                      }
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                  <label className="map-setting-toggle">
                    <input
                      type="checkbox"
                      checked={showRadius}
                      onChange={onRadiusToggle}
                    />
                    Show search radii
                  </label>
                  {(["DESC", "GPC"] as const).map((company) => (
                    <label className="map-color-setting" key={company}>
                      <span>{companyNames[company]}</span>
                      <input
                        type="color"
                        value={companyColors[company]}
                        aria-label={`${companyNames[company]} map color`}
                        onChange={(event) =>
                          onCompanyColorChange(company, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>
              <button
                type="button"
                className="map-icon-button"
                aria-label="Hide map results"
                title="Hide map results"
                onClick={() => setResultsVisible(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {legendOpen && (
            <div className="map-legend-popover" role="note">
              <p className="font-semibold">Map legend</p>
              <p>
                <UtilityIcon company="DESC" color={companyColors.DESC} />{" "}
                Dominion Energy SC
              </p>
              <p>
                <UtilityIcon company="GPC" color={companyColors.GPC} /> Georgia
                Power
              </p>
              <p>
                <span className="map-legend-swatch map-legend-radius" /> Colored
                circles show each location’s half-distance radius.
              </p>
              <p>
                <span className="map-legend-swatch map-legend-match" /> Amber
                outline marks a location in a nearby pair.
              </p>
              <p>
                Pairs use the existing straight-line point distance. A match
                does not confirm overlapping construction.
              </p>
            </div>
          )}

          <div className="map-results-body">
            <section className="map-results-section">
              <button
                type="button"
                className="map-results-section-toggle"
                aria-expanded={pairsOpen}
                onClick={() => setPairsOpen((open) => !open)}
              >
                <span>Pairs</span>
                <span className="map-results-count">{matches.length}</span>
                {pairsOpen ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>
              {pairsOpen && (
                <>
                  <div
                    className="map-pair-list"
                    aria-label="Nearby company pairs"
                    style={{ minHeight: `${pairLayoutCount * 2.3}rem` }}
                  >
                    {matches.length === 0 ? (
                      <p className="map-empty-state">
                        No cross-company pairs meet this map distance and
                        selection.
                      </p>
                    ) : (
                      matches.map((pair) => (
                        <button
                          type="button"
                          key={pair.id}
                          className={`map-pair-row ${selectedPair?.id === pair.id ? "is-selected" : ""}`}
                          aria-pressed={selectedPair?.id === pair.id}
                          onClick={() => onPairSelect(pair)}
                        >
                          <span className="map-pair-project">
                            <UtilityIcon
                              company={pair.a.company}
                              color={companyColors[pair.a.company]}
                            />
                            <span>{pair.a.shortName}</span>
                          </span>
                          <span className="map-pair-distance">
                            <i />
                            {milesToUnit(pair.distanceMiles ?? 0, unit).toFixed(
                              1,
                            )}{" "}
                            {unit}
                            <i />
                          </span>
                          <span className="map-pair-project map-pair-project-end">
                            <UtilityIcon
                              company={pair.b.company}
                              color={companyColors[pair.b.company]}
                            />
                            <span>{pair.b.shortName}</span>
                          </span>
                          <span className="map-pair-gap">
                            {pair.gapDays === null
                              ? "Milestone gap unknown"
                              : `${pair.gapDays.toLocaleString()} days between milestones`}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="map-location-section">
              <button
                type="button"
                className="map-results-section-toggle"
                aria-expanded={locationsOpen}
                onClick={() => setLocationsOpen((open) => !open)}
              >
                <span>Locations</span>
                <span className="map-results-count">{projects.length}</span>
                {locationsOpen ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>
              {locationsOpen && (
                <div className="map-location-list">
                  {projects.map((project) => {
                    const checked =
                      companyVisible[project.company] &&
                      locationVisible[project.id] !== false;
                    const center = centerPoint(project);
                    return (
                      <article className="map-location-row" key={project.id}>
                        <div className="map-location-heading">
                          <label title={`Show ${project.shortName} on the map`}>
                            <input
                              type="checkbox"
                              checked={locationVisible[project.id] !== false}
                              onChange={() => onLocationToggle(project.id)}
                            />
                            <UtilityIcon
                              company={project.company}
                              color={companyColors[project.company]}
                            />
                          </label>
                          <button
                            type="button"
                            aria-expanded={selectedProject?.id === project.id}
                            onClick={() => onProjectSelect(project)}
                          >
                            {project.shortName}
                          </button>
                          {!checked && (
                            <span className="map-location-hidden">Hidden</span>
                          )}
                        </div>
                        {selectedProject?.id === project.id && (
                          <div className="map-location-specs">
                            <p className="font-semibold">{project.name}</p>
                            <p>
                              {companyNames[project.company]} · {project.state}{" "}
                              · {project.id}
                            </p>
                            <p>
                              {project.dateMeaning === "need_date"
                                ? "Original need date"
                                : "Original planned in-service date"}
                              : {formatDate(project.originalDate)}
                            </p>
                            <p>
                              Approximate point:{" "}
                              {center
                                ? `${center[0].toFixed(4)}, ${center[1].toFixed(4)}`
                                : "Location unknown"}
                            </p>
                            <p>
                              <strong>Work scope:</strong>{" "}
                              {project.review.scope}
                            </p>
                            <p>{project.review.locationNote}</p>
                            <a
                              href={sourceLink(
                                project.originalSource.url,
                                project.originalSource.page,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open source · p. {project.originalSource.page}
                            </a>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          {pairsOpen && selectedPair && (
            <article className="map-selected-detail">
              <div className="flex items-start justify-between gap-2">
                <h3>Why this pair appears</h3>
                <button
                  type="button"
                  className="map-detail-close"
                  aria-label="Close selected pair details"
                  onClick={onClearSelection}
                >
                  <X size={14} />
                </button>
              </div>
              <p>
                Their approximate representative points are{" "}
                <strong>
                  {milesToUnit(selectedPair.distanceMiles ?? 0, unit).toFixed(
                    1,
                  )}{" "}
                  {unit}
                </strong>{" "}
                apart, inside this map’s {distanceValue} {unit} threshold.
              </p>
              <p>
                {selectedPair.gapDays === null
                  ? "The original milestone gap is unknown."
                  : `${selectedPair.gapDays.toLocaleString()} days between original milestones.`}
              </p>
              <p>
                {selectedPair.a.dateMeaning === "need_date"
                  ? "Need date"
                  : "Planned in-service date"}{" "}
                and{" "}
                {selectedPair.b.dateMeaning === "need_date"
                  ? " need date"
                  : " planned in-service date"}
                . Construction overlap is not established.
              </p>
              <div className="map-detail-sources">
                {[selectedPair.a, selectedPair.b].map((project) => (
                  <a
                    key={project.id}
                    href={sourceLink(
                      project.originalSource.url,
                      project.originalSource.page,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {project.originalSource.title} · p.{" "}
                    {project.originalSource.page}
                  </a>
                ))}
              </div>
            </article>
          )}
        </section>
      ) : (
        <button
          type="button"
          className="map-results-reopen"
          aria-label="Show map results"
          onClick={() => setResultsVisible(true)}
        >
          <ChevronDown size={15} />
          <span>Map results</span>
          <span className="map-results-count">{matches.length}</span>
        </button>
      )}
    </>
  );
}
