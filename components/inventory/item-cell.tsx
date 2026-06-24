import { Lock, Sparkles } from "lucide-react";
import type { InventoryItem } from "@/lib/types/save";
import {
  itemGrade,
  gradeStyle,
  gradeGlow,
  itemIconUrl,
  itemDisplayName,
  enchantTotal,
} from "@/lib/game/items";
import { itemPrice, formatBahtCompact } from "@/lib/game/prices";
import { cn } from "@/lib/utils";

export function ItemCell({
  item,
  onClick,
}: {
  item: InventoryItem;
  onClick?: () => void;
}) {
  const grade = itemGrade(item.itemKey);
  const { color, borderColor } = gradeStyle(grade);
  const glow = gradeGlow(grade);
  const enchants = enchantTotal(item);
  const name = itemDisplayName(item.itemKey);
  const icon = itemIconUrl(item.itemKey);
  const price = itemPrice(item.itemKey);

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      style={{ borderColor }}
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border bg-secondary/30 p-1 transition-colors hover:bg-secondary/70",
        item.isChaotic && "ring-1 ring-rarity-chaotic/60",
      )}
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt={name}
          className="h-7 w-7 shrink-0 object-contain"
          style={{ imageRendering: "pixelated", filter: glow }}
          draggable={false}
        />
      ) : (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center text-[15px] font-bold"
          style={{ color, textShadow: glow ? `0 0 6px ${color}` : undefined }}
        >
          {name.charAt(0)}
        </span>
      )}
      <span
        className="w-full truncate text-center text-[9px] font-medium leading-tight"
        style={{ color }}
      >
        {name}
      </span>
      {enchants > 0 ? (
        <span className="absolute left-0.5 top-0.5 inline-flex items-center gap-0.5 rounded bg-background/80 px-1 text-[9px] text-muted-foreground">
          <Sparkles className="h-2.5 w-2.5" />
          {enchants}
        </span>
      ) : null}
      {item.isBlocked ? (
        <Lock className="absolute right-1 top-1 h-3 w-3 text-muted-foreground" />
      ) : null}
      {price?.value != null ? (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-background/85 px-1 text-[8px] font-semibold leading-tight text-success">
          {formatBahtCompact(price.value)}
        </span>
      ) : null}
    </button>
  );
}
