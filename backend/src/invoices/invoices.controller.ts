import { Body, Controller, Param, Post } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('deals/:dealId/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  create(
    @Param('dealId') dealId: string,
    @Body() body: { number: string; invoiceDate?: string; amount?: number; fileId?: string; actorId: string },
  ) {
    return this.invoices.create(dealId, body);
  }
}
