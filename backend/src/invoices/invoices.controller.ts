/* MSM_FIXES_V10 */
import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { SellerType } from '@prisma/client';
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


  @Patch(':invoiceId/review-details')
  reviewDetails(@Param('dealId') dealId: string, @Param('invoiceId') invoiceId: string,
    @Body() body: {actorId:string;number:string;amount:number}) {
    return this.invoices.reviewDetails(dealId, invoiceId, body);
  }

  @Patch(':invoiceId/confirm')
  confirm(
    @Param('dealId') dealId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { actorId: string },
  ) {
    return this.invoices.confirm(dealId, invoiceId, body.actorId);
  }

  @Patch(':invoiceId/approve')
  approve(
    @Param('dealId') dealId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { actorId: string },
  ) {
    return this.invoices.approve(dealId, invoiceId, body.actorId);
  }

  @Post(':invoiceId/correction/withdraw')
  withdrawCorrection(
    @Param('dealId') dealId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { actorId: string },
  ) {
    return this.invoices.withdrawCorrection(
      dealId,
      invoiceId,
      body.actorId,
    );
  }

  @Post(':invoiceId/correction')
  requestCorrection(
    @Param('dealId') dealId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { actorId: string; comment: string; urgent?: boolean; sellerType?: SellerType },
  ) {
    return this.invoices.requestCorrection(dealId, invoiceId, body);
  }
}
