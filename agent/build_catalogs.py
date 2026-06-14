"""สร้าง catalog สำหรับเว็บ จาก data tables (TextAsset CSV) + Unity Localization

ผลลัพธ์ (lib/game/):
  - gear-catalog.generated.json     itemKey -> {g,gt,lv,base[],inh[]}  (ใช้ฝั่ง server)
  - statmod-catalog.generated.json  statModKey -> [STATTYPE, MODTYPE]
  - pet-stat-catalog.generated.json petKey -> [[STATTYPE,MODTYPE,Value],...]
  - stat-loc.generated.json         {names,acct,fmt} ภาษาไทย/อังกฤษเฉพาะคีย์สเตตัส
"""
from __future__ import annotations

import csv
import io
import json
import os

import UnityPy

DATA = r"D:\Steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
SHARED_ASSETS = os.path.join(DATA, "sharedassets0.assets")
LOC = os.path.join(DATA, "StreamingAssets", "aa", "StandaloneWindows64")
GAME = r"C:\Users\Admin\tbh-companion\lib\game"

SHARED_BUNDLE = "localization-assets-shared_assets_all.bundle"
LANG_BUNDLES = {
    "en": "localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle",
    "th": "localization-string-tables-thai(thailand)(th-th)_assets_all.bundle",
}
WANT_TABLES = {
    "ItemInfoData", "GearInfoData", "GearTypeInfoData",
    "StatModInfoData", "PetInfoData", "PetStatInfoData", "GradeInfoData",
}


def num(s):
    s = (s or "").strip()
    if s == "":
        return None
    try:
        f = float(s)
        return int(f) if f.is_integer() else round(f, 3)
    except ValueError:
        return None


# ---------- load CSV TextAssets ----------
print("loading sharedassets0.assets …")
env = UnityPy.load(SHARED_ASSETS)
tables: dict[str, str] = {}
for o in env.objects:
    if o.type.name != "TextAsset":
        continue
    try:
        d = o.read()
    except Exception:  # noqa: BLE001
        continue
    nm = str(getattr(d, "m_Name", ""))
    if nm not in WANT_TABLES:
        continue
    raw = d.m_Script
    data = raw.encode("utf-8", "surrogateescape") if isinstance(raw, str) else bytes(raw)
    tables[nm] = data.decode("utf-8-sig", "replace")
print("tables:", sorted(tables))


def rows(name: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(tables[name])))


# ---------- localization (stat keys only) ----------
def load_mbs(fn: str) -> list[dict]:
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
for tt in load_mbs(SHARED_BUNDLE):
    for e in tt.get("m_Entries") or []:
        if isinstance(e, dict) and "m_Id" in e and "m_Key" in e:
            id2key[int(e["m_Id"])] = str(e["m_Key"])


def lang_map(fn: str) -> dict[str, str]:
    m: dict[str, str] = {}
    for tt in load_mbs(fn):
        for e in tt.get("m_TableData") or []:
            if isinstance(e, dict) and e.get("m_Id") is not None:
                k = id2key.get(int(e["m_Id"]))
                if k:
                    m[k] = str(e.get("m_Localized") or "")
    return m


names = {lang: lang_map(fn) for lang, fn in LANG_BUNDLES.items()}

statloc = {"names": {}, "acct": {}, "fmt": {}}
for key, th in names["th"].items():
    en = names["en"].get(key)
    pair = {"th": th or None, "en": en or None}
    if key.startswith("StatName_"):
        statloc["names"][key[len("StatName_"):]] = pair
    elif key.startswith("AccountStatName_"):
        statloc["acct"][key[len("AccountStatName_"):]] = pair
    elif key.startswith("Stat_") and not key.endswith("_MinMax"):
        statloc["fmt"][key[len("Stat_"):]] = pair  # e.g. "FireResistance_FLAT"

# ---------- GRADE order ----------
grade_index = {r["GRADE"]: i for i, r in enumerate(rows("GradeInfoData"))}

# ---------- GearType base-stat defs ----------
geartype: dict[str, list[tuple[str, str]]] = {}
for r in rows("GearTypeInfoData"):
    defs = []
    for i in (1, 2):
        st = (r.get(f"BaseStat{i}_STATTYPE") or "").strip()
        if st and st != "NONE":
            defs.append((st, (r.get(f"BaseStat{i}_MODTYPE") or "FLAT").strip()))
    geartype[r["GearType"]] = defs

# ---------- GearInfo: base values + inherent ----------
gearinfo: dict[str, dict] = {}
for r in rows("GearInfoData"):
    base_vals = [r.get("BaseStat1_Value"), r.get("BaseStat2_Value")]
    inh = []
    for i in (1, 2, 3):
        st = (r.get(f"InherentStat{i}_STATTYPE") or "").strip()
        if st and st != "NONE":
            v = num(r.get(f"InherentStat{i}_Value"))
            if v is not None:
                inh.append([st, (r.get(f"InherentStat{i}_MODTYPE") or "FLAT").strip(), v])
    gearinfo[r["GearKey"]] = {"base": base_vals, "inh": inh}

# ---------- Item -> gear catalog ----------
gear_catalog: dict[str, dict] = {}
for r in rows("ItemInfoData"):
    if r.get("ITEMTYPE") != "GEAR":
        continue
    gt = (r.get("GEARTYPE") or "").strip()
    gi = gearinfo.get(r.get("GearKey") or "")
    if gi is None:
        continue
    base = []
    for (st, mt), val in zip(geartype.get(gt, []), gi["base"]):
        v = num(val)
        if v is not None:
            base.append([st, mt, v])
    gear_catalog[r["ItemKey"]] = {
        "g": grade_index.get(r.get("GRADE"), 0),
        "gt": gt,
        "lv": num(r.get("Level")) or 0,
        "base": base,
        "inh": gi["inh"],
    }

# ---------- StatMod catalog ----------
statmod: dict[str, list[str]] = {}
for r in rows("StatModInfoData"):
    k = r["StatModKey"]
    if k not in statmod:
        statmod[k] = [r["STATTYPE"], r["MODTYPE"]]

# ---------- Pet stat catalog ----------
by_data: dict[str, list] = {}
for r in rows("PetStatInfoData"):
    by_data.setdefault(r["PetStatKey"], []).append(
        [r["STATTYPE"], r["MODTYPE"], num(r["Value"])]
    )
pet_catalog: dict[str, list] = {}
for r in rows("PetInfoData"):
    pet_catalog[r["PetKey"]] = by_data.get(r.get("StatDataKey") or "", [])


def write(name: str, obj) -> None:
    fp = os.path.join(GAME, name)
    with open(fp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {name}: {len(obj)} entries, {os.path.getsize(fp)} bytes")


write("gear-catalog.generated.json", gear_catalog)
write("statmod-catalog.generated.json", statmod)
write("pet-stat-catalog.generated.json", pet_catalog)
write("stat-loc.generated.json", statloc)

# sanity check vs screenshot
print("\n-- sanity --")
print("gloves 522041:", json.dumps(gear_catalog.get("522041"), ensure_ascii=False))
print("statmod 101201:", statmod.get("101201"))
print("pet 6003:", json.dumps(pet_catalog.get("6003"), ensure_ascii=False))
print("fmt FireResistance_FLAT:", statloc["fmt"].get("FireResistance_FLAT"))
