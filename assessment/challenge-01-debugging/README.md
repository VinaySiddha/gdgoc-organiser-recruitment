# 🐞 Challenge 01 — Debugging & Root-Cause Analysis
**Evaluation Weight:** 15 Points  
**Recommended Time:** 2 – 3 Hours  
**Deliverable:** Fixed source code, regression tests, and `DEBUG_REPORT.md` in this directory.

---

## 📌 Problem Scenario: The GDG Event RSVP & Webhook Dispatcher

Your team deployed a micro-service called **`EventDispatcher`** to handle high-traffic student registrations for an upcoming GDG DevFest at SVEC. 

During the initial registration surge (250+ concurrent requests per minute), the organizing team observed several critical anomalies:
1. **Silent Registration Drops:** Some attendees received HTTP 200 responses, but their registration records were missing from the database, or their confirmation webhooks (dispatched to Discord/Email) never triggered.
2. **Race Conditions & State Mutation:** Under concurrent load, attendees occasionally received someone else's ticket ID or profile metadata due to improper asynchronous state sharing.
3. **Unhandled Promise / Error Swallowing:** When the downstream webhook endpoint experienced intermittent network timeouts (e.g. 504 Gateway Timeout), the service crashed silently or hung without retrying, leaving transactions in an orphaned state.
4. **Timezone Offset Glitches:** Timestamp serialization for event check-in windows converted local Indian Standard Time (IST, UTC+5:30) incorrectly, locking out valid attendees.

---

## 💻 Buggy Reference Code

Below is the core flawed logic. You can implement your fix in **JavaScript/TypeScript, Python, or Go**.

<details open>
<summary><strong>Option A: JavaScript / TypeScript Starter Implementation</strong></summary>

```typescript
// dispatcher.ts - Flawed Reference Implementation
import { EventEmitter } from 'events';

interface RegistrationPayload {
  id: string;
  name: string;
  email: string;
  eventId: string;
  registeredAt: string; // ISO 8601
}

interface WebhookConfig {
  targetUrl: string;
  maxRetries: number;
  timeoutMs: number;
}

export class EventDispatcher {
  // Bug 1: Shared mutable state across concurrent execution contexts
  private activeContext: Partial<RegistrationPayload> = {};
  private registrationStore: Map<string, RegistrationPayload> = new Map();
  private webhookLogs: Array<{ id: string; status: string; attempts: number }> = [];

  constructor(private config: WebhookConfig) {}

  public async processRegistration(payload: RegistrationPayload): Promise<boolean> {
    // Bug 2: Mutating shared object without scoping
    this.activeContext = payload;

    // Simulate async database validation
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

    // Bug 3: Timestamp validation bug (assumes UTC, fails on timezone offsets)
    const regDate = new Date(this.activeContext.registeredAt!);
    if (isNaN(regDate.getTime())) {
      return false; // Silently returns without logging or error
    }

    // Persist to store
    this.registrationStore.set(this.activeContext.id!, this.activeContext as RegistrationPayload);

    // Bug 4: Fire-and-forget webhook without awaiting or handling async rejection
    this.dispatchWebhook(this.activeContext.id!);

    return true;
  }

  private async dispatchWebhook(registrationId: string): Promise<void> {
    const record = this.registrationStore.get(registrationId);
    let attempts = 0;
    let delivered = false;

    // Bug 5: Faulty retry loop and improper error swallowing
    while (attempts < this.config.maxRetries && !delivered) {
      attempts++;
      try {
        await this.mockNetworkSend(this.config.targetUrl, record);
        delivered = true;
        this.webhookLogs.push({ id: registrationId, status: 'DELIVERED', attempts });
      } catch (err) {
        // Swallows error, fails to handle backoff
        if (attempts === this.config.maxRetries) {
          this.webhookLogs.push({ id: registrationId, status: 'FAILED', attempts });
        }
      }
    }
  }

  private async mockNetworkSend(url: string, data: any): Promise<void> {
    // Simulates network latency and transient 500 errors
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (Math.random() < 0.3) {
      throw new Error('503 Service Unavailable');
    }
  }

  public getStore() {
    return this.registrationStore;
  }

  public getLogs() {
    return this.webhookLogs;
  }
}
```
</details>

