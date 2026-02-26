import { ObjectLiteral } from 'typeorm';
import { JobStatus } from '../entities/job.entity';

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  statusUrl: string;
  createdAt: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  resultUrl?: string | null;
  completedAt?: string | null;
  error?: {
    code: string | null;
    message: string | null;
  };
  failedAt?: string | null;
}
export interface IUpdateResult {
  generatedMaps: ObjectLiteral[];
  raw: unknown;
  affected?: number;
}
