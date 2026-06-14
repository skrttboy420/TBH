"""ทดสอบการตรวจจับ "เคลียร์ด่านซ้ำ" (farm re-clear) ใน diff.py

ตัวเกมไม่มีตัวนับจำนวนรอบที่เคลียร์ในเซฟ และ maxCompletedStage จะขยับเฉพาะตอน
ผ่านด่านสูงสุดใหม่เท่านั้น สัญญาณเดียวที่บอกว่า "เคลียร์ด่านเดิมอีกรอบ" คือค่า
currentStageWave ที่ไต่ขึ้นแล้วรีเซ็ตกลับ ไฟล์นี้ยืนยันว่า _activity_farm_clear
จับสัญญาณนั้นได้ถูกต้อง และไม่ตีกับ _activity_stage (กันนับซ้ำ)

รัน (ไม่ต้องใช้ pytest):
    cd agent && python test_diff_farm.py
หรือถ้ามี pytest:
    cd agent && python -m pytest test_diff_farm.py -q
"""

from __future__ import annotations

from tbh_agent.diff import _activity_farm_clear, diff_saves

NORMAL = 1305  # ปกติ · องก์ 3 · 3-5  (stage 5 = ไม่ใช่บอส)
BOSS = 1310    # ปกติ · องก์ 3 · บอส   (stage 10 = บอสองก์)


def save(stage_key=NORMAL, max_completed=NORMAL, wave=1, gold=0):
    """เซฟจำลองที่มีคีย์ครบพอให้ diff_saves ทำงานได้โดยไม่ KeyError."""
    return {
        "currentStageKey": stage_key,
        "maxCompletedStage": max_completed,
        "currentStageWave": wave,
        "gold": gold,
        "inventory": [],
        "stash": [],
        "heroes": [],
        "currencies": [],
        "boxes": [],
        "runes": [],
        "pets": [],
    }


# ── _activity_farm_clear ────────────────────────────────────────────────────
def test_wave_reset_same_stage_fires():
    """ไต่ถึง wave 13 แล้วรีเซ็ตเป็น 1 ด่านเดิม → 1 อีเวนต์ stage_cleared (farm)."""
    out = _activity_farm_clear(save(wave=13), save(wave=1))
    assert len(out) == 1
    e = out[0]
    assert e["type"] == "stage_cleared"
    assert e["data"] == {"stageKey": NORMAL, "farm": True, "wave": 13}
    assert e["title"].startswith("เคลียร์ ")


def test_boss_stage_reset_is_boss_cleared():
    out = _activity_farm_clear(save(BOSS, BOSS, wave=8), save(BOSS, BOSS, wave=1))
    assert len(out) == 1
    assert out[0]["type"] == "boss_cleared"
    assert out[0]["title"].startswith("เคลียร์บอส ")


def test_wave_climbing_does_not_fire():
    assert _activity_farm_clear(save(wave=3), save(wave=7)) == []


def test_stage_change_does_not_fire():
    """เปลี่ยนด่าน (3-5 → 3-6) คือการคืบหน้า ไม่ใช่ฟาร์มซ้ำ."""
    assert _activity_farm_clear(save(NORMAL, wave=13), save(NORMAL + 1, wave=1)) == []


def test_new_max_does_not_double_count():
    """ด่านเดิม wave รีเซ็ต แต่ maxCompletedStage เพิ่ม → ปล่อยให้ _activity_stage จัดการ."""
    prev = save(NORMAL, max_completed=NORMAL - 1, wave=13)
    curr = save(NORMAL, max_completed=NORMAL, wave=1)
    assert _activity_farm_clear(prev, curr) == []


def test_low_prev_wave_is_noise():
    assert _activity_farm_clear(save(wave=1), save(wave=0)) == []


def test_no_stage_does_not_fire():
    assert _activity_farm_clear(save(0, 0, wave=5), save(0, 0, wave=1)) == []


# ── diff_saves integration (กันนับซ้ำกับ _activity_stage) ────────────────────
def test_diff_farm_clear_appears_once():
    _loot, activity = diff_saves(save(wave=13), save(wave=1))
    farm = [a for a in activity if a.get("data", {}).get("farm")]
    assert len(farm) == 1
    assert farm[0]["type"] == "stage_cleared"


def test_diff_progression_has_no_farm_flag():
    """ผ่านด่านสูงสุดใหม่แล้วขยับไปด่านถัดไป → มี stage_cleared แต่ไม่มี farm flag."""
    prev = save(NORMAL, max_completed=NORMAL - 1, wave=13)
    curr = save(NORMAL + 1, max_completed=NORMAL, wave=1)
    _loot, activity = diff_saves(prev, curr)
    stage = [a for a in activity if a["type"] in ("stage_cleared", "boss_cleared")]
    assert len(stage) == 1
    assert not stage[0].get("data", {}).get("farm")


def test_diff_simultaneous_clear_counts_once():
    """เคลียร์ด่านที่กลายเป็น max ใหม่พอดี (คีย์ยังไม่ขยับ) ต้องนับครั้งเดียว."""
    prev = save(NORMAL, max_completed=NORMAL - 1, wave=13)
    curr = save(NORMAL, max_completed=NORMAL, wave=1)
    _loot, activity = diff_saves(prev, curr)
    stage = [a for a in activity if a["type"] in ("stage_cleared", "boss_cleared")]
    assert len(stage) == 1
    assert not stage[0].get("data", {}).get("farm")


def test_first_run_is_empty():
    assert diff_saves(None, save()) == ([], [])


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  ok  {t.__name__}")
        except AssertionError as e:  # noqa: PERF203
            failed += 1
            print(f"FAIL  {t.__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} ผ่าน")
    raise SystemExit(1 if failed else 0)
