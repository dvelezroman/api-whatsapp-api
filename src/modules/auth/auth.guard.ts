import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AuthStrategy } from './auth.strategy';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authStrategy: AuthStrategy,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authorization header is missing',
        error: 'Unauthorized',
      });
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authorization type must be Bearer',
        error: 'Unauthorized',
      });
    }

    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Bearer token is missing',
        error: 'Unauthorized',
      });
    }

    const isValid = this.authStrategy.validateToken(token);

    if (!isValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid or expired token',
        error: 'Unauthorized',
      });
    }

    return true;
  }
}
