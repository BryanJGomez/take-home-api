import { Job } from '../../jobs/entities/job.entity';

export const PROCESSING_DISPATCHER = 'JOB_DISPATCHER';

export interface IProcessingDispatcher {
  dispatch(job: Job): Promise<void>;
}
