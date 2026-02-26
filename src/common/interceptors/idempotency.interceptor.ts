import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { UnprocessableEntityException } from '../argument-invalid.exception';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { IdempotencyService } from '../../app/idempotency/services/idempotency.service';
import { User } from '../../app/users/entities/user.entity';

// Interceptor que garantiza idempotencia en peticiones HTTP.
// Si el cliente envía el header "Idempotency-Key", este interceptor verifica
// si ya existe una respuesta cacheada para esa clave y usuario. Si existe,
// retorna la respuesta anterior sin volver a ejecutar el handler. Si no,
// ejecuta el handler normalmente y guarda la respuesta para futuras peticiones
// con la misma clave.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // Extraemos la request HTTP y el header "Idempotency-Key"
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const idempotencyKey = request.headers['idempotency-key'] as
      | string
      | undefined;

    // Si no se envió el header, no aplicamos idempotencia y continuamos normalmente
    if (!idempotencyKey) {
      return next.handle();
    }
    // Si no hay usuario autenticado, no podemos asociar la clave a nadie,
    // así que continuamos sin idempotencia
    const user = request.user;
    if (!user) {
      return next.handle();
    }
    // Generamos un hash del body del request para detectar si la misma clave
    // se está usando con un body diferente
    const requestHash = this.idempotencyService.hashRequestBody(
      request.body as Record<string, unknown>,
    );
    // Buscamos si ya existe un registro de idempotencia para este usuario y clave
    const { cached, conflict } = await this.idempotencyService.findExisting(
      user.id,
      idempotencyKey,
      requestHash,
    );
    // Si la clave ya fue usada con un body diferente, lanzamos error 422
    if (conflict) {
      throw new UnprocessableEntityException(
        'Idempotency-Key has already been used with a different request body',
        {
          code: 'IDEMPOTENCY_KEY_CONFLICT',
        },
      );
    }
    // Si encontramos una respuesta cacheada con el mismo body,
    // restauramos el status code original y retornamos la respuesta guardada
    if (cached) {
      const response = context.switchToHttp().getResponse<Response>();
      response.status(cached.responseStatusCode);
      return of(cached.responseBody);
    }
    // No hay cache: ejecutamos el handler real y guardamos la respuesta
    // para futuras peticiones con la misma clave de idempotencia
    return next.handle().pipe(
      switchMap(async (responseBody) => {
        const response = context.switchToHttp().getResponse<Response>();
        const statusCode = response.statusCode || HttpStatus.OK;
        // Intentamos guardar la respuesta en cache; si falla, solo loggeamos
        if (statusCode >= 200 && statusCode < 300) {
          try {
            await this.idempotencyService.save(
              user.id,
              idempotencyKey,
              requestHash,
              statusCode,
              responseBody as Record<string, unknown>,
            );
          } catch {
            this.logger.warn('Failed to cache idempotency response');
          }
        }
        return responseBody as Record<string, unknown>;
      }),
    );
  }
}
