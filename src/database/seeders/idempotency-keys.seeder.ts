import { createHash } from 'crypto';
import { AppDataSource } from '../data-source';
import { IdempotencyKey } from '../../app/idempotency/entities/idempotency-key.entity';
import { User, UserPlan } from '../../app/users/entities/user.entity';

function hashRequest(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export async function seedIdempotencyKeys(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const idempotencyKeyRepo = AppDataSource.getRepository(IdempotencyKey);

  const basicUser = await userRepo.findOneByOrFail({ plan: UserPlan.BASIC });
  const proUser = await userRepo.findOneByOrFail({ plan: UserPlan.PRO });

  const now = new Date();

  const idempotencyKeys = [
    {
      userId: basicUser.id,
      idempotencyKey: 'idem-basic-001',
      requestHash: hashRequest(
        '{"imageUrl":"https://picsum.photos/id/10/400/300"}',
      ),
      responseStatusCode: 201,
      responseBody: {
        jobId: '00000000-0000-0000-0000-000000000001',
        status: 'queued',
      },
      expiresAt: new Date(now.getTime() + 86400_000),
    },
    {
      userId: proUser.id,
      idempotencyKey: 'idem-pro-001',
      requestHash: hashRequest(
        '{"imageUrl":"https://picsum.photos/id/30/800/600"}',
      ),
      responseStatusCode: 201,
      responseBody: {
        jobId: '00000000-0000-0000-0000-000000000002',
        status: 'queued',
      },
      expiresAt: new Date(now.getTime() + 86400_000),
    },
    {
      userId: proUser.id,
      idempotencyKey: 'idem-pro-expired',
      requestHash: hashRequest(
        '{"imageUrl":"https://picsum.photos/id/40/800/600"}',
      ),
      responseStatusCode: 201,
      responseBody: {
        jobId: '00000000-0000-0000-0000-000000000003',
        status: 'queued',
      },
      expiresAt: new Date(now.getTime() - 86400_000),
    },
  ];

  await idempotencyKeyRepo.upsert(idempotencyKeys, [
    'userId',
    'idempotencyKey',
  ]);
}
