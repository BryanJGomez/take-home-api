import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  constructor(private config: ConfigService) {}
  // Configurarion General
  get nodeEnv(): string {
    return <string>this.config.get('NODE_ENV');
  }
  get globalPrefix(): string {
    return <string>this.config.get('GLOBAL_PREFIX');
  }
  get port(): number {
    return <number>this.config.get('PORT');
  }
  // Database
  get dbHost(): string {
    return <string>this.config.get('DB_HOST');
  }
  get dbPort(): number {
    return <number>this.config.get('DB_PORT');
  }
  get dbUsername(): string {
    return <string>this.config.get('DB_USERNAME');
  }
  get dbPassword(): string {
    return <string>this.config.get('DB_PASSWORD');
  }
  get dbDatabase(): string {
    return <string>this.config.get('DB_DATABASE');
  }

  get dbLogging(): boolean {
    return <boolean>this.config.get('DB_LOGGING');
  }
}
