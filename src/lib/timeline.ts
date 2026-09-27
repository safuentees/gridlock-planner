import type { DateBounds } from "./temporal";

export const monthIndex = (time: number) => {
  const date = new Date(time);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};
export function monthISO(index: number) {
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}
export function monthLabel(index: number) {
  return new Date(`${monthISO(index)}-01T00:00:00Z`).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric", timeZone: "UTC" },
  );
}
export function monthEndISO(index: number) {
  const d = new Date(`${monthISO(index)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}
/** Difference-array histogram avoids expanding one imprecise date for every covered month. */
export function timelineDistribution(bounds: (DateBounds | null)[]) {
  let min = Infinity;
  let max = -Infinity;
  let unknown = 0;
  let imprecise = 0;
  for (const b of bounds) {
    if (!b) {
      unknown++;
      continue;
    }
    min = Math.min(min, monthIndex(b.start));
    max = Math.max(max, monthIndex(b.end));
    if (b.precision !== "day") imprecise++;
  }
  if (!Number.isFinite(min)) {
    min = 2026 * 12;
    max = min + 11;
  }
  if (min === max) {
    if (max === 9999 * 12 + 11) min--;
    else max++;
  }
  const delta = new Int32Array(max - min + 2);
  for (const b of bounds)
    if (b) {
      delta[monthIndex(b.start) - min]++;
      delta[monthIndex(b.end) - min + 1]--;
    }
  const monthly = new Int32Array(max - min + 1);
  let running = 0;
  for (let i = 0; i < monthly.length; i++) {
    running += delta[i];
    monthly[i] = running;
  }
  const binSize = Math.max(1, Math.ceil(monthly.length / 72));
  const bins: { from: number; to: number; count: number }[] = [];
  for (let i = 0; i < monthly.length; i += binSize) {
    let count = 0;
    for (let j = i; j < Math.min(i + binSize, monthly.length); j++)
      count = Math.max(count, monthly[j]);
    bins.push({
      from: min + i,
      to: Math.min(max, min + i + binSize - 1),
      count,
    });
  }
  return { min, max, bins, unknown, imprecise, binSize };
}
