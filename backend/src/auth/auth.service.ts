import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramAuthService } from './telegram-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramAuth: TelegramAuthService,
  ) {}

  async login(initData?: string, devRole: UserRole = UserRole.MANAGER) {
    if ((!initData || initData === 'dev') && process.env.ALLOW_DEV_AUTH === 'true') {
      const index = { MANAGER: 1, ACCOUNTANT: 2, LEADER: 3, ADMIN: 4 }[devRole];
      return this.upsertUser({
        id: 100000 + index,
        first_name: ({ MANAGER: 'Тестовый менеджер', ACCOUNTANT: 'Тестовый бухгалтер', LEADER: 'Тестовый руководитель', ADMIN: 'Тестовый админ' } as const)[devRole],
        username: `msm_dev_${devRole.toLowerCase()}`,
      }, devRole);
    }

    const telegramUser = this.telegramAuth.validateInitData(initData ?? '');
    return this.upsertUser(telegramUser);
  }

  private async upsertUser(user: { id: number; first_name: string; last_name?: string; username?: string }, forcedRole?: UserRole) {
    return this.prisma.user.upsert({
      where: { telegramId: BigInt(user.id) },
      update: {
        firstName: user.first_name,
        lastName: user.last_name,
        telegramUsername: user.username,
        ...(forcedRole ? { role: forcedRole } : {}),
      },
      create: {
        telegramId: BigInt(user.id),
        firstName: user.first_name,
        lastName: user.last_name,
        telegramUsername: user.username,
        role: forcedRole ?? UserRole.MANAGER,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        telegramUsername: true,
        role: true,
        active: true,
      },
    });
  }
}
