import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthStrategy {
  constructor(private configService: ConfigService) {}

  validateToken(token: string): boolean {
    const apiToken = this.configService.get<string>('API_TOKEN');

    if (!apiToken) {
      throw new UnauthorizedException(
        'API_TOKEN not configured. Please set API_TOKEN in environment variables.',
      );
    }

    if (!token) {
      return false;
    }

    return token === apiToken;
  }
}
