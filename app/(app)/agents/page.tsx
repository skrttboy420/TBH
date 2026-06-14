import { getAgents } from "@/lib/data/queries";
import { PageHeader } from "@/components/common/page-header";
import { AgentManager } from "@/components/agents/agent-manager";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents();
  return (
    <>
      <PageHeader
        title="เครื่องเอเจนต์"
        description="จัดการพีซีที่เชื่อมต่อและโทเค็นสำหรับโปรแกรมเอเจนต์"
      />
      <AgentManager agents={agents} />
    </>
  );
}
