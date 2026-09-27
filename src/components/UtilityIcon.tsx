import { Building2, UtilityPole, Zap } from "lucide-react";
import { cn } from "../lib/cn";

export type UtilityKind = "dominion" | "georgia" | "other";

export function utilityKind(company: string): UtilityKind {
  switch (company.trim().toUpperCase()) {
    case "DESC":
    case "DOMINION ENERGY SOUTH CAROLINA":
      return "dominion";
    case "GPC":
    case "GEORGIA POWER":
      return "georgia";
    default:
      return "other";
  }
}

export function utilityLabel(company: string): string {
  switch (utilityKind(company)) {
    case "dominion":
      return "Dominion Energy South Carolina";
    case "georgia":
      return "Georgia Power";
    default:
      return company || "Unknown utility";
  }
}

export function utilityShortLabel(company: string): string {
  return utilityKind(company) === "dominion"
    ? "Dominion Energy SC"
    : utilityLabel(company);
}

/** Shape and color both identify the utility; the adjoining label carries its name. */
export function UtilityIcon({
  company,
  className,
  size = 18,
}: {
  company: string;
  className?: string;
  size?: number;
}) {
  const kind = utilityKind(company);
  const Icon =
    kind === "dominion" ? UtilityPole : kind === "georgia" ? Zap : Building2;
  return (
    <Icon
      size={size}
      aria-hidden="true"
      className={cn(
        "shrink-0",
        kind === "dominion" && "text-blue-700",
        kind === "georgia" && "text-orange-700",
        kind === "other" && "text-slate-600",
        className,
      )}
    />
  );
}
