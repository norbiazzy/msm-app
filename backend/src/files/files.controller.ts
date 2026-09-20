import { Controller, Param, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
}
