import type { Coordinate, Project } from "../types";

export interface LocatedProject {
  project: Project;
  center: Coordinate;
}
export const MAP_MARKER_LIMIT = 1200;
export const HEAT_POINT_LIMIT = 5000;

/** Deterministic bounded map presentation. Every located record contributes heat weight. */
export function mapPresentation(
  projects: Project[],
  centers: ReadonlyMap<string, Coordinate | null>,
  selectedIds: string[] = [],
) {
  const located: LocatedProject[] = [];
  for (const project of projects) {
    const center = centers.get(project.id);
    if (center) located.push({ project, center });
  }
  const selected = new Set(selectedIds);
  const pinned = located.filter(({ project }) => selected.has(project.id));
  const stride = Math.max(
    1,
    Math.ceil(located.length / (MAP_MARKER_LIMIT - pinned.length)),
  );
  const markers = located
    .filter(
      ({ project }, index) => !selected.has(project.id) && index % stride === 0,
    )
    .slice(0, MAP_MARKER_LIMIT - pinned.length);
  markers.push(...pinned);
  let heat: [number, number, number][] = [];
  let cellDegrees = 0;
  if (located.length <= HEAT_POINT_LIMIT) {
    heat = located.map(({ center }) => [center[0], center[1], 1]);
  } else {
    // Coarsen until the presentation has bounded size; weights preserve record count.
    for (const size of [0.05, 0.25, 1, 4]) {
      const cells = new Map<
        string,
        { lat: number; lon: number; count: number }
      >();
      for (const {
        center: [lat, lon],
      } of located) {
        const key = `${Math.floor((lat + 90) / size)}:${Math.floor((lon + 180) / size)}`;
        const cell = cells.get(key) ?? { lat: 0, lon: 0, count: 0 };
        cell.lat += lat;
        cell.lon += lon;
        cell.count += 1;
        cells.set(key, cell);
      }
      if (cells.size <= HEAT_POINT_LIMIT || size === 4) {
        heat = [...cells.values()].map((c) => [
          c.lat / c.count,
          c.lon / c.count,
          c.count,
        ]);
        cellDegrees = size;
        break;
      }
    }
  }
  return { markers, heat, cellDegrees, locatedCount: located.length };
}
