import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client — BYPASSES Row Level Security.
 * SERVER-ONLY. Never import this into client components or expose the key.
 * Used by agent-facing API routes (heartbeat, save-state, loot, …) which
 * authenticate the agent via its token and then write on its behalf.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
