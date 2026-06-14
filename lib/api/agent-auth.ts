import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentRow } from "@/lib/types/database";
import { AGENT_TOKEN_PREFIX } from "@/lib/game/constants";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a new agent token + its stored hash/prefix. Token shown once. */
export function generateAgentToken() {
  const token = AGENT_TOKEN_PREFIX + randomBytes(24).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    tokenPrefix: token.slice(0, 12),
  };
}

/**
 * Authenticate an agent request via the `Agent-Token` header.
 * Returns the agent row (looked up with the service-role client) or null.
 */
export async function authenticateAgent(req: NextRequest): Promise<AgentRow | null> {
  const token = req.headers.get("agent-token") || req.headers.get("Agent-Token");
  if (!token || !token.startsWith(AGENT_TOKEN_PREFIX)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("*")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error || !data) return null;
  return data as AgentRow;
}
