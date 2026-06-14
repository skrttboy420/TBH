import type { NextRequest } from "next/server";
import { authenticateAgent } from "@/lib/api/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";
import { commandUpdateSchema } from "@/lib/api/validation";
import { asJson } from "@/lib/api/helpers";
import type { CommandRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

// Agent reports progress on a command: acknowledged → completed | failed.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const agent = await authenticateAgent(req);
  if (!agent) return fail("UNAUTHORIZED", "โทเคนเอเจนต์ไม่ถูกต้อง");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = commandUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ข้อมูลอัปเดตคำสั่งไม่ถูกต้อง", parsed.error.flatten());
  }
  const u = parsed.data;

  const admin = createAdminClient();
  const { data: cmd } = await admin
    .from("commands")
    .select("id")
    .eq("id", params.id)
    .eq("agent_id", agent.id)
    .maybeSingle();
  if (!cmd) return fail("NOT_FOUND", "ไม่พบคำสั่งนี้");

  const update: Partial<CommandRow> = { status: u.status };
  if (u.result !== undefined) update.result = u.result === null ? null : asJson(u.result);
  if (u.error !== undefined) update.error = u.error;
  if (u.status === "completed" || u.status === "failed") {
    update.completed_at = new Date().toISOString();
  }

  const { data: updated, error } = await admin
    .from("commands")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();
  if (error) return fail("INTERNAL", "อัปเดตคำสั่งไม่สำเร็จ", error.message);

  return ok({ command: updated });
}
