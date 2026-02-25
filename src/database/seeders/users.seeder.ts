import { AppDataSource } from '../data-source';
import { User, UserPlan } from '../../app/users/entities/user.entity';

export async function seedUsers(): Promise<void> {
  const userRepository = AppDataSource.getRepository(User);

  const users = [
    {
      name: 'Basic User',
      email: 'basic@vibepeak.test',
      plan: UserPlan.BASIC,
      credits: 10,
    },
    {
      name: 'Pro User',
      email: 'pro@vibepeak.test',
      plan: UserPlan.PRO,
      credits: 100,
    },
  ];

  await userRepository.upsert(users, ['email']);
}
