import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { TelegramStorageService } from './telegram-storage.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, TelegramStorageService],
  exports: [FilesService],
})
export class FilesModule {}
