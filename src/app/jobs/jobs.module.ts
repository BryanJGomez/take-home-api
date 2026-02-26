import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './services/jobs.service';
import { JobsRepository } from './repositories/jobs.repository';
import { JobsController } from './controller/jobs.controller';
import { Job } from './entities/job.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { ProcessingModule } from '../dispacher/processing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    UsersModule,
    AuthModule,
    IdempotencyModule,
    ProcessingModule,
  ],
  controllers: [JobsController],
  providers: [JobsRepository, JobsService],
  exports: [JobsService],
})
export class JobsModule {}
