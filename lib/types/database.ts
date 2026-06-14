// Hand-maintained types mirroring supabase/migrations/0001_initial_schema.sql.
// Regenerate with `supabase gen types typescript` once the CLI is linked.
//
// NOTE: row shapes are `type` aliases (not interfaces) on purpose — a named
// interface is not assignable to Supabase's `Record<string, unknown>` table
// constraint (interfaces lack an implicit index signature), which would break
// query/cookie type inference across the app.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AgentStatus = "offline" | "online" | "farming" | "error";
export type CommandName =
  | "START_FARM"
  | "STOP_FARM"
  | "TAKE_SCREENSHOT"
  | "GET_STATUS"
  | "READ_SAVE";
export type CommandStatus =
  | "pending"
  | "sent"
  | "acknowledged"
  | "completed"
  | "failed"
  | "expired";
export type LootKind =
  | "equipment"
  | "currency"
  | "material"
  | "box"
  | "rune"
  | "pet"
  | "other";
export type ActivityType =
  | "stage_cleared"
  | "boss_cleared"
  | "level_up"
  | "farm_started"
  | "farm_stopped"
  | "agent_online"
  | "agent_offline"
  | "gold_milestone"
  | "item_found"
  | "error"
  | "info";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: "free" | "pro";
  created_at: string;
  updated_at: string;
};

