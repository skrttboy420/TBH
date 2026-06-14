// Stage keys are encoded as D-A-SS:
//   difficulty = floor(key / 1000)   (1 = Normal / ปกติ — the only one unlocked now)
//   act        = floor(key / 100) % 10
//   stage      = key % 100           (1..10; stage 10 = act boss, the red node)
// Verified against the live save: currentStageKey 1304 == Act 3, stage "3-4".

export const STAGES_PER_ACT = 10;
export const BOSS_STAGE = 10;

export interface DecodedStage {
  key: number;
  difficulty: number;
  act: number;
  stage: number;
  /** e.g. "3-4" */
  label: string;
  isBoss: boolean;
}

export function decodeStage(key: number | null | undefined): DecodedStage | null {
  if (key == null || key <= 0 || !Number.isFinite(key)) return null;
  const difficulty = Math.floor(key / 1000);
  const act = Math.floor(key / 100) % 10;
  const stage = key % 100;
  if (act < 1 || stage < 1) return null;
  return {
    key,
    difficulty,
    act,
    stage,
    label: `${act}-${stage}`,
    isBoss: stage === BOSS_STAGE,
  };
}

export function encodeStage(difficulty: number, act: number, stage: number): number {
  return difficulty * 1000 + act * 100 + stage;
}

const DIFFICULTY_NAMES: Record<number, { en: string; th: string }> = {
  1: { en: "Normal", th: "ปกติ" },
  2: { en: "Hard", th: "ยาก" },
  3: { en: "Hell", th: "นรก" },
  4: { en: "Nightmare", th: "ฝันร้าย" },
};

export function difficultyName(difficulty: number, lang: "en" | "th" = "th"): string {
  return DIFFICULTY_NAMES[difficulty]?.[lang] ?? `D${difficulty}`;
}

/** "องก์ 3" / "Act 3" */
export function actName(act: number, lang: "en" | "th" = "th"): string {
  return lang === "th" ? `องก์ ${act}` : `Act ${act}`;
}

/** Full human label, e.g. "ปกติ · องก์ 3 · ด่าน 3-4 (บอส)" */
export function stageFullLabel(
  key: number | null | undefined,
  lang: "en" | "th" = "th",
): string {
  const d = decodeStage(key);
  if (!d) return lang === "th" ? "ไม่ทราบด่าน" : "Unknown stage";
  const boss = d.isBoss ? (lang === "th" ? " (บอส)" : " (Boss)") : "";
  if (lang === "th") {
    return `${difficultyName(d.difficulty, "th")} · ${actName(d.act, "th")} · ${d.label}${boss}`;
  }
  return `${difficultyName(d.difficulty, "en")} · ${actName(d.act, "en")} · ${d.label}${boss}`;
}

/** All selectable stages for a given difficulty/act (1..10). */
export function actStages(difficulty: number, act: number): DecodedStage[] {
  return Array.from({ length: STAGES_PER_ACT }, (_, i) =>
    decodeStage(encodeStage(difficulty, act, i + 1)),
  ).filter((s): s is DecodedStage => s !== null);
}
