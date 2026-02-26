import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('idempotency_keys')
@Index(['userId', 'idempotencyKey'], { unique: true })
@Index('IDX_idempotency_keys_expiresAt', ['expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 64 })
  requestHash: string;

  @Column({ type: 'int' })
  responseStatusCode: number;

  @Column({ type: 'jsonb' })
  responseBody: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
