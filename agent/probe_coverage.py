"""เทียบ itemKey จริงในเซฟ กับชื่อที่ดึงมา (extracted/item_names.json)

เพื่อดูว่าครอบคลุมแค่ไหน และคีย์อุปกรณ์ (เช่น 322051) มีโครงสร้างยังไง
"""
from __future__ import annotations

import json
from collections import Counter

from tbh_agent.config import load_config
from tbh_agent.es3 import read_player_save

cfg = load_config()
player = read_player_save(cfg.resolved_save_path())

items = player.get("itemSaveDatas", []) or []
keys = [int(it.get("ItemKey", 0)) for it in items]
counts = Counter(keys)
print(f"item instances ทั้งหมด: {len(items)}  |  distinct itemKey: {len(counts)}")

with open("extracted/item_names.json", encoding="utf-8") as fh:
    names = json.load(fh)

covered = sorted(k for k in counts if str(k) in names)
missing = sorted(k for k in counts if str(k) not in names)
print(f"มีชื่อแล้ว: {len(covered)}  |  ยังไม่มีชื่อ: {len(missing)}")
print("missing (distinct):", missing[:60])

# ดูโครงสร้างไอเทมตัวที่ยังไม่มีชื่อ (น่าจะเป็นอุปกรณ์)
if missing:
    mk = missing[0]
    sample = next(it for it in items if int(it.get("ItemKey", 0)) == mk)
    print(f"\nตัวอย่างไอเทม itemKey={mk} (ยังไม่มีชื่อ):")
    print(json.dumps(sample, ensure_ascii=False, indent=2)[:1200])

# คีย์ในตารางชื่อ ที่ขึ้นต้นด้วย 32 / 30 / 40 (กลุ่มอุปกรณ์)
for pre in ("30", "32", "40", "60"):
    sub = sorted(int(k) for k in names if k.startswith(pre))
    print(f"\nชื่อที่คีย์ขึ้นต้น {pre!r} ({len(sub)}):", sub[:25])
    for k in sub[:4]:
        print(f"   {k}: {names[str(k)]}")
