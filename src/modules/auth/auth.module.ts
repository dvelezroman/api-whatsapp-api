import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { AuthStrategy } from './auth.strategy';

@Module({
  imports: [ConfigModule],
  providers: [
    AuthStrategy,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
