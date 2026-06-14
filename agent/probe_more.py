"""สำรวจ: รูปตัวละครเต็มตัว (ChaIllust/ChaAnim), สกิล, กล่อง + ข้อมูลในเซฟจริง
รัน: PYTHONUTF8=1 python probe_more.py
"""
from __future__ import annotations

import os
import re
from collections import defaultdict

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
LOC = os.path.join(DATA, "StreamingAssets", "aa", "StandaloneWindows64")
SHARED = "localization-assets-shared_assets_all.bundle"
EN = "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle"


def name_of(o) -> str:
    try:
        d = o.read()
        return str(getattr(d, "m_Name", None) or getattr(d, "name", None) or "")
    except Exception:  # noqa: BLE001
        return ""


print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))

illust: dict[str, list[tuple[str, tuple]]] = defaultdict(list)  # class -> [(name,size)]
boxes: list[tuple[str, tuple]] = []
sprite_sizes: dict[str, tuple] = {}

cha_pat = re.compile(r"^(?:Arrage|Arrange)_Cha(?:Illust|Anim)_([A-Za-z]+)_(Mid|Large)")
box_pat = re.compile(r"box|chest|reward", re.I)

for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        nm = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue
    m = cha_pat.match(nm)
    if m:
        cls, size = m.group(1), m.group(2)
        try:
            sz = sp.image.size
        except Exception:  # noqa: BLE001
            sz = None
        illust[f"{cls}_{size}"].append((nm, sz))
    if box_pat.search(nm) and not nm.lower().startswith(("toolbox",)):
        try:
            sz = sp.image.size
        except Exception:  # noqa: BLE001
            sz = None
        boxes.append((nm, sz))

print("\n=== ChaIllust / ChaAnim (class_size -> จำนวนเฟรม, ขนาด) ===")
for k in sorted(illust):
    items = sorted(illust[k])
    sizes = {s for _, s in items}
    print(f"  {k:30s} frames={len(items):3d} size={sizes}  e.g. {items[0][0]}")

print(f"\n=== กล่อง/หีบ ({len(boxes)}) ===")
for nm, sz in sorted(boxes):
    print(f"  {nm:45s} {sz}")


# ---------- localization ----------
def _load_mbs(fn: str) -> list[dict]:
    path = os.path.join(LOC, fn)
    out: list[dict] = []
    if not os.path.exists(path):
        return out
    e = UnityPy.load(path)
    for o in e.objects:
        if o.type.name == "MonoBehaviour":
            try:
                out.append(o.read_typetree())
            except Exception:  # noqa: BLE001
                pass
    return out


id2key: dict[int, str] = {}
for tt in _load_mbs(SHARED):
    for e in tt.get("m_Entries") or []:
        if isinstance(e, dict) and "m_Id" in e and "m_Key" in e:
            id2key[int(e["m_Id"])] = str(e["m_Key"])
en: dict[str, str] = {}
for tt in _load_mbs(EN):
    for e in tt.get("m_TableData") or []:
        if isinstance(e, dict) and e.get("m_Id") is not None:
            k = id2key.get(int(e["m_Id"]))
            if k:
                en[k] = str(e.get("m_Localized") or "")

print("\n=== localization: Skill* ===")
for k in sorted(en):
    if k.lower().startswith(("skillname", "skilldescription")):
        print(f"  {k:32s} = {en[k][:70]!r}")

print("\n=== localization: Box/Chest/Reward ===")
for k in sorted(en):
    if re.search(r"box|chest", k, re.I) or re.search(r"box|chest", en[k], re.I):
        print(f"  {k:36s} = {en[k][:70]!r}")


# ---------- live save ----------
print("\n=== live save: hero skills + boxes ===")
try:
    from tbh_agent.es3 import read_player_save
    from tbh_agent.save_reader import parse_save

    p = os.path.expanduser("~/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3")
    save = parse_save(read_player_save(p))
    for h in save["heroes"]:
        print(f"  hero {h['heroKey']} skills={h['skills']}")
    print("  boxes:", save["boxes"])
except Exception as e:  # noqa: BLE001
    print("  อ่านเซฟไม่ได้:", e)
