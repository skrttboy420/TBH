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

export function ActivityFeed({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        ยังไม่มีกิจกรรม
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {events.map((e) => {
        const Icon = ICONS[e.type] ?? Info;
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
              <p className="text-sm font-medium leading-tight">{e.title}</p>
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
