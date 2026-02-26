import { Injectable, Logger } from '@nestjs/common';
import { IProcessingDispatcher } from '../interfaces/processing-dispatcher.interface';
import { Job } from '../../jobs/entities/job.entity';
import { HttpService } from '../../../common/http';
import { ConfigurationService } from '../../../config/services/configuration.service';

@Injectable()
export class MockProcessingDispatcher implements IProcessingDispatcher {
  private readonly logger = new Logger(MockProcessingDispatcher.name);

  constructor(
    private readonly configService: ConfigurationService,
    private readonly httpService: HttpService,
  ) {}

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
    const url = this.configService.queueInternalCallbackUrl;
    const callbackSecret = this.configService.internalCallbackSecret;

    const response = await this.httpService.request({
      url,
      method: 'POST',
      headers: {
        'X-Internal-Secret': callbackSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      this.logger.error(
        `Callback to ${url} failed with status ${response.status}: ${response.body}`,
      );
    }
  }
}
