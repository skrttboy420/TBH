"""ดึงรูปตัวละครเต็มตัว (ChaAnim_<class>_Large) + รูปกล่อง + แคตตาล็อกสกิล (ไทย/อังกฤษ)

ผลลัพธ์:
  - public/heroes-full/<heroKey>.png    (ภาพเต็มตัว เฟรมแรกของอนิเมชัน Large)
  - agent/_boxprobe/*.png               (รูปกล่องตัวเลือก ไว้เทียบก่อนเลือกใช้)
  - lib/game/skill-catalog.generated.json
        { "<skillId>": {th,en,descTh,descEn} }

mapping ยืนยันจาก save จริง (BoxTypes: 0=ธรรมดา, 1=บอสด่าน) + localization + skill desc
รัน: PYTHONUTF8=1 python extract_status.py
"""
from __future__ import annotations

import json
import os
import re

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
LOC = os.path.join(DATA, "StreamingAssets", "aa", "StandaloneWindows64")
WEB = r"C:\Users\Admin\tbh-companion"
HERO_FULL_DIR = os.path.join(WEB, "public", "heroes-full")
BOX_PROBE_DIR = os.path.join(WEB, "agent", "_boxprobe")
SKILL_CATALOG = os.path.join(WEB, "lib", "game", "skill-catalog.generated.json")

SHARED_BUNDLE = "localization-assets-shared_assets_all.bundle"
LANG_BUNDLES = {
    "en": "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle",
    "th": "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle",
}

# class name (ในชื่อสไปรท์) -> heroKey  (ยืนยันจาก skill desc: Abalist=หน้าไม้=Hunter 501)
CLASS_TO_HERO = {
    "Knight": 101,
    "Ranger": 201,
    "Sorcerer": 301,
    "Priest": 401,
    "Abalist": 501,
    "Slayer": 601,
}

# box type (จาก save BoxTypes) -> (loc suffix, sprite prefix)
BOX_TYPES = {
    0: ("Normal", "Chest_Normal"),
    1: ("StageBoss", "Chest_NormalBoss"),
    2: ("ActBoss", "Chest_ActBoss"),
}

os.makedirs(HERO_FULL_DIR, exist_ok=True)
os.makedirs(BOX_PROBE_DIR, exist_ok=True)


# ---------- localization ----------
def _load_mbs(fn: str) -> list[dict]:
    path = os.path.join(LOC, fn)
    out: list[dict] = []
    if not os.path.exists(path):
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
for tt in _load_mbs(SHARED_BUNDLE):
    for e in tt.get("m_Entries") or []:
        if isinstance(e, dict) and "m_Id" in e and "m_Key" in e:
            id2key[int(e["m_Id"])] = str(e["m_Key"])


def lang_map(fn: str) -> dict[str, str]:
    m: dict[str, str] = {}
    for tt in _load_mbs(fn):
        for e in tt.get("m_TableData") or []:
            if isinstance(e, dict) and e.get("m_Id") is not None:
                k = id2key.get(int(e["m_Id"]))
                if k:
                    m[k] = str(e.get("m_Localized") or "")
    return m


loc = {lang: lang_map(fn) for lang, fn in LANG_BUNDLES.items()}


def L(key: str, lang: str) -> str | None:
    v = loc.get(lang, {}).get(key)
    return v or None


# ---------- sprites ----------
print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))

cha_pat = re.compile(r"^(?:Arrage|Arrange)_ChaAnim_([A-Za-z]+)_Large_(\d+)$")
# เก็บเฟรมเต็มตัวทุกเฟรมไว้ก่อน แล้วค่อยเลือกเฟรม 0
cha_frames: dict[str, dict[int, object]] = {}
box_sprites: dict[str, object] = {}

box_names_wanted: set[str] = set()
for _t, (_loc, prefix) in BOX_TYPES.items():
    box_names_wanted |= {
        f"{prefix}_Bg_Bottom",
        f"{prefix}_0",
        f"{prefix}_6",
    }
box_names_wanted |= {
    "DropChanceNormalChest",
    "DropChanceStageBossChest",
    "MenuButton_Chest_Active",
}

for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        name = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue
    m = cha_pat.match(name)
    if m:
        cls, idx = m.group(1), int(m.group(2))
        cha_frames.setdefault(cls, {})[idx] = sp
    elif name in box_names_wanted:
        box_sprites[name] = sp

# --- heroes full ---
hero_done: dict[int, tuple] = {}
for cls, frames in cha_frames.items():
    key = CLASS_TO_HERO.get(cls)
    if key is None or not frames:
        continue
    idx = min(frames)  # เฟรม 0 = ท่ายืนพัก
    sp = frames[idx]
    try:
        img = sp.image
        img.save(os.path.join(HERO_FULL_DIR, f"{key}.png"))
        hero_done[key] = img.size
    except Exception as e:  # noqa: BLE001
        print("  hero-full err", cls, e)
print(f"heroes-full export: {len(hero_done)} -> {hero_done}")
unmapped = [c for c in cha_frames if c not in CLASS_TO_HERO]
if unmapped:
    print("  คลาสที่ไม่ได้แมป:", unmapped)

# --- box candidates -> _boxprobe ---
for name, sp in box_sprites.items():
    try:
        sp.image.save(os.path.join(BOX_PROBE_DIR, f"{name}.png"))
    except Exception as e:  # noqa: BLE001
        print("  box err", name, e)
print(f"box candidates -> {BOX_PROBE_DIR} ({len(box_sprites)})")
print("  box loc names:")
for t, (suf, _p) in BOX_TYPES.items():
    print(f"    type {t}: th={L(f'TreasureChest_{suf}', 'th')!r} en={L(f'TreasureChest_{suf}', 'en')!r}")

# ---------- skill catalog ----------
skills: dict[str, dict] = {}
for cls_idx in range(1, 7):
    for slot in range(0, 7):  # 0 = โจมตีพื้นฐาน, 1-6 = สกิล
        sid = cls_idx * 10000 + slot * 100 + 1
        nm_key = f"SkillName_{sid}"
        ds_key = f"SkillDescription_{sid}"
        th = L(nm_key, "th")
        en = L(nm_key, "en")
        if slot == 0 and not (th or en):
            # โจมตีพื้นฐาน ไม่มีใน localization
            skills[str(sid)] = {
                "th": None,
                "en": None,
                "descTh": None,
                "descEn": None,
                "basic": True,
            }
            continue
        if not (th or en):
            continue
        skills[str(sid)] = {
            "th": th,
            "en": en,
            "descTh": L(ds_key, "th"),
            "descEn": L(ds_key, "en"),
            "basic": False,
        }

with open(SKILL_CATALOG, "w", encoding="utf-8") as fh:
    json.dump(skills, fh, ensure_ascii=False, indent=2)
print(f"\nskill catalog -> {SKILL_CATALOG} ({len(skills)} skills)")
for sid in sorted(skills, key=int)[:8]:
    s = skills[sid]
    print(f"  {sid}: {s['th'] or s['en']!r}")
