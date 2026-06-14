import catalogJson from "./skill-catalog.generated.json";

// ---------------------------------------------------------------------------
// Skill catalog (generated from the game's Unity Localization).
// Skill id = class*10000 + slot*100 + 1  (e.g. 10101 = Knight skill #1).
// slot 0 (x0001) is the always-on basic attack (no localized name).
// See agent/extract_status.py.
// ---------------------------------------------------------------------------
export interface SkillEntry {
  th: string | null;
  en: string | null;
  descTh: string | null;
  descEn: string | null;
  basic: boolean;
}

const CATALOG = catalogJson as Record<string, SkillEntry>;

export function skillEntry(skillId: number): SkillEntry | null {
  return CATALOG[String(skillId)] ?? null;
}

/** Display name (Thai > English). Basic attack -> "โจมตีพื้นฐาน". */
export function skillName(skillId: number): string {
  const e = skillEntry(skillId);
  if (!e) return `สกิล #${skillId}`;
  if (e.basic) return e.th?.trim() || e.en?.trim() || "โจมตีพื้นฐาน";
  return e.th?.trim() || e.en?.trim() || `สกิล #${skillId}`;
}

function clean(s: string | null): string | null {
  if (!s) return null;
  // ตัวแปร {0}{1}… คือค่าที่คำนวณตามเลเวลในเกม (ไม่มีในไฟล์เซฟ) → แทนด้วย —
  return s.replace(/\{\d+\}/g, "—").trim() || null;
}

/** คำอธิบายสกิล (ไทย > อังกฤษ) โดยตัดตัวแปรค่าตามเลเวลออก. */
export function skillDesc(skillId: number): string | null {
  const e = skillEntry(skillId);
  if (!e) return null;
  return clean(e.descTh) ?? clean(e.descEn);
}

/** 6 สกิลประจำคลาสของฮีโร่ (slot 1-6) เรียงตามช่อง. */
export function classSkillIds(heroKey: number): number[] {
  const cls = Math.floor(heroKey / 100); // 101 -> 1, 601 -> 6
  return [1, 2, 3, 4, 5, 6].map((slot) => cls * 10000 + slot * 100 + 1);
}
