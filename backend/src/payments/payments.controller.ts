import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CreateClientPaymentDto, UpdatePaymentStatusDto } from './dto';
import { ClientPaymentsService } from './payments.service';

@Controller('deals/:dealId/payments')
export class ClientPaymentsController {
  constructor(private readonly payments: ClientPaymentsService) {}

  @Post()
  create(
    @Param('dealId') dealId: string,
    @Body() dto: CreateClientPaymentDto,
  ) {
    return this.payments.create(dealId, dto);
  }

  @Patch('status')
  updateStatus(
    @Param('dealId') dealId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.payments.updateStatus(dealId, dto);
  }
}
