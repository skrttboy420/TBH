"use client";

import { useState } from "react";
import { Lock, Swords } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/game/items";
import { heroName, heroIconUrl, heroFullArtUrl } from "@/lib/game/characters";
import { classSkillIds, skillName, skillDesc } from "@/lib/game/skills";
import type { HeroState } from "@/lib/types/save";

function equippedCount(hero: HeroState): number {
  return hero.equippedItemIds.filter((id) => id && id !== "0").length;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SkillRow({ skillId, learned }: { skillId: number; learned: boolean }) {
  const name = skillName(skillId);
  const desc = skillDesc(skillId);
  return (
    <li
      className={cn(
        "flex gap-3 rounded-lg border border-border bg-secondary/30 p-2.5",
        !learned && "opacity-55",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
          learned
            ? "border-primary/60 bg-primary/15 text-primary"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <Swords className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          {learned ? (
            <Badge variant="success" className="shrink-0">
              เรียนแล้ว
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              ยังไม่ปลด
            </Badge>
          )}
        </div>
        {desc ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{desc}</p>
        ) : null}
      </div>
    </li>
  );
}

export function HeroCard({ hero }: { hero: HeroState }) {
  const [open, setOpen] = useState(false);
  const name = heroName(hero.heroKey);
  const icon = heroIconUrl(hero.heroKey);
  const fullArt = heroFullArtUrl(hero.heroKey);
  const equipped = equippedCount(hero);
  const skillIds = classSkillIds(hero.heroKey);
  const learnedSet = new Set(hero.skills);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card
        role="button"
        tabIndex={0}
        aria-label={`ดูสถานะ ${name}`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "cursor-pointer p-4 outline-none transition hover:border-primary/50 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring",
          !hero.isUnlock && "opacity-60",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/40">
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={icon}
                alt={name}
                className="h-11 w-11 object-contain"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">{name.charAt(0)}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">#{hero.heroKey}</p>
          </div>
          {hero.isUnlock ? (
            <Badge>เลเวล {hero.level}</Badge>
          ) : (
            <Badge variant="secondary">
              <Lock className="mr-1 h-3 w-3" />
              ล็อก
            </Badge>
          )}
        </div>
        {hero.isUnlock ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">EXP</dt>
            <dd className="text-right tabular-nums">{formatNumber(hero.exp)}</dd>
            <dt className="text-muted-foreground">แต้มสกิล</dt>
            <dd className="text-right tabular-nums">
              {hero.allocatedAbilityPoint}/{hero.abilityPoint + hero.allocatedAbilityPoint}
            </dd>
            <dt className="text-muted-foreground">สวมใส่</dt>
            <dd className="text-right tabular-nums">{equipped} ชิ้น</dd>
          </dl>
        ) : null}
      </Card>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {name}
            <span className="text-sm font-normal text-muted-foreground">#{hero.heroKey}</span>
            {hero.isUnlock ? (
              <Badge className="ml-auto">เลเวล {hero.level}</Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto">
                <Lock className="mr-1 h-3 w-3" />
                ล็อก
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* รูปเต็มตัว */}
        <div className="flex items-end justify-center rounded-xl border border-border bg-gradient-to-b from-secondary/20 to-secondary/60 p-3">
          {fullArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullArt}
              alt={name}
              className="h-52 w-auto object-contain"
              style={{ imageRendering: "pixelated" }}
              draggable={false}
            />
          ) : (
            <span className="py-16 text-5xl font-bold text-muted-foreground">
              {name.charAt(0)}
            </span>
          )}
        </div>

        {/* สถานะ */}
        <section>
          <h3 className="mb-1 text-sm font-semibold text-muted-foreground">สถานะ</h3>
          {hero.isUnlock ? (
            <dl className="rounded-lg border border-border bg-card px-3 py-1">
              <StatRow label="เลเวล" value={String(hero.level)} />
              <StatRow label="ค่าประสบการณ์" value={formatNumber(hero.exp)} />
              <StatRow
                label="แต้มทักษะ (ใช้แล้ว/ทั้งหมด)"
                value={`${hero.allocatedAbilityPoint}/${hero.abilityPoint + hero.allocatedAbilityPoint}`}
              />
              <StatRow label="อุปกรณ์ที่สวมใส่" value={`${equipped} ชิ้น`} />
            </dl>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              ยังไม่ปลดล็อกฮีโร่นี้
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            * พลังโจมตี/HP/DPS เกมคำนวณสดจากอุปกรณ์+รูน จึงไม่มีในไฟล์เซฟ
          </p>
        </section>

        {/* สกิล */}
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">
            สกิล ({skillIds.filter((id) => learnedSet.has(id)).length}/{skillIds.length})
          </h3>
          <ul className="grid gap-2">
            {skillIds.map((id) => (
              <SkillRow key={id} skillId={id} learned={learnedSet.has(id)} />
            ))}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
