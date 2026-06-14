import { format, isToday, isYesterday } from "date-fns";
import { th } from "date-fns/locale";
import type { ActivityEventRow } from "@/lib/types/database";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "unknown" : format(d, "yyyy-MM-dd");
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "ไม่ทราบวันที่";
  if (isToday(d)) return "วันนี้";
  if (isYesterday(d)) return "เมื่อวาน";
  return format(d, "EEEE d MMM yyyy", { locale: th });
}

/** Activity grouped under date headers — a fuller "play history" timeline.
 * Events arrive newest-first; grouping preserves that order. */
export function PlayHistoryTimeline({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        ยังไม่มีประวัติการเล่น — เมื่อเอเจนต์เริ่มส่งข้อมูล กิจกรรมจะมาแสดงที่นี่
      </p>
    );
  }

  const groups: { key: string; label: string; items: ActivityEventRow[] }[] = [];
  for (const e of events) {
    const key = dayKey(e.occurred_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(e);
    } else {
      groups.push({ key, label: dayLabel(e.occurred_at), items: [e] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="mb-1 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
            <span className="ml-2 font-normal normal-case">· {g.items.length} รายการ</span>
          </h3>
          <ActivityFeed events={g.items} />
        </div>
      ))}
    </div>
  );
}
