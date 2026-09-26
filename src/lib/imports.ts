import Papa from "papaparse";
import readXlsxFile from "read-excel-file/web-worker";
import { unzipSync, strFromU8 } from "fflate";
import type {
  Coordinate,
  DateMeaning,
  DatePrecision,
  Project,
  RuntimeDataset,
} from "../types";
import {
  DATE_MEANINGS,
  DATE_PRECISIONS,
  fingerprintProjects,
  sha256,
  validCalendarValue,
} from "./datasets";

export const IMPORT_LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  uncompressedBytes: 40 * 1024 * 1024,
  rows: 25_000,
  columns: 100,
  sheets: 20,
  cells: 1_000_000,
  headerRows: 25,
  issues: 100,
} as const;
export type Cell = string | number | boolean | Date | null;
export interface ImportSheet {
  name: string;
  rows: Cell[][];
}
export interface ParsedFile {
  fileName: string;
  sourceHash: string;
  sheets: ImportSheet[];
  warnings: string[];
}
export type ImportField =
  | "id"
  | "utility"
  | "name"
  | "state"
  | "aName"
  | "aFirst"
  | "aSecond"
  | "bName"
  | "bFirst"
  | "bSecond"
  | "date"
  | "precision"
  | "meaning";
export type ImportMapping = Partial<Record<ImportField, number>>;
export interface ImportOptions {
  coordinateOrder: "lat_lon" | "lon_lat";
  dateFormat: "ISO" | "MDY" | "DMY";
  datePrecision: DatePrecision;
  dateMeaning: DateMeaning;
}
export interface ImportIssue {
  row: number;
  field: string;
  message: string;
}
export interface ImportValidation {
  dataset: RuntimeDataset | null;
  preview: Project[];
  issues: ImportIssue[];
  errorCount: number;
  validRows: number;
  skippedRows: number;
  totalRows: number;
  warnings: string[];
}
export const FIELD_LABELS: Record<ImportField, string> = {
  id: "Project ID *",
  utility: "Utility / company *",
  name: "Project name *",
  state: "State",
  aName: "Endpoint A name",
  aFirst: "Endpoint A coordinate 1",
  aSecond: "Endpoint A coordinate 2",
  bName: "Endpoint B name",
  bFirst: "Endpoint B coordinate 1",
  bSecond: "Endpoint B coordinate 2",
  date: "Milestone date",
  precision: "Date precision",
  meaning: "Date meaning",
};
const aliases: Record<ImportField, string[]> = {
  id: ["id", "projectid", "projectnumber", "projectcode"],
  utility: ["utility", "company", "owner", "utilityname"],
  name: ["name", "projectname", "projectdescription", "description"],
  state: ["state"],
  aName: ["endpointa", "endpointaname", "substation1", "fromname"],
  aFirst: [
    "endpointalatitude",
    "latitude1",
    "lat1",
    "fromlatitude",
    "alatitude",
  ],
  aSecond: [
    "endpointalongitude",
    "longitude1",
    "lon1",
    "fromlongitude",
    "alongitude",
  ],
  bName: ["endpointb", "endpointbname", "substation2", "toname"],
  bFirst: ["endpointblatitude", "latitude2", "lat2", "tolatitude", "blatitude"],
  bSecond: [
    "endpointblongitude",
    "longitude2",
    "lon2",
    "tolongitude",
    "blongitude",
  ],
  date: ["date", "milestonedate", "planneddate", "inservicedate", "needdate"],
  precision: ["dateprecision", "precision"],
  meaning: ["datemeaning", "milestonetype"],
};
export function suggestMapping(headers: Cell[]): ImportMapping {
  const result: ImportMapping = {};
  for (const field of Object.keys(aliases) as ImportField[]) {
    const matches = headers.flatMap((header, i) =>
      aliases[field].includes(
        String(header ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ""),
      )
        ? [i]
        : [],
    );
    if (matches.length === 1) result[field] = matches[0];
  }
  return result;
}
/** Gate all async results, including File.arrayBuffer(), not just worker messages. */
export class RequestGate {
  private version = 0;
  next(): number {
    return ++this.version;
  }
  accepts(id: number): boolean {
    return id === this.version;
  }
  cancel(): void {
    this.version++;
  }
}
function bounds(rows: Cell[][]) {
  if (rows.length > IMPORT_LIMITS.rows + IMPORT_LIMITS.headerRows)
    throw new Error(
      `Sheet exceeds ${IMPORT_LIMITS.rows.toLocaleString()} data rows plus ${IMPORT_LIMITS.headerRows} header rows. Split the file; no rows were imported.`,
    );
  let cells = 0;
  for (const row of rows) {
    if (row.length > IMPORT_LIMITS.columns)
      throw new Error(`Sheet exceeds ${IMPORT_LIMITS.columns} columns.`);
    cells += row.length;
  }
  if (cells > IMPORT_LIMITS.cells)
    throw new Error(
      `Sheet exceeds ${IMPORT_LIMITS.cells.toLocaleString()} cells.`,
    );
}
export function parseCsv(text: string): Cell[][] {
  const rows: Cell[][] = [];
  let problem = "";
  Papa.parse<string[]>(text, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    step(result, parser) {
      // UndetectableDelimiter is harmless for a genuinely single-column file; required mapping still fails.
      const error = result.errors.find(
        (item) => item.code !== "UndetectableDelimiter",
      );
      if (error) problem = `CSV parsing failed: ${error.message}`;
      rows.push(result.data);
      if (
        rows.length > IMPORT_LIMITS.rows + IMPORT_LIMITS.headerRows ||
        result.data.length > IMPORT_LIMITS.columns ||
        problem
      )
        parser.abort();
    },
  });
  if (problem) throw new Error(problem);
  bounds(rows);
  return rows;
}
/** Inspect ZIP sizes and worksheet structure before the library allocates sheet arrays. */
export function inspectXlsx(bytes: Uint8Array): void {
  let total = 0;
  let files = 0;
  unzipSync(bytes, {
    filter(file) {
      total += file.originalSize;
      files++;
      if (total > IMPORT_LIMITS.uncompressedBytes || files > 1000)
        throw new Error(
          "XLSX archive exceeds the 40 MiB expanded-size or 1,000-entry limit.",
        );
      return false;
    },
  });
  const xmlFiles = unzipSync(bytes, {
    filter: (file) => /^xl\/worksheets\/[^/]+\.xml$/.test(file.name),
  });
  if (Object.keys(xmlFiles).length > IMPORT_LIMITS.sheets)
    throw new Error(`Workbook exceeds ${IMPORT_LIMITS.sheets} sheets.`);
  let cellCount = 0;
  for (const content of Object.values(xmlFiles)) {
    const xml = strFromU8(content);
    if (/<(?:[\w.-]+:)?f(?:\s|>|\/)/.test(xml))
      throw new Error(
        "XLSX formulas are not imported, including cached results. Export a values-only workbook or CSV first.",
      );
    for (const match of xml.matchAll(
      /<(?:[\w.-]+:)?c\b[^>]*\br=["']([A-Z]+)(\d+)["']/g,
    )) {
      const col = [...match[1]].reduce(
        (n, letter) => n * 26 + letter.charCodeAt(0) - 64,
        0,
      );
      if (
        col > IMPORT_LIMITS.columns ||
        Number(match[2]) > IMPORT_LIMITS.rows + IMPORT_LIMITS.headerRows
      )
        throw new Error(
          "Worksheet cell positions exceed the row/column limit; remove distant formatting or split the workbook.",
        );
      if (++cellCount > IMPORT_LIMITS.cells)
        throw new Error("Workbook exceeds the 1,000,000-cell limit.");
    }
    for (const match of xml.matchAll(
      /<(?:[\w.-]+:)?dimension\b[^>]*\bref=["'][^"']*?([A-Z]+)(\d+)["']/g,
    )) {
      const col = [...match[1]].reduce(
        (n, letter) => n * 26 + letter.charCodeAt(0) - 64,
        0,
      );
      if (
        col > IMPORT_LIMITS.columns ||
        Number(match[2]) > IMPORT_LIMITS.rows + IMPORT_LIMITS.headerRows
      )
        throw new Error("Worksheet dimensions exceed the row/column limit.");
    }
  }
}
export async function parseFile(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<ParsedFile> {
  if (buffer.byteLength === 0) throw new Error("The selected file is empty.");
  if (buffer.byteLength > IMPORT_LIMITS.fileBytes)
    throw new Error(
      "File exceeds the 10 MiB limit. Split it into smaller files.",
    );
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  let sheets: ImportSheet[];
  if (extension === "csv") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    sheets = [{ name: "CSV", rows: parseCsv(text.replace(/^\uFEFF/, "")) }];
  } else if (extension === "xlsx") {
    inspectXlsx(new Uint8Array(buffer));
    const parsed = await readXlsxFile(buffer, { trim: false });
    // v9.3.10 types list DateConstructor; the reader returns Date instances.
    sheets = parsed.map((sheet) => ({
      name: sheet.sheet,
      rows: sheet.data as unknown as Cell[][],
    }));
  } else
    throw new Error(
      "Choose a UTF-8 .csv or a values-only .xlsx file; legacy .xls files are unsupported.",
    );
  if (!sheets.length || sheets.length > IMPORT_LIMITS.sheets)
    throw new Error("Workbook must have 1–20 sheets.");
  sheets.forEach((sheet) => bounds(sheet.rows));
  return {
    fileName,
    sourceHash: await sha256(buffer),
    sheets,
    warnings: [
      "Imported records have no independent research review. Milestone dates are not construction intervals.",
    ],
  };
}
function textCell(cell: Cell | undefined): string {
  return cell instanceof Date
    ? cell.toISOString().slice(0, 10)
    : cell === null || cell === undefined
      ? ""
      : String(cell);
}
function blank(cell: Cell | undefined): boolean {
  return (
    cell === null ||
    cell === undefined ||
    (typeof cell === "string" && !cell.trim())
  );
}
export function parseMilestone(
  cell: Cell | undefined,
  precision: DatePrecision,
  format: ImportOptions["dateFormat"],
): { date: string | null; raw: string | null; precision: DatePrecision } {
  if (blank(cell)) return { date: null, raw: null, precision: "unknown" };
  const raw = textCell(cell);
  let date = raw.trim();
  if (precision === "unknown")
    throw new Error(
      "Nonempty date needs an explicit day, month, or year precision.",
    );
  if (cell instanceof Date) {
    if (Number.isNaN(cell.valueOf())) throw new Error("Invalid Excel date.");
    date = cell
      .toISOString()
      .slice(0, precision === "year" ? 4 : precision === "month" ? 7 : 10);
  } else if (precision === "day" && format !== "ISO") {
    const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
    if (!parts)
      throw new Error(
        `Expected ${format === "MDY" ? "MM/DD/YYYY" : "DD/MM/YYYY"}; mixed date formats are not inferred.`,
      );
    const month = format === "MDY" ? parts[1] : parts[2];
    const day = format === "MDY" ? parts[2] : parts[1];
    date = `${parts[3]}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (!validCalendarValue(date, precision))
    throw new Error(
      "Date does not match precision/format or is not a valid calendar date (1900–2200). Numeric Excel serials require date-formatted cells.",
    );
  return { date, raw, precision };
}
function endpoint(
  first: Cell | undefined,
  second: Cell | undefined,
  order: ImportOptions["coordinateOrder"],
): Coordinate | null {
  if (blank(first) && blank(second)) return null;
  if (blank(first) || blank(second))
    throw new Error("A coordinate pair needs both values or two empty cells.");
  const number = (value: Cell | undefined) => {
    if (
      (typeof value !== "string" && typeof value !== "number") ||
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
        String(value).trim(),
      )
    )
      throw new Error("Coordinates must be numeric decimal degrees.");
    return Number(value);
  };
  const [lat, lon] =
    order === "lat_lon"
      ? [number(first), number(second)]
      : [number(second), number(first)];
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new Error(
      "Coordinate outside latitude ±90 / longitude ±180; verify the selected order.",
    );
  return [lat, lon];
}
export async function validateImport(
  file: ParsedFile,
  sheetName: string,
  headerRow: number,
  mapping: ImportMapping,
  options: ImportOptions,
  importedAt = new Date().toISOString(),
): Promise<ImportValidation> {
  const sheet = file.sheets.find((item) => item.name === sheetName);
  if (!sheet) throw new Error("Choose a sheet from the parsed workbook.");
  if (
    !Number.isInteger(headerRow) ||
    headerRow < 1 ||
    headerRow > IMPORT_LIMITS.headerRows ||
    headerRow > sheet.rows.length
  )
    throw new Error("Header row must be a populated row in the first 25 rows.");
  if (
    !["lat_lon", "lon_lat"].includes(options.coordinateOrder) ||
    !["ISO", "MDY", "DMY"].includes(options.dateFormat) ||
    !DATE_PRECISIONS.includes(options.datePrecision) ||
    !DATE_MEANINGS.includes(options.dateMeaning)
  )
    throw new Error(
      "Choose valid coordinate order, date format, precision, and meaning.",
    );
  for (const field of ["id", "utility", "name"] as const)
    if (mapping[field] === undefined)
      throw new Error(`Map ${FIELD_LABELS[field]} before validating.`);
  const mapped = Object.values(mapping);
  if (
    mapped.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 0 ||
        value >= sheet.rows[headerRow - 1].length,
    )
  )
    throw new Error("Mapping refers to a missing column.");
  if (new Set(mapped).size !== mapped.length)
    throw new Error("Each source column may be mapped only once.");
  const datasetId = `upload-${await sha256(`${file.sourceHash}\n${sheetName}`)}`;
  const projects: Project[] = [];
  const seen = new Set<string>();
  const issues: ImportIssue[] = [];
  let errorCount = 0,
    skippedRows = 0;
  const issue = (row: number, field: string, message: string) => {
    errorCount++;
    if (issues.length < IMPORT_LIMITS.issues)
      issues.push({ row, field, message });
  };
  const rows = sheet.rows.slice(headerRow);
  if (rows.length > IMPORT_LIMITS.rows)
    throw new Error(
      `Selected header leaves more than ${IMPORT_LIMITS.rows.toLocaleString()} data rows. No rows were imported.`,
    );
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = headerRow + index + 1;
    if (row.every(blank)) {
      skippedRows++;
      continue;
    }
    const before = errorCount;
    const get = (field: ImportField) =>
      mapping[field] === undefined ? undefined : row[mapping[field]!];
    for (const field of Object.keys(mapping) as ImportField[])
      if (
        typeof get(field) === "string" &&
        String(get(field)).trimStart().startsWith("=")
      )
        issue(
          rowNumber,
          field,
          "Formula-like values are unsupported. Supply the literal value.",
        );
    const id = textCell(get("id")).trim();
    const utility = textCell(get("utility")).trim();
    const name = textCell(get("name")).trim();
    if (!id || !utility || !name)
      issue(
        rowNumber,
        "required",
        "Project ID, utility, and name are required.",
      );
    if (id.length > 256 || utility.length > 256 || name.length > 2000)
      issue(
        rowNumber,
        "required",
        "ID/utility exceeds 256 characters or project name exceeds 2,000 characters.",
      );
    if (seen.has(id))
      issue(
        rowNumber,
        "id",
        `Duplicate project ID: ${id}. IDs must be unique within the selected sheet.`,
      );
    seen.add(id);
    const precision = (textCell(get("precision")).trim() ||
      options.datePrecision) as DatePrecision;
    const meaning = (textCell(get("meaning")).trim() ||
      options.dateMeaning) as DateMeaning;
    if (!DATE_PRECISIONS.includes(precision))
      issue(rowNumber, "precision", "Use day, month, year, or unknown.");
    if (!DATE_MEANINGS.includes(meaning))
      issue(
        rowNumber,
        "meaning",
        "Use planned_in_service, need_date, planned_start, or unknown.",
      );
    let date: ReturnType<typeof parseMilestone> = {
      date: null,
      raw: null,
      precision: "unknown",
    };
    try {
      date = parseMilestone(get("date"), precision, options.dateFormat);
    } catch (error) {
      issue(rowNumber, "date", String((error as Error).message));
    }
    const coordinates: (Coordinate | null)[] = [];
    for (const key of ["a", "b"] as const) {
      try {
        coordinates.push(
          endpoint(
            get(`${key}First`),
            get(`${key}Second`),
            options.coordinateOrder,
          ),
        );
      } catch (error) {
        issue(
          rowNumber,
          `${key} coordinates`,
          String((error as Error).message),
        );
        coordinates.push(null);
      }
    }
    if (
      coordinates[0] &&
      coordinates[1] &&
      Math.abs(coordinates[0][1] - coordinates[1][1]) > 180
    )
      issue(
        rowNumber,
        "coordinates",
        "Two endpoints cross the antimeridian; arithmetic midpoint proxies are unsupported. Supply a defensible single representative point.",
      );
    if (before !== errorCount) continue;
    const project: Project & { sourceProjectId: string } = {
      id: `${datasetId}::${encodeURIComponent(id)}`,
      sourceProjectId: id,
      company: utility,
      utility,
      name,
      shortName: name,
      state: textCell(get("state")).trim(),
      endpoints: [
        {
          name: textCell(get("aName")).trim() || "Endpoint A",
          coordinate: coordinates[0],
        },
        {
          name: textCell(get("bName")).trim() || "Endpoint B",
          coordinate: coordinates[1],
        },
      ],
      originalDate: date.date,
      originalDateRaw: date.raw,
      datePrecision: date.precision,
      dateMeaning: meaning,
      sourceRow: rowNumber,
      sourceSheet: sheetName,
      originalSource: {
        title: `${file.fileName} · ${sheetName} · row ${rowNumber}`,
        url: "",
        page: 0,
        asOf: "Source publication date not supplied",
        dateNote: `User-mapped ${meaning.replaceAll("_", " ")}; ${date.precision} precision. Original file hash retained.`,
      },
      review: {
        scope: "Imported project description; not independently reviewed.",
        locationNote:
          "User-supplied endpoint proxies; route geometry not verified.",
        status: "not_reviewed",
        latestDate: null,
        latestDatePrecision: "unknown",
        dateNote: "No independently verified schedule or construction status.",
        sourceUrl: "",
        sourcePage: 0,
        warnings: [],
        reviewedOn: null,
        sourceAsOf: "Unknown",
      },
    };
    projects.push(project);
  }
  const unlocated = projects.filter((p) =>
    p.endpoints.every((e) => !e.coordinate),
  ).length;
  const undated = projects.filter((p) => !p.originalDate).length;
  const warnings = [
    ...file.warnings,
    `${unlocated} unlocated and ${undated} undated records. Unlocated records stay off the map.`,
  ];
  if (!projects.length && !errorCount)
    issue(headerRow, "rows", "No nonempty data rows follow this header.");
  const dataset: RuntimeDataset | null = errorCount
    ? null
    : {
        id: datasetId,
        name: `${file.fileName} · ${sheetName}`,
        kind: "upload",
        sourceHash: file.sourceHash,
        ...(await fingerprintProjects(projects)),
        projects,
        importedAt,
        sourceFileName: file.fileName,
        warnings,
      };
  return {
    dataset,
    preview: projects.slice(0, 10),
    issues,
    errorCount,
    validRows: projects.length,
    skippedRows,
    totalRows: rows.length - skippedRows,
    warnings,
  };
}
export type ImportWorkerRequest =
  | { requestId: number; type: "parse"; fileName: string; buffer: ArrayBuffer }
  | {
      requestId: number;
      type: "validate";
      sheetName: string;
      headerRow: number;
      mapping: ImportMapping;
      options: ImportOptions;
    };
export type ImportWorkerResponse =
  | {
      requestId: number;
      type: "parsed";
      sheets: { name: string; rowCount: number; preview: Cell[][] }[];
      sourceHash: string;
    }
  | { requestId: number; type: "validated"; result: ImportValidation }
  | { requestId: number; type: "error"; message: string };
