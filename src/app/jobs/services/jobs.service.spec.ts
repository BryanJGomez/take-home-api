import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsRepository } from '../repositories/jobs.repository';
import { UsersService } from '../../users/services/users.service';
import { PROCESSING_DISPATCHER } from '../../dispacher/interfaces/processing-dispatcher.interface';
import { User, UserPlan } from '../../users/entities/user.entity';
import { Job, JobStatus } from '../entities/job.entity';
import { CreateJobDto } from '../dto/create-job.dto';
import * as urlValidator from '../../../common/validators/url-security.validator';

// Mock del validador SSRF para evitar resoluciones DNS reales en tests
jest.mock('../../../common/validators/url-security.validator', () => ({
  validateUrl: jest.fn().mockResolvedValue(undefined),
}));

describe('JobsService', () => {
  let service: JobsService;

  // Usamos jest.fn() directamente para evitar problemas de tipado con mocks
  const mockCreateJobTransactional = jest.fn();
  const mockFindJobs = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdate = jest.fn();
  const mockRefundCredit = jest.fn().mockResolvedValue(undefined);
  const mockDispatch = jest.fn().mockResolvedValue(undefined);

  const mockUser: User = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@example.com',
    plan: UserPlan.PRO,
    credits: 10,
    apiKeys: [],
    jobs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockJob: Job = {
    id: 'uuid-456',
    userId: mockUser.id,
    user: mockUser,
    status: JobStatus.QUEUED,
    imageUrl: 'https://example.com/photo.jpg',
    webhookUrl: 'https://cliente.com/webhook',
    options: null,
    resultUrl: null,
    errorCode: null,
    errorMessage: null,
    completedAt: null,
    failedAt: null,
    createdAt: new Date('2026-02-20T10:30:00Z'),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDto: CreateJobDto = {
    imageUrl: 'https://example.com/photo.jpg',
    webhookUrl: 'https://cliente.com/webhook',
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: JobsRepository,
          useValue: {
            createJobTransactional: mockCreateJobTransactional,
            findJobs: mockFindJobs,
            findById: mockFindById,
            update: mockUpdate,
          },
        },
        {
          provide: UsersService,
          useValue: { refundCredit: mockRefundCredit },
        },
        {
          provide: PROCESSING_DISPATCHER,
          useValue: { dispatch: mockDispatch },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    // Restauramos los mocks por defecto que necesitan un valor base
    // resetAllMocks limpia las implementaciones, asi que hay que re-setear
    mockRefundCredit.mockResolvedValue(undefined);
    mockDispatch.mockResolvedValue(undefined);
    (urlValidator.validateUrl as jest.Mock).mockResolvedValue(undefined);
  });

  describe('createJob', () => {
    it('deberia crear un job exitosamente y retornar 202 con el formato correcto', async () => {
      mockCreateJobTransactional.mockResolvedValue({ ok: true, job: mockJob });

      const result = await service.createJob(mockDto, mockUser);

      // Verificamos que se validan las URLs contra SSRF
      expect(urlValidator.validateUrl).toHaveBeenCalledTimes(2);
      expect(urlValidator.validateUrl).toHaveBeenCalledWith(
        mockDto.imageUrl,
        false,
      );
      expect(urlValidator.validateUrl).toHaveBeenCalledWith(
        mockDto.webhookUrl,
        true,
      );

      // Verificamos que se creo la transaccion con los parametros correctos
      expect(mockCreateJobTransactional).toHaveBeenCalledWith({
        userId: mockUser.id,
        maxConcurrent: 5, // PRO plan
        imageUrl: mockDto.imageUrl,
        webhookUrl: mockDto.webhookUrl,
        options: null,
      });

      // Verificamos que se despacho el job
      expect(mockDispatch).toHaveBeenCalledWith(mockJob);

      // Verificamos el formato de respuesta
      expect(result).toEqual({
        jobId: mockJob.id,
        status: JobStatus.QUEUED,
        statusUrl: expect.stringContaining(mockJob.id),
        createdAt: mockJob.createdAt.toISOString(),
      });
    });

    it('deberia lanzar 429 cuando se excede el limite de concurrencia', async () => {
      mockCreateJobTransactional.mockResolvedValue({
        ok: false,
        reason: 'CONCURRENCY_LIMIT',
        activeCount: 5,
      });

      await expect(service.createJob(mockDto, mockUser)).rejects.toThrow(
        'maximum number of concurrent jobs',
      );
      // No deberia intentar despachar
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('deberia lanzar 402 cuando no hay creditos suficientes', async () => {
      mockCreateJobTransactional.mockResolvedValue({
        ok: false,
        reason: 'INSUFFICIENT_CREDITS',
      });

      await expect(service.createJob(mockDto, mockUser)).rejects.toThrow(
        'enough credits',
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('deberia reembolsar credito y lanzar 503 si el dispatch falla', async () => {
      mockCreateJobTransactional.mockResolvedValue({ ok: true, job: mockJob });
      mockDispatch.mockRejectedValue(new Error('Processing service down'));
      mockUpdate.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await expect(service.createJob(mockDto, mockUser)).rejects.toThrow(
        'temporarily unavailable',
      );

      // Verificamos que se reembolso el credito
      expect(mockRefundCredit).toHaveBeenCalledWith(mockUser.id);
      // Verificamos que el job se marco como FAILED
      expect(mockUpdate).toHaveBeenCalledWith(
        mockJob.id,
        expect.objectContaining({
          status: JobStatus.FAILED,
          errorCode: 'DISPATCH_FAILED',
        }),
      );
    });

    it('deberia usar limite de concurrencia 1 para plan basic', async () => {
      const basicUser = { ...mockUser, plan: UserPlan.BASIC };
      mockCreateJobTransactional.mockResolvedValue({ ok: true, job: mockJob });

      await service.createJob(mockDto, basicUser);

      expect(mockCreateJobTransactional).toHaveBeenCalledWith(
        expect.objectContaining({ maxConcurrent: 1 }),
      );
    });
  });

  describe('getJob', () => {
    it('deberia retornar los datos del job cuando existe y pertenece al usuario', async () => {
      mockFindJobs.mockResolvedValue(mockJob);

      const result = await service.getJob(mockJob.id, mockUser.id);

      expect(result.jobId).toBe(mockJob.id);
      expect(result.status).toBe(JobStatus.QUEUED);
    });

    it('deberia lanzar 404 cuando el job no existe o pertenece a otro usuario', async () => {
      mockFindJobs.mockResolvedValue(null);

      await expect(
        service.getJob('nonexistent-id', mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('deberia incluir resultUrl cuando el job esta completado', async () => {
      const completedJob: Job = {
        ...mockJob,
        status: JobStatus.COMPLETED,
        resultUrl: 'https://storage.example.com/result.jpg',
        completedAt: new Date('2026-02-20T10:30:45Z'),
      };
      mockFindJobs.mockResolvedValue(completedJob);

      const result = await service.getJob(completedJob.id, mockUser.id);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.resultUrl).toBe(completedJob.resultUrl);
      expect(result.completedAt).toBe(completedJob.completedAt!.toISOString());
      // No deberia incluir campos de error
      expect(result).not.toHaveProperty('error');
    });

    it('deberia incluir error cuando el job ha fallado', async () => {
      const failedJob: Job = {
        ...mockJob,
        status: JobStatus.FAILED,
        errorCode: 'PROCESSING_FAILED',
        errorMessage: 'Image processing failed',
        failedAt: new Date('2026-02-20T10:31:00Z'),
      };
      mockFindJobs.mockResolvedValue(failedJob);

      const result = await service.getJob(failedJob.id, mockUser.id);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toEqual({
        code: 'PROCESSING_FAILED',
        message: 'Image processing failed',
      });
      expect(result.failedAt).toBe(failedJob.failedAt!.toISOString());
      // No deberia incluir resultUrl
      expect(result).not.toHaveProperty('resultUrl');
    });
  });
});
