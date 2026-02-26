import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  DataSource,
  EntityManager,
  Repository,
  In,
  UpdateResult,
} from 'typeorm';
import { Job, JobStatus } from '../entities/job.entity';
import { User } from '../../users/entities/user.entity';

export interface CreateJobTransactionalParams {
  userId: string;
  maxConcurrent: number;
  imageUrl: string;
  webhookUrl: string;
  options: Record<string, unknown> | null;
}

export type CreateJobTransactionalResult =
  | { ok: true; job: Job }
  | { ok: false; reason: 'CONCURRENCY_LIMIT'; activeCount: number }
  | { ok: false; reason: 'INSUFFICIENT_CREDITS' };

@Injectable()
export class JobsRepository {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly dataSource: DataSource,
  ) {}

  // Método principal que maneja la creación de jobs con validaciones de concurrencia y créditos
  async createJobTransactional(
    params: CreateJobTransactionalParams,
  ): Promise<CreateJobTransactionalResult> {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.lockUserRow(manager, params.userId);

      const activeCount = await manager.count(Job, {
        where: {
          userId: params.userId,
          status: In([JobStatus.QUEUED, JobStatus.PROCESSING]),
        },
      });
      // Concurreciancia: si el usuario ya tiene el máximo de jobs activos, rechazamos la creación
      if (activeCount >= params.maxConcurrent) {
        return { ok: false, reason: 'CONCURRENCY_LIMIT', activeCount } as const;
      }
      // Créditos: si el usuario no tiene créditos suficientes, rechazamos la creación
      if (user.credits < 1) {
        return { ok: false, reason: 'INSUFFICIENT_CREDITS' } as const;
      }
      // Si pasó las validaciones, descontamos un crédito y creamos el job de forma atómica
      await this.deductCredit(manager, params.userId);
      // Creamos el job y lo retornamos
      const job = await this.createJobRecord(manager, params);
      return { ok: true, job } as const;
    });
  }

  private lockUserRow(manager: EntityManager, userId: string): Promise<User> {
    return manager
      .createQueryBuilder(User, 'u')
      .setLock('pessimistic_write')
      .where('u.id = :userId', { userId })
      .getOneOrFail();
  }

  private deductCredit(
    manager: EntityManager,
    userId: string,
  ): Promise<UpdateResult> {
    return manager
      .createQueryBuilder()
      .update(User)
      .set({ credits: () => 'credits - 1' })
      .where('id = :userId AND credits >= 1', { userId })
      .execute();
  }

  private async createJobRecord(
    manager: EntityManager,
    params: CreateJobTransactionalParams,
  ): Promise<Job> {
    const job = manager.create(Job, {
      userId: params.userId,
      status: JobStatus.QUEUED,
      imageUrl: params.imageUrl,
      webhookUrl: params.webhookUrl,
      options: params.options,
    });
    return manager.save(Job, job);
  }

  countActiveByUserId(userId: string): Promise<number> {
    return this.jobsRepository.count({
      where: {
        userId,
        status: In([JobStatus.QUEUED, JobStatus.PROCESSING]),
      },
    });
  }

  create(data: Partial<Job>): Promise<Job> {
    const job = this.jobsRepository.create(data);
    return this.jobsRepository.save(job);
  }

  findJobs(id: string, userId: string): Promise<Job | null> {
    return this.jobsRepository.findOne({ where: { id, userId } });
  }

  findById(id: string): Promise<Job | null> {
    return this.jobsRepository.findOneBy({ id });
  }

  update(id: string, data: QueryDeepPartialEntity<Job>): Promise<UpdateResult> {
    return this.jobsRepository.update(id, data);
  }
}
