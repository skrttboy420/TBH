import type { NextRequest } from "next/server";
import { authenticateAgent } from "@/lib/api/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";
import { saveStatePayloadSchema } from "@/lib/api/validation";
import { asJson } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return fail("UNAUTHORIZED", "โทเคนเอเจนต์ไม่ถูกต้อง");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body ต้องเป็น JSON");
  }
  const parsed = saveStatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "ข้อมูลเซฟไม่ถูกต้อง", parsed.error.flatten());
  }
  const { save, loot, activity } = parsed.data;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("save_state")
    .select("save_hash")
    .eq("agent_id", agent.id)
    .maybeSingle();
  const changed = !existing || existing.save_hash !== save.saveHash;

  const { error: upErr } = await admin.from("save_state").upsert({
    agent_id: agent.id,
    user_id: agent.user_id,
    captured_at: save.capturedAt,
    save_hash: save.saveHash,
    play_time: save.playTime,
    gold: save.gold,
    max_completed_stage: save.maxCompletedStage,
    current_stage_key: save.currentStageKey,
    current_stage_wave: save.currentStageWave,
    arranged_hero_keys: save.arrangedHeroKeys,
    arranged_pet_key: save.arrangedPetKey,
    currencies: asJson(save.currencies),
    heroes: asJson(save.heroes),
    pets: asJson(save.pets),
    runes: asJson(save.runes),
    inventory: asJson(save.inventory),
    stash: asJson(save.stash),
    boxes: asJson(save.boxes),
    settings: asJson(save.settings),
    summary: asJson(save.summary),
    updated_at: now,
  });
  if (upErr) return fail("INTERNAL", "บันทึกสถานะเซฟไม่สำเร็จ", upErr.message);

  await admin.from("agents").update({ last_seen_at: now }).eq("id", agent.id);

  let snapshotId: string | null = null;
  if (changed) {
    const { data: snap } = await admin
      .from("save_snapshots")
      .insert({
        agent_id: agent.id,
        user_id: agent.user_id,
        captured_at: save.capturedAt ?? now,
        save_hash: save.saveHash,
        play_time: save.playTime,
        gold: save.gold,
        max_completed_stage: save.maxCompletedStage,
        current_stage_key: save.currentStageKey,
        current_stage_wave: save.currentStageWave,
        items_total: save.summary.itemsTotal,
        inventory_used: save.summary.inventoryUsed,
        stash_used: save.summary.stashUsed,
      })
      .select("id")
      .maybeSingle();
    snapshotId = snap?.id ?? null;
  }

  if (loot?.length) {
    await admin.from("loot_events").insert(
      loot.map((l) => ({
        agent_id: agent.id,
        user_id: agent.user_id,
        kind: l.kind,
        item_key: l.itemKey ?? null,
        item_unique_id: l.itemUniqueId ?? null,
        rarity: l.rarity ?? null,
        is_chaotic: l.isChaotic ?? false,
        quantity: l.quantity ?? 1,
        stage_key: l.stageKey ?? null,
        metadata: asJson(l.metadata ?? {}),
        ...(l.occurredAt ? { occurred_at: l.occurredAt } : {}),
      })),
    );
  }

  if (activity?.length) {
    await admin.from("activity_events").insert(
      activity.map((a) => ({
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

  // Auto-advance farm loops from real play. Each farm-clear event the agent
  // reports (data.farm + data.stageKey) bumps every matching step's
  // completed_rounds by data.count (one event can cover several clears that
  // happened between two infrequent save writes), so rounds are pulled from
  // actual history instead of the user tapping +1 by hand. Manual +/- still
  // work as corrections.
  const farmClears = new Map<number, number>();
  for (const a of activity ?? []) {
    const d = a.data;
    if (!d || d.farm !== true) continue;
    const sk = d.stageKey;
    if (typeof sk !== "number") continue;
    const cnt = typeof d.count === "number" && d.count > 0 ? d.count : 1;
    farmClears.set(sk, (farmClears.get(sk) ?? 0) + cnt);
  }
  if (farmClears.size > 0) {
    const { data: steps } = await admin
      .from("farm_loop_steps")
      .select("id, stage_key, completed_rounds")
      .eq("user_id", agent.user_id)
      .in("stage_key", [...farmClears.keys()]);
    await Promise.all(
      (steps ?? []).map((s) =>
        admin
          .from("farm_loop_steps")
          .update({
            completed_rounds: (s.completed_rounds ?? 0) + (farmClears.get(s.stage_key) ?? 0),
          })
          .eq("id", s.id),
      ),
    );
  }

  return ok({ changed, snapshotId, serverTime: now });
}
