import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramStorageService } from './telegram-storage.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramStorageService,
  ) {}

  async upload(dealId: string, category: string, file: Express.Multer.File) {
    const remote = await this.telegram.upload(file, `${category} · ${dealId}`);
    return this.prisma.storedFile.create({
      data: {
        dealId,
        category,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        telegramFileId: remote.fileId,
        telegramUniqueId: remote.uniqueId,
        telegramMessageId: remote.messageId,
        telegramChatId: remote.chatId,
      },
    });
  }

  async download(fileId: string) {
    const stored = await this.prisma.storedFile.findUniqueOrThrow({ where: { id: fileId } });
    if (!stored.telegramFileId) throw new BadRequestException('У файла нет Telegram file_id');
    const buffer = await this.telegram.download(stored.telegramFileId);
    return { buffer, fileName: stored.originalName, mimeType: stored.mimeType };
  }
}
