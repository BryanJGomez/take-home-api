import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { IdempotencyKeyRepository } from '../repositories/idempotency-key.repository';

export interface IdempotencyResult {
  responseStatusCode: number;
  responseBody: Record<string, unknown>;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  // Idempotency keys expire after 24 hours
  private readonly TTL_HOURS = 24;

  constructor(
    private readonly idempotencyKeyRepository: IdempotencyKeyRepository,
  ) {}

  hashRequestBody(body: Record<string, unknown>): string {
    const serialized = JSON.stringify(body, Object.keys(body).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  async findExisting(
    userId: string,
    key: string,
    requestHash: string,
  ): Promise<{ cached: IdempotencyResult | null; conflict: boolean }> {
    const existing = await this.idempotencyKeyRepository.findActiveByUserAndKey(
      userId,
      key,
    );

    if (!existing) {
      return { cached: null, conflict: false };
    }

    // Same key but different body = conflict
    if (existing.requestHash !== requestHash) {
      return { cached: null, conflict: true };
    }

    this.logger.log(`Returning cached response for idempotency key: ${key}`);

    return {
      cached: {
        responseStatusCode: existing.responseStatusCode,
        responseBody: existing.responseBody,
      },
      conflict: false,
    };
  }

  async save(
    userId: string,
    key: string,
    requestHash: string,
    responseStatusCode: number,
    responseBody: Record<string, unknown>,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TTL_HOURS);

    await this.idempotencyKeyRepository.create({
      userId,
      idempotencyKey: key,
      requestHash,
      responseStatusCode,
      responseBody,
      expiresAt,
    });
  }
}
