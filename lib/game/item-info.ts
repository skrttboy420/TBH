// ---------------------------------------------------------------------------
// SERVER-ONLY stat/enchant/pet resolver.
//
// Joins the generated game tables (extracted from sharedassets0.assets +
// Unity Localization, see agent/build_catalogs.py) into the same readable
// lines the game shows in its item tooltip / pet panel:
//   - base + inherent stats per gear ItemKey
//   - enchant lines per StatModKey
//   - pet effects per PetKey
//
// The gear catalog is ~800 KB, so this module must NEVER be imported by a
// client component — only the small resolved strings cross to the client.
// ---------------------------------------------------------------------------
import type {
  InventoryItem,
  ResolvedEnchant,
  ResolvedItemInfo,
} from "@/lib/types/save";
import gearJson from "./gear-catalog.generated.json";
import statmodJson from "./statmod-catalog.generated.json";
import petJson from "./pet-stat-catalog.generated.json";
import locJson from "./stat-loc.generated.json";

type StatTuple = [string, string, number]; // [STATTYPE, MODTYPE, value]
interface GearEntry {
  g: number; // grade index
  gt: string; // gear type, e.g. "GLOVES"
  lv: number; // required level
  base: StatTuple[];
  inh: StatTuple[];
}
interface LocPair {
  th: string | null;
  en: string | null;
}
interface StatLoc {
  names: Record<string, LocPair>;
  acct: Record<string, LocPair>;
  fmt: Record<string, LocPair>; // key "STATTYPE_MODTYPE" -> "ต้านไฟ +{0}%"
}

const GEAR = gearJson as unknown as Record<string, GearEntry>;
const STATMOD = statmodJson as unknown as Record<string, [string, string]>;
const PET = petJson as unknown as Record<string, StatTuple[]>;
const LOC = locJson as unknown as StatLoc;

// Stat types whose FLAT value is stored as tenths of a percent (×10), the same
// way ADDITIVE/MULTIPLICATIVE modifiers are. Verified against the in-game pet
// panel (drop +20%, gold +15%, exp +20%) and item tooltip.
const PERCENT_TENTHS = new Set([
  "IncreaseGoldAmount",
  "IncreaseExpAmount",
  "AdditionalGold",
  "AdditionalExp",
  "DropChanceNormalChestPercent",
  "DropChanceStageBossChestPercent",
  "DropChanceActBossChestPercent",
]);

/**
 * Whether a stat's raw value is stored ×10 (i.e. it is a percent). ADDITIVE and
 * MULTIPLICATIVE modifiers always are; a few FLAT account stats are too.
 */
function isPercent(statType: string, modType: string): boolean {
  return modType !== "FLAT" || PERCENT_TENTHS.has(statType);
}

function fmtNum(d: number): string {
  return Number.isInteger(d) ? String(d) : d.toFixed(1);
}

/** Localized stat name (hero stat > account stat > raw key). */
function statName(statType: string): string {
  const n = LOC.names[statType] ?? LOC.acct[statType];
  return n?.th?.trim() || n?.en?.trim() || statType;
}

/**
 * One fully-formatted, localized stat line, e.g. "ต้านไฟ +10%" or "เกราะ +36".
 * Uses the game's own format string when available, else "<name> +<value>"
 * (with a "%" suffix for percent stats that lack a format string).
 */
export function formatStat(statType: string, modType: string, value: number): string {
  const percent = isPercent(statType, modType);
  const d = percent ? value / 10 : value;
  const f = LOC.fmt[`${statType}_${modType}`];
  if (f?.th?.trim()) return f.th.replace("{0}", fmtNum(d));
  if (f?.en?.trim()) return f.en.replace("{0}", fmtNum(d));
  return `${statName(statType)} +${fmtNum(d)}${percent ? "%" : ""}`;
}

/**
 * Resolve an inventory item's readable stat block. Returns null for items that
 * carry no gear data and no enchants (plain materials/currency).
 */
export function resolveItemInfo(item: InventoryItem): ResolvedItemInfo | null {
  const gear = GEAR[String(item.itemKey)] ?? null;
  if (!gear && item.enchants.length === 0) return null;

  const enchants: ResolvedEnchant[] = item.enchants.map((e) => {
    const sm = STATMOD[String(e.statModKey)];
    const text = sm
      ? formatStat(sm[0], sm[1], e.value)
      : `สเตตัส #${e.statModKey} +${e.value}`;
    return { text, tier: e.tier };
  });

  return {
    level: gear?.lv ?? 0,
    gearType: gear?.gt ?? null,
    baseStats: (gear?.base ?? []).map((s) => formatStat(s[0], s[1], s[2])),
    inherentStats: (gear?.inh ?? []).map((s) => formatStat(s[0], s[1], s[2])),
    enchants,
  };
}

/** Pet ability/effect lines, e.g. ["โอกาสดรอป +20%", ...]. */
export function resolvePetStats(petKey: number): string[] {
  const rows = PET[String(petKey)];
  if (!rows) return [];
  return rows.map((s) => formatStat(s[0], s[1], s[2]));
}
