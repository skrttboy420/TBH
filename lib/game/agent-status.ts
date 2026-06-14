import type { AgentStatus } from "@/lib/types/database";
import { AGENT_OFFLINE_AFTER_MS } from "./constants";

/** An agent is only "really" online if we heard from it recently. */
export function effectiveAgentStatus(
  status: AgentStatus,
  lastSeenAt: string | null,
): AgentStatus {
  if (!lastSeenAt) return "offline";
  if (Date.now() - new Date(lastSeenAt).getTime() > AGENT_OFFLINE_AFTER_MS) {
    return "offline";
  }
  return status;
}

export const STATUS_LABELS: Record<AgentStatus, string> = {
  offline: "ออฟไลน์",
  online: "ออนไลน์",
  farming: "กำลังฟาร์ม",
  error: "ผิดพลาด",
};

export const STATUS_DOT: Record<AgentStatus, string> = {
  offline: "bg-muted-foreground",
  online: "bg-emerald-400",
  farming: "bg-primary",
  error: "bg-destructive",
};
