import { Injectable } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class AppService {
  constructor(
    private healthService: HealthCheckService,
    private typeOrmHealthIndicator: TypeOrmHealthIndicator,
  ) {}

  // Checks database health and returns system info
  async healthCheck(): Promise<unknown> {
    const result = await this.healthService.check([
      () => this.typeOrmHealthIndicator.pingCheck('database'),
    ]);
    return {
      'node-version': process.version,
      memory: process.memoryUsage(),
      pid: process.pid,
      uptime: process.uptime(),
      appName: process.env.APPLICATION_NAME,
      appVersion: process.env.npm_package_version,
      hostname: process.env.HOSTNAME,
      ...result,
    };
  }
}
