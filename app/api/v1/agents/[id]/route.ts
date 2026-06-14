import { ok, fail } from "@/lib/api/response";
import { getSessionUser } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { renameAgentSchema } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

// RLS restricts these to the caller's own agents.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = renameAgentSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ชื่อเครื่องไม่ถูกต้อง", parsed.error.flatten());
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("agents")
    .update({ name: parsed.data.name })
    .eq("id", params.id)
    .select("id,name")
    .maybeSingle();
  if (error) return fail("INTERNAL", "เปลี่ยนชื่อไม่สำเร็จ", error.message);
  if (!data) return fail("NOT_FOUND", "ไม่พบเครื่องนี้");

  return ok({ agent: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  const supabase = createClient();
  const { error } = await supabase.from("agents").delete().eq("id", params.id);
  if (error) return fail("INTERNAL", "ลบเครื่องไม่สำเร็จ", error.message);

  return ok({ deleted: true });
}
