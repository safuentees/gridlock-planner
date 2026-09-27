import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import projects from "../src/data/projects.json";
import { createEmptyDataset } from "../src/lib/datasets";
import {
  canAutoImport,
  parseFile,
  suggestMapping,
  validateImport,
} from "../src/lib/imports";
import { centerPoint, haversineMiles } from "../src/lib/comparisons";
import type { Project } from "../src/types";

const sampleBytes = () =>
  readFile(
    new URL(
      "../public/templates/GridLock-10-project-sample.csv",
      import.meta.url,
    ),
  );
const options = {
  coordinateOrder: "lat_lon",
  dateFormat: "ISO",
  datePrecision: "unknown",
  dateMeaning: "unknown",
} as const;
describe("empty start and downloadable sample", () => {
  it("starts with no implicit projects or source file", async () => {
    const empty = await createEmptyDataset();
    expect(empty.kind).toBe("empty");
    expect(empty.projects).toEqual([]);
    expect(empty.sourceFileName).toBeUndefined();
    expect(empty.featureHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("round-trips all ten original rows, endpoints and date meanings", async () => {
    const bytes = await sampleBytes();
    const file = await parseFile(
      "GridLock-10-project-sample.csv",
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    );
    const headers = file.sheets[0].rows[0];
    expect(canAutoImport(headers, 1)).toBe(true);
    const result = await validateImport(
      file,
      file.sheets[0].name,
      1,
      suggestMapping(headers),
      options,
    );
    expect(result.errorCount).toBe(0);
    expect(result.dataset?.projects).toHaveLength(10);
    const imported = result.dataset!.projects;
    for (const [i, project] of imported.entries()) {
      const original = projects[i] as Project;
      expect(project.name).toBe(original.name);
      expect(project.utility).toBe(original.utility);
      expect(project.endpoints).toEqual(original.endpoints);
      expect(project.originalDate).toBe(original.originalDate);
      expect(project.dateMeaning).toBe(original.dateMeaning);
      expect(centerPoint(project)).toEqual(centerPoint(original));
      expect(project.review.status).toBe("not_reviewed");
    }
    let nearby = 0;
    for (let i = 0; i < imported.length; i++)
      for (let j = i + 1; j < imported.length; j++) {
        if (
          imported[i].company !== imported[j].company &&
          haversineMiles(centerPoint(imported[i])!, centerPoint(imported[j])!) <
            25
        )
          nearby++;
      }
    expect(nearby).toBe(6);
  });
  it("requires manual mapping for ambiguous schemas or multiple sheets", async () => {
    const headers = (await sampleBytes())
      .toString()
      .split(/\r?\n/)[0]
      .split(",");
    expect(canAutoImport([...headers].reverse(), 1)).toBe(true);
    expect(canAutoImport(headers, 2)).toBe(false);
    expect(
      canAutoImport(
        headers.filter((h) => h !== "date_meaning"),
        1,
      ),
    ).toBe(false);
    expect(canAutoImport([...headers, "utility"], 1)).toBe(false);
    expect(
      canAutoImport(
        headers.map((h) => (h === "endpoint_a_latitude" ? "coordinate1" : h)),
        1,
      ),
    ).toBe(false);
  });
});
