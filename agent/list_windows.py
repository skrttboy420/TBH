"""ลิสต์หน้าต่างที่มองเห็นได้ทั้งหมด พร้อม PID และพาธโปรแกรม

ใช้สำหรับค้นหา "ชื่อหน้าต่างเกม" จริง ๆ เพื่อตั้งค่า windowTitle ใน config.json
และหาพาธที่ติดตั้งเกม (เอาไว้ดึงข้อมูลไอเทม/ไอคอน)

วิธีใช้:  python list_windows.py
"""
from __future__ import annotations

import win32api
import win32con
import win32gui
import win32process


def exe_path(pid: int) -> str:
    for access in (
        win32con.PROCESS_QUERY_INFORMATION | win32con.PROCESS_VM_READ,
        0x1000,  # PROCESS_QUERY_LIMITED_INFORMATION
    ):
        try:
            handle = win32api.OpenProcess(access, False, pid)
        except Exception:
            continue
        try:
            return win32process.GetModuleFileNameEx(handle, 0)
        except Exception:
            pass
        finally:
            win32api.CloseHandle(handle)
    return "<unknown>"


def main() -> None:
    rows: list[tuple[int, str, str]] = []

    def callback(hwnd: int, _: object) -> None:
        if not win32gui.IsWindowVisible(hwnd):
            return
        title = win32gui.GetWindowText(hwnd)
        if not title.strip():
            return
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        rows.append((pid, title, exe_path(pid)))

    win32gui.EnumWindows(callback, None)
    rows.sort(key=lambda row: row[2].lower())

    print(f"พบหน้าต่างที่มองเห็นได้ {len(rows)} รายการ:\n")
    for pid, title, path in rows:
        print(f"[{pid}] {title!r}")
        print(f"      {path}")


if __name__ == "__main__":
    main()
