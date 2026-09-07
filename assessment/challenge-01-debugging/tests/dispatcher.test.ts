// dispatcher.test.ts - Comprehensive Regression Test Suite for EventDispatcher
import { EventDispatcher, RegistrationPayload } from '../src/dispatcher';

describe('Challenge 01: EventDispatcher Concurrency & Webhook Retries', () => {
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    dispatcher = new EventDispatcher({
      targetUrl: 'https://api.gdgsvec.org/webhooks/rsvp',
      maxRetries: 3,
      initialBackoffMs: 2,
    });
  });

  describe('Basic Validation & Registration', () => {
    test('should successfully register a valid attendee with UTC timestamp', async () => {
      const payload: RegistrationPayload = {
        id: 'reg-001',
        name: 'Arjun Sharma',
        email: 'arjun.sharma@svec.edu.in',
        eventId: 'devfest-2026',
        registeredAt: '2026-09-07T10:30:00Z',
      };

      const result = await dispatcher.processRegistration(payload);
      expect(result.success).toBe(true);
      expect(result.registrationId).toBe('reg-001');

      const stored = dispatcher.getRegistration('reg-001');
      expect(stored).toBeDefined();
      expect(stored?.name).toBe('Arjun Sharma');
      expect(stored?.email).toBe('arjun.sharma@svec.edu.in');
    });

    test('should reject malformed or missing fields', async () => {
      const badPayload = {
        id: '',
        name: 'Test',
        email: 'bad-email',
        eventId: 'e1',
        registeredAt: '2026-09-07T10:30:00Z',
      };

      const result = await dispatcher.processRegistration(badPayload as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject invalid non-ISO timestamps', async () => {
      const badTimePayload: RegistrationPayload = {
        id: 'reg-bad-time',
        name: 'Invalid Date User',
        email: 'badtime@svec.edu.in',
        eventId: 'e1',
        registeredAt: 'invalid-date-string',
      };

      const result = await dispatcher.processRegistration(badTimePayload);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ISO-8601');
    });

    test('should accept Indian Standard Time (+05:30) and negative offsets (-04:00)', async () => {
      const istPayload: RegistrationPayload = {
        id: 'reg-ist',
        name: 'IST User',
        email: 'ist@svec.edu.in',
        eventId: 'e1',
        registeredAt: '2026-09-07T16:00:00+05:30',
      };
      const negPayload: RegistrationPayload = {
        id: 'reg-neg',
        name: 'EST User',
        email: 'est@svec.edu.in',
        eventId: 'e1',
        registeredAt: '2026-09-07T10:30:00-04:00',
      };

      const resIst = await dispatcher.processRegistration(istPayload);
      const resNeg = await dispatcher.processRegistration(negPayload);

      expect(resIst.success).toBe(true);
      expect(resNeg.success).toBe(true);
    });
  });

  describe('Concurrency & State Isolation (50 Simultaneous Requests)', () => {
    test('should handle 50 concurrent registrations with zero state collisions or data loss', async () => {
      const customDispatcher = new EventDispatcher(
        {
          targetUrl: 'https://webhook.svec.edu.in',
          maxRetries: 2,
          initialBackoffMs: 1,
        },
        async () => {
          // Fast mock sender
          await new Promise((r) => setTimeout(r, 2));
        }
      );

      const promises = Array.from({ length: 50 }, (_, i) => {
        const payload: RegistrationPayload = {
          id: `concurrent-id-${i}`,
          name: `Candidate Name ${i}`,
          email: `student${i}@svec.edu.in`,
          eventId: `event-track-${i % 4}`,
          registeredAt: '2026-09-07T10:30:00+05:30',
        };
        return customDispatcher.processRegistration(payload).then((res) => ({ res, payload }));
      });

      const results = await Promise.all(promises);

      const store = customDispatcher.getStore();
      expect(store.size).toBe(50);

      results.forEach(({ res, payload }) => {
        expect(res.success).toBe(true);
        const record = store.get(payload.id);
        expect(record).toBeDefined();
        expect(record?.name).toBe(payload.name);
        expect(record?.email).toBe(payload.email);
        expect(record?.eventId).toBe(payload.eventId);
      });
    });
  });

  describe('Webhook Retries, Exponential Backoff & Failure Isolation', () => {
    test('should retry on transient failures and mark DELIVERED upon eventual success', async () => {
      let callCount = 0;
      const customSender = async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('503 Service Unavailable');
        }
      };

      const customDispatcher = new EventDispatcher(
        {
          targetUrl: 'https://webhook.svec.edu.in',
          maxRetries: 3,
          initialBackoffMs: 2,
          backoffFactor: 2,
        },
        customSender
      );

      const payload: RegistrationPayload = {
        id: 'retry-test-1',
        name: 'Retry Attendee',
        email: 'retry@svec.edu.in',
        eventId: 'devfest',
        registeredAt: '2026-09-07T12:00:00Z',
      };

      const result = await customDispatcher.processRegistration(payload);
      expect(result.success).toBe(true);
      expect(callCount).toBe(3);

      const logs = customDispatcher.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('DELIVERED');
      expect(logs[0].attempts).toBe(3);
    });

    test('should gracefully handle retry exhaustion without dropping persisted registration record', async () => {
      let callCount = 0;
      const failingSender = async () => {
        callCount++;
        throw new Error('500 Permanent Server Error');
      };

      const customDispatcher = new EventDispatcher(
        {
          targetUrl: 'https://webhook.svec.edu.in',
          maxRetries: 3,
          initialBackoffMs: 2,
        },
        failingSender
      );

      const payload: RegistrationPayload = {
        id: 'fail-test-1',
        name: 'Failure Protected Attendee',
        email: 'isolated@svec.edu.in',
        eventId: 'devfest',
        registeredAt: '2026-09-07T12:00:00Z',
      };

      const result = await customDispatcher.processRegistration(payload);
      expect(result.success).toBe(true);
      expect(callCount).toBe(3);

      // Registration is retained safely
      expect(customDispatcher.getRegistration('fail-test-1')).toBeDefined();

      const logs = customDispatcher.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('FAILED');
      expect(logs[0].attempts).toBe(3);
    });
  });
});
