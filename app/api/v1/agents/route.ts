import { ok, created, fail } from "@/lib/api/response";
import { getSessionUser } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { generateAgentToken } from "@/lib/api/agent-auth";
import { createAgentSchema } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "id,name,status,token_prefix,agent_version,hostname,platform,last_seen_at,created_at",
    )
    .order("created_at", { ascending: false });
  if (error) return fail("INTERNAL", "ดึงรายการเครื่องไม่สำเร็จ", error.message);

  return ok({ agents: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ชื่อเครื่องไม่ถูกต้อง", parsed.error.flatten());
  }

  const supabase = createClient();
  const { token, tokenHash, tokenPrefix } = generateAgentToken();

  const { data, error } = await supabase
    .from("agents")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
    })
    .select("id,name,status,token_prefix,created_at")
    .maybeSingle();
  if (error || !data) return fail("INTERNAL", "สร้างเครื่องไม่สำเร็จ", error?.message);

  // The plaintext token is shown exactly once — the agent stores it locally.
  return created({ agent: data, token });
}
