"""Game-window control: find/focus the window, screenshot it, send hotkeys.

Windows-only (win32gui + Pillow + keyboard). Farm start/stop is driven by
*configurable hotkeys* — the in-game binding varies per setup, so set them in
config.json under `controls`. Screenshot works without any hotkey.
"""

from __future__ import annotations

import io
import sys
from typing import Optional

from .config import Config


class ControlError(RuntimeError):
    pass


def _require_windows() -> None:
    if sys.platform != "win32":
        raise ControlError("ฟีเจอร์ควบคุมหน้าต่างรองรับเฉพาะ Windows")


def find_window(title_substr: str) -> Optional[int]:
    _require_windows()
    import win32gui

    needle = (title_substr or "").lower()
    matches: list[int] = []

    def _cb(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd):
            return
        text = win32gui.GetWindowText(hwnd)
        if text and needle in text.lower():
            matches.append(hwnd)

    win32gui.EnumWindows(_cb, None)
    return matches[0] if matches else None


def focus_window(hwnd: int) -> None:
    _require_windows()
    import win32con
    import win32gui

    try:
        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.SetForegroundWindow(hwnd)
    except Exception:
        # Foreground lock can reject SetForegroundWindow — best-effort fallback.
        try:
            win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
            win32gui.BringWindowToTop(hwnd)
        except Exception:
            pass


def _encode_png(img) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def capture_window(hwnd: int) -> tuple[bytes, int, int]:
    """Capture the game window's own pixels via PrintWindow.

    The game renders as a transparent taskbar overlay, so the old
    "focus + grab screen rectangle" approach captured whatever happened to be
    on top (e.g. another app) instead of the game. PrintWindow renders the
    target HWND's content into an off-screen bitmap regardless of z-order, so it
    works without bringing the game to the foreground. Falls back to a screen
    grab if PrintWindow is unavailable.
    """
    _require_windows()
    import win32gui

    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width, height = max(1, right - left), max(1, bottom - top)

    try:
        import win32ui
        from ctypes import windll
        from PIL import Image

        hwnd_dc = win32gui.GetWindowDC(hwnd)
        mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
        save_dc = mfc_dc.CreateCompatibleDC()
        bmp = win32ui.CreateBitmap()
        bmp.CreateCompatibleBitmap(mfc_dc, width, height)
        save_dc.SelectObject(bmp)
        # PW_RENDERFULLCONTENT (0x2) captures DWM/hardware-accelerated content.
        ok = windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 2)
        info = bmp.GetInfo()
        bits = bmp.GetBitmapBits(True)
        img = Image.frombuffer(
            "RGB", (info["bmWidth"], info["bmHeight"]), bits, "raw", "BGRX", 0, 1
        )
        win32gui.DeleteObject(bmp.GetHandle())
        save_dc.DeleteDC()
        mfc_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, hwnd_dc)
        if ok == 1:
            return _encode_png(img), width, height
    except Exception:
        pass  # fall through to screen-grab fallback

    from PIL import ImageGrab

    focus_window(hwnd)
    img = ImageGrab.grab(bbox=(left, top, right, bottom))
    return _encode_png(img), width, height


class Control:
    def __init__(self, cfg: Config):
        self.cfg = cfg

    def _hwnd(self) -> int:
        hwnd = find_window(self.cfg.window_title)
        if not hwnd:
            raise ControlError(
                f"ไม่พบหน้าต่างเกม (ค้นหาคำว่า '{self.cfg.window_title}') — "
                "เปิดเกมไว้ หรือแก้ windowTitle ใน config.json"
            )
        return hwnd

    def screenshot(self) -> tuple[bytes, int, int]:
        return capture_window(self._hwnd())

    def _send_hotkey(self, hotkey: str, what: str) -> None:
        if not hotkey:
            raise ControlError(f"ยังไม่ได้ตั้งปุ่มลัดสำหรับ{what} (controls ใน config.json)")
        _require_windows()
        import keyboard

        focus_window(self._hwnd())
        keyboard.send(hotkey)

    def start_farm(self) -> None:
        self._send_hotkey(self.cfg.controls.start_farm_hotkey, "เริ่มฟาร์ม")

    def stop_farm(self) -> None:
        self._send_hotkey(self.cfg.controls.stop_farm_hotkey, "หยุดฟาร์ม")
