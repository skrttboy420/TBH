import type { LootEventRow, LootKind } from "@/lib/types/database";
import {
  itemDisplayName,
  itemIconUrl,
  itemGrade,
  gradeInfo,
  gradeStyle,
} from "@/lib/game/items";
import { boxName, boxIconUrl } from "@/lib/game/boxes";
import { decodeStage } from "@/lib/game/stages";
import { timeAgo } from "@/lib/format/time";
import { Badge } from "@/components/ui/badge";

export const LOOT_KIND_LABELS: Record<LootKind, string> = {
  equipment: "อุปกรณ์",
  currency: "เงินตรา",
  material: "วัตถุดิบ",
  box: "กล่อง",
  rune: "รูน",
  pet: "สัตว์เลี้ยง",
  other: "อื่นๆ",
};

/** เลข type ของหีบจาก metadata (เซฟเก็บเป็น BoxTypes ตัวเลข). */
function boxType(e: LootEventRow): number | null {
  const m = e.metadata;
  if (m && typeof m === "object" && !Array.isArray(m) && typeof m.type === "number") {
    return m.type;
  }
  return null;
}

function lootLabel(e: LootEventRow): string {
  if (e.item_key != null) return itemDisplayName(e.item_key);
  if (e.kind === "box") {
    const t = boxType(e);
    if (t != null) return boxName(t);
  }
  return LOOT_KIND_LABELS[e.kind] ?? e.kind;
}

export function LootList({ events }: { events: LootEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        ยังไม่มีของที่ได้
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {events.map((e) => {
        const stage = decodeStage(e.stage_key);
        const hasItem = e.item_key != null;
        const bType = e.kind === "box" ? boxType(e) : null;
        const grade = hasItem ? itemGrade(e.item_key as number) : 0;
        const icon = hasItem
          ? itemIconUrl(e.item_key as number)
          : bType != null
            ? boxIconUrl(bType)
            : null;
        const color = hasItem ? gradeInfo(grade).color : undefined;
        const borderColor = hasItem ? gradeStyle(grade).borderColor : undefined;
        return (
          <li key={e.id} className="flex items-center gap-3 py-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary/40 text-xs font-bold"
              style={{ borderColor }}
            >
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={icon}
                  alt=""
                  className="h-7 w-7 object-contain"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                />
              ) : (
                LOOT_KIND_LABELS[e.kind]?.charAt(0) ?? "?"
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color }}>
                {lootLabel(e)}
                {e.quantity > 1 ? (
                  <span className="text-muted-foreground"> ×{e.quantity}</span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {LOOT_KIND_LABELS[e.kind] ?? e.kind}
                {stage ? ` · ด่าน ${stage.label}` : ""}
              </p>
            </div>
            {e.is_chaotic ? (
              <Badge variant="destructive" className="shrink-0">
                Chaotic
              </Badge>
            ) : null}
            <time className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(e.occurred_at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
