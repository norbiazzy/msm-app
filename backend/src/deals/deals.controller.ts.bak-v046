import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Get(':id')
  get(@Param('id') id: string) {
    return this.deals.get(id);
  }
}
