"""ดึงรูป ฮีโร่ + เพ็ท จาก sharedassets0.assets และสร้างแคตตาล็อกชื่อ (ไทย/อังกฤษ)

ผลลัพธ์:
  - public/heroes/<heroKey>.png        (ภาพหน้าฮีโร่ จาก Sprite 'Hero_<key>')
  - public/pets/<petKey>.png           (ภาพเพ็ท จาก Sprite 'PetSlot_<Name>_Arranged')
  - lib/game/character-catalog.generated.json
        { "heroes": {key:{th,en,icon}}, "pets": {key:{th,en,icon}} }

key mapping ยืนยันจาก localization (HeroName_<key>, PetName_<key>) + การจับคู่ชื่อ↔สไปรท์
"""
from __future__ import annotations

import json
import os
import re

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
LOC = os.path.join(DATA, "StreamingAssets", "aa", "StandaloneWindows64")
WEB = r"C:\Users\Admin\tbh-companion"
HERO_DIR = os.path.join(WEB, "public", "heroes")
PET_DIR = os.path.join(WEB, "public", "pets")
CATALOG = os.path.join(WEB, "lib", "game", "character-catalog.generated.json")

SHARED_BUNDLE = "localization-assets-shared_assets_all.bundle"
LANG_BUNDLES = {
    "en": "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle",
    "th": "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle",
}

# petKey -> ชื่อสไปรท์ (PetSlot_<Name>_Arranged) ยืนยันจาก PetName_<key> ใน localization
PET_SPRITE = {
    1001: "Bat",          # Bat
    1002: "BeHolder",     # Watcher (beholder = ตาลอย เฝ้ามอง)
    1003: "FlyingSkull",  # Burning Skeleton
    1004: "BlueGolem",    # Blue Golem
    1005: "BlackSpirit",  # Dark Spirit
    6001: "FlyingSword",  # Sword
    6002: "Butterfly",    # Butterfly
    6003: "Dragon",       # Dragon
}
HERO_KEYS = [101, 201, 301, 401, 501, 601]

os.makedirs(HERO_DIR, exist_ok=True)
os.makedirs(PET_DIR, exist_ok=True)


# ---------- localization: key -> ข้อความ ----------
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


names = {lang: lang_map(fn) for lang, fn in LANG_BUNDLES.items()}


def nm(prefix: str, key: int, lang: str) -> str | None:
    v = names.get(lang, {}).get(f"{prefix}_{key}")
    return v or None


# ---------- ดึงรูปจาก sharedassets0 ----------
print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))

want_hero = {f"Hero_{k}": k for k in HERO_KEYS}             # Sprite ชื่อ Hero_<key>
want_pet = {f"PetSlot_{n}_Arranged": k for k, n in PET_SPRITE.items()}

heroes_done: dict[int, bool] = {}
pets_done: dict[int, bool] = {}
hero_size = pet_size = None

for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        name = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue

    if name in want_hero and want_hero[name] not in heroes_done:
        key = want_hero[name]
        try:
            img = sp.image
            img.save(os.path.join(HERO_DIR, f"{key}.png"))
            heroes_done[key] = True
            hero_size = img.size
        except Exception as e:  # noqa: BLE001
            print("  hero err", name, e)
    elif name in want_pet and want_pet[name] not in pets_done:
        key = want_pet[name]
        try:
            img = sp.image
            img.save(os.path.join(PET_DIR, f"{key}.png"))
            pets_done[key] = True
            pet_size = img.size
        except Exception as e:  # noqa: BLE001
            print("  pet err", name, e)

print(f"heroes export: {len(heroes_done)}/{len(HERO_KEYS)} size={hero_size}")
print(f"pets   export: {len(pets_done)}/{len(PET_SPRITE)} size={pet_size}")
missing_h = [k for k in HERO_KEYS if k not in heroes_done]
missing_p = [k for k in PET_SPRITE if k not in pets_done]
if missing_h:
    print("  ฮีโร่ที่หาไม่เจอ:", missing_h)
if missing_p:
    print("  เพ็ทที่หาไม่เจอ:", missing_p, "->", [PET_SPRITE[k] for k in missing_p])

# ---------- เขียนแคตตาล็อก ----------
catalog = {
    "heroes": {
        str(k): {
            "th": nm("HeroName", k, "th"),
            "en": nm("HeroName", k, "en"),
            "icon": f"{k}.png" if k in heroes_done else None,
        }
        for k in HERO_KEYS
    },
    "pets": {
        str(k): {
            "th": nm("PetName", k, "th"),
            "en": nm("PetName", k, "en"),
            "icon": f"{k}.png" if k in pets_done else None,
        }
        for k in PET_SPRITE
    },
}
with open(CATALOG, "w", encoding="utf-8") as fh:
    json.dump(catalog, fh, ensure_ascii=False, indent=2)
print(f"catalog -> {CATALOG}")
print("heroes:", {k: v["th"] or v["en"] for k, v in catalog["heroes"].items()})
print("pets:  ", {k: v["th"] or v["en"] for k, v in catalog["pets"].items()})
