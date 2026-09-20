import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

@Injectable()
export class TelegramAuthService {
  validateInitData(initData: string): TelegramWebAppUser {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new UnauthorizedException('TELEGRAM_BOT_TOKEN is not configured');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new UnauthorizedException('Telegram hash is missing');

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (expectedHash !== hash) throw new UnauthorizedException('Telegram signature is invalid');

    const authDate = Number(params.get('auth_date') ?? 0);
    if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) {
      throw new UnauthorizedException('Telegram auth data is expired');
    }

    const rawUser = params.get('user');
    if (!rawUser) throw new UnauthorizedException('Telegram user is missing');
    return JSON.parse(rawUser) as TelegramWebAppUser;
  }
}
