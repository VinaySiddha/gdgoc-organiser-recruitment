# Debugging & Root-Cause Analysis: EventDispatcher

The failures in the EventDispatcher were caused by a combination of state leakage, naive timestamp parsing, and unguarded async retry logic. The most important issue was shared mutable instance state. The `activeContext` field and registration data were stored directly on the dispatcher instance, so parallel requests could overwrite one another before the async validation and persistence steps completed. In a busy registration surge, one request could replace the context for another request, leading to mismatched ticket IDs, missing registration rows, and phantom webhook dispatches.

The second root cause was the silent error path around timestamp validation. The original implementation used `new Date(...)` or `datetime.fromisoformat(...)` without normalizing timezone offsets. ISO-8601 timestamps like `2026-10-12T09:00:00+05:30` are valid, but naive parsing or locale assumptions can incorrectly interpret them, which makes valid registrations appear invalid. The function returned `false` without recording any diagnostic information, so the system masked the problem instead of surfacing it for debugging.

The third issue was the webhook dispatch path. The code started background tasks or fire-and-forget calls without waiting on their completion or capturing rejection errors. That meant downstream webhook failures could leave the registration as "succeeded" while the side effect never completed. Because the retry loop swallowed exceptions and had no backoff policy, a temporary network outage turned into inconsistent service state.

The fix isolates request-scoped state, validates and normalizes timestamps to UTC, and uses a bounded retry loop with exponential backoff. Each registration is handled independently, and the dispatcher waits for webhook processing to finish before reporting success so that transient network faults do not silently orphan a transaction. In production, this approach keeps the service deterministic under concurrent traffic and makes error handling explicit instead of hidden.

Root Cause: Shared mutable request context permits concurrent requests to overwrite each other's registration data; naive timestamp parsing and fire-and-forget webhook calls also hide failures.
Reproduction: Run the regression tests with `pytest -q assessment/challenge-01-debugging/tests/test_dispatcher.py` to exercise concurrent payloads, malformed timestamps, and transient webhook errors.
Code Changes: Request data is local to each call, ISO-8601 offsets are normalized to UTC, webhook dispatch is awaited, and retries use bounded exponential backoff.
Recommendations: Keep request state local, validate input at boundaries, test asynchronous failure paths, and use a durable transactional outbox for production delivery.

## How to Reproduce

Run `pytest -q assessment/challenge-01-debugging/tests/test_dispatcher.py`. The concurrency test submits distinct records together and checks for cross-request collisions. The timestamp test submits malformed input and verifies it is rejected without persistence. The retry test simulates transient webhook failures followed by success and verifies bounded retry behavior.

## Fix Details

The implementation keeps each payload local rather than using mutable dispatcher-wide request context. It parses ISO-8601 values with offsets and normalizes them to UTC. Webhook work is awaited and retried with bounded exponential delays; delivery success or final failure is recorded in the log.

## Prevention Notes

Keep request-specific data local, validate external data at the boundary, and make asynchronous side effects observable with bounded retries and explicit outcomes. Maintain regression tests for concurrency, malformed input, timezone offsets, and downstream outages. A production service should persist registrations transactionally and use a durable outbox so process restarts cannot lose pending notifications.
