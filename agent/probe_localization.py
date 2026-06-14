"""สำรวจ Unity Localization bundles เพื่อหาชื่อไอเทมภาษาไทย

ใช้ค้นว่า string table เก็บ key/value อย่างไร แล้วจะ map กับ itemKey ในเซฟได้ยังไง
"""
from __future__ import annotations

import json
import os

import UnityPy

BASE = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"
FILES = [
    ("shared", "localization-assets-shared_assets_all.bundle"),
    ("thai", "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle"),
    ("english", "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle"),
]


def dump(label: str, fn: str) -> None:
    path = os.path.join(BASE, fn)
    print("=" * 70)
    print(f"{label}: {fn}")
    if not os.path.exists(path):
        print("  !! ไม่พบไฟล์")
        return
    env = UnityPy.load(path)
    objs = list(env.objects)
    counts: dict[str, int] = {}
    for o in objs:
        counts[o.type.name] = counts.get(o.type.name, 0) + 1
    print("types:", counts)

    shown = 0
    for o in objs:
        if o.type.name != "MonoBehaviour":
            continue
        try:
            tt = o.read_typetree()
        except Exception as e:
            try:
                d = o.read()
                nm = getattr(d, "m_Name", getattr(d, "name", "?"))
                print(f"  MB name={nm!r}  (อ่าน typetree ไม่ได้: {e})")
            except Exception as e2:
                print(f"  MB อ่านไม่ได้เลย: {e2}")
            continue
        nm = tt.get("m_Name")
        print(f"  MB name={nm!r}  keys={list(tt.keys())}")
        if shown < 3:
            s = json.dumps(tt, ensure_ascii=False, default=str)
            print("     ", s[:2000])
            shown += 1


for label, fn in FILES:
    dump(label, fn)
