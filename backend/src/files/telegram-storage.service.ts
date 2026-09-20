import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class TelegramStorageService {
  async upload(file: Express.Multer.File, caption?: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ARCHIVE_CHAT_ID;
    if (!botToken || !chatId) {
      throw new BadRequestException('Telegram archive is not configured');
    }

    const form = new FormData();
    form.append('chat_id', chatId);
    if (caption) form.append('caption', caption.slice(0, 1024));
    form.append('document', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    const payload = await response.json() as any;
    if (!response.ok || !payload.ok) {
      throw new BadRequestException(payload.description ?? 'Telegram upload failed');
    }

    const document = payload.result.document;
    return {
      fileId: document.file_id as string,
      uniqueId: document.file_unique_id as string,
      messageId: payload.result.message_id as number,
      chatId: String(payload.result.chat.id),
    };
  }
}