export type AgentRow = {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  status: AgentStatus;
  agent_version: string | null;
  hostname: string | null;
  platform: string | null;
  last_seen_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type SaveStateRow = {
  agent_id: string;
  user_id: string;
  captured_at: string | null;
  save_hash: string | null;
  play_time: number | null;
  gold: number | null;
  max_completed_stage: number | null;
  current_stage_key: number | null;
  current_stage_wave: number | null;
  arranged_hero_keys: number[];
  arranged_pet_key: number | null;
  currencies: Json;
  heroes: Json;
  pets: Json;
  runes: Json;
  inventory: Json;
  stash: Json;
  boxes: Json;
  settings: Json;
  summary: Json;
  updated_at: string;
};

export type SaveSnapshotRow = {
  id: string;
  agent_id: string;
  user_id: string;
  captured_at: string;
  save_hash: string | null;
  play_time: number | null;
  gold: number | null;
  max_completed_stage: number | null;
  current_stage_key: number | null;
  current_stage_wave: number | null;
  items_total: number | null;
  inventory_used: number | null;
  stash_used: number | null;
  created_at: string;
};

export type LootEventRow = {
  id: string;
  agent_id: string;
  user_id: string;
  occurred_at: string;
  kind: LootKind;
  item_key: number | null;
  item_unique_id: number | null;
  rarity: string | null;
  is_chaotic: boolean;
  quantity: number;
  stage_key: number | null;
  metadata: Json;
  created_at: string;
};

export type ActivityEventRow = {
  id: string;
  agent_id: string | null;
  user_id: string;
  occurred_at: string;
  type: ActivityType;
  title: string;
  description: string | null;
  data: Json;
  created_at: string;
};

export type CommandRow = {
  id: string;
  agent_id: string;
  user_id: string;
  command: CommandName;
  params: Json;
  status: CommandStatus;
  result: Json | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  completed_at: string | null;
};

export type ScreenshotRow = {
  id: string;
  agent_id: string;
  user_id: string;
  command_id: string | null;
  storage_path: string;
  width: number | null;
  height: number | null;
  captured_at: string;
  created_at: string;
};

export type FarmSessionRow = {
  id: string;
  agent_id: string;
  user_id: string;
  stage_key: number | null;
  status: "active" | "completed" | "interrupted";
  started_at: string;
  ended_at: string | null;
  start_gold: number | null;
  end_gold: number | null;
  items_gained: number;
  stages_cleared: number;
  created_at: string;
  updated_at: string;
};

export type FarmLoopSetRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_step_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FarmLoopStepRow = {
  id: string;
  set_id: string;
  user_id: string;
  stage_key: number;
  target_rounds: number;
  completed_rounds: number;
  sort_order: number;
  created_at: string;
};

/** A loop set joined with its ordered steps — the shape pages/components use. */
export type FarmLoopSetWithSteps = FarmLoopSetRow & { steps: FarmLoopStepRow[] };

export type ItemCatalogRow = {
  item_key: number;
  name: string | null;
  name_th: string | null;
  rarity: string | null;
  slot: string | null;
  kind: string | null;
  icon_url: string | null;
  max_stack: number | null;
  metadata: Json;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Partial<ProfileRow> & Pick<ProfileRow, "id">,
        Partial<ProfileRow>
      >;
      agents: Table<
        AgentRow,
        Omit<
          AgentRow,
          | "id"
          | "created_at"
          | "updated_at"
          | "metadata"
          | "status"
          | "agent_version"
          | "hostname"
          | "platform"
          | "last_seen_at"
        > &
          Partial<
            Pick<
              AgentRow,
              | "id"
              | "status"
              | "metadata"
              | "agent_version"
              | "hostname"
              | "platform"
              | "last_seen_at"
            >
          >,
        Partial<AgentRow>
      >;
      save_state: Table<
        SaveStateRow,
        Omit<SaveStateRow, "updated_at"> & Partial<Pick<SaveStateRow, "updated_at">>,
        Partial<SaveStateRow>
      >;
      save_snapshots: Table<
        SaveSnapshotRow,
        Omit<SaveSnapshotRow, "id" | "created_at" | "captured_at"> &
          Partial<Pick<SaveSnapshotRow, "id" | "created_at" | "captured_at">>,
        Partial<SaveSnapshotRow>
      >;
      loot_events: Table<
        LootEventRow,
        Omit<LootEventRow, "id" | "created_at" | "occurred_at" | "is_chaotic" | "quantity" | "metadata"> &
          Partial<Pick<LootEventRow, "id" | "created_at" | "occurred_at" | "is_chaotic" | "quantity" | "metadata">>,
        Partial<LootEventRow>
      >;
      activity_events: Table<
        ActivityEventRow,
        Omit<ActivityEventRow, "id" | "created_at" | "occurred_at" | "data"> &
          Partial<Pick<ActivityEventRow, "id" | "created_at" | "occurred_at" | "data">>,
        Partial<ActivityEventRow>
      >;
      commands: Table<
        CommandRow,
        Omit<CommandRow, "id" | "created_at" | "updated_at" | "expires_at" | "status" | "params" | "completed_at" | "result" | "error"> &
          Partial<Pick<CommandRow, "id" | "created_at" | "updated_at" | "expires_at" | "status" | "params" | "completed_at" | "result" | "error">>,
        Partial<CommandRow>
      >;
      screenshots: Table<
        ScreenshotRow,
        Omit<ScreenshotRow, "id" | "created_at" | "captured_at"> &
          Partial<Pick<ScreenshotRow, "id" | "created_at" | "captured_at">>,
        Partial<ScreenshotRow>
      >;
      farm_sessions: Table<
        FarmSessionRow,
        Omit<FarmSessionRow, "id" | "created_at" | "updated_at" | "started_at" | "status" | "items_gained" | "stages_cleared"> &
          Partial<Pick<FarmSessionRow, "id" | "created_at" | "updated_at" | "started_at" | "status" | "items_gained" | "stages_cleared">>,
        Partial<FarmSessionRow>
      >;
      item_catalog: Table<
        ItemCatalogRow,
        Omit<ItemCatalogRow, "updated_at"> & Partial<Pick<ItemCatalogRow, "updated_at">>,
        Partial<ItemCatalogRow>
      >;
      farm_loop_sets: Table<
        FarmLoopSetRow,
        Omit<FarmLoopSetRow, "id" | "created_at" | "updated_at" | "description" | "current_step_id"> &
          Partial<Pick<FarmLoopSetRow, "id" | "created_at" | "updated_at" | "description" | "current_step_id">>,
        Partial<FarmLoopSetRow>
      >;
      farm_loop_steps: Table<
        FarmLoopStepRow,
        Omit<FarmLoopStepRow, "id" | "created_at" | "target_rounds" | "completed_rounds" | "sort_order"> &
          Partial<Pick<FarmLoopStepRow, "id" | "created_at" | "target_rounds" | "completed_rounds" | "sort_order">>,
        Partial<FarmLoopStepRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
