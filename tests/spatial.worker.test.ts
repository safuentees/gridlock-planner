import { describe, expect, it, vi } from "vitest";
import type { Project } from "../src/types";
import type {
  SpatialWorkerRequest,
  SpatialWorkerResponse,
} from "../src/workers/spatial.worker";
import data from "../src/data/projects.json";

describe("spatial worker protocol", () => {
  it("cancels superseded work, rejects the wrong dataset and suppresses stale results", async () => {
    const messages: SpatialWorkerResponse[] = [];
    vi.stubGlobal("postMessage", (value: SpatialWorkerResponse) =>
      messages.push(value),
    );
    vi.stubGlobal("onmessage", null);
    try {
      await import("../src/workers/spatial.worker");
      const send = (message: SpatialWorkerRequest) =>
        (
          globalThis as unknown as {
            onmessage: (event: { data: SpatialWorkerRequest }) => void;
          }
        ).onmessage({ data: message });
      const projects = Array.from({ length: 1000 }, (_, i) => ({
        ...data[0],
        id: `p${i}`,
        company: i % 2 ? "A" : "B",
      })) as Project[];
      const query = {
        companies: ["A", "B"],
        from: "",
        to: "",
        includeUndated: true,
        thresholdMiles: 25,
        timeBudgetMs: 1000,
        maxCandidates: Infinity,
        maxNeighborsPerOrigin: Infinity,
      };
      send({
        type: "prepare",
        projects,
        datasetVersion: "dataset",
        geometryVersion: "geometry",
      });
      send({ type: "query", requestId: 1, datasetVersion: "dataset", query });
      send({
        type: "query",
        requestId: 2,
        datasetVersion: "dataset",
        query: { ...query, companies: [] },
      });
      await vi.waitFor(() =>
        expect(
          messages.some(
            (message) => message.type === "result" && message.requestId === 2,
          ),
        ).toBe(true),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(
        messages
          .filter((message) => message.type === "result")
          .map((message) => message.requestId),
      ).toEqual([2]);
      send({
        type: "query",
        requestId: 3,
        datasetVersion: "wrong-dataset",
        query,
      });
      expect(messages.find((message) => message.requestId === 3)?.type).toBe(
        "error",
      );
      send({ type: "query", requestId: 4, datasetVersion: "dataset", query });
      send({ type: "cancel", requestId: 4 });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(
        messages.some(
          (message) => message.type === "result" && message.requestId === 4,
        ),
      ).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
