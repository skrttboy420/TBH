"""Agent configuration: load/save `config.json` and locate the game save file.

Accepts both camelCase (matching `config.example.json`) and snake_case keys so a
hand-edited config never silently loses a setting.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

# %USERPROFILE%/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3
DEFAULT_SAVE_RELATIVE = Path(
    "AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3"
)
CONFIG_FILENAME = "config.json"


def default_save_path() -> str:
    return str(Path(os.path.expanduser("~")) / DEFAULT_SAVE_RELATIVE)


def _pick(d: dict, *names: str, default=None):
    for n in names:
        if n in d and d[n] is not None:
            return d[n]
    return default


@dataclass
class Controls:
    start_farm_hotkey: str = "f6"
    stop_farm_hotkey: str = "f7"

    @classmethod
    def from_dict(cls, d: dict) -> "Controls":
        return cls(
            start_farm_hotkey=_pick(d, "startFarmHotkey", "start_farm_hotkey", default="f6"),
            stop_farm_hotkey=_pick(d, "stopFarmHotkey", "stop_farm_hotkey", default="f7"),
        )

    def to_dict(self) -> dict:
        return {
            "startFarmHotkey": self.start_farm_hotkey,
            "stopFarmHotkey": self.stop_farm_hotkey,
        }


@dataclass
class Config:
    api_base_url: str = ""
    agent_token: str = ""
    save_path: str = ""  # empty → auto-detect
    window_title: str = "Taskbar Hero"
    poll_interval_seconds: float = 15.0
    heartbeat_interval_seconds: float = 30.0
    screenshot_on_status: bool = False
    controls: Controls = field(default_factory=Controls)

    def resolved_save_path(self) -> str:
        return self.save_path or default_save_path()

    def is_ready(self) -> bool:
        return bool(self.api_base_url and self.agent_token)

    @classmethod
    def from_dict(cls, d: dict) -> "Config":
        base = str(_pick(d, "apiBaseUrl", "api_base_url", default="")).rstrip("/")
        return cls(
            api_base_url=base,
            agent_token=_pick(d, "agentToken", "agent_token", default=""),
            save_path=_pick(d, "savePath", "save_path", default=""),
            window_title=_pick(d, "windowTitle", "window_title", default="Taskbar Hero"),
            poll_interval_seconds=float(_pick(d, "pollIntervalSeconds", "poll_interval_seconds", default=15)),
            heartbeat_interval_seconds=float(
                _pick(d, "heartbeatIntervalSeconds", "heartbeat_interval_seconds", default=30)
            ),
            screenshot_on_status=bool(_pick(d, "screenshotOnStatus", "screenshot_on_status", default=False)),
            controls=Controls.from_dict(_pick(d, "controls", default={}) or {}),
        )

    def to_dict(self) -> dict:
        return {
            "apiBaseUrl": self.api_base_url,
            "agentToken": self.agent_token,
            "savePath": self.save_path,
            "windowTitle": self.window_title,
            "pollIntervalSeconds": self.poll_interval_seconds,
            "heartbeatIntervalSeconds": self.heartbeat_interval_seconds,
            "screenshotOnStatus": self.screenshot_on_status,
            "controls": self.controls.to_dict(),
        }


def config_path() -> Path:
    """`config.json` lives at the agent project root (parent of this package)."""
    return Path(__file__).resolve().parent.parent / CONFIG_FILENAME


def load_config(path: Path | None = None) -> Config:
    p = path or config_path()
    if not p.exists():
        return Config()
    with open(p, "r", encoding="utf-8") as fh:
        return Config.from_dict(json.load(fh))


def save_config(cfg: Config, path: Path | None = None) -> None:
    p = path or config_path()
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(cfg.to_dict(), fh, ensure_ascii=False, indent=2)
