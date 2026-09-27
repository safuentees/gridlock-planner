import { lazy, Suspense, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@base-ui/react/button";
import { ChevronDown, X } from "lucide-react";
import type { ProjectOverride, RuntimeDataset } from "../types";
import { OverridesPanel } from "./OverridesPanel";

const ImportWizard = lazy(() =>
  import("./ImportWizard").then((m) => ({ default: m.ImportWizard })),
);
const ExtractionReview = lazy(() =>
  import("./ExtractionReview").then((m) => ({ default: m.ExtractionReview })),
);
const toolSummary =
  "flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-3 text-sm focus-visible:outline-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden";
const button =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50";

export function DataTools({
  source,
  overrides,
  onChange,
  selectedProjectId,
  onAccept,
  onRestore,
  triggerRef,
}: {
  source: RuntimeDataset;
  overrides: ProjectOverride[];
  onChange: (overrides: ProjectOverride[]) => void;
  selectedProjectId: string | null;
  onAccept: (dataset: RuntimeDataset) => void;
  onRestore: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [reviewVisited, setReviewVisited] = useState(false);
  const [pending, setPending] = useState<RuntimeDataset | "demo" | null>(null);
  const replace = (next: RuntimeDataset | "demo") => {
    setPending(null);
    setOpen(false);
    if (next === "demo") onRestore();
    else onAccept(next);
  };
  const accept = (next: RuntimeDataset) => {
    if (source.kind === "upload" || overrides.length) setPending(next);
    else replace(next);
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setVisited(true);
      }}
    >
      <Dialog.Trigger ref={triggerRef} className={button}>
        Data tools
      </Dialog.Trigger>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-900/30 data-[closed]:hidden" />
        <Dialog.Popup className="data-dialog fixed inset-0 z-50 m-auto flex h-fit max-h-dvh w-full max-w-3xl flex-col overflow-hidden border border-stone-200 bg-white shadow-lg data-[closed]:hidden sm:rounded-xl">
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
            <div>
              <Dialog.Title className="text-balance text-lg font-semibold">
                Data tools
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-pretty text-sm text-stone-600">
                Manage the data in this workspace.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close data tools"
              className="rounded-lg p-2 hover:bg-stone-100"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto p-5">
            <div className="divide-y divide-stone-200">
              <details className="group py-1">
                <summary className={toolSummary}>
                  <span>
                    <span className="block font-medium">Import projects</span>
                    <span className="mt-1 block text-pretty text-stone-600">
                      Replace the current dataset with a CSV or Excel file.
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-stone-500 group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4">
                  {visited && (
                    <Suspense fallback={<p role="status">Loading importer…</p>}>
                      <ImportWizard
                        onAccept={accept}
                        onCancel={() => setOpen(false)}
                      />
                    </Suspense>
                  )}
                </div>
              </details>
              <details className="group py-1">
                <summary className={toolSummary}>
                  <span>
                    <span className="block font-medium">
                      Edit projects
                      {overrides.length > 0 && (
                        <span className="ml-2 font-normal tabular-nums text-stone-600">
                          ({overrides.length} edited)
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-pretty text-stone-600">
                      Correct project details while keeping the original values.
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-stone-500 group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4">
                  {visited && (
                    <OverridesPanel
                      dataset={source}
                      overrides={overrides}
                      onChange={onChange}
                      selectedProjectId={selectedProjectId ?? undefined}
                    />
                  )}
                </div>
              </details>
              <details
                className="group py-1"
                onToggle={(event) => {
                  if (event.currentTarget.open) setReviewVisited(true);
                }}
              >
                <summary className={toolSummary}>
                  <span>
                    <span className="block font-medium">
                      Review report data
                    </span>
                    <span className="mt-1 block text-pretty text-stone-600">
                      Check extracted values against the original reports.
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-stone-500 group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4">
                  {reviewVisited && (
                    <Suspense
                      fallback={<p role="status">Loading source review…</p>}
                    >
                      <ExtractionReview />
                    </Suspense>
                  )}
                </div>
              </details>
              <details className="group py-1">
                <summary className={toolSummary}>
                  <span>
                    <span className="block font-medium">View sources</span>
                    <span className="mt-1 block text-pretty text-stone-600">
                      Find source files and understand date and location limits.
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-stone-500 group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4 space-y-4 text-sm text-stone-600">
                  <p>
                    Dates are planning milestones, not observed construction.
                    Forecast estimates are unavailable because verified
                    construction outcomes are missing.
                  </p>
                  <p>
                    Map points use the center of supplied endpoints, or one
                    endpoint when only one is available. Distances are
                    approximate straight-line separation, not routes.
                  </p>
                  <p className="break-words">
                    <strong className="font-medium">Current source:</strong>{" "}
                    {source.name}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-xs">
                      Source fingerprint
                    </summary>
                    <p className="mt-2 break-all font-mono text-xs">
                      SHA-256: {source.sourceHash}
                    </p>
                  </details>
                  {source.kind === "demo" && (
                    <div className="flex flex-wrap gap-4 text-emerald-800">
                      <a
                        className="underline"
                        download
                        href="/sources/Projects_Overlaps.xlsx"
                      >
                        Download source workbook
                      </a>
                      <a
                        className="underline"
                        href="/sources/Dominion_2024-2028_Project_Descriptions.pdf"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Dominion report
                      </a>
                      <a
                        className="underline"
                        href="/sources/Georgia_Power_2025_IRP_Volume_3_PUBLIC_DISCLOSURE.pdf#page=177"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Georgia report
                      </a>
                    </div>
                  )}
                  <div>
                    <a
                      className="text-emerald-800 underline"
                      download
                      href="/data/full_report_catalog.json"
                    >
                      Download full report catalog
                    </a>
                    <p className="mt-1 text-xs">
                      Separate reference catalog. These records lack verified
                      locations and are not mapped.
                    </p>
                  </div>
                  {source.kind === "upload" && (
                    <Button
                      className={button}
                      onClick={() => setPending("demo")}
                    >
                      Restore supplied sample
                    </Button>
                  )}
                </div>
              </details>
            </div>
            <p className="mt-4 text-pretty text-xs text-stone-500">
              Imports, edits and review checks last until you reload. Download
              edits before leaving.
            </p>
          </div>
          <AlertDialog.Root
            open={pending !== null}
            onOpenChange={(value) => {
              if (!value) setPending(null);
            }}
          >
            <AlertDialog.Portal>
              <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-stone-900/40" />
              <AlertDialog.Popup className="data-confirm fixed inset-0 z-50 m-auto h-fit max-h-dvh w-full max-w-md overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
                <AlertDialog.Title className="text-balance text-lg font-semibold">
                  Replace this workspace?
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm text-stone-600">
                  This clears the current import, corrections, assumptions and
                  selection. Cancel to export anything you need first. Original
                  source files remain unchanged.
                </AlertDialog.Description>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <AlertDialog.Close className={button}>
                    Keep current workspace
                  </AlertDialog.Close>
                  <Button
                    className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white"
                    onClick={() => {
                      if (pending) replace(pending);
                    }}
                  >
                    Replace workspace
                  </Button>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
