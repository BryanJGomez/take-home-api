import { Injectable, Logger } from '@nestjs/common';

export interface HttpRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpRetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  retryOnStatusCodes?: (statusCode: number) => boolean;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  body: string;
}

export interface HttpRequestWithRetryResult {
  response?: HttpResponse;
  success: boolean;
  attempts: number;
  error?: string;
}

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);
  private static readonly DEFAULT_TIMEOUT_MS = 10_000;

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeoutMs = HttpService.DEFAULT_TIMEOUT_MS,
    } = options;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    };

    if (body !== undefined) {
      fetchOptions.body = body;
    }

    this.logger.debug(`${method} ${url}`);

    const response = await fetch(url, fetchOptions);
    const responseBody = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      body: responseBody,
    };
  }

  async requestWithRetry(
    options: HttpRequestOptions,
    retryOptions: HttpRetryOptions,
  ): Promise<HttpRequestWithRetryResult> {
    const {
      maxRetries,
      baseDelayMs,
      retryOnStatusCodes = (status) => status >= 500,
    } = retryOptions;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.request(options);

        if (response.ok) {
          this.logger.log(
            `${options.method ?? 'GET'} ${options.url} succeeded (attempt ${attempt}, status ${response.status})`,
          );
          return { response, success: true, attempts: attempt };
        }

        if (!retryOnStatusCodes(response.status)) {
          this.logger.warn(
            `${options.method ?? 'GET'} ${options.url} returned ${response.status} (not retryable)`,
          );
          return {
            response,
            success: false,
            attempts: attempt,
            error: `Non-retryable status: ${response.status}`,
          };
        }

        this.logger.warn(
          `${options.method ?? 'GET'} ${options.url} returned ${response.status} (attempt ${attempt}/${maxRetries})`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `${options.method ?? 'GET'} ${options.url} failed (attempt ${attempt}/${maxRetries}): ${errorMessage}`,
        );
      }

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delayMs);
      }
    }

    this.logger.error(
      `${options.method ?? 'GET'} ${options.url} exhausted all ${maxRetries} retries`,
    );

    return {
      success: false,
      attempts: maxRetries,
      error: `Exhausted ${maxRetries} retries`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
