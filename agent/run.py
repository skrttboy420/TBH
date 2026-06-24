"""Entry point.

  ดับเบิลคลิก .exe (หรือ `python run.py`)  → ตั้งค่าครั้งแรกอัตโนมัติ แล้วเริ่มเอเจนต์
  python run.py quickstart                → ตั้งค่าแบบเร็ว (ใส่แค่โทเค็น)
  python run.py setup                     → ตัวช่วยตั้งค่าแบบเต็ม (URL/พาธ/ปุ่มลัด)
"""

import sys

# Thai log output must survive a redirected/piped stdout (Windows defaults to a
# legacy code page like cp874 that lacks some punctuation).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

from tbh_agent.config import load_config
from tbh_agent.quickstart import run_quickstart
from tbh_agent.runner import main as run_agent
from tbh_agent.setup_wizard import run_setup


def _pause_if_frozen() -> None:
    """When launched by double-clicking the packaged .exe the console closes the
    instant we return — hold it open so the user can read the final message."""
    if getattr(sys, "frozen", False):
        try:
            input("\nกด Enter เพื่อปิดหน้าต่าง…")
        except EOFError:
            pass


def main() -> int:
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else ""

    if arg == "setup":
        return run_setup()
    if arg == "quickstart":
        return run_quickstart()

    # No argument — the normal "just run me" path (this is what a double-click
    # hits). If this machine has never been set up, walk the player through the
    # one-question quickstart first, then fall straight into the agent loop.
    if not load_config().is_ready():
        if run_quickstart() != 0:
            _pause_if_frozen()
            return 1

    code = run_agent()
    if code != 0:
        _pause_if_frozen()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
