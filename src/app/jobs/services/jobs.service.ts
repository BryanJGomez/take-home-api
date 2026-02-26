import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Job, JobStatus } from '../entities/job.entity';
import { CreateJobDto } from '../dto/create-job.dto';
import { User, UserPlan } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users.service';
import { JobsRepository } from '../repositories/jobs.repository';
import type { IProcessingDispatcher } from '../../dispacher/interfaces/processing-dispatcher.interface';
import { PROCESSING_DISPATCHER } from '../../dispacher/interfaces/processing-dispatcher.interface';
import { validateUrl } from '../../../common/validators/url-security.validator';
import {
  CreateJobResponse,
  JobStatusResponse,
} from '../interface/jobs.interface';
import {
  TooManyRequestsException,
  PaymentRequiredException,
  ServiceUnavailableException,
} from '../../../common/argument-invalid.exception';
import { UpdateResult } from 'typeorm';

const CONCURRENCY_LIMITS: Record<UserPlan, number> = {
  [UserPlan.BASIC]: 1,
  [UserPlan.PRO]: 5,
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly usersService: UsersService,
    @Inject(PROCESSING_DISPATCHER)
    private readonly processingDispatcher: IProcessingDispatcher,
  ) {}

  async createJob(dto: CreateJobDto, user: User): Promise<CreateJobResponse> {
    // 1) Validar URLs
    await Promise.all([
      validateUrl(dto.imageUrl, false),
      validateUrl(dto.webhookUrl, true),
    ]);
    // 2) Validamos y verificamos concurrencia y créditos, y creamos el job dentro de una transacción serializada
    const maxConcurrent = CONCURRENCY_LIMITS[user.plan];
    const result = await this.jobsRepository.createJobTransactional({
      userId: user.id,
      maxConcurrent,
      imageUrl: dto.imageUrl,
      webhookUrl: dto.webhookUrl,
      options: dto.options || null,
    });

    if (!result.ok) {
      if (result.reason === 'CONCURRENCY_LIMIT') {
        this.logger.warn(
          `User ${user.id} has ${result.activeCount} active jobs, limit is ${maxConcurrent} (${user.plan}).`,
        );
        throw new TooManyRequestsException(
          `You have reached the maximum number of concurrent jobs (${maxConcurrent}) for your plan. Please wait for existing jobs to complete before creating new ones.`,
        );
      }
      throw new PaymentRequiredException(
        'You do not have enough credits to create a job. Each job costs 1 credit.',
        { code: 'INSUFFICIENT_CREDITS' },
      );
    }
    const { job } = result;
    try {
      // 3) Intentamos despachar el job al servicio de procesamiento.
      await this.processingDispatcher.dispatch(job);
    } catch (error) {
      this.logger.error(`Failed to dispatch job ${job.id}`, error);
      // Si falla el dispatch, marcamos el job como FAILED y reembolsamos el crédito al usuario
      await Promise.all([
        // Reembolsamos el crédito al usuario
        // Marcamos el job como FAILED con un error específico para facilitar debugging y métricas
        this.usersService.refundCredit(user.id),
        this.jobsRepository.update(job.id, {
          status: JobStatus.FAILED,
          errorCode: 'DISPATCH_FAILED',
          errorMessage: 'Failed to dispatch job to processing service',
          failedAt: new Date(),
        }),
      ]);
      // Informamos al cliente que el servicio de procesamiento no está disponible, pero que su crédito ha sido reembolsado
      throw new ServiceUnavailableException(
        'Processing service is temporarily unavailable. Your credit has been refunded.',
        { code: 'SERVICE_UNAVAILABLE' },
      );
    }
    // 4) Retornamos la respuesta de creación del job
    return this.buildCreateResponse(job);
  }

  async getJob(jobId: string, userId: string): Promise<JobStatusResponse> {
    const job = await this.jobsRepository.findJobs(jobId, userId);
    // Verificamos que el job exista y pertenezca al usuario que lo solicita
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return this.buildStatusResponse(job);
  }

  findById(jobId: string): Promise<Job | null> {
    return this.jobsRepository.findById(jobId);
  }

  updateJob(
    jobId: string,
    data: QueryDeepPartialEntity<Job>,
  ): Promise<UpdateResult> {
    return this.jobsRepository.update(jobId, data);
  }

  private buildCreateResponse(job: Job) {
    const jobId = job.id;
    return {
      jobId,
      status: job.status,
      statusUrl: `/api/v1/jobs/${jobId}`,
      createdAt: job.createdAt.toISOString(),
    };
  }

  private buildStatusResponse(job: Job): JobStatusResponse {
    const prefixedId = job.id;

    const baseResponse = {
      jobId: prefixedId,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
    };

    switch (job.status) {
      case JobStatus.QUEUED:
      case JobStatus.PROCESSING:
        return baseResponse;
      case JobStatus.COMPLETED:
        return {
          ...baseResponse,
          resultUrl: job.resultUrl,
          completedAt: job.completedAt?.toISOString(),
        };
      case JobStatus.FAILED:
        return {
          ...baseResponse,
          error: {
            code: job.errorCode,
            message: job.errorMessage,
          },
          failedAt: job.failedAt?.toISOString(),
        };
      default:
        return baseResponse;
    }
  }
}
