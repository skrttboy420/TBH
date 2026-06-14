"""จับภาพหน้าต่างเกม TaskBarHero ออกมาเป็น PNG เพื่อดู UI (ใช้ออกแบบการควบคุม)

วิธีใช้:  python capture_game.py
"""
from __future__ import annotations

import win32gui

from tbh_agent.config import load_config
from tbh_agent.control import capture_window, find_window


def main() -> None:
    cfg = load_config()
    title = cfg.window_title
    hwnd = find_window(title)
    print(f"windowTitle ที่ตั้งไว้: {title!r}")
    if not hwnd:
        print("ไม่พบหน้าต่างเกม")
        return
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    print(f"hwnd={hwnd}  rect=({left},{top},{right},{bottom})  size={right-left}x{bottom-top}")

    png, w, h = capture_window(hwnd)
    out = "game_capture.png"
    with open(out, "wb") as fh:
        fh.write(png)
    print(f"บันทึก {out} แล้ว ({w}x{h}, {len(png)} bytes)")


if __name__ == "__main__":
    main()
