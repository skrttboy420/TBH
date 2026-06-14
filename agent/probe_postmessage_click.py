"""Probe stage 2: send a background PostMessage left-click to the game window and
see if the Unity game reacts.

Target defaults to the PORTAL "องก์ 1" (Act 1) tab at client (1035, 522) — a
fully reversible view switch. Captures before/after and reports where the screen
changed so we can tell a real reaction from idle animation noise.

Usage: python probe_postmessage_click.py [x] [y]
"""
from __future__ import annotations

import sys
import time

import win32api
import win32con
import win32gui
from PIL import Image, ImageChops

from tbh_agent.config import load_config
from tbh_agent.control import find_window, capture_window


def _cap(hwnd, path):
    png, w, h = capture_window(hwnd)
    with open(path, "wb") as fh:
        fh.write(png)
    return Image.open(path).convert("RGB")


def main() -> int:
    x = int(sys.argv[1]) if len(sys.argv) > 1 else 1035
    y = int(sys.argv[2]) if len(sys.argv) > 2 else 522

    cfg = load_config()
    hwnd = find_window(cfg.window_title)
    if not hwnd:
        print("ไม่พบหน้าต่างเกม")
        return 1

    # Show child windows too — some Unity builds receive input on a child surface.
    children: list[int] = []
    win32gui.EnumChildWindows(hwnd, lambda h, _: children.append(h), None)
    print("hwnd =", hwnd, "children =", children[:10], "class =", repr(win32gui.GetClassName(hwnd)))

    before = _cap(hwnd, "_before2.png")

    lparam = win32api.MAKELONG(x, y)
    print(f"posting MOUSEMOVE/LBUTTONDOWN/LBUTTONUP at client ({x},{y}) lParam={lparam:#010x}")
    r1 = win32gui.PostMessage(hwnd, win32con.WM_MOUSEMOVE, 0, lparam)
    time.sleep(0.05)
    r2 = win32gui.PostMessage(hwnd, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, lparam)
    time.sleep(0.06)
    r3 = win32gui.PostMessage(hwnd, win32con.WM_LBUTTONUP, 0, lparam)
    print("PostMessage returns (move,down,up) =", (r1, r2, r3))

    time.sleep(0.8)
    after = _cap(hwnd, "_after.png")

    diff = ImageChops.difference(before, after)
    bbox = diff.getbbox()
    # crude magnitude: count pixels that changed meaningfully
    gray = diff.convert("L")
    hist = gray.histogram()
    changed = sum(hist[20:])  # pixels with >~8% delta
    total = before.size[0] * before.size[1]
    print(f"diff bbox = {bbox}")
    print(f"changed pixels (>~8% delta) = {changed:,} / {total:,} ({100*changed/total:.2f}%)")
    print("saved _before2.png and _after.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
