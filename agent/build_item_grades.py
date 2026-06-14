"""สร้าง lib/game/item-grade.generated.json : itemKey -> เกรด (0..9)

ทำไมต้องมีไฟล์นี้: อุปกรณ์ (class 3-6) เข้ารหัสเกรดไว้ในตัวคีย์อยู่แล้ว เว็บถอดเอง
ได้ แต่ "วัตถุดิบ/ของพิเศษ" (class 1, 9, ...) ไม่ได้เข้ารหัสเกรดในคีย์ — เกรดอยู่ใน
ตาราง ItemInfoData (คอลัมน์ GRADE) เท่านั้น ไฟล์นี้ดึงเกรดพวกนั้นมาให้เว็บลงสีถูก
(เช่น 190001 "หินวิญญาณ - ปกติ" = IMMORTAL = แดง, 112005 "อเมทิสต์" = RARE = น้ำเงิน)

อ่านจาก CSV ที่ extract ไว้แล้ว ไม่ต้องมี UnityPy / ตัวเกม:
  agent/extracted/tables/ItemInfoData.txt   (ItemKey, ITEMTYPE, GRADE, ...)
  agent/extracted/tables/GradeInfoData.txt  (ลำดับเกรด COMMON..COSMIC)

รัน:  cd agent && python build_item_grades.py
"""
from __future__ import annotations

import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TABLES = os.path.join(HERE, "extracted", "tables")
OUT = os.path.join(HERE, "..", "lib", "game", "item-grade.generated.json")


def rows(name: str) -> list[dict]:
    with open(os.path.join(TABLES, name), encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


# ลำดับเกรด: COMMON=0 ... COSMIC=9 (ต้องตรงกับ ITEM_GRADES ใน lib/game/items.ts)
grade_index = {r["GRADE"]: i for i, r in enumerate(rows("GradeInfoData.txt"))}

out: dict[str, int] = {}
for r in rows("ItemInfoData.txt"):
    key = (r.get("ItemKey") or "").strip()
    if not key.isdigit():
        continue
    # อุปกรณ์ (class 3-6, คีย์ 6 หลัก) เข้ารหัสเกรดในคีย์อยู่แล้ว เว็บถอดเอง — ข้าม
    if len(key) == 6 and key[0] in ("3", "4", "5", "6"):
        continue
    g = grade_index.get((r.get("GRADE") or "").strip())
    if not g:  # ข้าม COMMON(0)/ไม่รู้จัก -> ฝั่งเว็บถือเป็น 0 (เทา) อยู่แล้ว
        continue
    out[key] = g

out = dict(sorted(out.items(), key=lambda kv: int(kv[0])))
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))

print(f"item-grade.generated.json: {len(out)} รายการ -> {os.path.normpath(OUT)}")
print("-- ตรวจตัวอย่าง (คาดหวัง 190001=4 IMMORTAL, 112005=2 RARE, 142002=2, 110001=0) --")
for k in ("190001", "190002", "190003", "190004", "112005", "142002", "126001", "110001"):
    print(f"  {k}: grade={out.get(k, 0)}")
