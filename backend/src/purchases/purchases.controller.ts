
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
