"""ดัมพ์ Unity Localization ทั้งหมด (key -> {th,en}) เพื่อค้นหา:
  - ชื่อสเตตัส (สำหรับ enchant statType/statModKey)  เช่น "ด้านไฟ"
  - ความสามารถเพ็ท (pet abilities) เช่น "รับ Exp เพิ่ม 20%"
ผลลัพธ์: agent/extracted/localization_full.json  +  พิมพ์ key ที่น่าสนใจ
"""
from __future__ import annotations

import json
import os
import re

import UnityPy

BASE = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"
SHARED = "localization-assets-shared_assets_all.bundle"
LANGS = {
    "en": "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle",
    "th": "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle",
}
OUT_DIR = r"C:\Users\Admin\tbh-companion\agent\extracted"
os.makedirs(OUT_DIR, exist_ok=True)


def load_mbs(fn: str) -> list[dict]:
    path = os.path.join(BASE, fn)
    out: list[dict] = []
    if not os.path.exists(path):
        print("  !! missing", fn)
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


id2key: dict[int, str] = {}
for tt in load_mbs(SHARED):
    for e in tt.get("m_Entries") or []:
        if isinstance(e, dict) and "m_Id" in e and "m_Key" in e:
            id2key[int(e["m_Id"])] = str(e["m_Key"])
print("shared keys:", len(id2key))


def lang_map(fn: str) -> dict[str, str]:
    m: dict[str, str] = {}
    for tt in load_mbs(fn):
        for e in tt.get("m_TableData") or []:
            if isinstance(e, dict) and e.get("m_Id") is not None:
                k = id2key.get(int(e["m_Id"]))
                if k:
                    m[k] = str(e.get("m_Localized") or "")
    return m


names = {lang: lang_map(fn) for lang, fn in LANGS.items()}
print("th entries:", len(names["th"]), " en entries:", len(names["en"]))

full = {}
for k in sorted(set(names["th"]) | set(names["en"])):
    full[k] = {"th": names["th"].get(k), "en": names["en"].get(k)}

with open(os.path.join(OUT_DIR, "localization_full.json"), "w", encoding="utf-8") as f:
    json.dump(full, f, ensure_ascii=False, indent=1)
print("wrote localization_full.json:", len(full), "keys")

# ---- print keys of interest ----
def show(pattern: str, limit: int = 60) -> None:
    rx = re.compile(pattern, re.IGNORECASE)
    hits = [(k, v) for k, v in full.items() if rx.search(k)]
    print(f"\n### pattern {pattern!r} -> {len(hits)} keys")
    for k, v in hits[:limit]:
        print(f"   {k}  | th={v['th']!r}  en={v['en']!r}")


for pat in [r"^stat", r"stat.*name", r"^attr", r"^enchant", r"mod", r"^pet", r"abilit", r"^skill_?desc", r"resist", r"element"]:
    show(pat)

# also: any th value containing "ด้านไฟ" (fire defense) to locate stat naming scheme
print("\n### th values containing 'ด้านไฟ' or 'ดาเมจ' (find stat naming):")
for k, v in full.items():
    t = v["th"] or ""
    if ("ด้านไฟ" in t or "ดาเมจโจมตี" in t) and len(t) < 40:
        print(f"   {k}  | th={t!r}  en={v['en']!r}")
