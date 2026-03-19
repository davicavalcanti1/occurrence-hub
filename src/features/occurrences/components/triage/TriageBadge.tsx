import { cn } from "@/lib/utils";
import { TriageClassification, triageConfig } from "@/features/occurrences/types/occurrence";

interface TriageBadgeProps {
  triage: TriageClassification;
  size?: "sm" | "md";
  showPriority?: boolean;
}

export function TriageBadge({ triage, size = "md", showPriority = false }: TriageBadgeProps) {
  const config = triageConfig[triage];
  const isSentinela = triage === "evento_sentinela";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        isSentinela && "animate-pulse"
      )}
    >
      {showPriority ? `${config.priority} · ${config.label}` : config.label}
    </span>
  );
}
