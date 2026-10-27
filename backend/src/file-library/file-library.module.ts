import { Module } from '@nestjs/common';
import { FileLibraryController } from './file-library.controller';

@Module({ controllers: [FileLibraryController] })
export class FileLibraryModule {}
