"""เลือกรูปกล่องสุดท้าย -> public/boxes/<type>.png  (0=ธรรมดา/ทอง, 1=ด่าน/ฟ้า, 2=บอสแอค)
ใช้ไอคอนหีบครบใบจาก DropChance*/MaxAmount* (16x16) ที่สีต่างกันชัด
รัน: PYTHONUTF8=1 python extract_boxes.py
"""
from __future__ import annotations

import os

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
WEB = r"C:\Users\Admin\tbh-companion"
BOX_DIR = os.path.join(WEB, "public", "boxes")
PROBE = os.path.join(WEB, "agent", "_boxprobe")
os.makedirs(BOX_DIR, exist_ok=True)

# type -> ชื่อสไปรท์หลักที่จะใช้ (ไอคอนหีบครบใบ)
FINAL = {
    0: "DropChanceNormalChest",      # หีบทอง = ธรรมดา
    1: "DropChanceStageBossChest",   # หีบฟ้า = ด่าน (กล่องฟ้า)
    2: "MaxAmountActBossChest",      # หีบบอสแอค (เทียบกับตัวเลือกอื่นถ้าไม่สวย)
}
# ตัวเลือก ActBoss เพิ่มเพื่อเทียบ
PROBE_EXTRA = ["MaxAmountActBossChest", "MaxAmountNormalChest", "MaxAmountStageBossChest"]

want = set(FINAL.values()) | set(PROBE_EXTRA)

print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))
found: dict[str, object] = {}
for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        nm = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue
    if nm in want:
        found[nm] = sp

for nm in PROBE_EXTRA:
    if nm in found:
        found[nm].image.save(os.path.join(PROBE, f"{nm}.png"))
        print("probe ->", nm, found[nm].image.size)

for t, nm in FINAL.items():
    if nm in found:
        found[nm].image.save(os.path.join(BOX_DIR, f"{t}.png"))
        print(f"box {t} <- {nm} {found[nm].image.size}")
    else:
        print(f"box {t}: NOT FOUND {nm}")
