import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { Job } from '../../jobs/entities/job.entity';

export enum UserPlan {
  BASIC = 'basic',
  PRO = 'pro',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    unique: true,
    length: 100,
    type: 'varchar',
  })
  email: string;

  @Column({
    type: 'enum',
    enum: UserPlan,
    default: UserPlan.BASIC,
  })
  plan: UserPlan;

  @Column({ type: 'int', default: 0 })
  credits: number;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys: ApiKey[];

  @OneToMany(() => Job, (job) => job.user)
  jobs: Job[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
