import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Repository, In, UpdateResult } from 'typeorm';
import { Job, JobStatus } from '../entities/job.entity';

@Injectable()
export class JobsRepository {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

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
