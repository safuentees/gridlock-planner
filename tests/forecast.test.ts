import { describe, expect, it } from "vitest";
import projects from "../src/data/projects.json";
import type { Project } from "../src/types";
import { applyOverrides, createDemoDataset } from "../src/lib/datasets";
import {
  FORECAST_TARGET,
  NO_FORECAST_REASON,
  getForecastAvailability,
  validateForecastManifest,
} from "../src/lib/forecast";
import type { ForecastManifest } from "../src/lib/forecast";
const setup = async () => {
  const dataset = await createDemoDataset(
    projects as Project[],
    "a".repeat(64),
  );
  const manifest: ForecastManifest = {
    schemaVersion: 1,
    target: FORECAST_TARGET,
    datasetId: dataset.id,
    datasetHash: dataset.sourceHash,
    featureHash: dataset.featureHash,
    forecastCutoff: "2026-09-26",
    modelVersion: "external-test-v1",
    records: [
      {
        projectId: dataset.projects[0].id,
        month: "2026-10",
        probability: 0.2,
        status: "available",
        reason: null,
      },
    ],
  };
  return { dataset, manifest };
};
describe("external activity forecast contract", () => {
  it("defaults to unavailable and does not turn planning snapshots into probabilities", async () => {
    const { dataset } = await setup();
    expect(getForecastAvailability(dataset)).toEqual({
      available: false,
      reason: NO_FORECAST_REASON,
      manifest: null,
    });
  });
  it("accepts structurally compatible available and reasoned unavailable project-month records", async () => {
    const { dataset, manifest } = await setup();
    expect(validateForecastManifest(manifest, dataset).ok).toBe(true);
    expect(getForecastAvailability(dataset, manifest).available).toBe(true);
    manifest.records[0] = {
      ...manifest.records[0],
      status: "unavailable",
      probability: null,
      reason: "Insufficient admissible evidence",
    };
    expect(validateForecastManifest(manifest, dataset).ok).toBe(true);
    expect(getForecastAvailability(dataset, manifest).available).toBe(false);
  });
  it("rejects unknown schema/fields/IDs, duplicate outcomes, invalid probabilities and past months", async () => {
    const { dataset, manifest } = await setup();
    for (const bad of [
      null,
      [],
      { ...manifest, schemaVersion: 2 },
      { ...manifest, target: "overlap" },
      { ...manifest, surprise: true },
      { ...manifest, forecastCutoff: "2026-02-30" },
      { ...manifest, records: [] },
    ])
      expect(validateForecastManifest(bad, dataset).ok).toBe(false);
    for (const patch of [
      { projectId: "missing" },
      { probability: -1 },
      { probability: 1.1 },
      { probability: Number.NaN },
      { probability: "0.2" },
      { month: "2026-09" },
      { month: "2026-13" },
      { status: "unavailable", probability: null, reason: "" },
    ])
      expect(
        validateForecastManifest(
          { ...manifest, records: [{ ...manifest.records[0], ...patch }] },
          dataset,
        ).ok,
      ).toBe(false);
    expect(
      validateForecastManifest(
        { ...manifest, records: [manifest.records[0], manifest.records[0]] },
        dataset,
      ).ok,
    ).toBe(false);
  });
  it("invalidates different uploads and corrected effective features, while reset restores compatibility", async () => {
    const { dataset, manifest } = await setup();
    expect(
      validateForecastManifest(manifest, { ...dataset, id: "upload-other" }).ok,
    ).toBe(false);
    expect(
      validateForecastManifest(manifest, {
        ...dataset,
        sourceHash: "b".repeat(64),
      }).ok,
    ).toBe(false);
    const effective = await applyOverrides(dataset, [
      {
        projectId: dataset.projects[0].id,
        updatedAt: "2026-09-26",
        reason: "Correct milestone",
        patch: { originalDate: "2029-12-31" },
      },
    ]);
    expect(getForecastAvailability(effective, manifest).available).toBe(false);
    expect(getForecastAvailability(effective, manifest).manifest).toBeNull();
    expect(
      validateForecastManifest(manifest, await applyOverrides(dataset, [])).ok,
    ).toBe(true);
  });
});
