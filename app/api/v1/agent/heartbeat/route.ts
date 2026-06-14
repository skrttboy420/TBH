import type { NextRequest } from "next/server";
import { authenticateAgent } from "@/lib/api/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";
import { heartbeatPayloadSchema } from "@/lib/api/validation";
import { asJson, dueCommands } from "@/lib/api/helpers";
import type { AgentRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return fail("UNAUTHORIZED", "โทเคนเอเจนต์ไม่ถูกต้อง");

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty heartbeat is allowed
  }
  const parsed = heartbeatPayloadSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ข้อมูล heartbeat ไม่ถูกต้อง", parsed.error.flatten());
  }
  const p = parsed.data;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const update: Partial<AgentRow> = { last_seen_at: now };
  if (p.status) update.status = p.status;
  if (p.agentVersion) update.agent_version = p.agentVersion;
  if (p.hostname) update.hostname = p.hostname;
  if (p.platform) update.platform = p.platform;
  if (p.metadata) update.metadata = asJson(p.metadata);
  await admin.from("agents").update(update).eq("id", agent.id);

  if (p.activity?.length) {
    await admin.from("activity_events").insert(
      p.activity.map((a) => ({
        agent_id: agent.id,
        user_id: agent.user_id,
        type: a.type,
        title: a.title,
        description: a.description ?? null,
        data: asJson(a.data ?? {}),
        ...(a.occurredAt ? { occurred_at: a.occurredAt } : {}),
      })),
    );
  }

  const commands = await dueCommands(admin, agent.id);
  const pendingIds = commands.filter((c) => c.status === "pending").map((c) => c.id);
  if (pendingIds.length) {
    await admin.from("commands").update({ status: "sent" }).in("id", pendingIds);
  }

  return ok({
    serverTime: now,
    agent: { id: agent.id, name: agent.name, status: p.status ?? agent.status },
    commands: commands.map((c) => (c.status === "pending" ? { ...c, status: "sent" } : c)),
  });
}
