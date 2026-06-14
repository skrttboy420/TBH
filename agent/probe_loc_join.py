"""join SharedTableData (key<->id) กับ String Table อังกฤษ (id<->ข้อความ)
เพื่อหา key ของชื่อ Pet/Hero/Rune -> map กับ petKey/heroKey/runeKey ในเซฟ

รัน: PYTHONUTF8=1 python probe_loc_join.py
"""
from __future__ import annotations

import json
import os

import UnityPy

BASE = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"
SHARED = "localization-assets-shared_assets_all.bundle"
EN = "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle"
TH = "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle"

PET_NAMES = ["bat", "beholder", "blackspirit", "bluegolem", "butterfly", "dragon", "flyingskull", "flyingsword", "golem", "spirit", "skull", "sword"]


def load_mbs(fn: str) -> list[dict]:
    path = os.path.join(BASE, fn)
    out = []
    if not os.path.exists(path):
        print("ไม่พบ", fn)
        return out
    env = UnityPy.load(path)
    for o in env.objects:
        if o.type.name != "MonoBehaviour":
            continue
        try:
            out.append(o.read_typetree())
        except Exception:  # noqa: BLE001
            pass
    return out


# 1) SharedTableData: id <-> key string
shared = load_mbs(SHARED)
id2key: dict[int, str] = {}
for tt in shared:
    entries = tt.get("m_Entries")
    if isinstance(entries, list):
        for e in entries:
            if isinstance(e, dict) and "m_Id" in e and "m_Key" in e:
                id2key[int(e["m_Id"])] = str(e["m_Key"])
print(f"SharedTableData entries: {len(id2key)}")
# โชว์ตัวอย่าง key
sample_keys = list(id2key.values())[:30]
print("ตัวอย่าง key:", sample_keys)

# 2) English string table: id -> text
def join_lang(fn: str, label: str) -> dict[str, str]:
    mbs = load_mbs(fn)
    key2txt: dict[str, str] = {}
    for tt in mbs:
        entries = tt.get("m_TableData")
        if isinstance(entries, list):
            for e in entries:
                if not isinstance(e, dict):
                    continue
                _id = e.get("m_Id")
                txt = e.get("m_Localized")
                if _id is None:
                    continue
                key = id2key.get(int(_id))
                if key is not None:
                    key2txt[key] = str(txt)
    print(f"\n[{label}] joined entries: {len(key2txt)}")
    return key2txt


en = join_lang(EN, "EN")

# 3) หา key ที่เกี่ยวกับ pet/hero/rune
def search(key2txt: dict[str, str], terms: list[str], by_value=False, limit=80):
    hits = []
    for k, v in key2txt.items():
        hay = (v if by_value else k).lower()
        if any(t in hay for t in terms):
            hits.append((k, v))
    return sorted(set(hits))[:limit]

print("\n=== key ที่ขึ้นต้น/มีคำว่า pet ===")
for k, v in search(en, ["pet"]):
    print(f"   {k!r:45s} = {v!r}")

print("\n=== ค่า (value) ที่ตรงชื่อเพ็ทในรูป ===")
for k, v in search(en, PET_NAMES, by_value=True):
    print(f"   {k!r:45s} = {v!r}")

print("\n=== key ที่มีคำว่า hero ===")
for k, v in search(en, ["hero"])[:50]:
    print(f"   {k!r:45s} = {v!r}")

print("\n=== key ที่มีคำว่า rune ===")
for k, v in search(en, ["rune"])[:50]:
    print(f"   {k!r:45s} = {v!r}")
