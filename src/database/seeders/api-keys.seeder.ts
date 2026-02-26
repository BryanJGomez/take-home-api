import { createHash, randomBytes } from 'crypto';
import { AppDataSource } from '../data-source';
import { ApiKey } from '../../app/auth/entities/api-key.entity';
import { User, UserPlan } from '../../app/users/entities/user.entity';

export const KEYS = {
  basic: 'pk_basic_test_key_001',
  pro: 'pk_pro_test_key_001',
  basic2: 'pk_basic_test_key_002',
};

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

function extractPrefix(raw: string): string {
  return raw.substring(0, 12);
}

export async function seedApiKeys(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const apiKeyRepo = AppDataSource.getRepository(ApiKey);

  const basicUser = await userRepo.findOneByOrFail({ plan: UserPlan.BASIC });
  const proUser = await userRepo.findOneByOrFail({ plan: UserPlan.PRO });

  const apiKeys = [
    {
      userId: basicUser.id,
      keyHash: hashKey(KEYS.basic),
      keyPrefix: extractPrefix(KEYS.basic),
      name: 'Basic Test Key',
      webhookSecret: generateWebhookSecret(),
      isActive: true,
    },
    {
      userId: proUser.id,
      keyHash: hashKey(KEYS.pro),
      keyPrefix: extractPrefix(KEYS.pro),
      name: 'Pro Test Key',
      webhookSecret: generateWebhookSecret(),
      isActive: true,
    },
    {
      userId: basicUser.id,
      keyHash: hashKey('pk_pro_inactive_key_001'),
      keyPrefix: extractPrefix('pk_pro_inactive_key_001'),
      name: 'Basic Test Key',
      webhookSecret: null,
      isActive: false,
    },
  ];

  await apiKeyRepo.upsert(apiKeys, ['keyHash']);
}
