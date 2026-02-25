import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyRepository {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async findActiveByHash(keyHash: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({
      where: { keyHash, isActive: true, deletedAt: IsNull() },
      relations: ['user'],
    });
  }

  async updateLastUsedAt(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, { lastUsedAt: new Date() });
  }

  async findActiveByUserId(userId: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({
      where: { userId, isActive: true },
    });
  }
}
