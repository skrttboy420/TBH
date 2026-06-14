"""HTTP client for the TBH Companion web API (agent endpoints).

Every response is the `{success, data} | {success, error}` envelope; `_unwrap`
returns `data` on success and raises `ApiError` (with the Thai server message)
otherwise. Auth is the `Agent-Token` header on a shared session.
"""

from __future__ import annotations

from typing import Any

import requests


class ApiError(RuntimeError):
    pass


class Api:
    def __init__(self, base_url: str, token: str, timeout: float = 20.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({"Agent-Token": token})

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _send(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        """One HTTP call; transient network failures (connection reset, timeout,
        DNS, server restart) become ApiError so the agent loop can log-and-continue
        instead of crashing."""
        try:
            return self._session.request(
                method, self._url(path), timeout=self.timeout, **kwargs
            )
        except requests.exceptions.RequestException as e:
            raise ApiError(f"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {e}") from e

    def _unwrap(self, resp: requests.Response) -> Any:
        try:
            body = resp.json()
        except ValueError:
            raise ApiError(f"คำตอบจากเซิร์ฟเวอร์ไม่ใช่ JSON (HTTP {resp.status_code})")
        if isinstance(body, dict) and body.get("success") is True:
            return body.get("data")
        msg = "ไม่ทราบสาเหตุ"
        if isinstance(body, dict) and isinstance(body.get("error"), dict):
            msg = body["error"].get("message") or msg
        raise ApiError(f"{msg} (HTTP {resp.status_code})")

    def heartbeat(self, **payload: Any) -> dict:
        resp = self._send("POST", "/api/v1/agent/heartbeat", json=payload)
        return self._unwrap(resp)

    def send_save(
        self,
        save: dict,
        loot: list[dict] | None = None,
        activity: list[dict] | None = None,
    ) -> dict:
        payload: dict[str, Any] = {"save": save}
        if loot:
            payload["loot"] = loot
        if activity:
            payload["activity"] = activity
        resp = self._send("POST", "/api/v1/agent/save-state", json=payload)
        return self._unwrap(resp)

    def get_commands(self) -> list[dict]:
        resp = self._send("GET", "/api/v1/agent/commands")
        data = self._unwrap(resp)
        return data.get("commands", []) if isinstance(data, dict) else []

    def update_command(
        self,
        command_id: str,
        status: str,
        result: dict | None = None,
        error: str | None = None,
    ) -> dict:
        payload: dict[str, Any] = {"status": status}
        if result is not None:
            payload["result"] = result
        if error is not None:
            payload["error"] = error
        resp = self._send(
            "PATCH", f"/api/v1/agent/commands/{command_id}", json=payload
        )
        return self._unwrap(resp)

    def upload_screenshot(
        self,
        image_bytes: bytes,
        command_id: str | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> dict:
        files = {"file": ("screenshot.png", image_bytes, "image/png")}
        data: dict[str, str] = {}
        if command_id:
            data["commandId"] = command_id
        if width:
            data["width"] = str(width)
        if height:
            data["height"] = str(height)
        # No explicit Content-Type: requests sets the multipart boundary.
        resp = self._send(
            "POST", "/api/v1/agent/screenshots", files=files, data=data
        )
        return self._unwrap(resp)
