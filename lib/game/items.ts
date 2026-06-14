import type { InventoryItem } from "@/lib/types/save";
import catalogJson from "./item-catalog.generated.json";

// ---------------------------------------------------------------------------
// Item catalog (generated from the game's Unity Localization + SpriteAtlas).
// Maps a *base* item key -> Thai/English name, type, slot, and icon filename.
// Icons live in /public/items/<icon>; see agent/extract_catalog.py.
// ---------------------------------------------------------------------------
export interface CatalogEntry {
  th: string | null;
  en: string | null;
  type: string | null; // sprite prefix, e.g. "SWORD", "STAFF" (null for materials)
  slot: string; // weapon | offhand | armor | accessory | material | special | other
  icon: string | null; // "<baseKey>.png" or null when no icon exists
}

const CATALOG = catalogJson as Record<string, CatalogEntry>;

// ---------------------------------------------------------------------------
// Item grade (rarity). Order verified against global-metadata.dat + the
// localization StringTable (Grade_* entries are sequential, 0-indexed):
//   0 COMMON 1 UNCOMMON 2 RARE 3 LEGENDARY 4 IMMORTAL
//   5 ARCANA 6 BEYOND 7 CELESTIAL 8 DIVINE 9 COSMIC
// Thai/English strings are the exact in-game localized labels.
// ---------------------------------------------------------------------------
export interface GradeInfo {
  index: number;
  key: string;
  th: string;
  en: string;
  color: string; // hex, applied inline (10 grades > the 6 Tailwind rarity tokens)
}

export const ITEM_GRADES: GradeInfo[] = [
  { index: 0, key: "COMMON", th: "ธรรมดา", en: "Common", color: "#9ca3af" },
  { index: 1, key: "UNCOMMON", th: "ไม่ธรรมดา", en: "Uncommon", color: "#4ade80" },
  { index: 2, key: "RARE", th: "หายาก", en: "Rare", color: "#3b82f6" },
  { index: 3, key: "LEGENDARY", th: "ตำนาน", en: "Legendary", color: "#f59e0b" },
  { index: 4, key: "IMMORTAL", th: "อมตะ", en: "Immortal", color: "#ef4444" },
  { index: 5, key: "ARCANA", th: "อาร์คานา", en: "Arcana", color: "#a855f7" },
  { index: 6, key: "BEYOND", th: "เหนือขีดจำกัด", en: "Beyond", color: "#ec4899" },
  { index: 7, key: "CELESTIAL", th: "สวรรค์", en: "Celestial", color: "#22d3ee" },
  { index: 8, key: "DIVINE", th: "ศักดิ์สิทธิ์", en: "Divine", color: "#fde047" },
  { index: 9, key: "COSMIC", th: "จักรวาล", en: "Cosmic", color: "#f0abfc" },
];

export function gradeInfo(grade: number): GradeInfo {
  return ITEM_GRADES[grade] ?? ITEM_GRADES[0];
}

/** Inline style for grade-coloured text + subtle matching border. */
export function gradeStyle(grade: number): { color: string; borderColor: string } {
  const c = gradeInfo(grade).color;
  return { color: c, borderColor: `${c}66` };
}

// Thai labels for equipment slots and sprite types (detail dialog).
export const SLOT_LABELS: Record<string, string> = {
  weapon: "อาวุธ",
  offhand: "มือรอง",
  armor: "เกราะ",
  accessory: "เครื่องประดับ",
  material: "วัตถุดิบ",
  special: "พิเศษ",
  other: "อื่นๆ",
};

export const TYPE_LABELS: Record<string, string> = {
  SWORD: "ดาบ", BOW: "ธนู", STAFF: "คทาเวท", SCEPTER: "คทา", CROSSBOW: "หน้าไม้", AXE: "ขวาน",
  SHIELD: "โล่", ARROW: "ลูกธนู", ORB: "ลูกแก้ว", TOME: "คัมภีร์", BOLT: "สลัก", HATCHET: "ขวานสั้น",
  HELMET: "หมวกเกราะ", ARMOR: "เกราะ", GLOVES: "ถุงมือ", BOOTS: "รองเท้า",
  AMULET: "สร้อยคอ", EARING: "ต่างหู", RING: "แหวน", BRACER: "กำไล",
};

