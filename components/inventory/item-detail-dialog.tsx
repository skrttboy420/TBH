import type { InventoryItem } from "@/lib/types/save";
import {
  itemGrade,
  gradeInfo,
  gradeStyle,
  itemIconUrl,
  itemDisplayName,
  itemCatalogEntry,
  SLOT_LABELS,
  TYPE_LABELS,
} from "@/lib/game/items";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function ItemDetailDialog({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const grade = item ? itemGrade(item.itemKey) : 0;
  const g = gradeInfo(grade);
  const info = item?.info ?? null;
  const entry = item ? itemCatalogEntry(item.itemKey) : null;
  const icon = item ? itemIconUrl(item.itemKey) : null;
  const name = item ? itemDisplayName(item.itemKey) : "";
  const typeLabel = entry?.type ? TYPE_LABELS[entry.type] : null;
  const slotLabel = entry ? SLOT_LABELS[entry.slot] ?? null : null;

  return (
    <Dialog open={item !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={icon}
                alt={name}
                className="h-12 w-12 shrink-0 rounded-md border bg-secondary/40 p-1"
                style={{ imageRendering: "pixelated", borderColor: gradeStyle(grade).borderColor }}
                draggable={false}
              />
            ) : null}
            <div className="min-w-0">
              <DialogTitle style={{ color: g.color }}>{name}</DialogTitle>
              {entry?.en ? (
                <p className="truncate text-xs text-muted-foreground">{entry.en}</p>
              ) : null}
            </div>
          </div>
          <DialogDescription>
            ช่องที่ {item?.index} · ItemKey {item?.itemKey}
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                style={{ color: g.color, borderColor: gradeStyle(grade).borderColor }}
              >
                {g.th}
              </Badge>
              {typeLabel || slotLabel ? (
                <Badge variant="secondary">{typeLabel ?? slotLabel}</Badge>
              ) : null}
              {info && info.level > 0 ? (
                <Badge variant="secondary">ต้องการ Lv.{info.level}</Badge>
              ) : null}
              {item.isChaotic ? <Badge variant="destructive">Chaotic</Badge> : null}
              {item.isBlocked ? <Badge variant="warning">ล็อกอยู่</Badge> : null}
            </div>

            {/* สเตตัสพื้นฐาน (เกราะ / ดาเมจ ฯลฯ) */}
            {info && info.baseStats.length > 0 ? (
              <ul className="space-y-1">
                {info.baseStats.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm font-semibold"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* สเตตัสคงที่ (ติดมากับไอเทม) */}
            {info && info.inherentStats.length > 0 ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-muted-foreground">สเตตัสคงที่</p>
                <ul className="space-y-1">
                  {info.inherentStats.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* ช่องตกแต่ง (เอนแชนต์) */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-muted-foreground">ช่องตกแต่ง</p>
              {!info || info.enchants.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีเอนแชนต์</p>
              ) : (
                <ul className="space-y-1.5">
                  {info.enchants.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-primary">{e.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">เทียร์ {e.tier}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <dt>UniqueId</dt>
              <dd className="text-right font-mono">{item.uniqueId}</dd>
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
