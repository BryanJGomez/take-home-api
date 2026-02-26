import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalCallbackGuard implements CanActivate {
  private readonly logger = new Logger(InternalCallbackGuard.name);
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('INTERNAL_CALLBACK_SECRET') ||
      'default-internal-secret';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-internal-secret'] as string;

    if (!providedSecret || providedSecret !== this.secret) {
      this.logger.warn(
        'Unauthorized internal callback attempt from ' + request.ip,
      );
      throw new ForbiddenException('Invalid internal secret');
    }

    return true;
  }
}
