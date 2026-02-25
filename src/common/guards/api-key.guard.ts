import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../app/auth/services/auth.service';
import { User } from '../../app/users/entities/user.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    // Obtenemos el token de la cabecera Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header. Expected: Bearer pk_xxxxx',
      );
    }

    const token = authHeader.slice(7).trim();
    // Validamos el formato del token (debe empezar con 'pk_')
    if (!token || !token.startsWith('pk_')) {
      throw new UnauthorizedException(
        'Invalid API key format. Expected: pk_xxxxx',
      );
    }
    // Validamos el token contra la base de datos y obtenemos el usuario asociado
    const user = await this.authService.validateApiKey(token);
    // Si no se encuentra un usuario válido, se lanza una excepción de no autorizado
    if (!user) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // Vinculamos el usuario al objeto request para que esté disponible en los controladores
    (request as Request & { user: User }).user = user;

    return true;
  }
}
