import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.task.findMany({
      orderBy: [{ urgent: 'desc' }, { createdAt: 'asc' }],
      include: { deal: { include: { invoices: { where: { isCurrent: true }, take: 1 } } }, assignee: true },
    });
  }

  async updateStatus(id: string, status: TaskStatus, assigneeId?: string) {
    return this.prisma.task.update({
      where: { id },
      data: {
        status,
        assigneeId,
        completedAt: status === TaskStatus.DONE ? new Date() : null,
      },
    });
  }
}
