"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["agents", "save_state", "loot_events", "activity_events", "commands"] as const;

/**
 * Subscribes to the signed-in user's row changes (RLS-scoped) and triggers a
 * debounced `router.refresh()` so server components re-fetch with fresh data.
 * Mounted once globally; an optional `agentId` narrows the subscription.
 */
export function RealtimeRefresh({ agentId }: { agentId?: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    let channel = supabase.channel(`rt-${agentId ?? "all"}`);
    for (const table of TABLES) {
      const filter = agentId
        ? table === "agents"
          ? `id=eq.${agentId}`
          : `agent_id=eq.${agentId}`
        : undefined;
      channel = channel.on(
        "postgres_changes",
        filter
          ? { event: "*", schema: "public", table, filter }
          : { event: "*", schema: "public", table },
        refresh,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [agentId, router]);

  return null;
}
