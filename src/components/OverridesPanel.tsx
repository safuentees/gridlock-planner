import { useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@base-ui/react/button";
import { Download, RotateCcw } from "lucide-react";
import type {
  DateMeaning,
  DatePrecision,
  Project,
  ProjectOverride,
  RuntimeDataset,
} from "../types";
import {
  DATE_MEANINGS,
  DATE_PRECISIONS,
  exportOverrides,
  validateOverride,
} from "../lib/datasets";

export interface OverridesPanelProps {
  dataset: RuntimeDataset;
  overrides: ProjectOverride[];
  onChange: (overrides: ProjectOverride[]) => void;
  selectedProjectId?: string;
}
interface Draft {
  name: string;
  company: string;
  utility: string;
  date: string;
  precision: DatePrecision;
  meaning: DateMeaning;
  coordinates: string[][];
  reason: string;
}
function draftFor(project: Project, override?: ProjectOverride): Draft {
  const current = { ...project, ...override?.patch };
  return {
    name: current.name,
    company: current.company,
    utility: current.utility,
    date: current.originalDate ?? "",
    precision:
      current.datePrecision ?? (current.originalDate ? "day" : "unknown"),
    meaning: current.dateMeaning,
    coordinates: current.endpoints.map((e) =>
      e.coordinate ? e.coordinate.map(String) : ["", ""],
    ),
    reason: override?.reason ?? "",
  };
}
const control =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700";
export function OverridesPanel({
  dataset,
  overrides,
  onChange,
  selectedProjectId,
}: OverridesPanelProps) {
  const [projectId, setProjectId] = useState(
    selectedProjectId ?? dataset.projects[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const project =
    dataset.projects.find((item) => item.id === projectId) ??
    dataset.projects[0];
  const activeOverride = overrides.find(
    (item) => item.projectId === project?.id,
  );
  const [draft, setDraft] = useState<Draft | null>(() =>
    project ? draftFor(project, activeOverride) : null,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (
      selectedProjectId &&
      dataset.projects.some((p) => p.id === selectedProjectId)
    ) {
      setProjectId(selectedProjectId);
      setMessage("");
    }
  }, [selectedProjectId, dataset]);
  useEffect(() => {
    setDraft(project ? draftFor(project, activeOverride) : null);
    setErrors([]);
  }, [project, activeOverride]);
  const matches = useMemo(
    () =>
      dataset.projects.filter((item) =>
        `${item.name} ${item.company} ${item.id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [dataset, search],
  );
  const choices = matches.slice(0, 100);
  if (project && !choices.some((item) => item.id === project.id))
    choices.unshift(project);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    if (draft) setDraft({ ...draft, [key]: value });
    setErrors([]);
    setMessage("");
  };
  const apply = () => {
    if (!project || !draft) return;
    const coordinateErrors: string[] = [];
    const endpoints = project.endpoints.map((endpoint, index) => {
      const values = draft.coordinates[index] ?? ["", ""];
      if (values.every((value) => !value.trim()))
        return { ...endpoint, coordinate: null };
      if (
        values.some(
          (value) =>
            !value.trim() ||
            !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()),
        )
      )
        coordinateErrors.push(
          `Endpoint ${index + 1} needs two numeric coordinates or two empty fields.`,
        );
      return {
        ...endpoint,
        coordinate: values.map(Number) as [number, number],
      };
    });
    const override: ProjectOverride = {
      projectId: project.id,
      updatedAt: new Date().toISOString(),
      reason: draft.reason.trim(),
      patch: {
        name: draft.name.trim(),
        shortName:
          draft.name === project.name ? project.shortName : draft.name.trim(),
        company: draft.company.trim(),
        utility: draft.utility.trim(),
        endpoints,
        originalDate: draft.date.trim() || null,
        originalDateRaw: draft.date.trim() || null,
        datePrecision: draft.precision,
        dateMeaning: draft.meaning,
      },
    };
    const problems = [
      ...coordinateErrors,
      ...validateOverride(dataset, override),
    ];
    if (problems.length) {
      setErrors(problems);
      return;
    }
    onChange([
      ...overrides.filter((item) => item.projectId !== project.id),
      override,
    ]);
    setMessage(
      "Correction applied. Source values remain available in the original dataset.",
    );
  };
  const download = () => {
    try {
      const blob = new Blob([exportOverrides(dataset, overrides)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "GridLock-overrides.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Unable to export corrections.",
      ]);
    }
  };
  return (
    <section
      aria-labelledby="corrections-heading"
      className="min-w-0 rounded-xl border border-stone-300 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="corrections-heading" className="font-semibold">
            Corrections
          </h2>
          <p className="mt-1 text-pretty text-sm text-stone-600">
            Edit an effective record with a reason. Reset removes its correction
            and restores source values. Corrections are separate from what-if
            schedule shifts.
          </p>
        </div>
        <Button
          disabled={!overrides.length}
          onClick={download}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium disabled:opacity-40"
        >
          <Download size={14} />
          Export corrections ({overrides.length})
        </Button>
      </div>
      {!project || !draft ? (
        <p className="mt-3 text-sm">No projects are available to correct.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Find project
              <input
                type="search"
                className={control}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or utility"
              />
            </label>
            <label className="text-sm font-medium">
              Project
              <select
                className={control}
                value={project.id}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  setMessage("");
                }}
              >
                {choices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.company} · {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {matches.length > 100 && (
            <p className="mt-1 text-xs text-stone-500">
              Showing the first 100 matches; narrow the search to find another
              project.
            </p>
          )}
          <p className="mt-3 break-words text-xs text-stone-500">
            Source: {project.originalSource.title}.{" "}
            {activeOverride
              ? `Existing correction: ${activeOverride.reason}`
              : "No correction applied to this project."}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Project name
              <input
                className={control}
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <label className="text-sm">
              Company / filter label
              <input
                className={control}
                value={draft.company}
                onChange={(e) => update("company", e.target.value)}
              />
            </label>
            <label className="text-sm">
              Utility name
              <input
                className={control}
                value={draft.utility}
                onChange={(e) => update("utility", e.target.value)}
              />
            </label>
            <label className="text-sm">
              Milestone date
              <input
                className={control}
                value={draft.date}
                onChange={(e) => update("date", e.target.value)}
                placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              />
            </label>
            <label className="text-sm">
              Date precision
              <select
                className={control}
                value={draft.precision}
                onChange={(e) =>
                  update("precision", e.target.value as DatePrecision)
                }
              >
                {DATE_PRECISIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Date meaning
              <select
                className={control}
                value={draft.meaning}
                onChange={(e) =>
                  update("meaning", e.target.value as DateMeaning)
                }
              >
                {DATE_MEANINGS.map((meaning) => (
                  <option value={meaning} key={meaning}>
                    {meaning.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">
              Endpoint coordinates · WGS84 decimal degrees
            </legend>
            <p className="mt-1 text-xs text-stone-500">
              Leave both fields empty when an endpoint is unlocated. Two
              endpoints form an arithmetic midpoint proxy, not a verified route.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {project.endpoints.map((endpoint, index) => (
                <fieldset
                  key={index}
                  className="rounded-lg border border-stone-200 p-3"
                >
                  <legend className="px-1 text-xs font-medium">
                    {endpoint.name || `Endpoint ${index + 1}`}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {["Latitude", "Longitude"].map((label, coordinate) => (
                      <label key={label} className="text-xs">
                        {label}
                        <input
                          inputMode="decimal"
                          className={control}
                          value={draft.coordinates[index]?.[coordinate] ?? ""}
                          onChange={(e) => {
                            const next = draft.coordinates.map((pair) => [
                              ...pair,
                            ]);
                            next[index][coordinate] = e.target.value;
                            update("coordinates", next);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </fieldset>
          <label className="mt-3 block text-sm font-medium">
            Reason for correction
            <textarea
              rows={2}
              className={control}
              value={draft.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="Describe the source or correction being applied"
            />
          </label>
          {!!errors.length && (
            <ul
              role="alert"
              className="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          )}
          {message && (
            <p role="status" className="mt-2 text-sm text-emerald-800">
              {message}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={apply}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Apply correction
            </Button>
            <AlertDialog.Root>
              <AlertDialog.Trigger
                disabled={!activeOverride}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                <RotateCcw size={14} />
                Reset this project
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-stone-900/40" />
                <AlertDialog.Popup className="data-confirm fixed inset-0 z-50 m-auto h-fit max-h-dvh w-full max-w-md overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
                  <AlertDialog.Title className="text-lg font-semibold">
                    Remove this correction?
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-2 text-sm text-stone-600">
                    This restores the original source values for this project.
                    Export corrections first if you want to keep this change.
                  </AlertDialog.Description>
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <AlertDialog.Close className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
                      Keep correction
                    </AlertDialog.Close>
                    <AlertDialog.Close
                      onClick={() => {
                        onChange(
                          overrides.filter(
                            (item) => item.projectId !== project.id,
                          ),
                        );
                        setDraft(draftFor(project));
                        setErrors([]);
                        setMessage(
                          "Correction removed; original source values restored.",
                        );
                      }}
                      className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white"
                    >
                      Remove correction
                    </AlertDialog.Close>
                  </div>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>
        </>
      )}
    </section>
  );
}
