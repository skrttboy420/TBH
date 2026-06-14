import type { SaveStateRow } from "@/lib/types/database";
import type {
  BoxState,
  CurrencyState,
  GameSettings,
  HeroState,
  InventoryItem,
  PetState,
  RuneState,
  SaveSummary,
} from "@/lib/types/save";

export interface DecodedSaveState {
  row: SaveStateRow;
  inventory: InventoryItem[];
  stash: InventoryItem[];
  heroes: HeroState[];
  pets: PetState[];
  runes: RuneState[];
  currencies: CurrencyState[];
  boxes: BoxState[];
  settings: GameSettings;
  summary: Partial<SaveSummary>;
}

// The jsonb columns were written from the agent's typed ParsedSave shapes, so
// these casts are safe round-trips back to the same structures.
export function decodeSaveState(row: SaveStateRow): DecodedSaveState {
  return {
    row,
    inventory: (row.inventory as unknown as InventoryItem[]) ?? [],
    stash: (row.stash as unknown as InventoryItem[]) ?? [],
    heroes: (row.heroes as unknown as HeroState[]) ?? [],
    pets: (row.pets as unknown as PetState[]) ?? [],
    runes: (row.runes as unknown as RuneState[]) ?? [],
    currencies: (row.currencies as unknown as CurrencyState[]) ?? [],
    boxes: (row.boxes as unknown as BoxState[]) ?? [],
    settings: (row.settings as unknown as GameSettings) ?? {},
    summary: (row.summary as unknown as Partial<SaveSummary>) ?? {},
  };
}
