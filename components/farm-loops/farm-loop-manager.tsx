"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Repeat,
  Trash2,
  Pencil,
  MoreVertical,
  ArrowRight,
  RotateCcw,
  Minus,
  Crosshair,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
} from "lucide-react";
import type { FarmLoopSetWithSteps, FarmLoopStepRow } from "@/lib/types/database";
import { apiFetch } from "@/lib/api/client";
import { decodeStage, encodeStage, BOSS_STAGE } from "@/lib/game/stages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

// Difficulty is fixed to Normal for now (the only tier the player farms / that's
// unlocked). The stage key still encodes it, so widening later is trivial.
const DIFFICULTY = 1;

const uid = () => Math.random().toString(36).slice(2);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** "1-4" for a stage row. */
function stepLabel(stageKey: number): string {
  const d = decodeStage(stageKey);
  return d ? d.label : `#${stageKey}`;
}

export function FarmLoopManager({ sets }: { sets: FarmLoopSetWithSteps[] }) {
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<FarmLoopSetWithSteps | null>(null);

  function openCreate() {
    setEditTarget(null);
    setEditorOpen(true);
  }
  function openEdit(set: FarmLoopSetWithSteps) {
    setEditTarget(set);
    setEditorOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          สร้างชุดฟาร์ม
        </Button>
      </div>

      {sets.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="ยังไม่มีชุดฟาร์มลูป"
          description="สร้างแผนวนลูปฟาร์ม เช่น “ฟาร์มกล่องฟ้า” แล้วใส่ด่านกับจำนวนรอบที่จะวน เพื่อจะได้ไม่ลืมว่าวนถึงด่านไหนแล้ว"
        >
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            สร้างชุดฟาร์ม
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {sets.map((set) => (
            <FarmLoopCard key={set.id} set={set} onEdit={() => openEdit(set)} />
          ))}
        </div>
      )}

      <LoopEditorDialog
        open={editorOpen}
        set={editTarget}
        onClose={() => setEditorOpen(false)}
      />
    </>
  );
}

