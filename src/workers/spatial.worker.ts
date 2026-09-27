import type { Project } from "../types";
import {
  prepareSpatialDataset,
  querySpatial,
  type PreparedSpatialDataset,
  type SpatialProgress,
  type SpatialQuery,
  type SpatialQueryResult,
} from "../lib/spatial";

export type SpatialWorkerRequest =
  | {
      type: "prepare";
      projects: Project[];
      datasetVersion: string;
      geometryVersion: string;
    }
  | {
      type: "query";
      requestId: number;
      datasetVersion: string;
      query: SpatialQuery;
    }
  | { type: "cancel"; requestId: number };
export type SpatialWorkerResponse =
  | {
      type: "progress";
      requestId: number;
      datasetVersion: string;
      progress: SpatialProgress;
    }
  | {
      type: "result";
      requestId: number;
      datasetVersion: string;
      result: SpatialQueryResult;
    }
  | { type: "error"; requestId: number; datasetVersion: string; error: string };

let prepared: PreparedSpatialDataset | undefined;
let preparationError: string | undefined;
let active: { requestId: number; controller: AbortController } | undefined;
const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SpatialWorkerRequest>) => void) | null;
  postMessage: (message: SpatialWorkerResponse) => void;
};
worker.onmessage = (event) => {
  const message = event.data;
  if (message.type === "cancel") {
    if (active?.requestId === message.requestId) active.controller.abort();
    return;
  }
  if (message.type === "prepare") {
    active?.controller.abort();
    try {
      prepared = prepareSpatialDataset(message.projects, message, prepared);
      preparationError = undefined;
    } catch (error) {
      prepared = undefined;
      preparationError = error instanceof Error ? error.message : String(error);
    }
    return;
  }
  active?.controller.abort();
  const controller = new AbortController();
  active = { requestId: message.requestId, controller };
  const { requestId, datasetVersion } = message;
  const post = (response: SpatialWorkerResponse) => {
    if (active?.requestId === requestId && !controller.signal.aborted)
      worker.postMessage(response);
  };
  if (!prepared || prepared.datasetVersion !== datasetVersion) {
    post({
      type: "error",
      requestId,
      datasetVersion,
      error: preparationError ?? "Dataset is not prepared",
    });
    return;
  }
  void querySpatial(prepared, message.query, {
    signal: controller.signal,
    onProgress: (progress) =>
      post({ type: "progress", requestId, datasetVersion, progress }),
  })
    .then((result) =>
      post({ type: "result", requestId, datasetVersion, result }),
    )
    .catch((error: unknown) =>
      post({
        type: "error",
        requestId,
        datasetVersion,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
};
