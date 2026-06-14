import { ok, fail } from "@/lib/api/response";
import { getSessionUser } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";
import { farmLoopProgressSchema } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

// Live loop controls: bump/lower a step's round count, move the current pointer,
// advance to the next stage (wrapping), or reset all counters. RLS-scoped.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "ยังไม่ได้เข้าสู่ระบบ");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = farmLoopProgressSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "คำสั่งไม่ถูกต้อง", parsed.error.flatten());
  }
  const { action, stepId } = parsed.data;

  const supabase = createClient();
  const { data: set } = await supabase
    .from("farm_loop_sets")
    .select("id,current_step_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!set) return fail("NOT_FOUND", "ไม่พบชุดฟาร์มนี้");

  const { data: stepData } = await supabase
    .from("farm_loop_steps")
    .select("*")
    .eq("set_id", params.id)
    .order("sort_order", { ascending: true });
  const list = stepData ?? [];

  if (action === "increment" || action === "decrement") {
    const step = list.find((s) => s.id === stepId);
    if (!step) return fail("NOT_FOUND", "ไม่พบด่านนี้");
    const next =
      action === "increment"
        ? step.completed_rounds + 1
        : Math.max(0, step.completed_rounds - 1);
    const { error } = await supabase
      .from("farm_loop_steps")
      .update({ completed_rounds: next })
      .eq("id", step.id);
    if (error) return fail("INTERNAL", "อัปเดตรอบไม่สำเร็จ", error.message);
  } else if (action === "setCurrent") {
    const step = list.find((s) => s.id === stepId);
    if (!step) return fail("NOT_FOUND", "ไม่พบด่านนี้");
    const { error } = await supabase
      .from("farm_loop_sets")
      .update({ current_step_id: step.id })
      .eq("id", params.id);
    if (error) return fail("INTERNAL", "ตั้งด่านปัจจุบันไม่สำเร็จ", error.message);
  } else if (action === "advance") {
    if (list.length > 0) {
      const idx = list.findIndex((s) => s.id === set.current_step_id);
      const nextIdx = idx < 0 ? 0 : (idx + 1) % list.length;
      const { error } = await supabase
        .from("farm_loop_sets")
        .update({ current_step_id: list[nextIdx].id })
        .eq("id", params.id);
      if (error) return fail("INTERNAL", "ไปด่านถัดไปไม่สำเร็จ", error.message);
    }
  } else if (action === "reset") {
    const { error: e1 } = await supabase
      .from("farm_loop_steps")
      .update({ completed_rounds: 0 })
      .eq("set_id", params.id);
    if (e1) return fail("INTERNAL", "รีเซ็ตรอบไม่สำเร็จ", e1.message);
    await supabase
      .from("farm_loop_sets")
      .update({ current_step_id: list[0]?.id ?? null })
      .eq("id", params.id);
  }

  // fresh state for the client
  const { data: freshSet } = await supabase
    .from("farm_loop_sets")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  const { data: freshSteps } = await supabase
    .from("farm_loop_steps")
    .select("*")
    .eq("set_id", params.id)
    .order("sort_order", { ascending: true });

  return ok({ set: freshSet ? { ...freshSet, steps: freshSteps ?? [] } : null });
}
