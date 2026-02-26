import { AppDataSource } from '../data-source';
import { Job, JobStatus } from '../../app/jobs/entities/job.entity';
import { User, UserPlan } from '../../app/users/entities/user.entity';

export async function seedJobs(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const jobRepo = AppDataSource.getRepository(Job);

  const basicUser = await userRepo.findOneByOrFail({ plan: UserPlan.BASIC });
  const proUser = await userRepo.findOneByOrFail({ plan: UserPlan.PRO });

  const now = new Date();

  const jobs = [
    {
      userId: basicUser.id,
      status: JobStatus.COMPLETED,
      imageUrl: 'https://picsum.photos/id/10/400/300',
      webhookUrl: 'https://example.com/webhook/basic',
      resultUrl: 'https://cdn.vibepeak.test/results/basic-001.png',
      completedAt: new Date(now.getTime() - 3600_000),
    },
    {
      userId: basicUser.id,
      status: JobStatus.FAILED,
      imageUrl: 'https://picsum.photos/id/20/400/300',
      webhookUrl: 'https://example.com/webhook/basic',
      errorCode: 'PROCESSING_ERROR',
      errorMessage: 'Simulated processing failure for demo data',
      failedAt: new Date(now.getTime() - 1800_000),
    },
    {
      userId: proUser.id,
      status: JobStatus.COMPLETED,
      imageUrl: 'https://picsum.photos/id/30/800/600',
      webhookUrl: 'https://example.com/webhook/pro',
      options: { quality: 'high', format: 'webp' },
      resultUrl: 'https://cdn.vibepeak.test/results/pro-001.webp',
      completedAt: new Date(now.getTime() - 7200_000),
    },
    {
      userId: proUser.id,
      status: JobStatus.QUEUED,
      imageUrl: 'https://picsum.photos/id/40/800/600',
      webhookUrl: 'https://example.com/webhook/pro',
      options: { quality: 'standard', format: 'png' },
    },
    {
      userId: proUser.id,
      status: JobStatus.PROCESSING,
      imageUrl: 'https://picsum.photos/id/50/800/600',
      webhookUrl: 'https://example.com/webhook/pro',
      options: { quality: 'high', format: 'jpeg' },
    },
  ];

  await jobRepo.insert(jobs);
}
