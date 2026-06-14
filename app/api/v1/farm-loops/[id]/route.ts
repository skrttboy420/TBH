import { ok, fail } from "@/lib/api/response";
import { getSessionUser } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { updateFarmLoopSchema } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

// RLS restricts these to the caller's own loop sets.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = updateFarmLoopSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ข้อมูลชุดฟาร์มไม่ถูกต้อง", parsed.error.flatten());
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("farm_loop_sets")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (!existing) return fail("NOT_FOUND", "ไม่พบชุดฟาร์มนี้");

  // name / description
  const setUpdates: { name?: string; description?: string | null } = {};
  if (parsed.data.name !== undefined) setUpdates.name = parsed.data.name;
  if (parsed.data.description !== undefined) setUpdates.description = parsed.data.description ?? null;
  if (Object.keys(setUpdates).length > 0) {
    const { error } = await supabase
      .from("farm_loop_sets")
      .update(setUpdates)
      .eq("id", params.id);
    if (error) return fail("INTERNAL", "แก้ไขชุดฟาร์มไม่สำเร็จ", error.message);
  }

  // steps: full replace (a plan edit restarts round counts; current → first step)
  if (parsed.data.steps !== undefined) {
    await supabase.from("farm_loop_sets").update({ current_step_id: null }).eq("id", params.id);
    await supabase.from("farm_loop_steps").delete().eq("set_id", params.id);
    const { data: steps, error } = await supabase
      .from("farm_loop_steps")
      .insert(
        parsed.data.steps.map((s, i) => ({
          set_id: params.id,
          user_id: user.id,
          stage_key: s.stageKey,
          target_rounds: s.targetRounds,
          sort_order: i,
        })),
      )
      .select("*");
    if (error || !steps) return fail("INTERNAL", "อัปเดตด่านไม่สำเร็จ", error?.message);
    const ordered = steps.slice().sort((a, b) => a.sort_order - b.sort_order);
    await supabase
      .from("farm_loop_sets")
      .update({ current_step_id: ordered[0]?.id ?? null })
      .eq("id", params.id);
  }

  // return fresh state
  const { data: set } = await supabase
    .from("farm_loop_sets")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  const { data: steps } = await supabase
    .from("farm_loop_steps")
    .select("*")
    .eq("set_id", params.id)
    .order("sort_order", { ascending: true });

  return ok({ set: set ? { ...set, steps: steps ?? [] } : null });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  const supabase = createClient();
  const { error } = await supabase.from("farm_loop_sets").delete().eq("id", params.id);
  if (error) return fail("INTERNAL", "ลบชุดฟาร์มไม่สำเร็จ", error.message);

  return ok({ deleted: true });
}
