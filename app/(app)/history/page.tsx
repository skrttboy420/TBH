import Link from "next/link";
import { Coins, Swords, Clock, Activity, MonitorSmartphone } from "lucide-react";
import { getAgents, pickAgent, getSaveState, getSnapshots, getActivity } from "@/lib/data/queries";
import { formatNumber, formatCompact, formatPlayTime } from "@/lib/game/items";
import { decodeStage, stageFullLabel } from "@/lib/game/stages";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AgentStatusBadge } from "@/components/agents/agent-status-badge";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { StatCard } from "@/components/dashboard/stat-card";
import { GoldChart } from "@/components/dashboard/gold-chart";
import { PlayHistoryTimeline } from "@/components/history/play-history-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);

  if (!agent) {
    return (
      <>
        <PageHeader
          title="ประวัติการเล่น"
          description="ไทม์ไลน์กิจกรรมและความคืบหน้าการฟาร์ม"
        />
        <EmptyState
          icon={MonitorSmartphone}
          title="ยังไม่มีเครื่องเอเจนต์"
          description="ติดตั้งโปรแกรมเอเจนต์บนเครื่องที่เล่นเกม แล้วเชื่อมต่อเพื่อเริ่มบันทึกประวัติการเล่น"
        >
          <Button asChild>
            <Link href="/agents">เพิ่มเครื่องเอเจนต์</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const [saveRow, snapshots, activity] = await Promise.all([
    getSaveState(agent.id),
    getSnapshots(agent.id, 300),
    getActivity(150, agent.id),
  ]);

  const gold = saveRow?.gold ?? null;
  const stage = decodeStage(saveRow?.current_stage_key);

  const goldPoints = snapshots
    .filter((s) => s.gold != null)
    .map((s) => ({ t: s.captured_at, gold: s.gold as number }));

  return (
    <>
      <PageHeader title="ประวัติการเล่น" description={agent.name}>
        <AgentSwitcher agents={agents} activeId={agent.id} />
        <AgentStatusBadge status={agent.status} lastSeenAt={agent.last_seen_at} />
      </PageHeader>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Coins}
            label="ทองล่าสุด"
            value={formatNumber(gold)}
            hint={gold != null ? formatCompact(gold) : undefined}
            accent="warning"
          />
          <StatCard
            icon={Swords}
            label="ด่านปัจจุบัน"
            value={stage ? stage.label : "—"}
            hint={stage ? stageFullLabel(saveRow?.current_stage_key) : undefined}
            accent="primary"
          />
          <StatCard
            icon={Clock}
            label="เวลาเล่น"
            value={saveRow ? formatPlayTime(saveRow.play_time) : "—"}
            accent="info"
          />
          <StatCard
            icon={Activity}
            label="กิจกรรมที่บันทึก"
            value={formatNumber(activity.length)}
            hint={goldPoints.length > 0 ? `ค่าทอง ${goldPoints.length} จุด` : undefined}
            accent="success"
          />
        </div>

        {goldPoints.length >= 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>ความคืบหน้าของทอง</CardTitle>
            </CardHeader>
            <CardContent>
              <GoldChart data={goldPoints} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>ไทม์ไลน์กิจกรรม</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayHistoryTimeline events={activity} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
