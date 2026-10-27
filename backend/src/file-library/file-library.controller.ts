import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

/**
 * Единая библиотека: одни и те же байты хранятся один раз, ссылки на сделки/задачи
 * хранятся отдельно. Старые StoredFile остаются на месте и видны в библиотеке.
 */
@Controller('file-library')
export class FileLibraryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('q') q?: string) {
    const search = String(q || '').trim().slice(0, 150);
    const where: Prisma.StoredFileWhereInput = search
      ? { OR: [
          { originalName: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ] }
      : {};
    const files = await this.prisma.storedFile.findMany({
      where: { ...where, poolSource: { not: 'LINKED' } }, // MSM_UNIFIED_ATTACHMENTS_V8_LIBRARY
      take: 300,
      orderBy: { createdAt: 'desc' },
      include: {
        deal: { select: { id: true, internalNumber: true, clientName: true } },
        libraryLinks: {
          orderBy: { createdAt: 'desc' },
          include: {
            deal: { select: { id: true, internalNumber: true, clientName: true } },
            task: { select: { id: true, title: true } },
          },
        },
      },
    });
    const ids = [...new Set(files.map(f => f.uploadedById).filter((x): x is string => Boolean(x)))];
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const byId = new Map(users.map(u => [u.id, u]));
    return files.map(f => ({ ...f, uploadedBy: f.uploadedById ? byId.get(f.uploadedById) || null : null }));
  }

  @Get('task/:taskId')
  async forTask(@Param('taskId') taskId: string) {
    const links = await this.prisma.filePoolLink.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { file: true },
    });
    return links.map((link) => ({ ...link.file, linkedAt: link.createdAt }));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('dealId') dealId?: string,
    @Body('taskId') taskId?: string,
    @Body('actorId') actorId?: string,
    @Body('category') category?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Файл не передан');
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const duplicate = await this.prisma.storedFile.findFirst({ where: { sha256 } });
    if (duplicate) {
      if (dealId || taskId) await this.createLink(duplicate.id, dealId, taskId, actorId);
      return { ...duplicate, reused: true };
    }

    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.xls', '.xlsx', '.doc', '.docx', '.xml', '.txt', '.csv']);
    const ext = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(ext)) throw new BadRequestException('Недопустимый тип файла');
    const diskName = `${randomUUID()}${ext}`;
    await writeFile(join(uploadsDir, diskName), file.buffer, { flag: 'wx' });
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const displayName = /[\uFFFD]/.test(originalName) ? file.originalname : originalName;
    const item = await this.prisma.storedFile.create({
      data: {
        dealId: dealId || undefined,
        category: category || 'LIBRARY',
        provider: FileProvider.EXTERNAL,
        originalName: displayName || file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        externalUrl: `local:${diskName}`,
        sha256,
        poolSource: 'DEVICE',
        uploadedById: actorId || null,
      },
    });
    if (dealId || taskId) await this.createLink(item.id, dealId, taskId, actorId);
    return { ...item, reused: false };
  }

  @Post(':fileId/link')
  async link(
    @Param('fileId') fileId: string,
    @Body() body: { dealId?: string; taskId?: string; actorId?: string },
  ) {
    if (!body?.dealId && !body?.taskId) throw new BadRequestException('Выберите сделку или задачу');
    return this.createLink(fileId, body.dealId, body.taskId, body.actorId);
  }

  private async createLink(fileId: string, dealId?: string, taskId?: string, actorId?: string) {
    const file = await this.prisma.storedFile.findUnique({ where: { id: fileId } });
    if (!file) throw new BadRequestException('Файл не найден');
    const task = taskId
      ? await this.prisma.task.findUnique({ where: { id: taskId }, select: { id: true, dealId: true } })
      : null;
    if (taskId && !task) throw new BadRequestException('Задача не найдена');
    if (task && dealId && task.dealId !== dealId) throw new BadRequestException('Задача не принадлежит сделке');
    const actualDealId = task?.dealId || dealId;
    if (actualDealId && !await this.prisma.deal.findUnique({ where: { id: actualDealId }, select: { id: true } })) {
      throw new BadRequestException('Сделка не найдена');
    }
    const where = { fileId, dealId: actualDealId || null, taskId: taskId || null };
    const existing = await this.prisma.filePoolLink.findFirst({ where });
    if (existing) return { ...existing, reused: true };
    const created = await this.prisma.filePoolLink.create({
      data: {
        fileId,
        dealId: actualDealId || null,
        taskId: taskId || null,
        linkedById: actorId || null,
      },
    });
    // При первой привязке к сделке поддерживаем старые экраны deal.files.
    if (actualDealId && !file.dealId) {
      await this.prisma.storedFile.update({ where: { id: fileId }, data: { dealId: actualDealId } });
    }
    return { ...created, reused: false };
  }
}
