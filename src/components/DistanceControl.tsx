import { useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Slider } from "@base-ui/react/slider";
import { Pencil } from "lucide-react";
import { milesFromUnit, milesToUnit } from "../lib/comparisons";
import {
  distanceAtSliderPosition,
  distanceLabel,
  distanceSliderPosition,
  maxDistance,
  parseDistanceEntry,
  type DistanceUnit,
} from "../lib/distanceControl";
import { cn } from "../lib/cn";

export function DistanceControl({
  embedded = false,
  miles,
  unit,
  onChange,
  onUnitChange,
}: {
  embedded?: boolean;
  miles: number;
  unit: DistanceUnit;
  onChange: (miles: number) => void;
  onUnitChange: (unit: DistanceUnit) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const value = milesToUnit(miles, unit);
  const max = maxDistance(unit);
  const edit = () => {
    setDraft(String(value));
    setInvalid(false);
    setEditing(true);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
  };
  const apply = () => {
    const next = parseDistanceEntry(draft, unit);
    if (next === null) {
      setInvalid(true);
      return;
    }
    onChange(next);
    setInvalid(false);
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };
  return (
    <section
      aria-label="Comparison distance"
      className={cn(
        "w-72 max-w-full",
        !embedded &&
          "rounded-xl border border-stone-200 bg-white p-3 shadow-sm",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <label id="distance-label" className="text-xs font-semibold">
          Distance limit
        </label>
        <div
          role="group"
          aria-label="Distance units"
          className="flex rounded-md bg-stone-100 p-0.5"
        >
          {(["km", "mi"] as const).map((u) => (
            <Button
              key={u}
              aria-pressed={unit === u}
              onClick={() => {
                onUnitChange(u);
                setEditing(false);
                setInvalid(false);
              }}
              className={cn(
                "rounded px-2 py-1 text-xs",
                unit === u && "bg-white font-semibold shadow-sm",
              )}
            >
              {u}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span
          onDoubleClick={edit}
          className="text-lg font-semibold tabular-nums"
          title="Double-click to edit"
        >
          {distanceLabel(miles, unit)} {unit}
        </span>
        <Button
          ref={editButton}
          onClick={edit}
          aria-label="Edit distance limit"
          className="rounded p-2 hover:bg-stone-100"
        >
          <Pencil size={14} />
        </Button>
      </div>
      {editing && (
        <form
          className="mt-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="flex gap-2">
            <input
              ref={input}
              aria-label={`Exact distance in ${unit}`}
              aria-invalid={invalid}
              aria-describedby="distance-entry-help"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm tabular-nums"
            />
            <Button
              type="submit"
              className="rounded bg-emerald-800 px-3 text-xs font-medium text-white"
            >
              Apply
            </Button>
            <Button
              aria-label="Cancel distance edit"
              onClick={() => {
                setEditing(false);
                setInvalid(false);
                requestAnimationFrame(() => editButton.current?.focus());
              }}
              className="text-xs underline"
            >
              Cancel
            </Button>
          </div>
          <p
            id="distance-entry-help"
            role={invalid ? "alert" : undefined}
            className="mt-1 text-xs text-stone-600"
          >
            {invalid ? "Not applied. " : ""}Enter a whole number from 0 to{" "}
            {Math.floor(max)} {unit}. Decimals are only from conversion.
          </p>
        </form>
      )}
      <Slider.Root
        value={distanceSliderPosition(value, unit)}
        min={0}
        max={Math.ceil(max)}
        step={1}
        onValueChange={(position) => {
          onChange(
            milesFromUnit(distanceAtSliderPosition(position, unit), unit),
          );
          setEditing(false);
          setInvalid(false);
        }}
      >
        <Slider.Control className="relative flex h-8 items-center">
          <Slider.Track className="h-1 w-full rounded bg-stone-200">
            <Slider.Indicator className="rounded bg-emerald-700" />
            <Slider.Thumb
              getAriaLabel={() => "Distance limit"}
              getAriaValueText={(_, position) =>
                `${distanceAtSliderPosition(position, unit).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${unit}`
              }
              className="size-5 rounded-full border-2 border-emerald-700 bg-white"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div
        aria-hidden="true"
        className="-mt-1 flex justify-between text-xs tabular-nums text-stone-500"
      >
        {[0, Math.floor(Math.ceil(max) / 2), max].map((n) => (
          <span key={n} className="border-t border-stone-300 pt-1">
            {n.toLocaleString("en-US", { maximumFractionDigits: 3 })}
          </span>
        ))}
      </div>
    </section>
  );
}
