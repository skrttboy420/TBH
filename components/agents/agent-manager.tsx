"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Pencil,
  MoreVertical,
  KeyRound,
  MonitorSmartphone,
} from "lucide-react";
import type { AgentRow } from "@/lib/types/database";
import { apiFetch } from "@/lib/api/client";
import { timeAgo } from "@/lib/format/time";
import { AgentStatusBadge } from "@/components/agents/agent-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/ui/use-toast";

type TokenReveal = { name: string; token: string; rotated: boolean };

export function AgentManager({ agents }: { agents: AgentRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const [reveal, setReveal] = React.useState<TokenReveal | null>(null);
  const [rename, setRename] = React.useState<AgentRow | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [rotateTarget, setRotateTarget] = React.useState<AgentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AgentRow | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "ทำรายการไม่สำเร็จ",
        description: err instanceof Error ? err.message : "ลองอีกครั้ง",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleCreate() {
    return run(async () => {
      const data = await apiFetch<{ agent: AgentRow; token: string }>("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setCreateOpen(false);
      setNewName("");
      setReveal({ name: data.agent.name, token: data.token, rotated: false });
      router.refresh();
    });
  }

  function handleRename() {
    if (!rename) return;
    const target = rename;
    return run(async () => {
      await apiFetch<{ agent: AgentRow }>(`/api/v1/agents/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setRename(null);
      router.refresh();
      toast({ title: "เปลี่ยนชื่อแล้ว" });
    });
  }

  function handleRotate() {
    if (!rotateTarget) return;
    const target = rotateTarget;
    return run(async () => {
      const data = await apiFetch<{ agent: AgentRow; token: string }>(
        `/api/v1/agents/${target.id}/rotate`,
        { method: "POST" },
      );
      setRotateTarget(null);
      setReveal({ name: data.agent.name, token: data.token, rotated: true });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    return run(async () => {
      await apiFetch(`/api/v1/agents/${target.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      router.refresh();
      toast({ title: "ลบเครื่องแล้ว" });
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          เพิ่มเครื่อง
        </Button>
      </div>

      {agents.length === 0 ? (
        <EmptyState
          icon={MonitorSmartphone}
          title="ยังไม่มีเครื่องเอเจนต์"
          description="สร้างเครื่องเอเจนต์เพื่อรับโทเค็นสำหรับเชื่อมต่อโปรแกรมบนพีซีที่เล่นเกม"
        >
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มเครื่อง
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <Card key={a.id} className="flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{a.name}</p>
                  <AgentStatusBadge status={a.status} lastSeenAt={a.last_seen_at} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <code className="rounded bg-secondary px-1 py-0.5">{a.token_prefix}…</code>
                  {a.hostname ? ` · ${a.hostname}` : ""}
                  {a.agent_version ? ` · v${a.agent_version}` : ""}
                  {` · พบล่าสุด ${timeAgo(a.last_seen_at)}`}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="ตัวเลือก">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setRename(a);
                      setRenameValue(a.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    เปลี่ยนชื่อ
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRotateTarget(a)}>
                    <RefreshCw className="h-4 w-4" />
                    หมุนโทเค็นใหม่
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDeleteTarget(a)}
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบเครื่อง
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มเครื่องเอเจนต์</DialogTitle>
            <DialogDescription>
              ตั้งชื่อเครื่องที่จำง่าย เช่น ชื่อพีซีที่ใช้เล่นเกม
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="agent-name">ชื่อเครื่อง</Label>
            <Input
              id="agent-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="พีซีห้องนอน"
              maxLength={60}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={busy || newName.trim().length === 0}>
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={rename !== null} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนชื่อเครื่อง</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">ชื่อใหม่</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRename(null)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button onClick={handleRename} disabled={busy || renameValue.trim().length === 0}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate confirm */}
      <Dialog open={rotateTarget !== null} onOpenChange={(o) => !o && setRotateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>หมุนโทเค็นใหม่?</DialogTitle>
            <DialogDescription>
              โทเค็นเดิมของ “{rotateTarget?.name}” จะใช้ไม่ได้ทันที ต้องตั้งค่าโทเค็นใหม่ในโปรแกรมเอเจนต์
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRotateTarget(null)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button onClick={handleRotate} disabled={busy}>
              หมุนโทเค็น
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบเครื่องนี้?</DialogTitle>
            <DialogDescription>
              จะลบ “{deleteTarget?.name}” และข้อมูลที่เกี่ยวข้องทั้งหมดอย่างถาวร การกระทำนี้ย้อนกลับไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              ลบถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token reveal */}
      <TokenDialog reveal={reveal} onClose={() => setReveal(null)} />
    </>
  );
}

function TokenDialog({
  reveal,
  onClose,
}: {
  reveal: TokenReveal | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (reveal) setCopied(false);
  }, [reveal]);

  async function copy() {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.token);
      setCopied(true);
      toast({ title: "คัดลอกโทเค็นแล้ว" });
    } catch {
      toast({ variant: "destructive", title: "คัดลอกไม่สำเร็จ", description: "คัดลอกด้วยตนเอง" });
    }
  }

  return (
    <Dialog open={reveal !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {reveal?.rotated ? "โทเค็นใหม่" : "เครื่องพร้อมใช้งาน"}
          </DialogTitle>
          <DialogDescription>
            คัดลอกโทเค็นนี้ไปใส่ในโปรแกรมเอเจนต์ของ “{reveal?.name}” —{" "}
            <strong className="text-warning">จะแสดงเพียงครั้งเดียว</strong> เก็บไว้ให้ดี
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-sm">{reveal?.token}</code>
          <Button size="icon" variant="ghost" onClick={copy} aria-label="คัดลอก">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>เสร็จสิ้น</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
