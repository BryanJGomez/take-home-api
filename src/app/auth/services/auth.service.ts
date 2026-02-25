import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async validateApiKey(rawKey: string): Promise<User | null> {
    // Hash del API key recibido para compararlo con los hashes almacenados en la base de datos
    const keyHash = this.hashApiKey(rawKey);
    // Buscamos un API key activo que coincida con el hash proporcionado
    // y validamos que no esté revocado ni eliminado
    const apiKey = await this.apiKeyRepository.findActiveByHash(keyHash);
    if (!apiKey) {
      return null;
    }
    // Actualizamos la fecha de último uso del API key de forma asíncrona
    // void: indica que no esperamos ni manejamos el resultado de esta promesa.
    void this.trackLastUsedAt(apiKey.id);

    return apiKey.user;
  }

  private async trackLastUsedAt(apiKeyId: string): Promise<void> {
    try {
      await this.apiKeyRepository.updateLastUsedAt(apiKeyId);
    } catch (err) {
      this.logger.warn(
        `Failed to update lastUsedAt for API key ${apiKeyId}`,
        err,
      );
    }
  }

  async findWebhookSecretByUserId(userId: string): Promise<string | null> {
    const apiKey = await this.apiKeyRepository.findActiveByUserId(userId);
    return apiKey?.webhookSecret ?? null;
  }
}
