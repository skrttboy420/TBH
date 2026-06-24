"""ดึงราคาตลาด Steam Community Market ของไอเทม TBH → lib/game/steam-prices.generated.json

ที่มา: ไอเทมเกมนี้ซื้อขายจริงบน Steam Market (appid 3678970) ราคาเป็นเงินบาท
(currency=14 = THB). เรารู้ของในกระเป๋าเป๊ะจากเซฟอยู่แล้ว จึงไม่ต้อง OCR ภาพ —
แค่ map ไอเทม -> market_hash_name แล้วแปะราคาเข้าไป (ดู lib/game/prices.ts)

market_hash_name:
  - วัตถุดิบ/พิเศษ : ชื่ออังกฤษล้วน           เช่น "Wood", "Minor Ruby"
  - อุปกรณ์        : "<ชื่อ> (<เกรด>) <variant>" เช่น "Bastard Sword (Immortal) A"
    (เฉพาะเกรด 3 = Legendary ขึ้นไป เกรดต่ำกว่านั้นเกมไม่ให้ขายในตลาด)

รายชื่อที่ดึงราคา = สหภาพของ (ก) ไอเทมที่มีคนตั้งขายในตลาดตอนนี้ (search render)
และ (ข) ของในกระเป๋าผู้เล่นจาก save_dump.json — เพื่อให้ของแพง ๆ ที่ไม่มีคนตั้งขาย
ตอนนี้ก็ยังได้ median จากประวัติการขาย

ผลลัพธ์ steam-prices.generated.json:
  { currency, appId, fetchedAt, count, prices: { <hash>: {lowest, median, volume} } }

ดึงสดทุกครั้งไม่ได้ Steam จะ rate-limit (429) — สคริปต์เว้นจังหวะ + ถอยเมื่อโดน 429
"""
from __future__ import annotations

import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

APP = 3678970
CURRENCY = 14  # THB
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
OUT = os.path.join(WEB, "lib", "game", "steam-prices.generated.json")
CATALOG = os.path.join(WEB, "lib", "game", "item-catalog.generated.json")
GRADES = os.path.join(WEB, "lib", "game", "item-grade.generated.json")
SAVE = os.path.join(HERE, "save_dump.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
DELAY = 1.6  # วินาทีต่อ request (กัน 429 ของ Steam)

GRADE_EN = [
    "Common", "Uncommon", "Rare", "Legendary", "Immortal",
    "Arcana", "Beyond", "Celestial", "Divine", "Cosmic",
]


def get(url: str, tries: int = 5):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 8 * (i + 1)
                print(f"  429 backoff {wait}s")
                time.sleep(wait)
                continue
            if i == tries - 1:
                print(f"  HTTP {e.code} {url[:80]}")
            time.sleep(3)
        except Exception as ex:  # noqa: BLE001
            if i == tries - 1:
                print(f"  ERR {ex}")
            time.sleep(3)
    return None


def money(s: str | None) -> float | None:
    if not s:
        return None
    m = re.sub(r"[^0-9.]", "", s)
    return float(m) if m else None


# ── item key -> market_hash_name (สะท้อน lib/game/items.ts + prices.ts) ──────────
def decode(k: int) -> tuple[int, int, int]:
    cls = k // 100000
    if len(str(k)) != 6 or cls < 3 or cls > 6:
        return k, 0, 0
    sub = (k // 10000) % 10
    csb = cls * 100000 + sub * 10000
    rem = k % 10000
    if rem < 1000:
        return k, 0, 0
    return csb + (rem % 1000) // 10, rem // 1000, rem % 10


def market_name(k: int, cat: dict, gm: dict) -> str | None:
    base, g, var = decode(k)
    cls = k // 100000
    e = cat.get(str(base))
    if not e or not e.get("en"):
        return None
    if cls in (1, 9):  # material / special : plain english name
        return e["en"]
    if g < 3:  # low-grade equipment is not tradable on the market
        return None
    letter = chr(ord("A") + max(var - 1, 0))
    return f"{e['en']} ({GRADE_EN[g]}) {letter}"


def owned_names() -> set[str]:
    if not (os.path.exists(SAVE) and os.path.exists(CATALOG)):
        return set()
    save = json.load(open(SAVE, encoding="utf-8"))
    cat = json.load(open(CATALOG, encoding="utf-8"))
    gm = json.load(open(GRADES, encoding="utf-8"))
    out: set[str] = set()
    for it in save.get("itemSaveDatas", []):
        n = market_name(int(it["ItemKey"]), cat, gm)
        if n:
            out.add(n)
    return out


def market_names() -> set[str]:
    names: set[str] = set()
    start, total = 0, 0
    while True:
        d = get(
            f"https://steamcommunity.com/market/search/render/"
            f"?appid={APP}&norender=1&currency={CURRENCY}&count=10&start={start}"
        )
        res = (d or {}).get("results") or []
        for r in res:
            names.add(r["hash_name"])
        total = (d or {}).get("total_count", 0)
        start += len(res)
        if not res or start >= total:
            break
        time.sleep(0.5)
    print(f"listed in market: {len(names)} / {total}")
    return names


def main() -> None:
    names = market_names()
    owned = owned_names()
    extra = owned - names
    print(f"owned items add {len(extra)} extra names")
    targets = sorted(names | owned)

    prices: dict[str, dict] = {}
    for i, hn in enumerate(targets):
        u = (
            f"https://steamcommunity.com/market/priceoverview/"
            f"?appid={APP}&currency={CURRENCY}&market_hash_name={urllib.parse.quote(hn)}"
        )
        d = get(u)
        if d and d.get("success"):
            vol = re.sub(r"[^0-9]", "", d.get("volume") or "0")
            prices[hn] = {
                "lowest": money(d.get("lowest_price")),
                "median": money(d.get("median_price")),
                "volume": int(vol or 0),
            }
        else:
            prices[hn] = {"lowest": None, "median": None, "volume": 0}
        if i % 15 == 0:
            print(f"  [{i+1}/{len(targets)}] {hn}: {prices[hn]}")
        time.sleep(DELAY)

    payload = {
        "currency": "THB",
        "appId": APP,
        "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "count": len(prices),
        "prices": prices,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=0)
    priced = sum(1 for v in prices.values() if v["median"] or v["lowest"])
    print(f"wrote {OUT}: {len(prices)} items ({priced} priced)")


if __name__ == "__main__":
    main()
