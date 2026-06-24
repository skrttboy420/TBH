import Link from "next/link";
import { Calculator, MonitorSmartphone } from "lucide-react";
import { getAgents, pickAgent, getSaveState } from "@/lib/data/queries";
import { decodeSaveState } from "@/lib/data/save";
import { resolveItemInfo } from "@/lib/game/item-info";
import { itemPrice, PRICES_FETCHED_AT } from "@/lib/game/prices";
import type { InventoryItem } from "@/lib/types/save";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { PriceCalculator, type CalcItem } from "@/components/calculator/price-calculator";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);

  if (!agent) {
    return (
      <>
        <PageHeader title="เครื่องคิดราคา" description="ตีราคาไอเทมที่ขายได้ตามตลาด Steam" />
        <EmptyState
          icon={MonitorSmartphone}
          title="ยังไม่มีเครื่องเอเจนต์"
          description="เพิ่มเครื่องเอเจนต์เพื่อซิงค์ข้อมูลไอเทมจากเกม"
        >
          <Button asChild>
            <Link href="/agents">เพิ่มเครื่องเอเจนต์</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const saveRow = await getSaveState(agent.id);
  const save = saveRow ? decodeSaveState(saveRow) : null;

  // Resolve the readable stat block server-side (keeps the big gear catalog off
  // the client) and tag each item with where it lives.
  const withMeta = (it: InventoryItem, location: "bag" | "stash"): CalcItem => {
    const info = resolveItemInfo(it);
    return { ...it, ...(info ? { info } : {}), location };
  };
  // Only items that are tradable AND carry market data are worth showing.
  const collect = (arr: InventoryItem[], location: "bag" | "stash"): CalcItem[] =>
    arr
      .filter((it) => {
        const p = itemPrice(it.itemKey);
        return !!p && (p.value != null || p.buyOrder != null);
      })
      .map((it) => withMeta(it, location));

  const items: CalcItem[] = save
    ? [...collect(save.inventory, "bag"), ...collect(save.stash, "stash")]
    : [];

  const priceDate = new Date(PRICES_FETCHED_AT).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <PageHeader title="เครื่องคิดราคา" description={agent.name}>
        <AgentSwitcher agents={agents} activeId={agent.id} />
      </PageHeader>

      {!save ? (
        <EmptyState
          icon={Calculator}
          title="ยังไม่มีข้อมูลไอเทม"
          description="เมื่อเอเจนต์อ่านไฟล์เซฟแล้ว ไอเทมที่ขายได้จะแสดงที่นี่"
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            เลือกเฉพาะไอเทมที่จะขาย แล้วระบบจะรวมราคาให้ · อิงราคา Steam Market · อัปเดต {priceDate}
          </p>
          <PriceCalculator items={items} />
        </>
      )}
    </>
  );
}
