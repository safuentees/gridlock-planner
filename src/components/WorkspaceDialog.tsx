import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

/** Stable, mounted secondary tools. Base UI owns dismissal and focus. */
export function WorkspaceDialog({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-stone-50">
        {icon}
        {label}
      </Dialog.Trigger>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-900/30 data-[closed]:hidden" />
        <Dialog.Popup className="data-dialog fixed inset-0 z-50 m-auto flex h-fit max-h-dvh w-full max-w-lg flex-col overflow-hidden border border-stone-200 bg-white shadow-lg data-[closed]:hidden sm:rounded-xl">
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 p-4">
            <Dialog.Title className="text-base font-semibold">
              {label}
            </Dialog.Title>
            <Dialog.Close
              aria-label={`Close ${label.toLowerCase()}`}
              className="rounded-lg p-2 hover:bg-stone-100"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto p-4">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
