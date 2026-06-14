import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CommandRow, Database, Json } from "@/lib/types/database";

/**
 * Values pulled off `request.json()` / validated by zod are genuine JSON, but
 * TypeScript types them as structured objects that aren't assignable to the
 * recursive `Json` type our jsonb columns expect. This cast is the honest
 * bridge — only call it on data that really came from JSON.
 */
export const asJson = (v: unknown): Json => v as Json;

/** The authenticated user for a cookie-session request, or null. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

type AdminClient = SupabaseClient<Database>;

/**
 * Commands an agent should act on: not yet completed and not expired. Lazily
 * flips stale (pending|sent, past expiry) rows to `expired` so the queue stays
 * clean without a cron job.
 */
export async function dueCommands(admin: AdminClient, agentId: string): Promise<CommandRow[]> {
  const now = new Date().toISOString();

  await admin
    .from("commands")
    .update({ status: "expired" })
    .eq("agent_id", agentId)
    .in("status", ["pending", "sent"])
    .lt("expires_at", now);

  const { data } = await admin
    .from("commands")
    .select("*")
    .eq("agent_id", agentId)
    .in("status", ["pending", "sent"])
    .gt("expires_at", now)
    .order("created_at", { ascending: true });

  return data ?? [];
}
