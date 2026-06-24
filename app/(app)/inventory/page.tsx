import Link from "next/link";
import { Backpack, MonitorSmartphone } from "lucide-react";
import { getAgents, pickAgent, getSaveState } from "@/lib/data/queries";
import { decodeSaveState } from "@/lib/data/save";
import { resolveItemInfo } from "@/lib/game/item-info";
import { portfolioValue, formatBaht, PRICES_FETCHED_AT } from "@/lib/game/prices";
import { INVENTORY_CAPACITY, STASH_CAPACITY } from "@/lib/game/constants";
import type { InventoryItem } from "@/lib/types/save";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);

  if (!agent) {
    return (
      <>
        <PageHeader title="กระเป๋า" description="ดูไอเทมในกระเป๋าและคลังจากระยะไกล" />
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

  // Resolve readable stat blocks server-side so the ~800 KB gear catalog never
  // ships to the client; only the small string lines cross to the dialog.
  const withInfo = (it: InventoryItem): InventoryItem => {
    const info = resolveItemInfo(it);
    return info ? { ...it, info } : it;
  };
  const inventory = save ? save.inventory.map(withInfo) : [];
  const stash = save ? save.stash.map(withInfo) : [];
  const value = portfolioValue([...inventory, ...stash]);
  const priceDate = new Date(PRICES_FETCHED_AT).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <PageHeader title="กระเป๋า" description={agent.name}>
        <AgentSwitcher agents={agents} activeId={agent.id} />
      </PageHeader>

      {!save ? (
        <EmptyState
          icon={Backpack}
          title="ยังไม่มีข้อมูลไอเทม"
          description="เมื่อเอเจนต์อ่านไฟล์เซฟแล้ว ไอเทมทั้งหมดจะแสดงที่นี่"
        />
      ) : (
        <>
          {value.tradableCount > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent px-4 py-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  มูลค่ารวมโดยประมาณ (กระเป๋า + คลัง)
                </p>
                <p className="text-2xl font-bold text-emerald-300">{formatBaht(value.total)}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>
                  ตีราคาได้ {value.pricedCount} จาก {value.tradableCount} ชิ้นที่ขายได้
                </p>
                <p>อิงราคา Steam Market · อัปเดต {priceDate}</p>
              </div>
            </div>
          ) : null}
          <InventoryBrowser
            inventory={inventory}
            stash={stash}
            inventoryCapacity={save.summary.inventoryCapacity ?? INVENTORY_CAPACITY}
            stashCapacity={save.summary.stashCapacity ?? STASH_CAPACITY}
          />
        </>
      )}
    </>
  );
}
