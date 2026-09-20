import { Module } from '@nestjs/common';
import { ClientPaymentsController } from './payments.controller';
import { ClientPaymentsService } from './payments.service';

@Module({
  controllers: [ClientPaymentsController],
  providers: [ClientPaymentsService],
})
export class ClientPaymentsModule {}
