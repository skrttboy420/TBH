"""Stage-key encoding + Thai labels (mirrors lib/game/stages.ts).

key = difficulty*1000 + act*100 + stage; stage 10 = act boss.
"""

from __future__ import annotations

GOLD_CURRENCY_KEY = 100001
STAGES_PER_ACT = 10
BOSS_STAGE = 10

_DIFFICULTY_TH = {1: "ปกติ", 2: "ยาก", 3: "นรก", 4: "ฝันร้าย"}


def decode_stage(key: int | None) -> dict | None:
    if not key or key <= 0:
        return None
    difficulty = key // 1000
    act = (key // 100) % 10
    stage = key % 100
    if act < 1 or stage < 1:
        return None
    return {
        "key": key,
        "difficulty": difficulty,
        "act": act,
        "stage": stage,
        "label": f"{act}-{stage}",
        "isBoss": stage == BOSS_STAGE,
    }


def encode_stage(difficulty: int, act: int, stage: int) -> int:
    return difficulty * 1000 + act * 100 + stage


def difficulty_name_th(difficulty: int) -> str:
    return _DIFFICULTY_TH.get(difficulty, f"D{difficulty}")


def stage_full_label_th(key: int | None) -> str:
    d = decode_stage(key)
    if not d:
        return "ไม่ทราบด่าน"
    boss = " (บอส)" if d["isBoss"] else ""
    return f"{difficulty_name_th(d['difficulty'])} · องก์ {d['act']} · {d['label']}{boss}"
