import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { IdempotencyKey } from '../entities/idempotency-key.entity';

@Injectable()
export class IdempotencyKeyRepository {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repository: Repository<IdempotencyKey>,
  ) {}

  async findActiveByUserAndKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<IdempotencyKey | null> {
    return this.repository.findOne({
      where: {
        userId,
        idempotencyKey,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async create(data: Partial<IdempotencyKey>): Promise<IdempotencyKey> {
    const entry = this.repository.create(data);
    return this.repository.save(entry);
  }
}
