import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import {
  prepareSpatialDataset,
  querySpatial,
  type PreparedSpatialDataset,
  type SpatialProgress,
  type SpatialQuery,
  type SpatialQueryResult,
} from "../lib/spatial";
import type {
  SpatialWorkerRequest,
  SpatialWorkerResponse,
} from "../workers/spatial.worker";

export function isCurrentSpatialResponse(
  response: Pick<SpatialWorkerResponse, "requestId" | "datasetVersion">,
  requestId: number,
  datasetVersion: string,
): boolean {
  return (
    response.requestId === requestId &&
    response.datasetVersion === datasetVersion
  );
}
export interface SpatialQueryState {
  status: "loading" | "ready" | "error";
  result: SpatialQueryResult | null;
  progress: SpatialProgress | null;
  error: string | null;
}

export interface ScopedSpatialState {
  inputKey: string;
  state: SpatialQueryState;
}
export function visibleSpatialState(
  stored: ScopedSpatialState,
  inputKey: string,
): SpatialQueryState {
  return stored.inputKey === inputKey
    ? stored.state
    : { status: "loading", result: null, progress: null, error: null };
}

/** Stable projects/version inputs let slider queries reuse the worker's index.
 * An old result is cleared immediately; both dataset and request IDs guard replies.
 */
export function useSpatialQuery(
  projects: Project[],
  versions: { datasetVersion: string; geometryVersion: string },
  query: SpatialQuery,
): SpatialQueryState & { cancel: () => void; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const queryKey = JSON.stringify(query);
  const inputKey = JSON.stringify([
    versions.datasetVersion,
    versions.geometryVersion,
    queryKey,
    attempt,
  ]);
  const [stored, setStored] = useState<ScopedSpatialState>({
    inputKey,
    state: { status: "loading", result: null, progress: null, error: null },
  });
  const worker = useRef<Worker | null>(null);
  const workerCreationError = useRef<string | null>(null);
  const latest = useRef({ requestId: 0, datasetVersion: "" });
  const preparedVersion = useRef("");
  const fallback = useRef<PreparedSpatialDataset | undefined>(undefined);
  const fallbackController = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    worker.current?.postMessage({
      type: "cancel",
      requestId: latest.current.requestId,
    } satisfies SpatialWorkerRequest);
    fallbackController.current?.abort();
    latest.current.requestId++;
    setStored({
      inputKey,
      state: {
        status: "ready",
        result: null,
        progress: null,
        error: "Query cancelled. Change a filter to run another search.",
      },
    });
  }, [inputKey]);
  useEffect(() => {
    workerCreationError.current = null;
    if (typeof Worker !== "undefined") {
      try {
        worker.current = new Worker(
          new URL("../workers/spatial.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch (error) {
        workerCreationError.current =
          error instanceof Error ? error.message : String(error);
      }
    }
    return () => {
      worker.current?.terminate();
      worker.current = null;
      fallbackController.current?.abort();
      preparedVersion.current = "";
    };
  }, [attempt]);
  useEffect(() => {
    const requestId = ++latest.current.requestId;
    const { datasetVersion, geometryVersion } = versions;
    latest.current.datasetVersion = datasetVersion;
    const setState = (state: SpatialQueryState) =>
      setStored({ inputKey, state });
    setState({ status: "loading", result: null, progress: null, error: null });
    const receive = (response: SpatialWorkerResponse) => {
      if (
        !isCurrentSpatialResponse(
          response,
          latest.current.requestId,
          latest.current.datasetVersion,
        )
      )
        return;
      if (response.type === "progress")
        setStored((old) =>
          old.inputKey === inputKey
            ? { ...old, state: { ...old.state, progress: response.progress } }
            : old,
        );
      else if (response.type === "result")
        setState({
          status: "ready",
          result: response.result,
          progress: response.result.diagnostics,
          error: null,
        });
      else
        setState({
          status: "error",
          result: null,
          progress: null,
          error: response.error,
        });
    };
    const activeWorker = worker.current;
    if (workerCreationError.current) {
      receive({
        type: "error",
        requestId,
        datasetVersion,
        error: workerCreationError.current,
      });
      return;
    }
    if (activeWorker) {
      activeWorker.onmessage = (event: MessageEvent<SpatialWorkerResponse>) =>
        receive(event.data);
      activeWorker.onerror = (event) =>
        receive({
          type: "error",
          requestId,
          datasetVersion,
          error: event.message || "Spatial worker failed",
        });
      const key = JSON.stringify([datasetVersion, geometryVersion]);
      if (preparedVersion.current !== key) {
        activeWorker.postMessage({
          type: "prepare",
          projects,
          datasetVersion,
          geometryVersion,
        } satisfies SpatialWorkerRequest);
        preparedVersion.current = key;
      }
      activeWorker.postMessage({
        type: "query",
        requestId,
        datasetVersion,
        query,
      } satisfies SpatialWorkerRequest);
      return () => {
        activeWorker.postMessage({
          type: "cancel",
          requestId,
        } satisfies SpatialWorkerRequest);
      };
    }
    // Tests/older browsers keep a functioning bounded path. Production browsers
    // use the worker; this fallback does not claim off-main-thread preparation.
    const controller = new AbortController();
    fallbackController.current = controller;
    try {
      fallback.current = prepareSpatialDataset(
        projects,
        versions,
        fallback.current,
      );
      void querySpatial(fallback.current, query, {
        signal: controller.signal,
        onProgress: (progress) =>
          receive({ type: "progress", requestId, datasetVersion, progress }),
      })
        .then((result) =>
          receive({ type: "result", requestId, datasetVersion, result }),
        )
        .catch((error: unknown) =>
          receive({
            type: "error",
            requestId,
            datasetVersion,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
    } catch (error) {
      receive({
        type: "error",
        requestId,
        datasetVersion,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return () => controller.abort();
    // The serialized query intentionally tracks value changes rather than object identity.
  }, [
    projects,
    versions.datasetVersion,
    versions.geometryVersion,
    queryKey,
    attempt,
  ]);
  // Passive effects have not necessarily run for the new inputs yet. Never
  // expose old pairs/counts/progress during that intervening render or paint.
  return { ...visibleSpatialState(stored, inputKey), cancel, retry };
}
