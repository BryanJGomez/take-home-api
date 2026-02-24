import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
    enum: ['basic', 'pro'],
    default: 'basic',
  })
  plan: 'basic' | 'pro';

  @Column({ type: 'int', default: 0 })
  credits: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
