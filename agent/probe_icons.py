"""สำรวจ: ไอคอนสกิล + สไปรท์กล่องลูท (ที่ดรอป) เพื่อแยกกล่องธรรมดา/กล่องฟ้า
รัน: PYTHONUTF8=1 python probe_icons.py
"""
from __future__ import annotations

import os
import re
from collections import defaultdict

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"

print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))

names: list[str] = []
sizes: dict[str, tuple] = {}
for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        nm = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue
    names.append(nm)
    try:
        sizes[nm] = sp.image.size
    except Exception:  # noqa: BLE001
        sizes[nm] = None

print(f"total sprites: {len(names)}")

# ---- skill icons ----
print("\n=== sprites with 'skill' ===")
for nm in sorted(names):
    if "skill" in nm.lower():
        print(f"  {nm:45s} {sizes.get(nm)}")

# ---- loot box drop sprites ----
print("\n=== candidate loot-box drops (Box/Loot/Drop/Reward/Treasure, not UI) ===")
pat = re.compile(r"box|loot|drop|reward|treasure|gift|present", re.I)
skip = re.compile(
    r"effect|button|gauge|checkbox|dropdown|mailbox|text|menu|bg|possessed|empty|sign|percent|cooltime",
    re.I,
)
groups: dict[str, list[str]] = defaultdict(list)
for nm in sorted(names):
    if pat.search(nm) and not skip.search(nm):
        key = re.sub(r"[_-]?\d+$", "", nm)
        groups[key].append(nm)
for key in sorted(groups):
    items = groups[key]
    szs = {sizes.get(n) for n in items}
    print(f"  {key:40s} x{len(items):3d}  size={szs}  e.g. {items[0]}")

# ---- all chest sprites with sizes (to spot color variants) ----
print("\n=== Chest_* full list (no UI skip) ===")
for nm in sorted(names):
    if "chest" in nm.lower():
        print(f"  {nm:45s} {sizes.get(nm)}")
