import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {}

  // Checks database health and returns system info
  healthCheck() {
    return {
      'node-version': process.version,
      memory: process.memoryUsage(),
      pid: process.pid,
      uptime: process.uptime(),
      appName: process.env.APPLICATION_NAME,
      appVersion: process.env.npm_package_version,
      hostname: process.env.HOSTNAME,
    };
  }
}
