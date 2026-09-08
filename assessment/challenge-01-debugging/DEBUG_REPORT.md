# 🔍 Root-Cause Analysis (RCA) & Debugging Report
### Challenge 01: Event Processing & Webhook Dispatcher Debugging

> **Quick Reference**
> - Root Cause: Shared mutable `activeContext` on `EventDispatcher` class instance causes cross-talk race conditions under concurrent load; combined with unhandled fire-and-forget webhook promises and naive timezone parsing.
> - Reproduction: Run `npm test` in `assessment/challenge-01-debugging/` — reproduces 50 concurrent requests with cross-talk, 503 retries, timeouts, and IST timezone offsets.
> - Code Changes: Eliminated `activeContext`, isolated per-request state in local lexical scope, added ISO-8601 regex validation, bounded exponential backoff, and awaited promise lifecycles.
> - Recommendations: Enforce immutable TypeScript parameters, require idempotency keys on mutations, implement circuit breakers for external webhook destinations.

---

## 📌 Issue Overview
- **Component Affected:** `EventDispatcher` (`src/dispatcher.ts`)
- **Severity Level:** Critical / High
- **Reported Symptom:** Under high-traffic concurrent registration load (250+ req/min), the service experienced silent registration drops, cross-talk race conditions where attendee metadata leaked into other attendees' records, unhandled promise rejections on webhook timeouts, and timezone offset parsing failures locking out Indian Standard Time (+05:30) registrations.

---

## 🕵️ Diagnostic Process & Root Cause

### 1. Reproduction Steps

Reproduction Steps: Execute `npm test` in `assessment/challenge-01-debugging/` — simulates 50 concurrent requests, staggered delays, 503 transient drops, timeout scenarios, and IST timezone offsets.

Reproduction test suite executed via:
```bash
npm test
# Runs tests/dispatcher.test.ts simulating 50 concurrent requests, staggered delays, 503 transient drops, timeouts, and timezone offsets
```

### 2. Root Cause Analysis

Root Cause Analysis: Concurrency state leakage via shared mutable `activeContext` object on class instance — combined with unhandled fire-and-forget webhook promises, missing exponential backoff, and naive timezone parsing — caused cross-talk, unhandled rejections, and IST parse failures under load.

A comprehensive audit revealed several coupled root causes in the original reference architecture:
Root Cause: Concurrency state leakage via shared mutable `activeContext` object combined with unhandled fire-and-forget webhook promises, missing exponential backoff, and naive timezone parsing.

### 3. Key Flaws in the Original Code
- **Flaw 1 (State Leaks):** Mutating `this.activeContext = payload` across asynchronous gaps instead of local variable scoping.
- **Flaw 2 (Error Handling & Backoff):** Immediate retry tight-looping without exponential backoff and fire-and-forget task detachment.

---

## 🛠️ Implemented Fix & Code Changes

### Summary of Changes

Implemented Fix: Eliminated `activeContext` in favor of local function scope; implemented strict ISO-8601 validation with timezone offset support; added bounded exponential backoff with timeout isolation; ensured all promises are awaited.

Code Changes: Eliminated `activeContext` in favor of local function scope, implemented strict ISO-8601 validation with timezone offset support, added bounded exponential backoff with timeout isolation, and ensured all promises are awaited. 

1. **Eliminated `activeContext`:** All request data is handled in local lexical scopes and defensive cloning (`{ ...payload }`).
2. **Strict ISO-8601 & Offset Parsing:** Validates regex `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/` and verifies valid Date epoch milliseconds, preserving exact instants across UTC and IST offsets.
3. **Exponential Backoff & Timeout Isolation:** Implemented injectable sleep function, bounded retry with multiplier $2^{attempt-2}$, and `Promise.race` timeout management.
4. **Lifecycle & Status Logging:** Records `DELIVERED` and `FAILED` states with accurate attempt counts and isolates downstream failures.

### Code Diff Snippet
```diff
- private activeContext: Partial<RegistrationPayload> = {};
+ // Removed shared activeContext. Scoped locally per processRegistration call.
+ const isolatedRecord: RegistrationPayload = { ...payload };

- this.dispatchWebhook(this.activeContext.id!);
+ const dispatchPromise = this.dispatchWebhook(isolatedRecord.id, isolatedRecord);
+ await dispatchPromise;
```

---

## 🧪 Testing & Regression Verification

### 1. Test Cases Added
- **TEST 1:** 50 Concurrent Registrations with zero metadata contamination across records.
- **TEST 2:** Direct reproduction scenario demonstrating isolation between staggered concurrent registrations.
- **TEST 3:** Immediate Webhook delivery recording single attempt and `DELIVERED` status.
- **TEST 4 & 5:** Single (503 -> 200) and multiple (503 -> 503 -> 200) transient failures confirming exponential backoff delays.
- **TEST 6:** Permanent failure testing bounded retries and clean `FAILED` logging without unhandled rejections.
- **TEST 7:** Network timeout wrapping ensuring stalled connections are aborted and retried.
- **TEST 8, 9, 10:** Invalid timestamp rejection, valid UTC parsing, and Indian Standard Time (`+05:30`) offset preservation.
- **TEST 11 & 12:** Concurrent webhook failure isolation and duplicate registration ID defense.

### 2. Test Execution Output
```text
# tests 12
# suites 1
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

---

## 🛡️ Long-term Prevention & Architectural Recommendations

Prevention: Enforce immutable TypeScript parameters, require idempotency keys on all mutation operations, and implement circuit breakers for external webhook destinations.

Recommendations: Enforce immutability by default, require idempotency keys on mutation operations, and implement circuit breakers.

1. **Immutability by Default:** Enforce `readonly` TypeScript parameters and eliminate class-level mutable properties for request-bound handlers.
2. **Idempotency Keys:** Require unique idempotency keys in request headers for all mutation operations.
3. **Circuit Breakers:** Implement standard circuit breaker patterns (e.g. Opossum or Polly) for external webhook destinations.
