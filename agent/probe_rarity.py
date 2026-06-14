"""หา "ชื่อระดับความหายาก/เกรด" ของไอเทม จาก StringTable (ไทย/อังกฤษ)"""
from __future__ import annotations

import os
import re

import UnityPy

BASE = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"


def load_mb(fn: str) -> dict[str, dict]:
    env = UnityPy.load(os.path.join(BASE, fn))
    return {
        str(o.read_typetree().get("m_Name")): o.read_typetree()
        for o in env.objects
        if o.type.name == "MonoBehaviour"
    }


shared = load_mb("localization-assets-shared_assets_all.bundle")
th = load_mb("localization-string-tables-thai(thailand)(th-th)_assets_all.bundle")
en = load_mb("localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle")

sd = shared["StringTable Shared Data"]
id2key = {int(e["m_Id"]): str(e["m_Key"]) for e in sd["m_Entries"]}
th_tbl = next(v for k, v in th.items() if k.startswith("StringTable_"))
en_tbl = next(v for k, v in en.items() if k.startswith("StringTable_"))
th_map = {int(e["m_Id"]): e["m_Localized"] for e in th_tbl["m_TableData"]}
en_map = {int(e["m_Id"]): e["m_Localized"] for e in en_tbl["m_TableData"]}

rx = re.compile(
    r"grade|rarity|tier|rank|normal|magic|rare|epic|legend|myth|unique|chaos|common|uncommon|quality",
    re.I,
)
print("คีย์ที่เกี่ยวกับเกรด/ความหายาก:")
for i, key in sorted(id2key.items(), key=lambda x: x[1]):
    if rx.search(key):
        print(f"  {key:34s} | th={str(th_map.get(i)):24s} | en={en_map.get(i)}")
