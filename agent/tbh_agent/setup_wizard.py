"""Interactive first-time setup: writes config.json and tests the connection."""

from __future__ import annotations

import os

from .api import Api, ApiError
from .config import config_path, load_config, save_config


def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    return input(f"{label}{suffix}: ").strip() or default


def run_setup() -> int:
    print("=== ตั้งค่า TBH Companion Agent ===\n")
    cfg = load_config()

    cfg.api_base_url = _prompt(
        "URL เซิร์ฟเวอร์ (เช่น https://xxx.vercel.app)", cfg.api_base_url
    ).rstrip("/")
    cfg.agent_token = _prompt("Agent Token (ขึ้นต้นด้วย tbh_)", cfg.agent_token)

    cfg.save_path = _prompt("พาธไฟล์เซฟ (เว้นว่าง = ค้นหาอัตโนมัติ)", cfg.save_path)
    resolved = cfg.resolved_save_path()
    if os.path.exists(resolved):
        print(f"  ✓ พบไฟล์เซฟ: {resolved}")
    else:
        print(f"  ⚠ ยังไม่พบไฟล์เซฟที่: {resolved}")

    cfg.window_title = _prompt("ชื่อหน้าต่างเกม (บางส่วนก็ได้)", cfg.window_title)
    cfg.controls.start_farm_hotkey = _prompt(
        "ปุ่มลัด เริ่มฟาร์ม", cfg.controls.start_farm_hotkey
    )
    cfg.controls.stop_farm_hotkey = _prompt(
        "ปุ่มลัด หยุดฟาร์ม", cfg.controls.stop_farm_hotkey
    )

    save_config(cfg)
    print(f"\nบันทึกการตั้งค่าที่ {config_path()}")

    if cfg.is_ready():
        print("กำลังทดสอบการเชื่อมต่อ…")
        try:
            resp = Api(cfg.api_base_url, cfg.agent_token).heartbeat(
                status="online", agentVersion="setup"
            )
            name = (resp.get("agent") or {}).get("name", "?")
            print(f"  ✓ เชื่อมต่อสำเร็จ — เอเจนต์: {name}")
        except ApiError as e:
            print(f"  ✗ เชื่อมต่อไม่สำเร็จ: {e}")
            return 1
    else:
        print("⚠ ยังขาด URL หรือ Token — แก้ไขใน config.json ได้ภายหลัง")

    print("\nเสร็จแล้ว! เริ่มเอเจนต์ด้วยคำสั่ง: python run.py")
    return 0
