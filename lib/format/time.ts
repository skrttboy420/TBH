import { format, formatDistanceToNowStrict } from "date-fns";
import { th } from "date-fns/locale";

/** "3 นาทีที่แล้ว" — relative, Thai. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: th });
}

/** "13 มิ.ย. 2026 14:32" — absolute, Thai. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy HH:mm", { locale: th });
}

/** "14:32" — clock only. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "HH:mm", { locale: th });
}
