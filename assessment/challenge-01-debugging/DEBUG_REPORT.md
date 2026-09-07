# 🔍 Root-Cause Analysis (RCA) & Debugging Report
### Challenge 01: Event Processing & Webhook Dispatcher Debugging

---

## 📌 Issue Overview
- **Component Affected:** `EventDispatcher` (`assessment/challenge-01-debugging/src/dispatcher.ts` / `dispatcher.py`)
- **Severity Level:** Critical (P0 — Data Corruption & Silent Failure)
- **Reported Symptom:** 
  During a peak registration surge (250+ concurrent requests per minute) for GDG DevFest SVEC, attendees experienced severe anomalies:
  1. High concurrency race conditions caused attendees to receive tickets or metadata belonging to other candidates.
  2. Registrations were silently dropped when downstream webhooks failed or timed out.
  3. Valid check-in timestamps with Indian Standard Time (IST, UTC+5:30) and other timezone offsets were rejected or corrupted.
  4. Webhook failures generated unhandled promise rejections and hung microservice execution threads.

---

## 🕵️ Diagnostic Process & Root Cause

### 1. Reproduction Steps
The race condition was reproduced locally by firing 50 concurrent requests simultaneously with distinct IDs, names, and event IDs:
```bash
# Run the automated regression test harness
pytest assessment/challenge-01-debugging/tests/test_dispatcher.py -v
# or via npm / ts-node
npm --prefix assessment/challenge-01-debugging test
```
Under concurrency in the flawed reference implementation:
- The shared property `this.activeContext` was overwritten by subsequent concurrent requests before earlier asynchronous validation operations (`setTimeout` / `asyncio.sleep`) completed.
- When `this.registrationStore.set()` executed, it used the mutated `this.activeContext`, storing the newest attendee's data under multiple different registration IDs.

### 2. Root Cause Analysis
A comprehensive audit identified four intertwined root causes:

1. **Shared Mutable Request State Across Asynchronous Contexts:**
   The class retained an instance variable `activeContext`. Node.js and Python run single-threaded event loops; when an `await` yields execution, another request handler can mutate `activeContext`. This breaks request isolation, allowing User B's payload to overwrite User A's payload in memory before persistence.

2. **Unmanaged Asynchronous Fire-and-Forget Operations:**
   The dispatcher initiated webhook delivery via unawaited calls (`this.dispatchWebhook(...)` / `asyncio.create_task(...)`) without proper error containment or lifecycle tracking. When network drops occurred, downstream exceptions became unhandled rejections.

3. **Naive Datetime Parsing & Offset Stripping:**
   `new Date(...)` and naive `datetime.fromisoformat()` assumptions treated strings inconsistently, failing to handle valid ISO-8601 strings containing explicit offsets such as `+05:30` (IST) or `-04:00` (EDT), or failing silently when returning `false` without meaningful error propagation.

4. **Missing Exponential Backoff & Swallowed Errors:**
   The retry loop made immediate tight retries without exponential backoff or jitter, exacerbating downstream gateway timeouts (503 Service Unavailable) and swallowing exceptions on final failure without updating audit logs.

### 3. Key Flaws in the Original Code
- **Flaw 1:** Mutating instance-level state `this.activeContext = payload;` across overlapping asynchronous tasks.
- **Flaw 2:** Unawaited fire-and-forget webhook execution without error boundaries or lifecycle tracking.
- **Flaw 3:** Lack of backoff delay in retry loop causing thundering herd problems during downstream outages.
- **Flaw 4:** Silent boolean `return false;` on timestamp parse errors without diagnostic information.

---

## 🛠️ Implemented Fix & Code Changes

