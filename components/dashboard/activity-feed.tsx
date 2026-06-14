import {
  Swords,
  Crown,
  ArrowUpCircle,
  Play,
  Square,
  Wifi,
  WifiOff,
  Coins,
  Sparkles,
  AlertTriangle,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEventRow, ActivityType } from "@/lib/types/database";
import { timeAgo } from "@/lib/format/time";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityType, LucideIcon> = {
  stage_cleared: Swords,
  boss_cleared: Crown,
  level_up: ArrowUpCircle,
  farm_started: Play,
  farm_stopped: Square,
  agent_online: Wifi,
  agent_offline: WifiOff,
  gold_milestone: Coins,
  item_found: Sparkles,
  error: AlertTriangle,
  info: Info,
};

const TONE: Record<ActivityType, string> = {
  stage_cleared: "bg-primary/15 text-primary",
  boss_cleared: "bg-rarity-legendary/15 text-rarity-legendary",
  level_up: "bg-success/15 text-success",
  farm_started: "bg-success/15 text-success",
  farm_stopped: "bg-muted text-muted-foreground",
  agent_online: "bg-success/15 text-success",
  agent_offline: "bg-muted text-muted-foreground",
  gold_milestone: "bg-warning/15 text-warning",
  item_found: "bg-info/15 text-info",
  error: "bg-destructive/15 text-destructive",
  info: "bg-secondary text-secondary-foreground",
};

/** A repeated farm re-clear of the same stage collapses into one row (×N).
 * Returns a stable key for such events, or null for everything else. */
function farmGroupKey(e: ActivityEventRow): string | null {
  if (e.type !== "stage_cleared" && e.type !== "boss_cleared") return null;
  const d = e.data;
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const meta = d as { farm?: unknown; stageKey?: unknown };
  if (meta.farm !== true) return null;
  return `${e.type}:${typeof meta.stageKey === "number" ? meta.stageKey : "?"}`;
}

/** Clears-this-event + approx seconds/round the agent attached. One event can
 * stand for several clears bundled between two infrequent save writes. */
function farmMeta(e: ActivityEventRow): { count: number; sec: number | null } {
  const d = e.data;
  if (!d || typeof d !== "object" || Array.isArray(d)) return { count: 1, sec: null };
  const m = d as { count?: unknown; secondsPerRound?: unknown };
  const count = typeof m.count === "number" && m.count > 0 ? m.count : 1;
  const sec =
    typeof m.secondsPerRound === "number" && m.secondsPerRound > 0 ? m.secondsPerRound : null;
  return { count, sec };
}

export function ActivityFeed({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        ยังไม่มีกิจกรรม
      </p>
    );
  }

  // Events arrive newest-first; collapse adjacent identical farm clears so a long
  // farming session reads "เคลียร์ 3-5 ×12" instead of flooding the feed. Each
  // event's data.count sums into the total, and seconds/round is a clear-weighted
  // average across the merged events (secWeighted = Σ sec·count over events that
  // carried a time).
  const groups: {
    event: ActivityEventRow;
    total: number;
    secWeighted: number;
    secCount: number;
  }[] = [];
  for (const e of events) {
    const k = farmGroupKey(e);
    const { count, sec } = farmMeta(e);
    const last = groups[groups.length - 1];
    if (k && last && farmGroupKey(last.event) === k) {
      last.total += count;
      if (sec !== null) {
        last.secWeighted += sec * count;
        last.secCount += count;
      }
    } else {
      groups.push({
        event: e,
        total: k ? count : 1,
        secWeighted: k && sec !== null ? sec * count : 0,
        secCount: k && sec !== null ? count : 0,
      });
    }
  }

  return (
    <ol className="space-y-1">
      {groups.map(({ event: e, total, secWeighted, secCount }) => {
        const Icon = ICONS[e.type] ?? Info;
        const avgSec = secCount > 0 ? Math.round(secWeighted / secCount) : null;
        return (
          <li key={e.id} className="flex items-start gap-3 rounded-lg px-1 py-2">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                TONE[e.type] ?? "bg-secondary text-secondary-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {e.title}
                {total > 1 ? (
                  <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                    ×{total}
                  </span>
                ) : null}
                {avgSec ? (
                  <span className="ml-1.5 text-xs font-normal tabular-nums text-muted-foreground">
                    ~{avgSec}วิ{total > 1 ? "/รอบ" : ""}
                  </span>
                ) : null}
              </p>
              {e.description ? (
                <p className="truncate text-xs text-muted-foreground">{e.description}</p>
              ) : null}
            </div>
            <time className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(e.occurred_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
