import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
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

  @Patch(':invoiceId/amount')
  updateAmount(
    @Param('dealId')
    dealId: string,

    @Param('invoiceId')
    invoiceId: string,

    @Body()
    body: {
      amount?: number;
      actorId: string;
    },
  ) {

    return this.invoices
      .updateAmount(
        dealId,
        invoiceId,
        body,
      );
  }


  @Patch(':invoiceId/confirm')
  confirm(
    @Param('dealId') dealId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { actorId: string },
  ) {
    return this.invoices.confirm(dealId, invoiceId, body.actorId);
  }

  @Post(':invoiceId/correction')
  requestCorrection(
    @Param('dealId') dealId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { actorId: string; comment: string; urgent?: boolean; sellerType?: 'ST' | 'MSM' | 'IP' },
  ) {
    return this.invoices.requestCorrection(dealId, invoiceId, body);
  }
}
