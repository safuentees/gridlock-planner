import type { RuntimeDataset } from "../types";
import { validCalendarValue } from "./datasets";

export const FORECAST_TARGET =
  "documented_field_construction_activity_in_month" as const;
export const NO_FORECAST_REASON =
  "No defensible activity forecast is available. The supplied reports are planning snapshots without independently observed monthly construction outcomes or enough historical as-of versions for temporal evaluation.";
export interface ForecastRecord {
  projectId: string;
  month: string;
  probability: number | null;
  status: "available" | "unavailable";
  reason: string | null;
}
/** Manifest metadata applies to every record. Probabilities concern one known project-month. */
export interface ForecastManifest {
  schemaVersion: 1;
  target: typeof FORECAST_TARGET;
  datasetId: string;
  datasetHash: string; // immutable source-file SHA-256
  featureHash: string; // effective model inputs, including active corrections
  forecastCutoff: string; // last date of admissible evidence, YYYY-MM-DD
  modelVersion: string;
  records: ForecastRecord[];
}
export type ForecastValidation =
  | { ok: true; manifest: ForecastManifest; errors: [] }
  | { ok: false; errors: string[] };
const recordObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key)) &&
  keys.every((key) => key in value);
export function validateForecastManifest(
  input: unknown,
  dataset: RuntimeDataset,
): ForecastValidation {
  const errors: string[] = [];
  if (!recordObject(input))
    return { ok: false, errors: ["Forecast file must contain a JSON object."] };
  if (
    !exactKeys(input, [
      "schemaVersion",
      "target",
      "datasetId",
      "datasetHash",
      "featureHash",
      "forecastCutoff",
      "modelVersion",
      "records",
    ])
  )
    errors.push("Forecast manifest does not match schema version 1 fields.");
  if (input.schemaVersion !== 1 || input.target !== FORECAST_TARGET)
    errors.push(
      "Unsupported forecast schema or target; expected documented construction activity for a known project-month.",
    );
  if (
    input.datasetId !== dataset.id ||
    input.datasetHash !== dataset.sourceHash
  )
    errors.push(
      "Forecast source dataset identity/hash does not match the current upload.",
    );
  if (input.featureHash !== dataset.featureHash)
    errors.push(
      "Forecast feature hash does not match current effective records. New uploads or corrections require compatible results.",
    );
  if (!validCalendarValue(input.forecastCutoff, "day"))
    errors.push("Forecast cutoff must be a valid YYYY-MM-DD date.");
  if (
    typeof input.modelVersion !== "string" ||
    !input.modelVersion.trim() ||
    input.modelVersion.length > 256
  )
    errors.push(
      "A nonempty model version (maximum 256 characters) is required.",
    );
  if (
    !Array.isArray(input.records) ||
    !input.records.length ||
    input.records.length > 300_000
  )
    return {
      ok: false,
      errors: [...errors, "Forecast records must contain 1–300,000 entries."],
    };
  const known = new Set(dataset.projects.map((project) => project.id));
  const seen = new Set<string>();
  const cutoffMonth =
    typeof input.forecastCutoff === "string"
      ? input.forecastCutoff.slice(0, 7)
      : "";
  for (const [index, record] of input.records.entries()) {
    const prefix = `Record ${index + 1}: `;
    if (
      !recordObject(record) ||
      !exactKeys(record, [
        "projectId",
        "month",
        "probability",
        "status",
        "reason",
      ])
    ) {
      errors.push(`${prefix}invalid record schema.`);
      continue;
    }
    if (typeof record.projectId !== "string" || !known.has(record.projectId))
      errors.push(`${prefix}unknown project ID.`);
    if (
      !validCalendarValue(record.month, "month") ||
      typeof record.month !== "string" ||
      record.month <= cutoffMonth
    )
      errors.push(
        `${prefix}month must be a complete future calendar month after the cutoff month.`,
      );
    const key = JSON.stringify([record.projectId, record.month]);
    if (seen.has(key)) errors.push(`${prefix}duplicate project-month.`);
    seen.add(key);
    if (record.status === "available") {
      if (
        typeof record.probability !== "number" ||
        !Number.isFinite(record.probability) ||
        record.probability < 0 ||
        record.probability > 1
      )
        errors.push(`${prefix}probability must be finite and between 0 and 1.`);
      if (record.reason !== null)
        errors.push(
          `${prefix}available records use a null unavailable reason.`,
        );
    } else if (record.status === "unavailable") {
      if (
        record.probability !== null ||
        typeof record.reason !== "string" ||
        !record.reason.trim()
      )
        errors.push(
          `${prefix}unavailable records require null probability and a reason.`,
        );
    } else errors.push(`${prefix}status must be available or unavailable.`);
    if (errors.length >= 100) {
      errors.push("Further validation errors omitted.");
      break;
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    manifest: structuredClone(input) as unknown as ForecastManifest,
    errors: [],
  };
}
export function getForecastAvailability(
  dataset: RuntimeDataset,
  manifest?: ForecastManifest | null,
): { available: boolean; reason: string; manifest: ForecastManifest | null } {
  if (!manifest)
    return { available: false, reason: NO_FORECAST_REASON, manifest: null };
  const validation = validateForecastManifest(manifest, dataset);
  if (!validation.ok)
    return {
      available: false,
      reason: validation.errors.join(" "),
      manifest: null,
    };
  const available = manifest.records.some(
    (record) => record.status === "available",
  );
  return {
    available,
    reason: available
      ? "Compatible externally supplied results; schema compatibility does not establish calibration or model quality."
      : "The supplied forecast manifest marks every project-month unavailable.",
    manifest: validation.manifest,
  };
}
