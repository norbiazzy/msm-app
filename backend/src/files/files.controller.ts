/* MSM_FIXES_V10 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import type {
  Response,
} from 'express';

import {
  FilesService,
} from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { RecognitionService } from '../recognition/recognition.service';


@Controller('files')
export class FilesController {

  constructor(
    private readonly files: FilesService,
    private readonly prisma: PrismaService,
    private readonly recognition: RecognitionService,
  ) {}


  @Post('deal/:dealId')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        limits: {
          fileSize:
            50 *
            1024 *
            1024,
        },
      },
    ),
  )
  async upload(
    @Param('dealId')
    dealId: string,

    @Body('category')
    category: string,

    @UploadedFile()
    file:
      Express.Multer.File,
  ) {

    if (!file) {
      throw new BadRequestException(
        'Файл не передан',
      );
    }

    const uploadCategory = category || 'MANAGER_ATTACHMENT';
    const stored = await this.files.upload(dealId, uploadCategory, file);
    try {
      await this.recognition.registerUpload(stored.id, uploadCategory, stored.originalName);
    } catch (error) {
      // A recognition error must never lose the uploaded document.
      console.warn('Recognition enqueue failed:', error);
    }
    return stored;
  }


  @Post(':fileId/recognition/retry')
  retryRecognition(@Param('fileId') fileId: string) {
    return this.recognition.retry(fileId);
  }

  @Get(':fileId/recognition')
  recognitionResult(@Param('fileId') fileId: string) {
    return this.recognition.get(fileId);
  }


  // MSM_UNIFIED_ATTACHMENTS_V8_BACKEND: document reuse without copying document bytes.
  @Post('deal/:dealId/from-library')
  async useLibraryFile(
    @Param('dealId') dealId: string,
    @Body() body: { fileId?: string; category?: string },
  ) {
    if (!body?.fileId || !body?.category) {
      throw new BadRequestException('Нужно выбрать файл библиотеки и категорию документа');
    }
    if (body.category.length > 160 || !/^[A-Za-z0-9_]+$/.test(body.category)) {
      throw new BadRequestException('Недопустимая категория документа');
    }
    const [source, deal] = await Promise.all([
      this.prisma.storedFile.findUnique({where:{id:body.fileId}}),
      this.prisma.deal.findUnique({where:{id:dealId},select:{id:true}}),
    ]);
    if (!source || !deal) throw new BadRequestException('Файл библиотеки или сделка не найдены');
    // A metadata record points to the same Telegram/local storage object as the original.
    const linked = await this.prisma.storedFile.create({
      data: {
        dealId,
        category: body.category,
        provider: source.provider,
        poolSource: 'LINKED',
        originalName: source.originalName,
        mimeType: source.mimeType,
        size: source.size,
        telegramFileId: source.telegramFileId,
        telegramUniqueId: source.telegramUniqueId,
        telegramMessageId: source.telegramMessageId,
        telegramChatId: source.telegramChatId,
        externalUrl: source.externalUrl,
      },
    });
    // Preserve extracted document fields on the new reference when recognition is installed.
    try {
      const copied = await this.prisma.$executeRaw`
        INSERT INTO "DocumentRecognition" ("id","fileId","kind","status","engineVersion","result","errorText","createdAt","updatedAt")
        SELECT ${randomUUID()}, ${linked.id}, "kind","status","engineVersion","result","errorText",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
        FROM "DocumentRecognition" WHERE "fileId" = ${source.id} AND "status" = 'DONE'
        ON CONFLICT ("fileId") DO NOTHING
      `;
      if (!copied) await this.recognition.registerUpload(linked.id, body.category, source.originalName);
    } catch (error) {
      console.warn('Не удалось перенести результат распознавания; сам документ уже прикреплён:', error);
    }
    return { id: linked.id };
  }

  @Get(':fileId/download')
  async download(
    @Param('fileId')
    fileId: string,

    @Res()
    res: Response,
  ) {

    const file =
      await this.files.download(
        fileId,
      );

    res.setHeader(
      'Content-Type',
      file.mimeType ||
        'application/octet-stream',
    );

    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(
        file.fileName,
      )}`,
    );

    res.send(file.buffer);
  }
}
