import Link from "next/link";
import { Sparkles, MonitorSmartphone, Flame, Swords } from "lucide-react";
import { getAgents, pickAgent, getLoot } from "@/lib/data/queries";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { StatCard } from "@/components/dashboard/stat-card";
import { LootList } from "@/components/loot/loot-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/game/items";

export const dynamic = "force-dynamic";

export default async function LootPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);

  if (!agent) {
    return (
      <>
        <PageHeader title="ของที่ได้" description="ประวัติไอเทมและเงินตราที่ดรอประหว่างฟาร์ม" />
        <EmptyState
          icon={MonitorSmartphone}
          title="ยังไม่มีเครื่องเอเจนต์"
          description="เพิ่มเครื่องเอเจนต์เพื่อเริ่มบันทึกของที่ได้"
        >
          <Button asChild>
            <Link href="/agents">เพิ่มเครื่องเอเจนต์</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const loot = await getLoot(200, agent.id);
  const chaotic = loot.filter((l) => l.is_chaotic).length;
  const equipment = loot.filter((l) => l.kind === "equipment").length;

  return (
    <>
      <PageHeader title="ของที่ได้" description={agent.name}>
        <AgentSwitcher agents={agents} activeId={agent.id} />
      </PageHeader>

      {loot.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="ยังไม่มีของที่ได้"
          description="เมื่อเริ่มฟาร์ม ของที่ดรอปจะถูกบันทึกและแสดงที่นี่"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Sparkles} label="ทั้งหมด" value={formatNumber(loot.length)} accent="info" />
            <StatCard icon={Swords} label="อุปกรณ์" value={formatNumber(equipment)} accent="primary" />
            <StatCard icon={Flame} label="Chaotic" value={formatNumber(chaotic)} accent="warning" />
          </div>
          <Card>
            <CardContent className="pt-6">
              <LootList events={loot} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
