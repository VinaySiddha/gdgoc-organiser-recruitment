// dispatcher.ts - Fixed & Hardened Implementation
// Eliminates shared mutable state, supports ISO-8601 timezone offsets, handles retries with exponential backoff

export interface RegistrationPayload {
  id: string;
  name: string;
  email: string;
  eventId: string;
  registeredAt: string; // ISO 8601 formatted timestamp (e.g. 2026-09-07T10:30:00Z or 2026-09-07T16:00:00+05:30)
}

export interface WebhookConfig {
  targetUrl: string;
  maxRetries: number;
  timeoutMs?: number;
  initialBackoffMs?: number;
  backoffFactor?: number;
}

export interface WebhookLogEntry {
  id: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  attempts: number;
  error?: string;
  timestamp: string;
}

export interface DispatcherResult {
  success: boolean;
  registrationId?: string;
  error?: string;
}

export class EventDispatcher {
  // Storage is keyed by registration ID; no shared activeContext across requests
  private registrationStore: Map<string, RegistrationPayload> = new Map();
  private webhookLogs: Array<WebhookLogEntry> = [];
  private readonly config: Required<WebhookConfig>;

  // Dependency-injected network send and sleep functions for testability and deterministic timings
  private networkSender: (url: string, data: RegistrationPayload) => Promise<void>;
  private sleepFn: (ms: number) => Promise<void>;

  constructor(
    config: WebhookConfig,
    customNetworkSender?: (url: string, data: RegistrationPayload) => Promise<void>,
    customSleepFn?: (ms: number) => Promise<void>
  ) {
    this.config = {
      targetUrl: config.targetUrl,
      maxRetries: Math.max(1, config.maxRetries),
      timeoutMs: config.timeoutMs ?? 5000,
      initialBackoffMs: config.initialBackoffMs ?? 50,
      backoffFactor: config.backoffFactor ?? 2,
    };

    this.networkSender = customNetworkSender || this.defaultMockNetworkSend.bind(this);
    this.sleepFn = customSleepFn || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /**
   * Validates ISO-8601 timestamp string including full timezone offsets (+HH:MM, -HH:MM, Z).
   */
  public isValidIso8601(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') return false;
    // Strict ISO 8601 regex pattern
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    if (!isoPattern.test(dateStr)) return false;

    const parsed = new Date(dateStr);
    return !isNaN(parsed.getTime());
  }

  /**
   * Validates the registration payload fields.
   */
  public validatePayload(payload: RegistrationPayload): { valid: boolean; error?: string } {
    if (!payload) {
      return { valid: false, error: 'Missing registration payload' };
    }
    if (!payload.id || typeof payload.id !== 'string' || payload.id.trim() === '') {
      return { valid: false, error: 'Invalid or missing registration ID' };
    }
    if (!payload.name || typeof payload.name !== 'string' || payload.name.trim() === '') {
      return { valid: false, error: 'Invalid or missing attendee name' };
    }
    if (!payload.email || typeof payload.email !== 'string' || !payload.email.includes('@')) {
      return { valid: false, error: 'Invalid or missing attendee email' };
    }
    if (!payload.eventId || typeof payload.eventId !== 'string' || payload.eventId.trim() === '') {
      return { valid: false, error: 'Invalid or missing event ID' };
    }
    if (!this.isValidIso8601(payload.registeredAt)) {
      return { valid: false, error: `Invalid ISO-8601 registration timestamp: ${payload.registeredAt}` };
    }
    return { valid: true };
  }

  /**
   * Processes an incoming event registration safely without shared mutable context.
   * Isolates request data and handles webhook delivery asynchronously with lifecycle guarantees.
   */
  public async processRegistration(payload: RegistrationPayload): Promise<DispatcherResult> {
    // 1. Validate payload
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 2. Clone locally to ensure complete immutability per request context
    const localRecord: RegistrationPayload = {
      id: payload.id.trim(),
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      eventId: payload.eventId.trim(),
      registeredAt: payload.registeredAt.trim(),
    };

    // 3. Persist registration record safely in store
    this.registrationStore.set(localRecord.id, localRecord);

    // 4. Managed asynchronous webhook dispatch with error boundary
    await this.dispatchWebhook(localRecord);

    return { success: true, registrationId: localRecord.id };
  }

  /**
   * Dispatches webhook with configurable exponential backoff retry mechanism.
   */
  public async dispatchWebhook(record: RegistrationPayload): Promise<WebhookLogEntry> {
    let attempts = 0;
    let delivered = false;
    let lastError = '';

    while (attempts < this.config.maxRetries && !delivered) {
      attempts++;
      try {
        const sendPromise = this.networkSender(this.config.targetUrl, record);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Webhook dispatch timed out after ${this.config.timeoutMs}ms`)), this.config.timeoutMs);
        });
        await Promise.race([sendPromise, timeoutPromise]);
        delivered = true;
        const entry: WebhookLogEntry = {
          id: record.id,
          status: 'DELIVERED',
          attempts,
          timestamp: new Date().toISOString(),
        };
        this.webhookLogs.push(entry);
        return entry;
      } catch (err: any) {
        lastError = err?.message || 'Network dispatch error';

        if (attempts < this.config.maxRetries) {
          // Exponential backoff delay calculation: initialBackoffMs * (backoffFactor ^ (attempts - 1))
          const delayMs = this.config.initialBackoffMs * Math.pow(this.config.backoffFactor, attempts - 1);
          await this.sleepFn(delayMs);
        }
      }
    }

    // If max retries exhausted without delivery
    const failedEntry: WebhookLogEntry = {
      id: record.id,
      status: 'FAILED',
      attempts,
      error: lastError,
      timestamp: new Date().toISOString(),
    };
    this.webhookLogs.push(failedEntry);
    return failedEntry;
  }

  /**
   * Default mock network sender simulating transient errors.
   */
  private async defaultMockNetworkSend(url: string, data: RegistrationPayload): Promise<void> {
    await this.sleepFn(10);
    if (Math.random() < 0.25) {
      throw new Error('503 Service Unavailable: Downstream webhook timed out');
    }
  }

  public getStore(): Map<string, RegistrationPayload> {
    return new Map(this.registrationStore);
  }

  public getRegistration(id: string): RegistrationPayload | undefined {
    return this.registrationStore.get(id);
  }

  public getLogs(): Array<WebhookLogEntry> {
    return [...this.webhookLogs];
  }

  public clear(): void {
    this.registrationStore.clear();
    this.webhookLogs = [];
  }
}
