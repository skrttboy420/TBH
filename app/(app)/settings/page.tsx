import { Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgents, pickAgent, getSaveState } from "@/lib/data/queries";
import { decodeSaveState } from "@/lib/data/save";
import { PageHeader } from "@/components/common/page-header";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Bool({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  return value ? <Badge variant="success">เปิด</Badge> : <Badge variant="secondary">ปิด</Badge>;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);
  const saveRow = agent ? await getSaveState(agent.id) : null;
  const settings = saveRow ? decodeSaveState(saveRow).settings : null;

  return (
    <>
      <PageHeader title="ตั้งค่า" description="บัญชีและการตั้งค่าเกม">
        {agent ? <AgentSwitcher agents={agents} activeId={agent.id} /> : null}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>บัญชี</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label="ชื่อที่แสดง" value={profile?.display_name ?? "—"} />
            <Row label="อีเมล" value={profile?.email ?? user?.email ?? "—"} />
            <Row
              label="แพ็กเกจ"
              value={
                profile?.plan === "pro" ? (
                  <Badge>Pro</Badge>
                ) : (
                  <Badge variant="secondary">Free</Badge>
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              การตั้งค่าเกม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!settings ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลการตั้งค่าจากเกม
              </p>
            ) : (
              <div className="divide-y divide-border">
                <Row
                  label="ภาษาในเกม"
                  value={settings.language != null ? `#${settings.language}` : "—"}
                />
                <Row
                  label="FPS สูงสุด"
                  value={settings.maxFps != null ? settings.maxFps : "—"}
                />
                <Row label="หน้าต่างอยู่บนสุดเสมอ" value={<Bool value={settings.isAlwaysOnTop} />} />
                <Row label="เริ่มเกมอัตโนมัติ" value={<Bool value={settings.isAutoStart} />} />
                <Row label="เล่นด่านซ้ำเมื่อแพ้" value={<Bool value={settings.stageRepeatStageFailed} />} />
                <Row
                  label="ฟาร์มบอสองก์ซ้ำตอนใช้หินทั้งหมด"
                  value={<Bool value={settings.repeatActBossDuringConsumeAllStone} />}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />
      <p className="text-center text-xs text-muted-foreground">
        TBH Companion · เครื่องมือส่วนตัว · ไม่เกี่ยวข้องกับผู้พัฒนาเกม
      </p>
    </>
  );
}
