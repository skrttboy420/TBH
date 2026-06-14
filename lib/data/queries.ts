import { createClient } from "@/lib/supabase/server";
import type {
  ActivityEventRow,
  AgentRow,
  CommandRow,
  FarmLoopSetWithSteps,
  FarmLoopStepRow,
  LootEventRow,
  SaveSnapshotRow,
  SaveStateRow,
} from "@/lib/types/database";

/** All of the caller's agents, most-recently-seen first. */
export async function getAgents(): Promise<AgentRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Pick the active agent: the preferred id if present, else the first. */
export function pickAgent(agents: AgentRow[], preferId?: string): AgentRow | null {
  if (preferId) {
    const found = agents.find((a) => a.id === preferId);
    if (found) return found;
  }
  return agents[0] ?? null;
}

export async function getSaveState(agentId: string): Promise<SaveStateRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("save_state")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  return data ?? null;
}

export async function getSnapshots(
  agentId: string,
  limit = 100,
): Promise<SaveSnapshotRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("save_snapshots")
    .select("*")
    .eq("agent_id", agentId)
    .order("captured_at", { ascending: false })
    .limit(limit);
  // oldest → newest for charting
  return (data ?? []).slice().reverse();
}

export async function getActivity(
  limit = 30,
  agentId?: string,
): Promise<ActivityEventRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("activity_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;
  return data ?? [];
}

export async function getLoot(limit = 100, agentId?: string): Promise<LootEventRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("loot_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;
  return data ?? [];
}

export async function getCommands(agentId: string, limit = 20): Promise<CommandRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commands")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** All of the caller's farm loop sets, each with its ordered steps. */
export async function getFarmLoopSets(): Promise<FarmLoopSetWithSteps[]> {
  const supabase = createClient();
  const { data: sets } = await supabase
    .from("farm_loop_sets")
    .select("*")
    .order("created_at", { ascending: true });
  if (!sets || sets.length === 0) return [];

  // RLS scopes both queries to the owner; steps come back globally ordered by
  // sort_order, so per-set order is preserved as we bucket them.
  const { data: steps } = await supabase
    .from("farm_loop_steps")
    .select("*")
    .order("sort_order", { ascending: true });

  const bySet = new Map<string, FarmLoopStepRow[]>();
  for (const s of steps ?? []) {
    const arr = bySet.get(s.set_id) ?? [];
    arr.push(s);
    bySet.set(s.set_id, arr);
  }
  return sets.map((set) => ({ ...set, steps: bySet.get(set.id) ?? [] }));
}
