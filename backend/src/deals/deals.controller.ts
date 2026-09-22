import { Body, Controller, Patch, Get, Param, Post, Query } from '@nestjs/common';
import { CreateDealDto } from './dto';
import { DealsService } from './deals.service';

@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.deals.create(dto);
  }

  @Get()
  list(@Query('managerId') managerId?: string) {
    return this.deals.list(managerId);
  }


  @Post(':id/invoice-request')
  submitInvoiceRequest(
    @Param('id') id: string,
    @Body() body: { actorId: string; urgent?: boolean },
  ) {
    return this.deals.submitInvoiceRequest(id, body);
  }

  @Post(':id/invoice-request/withdraw')
  withdrawInvoiceRequest(
    @Param('id') id: string,
    @Body() body: { actorId: string },
  ) {
    return this.deals.withdrawInvoiceRequest(id, body.actorId);
  }

  @Patch(':id/shipment-date')
  updateShipmentDate(
    @Param('id')
    id: string,

    @Body()
    body: {
      plannedShipmentAt?: string;
      actorId: string;
    },
  ) {

    return this.deals
      .updateShipmentDate(
        id,
        body,
      );
  }


  @Patch(':id/info')
  updateInfo(
    @Param('id')
    id: string,

    @Body()
    body: {
      sellerType?: 'ST' | 'MSM' | 'IP';
      clientName?: string;
      contactName?: string;
      clientPhone?: string;
      managerComment?: string;
      accountingComment?: string;
      marginMode?: string;
      marginValue?: number;
      deliveryAddresses?: string[];
      actorId: string;
    },
  ) {

    return this.deals
      .updateInfo(
        id,
        body,
      );
  }


  @Get(':id')
  get(@Param('id') id: string) {
    return this.deals.get(id);
  }
}
