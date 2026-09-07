# dispatcher.py - Fixed & Hardened Implementation
# Eliminates shared mutable instance state, parses ISO-8601 timestamps, implements exponential backoff

import asyncio
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable, Any

class EventDispatcher:
    def __init__(
        self,
        target_url: str,
        max_retries: int = 3,
        timeout_sec: float = 5.0,
        initial_backoff_sec: float = 0.05,
        backoff_factor: float = 2.0,
        custom_network_sender: Optional[Callable[[str, Dict[str, Any]], Any]] = None,
        custom_sleep_fn: Optional[Callable[[float], Any]] = None
    ):
        self.target_url = target_url
        self.max_retries = max(1, max_retries)
        self.timeout_sec = timeout_sec
        self.initial_backoff_sec = initial_backoff_sec
        self.backoff_factor = backoff_factor
        
        # Storage is keyed by registration ID; no shared activeContext across concurrent requests
        self.registration_store: Dict[str, Dict[str, Any]] = {}
        self.webhook_logs: List[Dict[str, Any]] = []
        
        self._network_sender = custom_network_sender or self._default_mock_network_send
        self._sleep_fn = custom_sleep_fn or asyncio.sleep

    @staticmethod
    def is_valid_iso8601(date_str: str) -> bool:
        """Validates ISO-8601 timestamp string including full timezone offsets (+HH:MM, -HH:MM, Z)."""
        if not date_str or not isinstance(date_str, str):
            return False
        # Normalize trailing Z for fromisoformat compatibility in Python 3.10+
        iso_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$'
        if not re.match(iso_pattern, date_str):
            return False
        try:
            norm_str = date_str.replace("Z", "+00:00")
            datetime.fromisoformat(norm_str)
            return True
        except Exception:
            return False

    def validate_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validates input registration payload."""
        if not payload or not isinstance(payload, dict):
            return {"valid": False, "error": "Missing registration payload"}
        
        for field in ["id", "name", "email", "eventId", "registeredAt"]:
            if field not in payload or not str(payload[field]).strip():
                return {"valid": False, "error": f"Missing or empty field: {field}"}
        
        if "@" not in str(payload["email"]):
            return {"valid": False, "error": "Invalid email address"}
        
        if not self.is_valid_iso8601(payload["registeredAt"]):
            return {"valid": False, "error": f"Invalid ISO-8601 timestamp: {payload['registeredAt']}"}
        
        return {"valid": True}

    async def process_registration(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes an incoming event registration safely.
        Every request operates on local lexical scope without shared mutable context.
        """
        validation = self.validate_payload(payload)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}

        # Request-local record creation
        local_record = {
            "id": str(payload["id"]).strip(),
            "name": str(payload["name"]).strip(),
            "email": str(payload["email"]).strip().lower(),
            "eventId": str(payload["eventId"]).strip(),
            "registeredAt": str(payload["registeredAt"]).strip(),
        }

        # Persist safely
        self.registration_store[local_record["id"]] = local_record

        # Managed asynchronous webhook dispatch with lifecycle tracking
        await self.dispatch_webhook(local_record)

        return {"success": True, "registration_id": local_record["id"]}

    async def dispatch_webhook(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches webhook with exponential backoff retry logic."""
        reg_id = record["id"]
        attempts = 0
        delivered = False
        last_error = ""

        while attempts < self.max_retries and not delivered:
            attempts += 1
            try:
                await self._network_sender(self.target_url, record)
                delivered = True
                entry = {
                    "id": reg_id,
                    "status": "DELIVERED",
                    "attempts": attempts,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                self.webhook_logs.append(entry)
                return entry
            except Exception as e:
                last_error = str(e) or "Network error"
                if attempts < self.max_retries:
                    delay = self.initial_backoff_sec * (self.backoff_factor ** (attempts - 1))
                    await self._sleep_fn(delay)

        failed_entry = {
            "id": reg_id,
            "status": "FAILED",
            "attempts": attempts,
            "error": last_error,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.webhook_logs.append(failed_entry)
        return failed_entry

    async def _default_mock_network_send(self, url: str, data: Dict[str, Any]) -> None:
        await self._sleep_fn(0.01)
        # default simulated send

    def get_store(self) -> Dict[str, Dict[str, Any]]:
        return dict(self.registration_store)

    def get_logs(self) -> List[Dict[str, Any]]:
        return list(self.webhook_logs)

    def clear(self) -> None:
        self.registration_store.clear()
        self.webhook_logs.clear()
