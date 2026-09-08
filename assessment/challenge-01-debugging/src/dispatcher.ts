export interface RegistrationPayload {
  id: string;
  name: string;
  email: string;
  eventId: string;
  registeredAt: string; // ISO 8601
}

export interface WebhookConfig {
  targetUrl: string;
  maxRetries: number;
  timeoutMs: number;
  backoffBaseMs?: number; // Optional base delay in ms for exponential backoff (default: 100)
}

export interface WebhookLog {
  id: string;
  status: 'DELIVERED' | 'FAILED';
  attempts: number;
  error?: string;
}

export class EventDispatcher {
  // Store registrations securely by ID (no shared activeContext)
  private registrationStore: Map<string, RegistrationPayload> = new Map();
  private webhookLogs: WebhookLog[] = [];

  constructor(private config: WebhookConfig) {}

  public async processRegistration(payload: RegistrationPayload): Promise<boolean> {
    // 1. Explicit Validation: Validate input payload and timestamp
    if (!payload || !payload.id || !payload.registeredAt || typeof payload.registeredAt !== 'string') {
      throw new Error('Invalid registration payload: missing required fields or timestamp');
    }

    // 2. Parse & validate ISO-8601 timestamp (handles UTC and offsets like +05:30)
    const regDate = new Date(payload.registeredAt);
    if (isNaN(regDate.getTime())) {
      throw new Error(`Invalid ISO-8601 timestamp: "${payload.registeredAt}"`);
    }

    // 3. Simulate async database validation / latency
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

    // 4. Safely persist registration locally using request-scoped payload
    const record: RegistrationPayload = { ...payload };
    this.registrationStore.set(record.id, record);

    // 5. Trigger async webhook in background without unhandled rejections
    this.dispatchWebhook(record.id).catch((err) => {
      console.error(`Unhandled error in webhook background task for ID ${record.id}:`, err);
    });

    return true;
  }

  private async dispatchWebhook(registrationId: string): Promise<void> {
    try {
      const record = this.registrationStore.get(registrationId);
      if (!record) {
        return;
      }

      let attempts = 0;
      let delivered = false;
      const maxRetries = Math.max(1, this.config.maxRetries);
      const backoffBase = this.config.backoffBaseMs ?? 100;

      while (attempts < maxRetries && !delivered) {
        attempts++;
        try {
          await this.mockNetworkSend(this.config.targetUrl, record);
          delivered = true;
          this.webhookLogs.push({ id: registrationId, status: 'DELIVERED', attempts });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);

          if (attempts >= maxRetries) {
            // Log permanent failure after exhausting retries
            this.webhookLogs.push({
              id: registrationId,
              status: 'FAILED',
              attempts,
              error: errorMessage,
            });
          } else {
            // Exponential backoff: base * 2^(attempts - 1)
            const delay = backoffBase * Math.pow(2, attempts - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    } catch (outerErr: unknown) {
      // Prevent any unhandled rejection from bubbling up
      console.error(`Fatal error in webhook processing for ${registrationId}:`, outerErr);
    }
  }

  protected async mockNetworkSend(url: string, data: RegistrationPayload): Promise<void> {
    // Simulates network latency and transient errors
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (Math.random() < 0.3) {
      throw new Error('503 Service Unavailable');
    }
  }

  public getStore(): Map<string, RegistrationPayload> {
    return this.registrationStore;
  }

  public getLogs(): WebhookLog[] {
    return this.webhookLogs;
  }
}
