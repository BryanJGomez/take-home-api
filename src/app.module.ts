import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationValidate } from './config/services/configuration.validate';
import { DatabaseModule } from './database/database.module';
import { loggerOptions } from './utils';
import { AuthModule } from './app/auth/auth.module';
import { IdempotencyModule } from './app/idempotency/idempotency.module';
import { JobsModule } from './app/jobs/jobs.module';
import { UsersModule } from './app/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: ConfigurationValidate,
    }),
    WinstonModule.forRoot(loggerOptions(process.env.APPLICATION_NAME || 'app')),
    DatabaseModule,
    AuthModule,
    JobsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
