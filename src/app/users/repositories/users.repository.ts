import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async deductCredit(userId: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(User)
      .set({ credits: () => 'credits - 1' })
      .where('id = :userId AND credits >= 1', { userId })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async refundCredit(userId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(User)
      .set({ credits: () => 'credits + 1' })
      .where('id = :userId', { userId })
      .execute();
  }
}