<details>
<summary><strong>Option B: Python Starter Implementation</strong></summary>

```python
# dispatcher.py - Flawed Reference Implementation
import asyncio
import random
from datetime import datetime
from typing import Dict, List, Optional

class EventDispatcher:
    def __init__(self, target_url: str, max_retries: int = 3, timeout_sec: float = 1.0):
        self.target_url = target_url
        self.max_retries = max_retries
        self.timeout_sec = timeout_sec
        # Bug 1: Shared mutable instance state
        self.active_context: Dict = {}
        self.registration_store: Dict[str, Dict] = {}
        self.webhook_logs: List[Dict] = []

    async def process_registration(self, payload: Dict) -> bool:
        # Bug 2: Mutating shared state concurrently
        self.active_context = payload
        await asyncio.sleep(random.uniform(0.01, 0.05))

        # Bug 3: Fragile datetime parsing assuming naive UTC
        try:
            reg_date = datetime.fromisoformat(self.active_context.get("registeredAt", ""))
        except Exception:
            return False  # Swallowing error silently

        self.registration_store[self.active_context["id"]] = self.active_context

        # Bug 4: Fire-and-forget task without lifecycle management or error handling
        asyncio.create_task(self.dispatch_webhook(self.active_context["id"]))
        return True

    async def dispatch_webhook(self, registration_id: str) -> None:
        record = self.registration_store.get(registration_id)
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

    async def _mock_network_send(self, url: str, data: Dict) -> None:
        await asyncio.sleep(0.02)
        if random.random() < 0.3:
            raise ConnectionError("503 Service Unavailable")
```
</details>

---

## 🎯 Your Tasks

1. **Root-Cause Analysis (RCA):**
   - Identify all root causes contributing to the failures (concurrency state collisions, silent error swallowing, naive timestamp handling, unhandled retries).
   - Copy [`starter/DEBUG_REPORT_TEMPLATE.md`](../../starter/DEBUG_REPORT_TEMPLATE.md) to `assessment/challenge-01-debugging/DEBUG_REPORT.md` and document your findings.
2. **Refactor and Fix:**
   - Create your clean, corrected implementation in this directory (e.g., `src/dispatcher.ts` or `src/dispatcher.py`).
   - Eliminate shared mutable context.
   - Implement structured exponential backoff or robust retry mechanism.
   - Properly handle ISO-8601 timestamps and timezone offsets (UTC + local offsets).
3. **Comprehensive Regression Testing:**
   - Write automated unit tests that explicitly reproduce the original bugs and verify that your fix resolves them.
   - Test concurrent processing (e.g., 50 parallel registrations with different payloads).
   - Test transient network failure resilience.
   - Test invalid/malformed inputs.

---

## 📂 Expected Directory Structure

```
assessment/challenge-01-debugging/
├── README.md              # This file
├── DEBUG_REPORT.md        # Your completed RCA report
├── package.json / requirements.txt
├── src/
│   └── dispatcher.*       # Fixed source code
└── tests/
    └── dispatcher.test.*  # Regression unit test suite
```

---

## ⚖️ Scoring Criteria (15 Points)

| Criteria | Points | Description |
| :--- | :---: | :--- |
| **Root-Cause Diagnosis** | 4 | Complete identification of concurrency, error-handling, and state flaws in `DEBUG_REPORT.md`. |
| **Code Correctness & Cleanliness** | 5 | Clean, idiomatic, race-condition-free refactoring. |
| **Resilience & Error Handling** | 3 | Proper retry strategy, exponential backoff, and graceful failure isolation. |
| **Regression Test Quality** | 3 | Tests that explicitly test concurrency, timeouts, and edge-case inputs. |
