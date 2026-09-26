import type {
  DateMeaning,
  DatePrecision,
  Project,
  ProjectOverride,
  RuntimeDataset,
} from "../types";

export const DATE_MEANINGS: DateMeaning[] = [
  "planned_in_service",
  "need_date",
  "planned_start",
  "unknown",
];
export const DATE_PRECISIONS: DatePrecision[] = [
  "day",
  "month",
  "year",
  "unknown",
];

/** Content hashes deliberately exclude presentation state, timestamps, and research annotations. */
export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function canonicalFeatures(projects: Project[]): string {
  return JSON.stringify(
    [...projects]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((p) => ({
        id: p.id,
        company: p.company,
        utility: p.utility,
        name: p.name,
        state: p.state,
        endpoints: p.endpoints.map((e) => ({
          name: e.name,
          coordinate: e.coordinate,
        })),
        date: p.originalDate,
        precision: p.datePrecision ?? (p.originalDate ? "day" : "unknown"),
        meaning: p.dateMeaning,
      })),
  );
}
export async function fingerprintProjects(projects: Project[]) {
  const [featureHash, geometryVersion] = await Promise.all([
    sha256(canonicalFeatures(projects)),
    sha256(
      JSON.stringify(
        [...projects]
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .map((p) => [p.id, p.endpoints.map((e) => e.coordinate)]),
      ),
    ),
  ]);
  return { featureHash, geometryVersion };
}
export async function createDemoDataset(
  projects: Project[],
  sourceHash: string,
): Promise<RuntimeDataset> {
  return {
    id: "gridlock-supplied-demo",
    name: "Supplied ten-project sample",
    kind: "demo",
    sourceHash,
    ...(await fingerprintProjects(projects)),
    projects: structuredClone(projects),
    importedAt: "2026-09-26T00:00:00.000Z",
    warnings: [],
  };
}
export function validCalendarValue(
  value: unknown,
  precision: unknown,
): boolean {
  if (value === null) return precision === "unknown";
  if (typeof value !== "string") return false;
  if (precision === "year")
    return (
      /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= 2200
    );
  if (precision === "month")
    return (
      /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
      Number(value.slice(0, 4)) >= 1900 &&
      Number(value.slice(0, 4)) <= 2200
    );
  if (precision !== "day" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value &&
    Number(value.slice(0, 4)) >= 1900 &&
    Number(value.slice(0, 4)) <= 2200
  );
}
export function validCoordinate(value: unknown): boolean {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.length === 2 &&
      value.every((x) => typeof x === "number" && Number.isFinite(x)) &&
      Math.abs(value[0]) <= 90 &&
      Math.abs(value[1]) <= 180)
  );
}
const patchKeys = new Set([
  "name",
  "shortName",
  "company",
  "utility",
  "endpoints",
  "originalDate",
  "originalDateRaw",
  "dateMeaning",
  "datePrecision",
]);
export function validateOverride(
  dataset: RuntimeDataset,
  override: ProjectOverride,
): string[] {
  const errors: string[] = [];
  const original = dataset.projects.find((p) => p.id === override.projectId);
  if (!original) errors.push("Project does not belong to this dataset.");
  if (typeof override.reason !== "string" || !override.reason.trim())
    errors.push("A correction reason is required.");
  if (
    typeof override.updatedAt !== "string" ||
    Number.isNaN(Date.parse(override.updatedAt))
  )
    errors.push("Correction timestamp is invalid.");
  if (
    !override.patch ||
    typeof override.patch !== "object" ||
    Array.isArray(override.patch)
  )
    return [...errors, "Correction patch must be an object."];
  if (Object.keys(override.patch).some((key) => !patchKeys.has(key)))
    errors.push("Unsupported correction field.");
  const effective = { ...original, ...override.patch };
  for (const key of ["name", "company", "utility", "shortName"] as const) {
    if (typeof effective[key] !== "string" || !effective[key]?.trim())
      errors.push(`${key} must be nonempty text.`);
  }
  if (!DATE_MEANINGS.includes(effective.dateMeaning!))
    errors.push("Choose a supported date meaning.");
  if (
    !validCalendarValue(
      effective.originalDate,
      effective.datePrecision ?? (effective.originalDate ? "day" : "unknown"),
    )
  )
    errors.push(
      "Date must match its stated precision (YYYY, YYYY-MM, or YYYY-MM-DD); an empty date uses unknown precision.",
    );
  if (
    effective.originalDateRaw !== null &&
    typeof effective.originalDateRaw !== "string"
  )
    errors.push("Raw date must be text or null.");
  if (
    !Array.isArray(effective.endpoints) ||
    effective.endpoints.length !== 2 ||
    effective.endpoints.some(
      (e) => !e || typeof e.name !== "string" || !validCoordinate(e.coordinate),
    )
  )
    errors.push(
      "Supply two endpoints, each with valid [latitude, longitude] or a missing coordinate pair.",
    );
  if (
    Array.isArray(effective.endpoints) &&
    effective.endpoints.length === 2 &&
    effective.endpoints.every(
      (e) => e && validCoordinate(e.coordinate) && e.coordinate,
    )
  ) {
    if (
      Math.abs(
        effective.endpoints[0].coordinate![1] -
          effective.endpoints[1].coordinate![1],
      ) > 180
    )
      errors.push(
        "Two endpoints crossing the antimeridian are unsupported by the arithmetic midpoint proxy. Supply a defensible single representative point instead.",
      );
  }
  return errors;
}
export async function applyOverrides(
  dataset: RuntimeDataset,
  overrides: ProjectOverride[],
): Promise<RuntimeDataset> {
  const ids = new Set<string>();
  for (const override of overrides) {
    if (ids.has(override.projectId))
      throw new Error(`Duplicate correction: ${override.projectId}`);
    ids.add(override.projectId);
    const errors = validateOverride(dataset, override);
    if (errors.length) throw new Error(errors.join(" "));
  }
  const patches = new Map(overrides.map((o) => [o.projectId, o.patch]));
  const projects = dataset.projects.map((project) =>
    structuredClone({ ...project, ...patches.get(project.id) }),
  );
  return {
    ...dataset,
    projects,
    ...(await fingerprintProjects(projects)),
    warnings: [...dataset.warnings],
  };
}
export function exportOverrides(
  dataset: RuntimeDataset,
  overrides: ProjectOverride[],
): string {
  for (const override of overrides) {
    const errors = validateOverride(dataset, override);
    if (errors.length) throw new Error(errors.join(" "));
  }
  return JSON.stringify(
    {
      schemaVersion: 1,
      datasetId: dataset.id,
      sourceHash: dataset.sourceHash,
      overrides,
    },
    null,
    2,
  );
}
