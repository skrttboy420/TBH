"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentRow } from "@/lib/types/database";

/** Switches the active agent via the `?agent=` query param. Hidden for ≤1 agent. */
export function AgentSwitcher({
  agents,
  activeId,
}: {
  agents: Pick<AgentRow, "id" | "name">[];
  activeId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (agents.length < 2) return null;

  function onChange(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("agent", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <Select value={activeId} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[200px]">
        <SelectValue placeholder="เลือกเครื่อง" />
      </SelectTrigger>
      <SelectContent>
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
