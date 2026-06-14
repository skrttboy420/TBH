import { ok, fail } from "@/lib/api/response";
import { getSessionUser } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { generateAgentToken } from "@/lib/api/agent-auth";

export const dynamic = "force-dynamic";

// Rotates an agent's token (the old one stops working immediately).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  const supabase = createClient();
  const { token, tokenHash, tokenPrefix } = generateAgentToken();

  const { data, error } = await supabase
    .from("agents")
    .update({ token_hash: tokenHash, token_prefix: tokenPrefix, status: "offline" })
    .eq("id", params.id)
    .select("id,name,token_prefix")
    .maybeSingle();
  if (error) return fail("INTERNAL", "หมุนโทเคนไม่สำเร็จ", error.message);
  if (!data) return fail("NOT_FOUND", "ไม่พบเครื่องนี้");

  return ok({ agent: data, token });
}
