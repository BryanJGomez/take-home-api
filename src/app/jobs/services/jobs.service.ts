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
    // 2) Verificamos límite de concurrencia antes de crear el job
    const activeJobCount = await this.jobsRepository.countActiveByUserId(
      user.id,
    );
    // Obtenemos el límite de concurrencia para el plan del usuario
    const maxConcurrent = CONCURRENCY_LIMITS[user.plan];
    if (activeJobCount >= maxConcurrent) {
      const message = `You have reached the maximum number of concurrent jobs (${maxConcurrent}) for your plan. Please wait for existing jobs to complete before creating new ones.`;
      throw new TooManyRequestsException(message);
    }
    // 3) Deducir crédito del usuario antes de crear el job
    const creditDeducted = await this.usersService.deductCredit(user.id);
    if (!creditDeducted) {
      const message =
        'You do not have enough credits to create a job. Each job costs 1 credit.';
      throw new PaymentRequiredException(message, {
        code: 'INSUFFICIENT_CREDITS',
      });
    }
    // 4) Creamos el job con estado QUEUED antes de enviarlo a la cola para evitar condiciones de carrera
    const job = await this.jobsRepository.create({
      userId: user.id,
      status: JobStatus.QUEUED,
      imageUrl: dto.imageUrl,
      webhookUrl: dto.webhookUrl,
      options: dto.options || null,
    });
    // 5) mandamos el job a la cola de procesamiento
    // Manejamos errores de dispatch para asegurar que el crédito sea reembolsado y el job marcado como fallido si no se puede procesar
    try {
      await this.processingDispatcher.dispatch(job);
    } catch (error) {
      this.logger.error(`Failed to dispatch job ${job.id}`, error);
      // En caso de error de dispatch, reembolsamos el crédito al usuario
      await this.usersService.refundCredit(user.id);
      // Marcamos el 'job' como fallido con un error genérico de dispatch
      await this.jobsRepository.update(job.id, {
        status: JobStatus.FAILED,
        errorCode: 'DISPATCH_FAILED',
        errorMessage: 'Failed to dispatch job to processing service',
        failedAt: new Date(),
      });
      //
      throw new ServiceUnavailableException(
        'Processing service is temporarily unavailable. Your credit has been refunded.',
        { code: 'SERVICE_UNAVAILABLE' },
      );
    }
    // 6) Retornamos la respuesta con el ID del job y la URL de status
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

  async findById(jobId: string): Promise<Job | null> {
    return await this.jobsRepository.findById(jobId);
  }

  updateJob(
    jobId: string,
    data: QueryDeepPartialEntity<Job>,
  ): Promise<UpdateResult> {
    return this.jobsRepository.update(jobId, data);
  }

  private buildCreateResponse(job: Job) {
    const jobId = `job_${job.id}`;
    return {
      jobId,
      status: job.status,
      statusUrl: `/v1/jobs/${jobId}`,
      createdAt: job.createdAt.toISOString(),
    };
  }

  private buildStatusResponse(job: Job): JobStatusResponse {
    const prefixedId = `job_${job.id}`;

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
