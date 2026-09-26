export type Company = "DESC" | "GPC";
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
  dateMeaning: "planned_in_service" | "need_date";
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
