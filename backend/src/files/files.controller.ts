import { Body, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('deal/:dealId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @Param('dealId') dealId: string,
    @Body('category') category: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.files.upload(dealId, category || 'OTHER', file);
  }

  @Get(':fileId/download')
  async download(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.files.download(fileId);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.send(file.buffer);
  }
}
