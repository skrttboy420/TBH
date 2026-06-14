import catalogJson from "./character-catalog.generated.json";

// ---------------------------------------------------------------------------
// Character catalog (generated from the game's Unity assets + Localization).
// Maps heroKey / petKey -> Thai/English name + pixel-art portrait filename.
// Portraits live in /public/heroes/<icon> and /public/pets/<icon>.
// See agent/extract_chars.py.
//
// Runes are intentionally absent: in-game runes are a stat-tree (RuneName_* is
// keyed by stat, not by the numeric runeKey), so they have no per-rune art.
// ---------------------------------------------------------------------------
export interface CharacterEntry {
  th: string | null;
  en: string | null;
  icon: string | null; // "<key>.png" or null when no portrait exists
}

interface CharacterCatalog {
  heroes: Record<string, CharacterEntry>;
  pets: Record<string, CharacterEntry>;
}

const CATALOG = catalogJson as CharacterCatalog;

export function heroEntry(heroKey: number): CharacterEntry | null {
  return CATALOG.heroes[String(heroKey)] ?? null;
}

export function petEntry(petKey: number): CharacterEntry | null {
  return CATALOG.pets[String(petKey)] ?? null;
}

/** Public portrait URL for a hero, or null when none exists. */
export function heroIconUrl(heroKey: number): string | null {
  const e = heroEntry(heroKey);
  return e?.icon ? `/heroes/${e.icon}` : null;
}

/**
 * Full-body character art (in-game STATUS pose), or null when none exists.
 * Files live in /public/heroes-full/<heroKey>.png — extracted for every known
 * hero (ChaAnim_<class>_Large frame 0). See agent/extract_status.py.
 */
export function heroFullArtUrl(heroKey: number): string | null {
  return heroEntry(heroKey) ? `/heroes-full/${heroKey}.png` : null;
}

/** Public portrait URL for a pet, or null when none exists. */
export function petIconUrl(petKey: number): string | null {
  const e = petEntry(petKey);
  return e?.icon ? `/pets/${e.icon}` : null;
}

/** Display name (Thai > English > "#key"). */
export function heroName(heroKey: number): string {
  const e = heroEntry(heroKey);
  return e?.th?.trim() || e?.en?.trim() || `#${heroKey}`;
}

export function petName(petKey: number): string {
  const e = petEntry(petKey);
  return e?.th?.trim() || e?.en?.trim() || `#${petKey}`;
}
