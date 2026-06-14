"""หาตารางข้อมูล (MonoBehaviour ScriptableObject) ที่นิยาม Pet/Hero/Rune
เพื่อ map key -> ชื่อ/รูป  รัน: PYTHONUTF8=1 python probe_data.py
"""
from __future__ import annotations

import json
import os
from collections import Counter

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
FILES = ["resources.assets", "sharedassets0.assets", "globalgamemanagers.assets"]

INTEREST = ("pet", "hero", "rune", "character", "cha", "table", "data", "info", "db", "list")


def name_of(o) -> str:
    try:
        d = o.read()
        return str(getattr(d, "m_Name", None) or getattr(d, "name", None) or "")
    except Exception:  # noqa: BLE001
        return ""


for fn in FILES:
    path = os.path.join(DATA, fn)
    if not os.path.exists(path):
        continue
    env = UnityPy.load(path)
    mbs = [o for o in env.objects if o.type.name == "MonoBehaviour"]
    print("=" * 70)
    print(f"{fn}: MonoBehaviour={len(mbs)}")

    named = []
    tt_ok = 0
    tt_fail = 0
    for o in mbs:
        nm = name_of(o)
        if nm:
            named.append(nm)
    interesting = sorted({n for n in named if any(k in n.lower() for k in INTEREST)})
    print(f"  named MB={len(named)}  interesting={len(interesting)}")
    for n in interesting[:120]:
        print("    ", n)

    # ลองอ่าน typetree ของ MB ที่ชื่อเกี่ยวกับ pet/hero/rune เพื่อดูโครงสร้าง
    print("  --- ลองอ่าน typetree ตัวที่น่าสนใจ ---")
    shown = 0
    for o in mbs:
        nm = name_of(o)
        low = nm.lower()
        if not any(k in low for k in ("pet", "hero", "rune")):
            continue
        try:
            tt = o.read_typetree()
            tt_ok += 1
            if shown < 8:
                s = json.dumps(tt, ensure_ascii=False, default=str)
                print(f"    [{nm}] keys={list(tt.keys())[:25]}")
                print("      ", s[:900])
                shown += 1
        except Exception as e:  # noqa: BLE001
            tt_fail += 1
            if shown < 8:
                print(f"    [{nm}] typetree FAIL: {str(e)[:80]}")
    print(f"  typetree ok={tt_ok} fail={tt_fail}")
