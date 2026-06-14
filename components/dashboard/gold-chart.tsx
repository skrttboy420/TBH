"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { formatCompact, formatNumber } from "@/lib/game/items";

export interface GoldPoint {
  t: string; // ISO captured_at
  gold: number;
}

function tickTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : format(d, "HH:mm");
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GoldPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const d = new Date(p.t);
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">
        {Number.isNaN(d.getTime()) ? "—" : format(d, "d MMM HH:mm")}
      </p>
      <p className="font-semibold text-warning">{formatNumber(p.gold)} ทอง</p>
    </div>
  );
}

export function GoldChart({ data }: { data: GoldPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        ยังมีข้อมูลไม่พอสำหรับวาดกราฟ
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={tickTime}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v as number)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="gold"
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            fill="url(#goldFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
