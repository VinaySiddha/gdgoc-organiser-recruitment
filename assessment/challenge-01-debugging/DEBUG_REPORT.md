# 🔍 Root-Cause Analysis (RCA) & Debugging Report
### Challenge 01: Event Processing & Webhook Dispatcher Debugging

---

## 📌 Issue Overview
- **Component Affected:** `EventDispatcher` (`dispatcher.ts`)
- **Severity Level:** High
- **Reported Symptoms:** 
  1. Silent registration drops and race conditions under high concurrent load (250+ req/min).
  2. Data corruption where attendees received swapped ticket IDs and profile metadata.
  3. Silent failure when parsing ISO-8601 timestamps containing timezone offsets (e.g. IST `+05:30`).
  4. Webhook retries swallowing errors without exponential backoff and potential unhandled promise rejections crashing background jobs.

---

## 🕵️ Diagnostic Process & Root Cause

### 1. Reproduction Steps
Created unit test cases using `Promise.all` to simulate 50 concurrent registration calls to `processRegistration()`.
```typescript
const results = await Promise.all(
  payloads.map((p) => dispatcher.processRegistration(p))
);
```

### 2. Root Cause Analysis
- **Shared Mutable State Collision:** The class stored incoming requests in a class-level property `this.activeContext`. Because `processRegistration` paused execution with an `await` statement (simulating database validation), subsequent concurrent requests mutated `this.activeContext` before the prior request resumed execution. As a result, the prior request persisted the new request's data into the store.
- **Naive & Silent Timestamp Parsing:** `new Date(this.activeContext.registeredAt!)` returned `NaN` for invalid dates and silently returned `false` without logging, dropping registrations without throwing or informing upstream callers.
- **Unhandled Background Webhook Exceptions & Instant Retry Loops:** The `dispatchWebhook` method was called asynchronously without an `await` or `.catch()` handler. Furthermore, inside `dispatchWebhook`, retry attempts ran immediately without exponential backoff, overloading failing downstream services and swallowing exceptions cleanly without exponential backoff handling.

### 3. Key Flaws in the Original Code
- **Flaw 1:** `private activeContext: Partial<RegistrationPayload> = {};` shared mutable state across asynchronous concurrent execution contexts.
- **Flaw 2:** `this.dispatchWebhook(this.activeContext.id!);` fired background tasks asynchronously without error catching, operating on mutable shared properties instead of local payload copies.
- **Flaw 3:** Retries ran synchronously in a immediate `while` loop without exponential backoff delay (`await sleep(backoff)`).
- **Flaw 4:** Silent `return false` on invalid timestamps without explicit error logging or exception handling.

---

## 🛠️ Implemented Fix & Code Changes

### Summary of Changes
1. **Removed `activeContext`:** Entirely eliminated class-scoped mutable payload storage. Each registration call now strictly processes its request-local parameters (`payload`).
2. **Explicit Timestamp Validation:** Validated presence of `registeredAt` and checked `isNaN(regDate.getTime())`. Throws explicit, informative errors on invalid ISO-8601 timestamps.
3. **Structured Exponential Backoff:** Added delay calculation `backoffBaseMs * Math.pow(2, attempts - 1)` between webhook retries.
4. **Unhandled Rejection Prevention:** Safely wrapped background webhook dispatch in a top-level try-catch block and attached a `.catch()` handler to the background promise.

### Code Diff Snippet
```diff
export class EventDispatcher {
-  private activeContext: Partial<RegistrationPayload> = {};
   private registrationStore: Map<string, RegistrationPayload> = new Map();
   private webhookLogs: Array<{ id: string; status: string; attempts: number }> = [];

   public async processRegistration(payload: RegistrationPayload): Promise<boolean> {
-    this.activeContext = payload;
-    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
-    const regDate = new Date(this.activeContext.registeredAt!);
-    if (isNaN(regDate.getTime())) {
-      return false;
-    }
-    this.registrationStore.set(this.activeContext.id!, this.activeContext as RegistrationPayload);
-    this.dispatchWebhook(this.activeContext.id!);
+    if (!payload || !payload.id || !payload.registeredAt || typeof payload.registeredAt !== 'string') {
+      throw new Error('Invalid registration payload: missing required fields or timestamp');
+    }
+    const regDate = new Date(payload.registeredAt);
+    if (isNaN(regDate.getTime())) {
+      throw new Error(`Invalid ISO-8601 timestamp: "${payload.registeredAt}"`);
+    }
+    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
+    const record: RegistrationPayload = { ...payload };
+    this.registrationStore.set(record.id, record);
+    this.dispatchWebhook(record.id).catch((err) => {
+      console.error(`Unhandled error in background webhook for ID ${record.id}:`, err);
+    });
     return true;
   }
```

---

## 🧪 Testing & Regression Verification

### 1. Test Cases Added
- **Test Case 1:** Single valid registration processing and persistence verification.
- **Test Case 2:** Concurrent processing of 50 simultaneous registrations via `Promise.all` verifying zero data mixing/overwriting.
- **Test Case 3:** ISO-8601 timestamp with IST offset (`+05:30`) validation.
- **Test Case 4:** Explicit rejection of malformed/invalid timestamp formats.
- **Test Case 5:** Successful webhook delivery on first attempt logging `DELIVERED`.
- **Test Case 6:** Transient network failure recovery across retries.
- **Test Case 7:** Verification of exponential backoff delay progression (`delay2 > delay1`).
- **Test Case 8 & 9:** Permanent webhook failure handling after exhausting max retries without process crashes or unhandled rejections.

### 2. Test Execution Output
```text
PASS tests/dispatcher.test.ts
  EventDispatcher - Regression and Core Functionality Tests
    ✓ 1. Single valid registration succeeds and stores record (10 ms)
    ✓ 2. 50 concurrent registrations process cleanly without state pollution or race conditions (19 ms)
    ✓ 3. Correctly handles valid ISO-8601 timestamps with IST timezone offsets (+05:30) (2 ms)
    ✓ 4. Explicitly handles and rejects invalid timestamps by throwing an error (8 ms)
    ✓ 5. Webhook succeeds on first attempt and logs DELIVERED status (30 ms)
    ✓ 6. Webhook retries transient failures and eventually succeeds (54 ms)
    ✓ 7. Verifies exponential backoff delay timing between webhook retries (312 ms)
    ✓ 8 & 9. Logs permanent FAILED status after max retries without crashing process or throwing unhandled rejection (54 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        1.552 s
Ran all test suites.
```

---

## 🛡️ Long-term Prevention & Architectural Recommendations
1. **Enforce Immutability & Scope Isolation:** Avoid declaring mutable instance variables on service classes for request-specific state. Use pure functions or local variable scoping.
2. **Asynchronous Job Queues:** For production background webhooks, replace in-memory fire-and-forget loops with a persistent queue (e.g. BullMQ, Redis, or SQS) with dead-letter queue (DLQ) support.
3. **Structured Validation Schema:** Utilize libraries such as Zod or TypeBox to validate incoming payloads and ISO dates at system entry points.
