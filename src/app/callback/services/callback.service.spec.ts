import { Test, TestingModule } from '@nestjs/testing';
import { CallbackService } from './callback.service';
import { JobsService } from '../../jobs/services/jobs.service';
import { AuthService } from '../../auth/services/auth.service';
import { WebhookService } from '../../webhook/services/webhook.service';
import { Job, JobStatus } from '../../jobs/entities/job.entity';
import { CallbackDto } from '../dto/callback.dto';

describe('CallbackService', () => {
  let service: CallbackService;

  const mockFindById = jest.fn();
  const mockUpdateJob = jest.fn().mockResolvedValue({ affected: 1 });
  const mockFindWebhookSecret = jest.fn();
  const mockDeliver = jest
    .fn()
    .mockResolvedValue({ success: true, attempts: 1 });

  const mockJob: Partial<Job> = {
    id: 'job-uuid-123',
    userId: 'user-uuid-456',
    status: JobStatus.QUEUED,
    imageUrl: 'https://example.com/photo.jpg',
    webhookUrl: 'https://cliente.com/webhook',
    options: null,
    resultUrl: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallbackService,
        {
          provide: JobsService,
          useValue: { findById: mockFindById, updateJob: mockUpdateJob },
        },
        {
          provide: AuthService,
          useValue: { findWebhookSecretByUserId: mockFindWebhookSecret },
        },
        {
          provide: WebhookService,
          useValue: { deliver: mockDeliver },
        },
      ],
    }).compile();

    service = module.get<CallbackService>(CallbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCallback', () => {
    it('deberia actualizar el job a completed y entregar webhook', async () => {
      mockFindById.mockResolvedValue(mockJob as Job);
      mockFindWebhookSecret.mockResolvedValue('webhook-secret');

      const dto: CallbackDto = {
        jobId: 'job-uuid-123',
        status: 'completed',
        resultUrl: 'https://storage.example.com/result.jpg',
      };

      await service.handleCallback(dto);

      // Verificamos que se actualizo el job como completed
      expect(mockUpdateJob).toHaveBeenCalledWith(
        mockJob.id,
        expect.objectContaining({
          status: JobStatus.COMPLETED,
          resultUrl: dto.resultUrl,
        }),
      );

      // Verificamos que se entrego el webhook
      expect(mockDeliver).toHaveBeenCalledWith(
        expect.objectContaining({
          url: mockJob.webhookUrl,
          secret: 'webhook-secret',
        }),
      );
    });

    it('deberia actualizar el job a failed cuando el procesamiento falla', async () => {
      mockFindById.mockResolvedValue(mockJob as Job);
      mockFindWebhookSecret.mockResolvedValue('webhook-secret');

      const dto: CallbackDto = {
        jobId: 'job-uuid-123',
        status: 'failed',
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Image processing failed after maximum retries',
        },
      };

      await service.handleCallback(dto);

      expect(mockUpdateJob).toHaveBeenCalledWith(
        mockJob.id,
        expect.objectContaining({
          status: JobStatus.FAILED,
          errorCode: 'PROCESSING_FAILED',
          errorMessage: 'Image processing failed after maximum retries',
        }),
      );
    });

    it('deberia lanzar error si el job no existe', async () => {
      mockFindById.mockResolvedValue(null);

      const dto: CallbackDto = {
        jobId: 'nonexistent-id',
        status: 'completed',
        resultUrl: 'https://storage.example.com/result.jpg',
      };

      await expect(service.handleCallback(dto)).rejects.toThrow('not found');
    });

    it('no deberia entregar webhook si el job no tiene webhookUrl', async () => {
      const jobSinWebhook = { ...mockJob, webhookUrl: '' };
      mockFindById.mockResolvedValue(jobSinWebhook as Job);

      const dto: CallbackDto = {
        jobId: 'job-uuid-123',
        status: 'completed',
        resultUrl: 'https://storage.example.com/result.jpg',
      };

      await service.handleCallback(dto);

      // Se actualizo el job pero no se intento entregar webhook
      expect(mockUpdateJob).toHaveBeenCalled();
      expect(mockDeliver).not.toHaveBeenCalled();
    });
  });
});
