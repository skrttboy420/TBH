"""Probe: does this Unity game accept background PostMessage mouse input?

Stage 1 (this run): capture the game window + print window/client geometry so we
can pick a safe click target and convert screenshot pixels -> client coords.
"""
from __future__ import annotations

import sys

import win32gui

from tbh_agent.config import load_config
from tbh_agent.control import find_window, capture_window


def main() -> int:
    cfg = load_config()
    hwnd = find_window(cfg.window_title)
    if not hwnd:
        print("ไม่พบหน้าต่างเกม")
        return 1
    print("hwnd =", hwnd, "title =", repr(win32gui.GetWindowText(hwnd)))

    wl, wt, wr, wb = win32gui.GetWindowRect(hwnd)
    cl, ct, cr, cb = win32gui.GetClientRect(hwnd)
    cx0, cy0 = win32gui.ClientToScreen(hwnd, (0, 0))
    print("window rect =", (wl, wt, wr, wb), "size =", (wr - wl, wb - wt))
    print("client size =", (cr - cl, cb - ct))
    print("client origin on screen =", (cx0, cy0))
    print("client offset within window (dx,dy) =", (cx0 - wl, cy0 - wt))

    png, w, h = capture_window(hwnd)
    with open("_before.png", "wb") as fh:
        fh.write(png)
    print("saved _before.png  capture size =", (w, h))
    return 0


if __name__ == "__main__":
    sys.exit(main())
