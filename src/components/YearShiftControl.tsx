import { useId, useState } from "react";

export function YearShiftControl({
  company,
  value,
  min,
  max,
  onChange,
}: {
  company: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const helpId = useId();
  const text = draft ?? String(value);
  const valid =
    /^-?\d+$/.test(text) &&
    Number.isSafeInteger(Number(text)) &&
    Number(text) >= min &&
    Number(text) <= max;
  return (
    <label className="text-xs">
      {company} year shift
      <input
        type="text"
        inputMode="text"
        value={text}
        aria-label={`${company} year shift`}
        aria-describedby={!valid ? helpId : undefined}
        aria-invalid={!valid}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (
            /^-?\d+$/.test(next) &&
            Number.isSafeInteger(Number(next)) &&
            Number(next) >= min &&
            Number(next) <= max
          )
            onChange(Number(next));
        }}
        onBlur={() => setDraft(null)}
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm tabular-nums"
      />
      {!valid && (
        <span id={helpId} role="alert" className="mt-1 block">
          Enter a whole year shift from {min} to {max}. Invalid edits are not
          applied.
        </span>
      )}
    </label>
  );
}
