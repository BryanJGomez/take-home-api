import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKeyRepository } from '../repositories/idempotency-key.repository';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  const mockFindActiveByUserAndKey = jest.fn();
  const mockCreate = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: IdempotencyKeyRepository,
          useValue: {
            findActiveByUserAndKey: mockFindActiveByUserAndKey,
            create: mockCreate,
          },
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashRequestBody', () => {
    it('deberia generar hashes consistentes para el mismo body', () => {
      const body = {
        imageUrl: 'https://example.com',
        webhookUrl: 'https://hook.com',
      };
      const hash1 = service.hashRequestBody(body);
      const hash2 = service.hashRequestBody(body);
      expect(hash1).toBe(hash2);
    });

    it('deberia generar hashes diferentes para bodies diferentes', () => {
      const body1 = { imageUrl: 'https://example.com/1' };
      const body2 = { imageUrl: 'https://example.com/2' };
      expect(service.hashRequestBody(body1)).not.toBe(
        service.hashRequestBody(body2),
      );
    });
  });

  describe('findExisting', () => {
    it('deberia retornar cached=null y conflict=false cuando no existe registro', async () => {
      mockFindActiveByUserAndKey.mockResolvedValue(null);

      const result = await service.findExisting(
        'user-1',
        'idemp-key-1',
        'hash-abc',
      );

      expect(result).toEqual({ cached: null, conflict: false });
    });

    it('deberia retornar la respuesta cacheada cuando existe con el mismo hash', async () => {
      mockFindActiveByUserAndKey.mockResolvedValue({
        requestHash: 'hash-abc',
        responseStatusCode: 202,
        responseBody: { jobId: 'job_123', status: 'queued' },
      });

      const result = await service.findExisting(
        'user-1',
        'idemp-key-1',
        'hash-abc',
      );

      expect(result.conflict).toBe(false);
      expect(result.cached).toEqual({
        responseStatusCode: 202,
        responseBody: { jobId: 'job_123', status: 'queued' },
      });
    });

    it('deberia detectar conflicto cuando la misma key tiene body diferente', async () => {
      mockFindActiveByUserAndKey.mockResolvedValue({
        requestHash: 'hash-DIFERENTE',
        responseStatusCode: 202,
        responseBody: { jobId: 'job_123' },
      });

      const result = await service.findExisting(
        'user-1',
        'idemp-key-1',
        'hash-abc',
      );

      expect(result.conflict).toBe(true);
      expect(result.cached).toBeNull();
    });
  });

  describe('save', () => {
    it('deberia guardar la respuesta con TTL de 24 horas', async () => {
      const now = new Date('2026-02-20T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      await service.save('user-1', 'idemp-key-1', 'hash-abc', 202, {
        jobId: 'job_123',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          idempotencyKey: 'idemp-key-1',
          requestHash: 'hash-abc',
          responseStatusCode: 202,
          responseBody: { jobId: 'job_123' },
          expiresAt: new Date('2026-02-21T10:00:00Z'), // +24h
        }),
      );

      jest.useRealTimers();
    });
  });
});
