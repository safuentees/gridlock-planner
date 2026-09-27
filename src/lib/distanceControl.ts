import { milesFromUnit, milesToUnit } from "./comparisons";

export type DistanceUnit = "mi" | "km";
export const MAX_DISTANCE_KM = 250;
export const maxDistance = (unit: DistanceUnit) =>
  unit === "km" ? MAX_DISTANCE_KM : milesFromUnit(MAX_DISTANCE_KM, "km");

/** Unit changes never alter the physical threshold. Only explicit edits do. */
export function parseDistanceEntry(
  text: string,
  unit: DistanceUnit,
): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value <= maxDistance(unit)
    ? milesFromUnit(value, unit)
    : null;
}

// Whole-unit stops, plus the exact converted endpoint. The final shorter step
// occupies one slider stop so pointer dragging and End both reach the endpoint.
export function distanceSliderPosition(value: number, unit: DistanceUnit) {
  const max = maxDistance(unit);
  const whole = Math.floor(max);
  return value > whole && max !== whole
    ? whole + (value - whole) / (max - whole)
    : value;
}
export function distanceAtSliderPosition(position: number, unit: DistanceUnit) {
  const max = maxDistance(unit);
  const whole = Math.floor(max);
  return position > whole && max !== whole
    ? Math.min(max, whole + (position - whole) * (max - whole))
    : position;
}
export function distanceLabel(miles: number, unit: DistanceUnit) {
  return milesToUnit(miles, unit).toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}
