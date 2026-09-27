import { describe, expect, it } from "vitest";
import { milesToUnit } from "../src/lib/comparisons";
import {
  distanceAtSliderPosition,
  distanceSliderPosition,
  maxDistance,
  parseDistanceEntry,
} from "../src/lib/distanceControl";

describe("physical distance control", () => {
  it("accepts whole-number entries including zero and rejects invalid edits", () => {
    expect(parseDistanceEntry("0", "mi")).toBe(0);
    expect(parseDistanceEntry("250", "km")).toBe(maxDistance("mi"));
    expect(parseDistanceEntry("155", "mi")).toBe(155);
    for (const text of ["", "12.5", "-1", "1e2", "no", "Infinity", "251"]) {
      expect(parseDistanceEntry(text, "km")).toBeNull();
    }
    expect(parseDistanceEntry("156", "mi")).toBeNull();
  });
  it("retains converted decimals and reaches both exact physical endpoints", () => {
    expect(milesToUnit(25, "km")).toBe(40.2336);
    expect(distanceSliderPosition(40.2336, "km")).toBe(40.2336);
    expect(distanceAtSliderPosition(0, "mi")).toBe(0);
    expect(distanceAtSliderPosition(156, "mi")).toBe(maxDistance("mi"));
    expect(distanceSliderPosition(maxDistance("mi"), "mi")).toBe(156);
    expect(
      distanceAtSliderPosition(distanceSliderPosition(155.2, "mi"), "mi"),
    ).toBeCloseTo(155.2, 12);
    expect(distanceAtSliderPosition(250, "km")).toBe(250);
  });
});
