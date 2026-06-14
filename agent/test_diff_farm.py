"""ทดสอบการนับ "เคลียร์ด่าน" จากตัวนับสะสม stageClears (aggregate Type 15) ใน diff.py

เกมเขียนไฟล์เซฟไม่บ่อย (ทุก ~30–80 วิ ไม่ใช่ทุกเวฟ) การเฝ้าดู currentStageWave
รีเซ็ตจึงพลาดรอบส่วนใหญ่ ตัวนับสะสม stageClears นับครบทุกรอบแบบไม่หาย — ผลต่าง
ระหว่างสองเซฟ = จำนวนรอบที่เคลียร์จริงในช่วงนั้น (ยืนยันสด: ฟาร์ม 3-5 ~81 วิ ตัวนับ
+2 พอดี ขณะที่ wave อ่านได้แค่ 0→9) ไฟล์นี้ยืนยันว่า _activity_clears นับถูก,
ใส่ count + วินาที/รอบโดยประมาณ, และไม่ตีกับ _activity_stage (กันนับซ้ำ)

รัน (ไม่ต้องใช้ pytest):
    cd agent && python test_diff_farm.py
หรือถ้ามี pytest:
    cd agent && python -m pytest test_diff_farm.py -q
"""

from __future__ import annotations

from tbh_agent.diff import _activity_clears, diff_saves

NORMAL = 1305  # ปกติ · องก์ 3 · 3-5  (stage 5 = ไม่ใช่บอส)
BOSS = 1310    # ปกติ · องก์ 3 · บอส   (stage 10 = บอสองก์)


def save(stage_key=NORMAL, max_completed=NORMAL, clears=100, play_time=0, gold=0):
    """เซฟจำลองที่มีคีย์ครบพอให้ diff_saves ทำงานได้โดยไม่ KeyError."""
    return {
        "currentStageKey": stage_key,
        "maxCompletedStage": max_completed,
        "currentStageWave": 1,
        "stageClears": clears,
        "playTime": play_time,
        "gold": gold,
        "inventory": [],
        "stash": [],
        "heroes": [],
        "currencies": [],
        "boxes": [],
        "runes": [],
        "pets": [],
    }


# ── _activity_clears ─────────────────────────────────────────────────────────
def test_counter_delta_fires_with_count():
    """ตัวนับ +3 ด่านเดิม → 1 อีเวนต์ stage_cleared (farm) count=3."""
    out = _activity_clears(save(clears=100), save(clears=103))
    assert len(out) == 1
    e = out[0]
    assert e["type"] == "stage_cleared"
    assert e["data"]["stageKey"] == NORMAL
    assert e["data"]["farm"] is True
    assert e["data"]["count"] == 3
    assert e["title"].startswith("เคลียร์ ")


def test_seconds_per_round_from_playtime():
    """วินาที/รอบ = ผลต่าง playTime ÷ จำนวนรอบ = 120/3 = 40."""
    out = _activity_clears(save(clears=100, play_time=1000), save(clears=103, play_time=1120))
    assert out[0]["data"]["secondsPerRound"] == 40


def test_no_playtime_omits_seconds():
    out = _activity_clears(save(clears=100, play_time=0), save(clears=101, play_time=0))
    assert "secondsPerRound" not in out[0]["data"]


def test_boss_stage_is_boss_cleared():
    out = _activity_clears(save(BOSS, BOSS, clears=50), save(BOSS, BOSS, clears=52))
    assert out[0]["type"] == "boss_cleared"
    assert out[0]["title"].startswith("เคลียร์บอส ")
    assert out[0]["data"]["count"] == 2


def test_no_change_does_not_fire():
    assert _activity_clears(save(clears=100), save(clears=100)) == []


def test_counter_decrease_does_not_fire():
    assert _activity_clears(save(clears=100), save(clears=99)) == []


