
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  PurchasesService,
} from './purchases.service';


@Controller('deals/:dealId/suppliers')
export class PurchasesController {

  constructor(
    private readonly purchases:
      PurchasesService,
  ) {}


  @Post(':purchaseId/invoice-revision')
  reviseInvoice(@Param('dealId') dealId:string,@Param('purchaseId') purchaseId:string,
    @Body() body:{actorId:string;sourceFileId:string;number?:string;amount:number;supplierName:string;reason:string}) {
    return this.purchases.reviseInvoice(dealId,purchaseId,body);
  }

  @Post(':purchaseId/realizations')
  addRealization(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string, @Body() body: { actorId: string }) {
    return this.purchases.addRealization(dealId, purchaseId, body.actorId);
  }

  @Patch(':purchaseId/realizations/:realizationId')
  editRealization(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string,
    @Param('realizationId') realizationId: string, @Body() body: { actorId: string; number: string }) {
    return this.purchases.editRealization(dealId, purchaseId, realizationId, body.actorId, body.number);
  }

  @Delete(':purchaseId/realizations/:realizationId')
  deleteRealization(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string,
    @Param('realizationId') realizationId: string, @Body() body: { actorId: string }) {
    return this.purchases.deleteRealization(dealId, purchaseId, realizationId, body.actorId);
  }

  @Patch(':purchaseId/realizations-none')
  setNoRealizations(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string,
    @Body() body: { actorId: string; value: boolean }) {
    return this.purchases.setNoRealizations(dealId, purchaseId, body.actorId, body.value);
  }

  @Get()
  list(
    @Param('dealId')
    dealId: string,
  ) {

    return this.purchases.list(
      dealId,
    );
  }


  @Post()
  create(
    @Param('dealId')
    dealId: string,

    @Body()
    body: any,
  ) {

    return this.purchases.create(
      dealId,
      body,
    );
  }


  @Patch(':purchaseId')
  update(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: any,
  ) {

    return this.purchases.update(
      dealId,
      purchaseId,
      body,
    );
  }


  @Post(':purchaseId/request-payment')
  requestPayment(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: any,
  ) {

    return this.purchases
      .requestPayment(
        dealId,
        purchaseId,
        body,
      );
  }


  @Post(':purchaseId/payments')
  addPayment(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: any,
  ) {

    return this.purchases
      .addPayment(
        dealId,
        purchaseId,
        body,
      );
  }


  @Post(':purchaseId/balance-correction')
  requestBalanceCorrection(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: {
      actualAmount: number;
      comment?: string;
      actorId: string;
    },
  ) {
    return this.purchases.requestBalanceCorrection(
      dealId,
      purchaseId,
      body,
    );
  }

  @Post(':purchaseId/request-stamped-payment')
  requestStampedPayment(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: {
      actorId: string;
    },
  ) {

    return this.purchases
      .requestStampedPayment(
        dealId,
        purchaseId,
        body.actorId,
      );
  }


  @Patch(
    ':purchaseId/payments/:paymentId/stamped'
  )
  markStamped(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Param('paymentId')
    paymentId: string,

    @Body()
    body: {
      actorId: string;
    },
  ) {

    return this.purchases
      .markPaymentStamped(
        dealId,
        purchaseId,
        paymentId,
        body.actorId,
      );
  }

  @Delete(':purchaseId')
  cancelPurchase(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,
  ) {

    return this.purchases
      .cancelPurchase(
        dealId,
        purchaseId,
      );
  }

}
