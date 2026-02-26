import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfigurationEnv {
  // General Configuration
  @IsNotEmpty()
  @IsString()
  NODE_ENV: string;

  @IsNotEmpty()
  @IsNumber()
  PORT: number;

  @IsNotEmpty()
  @IsString()
  GLOBAL_PREFIX: string;

  @IsNotEmpty()
  @IsString()
  JWT_SECRET: string;
  // Configuration for Database
  @IsNotEmpty()
  @IsString()
  DB_HOST: string;

  @IsNotEmpty()
  @IsNumber()
  DB_PORT: number;

  @IsNotEmpty()
  @IsString()
  DB_USERNAME: string;

  @IsNotEmpty()
  @IsString()
  DB_PASSWORD: string;

  @IsNotEmpty()
  @IsString()
  DB_DATABASE: string;

  @IsNotEmpty()
  @IsNumber()
  DB_LOGGING: number;

  // Internal callback configuration
  @IsOptional()
  @IsString()
  INTERNAL_CALLBACK_SECRET?: string;

  @IsNotEmpty()
  @IsString()
  QUEUE_INTERNAL_CALLBACK_URL: string;
}
