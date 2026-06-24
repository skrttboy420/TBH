"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light/dark theme switch for the header.
 *
 * Flips the `.dark` class on <html> and remembers the choice in
 * localStorage('theme'). The no-FOUC script in app/layout.tsx reads that key on
 * boot, so the page never flashes the wrong theme. The icon is driven purely by
 * the `.dark` class via Tailwind's `dark:` variants — no React state — so it's
 * always correct even before hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const nowDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", nowDark ? "dark" : "light");
    } catch {
      /* localStorage blocked (private mode) — theme still toggles for this view */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="สลับธีมสว่าง/มืด"
      title="สลับธีมสว่าง/มืด"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {/* Sun shows in dark mode (click → light); Moon shows in light mode. */}
      <Sun className="hidden h-[18px] w-[18px] dark:block" />
      <Moon className="block h-[18px] w-[18px] dark:hidden" />
      <span className="sr-only">สลับธีม</span>
    </button>
  );
}
