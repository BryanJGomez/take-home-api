import { Injectable, Logger } from '@nestjs/common';
import { JobsService } from '../../jobs/services/jobs.service';
import { AuthService } from '../../auth/services/auth.service';
import { WebhookService } from '../../webhook/services/webhook.service';
import { CallbackDto } from '../dto/callback.dto';
import { JobStatus } from '../../jobs/entities/job.entity';
import { RecordNotFoundException } from '../../../common/argument-invalid.exception';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly authService: AuthService,
    private readonly webhookService: WebhookService,
  ) {}

  async handleCallback(dto: CallbackDto): Promise<void> {
    // 1) Buscamos el job asociado al callback
    const job = await this.jobsService.findById(dto.jobId);

    if (!job) {
      this.logger.warn(`Callback received for unknown job: ${dto.jobId}`);
      throw new RecordNotFoundException(`Job ${dto.jobId} not found`);
    }

    // 2) Actualizamos el estado del job según el resultado del procesamiento
    if (dto.status === 'completed') {
      await this.jobsService.updateJob(job.id, {
        status: JobStatus.COMPLETED,
        resultUrl: dto.resultUrl,
        completedAt: new Date(),
      });
      this.logger.log(`Job ${dto.jobId} marked as completed`);
    } else {
      await this.jobsService.updateJob(job.id, {
        status: JobStatus.FAILED,
        errorCode: dto.error?.code || 'PROCESSING_FAILED',
        errorMessage: dto.error?.message || 'Processing failed without details',
        failedAt: new Date(),
      });
      this.logger.log(`Job ${dto.jobId} marked as failed`);
    }

    // 3) Si el job tiene una webhookUrl, entregamos el resultado al cliente
    if (job.webhookUrl) {
      // Entregamos el webhook de forma asíncrona sin bloquear la respuesta al servicio de procesamiento
      await this.deliverWebhook(job.userId, job.webhookUrl, dto);
    }
  }

  private async deliverWebhook(
    userId: string,
    webhookUrl: string,
    dto: CallbackDto,
  ): Promise<void> {
    // Get webhook secret from AuthService (proper domain boundary)
    const webhookSecret =
      await this.authService.findWebhookSecretByUserId(userId);

    if (!webhookSecret) {
      this.logger.warn(
        `No webhook secret found for user ${userId}, skipping signed delivery`,
      );
    }

    const secret = webhookSecret || '';

    // Build the webhook payload
    let webhookPayload: Record<string, unknown>;

    if (dto.status === 'completed') {
      webhookPayload = {
        jobId: dto.jobId,
        status: 'completed',
        resultUrl: dto.resultUrl,
        completedAt: new Date().toISOString(),
      };
    } else {
      webhookPayload = {
        jobId: dto.jobId,
        status: 'failed',
        error: dto.error || {
          code: 'PROCESSING_FAILED',
          message: 'Processing failed',
        },
        failedAt: new Date().toISOString(),
      };
    }

    const result = await this.webhookService.deliver({
      url: webhookUrl,
      payload: webhookPayload,
      secret,
    });

    if (result.success) {
      this.logger.log(
        `Webhook delivered for job ${dto.jobId} after ${result.attempts} attempt(s)`,
      );
    } else {
      this.logger.error(
        `Webhook delivery failed for job ${dto.jobId} after ${result.attempts} attempt(s): ${result.error}`,
      );
    }
  }
}
