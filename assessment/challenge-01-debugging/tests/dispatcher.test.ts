import { EventDispatcher, RegistrationPayload, WebhookConfig } from '../src/dispatcher';

describe('EventDispatcher - Regression and Core Functionality Tests', () => {
  const defaultConfig: WebhookConfig = {
    targetUrl: 'https://discord.com/api/webhooks/123456789',
    maxRetries: 3,
    timeoutMs: 1000,
    backoffBaseMs: 1, // Keep test delays minimal (1ms) for fast execution
  };

  class TestableDispatcher extends EventDispatcher {
    public networkSendMock = jest.fn();

    protected async mockNetworkSend(url: string, data: RegistrationPayload): Promise<void> {
      return this.networkSendMock(url, data);
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Single valid registration
  test('1. Single valid registration succeeds and stores record', async () => {
    const dispatcher = new TestableDispatcher(defaultConfig);
    dispatcher.networkSendMock.mockResolvedValue(undefined);

    const payload: RegistrationPayload = {
      id: 'reg-001',
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      eventId: 'devfest-2026',
      registeredAt: '2026-09-08T10:00:00Z',
    };

    const result = await dispatcher.processRegistration(payload);
    expect(result).toBe(true);

    const store = dispatcher.getStore();
    expect(store.size).toBe(1);
    expect(store.get('reg-001')).toEqual(payload);
  });

  // Test 2: 50+ concurrent registrations using Promise.all
  test('2. 50 concurrent registrations process cleanly without state pollution or race conditions', async () => {
    const dispatcher = new TestableDispatcher(defaultConfig);
    dispatcher.networkSendMock.mockResolvedValue(undefined);

    const CONCURRENCY_COUNT = 50;
    const payloads: RegistrationPayload[] = Array.from({ length: CONCURRENCY_COUNT }, (_, i) => ({
      id: `user-${i + 1}`,
      name: `Attendee ${i + 1}`,
      email: `user${i + 1}@example.com`,
      eventId: 'devfest-2026',
      registeredAt: new Date(Date.now() + i * 1000).toISOString(),
    }));

    const results = await Promise.all(payloads.map((p) => dispatcher.processRegistration(p)));

    expect(results.every((r) => r === true)).toBe(true);

    const store = dispatcher.getStore();
    expect(store.size).toBe(CONCURRENCY_COUNT);

    // Verify every registration retains its exact uncorrupted payload
    payloads.forEach((expectedPayload) => {
      const stored = store.get(expectedPayload.id);
      expect(stored).toBeDefined();
      expect(stored?.name).toBe(expectedPayload.name);
      expect(stored?.email).toBe(expectedPayload.email);
    });
  });

  // Test 3: Valid ISO-8601 timestamp with IST timezone offset (+05:30)
  test('3. Correctly handles valid ISO-8601 timestamps with IST timezone offsets (+05:30)', async () => {
    const dispatcher = new TestableDispatcher(defaultConfig);
    dispatcher.networkSendMock.mockResolvedValue(undefined);

    const payload: RegistrationPayload = {
      id: 'reg-ist-001',
      name: 'Ananya Verma',
      email: 'ananya@example.com',
      eventId: 'devfest-2026',
      registeredAt: '2026-09-08T15:30:00+05:30', // Indian Standard Time
    };

    const result = await dispatcher.processRegistration(payload);
    expect(result).toBe(true);
    expect(dispatcher.getStore().get('reg-ist-001')).toBeDefined();
  });

  // Test 4: Invalid timestamp rejection/handling
  test('4. Explicitly handles and rejects invalid timestamps by throwing an error', async () => {
    const dispatcher = new TestableDispatcher(defaultConfig);

    const invalidPayload: RegistrationPayload = {
      id: 'reg-invalid-date',
      name: 'Bad Date User',
      email: 'bad@example.com',
      eventId: 'devfest-2026',
      registeredAt: 'not-a-valid-date-string',
    };

    await expect(dispatcher.processRegistration(invalidPayload)).rejects.toThrow(
      'Invalid ISO-8601 timestamp'
    );
  });

  // Test 5: Webhook succeeds on first attempt
  test('5. Webhook succeeds on first attempt and logs DELIVERED status', async () => {
    const dispatcher = new TestableDispatcher(defaultConfig);
    dispatcher.networkSendMock.mockResolvedValue(undefined);

    const payload: RegistrationPayload = {
      id: 'reg-webhook-1',
      name: 'Suresh Kumar',
      email: 'suresh@example.com',
      eventId: 'devfest-2026',
      registeredAt: '2026-09-08T10:00:00Z',
    };

    await dispatcher.processRegistration(payload);

    // Wait microtask loop for background webhook to settle
    await new Promise((res) => setTimeout(res, 20));

    const logs = dispatcher.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({
      id: 'reg-webhook-1',
      status: 'DELIVERED',
      attempts: 1,
    });
  });

  // Test 6: Webhook fails transiently and succeeds after retries
  test('6. Webhook retries transient failures and eventually succeeds', async () => {
    const dispatcher = new TestableDispatcher(defaultConfig);

    // Fail twice with 503, succeed on 3rd attempt
    dispatcher.networkSendMock
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce(undefined);

    const payload: RegistrationPayload = {
      id: 'reg-webhook-retry',
      name: 'Priya Nair',
      email: 'priya@example.com',
      eventId: 'devfest-2026',
      registeredAt: '2026-09-08T10:00:00Z',
    };

    await dispatcher.processRegistration(payload);

    // Wait for retries to complete
    await new Promise((res) => setTimeout(res, 50));

    expect(dispatcher.networkSendMock).toHaveBeenCalledTimes(3);

    const logs = dispatcher.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({
      id: 'reg-webhook-retry',
      status: 'DELIVERED',
      attempts: 3,
    });
  });

  // Test 7: Exponential backoff behavior verification
  test('7. Verifies exponential backoff delay timing between webhook retries', async () => {
    const backoffConfig: WebhookConfig = {
      targetUrl: 'https://example.com/webhook',
      maxRetries: 3,
      timeoutMs: 1000,
      backoffBaseMs: 50, // 50ms base delay -> attempt 1 fails -> wait 50ms -> attempt 2 fails -> wait 100ms -> attempt 3
    };

    const dispatcher = new TestableDispatcher(backoffConfig);
    const attemptTimestamps: number[] = [];

    dispatcher.networkSendMock.mockImplementation(async () => {
      attemptTimestamps.push(Date.now());
      if (attemptTimestamps.length < 3) {
        throw new Error('503 Transient Error');
      }
    });

    const payload: RegistrationPayload = {
      id: 'reg-backoff',
      name: 'Backoff Test',
      email: 'backoff@example.com',
      eventId: 'devfest-2026',
      registeredAt: '2026-09-08T10:00:00Z',
    };

    await dispatcher.processRegistration(payload);
    await new Promise((res) => setTimeout(res, 300));

    expect(attemptTimestamps).toHaveLength(3);

    const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
    const delay2 = attemptTimestamps[2] - attemptTimestamps[1];

    // Attempt 1 -> Attempt 2 delay should be ~50ms (>= 40ms)
    // Attempt 2 -> Attempt 3 delay should be ~100ms (>= 80ms)
    expect(delay1).toBeGreaterThanOrEqual(40);
    expect(delay2).toBeGreaterThanOrEqual(80);
    expect(delay2).toBeGreaterThan(delay1);
  });

  // Test 8 & 9: Permanent failure after max retries does NOT cause unhandled rejections or crash
  test('8 & 9. Logs permanent FAILED status after max retries without crashing process or throwing unhandled rejection', async () => {
    const unhandledRejectionSpy = jest.fn();
    process.on('unhandledRejection', unhandledRejectionSpy);

    const dispatcher = new TestableDispatcher(defaultConfig);
    dispatcher.networkSendMock.mockRejectedValue(new Error('504 Gateway Timeout'));

    const payload: RegistrationPayload = {
      id: 'reg-webhook-fail',
      name: 'Failing User',
      email: 'fail@example.com',
      eventId: 'devfest-2026',
      registeredAt: '2026-09-08T10:00:00Z',
    };

    // Should resolve successfully for the caller even if background webhook fails
    await expect(dispatcher.processRegistration(payload)).resolves.toBe(true);

    // Allow background retry loop to finish
    await new Promise((res) => setTimeout(res, 50));

    expect(dispatcher.networkSendMock).toHaveBeenCalledTimes(defaultConfig.maxRetries);

    const logs = dispatcher.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({
      id: 'reg-webhook-fail',
      status: 'FAILED',
      attempts: 3,
      error: '504 Gateway Timeout',
    });

    expect(unhandledRejectionSpy).not.toHaveBeenCalled();
    process.removeListener('unhandledRejection', unhandledRejectionSpy);
  });
});
