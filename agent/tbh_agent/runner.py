"""Main agent loop: watch the save → diff → report; heartbeat; run commands."""

from __future__ import annotations

import json
import os
import platform
import socket
import time
from pathlib import Path
from typing import Optional

from . import __version__
from .api import Api, ApiError
from .config import Config, app_dir, load_config
from .control import Control
from .diff import diff_saves
from .es3 import read_player_save
from .save_reader import parse_save

STATE_FILENAME = "state.json"


def _state_path() -> Path:
    return app_dir() / STATE_FILENAME


def _load_prev() -> Optional[dict]:
    p = _state_path()
    if not p.exists():
        return None
    try:
        with open(p, "r", encoding="utf-8") as fh:
            return json.load(fh).get("save")
    except (OSError, ValueError):
        return None


def _save_prev(parsed: dict) -> None:
    try:
        with open(_state_path(), "w", encoding="utf-8") as fh:
            json.dump({"save": parsed}, fh, ensure_ascii=False)
    except OSError:
        pass


def _log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


class Runner:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.api = Api(cfg.api_base_url, cfg.agent_token)
        self.control = Control(cfg)
        self.prev: Optional[dict] = _load_prev()
        self.last_mtime: Optional[float] = None
        self.status = "online"
        self._handled: set[str] = set()

    # ── save handling ─────────────────────────────────────────────────────────
    def check_save(self, force: bool = False) -> Optional[dict]:
        path = self.cfg.resolved_save_path()
        if not os.path.exists(path):
            _log(f"ไม่พบไฟล์เซฟ: {path}")
            return None
        mtime = os.path.getmtime(path)
        if not force and self.last_mtime is not None and mtime == self.last_mtime:
            return None
        self.last_mtime = mtime

        try:
            curr = parse_save(read_player_save(path))
        except Exception as e:  # decrypt / parse failure — don't crash the loop
            _log(f"อ่านเซฟไม่สำเร็จ: {e}")
            return None

        unchanged = self.prev is not None and self.prev.get("saveHash") == curr.get("saveHash")
        if unchanged and not force:
            return curr

        loot, activity = ([], []) if unchanged else diff_saves(self.prev, curr)
        try:
            self.api.send_save(curr, loot=loot, activity=activity)
            _log(
                f"ส่งเซฟแล้ว · ทอง={curr['gold']:,} · ของดรอป={len(loot)} · กิจกรรม={len(activity)}"
            )
        except ApiError as e:
            _log(f"ส่งเซฟไม่สำเร็จ: {e}")
            return curr

        if not unchanged:
            self.prev = curr
            _save_prev(curr)
        return curr

    # ── commands ───────────────────────────────────────────────────────────────
    def _dispatch(self, name: str, params: dict, command_id: str) -> dict:
        if name == "GET_STATUS":
            return {
                "status": self.status,
                "savePath": self.cfg.resolved_save_path(),
                "lastHash": self.prev.get("saveHash") if self.prev else None,
                "agentVersion": __version__,
            }
        if name == "READ_SAVE":
            curr = self.check_save(force=True)
            return {"ok": curr is not None, "saveHash": curr.get("saveHash") if curr else None}
        if name == "TAKE_SCREENSHOT":
            img, w, h = self.control.screenshot()
            self.api.upload_screenshot(img, command_id=command_id, width=w, height=h)
            return {"ok": True, "width": w, "height": h}
        if name == "START_FARM":
            self.control.start_farm()
            self.status = "farming"
            return {"ok": True}
        if name == "STOP_FARM":
            self.control.stop_farm()
            self.status = "online"
            return {"ok": True}
        raise ValueError(f"ไม่รู้จักคำสั่ง {name}")

    def process_command(self, cmd: dict) -> None:
        cid = str(cmd.get("id"))
        name = str(cmd.get("command"))
        params = cmd.get("params") or {}
        if not cid or cid in self._handled:
            return
        self._handled.add(cid)
        _log(f"คำสั่ง {name} ({cid[:8]})")

        try:
            self.api.update_command(cid, "acknowledged")
        except ApiError:
            pass
        try:
            result = self._dispatch(name, params, cid)
            self.api.update_command(cid, "completed", result=result)
            _log("  → สำเร็จ")
        except Exception as e:
            try:
                self.api.update_command(cid, "failed", error=str(e))
            except ApiError:
                pass
            _log(f"  → ล้มเหลว: {e}")

    # ── heartbeat ───────────────────────────────────────────────────────────────
    def heartbeat(self, activity: list[dict] | None = None) -> None:
        try:
            resp = self.api.heartbeat(
                status=self.status,
                agentVersion=__version__,
                hostname=socket.gethostname(),
                platform=platform.platform(),
                **({"activity": activity} if activity else {}),
            )
        except ApiError as e:
            _log(f"heartbeat ไม่สำเร็จ: {e}")
            return
        for cmd in resp.get("commands", []) or []:
            self.process_command(cmd)

    # ── loop ─────────────────────────────────────────────────────────────────────
    def run(self) -> None:
        _log(f"TBH Companion Agent v{__version__}")
        _log(f"เซิร์ฟเวอร์: {self.cfg.api_base_url}")
        _log(f"ไฟล์เซฟ: {self.cfg.resolved_save_path()}")

        self.heartbeat(activity=[{"type": "agent_online", "title": "เอเจนต์ออนไลน์"}])

        next_save = 0.0
        next_hb = time.monotonic() + self.cfg.heartbeat_interval_seconds
        try:
            while True:
                try:
                    now = time.monotonic()
                    if now >= next_save:
                        self.check_save()
                        next_save = time.monotonic() + self.cfg.poll_interval_seconds
                    if now >= next_hb:
                        self.heartbeat()
                        next_hb = time.monotonic() + self.cfg.heartbeat_interval_seconds
                except Exception as e:  # never let one bad tick kill the agent
                    _log(f"ข้อผิดพลาดในรอบทำงาน (ข้ามไปก่อน): {e}")
                    next_save = time.monotonic() + self.cfg.poll_interval_seconds
                    next_hb = time.monotonic() + self.cfg.heartbeat_interval_seconds
                time.sleep(1.0)
        except KeyboardInterrupt:
            _log("กำลังปิดเอเจนต์…")
            try:
                # status enum doesn't allow "offline" (server derives that from
                # last_seen) — just log the activity.
                self.api.heartbeat(
                    activity=[{"type": "agent_offline", "title": "เอเจนต์ออฟไลน์"}]
                )
            except ApiError:
                pass


def main() -> int:
    cfg = load_config()
    if not cfg.is_ready():
        _log("ยังไม่ได้ตั้งค่า — รัน `python run.py setup` หรือแก้ config.json ก่อน")
        return 1
    Runner(cfg).run()
    return 0
