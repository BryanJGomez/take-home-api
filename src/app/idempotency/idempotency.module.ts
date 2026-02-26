import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { IdempotencyKeyRepository } from './repositories/idempotency-key.repository';
import { IdempotencyService } from './services/idempotency.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKey])],
  providers: [IdempotencyKeyRepository, IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
