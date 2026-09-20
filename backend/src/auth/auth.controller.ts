import { Body, Controller, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  login(@Body() body: { initData?: string; devRole?: UserRole }) {
    return this.authService.login(body.initData, body.devRole);
  }
}
