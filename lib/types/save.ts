// Normalized shapes the agent produces from the decrypted .es3 save and the
// web renders. These are the *parsed* projections, not the raw ES3 layout.

export interface EnchantEntry {
  statModKey: number;
  tier: number;
  value: number;
  recipeType: number;
  modType: number;
  materialKey: number;
  statType: number;
}

/** A readable enchant line resolved from the game tables. */
export interface ResolvedEnchant {
  text: string; // localized, e.g. "ต้านไฟ +10%"
  tier: number;
}

/** Readable stat block for a gear item (resolved server-side from game data). */
export interface ResolvedItemInfo {
  level: number; // required level
  gearType: string | null; // e.g. "GLOVES"
  baseStats: string[]; // ["เกราะ +36"]
  inherentStats: string[]; // ["ดาเมจโจมตี +2"]
  enchants: ResolvedEnchant[];
}

/** An occupied bag/stash slot, joined slot → item instance. */
export interface InventoryItem {
  index: number; // slot index in the bag/stash grid
  uniqueId: string; // ItemUniqueId as string (bigint-safe)
  itemKey: number; // static item type key
  isChaotic: boolean;
  isBlocked: boolean;
  enchantCount: number[]; // [a,b,c]
  enchants: EnchantEntry[]; // non-empty entries only
  info?: ResolvedItemInfo; // resolved stat block (added server-side for the UI)
}

export interface HeroState {
  heroKey: number;
  level: number;
  exp: number;
  isUnlock: boolean;
  abilityPoint: number;
  allocatedAbilityPoint: number;
  equippedItemIds: string[]; // UniqueIds as strings ("0" = empty slot)
  skills: number[];
  unlockedAttributeGroups: number[];
}

export interface PetState {
  petKey: number;
  isUnlock: boolean;
  isViewed: boolean;
}

export interface RuneState {
  runeKey: number;
  level: number;
}

export interface CurrencyState {
  key: number;
  quantity: number;
}

export interface BoxState {
  type: number;
  uniqueId: string;
  quantity: number;
}

export interface GameSettings {
  language?: number;
  isAlwaysOnTop?: boolean;
  maxFps?: number;
  isAutoStart?: boolean;
  stageRepeatStageFailed?: boolean;
  repeatActBossDuringConsumeAllStone?: boolean;
  [k: string]: unknown;
}

export interface SaveSummary {
  heroesUnlocked: number;
  heroesTotal: number;
  petsUnlocked: number;
  petsTotal: number;
  runesCount: number;
  itemsTotal: number;
  inventoryUsed: number;
  inventoryCapacity: number;
  stashUsed: number;
  stashCapacity: number;
}

/** Full parsed save the agent uploads to /api/v1/agents/save-state. */
export interface ParsedSave {
  version: string;
  capturedAt: string | null; // ISO, from game's lastSavedTime
  saveHash: string;
  playTime: number; // seconds
  gold: number;
  maxCompletedStage: number;
  currentStageKey: number;
  currentStageWave: number;
  arrangedHeroKeys: number[];
  arrangedPetKey: number | null;
  currencies: CurrencyState[];
  heroes: HeroState[];
  pets: PetState[];
  runes: RuneState[];
  inventory: InventoryItem[];
  stash: InventoryItem[];
  boxes: BoxState[];
  settings: GameSettings;
  summary: SaveSummary;
}
