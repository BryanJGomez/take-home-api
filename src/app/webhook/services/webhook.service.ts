import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { HttpService } from '../../../common/http';

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
  private readonly TIMEOUT_MS = 10_000;

  constructor(private readonly httpService: HttpService) {}

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

    const result = await this.httpService.requestWithRetry(
      {
        url,
        method: 'POST',
        headers: {
          'X-Signature': signature,
          'X-Timestamp': timestamp,
        },
        body,
        timeoutMs: this.TIMEOUT_MS,
      },
      {
        maxRetries: this.MAX_RETRIES,
        baseDelayMs: this.BASE_DELAY_MS,
        retryOnStatusCodes: (status) => status >= 500,
      },
    );

    return {
      success: result.success,
      statusCode: result.response?.status,
      attempts: result.attempts,
      error: result.error,
    };
  }
}
