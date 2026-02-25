import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  deductCredit(userId: string): Promise<boolean> {
    return this.usersRepository.deductCredit(userId);
  }

  refundCredit(userId: string): Promise<void> {
    return this.usersRepository.refundCredit(userId);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }
}
