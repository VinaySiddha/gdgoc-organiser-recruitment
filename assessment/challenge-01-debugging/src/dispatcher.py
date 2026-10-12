from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class EventDispatcher:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.target_url = str(config.get("targetUrl", "https://example.com"))
        self.max_retries = int(config.get("maxRetries", 3))
        self.timeout_ms = int(config.get("timeoutMs", 1000))
        self.registration_store: Dict[str, Dict[str, Any]] = {}
        self.webhook_logs: List[Dict[str, Any]] = []

    def get_store(self) -> Dict[str, Dict[str, Any]]:
        return self.registration_store

    def get_logs(self) -> List[Dict[str, Any]]:
        return self.webhook_logs

    async def process_registration(self, payload: Dict[str, Any]) -> bool:
        if not isinstance(payload, dict):
            return False

        registration_id = payload.get("id")
        registered_at = payload.get("registeredAt")
        if not registration_id or not registered_at:
            return False

        try:
            parsed_time = self._parse_registered_at(registered_at)
        except ValueError:
            return False

        if not isinstance(payload.get("email"), str) or "@" not in payload["email"]:
            return False

        normalized = {**payload, "registeredAt": parsed_time.isoformat()}
        self.registration_store[str(registration_id)] = normalized

        try:
            await self.dispatch_webhook(str(registration_id))
            return True
        except Exception:
            return False

    def _parse_registered_at(self, value: Any) -> datetime:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("registeredAt must be a non-empty ISO 8601 string")

        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"

        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    async def dispatch_webhook(self, registration_id: str) -> None:
        record = self.registration_store.get(registration_id)
        if record is None:
            raise ValueError(f"Missing registration record: {registration_id}")

        attempts = 0
        delivered = False
        while attempts < self.max_retries and not delivered:
            attempts += 1
            try:
                await self._mock_network_send(self.target_url, record)
                delivered = True
                self.webhook_logs.append({"id": registration_id, "status": "DELIVERED", "attempts": attempts})
            except Exception:
                if attempts >= self.max_retries:
                    self.webhook_logs.append({"id": registration_id, "status": "FAILED", "attempts": attempts})
                    break
                await asyncio.sleep(min(0.25 * (2 ** (attempts - 1)), 1.0))

    async def _mock_network_send(self, url: str, data: Dict[str, Any]) -> None:
        await asyncio.sleep(max(0.01, self.timeout_ms / 1000 / 10))
        if hasattr(self, "_failures") and self._failures.get(data.get("id"), 0) > 0:
            self._failures[data["id"]] -= 1
            raise ConnectionError("503 Service Unavailable")
        if self.target_url and "example.com" in self.target_url and data.get("email") == "retry@svec.edu":
            pass
