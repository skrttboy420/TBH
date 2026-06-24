"""เติม buyOrder (ราคารับซื้อสูงสุด = ราคาขายได้จริงทันที) ให้เฉพาะไอเทมที่ผู้เล่นมี
ลงใน lib/game/steam-prices.generated.json โดยไม่ต้องดึง priceoverview ใหม่ทั้งหมด

รันหลัง fetch_steam_prices.py:  python augment_buy_orders.py
(แยกออกมาเพื่อความเร็ว — buy order ต้อง scrape item_nameid + histogram ทีละชิ้น)

หมายเหตุ: หน้า listing ของ Steam จะฝัง item_nameid/order book ให้เฉพาะตอน
"ล็อกอินแล้ว" เท่านั้น เปิดแบบไม่ล็อกอินจะได้หน้า "Sign In" ที่ไม่มีข้อมูล
ราคารับซื้อ — สคริปต์นี้จึงจะได้ buyOrder ก็ต่อเมื่อรันในสภาพแวดล้อมที่มี
cookie เซสชัน Steam (เช่นใส่ Cookie ใน UA ภายหลัง) ถ้าไม่มีจะได้ None ทั้งหมด
และ UI จะซ่อนเมตริก "ราคารับซื้อ" ให้เอง
"""
from __future__ import annotations

import json
import sys
import time

from fetch_steam_prices import OUT, DELAY, owned_names, buy_order_for

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main() -> None:
    with open(OUT, encoding="utf-8") as fh:
        data = json.load(fh)
    prices = data["prices"]

    owned = owned_names()
    targets = sorted(
        h for h in owned
        if prices.get(h) and (prices[h].get("lowest") or prices[h].get("median"))
    )
    print(f"buy-order augment for {len(targets)} owned items")

    for i, hn in enumerate(targets):
        bo = buy_order_for(hn)
        prices[hn]["buyOrder"] = bo
        print(f"  [{i + 1}/{len(targets)}] {hn}: {bo}")
        time.sleep(DELAY)

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=0)
    got = sum(1 for h in targets if prices[h].get("buyOrder") is not None)
    print(f"wrote {OUT}: buyOrder set on {got}/{len(targets)} owned items")


if __name__ == "__main__":
    main()
