import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { readFile } from "node:fs/promises";
import {
  IMPORT_LIMITS,
  RequestGate,
  inspectXlsx,
  parseCsv,
  parseFile,
  parseMilestone,
  suggestMapping,
  validateImport,
} from "../src/lib/imports";
import type { Cell, ImportOptions, ParsedFile } from "../src/lib/imports";
import {
  applyOverrides,
  createDemoDataset,
  exportOverrides,
  validateOverride,
} from "../src/lib/datasets";
import type { ProjectOverride } from "../src/types";

const headers = [
  "project_id",
  "utility",
  "project_name",
  "endpoint_a_latitude",
  "endpoint_a_longitude",
  "endpoint_b_latitude",
  "endpoint_b_longitude",
  "milestone_date",
  "date_precision",
  "date_meaning",
];
const defaults: ImportOptions = {
  coordinateOrder: "lat_lon",
  dateFormat: "ISO",
  datePrecision: "unknown",
  dateMeaning: "unknown",
};
const row: Cell[] = [
  "DESC_3",
  "Utility A",
  "Unreviewed line",
  "32.3",
  "-81.2",
  "32.4",
  "-81.1",
  "2028",
  "year",
  "need_date",
];
const source = (rows: Cell[][] = [row]): ParsedFile => ({
  fileName: "projects.csv",
  sourceHash: "a".repeat(64),
  warnings: [],
  sheets: [{ name: "Projects", rows: [headers, ...rows] }],
});
const validate = (rows: Cell[][] = [row], options = defaults) =>
  validateImport(
    source(rows),
    "Projects",
    1,
    suggestMapping(headers),
    options,
    "2026-09-26T00:00:00.000Z",
  );
