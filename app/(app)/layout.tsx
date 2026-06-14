import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell
      user={{
        email: profile?.email ?? user.email ?? null,
        name: profile?.display_name ?? null,
      }}
    >
      <RealtimeRefresh />
      {children}
    </AppShell>
  );
}
