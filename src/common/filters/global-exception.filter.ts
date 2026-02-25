import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ExceptionBase } from '../exception.base';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let message: string;
    let error: string;
    let metadata: Record<string, unknown> | undefined;

    if (exception instanceof ExceptionBase) {
      status = exception.statusCode;
      message = exception.message;
      error = exception.type;
      metadata = exception.metadata;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, string>;
        message = resp.message || exception.message;
        error = resp.error || HttpStatus[status] || 'Error';
      } else {
        message = String(exceptionResponse);
        error = HttpStatus[status] || 'Error';
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
      this.logger.error('Unknown exception thrown', String(exception));
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      ...(metadata && { metadata }),
      timestamp: new Date().toISOString(),
    });
  }
}
