"use client";

import * as React from "react";
import { Check, Copy, Info, ArrowDownUp } from "lucide-react";
import type { InventoryItem } from "@/lib/types/save";
import {
  itemGrade,
  gradeInfo,
  gradeStyle,
  gradeGlow,
  itemIconUrl,
  itemDisplayName,
} from "@/lib/game/items";
import {
  itemPrice,
  priceByMetric,
  formatBaht,
  PRICE_METRICS,
  hasBuyOrders,
  type PriceMetric,
} from "@/lib/game/prices";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ItemDetailDialog } from "@/components/inventory/item-detail-dialog";
import { useToast } from "@/components/ui/use-toast";

export type CalcItem = InventoryItem & { location: "bag" | "stash" };

const LOCATION_LABEL: Record<CalcItem["location"], string> = {
  bag: "กระเป๋า",
  stash: "คลัง",
};

type SortKey = "price-desc" | "price-asc" | "name";

function itemKeyOf(it: CalcItem): string {
  return `${it.location}:${it.index}:${it.uniqueId}`;
}

export function PriceCalculator({ items }: { items: CalcItem[] }) {
  const { toast } = useToast();
  const showBuy = React.useMemo(() => hasBuyOrders(), []);
  const metrics = React.useMemo(
    () => PRICE_METRICS.filter((m) => m.key !== "buy" || showBuy),
    [showBuy],
  );

  const [metric, setMetric] = React.useState<PriceMetric>("median");
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [sort, setSort] = React.useState<SortKey>("price-desc");
  const [detail, setDetail] = React.useState<InventoryItem | null>(null);

  // Resolve price once per item, then sort.
  const rows = React.useMemo(() => {
    const mapped = items.map((it) => {
      const price = itemPrice(it.itemKey);
      return {
        it,
        key: itemKeyOf(it),
        price,
        value: priceByMetric(price, metric),
        name: itemDisplayName(it.itemKey),
      };
    });
    mapped.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "th");
      const av = a.value ?? -1;
      const bv = b.value ?? -1;
      return sort === "price-asc" ? av - bv : bv - av;
    });
    return mapped;
  }, [items, metric, sort]);

  const totals = React.useMemo(() => {
    let total = 0;
    let priced = 0;
    for (const r of rows) {
      if (!selected.has(r.key)) continue;
      if (r.value != null) {
        total += r.value;
        priced += 1;
      }
    }
    return { total, priced };
  }, [rows, selected]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectAll = () => setSelected(new Set(rows.map((r) => r.key)));
  const clear = () => setSelected(new Set());

  const copySummary = async () => {
    const picked = rows.filter((r) => selected.has(r.key) && r.value != null);
    if (picked.length === 0) {
      toast({ title: "ยังไม่ได้เลือกไอเทม", description: "เลือกไอเทมที่จะขายก่อน" });
      return;
    }
    const lines = picked.map(
      (r) => `${r.name} — ${formatBaht(r.value)}`,
    );
    const metricTh = metrics.find((m) => m.key === metric)?.th ?? "";
    const text = [
      `รายการขาย (${metricTh})`,
      ...lines,
      `รวม ${picked.length} ชิ้น = ${formatBaht(totals.total)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "คัดลอกแล้ว", description: `${picked.length} ชิ้น · ${formatBaht(totals.total)}` });
    } catch {
      toast({ title: "คัดลอกไม่สำเร็จ", description: "เบราว์เซอร์ไม่อนุญาต" });
    }
  };

  const selectedCount = selected.size;

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card/40 px-4 py-12 text-center text-sm text-muted-foreground">
        ไม่มีไอเทมที่ขายได้ในตลาด Steam (ของเกรดต่ำกว่า Legendary ขายในตลาดไม่ได้)
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky total bar */}
      <div className="sticky top-16 z-20 rounded-xl border border-success/30 bg-gradient-to-br from-success/10 to-transparent px-4 py-3 backdrop-blur lg:top-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">มูลค่ารวมที่เลือก</p>
            <p className="text-2xl font-bold text-success">{formatBaht(totals.total)}</p>
            <p className="text-xs text-muted-foreground">
              {selectedCount === 0
                ? "เลือกไอเทมที่จะขายเพื่อดูราคารวม"
                : `เลือกแล้ว ${selectedCount} ชิ้น · ตีราคาได้ ${totals.priced} ชิ้น`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={selectAll}>
              เลือกทั้งหมด
            </Button>
            <Button size="sm" variant="secondary" onClick={clear} disabled={selectedCount === 0}>
              ล้าง
            </Button>
            <Button size="sm" onClick={copySummary} disabled={selectedCount === 0} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              คัดลอก
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar: metric + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">ตีราคาจาก</span>
          <div className="inline-flex rounded-lg border border-border bg-card/40 p-0.5">
            {metrics.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                title={m.hint}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  metric === m.key
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.th}
              </button>
            ))}
          </div>
        </div>
        <div className="inline-flex items-center gap-2">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-card/40 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="price-desc">ราคา มาก → น้อย</option>
            <option value="price-asc">ราคา น้อย → มาก</option>
            <option value="name">ชื่อไอเทม</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        แสดงทุกราคาให้เทียบเอง — ยอดรวมคิดจาก{" "}
        <span className="font-medium text-foreground">
          {metrics.find((m) => m.key === metric)?.th}
        </span>
      </p>
      {!showBuy ? (
        <p className="text-xs text-muted-foreground/70">
          * ราคาซื้อ (bid) จะปรากฏเมื่ออัปเดตราคาด้วยบัญชี Steam ที่ล็อกอินแล้ว
        </p>
      ) : null}

      {/* Item list */}
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const grade = itemGrade(r.it.itemKey);
          const g = gradeInfo(grade);
          const icon = itemIconUrl(r.it.itemKey);
          const isSel = selected.has(r.key);
          return (
            <li key={r.key}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggle(r.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(r.key);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                  isSel
                    ? "border-success/50 bg-success/10"
                    : "border-border bg-card/40 hover:bg-secondary/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSel ? "border-success bg-success text-white" : "border-muted-foreground/50",
                  )}
                >
                  {isSel ? <Check className="h-3.5 w-3.5" /> : null}
                </span>

                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={icon}
                    alt={r.name}
                    className="h-9 w-9 shrink-0 object-contain"
                    style={{ imageRendering: "pixelated", filter: gradeGlow(grade) }}
                    draggable={false}
                  />
                ) : (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-base font-bold"
                    style={{ color: g.color }}
                  >
                    {r.name.charAt(0)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: g.color }}>
                    {r.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.th} · {LOCATION_LABEL[r.it.location]}
                  </p>
                </div>

                {/* All prices side by side so you can compare; the metric that
                    feeds the running total is highlighted. */}
                <div className="shrink-0 space-y-0.5">
                  {metrics.map((m) => {
                    const v = priceByMetric(r.price, m.key);
                    const active = m.key === metric;
                    return (
                      <div
                        key={m.key}
                        className={cn(
                          "flex items-center justify-end gap-2 rounded px-1.5 py-0.5",
                          active && "bg-primary/10",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px] leading-none",
                            active ? "font-semibold text-primary" : "text-muted-foreground",
                          )}
                        >
                          {m.th}
                        </span>
                        <span
                          className={cn(
                            "w-[76px] text-right text-xs font-bold tabular-nums",
                            v == null
                              ? "text-muted-foreground/40"
                              : active
                                ? "text-primary"
                                : "text-foreground",
                          )}
                        >
                          {formatBaht(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetail(r.it);
                  }}
                  title="ดูรายละเอียด"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ItemDetailDialog item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
