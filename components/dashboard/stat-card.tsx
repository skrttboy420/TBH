import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "info";
}) {
  const accentClass =
    accent === "success"
      ? "bg-success/15 text-success"
      : accent === "warning"
        ? "bg-warning/15 text-warning"
        : accent === "info"
          ? "bg-info/15 text-info"
          : "bg-primary/15 text-primary";

  return (
    <Card className="flex items-center gap-4 p-4">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
          accentClass,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold tabular-nums">{value}</p>
        {hint ? (
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </Card>
  );
}
