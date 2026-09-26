import { expect, it } from "vitest";
import Papa from "papaparse";
import data from "../src/data/projects.json";
import type { Project } from "../src/types";
import { comparisonCsv, originalComparison, csvCell } from "../src/lib/exports";
import { compareProjects } from "../src/lib/comparisons";
import { createDemoDataset } from "../src/lib/datasets";
it("keeps original evidence when an override changes cross-company eligibility", () => {
  const source = data.slice(0, 2) as Project[];
  const effective = [
    source[0],
    { ...source[1], company: "Different", originalDate: "2030-01-01" },
  ];
  const pair = compareProjects(effective)[0];
  const original = originalComparison(
    pair,
    new Map(source.map((p) => [p.id, p])),
  );
  expect(original?.a).toBe(source[0]);
  expect(original?.b).toBe(source[1]);
  expect(original?.b.originalDate).not.toBe("2030-01-01");
});
it("exports true original and effective dates separately with explicit bounded scope", async () => {
  const source = await createDemoDataset(data as Project[], "fixture");
  const effective = {
    ...source,
    projects: source.projects.map((p) => ({
      ...p,
      originalDate: "2030-01-01",
    })),
  };
  const text = comparisonCsv(
    compareProjects(effective.projects).slice(0, 1),
    effective,
    source,
    "what_if",
    { DESC: 2 },
    false,
    "displayed bounded nearby results",
  );
  const row = Papa.parse<Record<string, string>>(text, { header: true })
    .data[0];
  expect(row.a_effective_date).toBe("2030-01-01");
  expect(row.a_source_date).not.toBe("2030-01-01");
  expect(row.search_complete).toBe("false");
  expect(row.export_scope).toContain("bounded");
  expect(csvCell("=SUM(A1)")).toBe('"\'=SUM(A1)"');
});
