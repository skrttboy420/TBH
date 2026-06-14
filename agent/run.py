"""Entry point.

  python run.py          # start the agent (watch save, report, run commands)
  python run.py setup    # interactive configuration wizard
"""

import sys

# Thai log output must survive a redirected/piped stdout (Windows defaults to a
# legacy code page like cp874 that lacks some punctuation).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

from tbh_agent.runner import main as run_agent
from tbh_agent.setup_wizard import run_setup


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        return run_setup()
    return run_agent()


if __name__ == "__main__":
    raise SystemExit(main())
