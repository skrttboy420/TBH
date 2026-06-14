import Link from "next/link";
import { Coins, Swords, Clock, Backpack, MonitorSmartphone, Activity } from "lucide-react";
import { getAgents, pickAgent, getSaveState, getSnapshots, getActivity, getLoot } from "@/lib/data/queries";
import { decodeSaveState } from "@/lib/data/save";
import { formatNumber, formatCompact, formatPlayTime } from "@/lib/game/items";
import { decodeStage, stageFullLabel } from "@/lib/game/stages";
import { INVENTORY_CAPACITY } from "@/lib/game/constants";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AgentStatusBadge } from "@/components/agents/agent-status-badge";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { StatCard } from "@/components/dashboard/stat-card";
import { GoldChart } from "@/components/dashboard/gold-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LootList } from "@/components/loot/loot-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);

  if (!agent) {
    return (
      <>
        <PageHeader title="แดชบอร์ด" description="ภาพรวมการฟาร์มของคุณ" />
        <EmptyState
          icon={MonitorSmartphone}
          title="ยังไม่มีเครื่องเอเจนต์"
          description="ติดตั้งโปรแกรมเอเจนต์บนเครื่องที่เล่นเกม แล้วเชื่อมต่อเพื่อเริ่มติดตามการฟาร์ม"
        >
          <Button asChild>
            <Link href="/agents">เพิ่มเครื่องเอเจนต์</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const [saveRow, snapshots, activity, loot] = await Promise.all([
    getSaveState(agent.id),
    getSnapshots(agent.id, 100),
    getActivity(20, agent.id),
    getLoot(8, agent.id),
  ]);
  const save = saveRow ? decodeSaveState(saveRow) : null;

  const gold = saveRow?.gold ?? null;
  const stage = decodeStage(saveRow?.current_stage_key);
  const invUsed = save?.summary.inventoryUsed ?? save?.inventory.length ?? 0;
  const invCap = save?.summary.inventoryCapacity ?? INVENTORY_CAPACITY;
  const itemsTotal = save?.summary.itemsTotal ?? null;

  const goldPoints = snapshots
    .filter((s) => s.gold != null)
    .map((s) => ({ t: s.captured_at, gold: s.gold as number }));

  return (
    <>
      <PageHeader title="แดชบอร์ด" description={agent.name}>
        <AgentSwitcher agents={agents} activeId={agent.id} />
        <AgentStatusBadge status={agent.status} lastSeenAt={agent.last_seen_at} />
      </PageHeader>

      {!saveRow ? (
        <EmptyState
          icon={Activity}
          title="ยังไม่ได้รับข้อมูลเซฟ"
          description="เมื่อเอเจนต์อ่านไฟล์เซฟของเกมแล้ว ข้อมูลจะปรากฏที่นี่"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Coins}
              label="ทอง"
              value={formatNumber(gold)}
              hint={gold != null ? formatCompact(gold) : undefined}
              accent="warning"
            />
            <StatCard
              icon={Swords}
              label="ด่านปัจจุบัน"
              value={stage ? stage.label : "—"}
              hint={stage ? stageFullLabel(saveRow.current_stage_key) : undefined}
              accent="primary"
            />
            <StatCard
              icon={Clock}
              label="เวลาเล่น"
              value={formatPlayTime(saveRow.play_time)}
              accent="info"
            />
            <StatCard
              icon={Backpack}
              label="กระเป๋า"
              value={`${invUsed}/${invCap}`}
              hint={itemsTotal != null ? `ไอเทมทั้งหมด ${formatNumber(itemsTotal)}` : undefined}
              accent="success"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>ทองตามเวลา</CardTitle>
              </CardHeader>
              <CardContent>
                <GoldChart data={goldPoints} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>ของที่ได้ล่าสุด</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/loot">ดูทั้งหมด</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <LootList events={loot} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>กิจกรรมล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed events={activity} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
