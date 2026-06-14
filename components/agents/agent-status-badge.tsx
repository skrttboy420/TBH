import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/types/database";
import { STATUS_DOT, STATUS_LABELS, effectiveAgentStatus } from "@/lib/game/agent-status";

export function AgentStatusBadge({
  status,
  lastSeenAt,
  className,
}: {
  status: AgentStatus;
  lastSeenAt: string | null;
  className?: string;
}) {
  const effective = effectiveAgentStatus(status, lastSeenAt);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[effective])} />
      {STATUS_LABELS[effective]}
    </span>
  );
}
