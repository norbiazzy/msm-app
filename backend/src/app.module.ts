import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DealsModule } from './deals/deals.module';
import { FilesModule } from './files/files.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [PrismaModule, AuthModule, DealsModule, TasksModule, FilesModule, InvoicesModule],
  controllers: [AppController],
})
export class AppModule {}
