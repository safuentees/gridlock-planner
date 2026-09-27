import { useEffect, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { cn } from "../lib/cn";
import { Upload, X } from "lucide-react";
import type { RuntimeDataset } from "../types";
import { DATE_MEANINGS, DATE_PRECISIONS } from "../lib/datasets";
import {
  FIELD_LABELS,
  IMPORT_LIMITS,
  RequestGate,
  suggestMapping,
} from "../lib/imports";
import type {
  Cell,
  ImportField,
  ImportMapping,
  ImportOptions,
  ImportValidation,
  ImportWorkerRequest,
  ImportWorkerResponse,
} from "../lib/imports";

const control =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700";
const button =
  "rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50";
type SheetPreview = { name: string; rowCount: number; preview: Cell[][] };
const display = (cell: Cell | undefined) =>
  cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? "");
export interface ImportWizardProps {
  onAccept: (dataset: RuntimeDataset) => void;
  onCancel?: () => void;
}
export function ImportWizard({ onAccept, onCancel }: ImportWizardProps) {
  const worker = useRef<Worker | null>(null);
  const gate = useRef(new RequestGate());
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [options, setOptions] = useState<ImportOptions>({
    coordinateOrder: "lat_lon",
    dateFormat: "ISO",
    datePrecision: "unknown",
    dateMeaning: "unknown",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportValidation | null>(null);
  useEffect(
    () => () => {
      gate.current.cancel();
      worker.current?.terminate();
    },
    [],
  );
  const invalidate = () => {
    gate.current.cancel();
    setResult(null);
    setError("");
    setBusy(false);
  };
  const post = (message: ImportWorkerRequest, transfer: Transferable[] = []) =>
    worker.current?.postMessage(message, transfer);
  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    worker.current?.terminate();
    worker.current = null;
    const requestId = gate.current.next();
    setSheets([]);
    setMapping({});
    setResult(null);
    setError("");
    setFileName(file.name);
    if (file.size > IMPORT_LIMITS.fileBytes) {
      setBusy(false);
      setError("File exceeds the 10 MiB limit.");
      return;
    }
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      if (!gate.current.accepts(requestId)) return;
      const instance = new Worker(
        new URL("../workers/import.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = instance;
      instance.onmessage = ({ data }: MessageEvent<ImportWorkerResponse>) => {
        if (!gate.current.accepts(data.requestId)) return;
        setBusy(false);
        if (data.type === "error") {
          setError(data.message);
          return;
        }
        if (data.type === "parsed") {
          setSheets(data.sheets);
          setSheetName(data.sheets[0].name);
          setHeaderRow(1);
          setMapping(suggestMapping(data.sheets[0].preview[0] ?? []));
        } else setResult(data.result);
      };
      instance.onerror = () => {
        if (worker.current === instance) {
          setBusy(false);
          setError(
            "Import worker stopped unexpectedly. Try a smaller values-only file.",
          );
        }
      };
      post({ type: "parse", requestId, fileName: file.name, buffer }, [buffer]);
    } catch (cause) {
      if (gate.current.accepts(requestId)) {
        setBusy(false);
        setError(
          cause instanceof Error ? cause.message : "Unable to read file.",
        );
      }
    }
  };
  const current = sheets.find((sheet) => sheet.name === sheetName);
  const headers = current?.preview[headerRow - 1] ?? [];
  const changeHeader = (name: string, row: number) => {
    invalidate();
    setSheetName(name);
    setHeaderRow(row);
    setMapping(
      suggestMapping(
        sheets.find((sheet) => sheet.name === name)?.preview[row - 1] ?? [],
      ),
    );
  };
  return (
    <section
      aria-labelledby="import-heading"
      className="min-w-0 rounded-xl border border-stone-300 bg-white p-4 sm:p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id="import-heading" className="text-lg font-semibold">
            Import project data
          </h2>
          <p className="mt-1 text-pretty text-sm text-stone-600">
            Choose a sheet, map its columns, and review every validation error
            before replacing the active dataset.
          </p>
        </div>
        <Button
          onClick={onCancel}
          aria-label="Back to workspace"
          className="rounded p-1.5 hover:bg-stone-100"
        >
          <X size={18} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
        <p>
          UTF-8 CSV or values-only XLSX · 10 MiB · up to 25,000 data rows · 100
          columns
        </p>
        <a
          href="/templates/GridLock-projects.csv"
          download
          className="font-medium text-emerald-800 underline"
        >
          Download CSV template
        </a>
      </div>
      <label className="mt-4 block text-sm font-medium">
        Project file
        <input
          type="file"
          accept=".csv,.xlsx"
          className={control}
          onChange={(event) => {
            void loadFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-sm text-stone-600"
      >
        {busy
          ? "Processing in a worker…"
          : fileName
            ? fileName
            : "Your file stays in this browser session."}
      </p>
      {busy && (
        <Button
          className={cn(button, "mt-2")}
          onClick={() => {
            worker.current?.terminate();
            worker.current = null;
            invalidate();
            setSheets([]);
            setError("Import canceled. Select a file to restart.");
          }}
        >
          Cancel processing
        </Button>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {!!sheets.length && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Sheet
              <select
                className={control}
                value={sheetName}
                onChange={(event) => changeHeader(event.target.value, 1)}
              >
                {sheets.map((sheet) => (
                  <option key={sheet.name} value={sheet.name}>
                    {sheet.name} ({sheet.rowCount} rows including header)
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Header row
              <select
                className={control}
                value={headerRow}
                onChange={(event) =>
                  changeHeader(sheetName, Number(event.target.value))
                }
              >
                {Array.from(
                  {
                    length: Math.min(
                      IMPORT_LIMITS.headerRows,
                      current?.rowCount ?? 0,
                    ),
                  },
                  (_, i) => (
                    <option key={i} value={i + 1}>
                      Row {i + 1}:{" "}
                      {display(current?.preview[i]?.[0]).slice(0, 45)}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Inspect source rows
            </summary>
            <div className="mt-2 max-h-56 overflow-auto rounded border border-stone-200">
              <table className="w-full text-left text-xs">
                <caption className="p-2 text-left text-stone-500">
                  Selected header and first five data rows. All selected-sheet
                  rows are validated.
                </caption>
                <tbody>
                  {current?.preview
                    .slice(headerRow - 1, headerRow + 5)
                    .map((row, i) => (
                      <tr key={i} className="border-t border-stone-100">
                        <th
                          scope="row"
                          className="sticky left-0 bg-stone-50 px-2 py-2 tabular-nums"
                        >
                          {headerRow + i}
                        </th>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="max-w-64 min-w-24 break-words px-2 py-2"
                          >
                            {display(cell).slice(0, 200)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
          <fieldset className="mt-4">
            <legend className="font-semibold">Interpretation</legend>
            <p className="mt-1 text-xs text-stone-500">
              Set these choices explicitly. Blank dates remain unknown.
              Month/year values retain their precision; no day is invented.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Coordinate order
                <select
                  className={control}
                  value={options.coordinateOrder}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      coordinateOrder: e.target
                        .value as ImportOptions["coordinateOrder"],
                    });
                  }}
                >
                  <option value="lat_lon">
                    1 = latitude, 2 = longitude (WGS84)
                  </option>
                  <option value="lon_lat">
                    1 = longitude, 2 = latitude (WGS84)
                  </option>
                </select>
              </label>
              <label className="text-sm">
                Text day-date format
                <select
                  className={control}
                  value={options.dateFormat}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      dateFormat: e.target.value as ImportOptions["dateFormat"],
                    });
                  }}
                >
                  <option value="ISO">YYYY-MM-DD (ISO)</option>
                  <option value="MDY">MM/DD/YYYY</option>
                  <option value="DMY">DD/MM/YYYY</option>
                </select>
              </label>
              <label className="text-sm">
                Default precision
                <select
                  className={control}
                  value={options.datePrecision}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      datePrecision: e.target
                        .value as ImportOptions["datePrecision"],
                    });
                  }}
                >
                  {DATE_PRECISIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Default date meaning
                <select
                  className={control}
                  value={options.dateMeaning}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      dateMeaning: e.target
                        .value as ImportOptions["dateMeaning"],
                    });
                  }}
                >
                  {DATE_MEANINGS.map((meaning) => (
                    <option key={meaning} value={meaning}>
                      {meaning.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="font-semibold">Column mapping</legend>
            <p className="mt-1 text-xs text-stone-500">
              Header aliases are suggestions. Verify them; each source column is
              used at most once. Coordinate columns are decimal degrees in the
              order chosen above.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(FIELD_LABELS) as ImportField[]).map((field) => (
                <label key={field} className="min-w-0 text-sm">
                  {FIELD_LABELS[field]}
                  <select
                    className={control}
                    value={mapping[field] ?? ""}
                    onChange={(event) => {
                      invalidate();
                      const next = { ...mapping };
                      if (event.target.value === "") delete next[field];
                      else next[field] = Number(event.target.value);
                      setMapping(next);
                    }}
                  >
                    <option value="">Not mapped</option>
                    {headers.map((header, index) => (
                      <option key={index} value={index}>
                        {index + 1}:{" "}
                        {display(header).slice(0, 70) || "(empty header)"}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            disabled={busy}
            className={cn(button, "mt-4 inline-flex items-center gap-2")}
            onClick={() => {
              const requestId = gate.current.next();
              setError("");
              setResult(null);
              setBusy(true);
              post({
                type: "validate",
                requestId,
                sheetName,
                headerRow,
                mapping,
                options,
              });
            }}
          >
            <Upload size={15} />
            Validate mapped rows
          </Button>
          {result && (
            <div className="mt-4 rounded-lg border border-stone-200 p-3">
              <p role="status" className="text-sm font-medium tabular-nums">
                {result.validRows.toLocaleString()} valid rows ·{" "}
                {result.errorCount.toLocaleString()} errors ·{" "}
                {result.skippedRows.toLocaleString()} empty rows skipped
              </p>
              {result.issues.length > 0 && (
                <>
                  <p className="mt-1 text-xs text-stone-600">
                    Fix source cells or mapping and validate again. No partial
                    dataset is accepted. Showing up to 100 errors.
                  </p>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-red-800">
                    {result.issues.map((issue, i) => (
                      <li key={i}>
                        Row {issue.row} · {issue.field}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-3 overflow-auto">
                <table className="w-full text-left text-xs">
                  <caption className="mb-2 text-left font-medium">
                    Normalized preview · first {result.preview.length} valid
                    records
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Project",
                        "Utility",
                        "Milestone / precision",
                        "Normalized latitude, longitude",
                      ].map((label) => (
                        <th key={label} className="border-b px-2 py-2">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((p) => (
                      <tr key={p.id}>
                        <td className="max-w-64 break-words px-2 py-2">
                          {p.name}
                        </td>
                        <td className="px-2 py-2">{p.utility}</td>
                        <td className="px-2 py-2 tabular-nums">
                          {p.originalDate ?? "Unknown"} · {p.datePrecision}
                          <br />
                          {p.dateMeaning.replaceAll("_", " ")}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {p.endpoints.map((endpoint, index) => (
                            <div key={index} className="whitespace-nowrap">
                              {index === 0 ? "A" : "B"}:{" "}
                              {endpoint.coordinate
                                ? endpoint.coordinate.join(", ")
                                : "Unlocated"}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.warnings.map((warning) => (
                <p key={warning} className="mt-2 text-xs text-stone-600">
                  {warning}
                </p>
              ))}
              <Button
                disabled={!result.dataset || busy}
                onClick={() => {
                  if (result.dataset) {
                    // The parent may ask before replacing an existing workspace.
                    // Keep this worker usable if that confirmation is cancelled;
                    // unmount cleanup terminates it after actual acceptance.
                    onAccept(result.dataset);
                  }
                }}
                className="mt-3 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Use this dataset
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
