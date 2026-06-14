import type { NextRequest } from "next/server";
import { authenticateAgent } from "@/lib/api/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";
import { dueCommands } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

// Agent polls this for actionable commands (alternative to heartbeat-embedded).
export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return fail("UNAUTHORIZED", "โทเคนเอเจนต์ไม่ถูกต้อง");

  const admin = createAdminClient();
  const commands = await dueCommands(admin, agent.id);
  return ok({ serverTime: new Date().toISOString(), commands });
}