### Summary of Changes
1. **Eliminated Shared Mutable State:** Removed `activeContext` entirely. Every registration is cloned into an immutable request-local object passed explicitly through functions.
2. **Robust ISO-8601 Timestamp Validation:** Added strict regex and offset parsing for ISO-8601 timestamps supporting `Z`, positive (`+05:30`), and negative (`-04:00`) offsets.
3. **Structured Exponential Backoff:** Implemented delay calculation:
   $$\text{Delay} = \text{initialBackoffMs} \times (\text{backoffFactor})^{\text{attempts} - 1}$$
4. **Failure Isolation:** Decoupled registration persistence from webhook delivery. Even if all webhook retries are exhausted, the attendee's registration record remains safely committed in the store while logging the `FAILED` status.

### Code Diff Snippet
```diff
- // Flawed: Shared mutable instance state
- private activeContext: Partial<RegistrationPayload> = {};
- public async processRegistration(payload: RegistrationPayload): Promise<boolean> {
-   this.activeContext = payload;
-   await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
-   this.registrationStore.set(this.activeContext.id!, this.activeContext as RegistrationPayload);
-   this.dispatchWebhook(this.activeContext.id!);
-   return true;
- }

+ // Fixed: Request-local immutable context & managed lifecycle
+ public async processRegistration(payload: RegistrationPayload): Promise<DispatcherResult> {
+   const validation = this.validatePayload(payload);
+   if (!validation.valid) return { success: false, error: validation.error };
+   
+   const localRecord: RegistrationPayload = { ...payload, email: payload.email.toLowerCase().trim() };
+   this.registrationStore.set(localRecord.id, localRecord);
+   await this.dispatchWebhook(localRecord);
+   return { success: true, registrationId: localRecord.id };
+ }
```

---

## 🧪 Testing & Regression Verification

### 1. Test Cases Added
- **Test Case 1 (50 Concurrent Registrations):** Executes 50 parallel registrations with unique IDs and verify all 50 records exist in the store with zero data collision.
- **Test Case 2 (Timezone Offset Parsing):** Validates ISO-8601 timestamps with UTC (`Z`), Indian Standard Time (`+05:30`), and US Eastern (`-04:00`).
- **Test Case 3 (Exponential Backoff Retry):** Simulates transient 503 HTTP errors and confirms retries succeed with increasing delays.
- **Test Case 4 (Failure Isolation):** Verifies that when downstream webhooks fail permanently, the registration record remains intact and audit logs record `FAILED`.

### 2. Test Execution Output
```text
============================= test session starts =============================
platform win32 -- Python 3.12.5, pytest-8.3.2, pluggy-1.5.0
collected 6 items

assessment/challenge-01-debugging/tests/test_dispatcher.py::test_valid_registration PASSED
assessment/challenge-01-debugging/tests/test_dispatcher.py::test_invalid_payload_and_malformed_data PASSED
assessment/challenge-01-debugging/tests/test_dispatcher.py::test_timestamp_offsets PASSED
assessment/challenge-01-debugging/tests/test_dispatcher.py::test_concurrency_isolation_50_requests PASSED
assessment/challenge-01-debugging/tests/test_dispatcher.py::test_webhook_retry_and_backoff_success PASSED
assessment/challenge-01-debugging/tests/test_dispatcher.py::test_webhook_retry_exhaustion_and_failure_isolation PASSED

============================== 6 passed in 0.28s ==============================
```

---

## 🛡️ Long-term Prevention & Architectural Recommendations
1. **Adopt Immutable Data Patterns:** Enforce readonly TypeScript interfaces (`Readonly<T>`) and lint rules banning instance mutation inside asynchronous request handlers.
2. **Outbox Pattern for Reliable Messaging:** Decouple transaction persistence from external webhook delivery using an Outbox queue table backed by Redis or PostgreSQL, ensuring at-least-once delivery with background worker processing.
3. **Strict ISO-8601 Schema Validation:** Enforce request schema validation at the API boundary using Zod or Pydantic before handlers execute.
4. **Circuit Breakers & Rate Limiting:** Implement circuit breakers (e.g. Opossum / Resilience4j) on downstream endpoints to fast-fail when third-party servers degrade.
