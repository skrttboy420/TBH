import Link from "next/link";
import { Swords } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]" />
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <span className="glow-primary flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Swords className="h-5 w-5" />
        </span>
        <span>TBH Companion</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        ตัวช่วยฟาร์มสำหรับ Taskbar Hero · ใช้ส่วนตัว
      </p>
    </div>
  );
}
