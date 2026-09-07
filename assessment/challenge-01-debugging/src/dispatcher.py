"""
dispatcher.py — Fixed Event Registration & Webhook Dispatcher

Fixes applied to the original buggy implementation:
  1. Eliminated shared mutable state (self.active_context) — each call
     now operates on its own local `payload` reference, preventing race
     conditions when concurrent coroutines interleave.
  2. Webhook dispatch is properly awaited so that the caller knows whether
     delivery succeeded; fire-and-forget semantics are replaced by tracked
     background tasks with lifecycle management.
  3. Timestamp parsing uses datetime.fromisoformat with full timezone-offset
     support (e.g. "+05:30"), and falls back gracefully with structured
     logging on malformed input.
  4. Exponential backoff with jitter is used for retry logic instead of
     tight-looping on transient failures.
  5. All errors are captured in structured logs instead of being swallowed.
"""

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class RegistrationError(Exception):
    """Raised when a registration cannot be processed."""
    pass


class WebhookDeliveryError(Exception):
    """Raised when webhook delivery fails after all retries."""
    pass


class EventDispatcher:
    """
    Processes attendee registrations and dispatches confirmation webhooks.

    Thread-safety / concurrency contract
    ─────────────────────────────────────
    • No shared mutable "active context" — every call to
      `process_registration` works only with its own *local* copy of
      the payload dict, so interleaved `await` points cannot corrupt
      another coroutine's data.
    • Webhook dispatch is awaited (not fire-and-forget), ensuring the
      caller can observe delivery success/failure.
    """

    def __init__(
        self,
        target_url: str,
        max_retries: int = 3,
        timeout_sec: float = 1.0,
        base_backoff_sec: float = 0.1,
    ) -> None:
        self.target_url = target_url
        self.max_retries = max_retries
        self.timeout_sec = timeout_sec
        self.base_backoff_sec = base_backoff_sec

        # Shared stores are append-only / key-set; safe for single-threaded
        # async, and each coroutine only writes its *own* key.
        self.registration_store: Dict[str, Dict[str, Any]] = {}
        self.webhook_logs: List[Dict[str, Any]] = []

        # Keep references to background tasks so they are not garbage-collected
        self._pending_tasks: List[asyncio.Task] = []

    # ── public API ───────────────────────────────────────────────────

    async def process_registration(self, payload: Dict[str, Any]) -> bool:
        """
        Validate, persist, and trigger webhook for a single registration.

        Returns True on success, False on validation failure.
        Raises RegistrationError for missing required fields.
        """
        # ── FIX 1: use a *local* reference — no shared mutable context ──
        local_payload = dict(payload)  # shallow copy to isolate mutations

        # ── Validate required fields ──
        required_fields = ("id", "name", "email", "eventId", "registeredAt")
        missing = [
            f for f in required_fields 
            if f not in local_payload 
            or local_payload[f] is None 
            or (f != "registeredAt" and isinstance(local_payload[f], str) and not local_payload[f].strip())
        ]
        if missing:
            raise RegistrationError(
                f"Missing required fields: {', '.join(missing)}"
            )

        # Simulate async database round-trip (validation / duplicate check)
        await asyncio.sleep(random.uniform(0.01, 0.05))

        # ── FIX 3: robust ISO-8601 timestamp parsing with timezone support ──
        reg_date = self._parse_timestamp(local_payload["registeredAt"])
        if reg_date is None:
            logger.warning(
                "Invalid timestamp for registration %s: %s",
                local_payload["id"],
                local_payload["registeredAt"],
            )
            return False

        # Normalise the stored timestamp to UTC ISO-8601
        local_payload["registeredAtUTC"] = reg_date.astimezone(
            timezone.utc
        ).isoformat()

        # ── Persist ──
        self.registration_store[local_payload["id"]] = local_payload

        # ── FIX 2 & 4: await webhook dispatch (with retries + backoff) ──
        task = asyncio.create_task(
            self.dispatch_webhook(local_payload["id"])
        )
        self._pending_tasks.append(task)

        # We *await* the task so the caller knows about delivery outcome.
        await task
        return True

    async def dispatch_webhook(self, registration_id: str) -> None:
        """
        Deliver a webhook notification with exponential backoff + jitter.

        Raises WebhookDeliveryError if all retries are exhausted.
        """
        record = self.registration_store.get(registration_id)
        if record is None:
            logger.error(
                "Cannot dispatch webhook — registration %s not found",
                registration_id,
            )
            self.webhook_logs.append(
                {
                    "id": registration_id,
                    "status": "FAILED",
                    "attempts": 0,
                    "error": "Registration not found in store",
                }
            )
            raise WebhookDeliveryError(
                f"Registration {registration_id} not in store"
            )

        attempts = 0
        last_error: Optional[Exception] = None

        while attempts < self.max_retries:
            attempts += 1
            try:
                await self._mock_network_send(self.target_url, record)
                # ── Success ──
                self.webhook_logs.append(
                    {
                        "id": registration_id,
                        "status": "DELIVERED",
                        "attempts": attempts,
                    }
                )
                return
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Webhook attempt %d/%d for %s failed: %s",
                    attempts,
                    self.max_retries,
                    registration_id,
                    exc,
                )
                # ── FIX 5: exponential backoff with jitter ──
                if attempts < self.max_retries:
                    backoff = self.base_backoff_sec * (2 ** (attempts - 1))
                    jitter = random.uniform(0, backoff * 0.5)
                    await asyncio.sleep(backoff + jitter)

        # All retries exhausted
        self.webhook_logs.append(
            {
                "id": registration_id,
                "status": "FAILED",
                "attempts": attempts,
                "error": str(last_error),
            }
        )
        raise WebhookDeliveryError(
            f"Webhook for {registration_id} failed after {attempts} attempts: "
            f"{last_error}"
        )

    async def wait_for_pending(self) -> None:
        """Await all outstanding webhook delivery tasks."""
        if self._pending_tasks:
            await asyncio.gather(*self._pending_tasks, return_exceptions=True)
            self._pending_tasks.clear()

    # ── helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _parse_timestamp(value: str) -> Optional[datetime]:
        """
        Parse an ISO-8601 timestamp string, correctly handling timezone
        offsets such as ``+05:30`` (IST) and ``Z`` (UTC).

        Returns a timezone-aware ``datetime`` or ``None`` on failure.
        """
        if not value:
            return None
        try:
            # Python ≥ 3.11 fromisoformat handles 'Z' natively;
            # for older versions we normalise it manually.
            normalised = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalised)
            # If the string had no tz info, assume UTC explicitly
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, TypeError):
            return None

    async def _mock_network_send(
        self, url: str, data: Any
    ) -> None:
        """Simulate network latency and transient 5xx errors."""
        await asyncio.sleep(0.02)
        if random.random() < 0.3:
            raise ConnectionError("503 Service Unavailable")

    # ── accessors ─────────────────────────────────────────────────────

    def get_store(self) -> Dict[str, Dict[str, Any]]:
        return dict(self.registration_store)

    def get_logs(self) -> List[Dict[str, Any]]:
        return list(self.webhook_logs)
