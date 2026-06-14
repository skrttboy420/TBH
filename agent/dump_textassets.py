"""ดึง TextAsset (data tables) จาก sharedassets0.assets ออกมาเป็นไฟล์ + พิมพ์ตัวอย่าง"""
from __future__ import annotations

import os
import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
OUT = r"C:\Users\Admin\tbh-companion\agent\extracted\tables"
os.makedirs(OUT, exist_ok=True)

WANT = {
    "StatModInfoData", "StatModGroupInfoData", "UniqueModInfoData",
    "PetInfoData", "PetStatInfoData",
    "GearInfoData", "ItemInfoData", "GearTypeInfoData", "GradeInfoData",
    "AttributeInfoData", "AttributeGroupInfoData",
    "ItemLevelScaleInfoData", "GearTypeScaleInfoData", "ItemTypeScaleInfoData",
    "MaterialInfoData", "CurrencyInfoData",
}
SAMPLE = {"StatModInfoData", "PetStatInfoData", "PetInfoData", "GearTypeInfoData",
          "GradeInfoData", "GearInfoData", "ItemInfoData", "AttributeInfoData"}

env = UnityPy.load(os.path.join(DATA, "sharedassets0.assets"))
for o in env.objects:
    if o.type.name != "TextAsset":
        continue
    try:
        d = o.read()
    except Exception:
        continue
    nm = str(getattr(d, "m_Name", "?"))
    if nm not in WANT:
        continue
    raw = d.m_Script
    if isinstance(raw, str):
        data = raw.encode("utf-8", "surrogateescape")
    else:
        data = bytes(raw)
    fp = os.path.join(OUT, nm + ".txt")
    with open(fp, "wb") as f:
        f.write(data)
    print(f"wrote {nm} ({len(data)} bytes)")
    if nm in SAMPLE:
        try:
            txt = data.decode("utf-8", "replace")
        except Exception:
            txt = str(data[:400])
        print(f"---- {nm} sample (first 700 chars) ----")
        print(txt[:700])
        print("...")
