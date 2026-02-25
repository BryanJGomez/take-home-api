import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { AuthService } from './services/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [ApiKeyRepository, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
