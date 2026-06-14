"""หา TextAsset (JSON/CSV) + รายชื่อ MonoBehaviour ที่อ่านชื่อได้ ในไฟล์ assets หลัก"""
from __future__ import annotations

import os
import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
FILES = ["resources.assets", "sharedassets0.assets", "globalgamemanagers.assets"]

for fn in FILES:
    path = os.path.join(DATA, fn)
    if not os.path.exists(path):
        continue
    print("=" * 70)
    print("FILE:", fn)
    env = UnityPy.load(path)
    # ---- TextAssets ----
    texts = []
    for o in env.objects:
        if o.type.name != "TextAsset":
            continue
        try:
            d = o.read()
            nm = str(getattr(d, "m_Name", "?"))
            raw = d.m_Script if hasattr(d, "m_Script") else getattr(d, "text", "")
            n = len(raw) if raw else 0
            texts.append((nm, n))
        except Exception as e:
            texts.append(("<err>", 0))
    print(f"TextAssets: {len(texts)}")
    for nm, n in sorted(texts, key=lambda x: -x[1])[:50]:
        print(f"   {nm!r}  ({n} bytes)")

    # ---- MonoBehaviour names (non-empty, distinct) ----
    names = {}
    fail = 0
    for o in env.objects:
        if o.type.name != "MonoBehaviour":
            continue
        try:
            tt = o.read_typetree()
            nm = tt.get("m_Name") or ""
            if nm:
                names[nm] = names.get(nm, 0) + 1
        except Exception:
            fail += 1
    print(f"MB distinct non-empty names: {len(names)} (typetree-fail={fail})")
    for nm in sorted(names)[:80]:
        print(f"   MB {nm!r} x{names[nm]}")
