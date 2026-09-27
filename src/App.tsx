import { useEffect, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Network } from "lucide-react";
import projectData from "./data/projects.json";
import metadata from "./data/metadata.json";
import type { Project, ProjectOverride, RuntimeDataset } from "./types";
import { createDemoDataset, applyOverrides } from "./lib/datasets";
import { cn } from "./lib/cn";
import { DataTools } from "./components/DataTools";
import { DatasetUpload } from "./components/DatasetUpload";
import { PlanningWorkspace } from "./components/PlanningWorkspace";
const control =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40";
const PROJECTS = projectData as Project[];
export default function App() {
  const [dataset, setDataset] = useState<RuntimeDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptance, setAcceptance] = useState(0);
  const datasetRequest = useRef(0);
  const accept = (d: RuntimeDataset) => {
    datasetRequest.current++;
    setError(null);
    setDataset(d);
    setAcceptance((n) => n + 1);
  };
  const restore = () => {
    const requestId = ++datasetRequest.current;
    setError(null);
    void createDemoDataset(PROJECTS, metadata.workbookSha256)
      .then((next) => {
        if (requestId === datasetRequest.current) accept(next);
      })
      .catch((e) => {
        if (requestId === datasetRequest.current) setError(String(e));
      });
  };
  useEffect(restore, []);
  useEffect(() => {
    if (!acceptance) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById("dataset-title")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [acceptance]);
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {error && (
        <p role="alert" className="p-5">
          {error}
          <Button onClick={restore} className={cn(control, "ml-3")}>
            Try again
          </Button>
        </p>
      )}
      {dataset ? (
        <DatasetWorkspace
          key={`${dataset.id}:${acceptance}`}
          source={dataset}
          onAccept={accept}
          onRestore={restore}
        />
      ) : !error ? (
        <p role="status" className="p-8">
          Preparing the supplied examples…
        </p>
      ) : null}
    </div>
  );
}

function DatasetWorkspace({
  source,
  onAccept,
  onRestore,
}: {
  source: RuntimeDataset;
  onAccept: (d: RuntimeDataset) => void;
  onRestore: () => void;
}) {
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const uploadTrigger = useRef<HTMLButtonElement>(null);
  const [mapTools, setMapTools] = useState<HTMLDivElement | null>(null);
  const [overrides, setOverrides] = useState<ProjectOverride[]>([]);
  const [effective, setEffective] = useState(source);
  const [applying, setApplying] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    setApplying(true);
    setLayerError(null);
    void applyOverrides(source, overrides)
      .then((d) => {
        if (id === request.current) {
          setEffective(d);
          setApplying(false);
        }
      })
      .catch((e) => {
        if (id === request.current) {
          setLayerError(String(e));
          setApplying(false);
        }
      });
    return () => {
      request.current++;
    };
  }, [source, overrides]);
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-stone-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto">
          <Network
            className="hidden shrink-0 text-emerald-800 sm:block"
            size={24}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1
              id="dataset-title"
              tabIndex={-1}
              className="text-base font-semibold"
            >
              GridLock
            </h1>
            <p
              className="truncate text-xs tabular-nums text-stone-600"
              title={source.name}
            >
              {source.projects.length.toLocaleString()} projects ·{" "}
              {source.kind === "demo"
                ? "Historical sample"
                : "Uploaded dataset"}
              {overrides.length > 0 &&
                ` · ${overrides.length} corrections applied`}
            </p>
          </div>
        </div>
        <div className="ml-auto flex max-w-full items-center justify-end gap-1 sm:gap-2">
          <div
            ref={setMapTools}
            role="group"
            aria-label="Map tools"
            className="flex items-center gap-1 sm:gap-2"
          />
          <DataTools
            triggerRef={toolsTrigger}
            source={source}
            overrides={overrides}
            onChange={setOverrides}
            selectedProjectId={selectedProjectId}
            onChooseDataset={() => uploadTrigger.current?.click()}
          />
          <DatasetUpload
            triggerRef={uploadTrigger}
            source={source}
            hasCorrections={overrides.length > 0}
            onAccept={onAccept}
            onRestore={onRestore}
          />
        </div>
      </section>
      {layerError && (
        <p
          role="alert"
          className="mb-4 rounded border border-stone-300 bg-white p-3 text-sm"
        >
          {layerError}
        </p>
      )}
      {applying && (
        <p role="status" className="p-3 text-sm">
          Applying the separate correction layer…
        </p>
      )}
      <PlanningWorkspace
        toolContainer={mapTools}
        source={source}
        dataset={effective}
        overrides={overrides}
        onProjectFocus={setSelectedProjectId}
        onNeedData={() => uploadTrigger.current?.click()}
      />
    </main>
  );
}
