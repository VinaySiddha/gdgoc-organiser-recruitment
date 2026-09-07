# 🔍 Root-Cause Analysis (RCA) & Debugging Report
### Challenge 01: Event Processing & Webhook Dispatcher Debugging

---

## 📌 Issue Overview
- **Component Affected:** `EventDispatcher` — registration processor and webhook notification system
- **Severity Level:** **High** — data loss, data corruption, and service hangs under production load
- **Reported Symptoms:**
  1. Silent registration drops (HTTP 200 returned but records missing)
  2. Attendees receiving other users' ticket IDs (cross-contamination)
  3. Silent crashes / hangs on downstream 504 timeouts
  4. Valid IST (+05:30) timestamps rejected, locking out Indian attendees

---

## 🕵️ Diagnostic Process & Root Cause

### 1. Reproduction Steps
```bash
# Install dependencies
pip install -r requirements.txt

# Run the regression test suite that reproduces all bugs
pytest tests/test_dispatcher.py -v

# Key test: 50 concurrent registrations to trigger race condition
pytest tests/test_dispatcher.py::test_concurrent_registrations_no_data_corruption -v
```

### 2. Root Cause Analysis

#### Bug 1 & 2 — Shared Mutable State / Race Condition
**Root Cause:** The class stored the *current* registration payload in `self.active_context`, a single shared instance attribute. When multiple coroutines called `process_registration()` concurrently, each `await` suspension point allowed another coroutine to overwrite `self.active_context`. When the first coroutine resumed, it read the *second* coroutine's data — storing the wrong user's record, or dispatching the wrong webhook.

**Why it was subtle:** In single-request testing, the bug never manifests because there is no interleaving. It only appears under concurrent load (250+ req/min as reported).

#### Bug 3 — Timezone Offset Parsing
**Root Cause:** The original code used `datetime.fromisoformat()` with the raw timestamp string but did not handle:
- The `"Z"` UTC suffix (raises `ValueError` on Python < 3.11)
- Timezone-naive strings (treated as local time instead of UTC)
- Indian Standard Time offset `+05:30` (parsed but then compared as if it were UTC)

This caused valid IST registrations to fail silently — `return False` with no logging.

#### Bug 4 — Fire-and-Forget Webhook
**Root Cause:** `asyncio.create_task(self.dispatch_webhook(...))` was called without ever awaiting or tracking the resulting task. This meant:
- The caller returned `True` before knowing if the webhook succeeded
- If the webhook task raised an exception, it was silently garbage-collected
- Under load, tasks could pile up without backpressure

#### Bug 5 — Error Swallowing & No Backoff
**Root Cause:** The retry loop caught `Exception` and did nothing with it (no logging, no backoff delay). On transient 503s, the loop hammered the endpoint immediately with zero delay between retries — both wasting resources and increasing failure probability. When all retries exhausted, the failure was recorded in `webhook_logs` but the caller was never informed.

### 3. Key Flaws in the Original Code
- **Flaw 1:** `self.active_context = payload` — class-level shared mutable state eliminates concurrency safety
- **Flaw 2:** `self.dispatchWebhook(...)` / `asyncio.create_task(...)` — fire-and-forget without lifecycle tracking
- **Flaw 3:** `datetime.fromisoformat()` without `Z` normalisation or timezone-aware fallback
- **Flaw 4:** Bare `except Exception: pass` with no backoff, no jitter, no logging
- **Flaw 5:** Silent `return False` on validation failure with no structured error reporting

---

## 🛠️ Implemented Fix & Code Changes

### Summary of Changes

| # | Bug | Fix Applied |
|---|-----|-------------|
| 1 | Shared mutable `active_context` | Replaced with `local_payload = dict(payload)` — each coroutine operates on its own isolated dict |
| 2 | Fire-and-forget webhook | `await` the dispatch task; maintain `_pending_tasks` list for lifecycle management |
| 3 | Timezone parsing | Added `_parse_timestamp()` helper that normalises `Z` → `+00:00`, handles offsets, and defaults naive timestamps to UTC |
| 4 | No retry backoff | Implemented exponential backoff with jitter: `base * 2^(attempt-1) + random jitter` |
| 5 | Error swallowing | All errors logged via `logging.warning()`; `WebhookDeliveryError` raised on exhaustion; structured error field in `webhook_logs` |

### Code Diff Snippet
```diff
  async def process_registration(self, payload: Dict) -> bool:
-     # Bug 2: Mutating shared state concurrently
-     self.active_context = payload
+     # FIX: Use a local copy — no shared mutable context
+     local_payload = dict(payload)
      await asyncio.sleep(random.uniform(0.01, 0.05))

-     # Bug 3: Fragile datetime parsing assuming naive UTC
+     # FIX: Robust ISO-8601 parsing with timezone support
-     try:
-         reg_date = datetime.fromisoformat(self.active_context.get("registeredAt", ""))
-     except Exception:
-         return False  # Swallowing error silently
+     reg_date = self._parse_timestamp(local_payload["registeredAt"])
+     if reg_date is None:
+         logger.warning("Invalid timestamp for %s", local_payload["id"])
+         return False

-     self.registration_store[self.active_context["id"]] = self.active_context
+     local_payload["registeredAtUTC"] = reg_date.astimezone(timezone.utc).isoformat()
+     self.registration_store[local_payload["id"]] = local_payload

-     # Bug 4: Fire-and-forget task
-     asyncio.create_task(self.dispatch_webhook(self.active_context["id"]))
+     # FIX: Await the webhook dispatch
+     task = asyncio.create_task(self.dispatch_webhook(local_payload["id"]))
+     self._pending_tasks.append(task)
+     await task
      return True
```

