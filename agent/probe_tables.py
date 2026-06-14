"""ค้นหา data table (ScriptableObject/MonoBehaviour) ในไฟล์ assets หลัก
เป้าหมาย: ตาราง statType->name, pet effects, item base stats
พิมพ์ชื่อ MonoBehaviour ที่น่าจะเป็นตารางข้อมูล + คีย์ภายใน
"""
from __future__ import annotations

import os
import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
FILES = ["resources.assets", "sharedassets0.assets", "globalgamemanagers.assets"]
KW = ("pet", "stat", "item", "enchant", "mod", "decor", "grade", "rarity",
      "table", "data", "spec", "balance", "equip", "skill", "rune", "drop")


def interesting(name: str, keys) -> bool:
    n = (name or "").lower()
    if any(k in n for k in KW):
        return True
    ks = " ".join(str(x).lower() for x in (keys or []))
    return any(k in ks for k in ("statmod", "peteffect", "basestat", "leveldata", "selldata"))


for fn in FILES:
    path = os.path.join(DATA, fn)
    if not os.path.exists(path):
        print("missing", fn)
        continue
    print("=" * 70)
    print("FILE:", fn)
    env = UnityPy.load(path)
    mb = 0
    for o in env.objects:
        if o.type.name != "MonoBehaviour":
            continue
        mb += 1
        try:
            tt = o.read_typetree()
        except Exception:
            continue
        name = tt.get("m_Name") or ""
        keys = [k for k in tt.keys() if not k.startswith("m_Script") and k not in ("m_GameObject", "m_Enabled", "m_ObjectHideFlags", "m_CorrespondingSourceObject", "m_PrefabInstance", "m_PrefabAsset", "m_Name")]
        if interesting(name, keys):
            # show size of list-ish fields
            info = []
            for k in keys:
                v = tt.get(k)
                if isinstance(v, list):
                    info.append(f"{k}[{len(v)}]")
                else:
                    info.append(k)
            print(f"  MB {name!r}  -> {info[:12]}")
    print("  total MonoBehaviour:", mb)