// ── one saved set: live controls + step ledger ───────────────────────────────
function FarmLoopCard({
  set,
  onEdit,
}: {
  set: FarmLoopSetWithSteps;
  onEdit: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const steps = set.steps;
  const current =
    steps.find((s) => s.id === set.current_step_id) ?? steps[0] ?? null;
  const totalDone = steps.reduce((a, s) => a + s.completed_rounds, 0);
  const totalTarget = steps.reduce((a, s) => a + s.target_rounds, 0);

  async function progress(action: string, stepId?: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/farm-loops/${set.id}/progress`, {
        method: "POST",
        body: JSON.stringify({ action, stepId }),
      });
      router.refresh();
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

  async function handleDelete() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/farm-loops/${set.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      router.refresh();
      toast({ title: "ลบชุดฟาร์มแล้ว" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "ลบไม่สำเร็จ",
        description: err instanceof Error ? err.message : "ลองอีกครั้ง",
      });
    } finally {
      setBusy(false);
    }
  }

  const currentDone = current ? current.completed_rounds >= current.target_rounds : false;

  return (
    <Card>
      <CardContent className="p-5">
        {/* header */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Repeat className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{set.name}</p>
            {set.description ? (
              <p className="truncate text-sm text-muted-foreground">{set.description}</p>
            ) : null}
          </div>
          <Badge variant="secondary" className="shrink-0">
            รวม {totalDone}/{totalTarget} รอบ
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="ตัวเลือก">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="h-4 w-4" />
                แก้ไขชุด
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                รีเซ็ตรอบ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                ลบชุด
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* current-step control panel */}
        {current ? (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">กำลังวนด่าน</p>
                <p className="text-2xl font-bold leading-tight">
                  {stepLabel(current.stage_key)}
                  {decodeStage(current.stage_key)?.isBoss ? (
                    <span className="ml-2 align-middle text-xs font-medium text-warning">บอส</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  วนแล้ว{" "}
                  <span className={currentDone ? "font-semibold text-success" : "font-semibold text-foreground"}>
                    {current.completed_rounds}/{current.target_rounds}
                  </span>{" "}
                  รอบ
                  {currentDone ? " · ครบแล้ว ไปด่านถัดไปได้เลย" : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  นับรอบให้อัตโนมัติจากประวัติการเล่น — ปุ่ม +/− ไว้ปรับเองได้
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={busy || current.completed_rounds === 0}
                  onClick={() => progress("decrement", current.id)}
                  aria-label="ลดรอบ"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="success"
                  disabled={busy}
                  onClick={() => progress("increment", current.id)}
                >
                  <Plus className="h-4 w-4" />
                  +1 รอบ
                </Button>
                <Button
                  variant={currentDone ? "default" : "outline"}
                  disabled={busy || steps.length < 2}
                  onClick={() => progress("advance")}
                >
                  ไปด่านถัดไป
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* full step ledger */}
        <ul className="mt-4 space-y-1.5">
          {steps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              index={i}
              isCurrent={current?.id === step.id}
              busy={busy}
              onSetCurrent={() => progress("setCurrent", step.id)}
              onInc={() => progress("increment", step.id)}
              onDec={() => progress("decrement", step.id)}
            />
          ))}
        </ul>
      </CardContent>

      {/* reset confirm */}
      <Dialog open={resetOpen} onOpenChange={(o) => !o && setResetOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รีเซ็ตรอบทั้งหมด?</DialogTitle>
            <DialogDescription>
              จำนวนรอบที่นับไว้ของ “{set.name}” จะกลับเป็น 0 ทุกด่าน และกลับไปเริ่มที่ด่านแรก
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button
              onClick={async () => {
                await progress("reset");
                setResetOpen(false);
                toast({ title: "รีเซ็ตรอบแล้ว" });
              }}
              disabled={busy}
            >
              รีเซ็ต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบชุดฟาร์มนี้?</DialogTitle>
            <DialogDescription>
              จะลบ “{set.name}” อย่างถาวร การกระทำนี้ย้อนกลับไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              ลบถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StepRow({
  step,
  index,
  isCurrent,
  busy,
  onSetCurrent,
  onInc,
  onDec,
}: {
  step: FarmLoopStepRow;
  index: number;
  isCurrent: boolean;
  busy: boolean;
  onSetCurrent: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const done = step.completed_rounds >= step.target_rounds;
  const pct = step.target_rounds > 0
    ? clamp((step.completed_rounds / step.target_rounds) * 100, 0, 100)
    : 0;

  return (
    <li
      className={
        "flex items-center gap-3 rounded-lg border px-3 py-2 " +
        (isCurrent ? "border-primary/40 bg-primary/5" : "border-border")
      }
    >
      <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{index + 1}</span>
      <button
        type="button"
        onClick={onSetCurrent}
        disabled={busy || isCurrent}
        title={isCurrent ? "ด่านปัจจุบัน" : "ตั้งเป็นด่านปัจจุบัน"}
        className="shrink-0 text-muted-foreground hover:text-primary disabled:text-primary disabled:opacity-100"
        aria-label="ตั้งเป็นด่านปัจจุบัน"
      >
        <Crosshair className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{stepLabel(step.stage_key)}</span>
          {decodeStage(step.stage_key)?.isBoss ? (
            <span className="text-[10px] font-medium text-warning">บอส</span>
          ) : null}
          {done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : null}
        </div>
        <Progress
          value={pct}
          className="mt-1 h-1.5"
          indicatorClassName={done ? "bg-success" : "bg-primary"}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
        {step.completed_rounds}/{step.target_rounds}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={busy || step.completed_rounds === 0}
          onClick={onDec}
          aria-label="ลดรอบ"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={busy}
          onClick={onInc}
          aria-label="เพิ่มรอบ"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

// ── create / edit dialog ─────────────────────────────────────────────────────
type EditorRow = { uid: string; act: number; stage: number; target: number };

function rowsFromSet(set: FarmLoopSetWithSteps | null): EditorRow[] {
  if (!set || set.steps.length === 0) return [{ uid: uid(), act: 1, stage: 1, target: 1 }];
  return set.steps.map((s) => {
    const d = decodeStage(s.stage_key);
    return { uid: uid(), act: d?.act ?? 1, stage: d?.stage ?? 1, target: s.target_rounds };
  });
}

function LoopEditorDialog({
  open,
  set,
  onClose,
}: {
  open: boolean;
  set: FarmLoopSetWithSteps | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rows, setRows] = React.useState<EditorRow[]>([{ uid: uid(), act: 1, stage: 1, target: 1 }]);

  // resync the form whenever the dialog opens or the edit target changes
  React.useEffect(() => {
    if (!open) return;
    setName(set?.name ?? "");
    setDescription(set?.description ?? "");
    setRows(rowsFromSet(set));
  }, [open, set]);

  const isEdit = set !== null;

  function patchRow(rowUid: string, patch: Partial<EditorRow>) {
    setRows((rs) => rs.map((r) => (r.uid === rowUid ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => {
      const last = rs[rs.length - 1];
      return [...rs, { uid: uid(), act: last?.act ?? 1, stage: 1, target: 1 }];
    });
  }
  function removeRow(rowUid: string) {
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.uid !== rowUid)));
  }
  function move(rowUid: string, dir: -1 | 1) {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.uid === rowUid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const copy = rs.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    const steps = rows.map((r) => ({
      stageKey: encodeStage(DIFFICULTY, clamp(r.act, 1, 99), clamp(r.stage, 1, BOSS_STAGE)),
      targetRounds: clamp(r.target, 1, 9999),
    }));
    setBusy(true);
    try {
      if (isEdit && set) {
        await apiFetch(`/api/v1/farm-loops/${set.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed, description: description.trim() || null, steps }),
        });
      } else {
        await apiFetch("/api/v1/farm-loops", {
          method: "POST",
          body: JSON.stringify({ name: trimmed, description: description.trim() || null, steps }),
        });
      }
      onClose();
      router.refresh();
      toast({ title: isEdit ? "บันทึกชุดฟาร์มแล้ว" : "สร้างชุดฟาร์มแล้ว" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "บันทึกไม่สำเร็จ",
        description: err instanceof Error ? err.message : "ลองอีกครั้ง",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขชุดฟาร์ม" : "สร้างชุดฟาร์มลูป"}</DialogTitle>
          <DialogDescription>
            ใส่ด่านที่จะวนตามลำดับ พร้อมจำนวนรอบเป้าหมายของแต่ละด่าน (ความยาก: ปกติ)
            {isEdit ? " · การแก้ไขด่านจะเริ่มนับรอบใหม่" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="loop-name">ชื่อชุด</Label>
            <Input
              id="loop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ฟาร์มกล่องฟ้า"
              maxLength={60}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loop-desc">คำอธิบาย (ไม่บังคับ)</Label>
            <Input
              id="loop-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น วนเก็บกล่องฟ้า"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>ด่านที่จะวน</Label>
            <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
              {rows.map((row, i) => (
                <div
                  key={row.uid}
                  className="flex items-end gap-2 rounded-lg border border-border p-2.5"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">ลำดับ</span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(row.uid, -1)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="เลื่อนขึ้น"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(row.uid, 1)}
                        disabled={i === rows.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="เลื่อนลง"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-16 space-y-1">
                    <span className="text-[10px] text-muted-foreground">องก์</span>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={row.act}
                      onChange={(e) => patchRow(row.uid, { act: Number(e.target.value) || 1 })}
                      className="h-9 px-2"
                    />
                  </div>
                  <div className="w-16 space-y-1">
                    <span className="text-[10px] text-muted-foreground">ด่าน</span>
                    <Input
                      type="number"
                      min={1}
                      max={BOSS_STAGE}
                      value={row.stage}
                      onChange={(e) => patchRow(row.uid, { stage: Number(e.target.value) || 1 })}
                      className="h-9 px-2"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <span className="text-[10px] text-muted-foreground">รอบ</span>
                    <Input
                      type="number"
                      min={1}
                      max={9999}
                      value={row.target}
                      onChange={(e) => patchRow(row.uid, { target: Number(e.target.value) || 1 })}
                      className="h-9 px-2"
                    />
                  </div>
                  <div className="flex flex-1 items-center justify-end gap-2 pb-1">
                    <span className="text-xs text-muted-foreground">
                      = {clamp(row.act, 1, 99)}-{clamp(row.stage, 1, BOSS_STAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(row.uid)}
                      disabled={rows.length <= 1}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                      aria-label="ลบด่าน"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addRow} disabled={rows.length >= 50}>
              <Plus className="h-4 w-4" />
              เพิ่มด่าน
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={save} disabled={busy || name.trim().length === 0}>
            {isEdit ? "บันทึก" : "สร้าง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
