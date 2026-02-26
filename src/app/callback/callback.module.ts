import { Module } from '@nestjs/common';
import { CallbackController } from './controller/callback.controller';
import { CallbackService } from './services/callback.service';
import { JobsModule } from '../jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [JobsModule, AuthModule, WebhookModule],
  controllers: [CallbackController],
  providers: [CallbackService],
})
export class CallbackModule {}