function xlsx(formula = false): ArrayBuffer {
  const contents = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Projects" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:A2"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>project_id</t></is></c></row><row r="2"><c r="A2" ${formula ? "" : 't="inlineStr"'}>${formula ? "<f>1+1</f><v>2</v>" : "<is><t>001</t></is>"}</c></row></sheetData></worksheet>`,
  };
  const bytes = zipSync(
    Object.fromEntries(
      Object.entries(contents).map(([key, value]) => [key, strToU8(value)]),
    ),
  );
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

describe("runtime file parsing and mapping", () => {
  it("parses quoted CSV without changing IDs, skips truly empty rows, and accepts the template", async () => {
    expect(parseCsv('id,name\r\n001,"Line, one"\r\n')[1]).toEqual([
      "001",
      "Line, one",
    ]);
    const bytes = await readFile(
      new URL("../public/templates/GridLock-projects.csv", import.meta.url),
    );
    const parsed = await parseFile(
      "template.csv",
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    const result = await validateImport(
      parsed,
      "CSV",
      1,
      suggestMapping(parsed.sheets[0].rows[0]),
      defaults,
    );
    expect(result.errorCount).toBe(0);
    expect(result.dataset?.projects).toHaveLength(3);
    expect(result.dataset?.projects[2].originalDate).toBeNull();
    expect(
      result.dataset?.projects[2].endpoints.every((e) => e.coordinate === null),
    ).toBe(true);
  });
  it("accepts exactly 25,000 CSV data rows with a trailing newline", async () => {
    const csv =
      "project_id,utility,project_name\n" +
      Array.from(
        { length: IMPORT_LIMITS.rows },
        (_, i) => `${i},Utility A,Project ${i}`,
      ).join("\n") +
      "\n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(IMPORT_LIMITS.rows + 1);
    const file = source();
    file.sheets[0].rows = rows;
    // Also cover readers that retain trailing empty rows: validation must not
    // reject the declared capacity or mutate the parsed source sheet.
    file.sheets[0].rows.push([""], [null, " "]);
    const result = await validateImport(
      file,
      "Projects",
      1,
      suggestMapping(rows[0]),
      defaults,
    );
    expect(result.dataset?.projects).toHaveLength(IMPORT_LIMITS.rows);
    expect(result.dataset?.projects.at(-1)?.sourceRow).toBe(
      IMPORT_LIMITS.rows + 1,
    );
    expect(file.sheets[0].rows).toHaveLength(IMPORT_LIMITS.rows + 3);
  });
  it("rejects 25,001 nonempty data rows even with a trailing newline", async () => {
    const rows = parseCsv(
      "project_id,utility,project_name\n" +
        Array.from(
          { length: IMPORT_LIMITS.rows + 1 },
          (_, i) => `${i},Utility A,Project ${i}`,
        ).join("\n") +
        "\n",
    );
    const file = source();
    file.sheets[0].rows = rows;
    await expect(
      validateImport(file, "Projects", 1, suggestMapping(rows[0]), defaults),
    ).rejects.toThrow(/more than 25,000 data rows/);
  });
  it("accepts header row 25 and 25,000 data rows without allocating trailing blank runs", async () => {
    const preamble = "\n".repeat(IMPORT_LIMITS.headerRows - 1);
    const data = Array.from(
      { length: IMPORT_LIMITS.rows },
      (_, i) => `${i},Utility A,Project ${i}`,
    ).join("\n");
    const rows = parseCsv(
      preamble +
        "project_id,utility,project_name\n" +
        data +
        "\n".repeat(100_000),
    );
    expect(rows).toHaveLength(IMPORT_LIMITS.rows + IMPORT_LIMITS.headerRows);
    expect(rows[0]).toEqual([""]);
    const file = source();
    file.sheets[0].rows = rows;
    const result = await validateImport(
      file,
      "Projects",
      IMPORT_LIMITS.headerRows,
      suggestMapping(rows[IMPORT_LIMITS.headerRows - 1]),
      defaults,
    );
    expect(result.dataset?.projects).toHaveLength(IMPORT_LIMITS.rows);
    expect(result.dataset?.projects[0].sourceRow).toBe(26);
    expect(result.dataset?.projects.at(-1)?.sourceRow).toBe(25_025);
    expect(() =>
      parseCsv(
        preamble +
          "project_id,utility,project_name\n" +
          data +
          "\n\nextra,Utility A,Extra",
      ),
    ).toThrow(/exceeds/);
  });
  it("preserves interior blank rows and source row numbers", async () => {
    const rows = parseCsv(
      "project_id,utility,project_name\n1,Utility A,First\n\n, ,\n2,Utility B,Second\n\n",
    );
    expect(rows).toHaveLength(5);
    expect(rows[2]).toEqual([""]);
    expect(rows[3]).toEqual(["", " ", ""]);
    const file = source();
    file.sheets[0].rows = rows;
    const result = await validateImport(
      file,
      "Projects",
      1,
      suggestMapping(rows[0]),
      defaults,
    );
    expect(result.skippedRows).toBe(2);
    expect(
      result.dataset?.projects.map((project) => project.sourceRow),
    ).toEqual([2, 5]);
  });
  it("parses real XLSX XML with the pinned worker-compatible library", async () => {
    const parsed = await parseFile("projects.xlsx", xlsx());
    expect(parsed.sheets.map((sheet) => sheet.name)).toEqual(["Projects"]);
    expect(parsed.sheets[0].rows[1][0]).toBe("001");
  });
  it("rejects malformed CSV, unsupported extensions, empty and oversized files", async () => {
    expect(() => parseCsv('id,name\n1,"not closed')).toThrow(
      /CSV parsing failed/,
    );
    await expect(parseFile("test.xls", new ArrayBuffer(5))).rejects.toThrow(
      /unsupported/,
    );
    await expect(parseFile("empty.csv", new ArrayBuffer(0))).rejects.toThrow(
      /empty/,
    );
    await expect(
      parseFile("large.csv", new ArrayBuffer(IMPORT_LIMITS.fileBytes + 1)),
    ).rejects.toThrow(/10 MiB/);
    await expect(
      parseFile("broken.xlsx", new Uint8Array([1, 2, 3]).buffer),
    ).rejects.toThrow();
    expect(() =>
      parseCsv(
        "id,name\n" +
          "1,test\n".repeat(IMPORT_LIMITS.rows + IMPORT_LIMITS.headerRows),
      ),
    ).toThrow(/exceeds/);
  });
  it("rejects XLSX formulas even with a cached value and mapped formula-like CSV cells", async () => {
    await expect(parseFile("formula.xlsx", xlsx(true))).rejects.toThrow(
      /formulas/,
    );
    const result = await validate([
      [...row.slice(0, 2), "=SUM(A1)", ...row.slice(3)],
    ]);
    expect(result.dataset).toBeNull();
    expect(
      result.issues.some((issue) => issue.message.includes("Formula-like")),
    ).toBe(true);
  });
  it("rejects inflated archives and distant worksheet dimensions before sheet-array parsing", () => {
    const bytes = zipSync({
      "xl/worksheets/sheet1.xml": strToU8(
        '<worksheet><dimension ref="A1:XFD1048576"/></worksheet>',
      ),
    });
    expect(() => inspectXlsx(bytes)).toThrow(/dimensions/);
    const expanded = zipSync({
      "large.xml": new Uint8Array(IMPORT_LIMITS.uncompressedBytes + 1),
    });
    expect(() => inspectXlsx(expanded)).toThrow(/expanded-size/);
  });
  it("keeps IDs namespaced and never attaches demo annotations", async () => {
    const a = (await validate()).dataset!;
    const b = await validateImport(
      { ...source(), sourceHash: "b".repeat(64) },
      "Projects",
      1,
      suggestMapping(headers),
      defaults,
    );
    expect(a.projects[0].id).toContain(`${a.id}::DESC_3`);
    expect(a.projects[0].id).not.toBe(b.dataset?.projects[0].id);
    expect(
      (a.projects[0] as { sourceProjectId?: string }).sourceProjectId,
    ).toBe("DESC_3");
    expect(a.projects[0].review.status).toBe("not_reviewed");
    expect(a.projects[0].review.sourceUrl).toBe("");
    expect(a.projects[0].originalDate).toBe("2028");
    expect(a.projects[0].sourceRow).toBe(2);
    expect(a.projects[0].sourceSheet).toBe("Projects");
  });
  it("rejects duplicates and required nulls without a partial acceptance", async () => {
    const result = await validate([row, row, [null, null, null]]);
    expect(result.validRows).toBe(1);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.dataset).toBeNull();
    expect(
      result.issues.some((issue) => issue.message.includes("Duplicate")),
    ).toBe(true);
    const nulls = await validate([
      ["X", "U", "N", null, null, null, null, null, "unknown", "unknown"],
    ]);
    expect(nulls.dataset?.projects[0].originalDate).toBeNull();
    expect(nulls.dataset?.projects[0].endpoints[0].coordinate).toBeNull();
  });
  it("uses explicit longitude/latitude order and rejects half pairs, bounds and dateline midpoint traps", async () => {
    const swapped = [
      "ID",
      "U",
      "N",
      "-81.2",
      "32.3",
      null,
      null,
      null,
      "unknown",
      "unknown",
    ];
    const result = await validate([swapped], {
      ...defaults,
      coordinateOrder: "lon_lat",
    });
    expect(result.dataset?.projects[0].endpoints[0].coordinate).toEqual([
      32.3, -81.2,
    ]);
    expect(
      (await validate([[...row.slice(0, 3), null, "-81.2", ...row.slice(5)]]))
        .dataset,
    ).toBeNull();
    expect(
      (await validate([[...row.slice(0, 3), "95", "0", ...row.slice(5)]]))
        .dataset,
    ).toBeNull();
    expect(
      (
        await validate([
          [...row.slice(0, 3), "10", "179", "11", "-179", ...row.slice(7)],
        ])
      ).issues.some((issue) => issue.message.includes("antimeridian")),
    ).toBe(true);
    expect(
      (
        await validate([
          [...row.slice(0, 3), "10", "179", null, null, ...row.slice(7)],
        ])
      ).dataset,
    ).not.toBeNull();
  });
  it("does not infer ambiguous dates or precision; retains exact month/year values", () => {
    expect(() => parseMilestone("03/04/2028", "day", "ISO")).toThrow();
    expect(parseMilestone("03/04/2028", "day", "MDY").date).toBe("2028-03-04");
    expect(parseMilestone("03/04/2028", "day", "DMY").date).toBe("2028-04-03");
    expect(parseMilestone("2028-02", "month", "ISO").date).toBe("2028-02");
    expect(parseMilestone("2028", "year", "ISO").date).toBe("2028");
    expect(() => parseMilestone("2028", "unknown", "ISO")).toThrow(/precision/);
    expect(() => parseMilestone("2027-02-29", "day", "ISO")).toThrow();
    expect(() => parseMilestone(45000, "day", "ISO")).toThrow(/serials/);
  });
  it("requires explicit mapping, supports header offsets, and avoids ambiguous aliases", async () => {
    expect(suggestMapping(["id", "project_id", "name"]).id).toBeUndefined();
    await expect(
      validateImport(source(), "Projects", 1, {}, defaults),
    ).rejects.toThrow(/Map/);
    const file = source();
    file.sheets[0].rows.unshift(["Report title"]);
    const result = await validateImport(
      file,
      "Projects",
      2,
      suggestMapping(headers),
      defaults,
    );
    expect(result.dataset?.projects[0].sourceRow).toBe(3);
  });
});

describe("immutable corrections and async request ownership", () => {
  it("ignores stale and canceled requests including pre-worker file reads", () => {
    const gate = new RequestGate();
    const a = gate.next();
    const b = gate.next();
    expect(gate.accepts(a)).toBe(false);
    expect(gate.accepts(b)).toBe(true);
    gate.cancel();
    expect(gate.accepts(b)).toBe(false);
    expect(gate.accepts(gate.next())).toBe(true);
  });
  it("preserves the complete source dataset, changes only relevant fingerprints, and resets reproducibly", async () => {
    const dataset = (await validate()).dataset!;
    const snapshot = JSON.stringify(dataset);
    const correction: ProjectOverride = {
      projectId: dataset.projects[0].id,
      reason: "Correct source typo",
      updatedAt: "2026-09-26T12:00:00Z",
      patch: { originalDate: "2029", datePrecision: "year" },
    };
    const effective = await applyOverrides(dataset, [correction]);
    expect(JSON.stringify(dataset)).toBe(snapshot);
    expect(effective.sourceHash).toBe(dataset.sourceHash);
    expect(effective.featureHash).not.toBe(dataset.featureHash);
    expect(effective.geometryVersion).toBe(dataset.geometryVersion);
    expect(effective.projects[0].review).toEqual(dataset.projects[0].review);
    effective.projects[0].endpoints[0].coordinate![0] = 0;
    expect(dataset.projects[0].endpoints[0].coordinate![0]).toBe(32.3);
    const reset = await applyOverrides(dataset, []);
    expect(reset.featureHash).toBe(dataset.featureHash);
    expect(reset.geometryVersion).toBe(dataset.geometryVersion);
    const moved = await applyOverrides(dataset, [
      {
        ...correction,
        patch: {
          endpoints: [
            { name: "A", coordinate: [33, -81] },
            { name: "B", coordinate: null },
          ],
        },
      },
    ]);
    expect(moved.geometryVersion).not.toBe(dataset.geometryVersion);
    expect(JSON.parse(exportOverrides(dataset, [correction])).sourceHash).toBe(
      dataset.sourceHash,
    );
    const demo = await createDemoDataset(dataset.projects, dataset.sourceHash);
    expect(demo.kind).toBe("demo");
  });
  it("rejects unknown project corrections, missing reasons, date precision mismatch and duplicate patches", async () => {
    const dataset = (await validate()).dataset!;
    const correction: ProjectOverride = {
      projectId: dataset.projects[0].id,
      reason: "",
      updatedAt: "2026-09-26",
      patch: { originalDate: "2028-12", datePrecision: "day" },
    };
    expect(validateOverride(dataset, correction)).toHaveLength(2);
    await expect(
      applyOverrides(dataset, [{ ...correction, projectId: "DESC_3" }]),
    ).rejects.toThrow(/does not belong/);
    const valid = { ...correction, reason: "A reason", patch: {} };
    await expect(applyOverrides(dataset, [valid, valid])).rejects.toThrow(
      /Duplicate correction/,
    );
  });
});
