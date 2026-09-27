import { useEffect, useRef, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Lightbulb } from "lucide-react";
import type { PairRecommendationContext } from "../lib/pairRecommendation";

export function PairRecommendation({
  context,
  disabled,
}: {
  context: PairRecommendationContext;
  disabled: boolean;
}) {
  // A changed evidence payload remounts the request owner and clears stale advice.
  const payload = JSON.stringify(context);
  return (
    <RecommendationRequest
      key={payload}
      payload={payload}
      disabled={disabled}
    />
  );
}
function RecommendationRequest({
  payload,
  disabled,
}: {
  payload: string;
  disabled: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const request = async () => {
    if (disabled || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/pair-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(25000),
        ]),
      });
      if (response.status === 429)
        throw new Error(
          "Too many suggestions. Please wait one minute and try again.",
        );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "The suggestion service is unavailable. Please try again shortly.",
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Suggestion unavailable; try again.",
        );
      if (
        typeof data.recommendation !== "string" ||
        !data.recommendation.trim()
      )
        throw new Error("No suggestion returned; try again.");
      if (!controller.signal.aborted) setAnswer(data.recommendation);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error && error.name === "Error"
            ? error.message
            : "Suggestion service unavailable; please try again shortly.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        pending.current = null;
      }
    }
  };
  return (
    <div className="space-y-1.5">
      <Button
        onClick={request}
        disabled={disabled || loading}
        title="Send this pair's dates and evidence to OpenAI for one suggested next step"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
      >
        <Lightbulb size={14} aria-hidden="true" />
        {loading ? "Thinking…" : answer ? "Suggest again" : "Suggest next step"}
      </Button>
      <p
        role="status"
        aria-live="polite"
        aria-busy={loading}
        className="text-pretty text-xs text-stone-700"
      >
        {!disabled && answer && (
          <>
            <span className="font-medium">AI suggestion: </span>
            {answer}
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="text-pretty text-xs text-stone-600">
          {error}
        </p>
      )}
    </div>
  );
}
