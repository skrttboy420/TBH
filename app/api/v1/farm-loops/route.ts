import { created, fail } from "@/lib/api/response";
import { getSessionUser } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { createFarmLoopSchema } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

// Create a farm loop set with its ordered steps. The first step becomes current.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = createFarmLoopSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ข้อมูลชุดฟาร์มไม่ถูกต้อง", parsed.error.flatten());
  }

  const supabase = createClient();
  const { data: set, error: setErr } = await supabase
    .from("farm_loop_sets")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .select("*")
    .maybeSingle();
  if (setErr || !set) return fail("INTERNAL", "สร้างชุดฟาร์มไม่สำเร็จ", setErr?.message);

  const { data: steps, error: stepErr } = await supabase
    .from("farm_loop_steps")
    .insert(
      parsed.data.steps.map((s, i) => ({
        set_id: set.id,
        user_id: user.id,
        stage_key: s.stageKey,
        target_rounds: s.targetRounds,
        sort_order: i,
      })),
    )
    .select("*");
  if (stepErr || !steps) {
    // best-effort rollback so we never leave an empty set behind
    await supabase.from("farm_loop_sets").delete().eq("id", set.id);
    return fail("INTERNAL", "เพิ่มด่านไม่สำเร็จ", stepErr?.message);
  }

  const ordered = steps.slice().sort((a, b) => a.sort_order - b.sort_order);
  const firstId = ordered[0]?.id ?? null;
  if (firstId) {
    await supabase
      .from("farm_loop_sets")
      .update({ current_step_id: firstId })
      .eq("id", set.id);
  }

  return created({ set: { ...set, current_step_id: firstId, steps: ordered } });
}
