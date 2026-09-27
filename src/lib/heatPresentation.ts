/** Screen-space smoothing, independent of distance eligibility or work footprints. */
export const HEAT_RADIUS = 24;
export const HEAT_BLUR = 32;

/** Keep isolated records cool and normalize dense cells at the current zoom.
 * All source records retain equal weight; aggregated points retain their count.
 * Global projected pixels make the scale stable while panning at the same zoom.
 */
export function relativeHeatMaximum(
  projectedPoints: readonly (readonly [number, number, number])[],
): number {
  const cellSize = (HEAT_RADIUS + HEAT_BLUR) / 2;
  const cells = new Map<string, number>();
  let maximum = 3;
  for (const [x, y, weight] of projectedPoints) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(weight) ||
      weight <= 0
    )
      continue;
    const key = `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
    const total = (cells.get(key) ?? 0) + weight;
    cells.set(key, total);
    maximum = Math.max(maximum, total);
  }
  return maximum;
}
