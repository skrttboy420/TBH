import { created, fail } from "@/lib/api/response";
import { getSessionUser, asJson } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { issueCommandSchema } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

// User issues a control command to one of their agents.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = issueCommandSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "คำสั่งไม่ถูกต้อง", parsed.error.flatten());
  }

  const supabase = createClient();
  // RLS makes only the owner's agent visible.
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (!agent) return fail("NOT_FOUND", "ไม่พบเครื่องนี้");

  const { data, error } = await supabase
    .from("commands")
    .insert({
      agent_id: params.id,
      user_id: user.id,
      command: parsed.data.command,
      params: asJson(parsed.data.params ?? {}),
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return fail("INTERNAL", "ส่งคำสั่งไม่สำเร็จ", error?.message);

  return created({ command: data });
}
