import { Slider } from "@base-ui/react/slider";
import { Button } from "@base-ui/react/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, timelineDistribution } from "../lib/timeline";

export function TimelineControl({
  distribution,
  range,
  onChange,
  assumed,
}: {
  distribution: ReturnType<typeof timelineDistribution>;
  range: [number, number];
  onChange: (range: [number, number]) => void;
  assumed: boolean;
}) {
  const { min, max, bins, unknown, imprecise, binSize } = distribution;
  const peak = Math.max(1, ...bins.map((b) => b.count));
  const roll = (direction: number) => {
    const width = range[1] - range[0];
    const start = Math.max(
      min,
      Math.min(max - width, range[0] + direction * 12),
    );
    onChange([start, start + width]);
  };
  return (
    <section
      aria-label="Planning timeline"
      className="border-b border-stone-200 bg-white px-5 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            {assumed ? "Assumed milestone window" : "Planned milestone window"}
          </h2>
          <p className="mt-1 text-sm tabular-nums text-stone-600">
            {monthLabel(range[0])} – {monthLabel(range[1])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Roll window back one year"
            disabled={range[0] <= min}
            onClick={() => roll(-1)}
            className="rounded border border-stone-200 p-2 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            onClick={() => onChange([min, max])}
            className="rounded border border-stone-200 px-3 py-2 text-xs"
          >
            All dates
          </Button>
          <Button
            aria-label="Roll window forward one year"
            disabled={range[1] >= max}
            onClick={() => roll(1)}
            className="rounded border border-stone-200 p-2 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div
        role="img"
        aria-label={`Milestone distribution, ${binSize === 1 ? "monthly" : "peak monthly count per " + binSize + "-month bin"}. ${bins.map((b) => `${monthLabel(b.from)}: ${b.count}`).join("; ")}.`}
        className="mt-4 flex h-12 items-end gap-0.5"
      >
        {bins.map((b) => (
          <div
            key={b.from}
            title={`${monthLabel(b.from)}${b.to > b.from ? " – " + monthLabel(b.to) : ""}: peak ${b.count}`}
            className={`min-w-0 flex-1 rounded-t-sm ${b.to >= range[0] && b.from <= range[1] ? "bg-emerald-600" : "bg-stone-200"}`}
            style={{ height: `${Math.max(3, (b.count / peak) * 100)}%` }}
          />
        ))}
      </div>
      <Slider.Root
        value={range}
        min={min}
        max={max}
        step={1}
        minStepsBetweenValues={0}
        thumbCollisionBehavior="none"
        onValueChange={(value) => onChange([value[0], value[1]])}
        className="mt-1 w-full"
      >
        <Slider.Control className="relative flex h-7 items-center">
          <Slider.Track className="h-1 w-full rounded-full bg-stone-200">
            <Slider.Indicator className="rounded-full bg-emerald-700" />
            <Slider.Thumb
              index={0}
              getAriaLabel={() => "Timeline start month"}
              getAriaValueText={(_, n) => monthLabel(n)}
              className="size-4 rounded-full border-2 border-emerald-700 bg-white"
            />
            <Slider.Thumb
              index={1}
              getAriaLabel={() => "Timeline end month"}
              getAriaValueText={(_, n) => monthLabel(n)}
              className="size-4 rounded-full border-2 border-emerald-700 bg-white"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="flex justify-between text-xs tabular-nums text-stone-500">
        <span>{monthLabel(min)}</span>
        <span>{monthLabel(max)}</span>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {binSize === 1
          ? "Monthly record coverage."
          : `Peak monthly coverage in ${binSize}-month bins.`}{" "}
        {imprecise > 0
          ? `${imprecise.toLocaleString()} imprecise dates span their possible months. `
          : ""}
        {unknown.toLocaleString()} unknown dates. This is milestone timing, not
        construction activity.
      </p>
    </section>
  );
}
