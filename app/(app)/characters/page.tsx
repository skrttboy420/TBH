import Link from "next/link";
import { Users, MonitorSmartphone, PawPrint } from "lucide-react";
import { getAgents, pickAgent, getSaveState } from "@/lib/data/queries";
import { decodeSaveState } from "@/lib/data/save";
import { resolvePetStats } from "@/lib/game/item-info";
import { HeroCard } from "@/components/characters/hero-card";
import { PetCard } from "@/components/characters/pet-card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AgentSwitcher } from "@/components/agents/agent-switcher";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { HeroState, PetState } from "@/lib/types/save";

export const dynamic = "force-dynamic";

function sortUnlockedFirst<T extends { isUnlock: boolean }>(a: T, b: T) {
  return Number(b.isUnlock) - Number(a.isUnlock);
}

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: { agent?: string };
}) {
  const agents = await getAgents();
  const agent = pickAgent(agents, searchParams.agent);

  if (!agent) {
    return (
      <>
        <PageHeader title="ตัวละคร" description="ฮีโร่และสัตว์เลี้ยงของคุณ" />
        <EmptyState
          icon={MonitorSmartphone}
          title="ยังไม่มีเครื่องเอเจนต์"
          description="เพิ่มเครื่องเอเจนต์เพื่อซิงค์ข้อมูลตัวละคร"
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

  if (!save) {
    return (
      <>
        <PageHeader title="ตัวละคร" description={agent.name}>
          <AgentSwitcher agents={agents} activeId={agent.id} />
        </PageHeader>
        <EmptyState
          icon={Users}
          title="ยังไม่มีข้อมูลตัวละคร"
          description="เมื่อเอเจนต์อ่านไฟล์เซฟแล้ว ฮีโร่และสัตว์เลี้ยงจะแสดงที่นี่"
        />
      </>
    );
  }

  const heroes = save.heroes.slice().sort(sortUnlockedFirst);
  const pets = save.pets.slice().sort(sortUnlockedFirst);

  const heroesUnlocked = heroes.filter((h: HeroState) => h.isUnlock).length;
  const petsUnlocked = pets.filter((p: PetState) => p.isUnlock).length;

  return (
    <>
      <PageHeader title="ตัวละคร" description={agent.name}>
        <AgentSwitcher agents={agents} activeId={agent.id} />
      </PageHeader>

      <Tabs defaultValue="heroes">
        <TabsList>
          <TabsTrigger value="heroes" className="gap-2">
            <Users className="h-4 w-4" />
            ฮีโร่ ({heroesUnlocked}/{heroes.length})
          </TabsTrigger>
          <TabsTrigger value="pets" className="gap-2">
            <PawPrint className="h-4 w-4" />
            สัตว์เลี้ยง ({petsUnlocked}/{pets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heroes" className="mt-4">
          {heroes.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">ไม่มีข้อมูลฮีโร่</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {heroes.map((h: HeroState) => (
                <HeroCard key={h.heroKey} hero={h} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pets" className="mt-4">
          {pets.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">ไม่มีข้อมูลสัตว์เลี้ยง</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {pets.map((p: PetState) => (
                <PetCard key={p.petKey} pet={p} effects={resolvePetStats(p.petKey)} />
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </>
  );
}
