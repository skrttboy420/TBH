"""สำรวจชื่อ Sprite/Texture2D สำหรับ ฮีโร่ / รูน / เพ็ท เพื่อหา pattern จริง
แล้วค่อยออกแบบสคริปต์ดึงรูป (extract_chars.py)

รัน: PYTHONUTF8=1 python probe_chars.py
"""
from __future__ import annotations

import os
import re
from collections import defaultdict

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
FILES = ["resources.assets", "sharedassets0.assets", "globalgamemanagers.assets"]

# คำที่น่าจะเกี่ยวกับ ฮีโร่/ตัวละคร/รูน/เพ็ท
KEYWORDS = ["hero", "cha", "illust", "rune", "pet", "char", "unit", "portrait"]


def name_of(o) -> str:
    try:
        d = o.read()
        return str(getattr(d, "m_Name", None) or getattr(d, "name", None) or "")
    except Exception as e:  # noqa: BLE001
        return f"<err {e}>"


# เก็บชื่อทั้งหมด แยกตาม prefix (ส่วนหน้าก่อน _ หรือก่อนเลข)
all_names: dict[str, list[tuple[str, str]]] = defaultdict(list)  # file -> [(type, name)]
matched: dict[str, set[str]] = defaultdict(set)  # keyword -> names

for fn in FILES:
    path = os.path.join(DATA, fn)
    if not os.path.exists(path):
        print(fn, "ไม่พบไฟล์")
        continue
    env = UnityPy.load(path)
    for o in env.objects:
        if o.type.name not in ("Sprite", "Texture2D"):
            continue
        nm = name_of(o)
        if not nm or nm.startswith("<err"):
            continue
        all_names[fn].append((o.type.name, nm))
        low = nm.lower()
        for kw in KEYWORDS:
            if kw in low:
                matched[kw].add(f"{o.type.name}:{nm}")

print("=" * 70)
print("จำนวนชื่อทั้งหมดต่อไฟล์:")
for fn, lst in all_names.items():
    print(f"  {fn}: {len(lst)}")

print("\n" + "=" * 70)
print("ชื่อที่ match keyword (ฮีโร่/รูน/เพ็ท ฯลฯ):")
for kw in KEYWORDS:
    names = sorted(matched[kw])
    if not names:
        continue
    print(f"\n--- '{kw}' ({len(names)}) ---")
    for n in names[:80]:
        print("   ", n)
    if len(names) > 80:
        print(f"    … อีก {len(names) - 80} ชื่อ")

# group by leading-prefix (ตัวอักษรก่อนเลข/underscore แรก) เพื่อเห็นภาพรวม pattern
print("\n" + "=" * 70)
print("Prefix รวม (จัดกลุ่มชื่อทั้งหมดตามส่วนหน้า):")
prefix_pat = re.compile(r"^([A-Za-z]+)")
groups: dict[str, list[str]] = defaultdict(list)
for fn, lst in all_names.items():
    for _typ, nm in lst:
        m = prefix_pat.match(nm)
        p = m.group(1) if m else "(other)"
        groups[p].append(nm)
for p, ns in sorted(groups.items(), key=lambda kv: -len(kv[1])):
    if len(ns) < 2:
        continue
    print(f"  {p:24s} x{len(ns):4d}  e.g. {sorted(ns)[:3]}")