def test_baseline_after_upgrade_does_not_flood():
    """state.json เก่าไม่มี stageClears → prev=0 ถือเป็นค่าตั้งต้น ไม่เทยอดสะสมทั้งก้อน."""
    assert _activity_clears(save(clears=0), save(clears=8000)) == []


def test_new_max_subtracts_milestone_clear():
    """เคลียร์ 2 รอบ โดย 1 รอบเป็นด่านสูงสุดใหม่ → _activity_stage เอา 1, เหลือ farm count=1."""
    prev = save(NORMAL, max_completed=NORMAL - 1, clears=100)
    curr = save(NORMAL, max_completed=NORMAL, clears=102)
    out = _activity_clears(prev, curr)
    assert len(out) == 1
    assert out[0]["data"]["count"] == 1
    assert out[0]["data"]["farm"] is True


def test_new_max_single_clear_yields_no_farm():
    """เคลียร์รอบเดียวซึ่งเป็นด่านสูงสุดใหม่ → _activity_stage จัดการล้วน, ไม่มี farm."""
    prev = save(NORMAL, max_completed=NORMAL - 1, clears=100)
    curr = save(NORMAL, max_completed=NORMAL, clears=101)
    assert _activity_clears(prev, curr) == []


def test_no_stage_does_not_fire():
    assert _activity_clears(save(0, 0, clears=100), save(0, 0, clears=105)) == []


# ── diff_saves integration (กันนับซ้ำกับ _activity_stage) ────────────────────
def test_diff_farm_clears_appear_once_with_count():
    _loot, activity = diff_saves(save(clears=100), save(clears=105))
    farm = [a for a in activity if a.get("data", {}).get("farm")]
    assert len(farm) == 1
    assert farm[0]["type"] == "stage_cleared"
    assert farm[0]["data"]["count"] == 5


def test_diff_progression_has_no_farm_flag():
    """ผ่านด่านสูงสุดใหม่แล้วขยับไปด่านถัดไป → มี stage_cleared แต่ไม่มี farm flag."""
    prev = save(NORMAL, max_completed=NORMAL - 1, clears=100)
    curr = save(NORMAL + 1, max_completed=NORMAL, clears=101)
    _loot, activity = diff_saves(prev, curr)
    stage = [a for a in activity if a["type"] in ("stage_cleared", "boss_cleared")]
    assert len(stage) == 1
    assert not stage[0].get("data", {}).get("farm")


def test_diff_single_new_max_counts_once():
    """เคลียร์ด่านที่กลายเป็น max ใหม่พอดี (รอบเดียว) ต้องนับครั้งเดียว ไม่ใช่ farm."""
    prev = save(NORMAL, max_completed=NORMAL - 1, clears=100)
    curr = save(NORMAL, max_completed=NORMAL, clears=101)
    _loot, activity = diff_saves(prev, curr)
    stage = [a for a in activity if a["type"] in ("stage_cleared", "boss_cleared")]
    assert len(stage) == 1
    assert not stage[0].get("data", {}).get("farm")


def test_diff_new_max_plus_reclears_split():
    """maxสูงขึ้น + เคลียร์ซ้ำหลายรอบ → 1 progression(ไม่ farm) + 1 farm(count=รอบที่เหลือ)."""
    prev = save(NORMAL, max_completed=NORMAL - 1, clears=100)
    curr = save(NORMAL, max_completed=NORMAL, clears=104)
    _loot, activity = diff_saves(prev, curr)
    stage = [a for a in activity if a["type"] in ("stage_cleared", "boss_cleared")]
    farm = [a for a in stage if a.get("data", {}).get("farm")]
    nonfarm = [a for a in stage if not a.get("data", {}).get("farm")]
    assert len(nonfarm) == 1               # _activity_stage milestone
    assert len(farm) == 1                   # _activity_clears remainder
    assert farm[0]["data"]["count"] == 3    # 4 clears − 1 milestone


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
