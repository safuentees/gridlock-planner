import { describe, expect, it } from "vitest";
import { relativeHeatMaximum } from "../src/lib/heatPresentation";

describe("relative heat presentation", () => {
  it("keeps isolated equal-weight records below the hot end of the scale", () => {
    expect(relativeHeatMaximum([])).toBe(3);
    expect(
      relativeHeatMaximum([
        [0, 0, 1],
        [200, 200, 1],
        [400, 400, 1],
      ]),
    ).toBe(3);
  });

  it("normalizes projected local concentrations while preserving aggregated record counts", () => {
    expect(
      relativeHeatMaximum([
        [1, 1, 2],
        [2, 2, 3],
        [200, 200, 1],
      ]),
    ).toBe(5);
    expect(
      relativeHeatMaximum([
        [1, 1, 500],
        [200, 200, 1],
      ]),
    ).toBe(500);
    const points = [
      [1, 1, 2],
      [2, 2, 3],
    ] as const;
    expect(relativeHeatMaximum(points)).toBe(5);
    // Zooming separates nearby projected cells, reducing their combined peak.
    expect(
      relativeHeatMaximum(points.map(([x, y, n]) => [x * 100, y * 100, n])),
    ).toBe(3);
    expect(points).toEqual([
      [1, 1, 2],
      [2, 2, 3],
    ]);
  });

  it("ignores non-finite or non-positive display inputs", () => {
    expect(
      relativeHeatMaximum([
        [NaN, 0, 100],
        [0, Infinity, 100],
        [0, 0, Infinity],
        [0, 0, -100],
      ]),
    ).toBe(3);
  });
});
