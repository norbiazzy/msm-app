import { BadRequestException, Injectable } from '@nestjs/common';
import { InvoiceStatus, SellerType, TaskStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dealId: string, body: {
    number: string;
    invoiceDate?: string;
    amount?: number;
    fileId?: string;
    actorId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
      const latest = await tx.clientInvoice.findFirst({
        where: { dealId },
        orderBy: { version: 'desc' },
      });

      await tx.clientInvoice.updateMany({ where: { dealId, isCurrent: true }, data: { isCurrent: false } });

      const invoice = await tx.clientInvoice.create({
        data: {
          dealId,
          sellerType: deal.sellerType as SellerType,
          number: body.number,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
          amount: body.amount,
          fileId: body.fileId,
          version: (latest?.version ?? 0) + 1,
          isCurrent: true,
          status: InvoiceStatus.WAITING_MANAGER_REVIEW,
        },
      });

      await tx.task.updateMany({
        where: {
          dealId,
          type: { in: [TaskType.ISSUE_CLIENT_INVOICE, TaskType.CORRECT_CLIENT_INVOICE] },
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
        data: { status: TaskStatus.DONE, completedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId: body.actorId,
          action: 'UPLOAD',
          entityType: 'ClientInvoice',
          entityId: invoice.id,
          newValue: { number: body.number, amount: body.amount, version: invoice.version },
        },
      });

      return invoice;
    });
  }

  async updateAmount(
    dealId: string,
    invoiceId: string,

    body: {
      amount?: number;
      actorId: string;
    },
  ) {

    const invoice =
      await this.prisma
        .clientInvoice
        .findFirstOrThrow({

          where: {
            id: invoiceId,
            dealId,
          },
        });


    if (!invoice.isCurrent) {

      throw new BadRequestException(
        'Изменить сумму можно только у актуальной версии счёта',
      );
    }


    const updated =
      await this.prisma
        .clientInvoice
        .update({

          where: {
            id: invoiceId,
          },

          data: {
            amount:
              body.amount ??
              null,
          },
        });


    await this.prisma
      .auditEvent
      .create({

        data: {

          dealId,

          actorId:
            body.actorId,

          action:
            'INVOICE_AMOUNT_CHANGED',

          entityType:
            'ClientInvoice',

          entityId:
            invoiceId,

          oldValue: {
            amount:
              invoice.amount
                ?.toString() ??
              null,
          },

          newValue: {
            amount:
              updated.amount
                ?.toString() ??
              null,

            number:
              invoice.number,

            version:
              invoice.version,
          },
        },
      });


    return updated;
  }


  async confirm(dealId: string, invoiceId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.findFirstOrThrow({ where: { id: invoiceId, dealId } });
      if (!invoice.isCurrent) throw new BadRequestException('Подтвердить можно только актуальную версию счёта');

      const updated = await tx.clientInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.CONFIRMED },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId,
          action: 'CONFIRM',
          entityType: 'ClientInvoice',
          entityId: invoiceId,
          oldValue: { status: invoice.status },
          newValue: { status: InvoiceStatus.CONFIRMED },
        },
      });

      return updated;
    });
  }

  async requestCorrection(
    dealId: string,
    invoiceId: string,
    body: { actorId: string; comment: string; urgent?: boolean; sellerType?: SellerType },
  ) {
    const comment = body.comment?.trim();
    if (!comment) throw new BadRequestException('Укажите, что нужно скорректировать');

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.findFirstOrThrow({ where: { id: invoiceId, dealId } });
      if (!invoice.isCurrent) throw new BadRequestException('Корректировать можно только актуальную версию счёта');

      const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });

      if (
        body.sellerType &&
        body.sellerType !== deal.sellerType
      ) {
        await tx.deal.update({
          where: { id: dealId },
          data: { sellerType: body.sellerType },
        });

        await tx.auditEvent.create({
          data: {
            dealId,
            actorId: body.actorId,
            action: 'DEAL_SELLER_CHANGED',
            entityType: 'Deal',
            entityId: dealId,
            oldValue: { sellerType: deal.sellerType },
            newValue: { sellerType: body.sellerType },
            reason: 'Изменено при отправке счёта на корректировку',
          },
        });
      }

      const existing = await tx.task.findFirst({
        where: {
          dealId,
          type: TaskType.CORRECT_CLIENT_INVOICE,
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
      });
      if (existing) throw new BadRequestException('По этому счёту уже есть активная задача на корректировку');

      await tx.clientInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.CORRECTION_REQUESTED },
      });

      const task = await tx.task.create({
        data: {
          dealId,
          type: TaskType.CORRECT_CLIENT_INVOICE,
          title: `Скорректировать счёт ${invoice.number}`,
          description: comment,
          urgent: Boolean(body.urgent),
          createdById: body.actorId,
        },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId: body.actorId,
          action: 'REQUEST_CORRECTION',
          entityType: 'ClientInvoice',
          entityId: invoiceId,
          oldValue: { status: invoice.status },
          newValue: { status: InvoiceStatus.CORRECTION_REQUESTED, comment, urgent: Boolean(body.urgent) },
          reason: comment,
        },
      });

      return task;
    });
  }
}
