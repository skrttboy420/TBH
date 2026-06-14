// ---------------------------------------------------------------------------
// Loot-box catalog. The save's BoxData.BoxTypes is a numeric enum, confirmed
// against real saves (type 0 = common drops in bulk, type 1 = stage-boss).
// Names come from Localization (TreasureChest_Normal/StageBoss/ActBoss).
// Icons (16×16, colour-distinct) extracted to /public/boxes/<type>.png:
//   0 = ทอง (ธรรมดา) · 1 = ฟ้า (ด่าน/บอส) · 2 = ม่วง (บอสแอค)
// See agent/extract_status.py + agent/extract_boxes.py.
// ---------------------------------------------------------------------------
export interface BoxEntry {
  th: string;
  en: string;
  icon: string; // "<type>.png" under /public/boxes/
}

const BOX_CATALOG: Record<number, BoxEntry> = {
  0: { th: "หีบสมบัติธรรมดา", en: "Common Treasure Chest", icon: "0.png" },
  1: { th: "หีบสมบัติด่าน", en: "Stage Treasure Chest", icon: "1.png" },
  2: { th: "หีบสมบัติบอสแอค", en: "Act Boss Treasure Chest", icon: "2.png" },
};

export function boxEntry(type: number): BoxEntry | null {
  return BOX_CATALOG[type] ?? null;
}

/** ชื่อหีบ (ไทย) จากเลข type, fallback เป็น "กล่อง #type". */
export function boxName(type: number): string {
  return boxEntry(type)?.th ?? `กล่อง #${type}`;
}

/** URL รูปหีบใน /public/boxes, หรือ null ถ้าไม่รู้จัก type. */
export function boxIconUrl(type: number): string | null {
  const e = boxEntry(type);
  return e ? `/boxes/${e.icon}` : null;
}
