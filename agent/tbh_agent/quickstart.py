"""Token-only quickstart for non-technical players.

The server URL is baked in (`config.DEFAULT_API_BASE_URL`) and the save file is
auto-detected, so the only thing a player must provide is the agent token shown
once on the website's "เครื่องเอเจนต์" (Agents) page. Designed to run on a plain
double-click of the packaged .exe — no command line, no editing JSON.
"""

from __future__ import annotations

import os

from .api import Api, ApiError
from .config import DEFAULT_API_BASE_URL, config_path, load_config, save_config


def _looks_like_token(s: str) -> bool:
    return s.startswith("tbh_") and len(s) >= 8


def run_quickstart() -> int:
    print("=== TBH Companion — ตั้งค่าเริ่มต้น (ทำครั้งเดียว) ===\n")
    print('แค่ "วางโทเค็น" ของเครื่องนี้ แล้วเริ่มใช้งานได้เลย\n')
    print("วิธีหาโทเค็น:")
    print("  1) เปิดเว็บแล้วเข้าสู่ระบบด้วยบัญชีตัวเอง")
    print('  2) ไปหน้า "เครื่องเอเจนต์" → กด "เพิ่มเครื่อง"')
    print("  3) คัดลอกโทเค็นที่ขึ้นต้นด้วย tbh_ (แสดงครั้งเดียว!)\n")

    cfg = load_config()
    if not cfg.api_base_url:
        cfg.api_base_url = DEFAULT_API_BASE_URL
    print(f"เซิร์ฟเวอร์: {cfg.api_base_url}\n")

    # Retry until the token connects, or the player gives up with a blank line.
    while True:
        token = input("วางโทเค็น (tbh_…) แล้วกด Enter: ").strip()
        if not token:
            print("\n⚠ ยังไม่ได้ใส่โทเค็น — ยกเลิกก่อน เปิดโปรแกรมใหม่แล้วลองอีกครั้งได้")
            return 1
        if not _looks_like_token(token):
            print('  ⚠ ปกติโทเค็นจะขึ้นต้นด้วย "tbh_" — เช็กว่าคัดลอกครบไหม (ลองใหม่ได้)')
        cfg.agent_token = token

        # Save-file auto-detect is informational; the agent retries on its own.
        resolved = cfg.resolved_save_path()
        if os.path.exists(resolved):
            print("  ✓ พบไฟล์เซฟเกมอัตโนมัติ")
        else:
            print("  ⚠ ยังไม่พบไฟล์เซฟ — เปิดเกมสัก 1 ครั้งให้มันสร้างเซฟก่อนก็ได้")

        print("  กำลังทดสอบการเชื่อมต่อ…")
        try:
            resp = Api(cfg.api_base_url, cfg.agent_token).heartbeat(
                status="online", agentVersion="quickstart"
            )
        except ApiError as e:
            print(f"  ✗ เชื่อมต่อไม่สำเร็จ: {e}")
            print("    เช็กว่าโทเค็นถูกต้องและอินเทอร์เน็ตใช้ได้ แล้ววางใหม่อีกครั้ง\n")
            continue

        save_config(cfg)
        name = (resp.get("agent") or {}).get("name", "?")
        print(f"  ✓ เชื่อมต่อสำเร็จ — เครื่อง: {name}")
        print(f"\nบันทึกการตั้งค่าแล้วที่ {config_path()}")
        print("กำลังเริ่มทำงานให้อัตโนมัติ — เปิดหน้าต่างนี้ค้างไว้ระหว่างเล่น\n")
        return 0
