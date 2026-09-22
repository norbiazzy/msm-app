import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DealsModule } from './deals/deals.module';
import { FilesModule } from './files/files.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ClientPaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { PurchasesModule } from './purchases/purchases.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [PrismaModule, AuthModule, DealsModule, TasksModule, FilesModule, InvoicesModule, ClientPaymentsModule, PurchasesModule, ActivityModule],
  controllers: [AppController],
})
export class AppModule {}
