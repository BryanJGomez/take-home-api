import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from '../services/jobs.service';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { IdempotencyInterceptor } from '../../../common/interceptors/idempotency.interceptor';

describe('JobsController', () => {
  let controller: JobsController;

  const mockCreateJob = jest.fn();
  const mockGetJob = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: {
            createJob: mockCreateJob,
            getJob: mockGetJob,
          },
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(IdempotencyInterceptor)
      .useValue({
        intercept: (_ctx: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .compile();

    controller = module.get<JobsController>(JobsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
