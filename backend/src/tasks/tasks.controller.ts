import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list() {
    return this.tasks.list();
  }


  @Post(':id/return')
  returnInvoiceRequest(
    @Param('id') id: string,
    @Body() body: {
      actorId: string;
      reasonCode: string;
      comment?: string;
    },
  ) {
    return this.tasks.returnInvoiceRequest(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: TaskStatus; assigneeId?: string }) {
    return this.tasks.updateStatus(id, body.status, body.assigneeId);
  }
}
