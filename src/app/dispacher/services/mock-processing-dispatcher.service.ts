import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProcessingDispatcher } from '../interfaces/processing-dispatcher.interface';
import { Job } from '../../jobs/entities/job.entity';

@Injectable()
export class MockProcessingDispatcher implements IProcessingDispatcher {
  private readonly logger = new Logger(MockProcessingDispatcher.name);
  private readonly callbackBaseUrl: string;
  private readonly callbackSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.callbackBaseUrl =
      this.configService.get<string>('INTERNAL_CALLBACK_URL') ||
      `http://localhost:${this.configService.get<number>('PORT') || 3000}`;
    this.callbackSecret =
      this.configService.get<string>('INTERNAL_CALLBACK_SECRET') ||
      'default-internal-secret';
  }

  dispatch(job: Job): Promise<void> {
    // Simulate dispatch failure (~5% chance)
    if (Math.random() < 0.05) {
      return Promise.reject(new Error('Processing service unavailable'));
    }

    const jobId = job.id;
    this.logger.log(`Job ${jobId} dispatched to mock processing service`);

    // Simulate async processing (fire-and-forget)
    // 3-5 seconds as required by the challenge
    const processingTimeMs = 3000 + Math.random() * 2000;

    setTimeout(() => {
      const success = Math.random() < 0.8; // ~20% failure rate

      let callbackPayload: Record<string, unknown>;

      if (success) {
        callbackPayload = {
          jobId,
          status: 'completed',
          resultUrl: `https://storage.example.com/results/${jobId}.jpg`,
        };
        this.logger.log(
          `Mock processing completed for ${jobId}, sending callback`,
        );
      } else {
        callbackPayload = {
          jobId,
          status: 'failed',
          error: {
            code: 'PROCESSING_FAILED',
            message: 'Image processing failed after maximum retries',
          },
        };
        this.logger.warn(
          `Mock processing failed for ${jobId}, sending callback`,
        );
      }

      this.sendCallback(callbackPayload).catch((error) => {
        this.logger.error(
          `Error in mock processing for job ${jobId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    }, processingTimeMs);

    return Promise.resolve();
  }

  private async sendCallback(payload: Record<string, unknown>): Promise<void> {
    const globalPrefix =
      this.configService.get<string>('GLOBAL_PREFIX') || 'api';
    const url = `${this.callbackBaseUrl}/${globalPrefix}/internal/callback`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': this.callbackSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Callback to ${url} failed with status ${response.status}: ${body}`,
      );
    }
  }
}
