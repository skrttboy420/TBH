import type { CommandName, CommandStatus } from "@/lib/types/database";

export const COMMAND_LABELS: Record<CommandName, string> = {
  START_FARM: "เริ่มฟาร์ม",
  STOP_FARM: "หยุดฟาร์ม",
  TAKE_SCREENSHOT: "จับภาพหน้าจอ",
  GET_STATUS: "ขอสถานะ",
  READ_SAVE: "อ่านเซฟ",
};

export const COMMAND_STATUS_LABELS: Record<CommandStatus, string> = {
  pending: "รอส่ง",
  sent: "ส่งแล้ว",
  acknowledged: "รับทราบ",
  completed: "สำเร็จ",
  failed: "ล้มเหลว",
  expired: "หมดอายุ",
};

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "outline";

export const COMMAND_STATUS_VARIANT: Record<CommandStatus, BadgeVariant> = {
  pending: "secondary",
  sent: "info",
  acknowledged: "info",
  completed: "success",
  failed: "destructive",
  expired: "outline",
};
