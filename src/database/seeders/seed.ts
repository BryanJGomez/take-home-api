import * as winston from 'winston';
import { loggerOptions, createContextWinston } from '../../utils/logger.utils';
import { AppDataSource } from '../data-source';
import { seedUsers } from './users.seeder';
import { seedApiKeys } from './api-keys.seeder';
import { seedJobs } from './jobs.seeder';
import { seedIdempotencyKeys } from './idempotency-keys.seeder';

async function seed() {
  const logger = winston.createLogger(loggerOptions('SeedApplication'));
  const context = createContextWinston('Seeder', 'seed');

  await AppDataSource.initialize();

  try {
    await seedUsers();
    await Promise.all([seedApiKeys(), seedJobs(), seedIdempotencyKeys()]);
    logger.info('Seeding completado exitosamente', context);
  } catch (error) {
    logger.error('Error durante el seeding', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void seed();
