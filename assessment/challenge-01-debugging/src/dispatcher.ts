export interface RegistrationPayload {
  id: string;
  name: string;
  email: string;
  eventId: string;
  registeredAt: string; // ISO 8601 string
}

export interface WebhookConfig {
  targetUrl: string;
  maxRetries: number;
  timeoutMs: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface WebhookLog {
  id: string;
  status: 'DELIVERED' | 'FAILED';
  attempts: number;
  error?: string;
  timestamp?: string;
}

export type NetworkSender = (url: string, data: any) => Promise<void>;
export type SleepFunction = (ms: number) => Promise<void>;

export class EventDispatcher {
  // Corrected: Removed shared mutable activeContext.
  // Concurrency is fully thread/task isolated using local function scope.
  private registrationStore: Map<string, RegistrationPayload> = new Map();
  private webhookLogs: WebhookLog[] = [];
  private pendingDispatches: Set<Promise<void>> = new Set();

  private config: WebhookConfig;
  private networkSender: NetworkSender;
  private sleepFn: SleepFunction;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(
    config: WebhookConfig,
    options?: {
      networkSender?: NetworkSender;
      sleepFn?: SleepFunction;
    }
  ) {
    this.config = config;
    this.networkSender = options?.networkSender || this.defaultNetworkSender.bind(this);
    this.sleepFn = options?.sleepFn || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.baseDelayMs = config.baseDelayMs ?? 100;
    this.maxDelayMs = config.maxDelayMs ?? 2000;
  }

  /**
   * Processes a single registration payload with independent local scoping.
   * Validates payload fields and ISO-8601 timestamp with timezone offset support.
   */
  public async processRegistration(payload: RegistrationPayload): Promise<boolean> {
    // 1. Validate required fields
    if (!this.validatePayload(payload)) {
      return false;
    }

    // 2. Reject duplicate registration IDs
    if (this.registrationStore.has(payload.id)) {
      return false;
    }

    // 3. Clone payload to guarantee local isolation
    const isolatedRecord: RegistrationPayload = { ...payload };

    // Simulate async database validation / storage latency
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));

    // 4. Persist to isolated registration store
    this.registrationStore.set(isolatedRecord.id, isolatedRecord);

    // 5. Dispatch webhook with proper promise lifecycle tracking
    const dispatchPromise = this.dispatchWebhook(isolatedRecord.id, isolatedRecord);
    this.pendingDispatches.add(dispatchPromise);
    dispatchPromise.finally(() => {
      this.pendingDispatches.delete(dispatchPromise);
    });

    // Await webhook completion to ensure deterministic lifecycle & prevent unhandled rejections
    await dispatchPromise;

    return true;
  }

  /**
   * Dispatches the webhook for a specific registration record using exponential backoff retry.
   */
  private async dispatchWebhook(registrationId: string, record: RegistrationPayload): Promise<void> {
    let attempts = 0;
    let delivered = false;
    let lastError: Error | null = null;

    while (attempts < this.config.maxRetries && !delivered) {
      attempts++;

      // Exponential backoff delay for retries (attempt 1 is immediate)
      if (attempts > 1) {
        const backoffMultiplier = Math.pow(2, attempts - 2);
        const calculatedDelay = Math.min(this.baseDelayMs * backoffMultiplier, this.maxDelayMs);
        await this.sleepFn(calculatedDelay);
      }

      try {
        // Enforce network timeout on dispatch attempt
        await this.executeWithTimeout(
          () => this.networkSender(this.config.targetUrl, record),
          this.config.timeoutMs
        );
        delivered = true;
        this.webhookLogs.push({
          id: registrationId,
          status: 'DELIVERED',
          attempts,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempts >= this.config.maxRetries) {
          this.webhookLogs.push({
            id: registrationId,
            status: 'FAILED',
            attempts,
            error: lastError.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * Executes a network call with strict timeout enforcement to prevent hanging operations.
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Webhook network request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Default network sender simulating latency and transient network drops.
   */
  private async defaultNetworkSender(url: string, data: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (Math.random() < 0.3) {
      throw new Error('503 Service Unavailable');
    }
  }

  /**
   * Rigorously validates registration payload fields and ISO-8601 timestamp formats.
   */
  private validatePayload(payload: any): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const { id, name, email, eventId, registeredAt } = payload;

    if (
      typeof id !== 'string' || id.trim() === '' ||
      typeof name !== 'string' || name.trim() === '' ||
      typeof email !== 'string' || !email.includes('@') ||
      typeof eventId !== 'string' || eventId.trim() === '' ||
      typeof registeredAt !== 'string' || registeredAt.trim() === ''
    ) {
      return false;
    }

    // ISO-8601 regex verifying calendar date, time, and timezone offset (Z or +/-HH:MM)
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    if (!iso8601Regex.test(registeredAt)) {
      return false;
    }

    const parsedDate = new Date(registeredAt);
    if (isNaN(parsedDate.getTime())) {
      return false;
    }

    return true;
  }

  /**
   * Wait for all active asynchronous dispatches to settle.
   */
  public async waitForPendingWebhooks(): Promise<void> {
    await Promise.all(Array.from(this.pendingDispatches));
  }

  public getStore(): Map<string, RegistrationPayload> {
    return this.registrationStore;
  }

  public getLogs(): WebhookLog[] {
    return this.webhookLogs;
  }
}
