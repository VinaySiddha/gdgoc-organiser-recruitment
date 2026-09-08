import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventDispatcher, type RegistrationPayload, type WebhookConfig } from '../src/dispatcher.js';

describe('Challenge 01 — EventDispatcher Regression Test Suite', () => {
  const baseConfig: WebhookConfig = {
    targetUrl: 'https://webhook.gdgsvec.internal/events',
    maxRetries: 3,
    timeoutMs: 100,
    baseDelayMs: 5,
    maxDelayMs: 20
  };

  const fastSleep = async (_ms: number) => {
    // Zero-wait sleep mock for high-speed deterministic tests
  };

  it('TEST 1 — 50 Concurrent Registrations (No State Crosstalk)', async () => {
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {},
      sleepFn: fastSleep
    });

    const registrations: RegistrationPayload[] = Array.from({ length: 50 }, (_, i) => ({
      id: `reg-${i + 1}`,
      name: `Attendee ${i + 1}`,
      email: `attendee_${i + 1}@sves.org.in`,
      eventId: `event-${(i % 3) + 1}`,
      registeredAt: '2026-09-08T14:00:00Z'
    }));

    const results = await Promise.all(registrations.map((reg) => dispatcher.processRegistration(reg)));

    // Verify every registration returned success
    assert.equal(results.every((r) => r === true), true);

    const store = dispatcher.getStore();
    assert.equal(store.size, 50);

    // Strict cross-verification: verify ID maps exactly to attendee name, email, eventId without contamination
    for (let i = 0; i < 50; i++) {
      const id = `reg-${i + 1}`;
      const record = store.get(id);
      assert.ok(record, `Record ${id} should exist in store`);
      assert.equal(record.id, id);
      assert.equal(record.name, `Attendee ${i + 1}`);
      assert.equal(record.email, `attendee_${i + 1}@sves.org.in`);
      assert.equal(record.eventId, `event-${(i % 3) + 1}`);
    }

    const logs = dispatcher.getLogs();
    assert.equal(logs.length, 50);
    assert.equal(logs.every((l) => l.status === 'DELIVERED'), true);
  });

  it('TEST 2 — Original Race Condition (Reproduction & Resolution)', async () => {
    // In the buggy implementation, reg1 starts, yields, reg2 overwrites activeContext,
    // causing reg1 to persist reg2's payload under reg1's key.
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {},
      sleepFn: fastSleep
    });

    const reg1: RegistrationPayload = {
      id: 'reg-alice',
      name: 'Alice',
      email: 'alice@sves.org.in',
      eventId: 'gdg-devfest',
      registeredAt: '2026-09-08T10:00:00Z'
    };

    const reg2: RegistrationPayload = {
      id: 'reg-bob',
      name: 'Bob',
      email: 'bob@sves.org.in',
      eventId: 'gdg-devfest',
      registeredAt: '2026-09-08T10:00:01Z'
    };

    // Trigger concurrently
    await Promise.all([
      dispatcher.processRegistration(reg1),
      dispatcher.processRegistration(reg2)
    ]);

    const store = dispatcher.getStore();
    const storedAlice = store.get('reg-alice');
    const storedBob = store.get('reg-bob');

    assert.ok(storedAlice);
    assert.ok(storedBob);
    assert.equal(storedAlice.name, 'Alice');
    assert.equal(storedAlice.email, 'alice@sves.org.in');
    assert.equal(storedBob.name, 'Bob');
    assert.equal(storedBob.email, 'bob@sves.org.in');
  });

  it('TEST 3 — Webhook Success (Immediate)', async () => {
    let callCount = 0;
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {
        callCount++;
      },
      sleepFn: fastSleep
    });

    const reg: RegistrationPayload = {
      id: 'reg-success',
      name: 'Success User',
      email: 'user@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:30:00Z'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true);
    assert.equal(callCount, 1);

    const logs = dispatcher.getLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].id, 'reg-success');
    assert.equal(logs[0].status, 'DELIVERED');
    assert.equal(logs[0].attempts, 1);
  });

  it('TEST 4 — One Transient Failure (503 -> 200)', async () => {
    let callCount = 0;
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('503 Service Unavailable');
        }
      },
      sleepFn: fastSleep
    });

    const reg: RegistrationPayload = {
      id: 'reg-transient-1',
      name: 'Retry User',
      email: 'retry@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:30:00Z'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true);
    assert.equal(callCount, 2);

    const logs = dispatcher.getLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].id, 'reg-transient-1');
    assert.equal(logs[0].status, 'DELIVERED');
    assert.equal(logs[0].attempts, 2);
  });

  it('TEST 5 — Multiple Transient Failures (503 -> 503 -> 200)', async () => {
    let callCount = 0;
    const delaysRecorded: number[] = [];

    const dispatcher = new EventDispatcher(
      { ...baseConfig, maxRetries: 4, baseDelayMs: 10, maxDelayMs: 100 },
      {
        networkSender: async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('503 Service Unavailable');
          }
        },
        sleepFn: async (ms) => {
          delaysRecorded.push(ms);
        }
      }
    );

    const reg: RegistrationPayload = {
      id: 'reg-multi-transient',
      name: 'Multi Retry',
      email: 'multi@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:30:00Z'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true);
    assert.equal(callCount, 3);
    assert.deepEqual(delaysRecorded, [10, 20]); // attempt 2: 10*1, attempt 3: 10*2

    const logs = dispatcher.getLogs();
    assert.equal(logs[0].status, 'DELIVERED');
    assert.equal(logs[0].attempts, 3);
  });

  it('TEST 6 — Permanent Failure (All Retries Exhausted, No Unhandled Rejection)', async () => {
    let callCount = 0;
    const dispatcher = new EventDispatcher(
      { ...baseConfig, maxRetries: 3 },
      {
        networkSender: async () => {
          callCount++;
          throw new Error('500 Internal Server Error');
        },
        sleepFn: fastSleep
      }
    );

    const reg: RegistrationPayload = {
      id: 'reg-fail',
      name: 'Failing User',
      email: 'fail@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:30:00Z'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true); // Registration was stored even though downstream webhook failed
    assert.equal(callCount, 3);

    const logs = dispatcher.getLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 'FAILED');
    assert.equal(logs[0].attempts, 3);
    assert.equal(logs[0].error, '500 Internal Server Error');

    // Verify registration remains safely preserved in store despite webhook failure
    const store = dispatcher.getStore();
    assert.ok(store.has('reg-fail'));
  });

  it('TEST 7 — Network Timeout Handling & Retry', async () => {
    let attempts = 0;
    const dispatcher = new EventDispatcher(
      { ...baseConfig, maxRetries: 2, timeoutMs: 20 },
      {
        networkSender: async () => {
          attempts++;
          if (attempts === 1) {
            // Simulate hanging network request longer than timeoutMs
            await new Promise((resolve) => setTimeout(resolve, 60));
          }
        },
        sleepFn: fastSleep
      }
    );

    const reg: RegistrationPayload = {
      id: 'reg-timeout',
      name: 'Timeout User',
      email: 'timeout@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:30:00Z'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true);
    assert.equal(attempts, 2);

    const logs = dispatcher.getLogs();
    assert.equal(logs[0].status, 'DELIVERED');
    assert.equal(logs[0].attempts, 2);
  });

  it('TEST 8 — Invalid / Malformed Timestamps Rejected Cleanly', async () => {
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {},
      sleepFn: fastSleep
    });

    const invalidTimestamps = [
      'not-a-date',
      '2026-09-08 14:00:00', // Missing 'T' and timezone
      '2026-13-45T99:99:99Z',
      '2026-09-08',
      ''
    ];

    for (const ts of invalidTimestamps) {
      const res = await dispatcher.processRegistration({
        id: `reg-invalid-${Math.random()}`,
        name: 'Bad Timestamp',
        email: 'bad@sves.org.in',
        eventId: 'event-1',
        registeredAt: ts
      });
      assert.equal(res, false, `Timestamp '${ts}' should be rejected`);
    }

    assert.equal(dispatcher.getStore().size, 0);
  });

  it('TEST 9 — Valid UTC Timestamp Parsed and Verified', async () => {
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {},
      sleepFn: fastSleep
    });

    const reg: RegistrationPayload = {
      id: 'reg-utc',
      name: 'UTC Attendee',
      email: 'utc@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:00:00Z'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true);

    const record = dispatcher.getStore().get('reg-utc');
    assert.ok(record);
    const parsedEpoch = new Date(record.registeredAt).getTime();
    assert.equal(parsedEpoch, Date.UTC(2026, 8, 8, 14, 0, 0));
  });

  it('TEST 10 — Indian Standard Time (IST +05:30) Offset Preserved', async () => {
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {},
      sleepFn: fastSleep
    });

    const reg: RegistrationPayload = {
      id: 'reg-ist',
      name: 'SVEC Student',
      email: 'student@sves.org.in',
      eventId: 'event-svec',
      registeredAt: '2026-09-08T14:00:00+05:30'
    };

    const ok = await dispatcher.processRegistration(reg);
    assert.equal(ok, true);

    const record = dispatcher.getStore().get('reg-ist');
    assert.ok(record);
    // 14:00:00+05:30 equals 08:30:00 UTC
    const dateObj = new Date(record.registeredAt);
    assert.equal(dateObj.toISOString(), '2026-09-08T08:30:00.000Z');
  });

  it('TEST 11 — Concurrent Webhook Failures Isolated Between Registrations', async () => {
    const dispatcher = new EventDispatcher(
      { ...baseConfig, maxRetries: 2 },
      {
        networkSender: async (_url, data) => {
          if (data.id === 'reg-fail-user') {
            throw new Error('Destination Unreachable');
          }
        },
        sleepFn: fastSleep
      }
    );

    const regSuccess: RegistrationPayload = {
      id: 'reg-ok-user',
      name: 'Good User',
      email: 'good@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:00:00Z'
    };

    const regFail: RegistrationPayload = {
      id: 'reg-fail-user',
      name: 'Failing User',
      email: 'failing@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:00:00Z'
    };

    const [res1, res2] = await Promise.all([
      dispatcher.processRegistration(regSuccess),
      dispatcher.processRegistration(regFail)
    ]);

    assert.equal(res1, true);
    assert.equal(res2, true);

    const logs = dispatcher.getLogs();
    const okLog = logs.find((l) => l.id === 'reg-ok-user');
    const failLog = logs.find((l) => l.id === 'reg-fail-user');

    assert.ok(okLog);
    assert.equal(okLog.status, 'DELIVERED');
    assert.ok(failLog);
    assert.equal(failLog.status, 'FAILED');
  });

  it('TEST 12 — Duplicate Registration ID Rejected Cleanly', async () => {
    const dispatcher = new EventDispatcher(baseConfig, {
      networkSender: async () => {},
      sleepFn: fastSleep
    });

    const regOriginal: RegistrationPayload = {
      id: 'reg-duplicate-id',
      name: 'Original Person',
      email: 'orig@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:00:00Z'
    };

    const regDuplicate: RegistrationPayload = {
      id: 'reg-duplicate-id',
      name: 'Impostor Person',
      email: 'impostor@sves.org.in',
      eventId: 'event-1',
      registeredAt: '2026-09-08T14:05:00Z'
    };

    const firstResult = await dispatcher.processRegistration(regOriginal);
    const secondResult = await dispatcher.processRegistration(regDuplicate);

    assert.equal(firstResult, true);
    assert.equal(secondResult, false);

    const store = dispatcher.getStore();
    assert.equal(store.size, 1);
    assert.equal(store.get('reg-duplicate-id')?.name, 'Original Person');
  });
});
