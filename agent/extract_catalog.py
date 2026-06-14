"""สร้างแคตตาล็อกไอเทมให้เว็บ: ชื่อไทย/อังกฤษ + ไอคอน + ประเภท/ช่องสวมใส่

ผลลัพธ์:
  - public/items/<baseKey>.png            (ไอคอนไอเทมแต่ละชิ้น จาก SpriteAtlas 'ItemIcon')
  - lib/game/item-catalog.generated.json  ({ baseKey: {th, en, type, slot, icon} })

baseKey = คีย์ฐานของไอเทม (อุปกรณ์ในเซฟเข้ารหัสเป็น [class][subtype][rarity][item:2][variant];
ฐาน = class*100000 + subtype*10000 + item) ใช้ map กับชื่อ/ไอคอน
"""
from __future__ import annotations

import json
import os
import re

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
WEB = r"C:\Users\Admin\tbh-companion"
ICON_DIR = os.path.join(WEB, "public", "items")
CATALOG = os.path.join(WEB, "lib", "game", "item-catalog.generated.json")
NAMES = os.path.join("extracted", "item_names.json")

SLOT_BY_CLASS = {
    "1": "material",
    "3": "weapon",
    "4": "offhand",
    "5": "armor",
    "6": "accessory",
    "9": "special",
}

os.makedirs(ICON_DIR, exist_ok=True)
with open(NAMES, encoding="utf-8") as fh:
    names: dict[str, dict] = json.load(fh)

print("loading sharedassets0.assets …")
env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))
# Equipment icons use an ALL-CAPS class prefix (e.g. STAFF_320015, RING_620004);
# materials/consumables/currency use the mixed-case 'Item_' prefix (e.g. Item_190003).
# Both encode the 6-digit item key as the suffix, so capture either spelling.
pat = re.compile(r"^([A-Za-z]+)_(\d{6})$")

icons: dict[int, str] = {}
prefixes: dict[str, list[int]] = {}
exported = 0
errors: list[tuple[str, str]] = []
first_size = None

for o in env.objects:
    if o.type.name != "Sprite":
        continue
    try:
        sp = o.read()
        nm = str(sp.m_Name)
    except Exception:  # noqa: BLE001
        continue
    m = pat.match(nm)
    if not m:
        continue
    prefix, key = m.group(1), int(m.group(2))
    if key in icons:
        continue
    icons[key] = prefix
    prefixes.setdefault(prefix, []).append(key)
    try:
        img = sp.image
        if first_size is None:
            first_size = img.size
        img.save(os.path.join(ICON_DIR, f"{key}.png"))
        exported += 1
    except Exception as e:  # noqa: BLE001
        errors.append((nm, str(e)))

print(f"ไอคอน match: {len(icons)}  export: {exported}  error: {len(errors)}  ขนาดตัวอย่าง: {first_size}")
if errors:
    print("error ตัวอย่าง:", errors[:5])

# build catalog over union of names + icons
catalog: dict[str, dict] = {}
for k in sorted(set(int(x) for x in names) | set(icons)):
    e = names.get(str(k), {})
    catalog[str(k)] = {
        "th": e.get("th"),
        "en": e.get("en"),
        "type": icons.get(k),
        "slot": SLOT_BY_CLASS.get(str(k)[0], "other"),
        "icon": f"{k}.png" if k in icons else None,
    }
with open(CATALOG, "w", encoding="utf-8") as fh:
    json.dump(catalog, fh, ensure_ascii=False, indent=0)
print(f"catalog: {len(catalog)} รายการ -> {CATALOG}")

names_no_icon = sorted(int(k) for k in names if int(k) not in icons)
icons_no_name = sorted(k for k in icons if str(k) not in names)
print(f"มีชื่อแต่ไม่มีไอคอน: {len(names_no_icon)} {names_no_icon[:20]}")
print(f"มีไอคอนแต่ไม่มีชื่อ: {len(icons_no_name)} {icons_no_name[:20]}")
print("\nประเภท (prefix):")
for p, ks in sorted(prefixes.items()):
    sk = sorted(ks)[0]
    print(f"  {p:10s} x{len(ks):3d}  e.g. {sk} = {names.get(str(sk))}")
