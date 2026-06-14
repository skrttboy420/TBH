import { z } from "zod";

// ── parsed save (agent → /agent/save-state) ─────────────────────────────────
const enchantEntrySchema = z.object({
  statModKey: z.number(),
  tier: z.number(),
  value: z.number(),
  recipeType: z.number(),
  modType: z.number(),
  materialKey: z.number(),
  statType: z.number(),
});

const inventoryItemSchema = z.object({
  index: z.number().int(),
  uniqueId: z.string(),
  itemKey: z.number().int(),
  isChaotic: z.boolean(),
  isBlocked: z.boolean(),
  enchantCount: z.array(z.number()),
  enchants: z.array(enchantEntrySchema),
});

const heroStateSchema = z.object({
  heroKey: z.number().int(),
  level: z.number().int(),
  exp: z.number(),
  isUnlock: z.boolean(),
  abilityPoint: z.number(),
  allocatedAbilityPoint: z.number(),
  equippedItemIds: z.array(z.string()),
  skills: z.array(z.number()),
  unlockedAttributeGroups: z.array(z.number()),
});

const petStateSchema = z.object({
  petKey: z.number().int(),
  isUnlock: z.boolean(),
  isViewed: z.boolean(),
});

const runeStateSchema = z.object({
  runeKey: z.number().int(),
  level: z.number().int(),
});

const currencyStateSchema = z.object({
  key: z.number().int(),
  quantity: z.number(),
});

const boxStateSchema = z.object({
  type: z.number().int(),
  uniqueId: z.string(),
  quantity: z.number(),
});

const saveSummarySchema = z.object({
  heroesUnlocked: z.number().int(),
  heroesTotal: z.number().int(),
  petsUnlocked: z.number().int(),
  petsTotal: z.number().int(),
  runesCount: z.number().int(),
  itemsTotal: z.number().int(),
  inventoryUsed: z.number().int(),
  inventoryCapacity: z.number().int(),
  stashUsed: z.number().int(),
  stashCapacity: z.number().int(),
});

export const parsedSaveSchema = z.object({
  version: z.string(),
  capturedAt: z.string().nullable(),
  saveHash: z.string(),
  playTime: z.number(),
  gold: z.number(),
  maxCompletedStage: z.number().int(),
  currentStageKey: z.number().int(),
  currentStageWave: z.number().int(),
  arrangedHeroKeys: z.array(z.number().int()),
  arrangedPetKey: z.number().int().nullable(),
  currencies: z.array(currencyStateSchema),
  heroes: z.array(heroStateSchema),
  pets: z.array(petStateSchema),
  runes: z.array(runeStateSchema),
  inventory: z.array(inventoryItemSchema),
  stash: z.array(inventoryItemSchema),
  boxes: z.array(boxStateSchema),
  settings: z.record(z.unknown()),
  summary: saveSummarySchema,
});

// ── loot / activity (diff-derived) ──────────────────────────────────────────
export const LOOT_KINDS = [
  "equipment",
  "currency",
  "material",
  "box",
  "rune",
  "pet",
  "other",
] as const;

export const ACTIVITY_TYPES = [
  "stage_cleared",
  "boss_cleared",
  "level_up",
  "farm_started",
  "farm_stopped",
  "agent_online",
  "agent_offline",
  "gold_milestone",
  "item_found",
  "error",
  "info",
] as const;

export const lootEventInputSchema = z.object({
  kind: z.enum(LOOT_KINDS).default("equipment"),
  itemKey: z.number().int().nullable().optional(),
  itemUniqueId: z.number().int().nullable().optional(),
  rarity: z.string().nullable().optional(),
  isChaotic: z.boolean().optional(),
  quantity: z.number().int().optional(),
  stageKey: z.number().int().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  occurredAt: z.string().optional(),
});

export const activityEventInputSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  data: z.record(z.unknown()).optional(),
  occurredAt: z.string().optional(),
});

export const saveStatePayloadSchema = z.object({
  save: parsedSaveSchema,
  loot: z.array(lootEventInputSchema).optional(),
  activity: z.array(activityEventInputSchema).optional(),
});

// ── heartbeat ───────────────────────────────────────────────────────────────
export const heartbeatPayloadSchema = z.object({
  status: z.enum(["online", "farming", "error"]).optional(),
  agentVersion: z.string().optional(),
  hostname: z.string().optional(),
  platform: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  activity: z.array(activityEventInputSchema).optional(),
});

// ── commands ─────────────────────────────────────────────────────────────────
export const commandUpdateSchema = z.object({
  status: z.enum(["acknowledged", "completed", "failed"]),
  result: z.record(z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
});

export const COMMAND_NAMES = [
  "START_FARM",
  "STOP_FARM",
  "TAKE_SCREENSHOT",
  "GET_STATUS",
  "READ_SAVE",
] as const;

export const issueCommandSchema = z.object({
  command: z.enum(COMMAND_NAMES),
  params: z.record(z.unknown()).optional(),
});

// ── agents (user-managed) ────────────────────────────────────────────────────
export const createAgentSchema = z.object({
  name: z.string().trim().min(1, "กรุณาตั้งชื่อเครื่อง").max(60, "ชื่อยาวเกินไป"),
});

export const renameAgentSchema = createAgentSchema;

// ── farm loop sets (user-managed) ────────────────────────────────────────────
export const farmLoopStepInputSchema = z.object({
  stageKey: z.number().int().positive("ด่านไม่ถูกต้อง"),
  targetRounds: z.number().int().min(1, "อย่างน้อย 1 รอบ").max(9999).default(1),
});

export const createFarmLoopSchema = z.object({
  name: z.string().trim().min(1, "กรุณาตั้งชื่อชุดฟาร์ม").max(60, "ชื่อยาวเกินไป"),
  description: z.string().trim().max(200, "คำอธิบายยาวเกินไป").nullable().optional(),
  steps: z
    .array(farmLoopStepInputSchema)
    .min(1, "เพิ่มอย่างน้อย 1 ด่าน")
    .max(50, "ด่านเยอะเกินไป"),
});

export const updateFarmLoopSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณาตั้งชื่อชุดฟาร์ม").max(60, "ชื่อยาวเกินไป").optional(),
    description: z.string().trim().max(200, "คำอธิบายยาวเกินไป").nullable().optional(),
    steps: z
      .array(farmLoopStepInputSchema)
      .min(1, "เพิ่มอย่างน้อย 1 ด่าน")
      .max(50, "ด่านเยอะเกินไป")
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined || v.steps !== undefined, {
    message: "ไม่มีข้อมูลที่จะอัปเดต",
  });

export const FARM_LOOP_ACTIONS = [
  "increment",
  "decrement",
  "setCurrent",
  "advance",
  "reset",
] as const;

export const farmLoopProgressSchema = z
  .object({
    action: z.enum(FARM_LOOP_ACTIONS),
    stepId: z.string().uuid().optional(),
  })
  .refine(
    (v) => !["increment", "decrement", "setCurrent"].includes(v.action) || v.stepId != null,
    { message: "ต้องระบุ stepId สำหรับการกระทำนี้" },
  );
