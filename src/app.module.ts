import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationValidate } from './config/services/configuration.validate';
import { loggerOptions } from './utils';
import { JobsModule } from './app/jobs/jobs.module';
import { UsersModule } from './app/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: ConfigurationValidate,
    }),
    WinstonModule.forRoot(loggerOptions(process.env.APPLICATION_NAME || 'app')),
    AppModule,
    JobsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
