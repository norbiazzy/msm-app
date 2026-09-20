import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class TelegramStorageService {
  private botToken() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new BadRequestException('TELEGRAM_BOT_TOKEN is not configured');
    return botToken;
  }

  async upload(file: Express.Multer.File, caption?: string) {
    const botToken = this.botToken();
    const chatId = process.env.TELEGRAM_ARCHIVE_CHAT_ID;
    if (!chatId) throw new BadRequestException('Telegram archive is not configured');

    const form = new FormData();
    form.append('chat_id', chatId);
    if (caption) form.append('caption', caption.slice(0, 1024));

    const bytes = new Uint8Array(file.buffer.byteLength);
    bytes.set(file.buffer);

    form.append(
      'document',
      new Blob([bytes], { type: file.mimetype }),
      file.originalname,
    );

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

  async download(fileId: string) {
    const botToken = this.botToken();
    const metaResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const meta = await metaResponse.json() as any;
    if (!metaResponse.ok || !meta.ok || !meta.result?.file_path) {
      throw new BadRequestException(meta.description ?? 'Не удалось получить файл из Telegram');
    }

    const fileResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${meta.result.file_path}`);
    if (!fileResponse.ok) throw new BadRequestException('Не удалось скачать файл из Telegram');
    return Buffer.from(await fileResponse.arrayBuffer());
  }
}