```diff
  async def dispatch_webhook(self, registration_id: str) -> None:
      while attempts < self.max_retries and not delivered:
          attempts += 1
          try:
              await self._mock_network_send(self.target_url, record)
              delivered = True
          except Exception:
-             if attempts >= self.max_retries:
-                 self.webhook_logs.append(...)
+             logger.warning("Attempt %d/%d failed: %s", attempts, self.max_retries, exc)
+             if attempts < self.max_retries:
+                 backoff = self.base_backoff_sec * (2 ** (attempts - 1))
+                 jitter = random.uniform(0, backoff * 0.5)
+                 await asyncio.sleep(backoff + jitter)
+     if not delivered:
+         self.webhook_logs.append({..., "status": "FAILED", "error": str(last_error)})
+         raise WebhookDeliveryError(...)
```

---

## 🧪 Testing & Regression Verification

### 1. Test Cases Added
- **test_concurrent_registrations_no_data_corruption** — 50 parallel registrations verify no cross-contamination (Bug 1 & 2)
- **test_ist_timezone_offset_accepted** — IST `+05:30` timestamp parses and normalises to UTC (Bug 3)
- **test_utc_z_suffix_accepted** — `Z` suffix parses correctly (Bug 3)
- **test_negative_utc_offset** — US Eastern `-05:00` offset parses correctly (Bug 3)
- **test_invalid_timestamp_returns_false** — Malformed timestamps fail gracefully (Bug 3)
- **test_webhook_delivery_logged_on_success** — Webhook success is logged (Bug 4)
- **test_webhook_failure_logged_after_retries** — All-retry-failure is logged with error detail (Bug 5)
- **test_webhook_retries_with_transient_failures** — Succeeds on 3rd attempt after 2 transient failures (Bug 5)
- **test_missing_id_raises_error** — Missing required fields raise `RegistrationError`
- **test_completely_empty_payload** — Empty dict raises `RegistrationError`
- **test_large_batch_concurrent** — 100 concurrent registrations all succeed

### 2. Test Execution Output
```text
pytest tests/test_dispatcher.py -v

tests/test_dispatcher.py::test_concurrent_registrations_no_data_corruption PASSED
tests/test_dispatcher.py::test_concurrent_same_event_different_users PASSED
tests/test_dispatcher.py::test_ist_timezone_offset_accepted PASSED
tests/test_dispatcher.py::test_utc_z_suffix_accepted PASSED
tests/test_dispatcher.py::test_naive_timestamp_treated_as_utc PASSED
tests/test_dispatcher.py::test_negative_utc_offset PASSED
tests/test_dispatcher.py::test_invalid_timestamp_returns_false PASSED
tests/test_dispatcher.py::test_webhook_delivery_logged_on_success PASSED
tests/test_dispatcher.py::test_webhook_failure_logged_after_retries PASSED
tests/test_dispatcher.py::test_webhook_retries_with_transient_failures PASSED
tests/test_dispatcher.py::test_missing_id_raises_error PASSED
tests/test_dispatcher.py::test_missing_email_raises_error PASSED
tests/test_dispatcher.py::test_empty_name_raises_error PASSED
tests/test_dispatcher.py::test_completely_empty_payload PASSED
tests/test_dispatcher.py::test_get_store_returns_copy PASSED
tests/test_dispatcher.py::test_get_logs_returns_copy PASSED
tests/test_dispatcher.py::test_duplicate_registration_id_overwrites PASSED
tests/test_dispatcher.py::test_large_batch_concurrent PASSED

==================== 18 passed in 2.34s ====================
```

---

## 🛡️ Long-term Prevention & Architectural Recommendations

1. **Ban shared mutable context patterns** — Use function-local state or immutable dataclasses. Add a lint rule flagging `self.active_*` / `self.current_*` patterns in async code.
2. **Enforce `await` on all `create_task()` calls** — Use an `asyncio.TaskGroup` (Python 3.11+) or track all tasks in a set with `add_done_callback` to catch unobserved exceptions.
3. **Use `datetime` with mandatory `tzinfo`** — Type-annotate all timestamp fields as `datetime` (not `str`) with timezone-aware enforcement. Use `zoneinfo.ZoneInfo("Asia/Kolkata")` for IST.
4. **Standardise retry policy** — Extract retry logic into a reusable decorator/utility with configurable backoff, jitter, max-retries, and dead-letter logging.
5. **Structured logging** — Use structured JSON logs with correlation IDs so that dropped registrations can be traced in production observability tools.
6. **Idempotency keys** — Use the registration `id` as an idempotency key in the webhook endpoint to prevent duplicate notifications if retries succeed after a network partition.
