import { Module } from '@nestjs/common';
import { JobsService } from './services/jobs.service';
import { JobsController } from './controller/jobs.controller';

@Module({
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
