import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { RecognitionService } from '../recognition/recognition.service';
import { FilesService } from './files.service';
import { TelegramStorageService } from './telegram-storage.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, TelegramStorageService, RecognitionService],
  exports: [FilesService],
})
export class FilesModule {}
