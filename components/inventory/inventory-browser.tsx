"use client";

import * as React from "react";
import { Search, Backpack, Archive } from "lucide-react";
import type { InventoryItem } from "@/lib/types/save";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ItemCell } from "@/components/inventory/item-cell";
import { ItemDetailDialog } from "@/components/inventory/item-detail-dialog";
import { itemDisplayName, itemCatalogEntry } from "@/lib/game/items";

function useFilter(items: InventoryItem[], query: string, chaoticOnly: boolean) {
  return React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => {
        if (chaoticOnly && !it.isChaotic) return false;
        if (q) {
          const name = itemDisplayName(it.itemKey).toLowerCase();
          const en = (itemCatalogEntry(it.itemKey)?.en ?? "").toLowerCase();
          if (
            !String(it.itemKey).includes(q) &&
            !name.includes(q) &&
            !en.includes(q)
          )
            return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.index - b.index);
  }, [items, query, chaoticOnly]);
}

function Grid({
  items,
  onSelect,
}: {
  items: InventoryItem[];
  onSelect: (it: InventoryItem) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">ไม่พบไอเทมที่ตรงกับเงื่อนไข</p>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {items.map((it) => (
        <ItemCell key={`${it.index}-${it.uniqueId}`} item={it} onClick={() => onSelect(it)} />
      ))}
    </div>
  );
}

export function InventoryBrowser({
  inventory,
  stash,
  inventoryCapacity,
  stashCapacity,
}: {
  inventory: InventoryItem[];
  stash: InventoryItem[];
  inventoryCapacity: number;
  stashCapacity: number;
}) {
  const [selected, setSelected] = React.useState<InventoryItem | null>(null);
  const [query, setQuery] = React.useState("");
  const [chaoticOnly, setChaoticOnly] = React.useState(false);

  const invFiltered = useFilter(inventory, query, chaoticOnly);
  const stashFiltered = useFilter(stash, query, chaoticOnly);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาด้วยชื่อหรือรหัสไอเทม…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="chaotic" checked={chaoticOnly} onCheckedChange={setChaoticOnly} />
          <Label htmlFor="chaotic" className="cursor-pointer">
            เฉพาะ Chaotic
          </Label>
        </div>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory" className="gap-2">
            <Backpack className="h-4 w-4" />
            กระเป๋า ({inventory.length}/{inventoryCapacity})
          </TabsTrigger>
          <TabsTrigger value="stash" className="gap-2">
            <Archive className="h-4 w-4" />
            คลัง ({stash.length}/{stashCapacity})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="mt-4">
          <Grid items={invFiltered} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="stash" className="mt-4">
          <Grid items={stashFiltered} onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <ItemDetailDialog item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
