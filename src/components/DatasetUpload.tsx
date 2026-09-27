import { lazy, Suspense, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@base-ui/react/button";
import { Download, Upload, X } from "lucide-react";
import type { RuntimeDataset } from "../types";

const ImportWizard = lazy(() =>
  import("./ImportWizard").then((m) => ({ default: m.ImportWizard })),
);
const button =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:opacity-50";

/** One shared picker; closing preserves its draft, accepting replaces the workspace. */
export function DatasetUpload({
  source,
  hasCorrections,
  onAccept,
  triggerRef,
}: {
  source: RuntimeDataset;
  hasCorrections: boolean;
  onAccept: (dataset: RuntimeDataset) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [pending, setPending] = useState<RuntimeDataset | null>(null);
  const replace = (next: RuntimeDataset) => {
    setPending(null);
    setOpen(false);
    onAccept(next);
  };
  const choose = (next: RuntimeDataset) => {
    if (source.projects.length > 0 || hasCorrections) setPending(next);
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
      <Dialog.Trigger
        ref={triggerRef}
        aria-label="Upload dataset"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-900"
      >
        <Upload size={16} aria-hidden="true" />
        <span className="sm:hidden">Upload</span>
        <span className="hidden sm:inline">Upload dataset</span>
      </Dialog.Trigger>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-900/30 data-[closed]:hidden" />
        <Dialog.Popup className="data-dialog fixed inset-0 z-50 m-auto flex h-fit max-h-dvh w-full max-w-xl flex-col overflow-hidden border border-stone-200 bg-white shadow-lg data-[closed]:hidden sm:rounded-xl">
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 p-4">
            <div>
              <Dialog.Title className="text-balance text-lg font-semibold">
                Upload dataset
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-pretty text-sm text-stone-600">
                Choose a CSV or Excel file to populate the map.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close upload dataset"
              className="rounded-lg p-2 hover:bg-stone-100"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto p-4">
            {visited && (
              <Suspense
                fallback={
                  <p role="status" className="text-sm">
                    Preparing file picker…
                  </p>
                }
              >
                <ImportWizard
                  compact
                  autoImport
                  active={open}
                  onAccept={choose}
                />
              </Suspense>
            )}
            <a
              href="/templates/GridLock-10-project-sample.csv"
              download
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50"
            >
              <Download size={16} aria-hidden="true" />
              Download 10-project sample
            </a>
            <p className="text-xs text-stone-500">
              Historical sample · Dominion and Georgia Power. Files stay in this
              browser session.
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
                  source files stay unchanged.
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
