import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TelegramAuthService } from './telegram-auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TelegramAuthService],
  exports: [AuthService],
})
export class AuthModule {}
