import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

interface WebhookDeliveryOptions {
  url: string;
  payload: Record<string, unknown>;
  secret: string;
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  attempts: number;
  error?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  async deliver(
    options: WebhookDeliveryOptions,
  ): Promise<WebhookDeliveryResult> {
    const { url, payload, secret } = options;
    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const signature = this.sign(`${timestamp}.${body}`, secret);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Timestamp': timestamp,
          },
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout per request
        });

        if (response.ok) {
          this.logger.log(
            `Webhook delivered to ${url} (attempt ${attempt}, status ${response.status})`,
          );
          return {
            success: true,
            statusCode: response.status,
            attempts: attempt,
          };
        }

        // 4xx: client error — do NOT retry
        if (response.status >= 400 && response.status < 500) {
          this.logger.warn(
            `Webhook to ${url} returned ${response.status} (client error, not retrying)`,
          );
          return {
            success: false,
            statusCode: response.status,
            attempts: attempt,
            error: `Client error: ${response.status}`,
          };
        }

        // 5xx: server error — retry
        this.logger.warn(
          `Webhook to ${url} returned ${response.status} (attempt ${attempt}/${this.MAX_RETRIES})`,
        );
      } catch (error) {
        // Network error — retry
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Webhook to ${url} failed (attempt ${attempt}/${this.MAX_RETRIES}): ${errorMessage}`,
        );
      }

      // Wait before retrying (exponential backoff: 1s, 2s, 4s)
      if (attempt < this.MAX_RETRIES) {
        const delayMs = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await this.sleep(delayMs);
      }
    }

    this.logger.error(
      `Webhook delivery to ${url} exhausted all ${this.MAX_RETRIES} retries`,
    );

    return {
      success: false,
      attempts: this.MAX_RETRIES,
      error: `Exhausted ${this.MAX_RETRIES} retries`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
