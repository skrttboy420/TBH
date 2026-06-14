"use client";

import { useState } from "react";
import { Lock, PawPrint, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { petName, petIconUrl } from "@/lib/game/characters";
import type { PetState } from "@/lib/types/save";

export function PetCard({ pet, effects }: { pet: PetState; effects: string[] }) {
  const [open, setOpen] = useState(false);
  const name = petName(pet.petKey);
  const icon = petIconUrl(pet.petKey);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card
        role="button"
        tabIndex={0}
        aria-label={`ดูข้อมูล ${name}`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 p-4 text-center outline-none transition hover:border-primary/50 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring",
          !pet.isUnlock && "opacity-50",
        )}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-secondary/40">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt={name}
              className="h-12 w-12 object-contain"
              style={{ imageRendering: "pixelated" }}
              draggable={false}
            />
          ) : (
            <PawPrint className="h-6 w-6 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">#{pet.petKey}</p>
        </div>
        {pet.isUnlock ? (
          <Badge variant="success">ปลดล็อก</Badge>
        ) : (
          <Badge variant="secondary">
            <Lock className="mr-1 h-3 w-3" />
            ยังไม่ได้
          </Badge>
        )}
      </Card>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {name}
            <span className="text-sm font-normal text-muted-foreground">#{pet.petKey}</span>
            {pet.isUnlock ? (
              <Badge variant="success" className="ml-auto">
                ปลดล็อก
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto">
                <Lock className="mr-1 h-3 w-3" />
                ยังไม่ได้
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* รูปสัตว์เลี้ยง */}
        <div className="flex items-center justify-center rounded-xl border border-border bg-gradient-to-b from-secondary/20 to-secondary/60 p-4">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt={name}
              className="h-32 w-auto object-contain"
              style={{ imageRendering: "pixelated" }}
              draggable={false}
            />
          ) : (
            <PawPrint className="h-20 w-20 text-muted-foreground" />
          )}
        </div>

        {/* ความสามารถ */}
        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            ความสามารถ
          </h3>
          {effects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              ไม่มีข้อมูลความสามารถ
            </p>
          ) : (
            <ul className="space-y-1.5">
              {effects.map((text, i) => (
                <li
                  key={i}
                  className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
                >
                  {text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