// ---------------------------------------------------------------------------
// Item key decoding.
//
// Equipment (class 3..6) runtime keys are encoded as:
//   key = class*100000 + subtype*10000 + grade*1000 + item*10 + variant
// A grade-0 "common" item is stored as the plain *base* key (item in the last
// two digits, no grade/variant), so `key % 10000 < 1000` identifies a base
// key. The base catalog key is `class*100000 + subtype*10000 + item`.
// Materials (class 1), currency, and special (class 9) carry no grade — their
// key is already the base. The decode is idempotent for base keys.
// ---------------------------------------------------------------------------
export interface DecodedKey {
  base: number;
  grade: number;
  item: number;
  variant: number;
}

export function decodeItemKey(itemKey: number): DecodedKey {
  const cls = Math.floor(itemKey / 100000);
  // Only weapon/offhand/armor/accessory encode a grade.
  if (String(itemKey).length !== 6 || cls < 3 || cls > 6) {
    return { base: itemKey, grade: 0, item: 0, variant: 0 };
  }
  const subtype = Math.floor(itemKey / 10000) % 10;
  const csBase = cls * 100000 + subtype * 10000;
  const rem = itemKey % 10000;
  if (rem < 1000) {
    // plain base/common key: rem == item number
    return { base: itemKey, grade: 0, item: rem, variant: 0 };
  }
  const grade = Math.floor(rem / 1000);
  const item = Math.floor((rem % 1000) / 10);
  const variant = rem % 10;
  return { base: csBase + item, grade, item, variant };
}

/** Base catalog key for a (possibly grade-encoded) item key. Idempotent. */
export function baseItemKey(itemKey: number): number {
  return decodeItemKey(itemKey).base;
}

/** Grade (0..9) encoded in an item key; 0 for materials/currency/special. */
export function itemGrade(itemKey: number): number {
  return decodeItemKey(itemKey).grade;
}

/** Catalog entry for an item key (resolves to its base key first). */
export function itemCatalogEntry(itemKey: number): CatalogEntry | null {
  return CATALOG[String(baseItemKey(itemKey))] ?? null;
}

/** Public icon URL for an item key, or null when no icon exists. */
export function itemIconUrl(itemKey: number): string | null {
  const e = itemCatalogEntry(itemKey);
  return e?.icon ? `/items/${e.icon}` : null;
}

// ---------------------------------------------------------------------------
// Legacy rarity helpers (kept for the `isChaotic` flag + DB `rarity` column).
// New code should prefer the grade helpers above.
// ---------------------------------------------------------------------------
export const RARITIES = [
  "common",
  "magic",
  "rare",
  "unique",
  "legendary",
  "chaotic",
] as const;
export type Rarity = (typeof RARITIES)[number];

export function rarityColorClass(rarity: string | null | undefined): string {
  switch (rarity) {
    case "common":
      return "text-rarity-common border-rarity-common/40";
    case "magic":
      return "text-rarity-magic border-rarity-magic/40";
    case "rare":
      return "text-rarity-rare border-rarity-rare/40";
    case "unique":
      return "text-rarity-unique border-rarity-unique/40";
    case "legendary":
      return "text-rarity-legendary border-rarity-legendary/40";
    case "chaotic":
      return "text-rarity-chaotic border-rarity-chaotic/40";
    default:
      return "text-muted-foreground border-border";
  }
}

/** Effective rarity for an item: chaotic flag wins, else catalog rarity. */
export function effectiveRarity(
  item: Pick<InventoryItem, "isChaotic">,
  catalogRarity?: string | null,
): string {
  if (item.isChaotic) return "chaotic";
  return catalogRarity ?? "unknown";
}

/** Display name: explicit catalog name > generated catalog > "#key" fallback. */
export function itemDisplayName(
  itemKey: number,
  catalogName?: string | null,
): string {
  if (catalogName?.trim()) return catalogName.trim();
  const e = itemCatalogEntry(itemKey);
  return e?.th?.trim() || e?.en?.trim() || `#${itemKey}`;
}

/** Total non-empty enchant lines on an item. */
export function enchantTotal(item: Pick<InventoryItem, "enchantCount">): number {
  return item.enchantCount.reduce((a, b) => a + b, 0);
}

/** Compact gold/number formatter: 722464 → "722.5K". */
export function formatCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en").format(n);
}

/** Seconds → "120h 34m". */
export function formatPlayTime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
