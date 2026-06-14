"""ดึงชื่อไอเทม (ไทย + อังกฤษ) จาก Unity Localization → extracted/item_names.json

map:  itemKey -> {"th": ชื่อไทย, "en": ชื่ออังกฤษ}
ผ่านการ join:  ItemTable Shared Data (m_Id <-> "ItemName_<key>")  กับ  ItemTable_<locale> (m_Id <-> ข้อความ)
"""
from __future__ import annotations

import json
import os
from collections import Counter

import UnityPy

BASE = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"
SHARED = "localization-assets-shared_assets_all.bundle"
LOCALES = {
    "th": "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle",
    "en": "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle",
}


def load_monobehaviours(fn: str) -> dict[str, dict]:
    env = UnityPy.load(os.path.join(BASE, fn))
    out: dict[str, dict] = {}
    for o in env.objects:
        if o.type.name == "MonoBehaviour":
            tt = o.read_typetree()
            out[str(tt.get("m_Name"))] = tt
    return out


# 1) shared data: m_Id -> itemKey
shared = load_monobehaviours(SHARED)
item_shared = shared["ItemTable Shared Data"]
id_to_key: dict[int, int] = {}
for e in item_shared["m_Entries"]:
    key = str(e["m_Key"])
    if key.startswith("ItemName_"):
        suffix = key[len("ItemName_"):]
        try:
            id_to_key[int(e["m_Id"])] = int(suffix)
        except ValueError:
            pass
print(f"shared ItemName entries: {len(id_to_key)}")

# 2) each locale: m_Id -> localized, joined to itemKey
names: dict[int, dict[str, str]] = {}
for lang, fn in LOCALES.items():
    mbs = load_monobehaviours(fn)
    table = next((v for k, v in mbs.items() if k.startswith("ItemTable_")), None)
    if not table:
        print(f"  !! {lang}: ไม่พบ ItemTable_*")
        continue
    n = 0
    for e in table["m_TableData"]:
        ik = id_to_key.get(int(e["m_Id"]))
        if ik is None:
            continue
        names.setdefault(ik, {})[lang] = str(e["m_Localized"])
        n += 1
    print(f"  {lang}: {n} entries")

# 3) save
os.makedirs("extracted", exist_ok=True)
out_path = os.path.join("extracted", "item_names.json")
with open(out_path, "w", encoding="utf-8") as fh:
    json.dump({str(k): v for k, v in sorted(names.items())}, fh, ensure_ascii=False, indent=0)
print(f"\nรวมไอเทม {len(names)} รายการ -> {out_path}")

# 4) sanity: known keys + key-prefix histogram
print("\nตัวอย่าง / คีย์ที่รู้จัก:")
for k in (100001, 110001, 112001, 322051):
    print(f"  {k}: {names.get(k)}")
if names:
    print("ช่วงคีย์:", min(names), "-", max(names))
    prefixes = Counter(str(k)[:3] for k in names)
    print("prefix 3 หลักแรก (นับจำนวน):", dict(sorted(prefixes.items())))
