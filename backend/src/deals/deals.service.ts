import { Injectable } from '@nestjs/common';
import { TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto } from './dto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDealDto) {
    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          sellerType: dto.sellerType,
          clientName: dto.clientName,
          clientPhone: dto.clientPhone,
          contactName: dto.contactName,
          leadSource: dto.leadSource,
          requestMode: dto.requestMode,
          requestText: dto.requestText,
          marginMode: dto.marginMode,
          marginValue: dto.marginValue,
          accountingComment: dto.accountingComment,
          managerComment: dto.managerComment,
          managerId: dto.managerId,
          createdById: dto.createdById,
        },
      });

      await tx.task.create({
        data: {
          dealId: deal.id,
          type: TaskType.ISSUE_CLIENT_INVOICE,
          title: 'Выставить счёт',
          description: dto.accountingComment,
          urgent: Boolean(dto.urgent),
          createdById: dto.createdById,
        },
      });

      await tx.auditEvent.create({
        data: {
          dealId: deal.id,
          actorId: dto.createdById,
          action: 'CREATE',
          entityType: 'Deal',
          entityId: deal.id,
          newValue: { sellerType: dto.sellerType, clientName: dto.clientName },
        },
      });

      return deal;
    });
  }

  list(managerId?: string) {
    return this.prisma.deal.findMany({
      where: managerId ? { managerId } : undefined,
      orderBy: [{ status: 'asc' }, { plannedShipmentAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        invoices: { where: { isCurrent: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        tasks: { where: { status: { notIn: ['DONE', 'CANCELLED'] } }, orderBy: [{ urgent: 'desc' }, { createdAt: 'asc' }] },
      },
    });
  }

  get(id: string) {
    return this.prisma.deal.findUniqueOrThrow({
      where: { id },
      include: {
        manager: true,
        invoices: { orderBy: { createdAt: 'desc' }, include: { file: true } },
        tasks: { orderBy: [{ urgent: 'desc' }, { createdAt: 'desc' }] },
        files: true,
        clientPayments: { orderBy: { paidAt: 'desc' }, include: { file: true, actor: { select: { id: true, firstName: true, lastName: true } } } },
        auditEvents: { orderBy: { createdAt: 'desc' }, include: { actor: true } },
      },
    });
  }
}
