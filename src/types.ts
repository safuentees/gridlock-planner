export type Company = string;
export type DatePrecision = "day" | "month" | "year" | "unknown";
export type DateMeaning =
  "planned_in_service" | "need_date" | "planned_start" | "unknown";
export type Coordinate = [number, number]; // latitude, longitude, WGS84
export interface Project {
  id: string;
  company: Company;
  utility: string;
  name: string;
  shortName: string;
  state: string;
  endpoints: { name: string; coordinate: Coordinate | null }[];
  originalDate: string | null; // ISO calendar date, original workbook value normalized
  originalDateRaw: string | null;
  dateMeaning: DateMeaning;
  datePrecision?: DatePrecision; // absent legacy values are exact ISO days
  sourceRow?: number;
  sourceProjectId?: string;
  sourceSheet?: string;
  originalSource: {
    title: string;
    url: string;
    page: number;
    asOf: string;
    dateNote: string;
  };
  review: {
    scope: string;
    locationNote: string;
    status: string;
    latestDate: string | null;
    latestDatePrecision: string;
    dateNote: string;
    sourceUrl: string;
    sourcePage: number;
    warnings: string[];
    reviewedOn?: string | null; // date of our review, not the source publication date
    sourceAsOf?: string; // source date with its meaning/precision; unknowns remain explicit
    statusSourceUrl?: string | null; // separate evidence when status and schedule sources differ
    statusSourcePage?: number | null;
    statusEvidenceDate?: string | null;
  };
}
export interface Comparison {
  id: string;
  a: Project;
  b: Project;
  aCenter: Coordinate | null;
  bCenter: Coordinate | null;
  distanceMiles: number | null;
  gapDays: number | null;
}
export interface Filters {
  companies: Company[];
  from: string;
  to: string;
  includeUndated: boolean;
}
export interface Scenario {
  targetYear: number;
  shifts: Record<Company, number>; // whole years; explicit user assumptions
  windowMonths: number;
}

/** Source records are immutable. Overrides and scenarios are separate layers. */
export interface RuntimeDataset {
  id: string;
  name: string;
  kind: "empty" | "demo" | "upload";
  sourceHash: string;
  featureHash: string;
  geometryVersion: string;
  projects: Project[];
  importedAt: string;
  sourceFileName?: string;
  warnings: string[];
}
export interface ProjectOverride {
  projectId: string;
  reason: string;
  updatedAt: string;
  patch: Partial<
    Pick<
      Project,
      | "name"
      | "shortName"
      | "company"
      | "utility"
      | "endpoints"
      | "originalDate"
      | "originalDateRaw"
      | "dateMeaning"
      | "datePrecision"
    >
  >;
}
export interface TimelineRange {
  from: string;
  to: string;
}
export type ExplorationMode = "planned" | "what_if" | "forecast";
