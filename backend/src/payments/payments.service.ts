import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientPaymentDto, UpdatePaymentStatusDto } from './dto';

@Injectable()
export class ClientPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private number(value: unknown): number {
    return Number(value ?? 0);
  }

  async create(dealId: string, dto: CreateClientPaymentDto) {
    const amount = this.number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dto.paidAt) || Number.isNaN(Date.parse(dto.paidAt))) {
      throw new BadRequestException('Укажите положительную сумму и корректную дату оплаты');
    }

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId }, select: { paymentStatus: true } });
      const payment = await tx.clientPayment.create({
        data: {
          dealId, amount: dto.amount, paidAt: new Date(dto.paidAt),
          method: dto.method, comment: dto.comment, actorId: dto.actorId, fileId: dto.fileId,
        },
        include: { file: true, actor: { select: { id: true, firstName: true, lastName: true } } },
      });

      // Read the full amount inside this transaction: the newly created receipt is included.
      const sum = await tx.clientPayment.aggregate({ where: { dealId }, _sum: { amount: true } });
      const received = this.number(sum._sum.amount);
      const invoice = await tx.clientInvoice.findFirst({ where: { dealId, isCurrent: true }, select: { amount: true } });
      const target = invoice?.amount == null ? null : this.number(invoice.amount);
      const settled = target !== null && target > 0 && received + 0.005 >= target;
      const nextStatus = settled
        ? PaymentStatus.PAID
        : deal.paymentStatus === PaymentStatus.DEFERRED
          ? PaymentStatus.DEFERRED
          : PaymentStatus.ADVANCE;

      if (nextStatus !== deal.paymentStatus) {
        await tx.deal.update({ where: { id: dealId }, data: { paymentStatus: nextStatus } });
        await tx.auditEvent.create({
          data: {
            dealId, actorId: dto.actorId, action: 'CLIENT_PAYMENT_STATUS_AUTO',
            entityType: 'Deal', entityId: dealId,
            oldValue: { paymentStatus: deal.paymentStatus },
            newValue: { paymentStatus: nextStatus, received: String(received), target: target === null ? null : String(target) },
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          dealId, actorId: dto.actorId, action: 'CLIENT_PAYMENT_ADDED',
          entityType: 'ClientPayment', entityId: payment.id,
          newValue: {
            amount: String(dto.amount), paidAt: dto.paidAt,
            method: dto.method, comment: dto.comment ?? null,
          },
        },
      });
      return payment;
    });
  }

  async updateStatus(dealId: string, dto: UpdatePaymentStatusDto) {
    if (!Object.values(PaymentStatus).includes(dto.status)) {
      throw new BadRequestException('Неизвестный статус оплаты');
    }
    const deferred = dto.status === PaymentStatus.DEFERRED;
    if (deferred) {
      const start = dto.deferralStartAt;
      const end = dto.deferralEndAt;
      if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end) || Number.isNaN(Date.parse(end))) {
        throw new BadRequestException('Укажите корректную дату окончания отсрочки');
      }
      if (start && (!/^\d{4}-\d{2}-\d{2}$/.test(start) || Number.isNaN(Date.parse(start)) || end < start)) {
        throw new BadRequestException('Проверьте начало и окончание отсрочки');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
      const sum = await tx.clientPayment.aggregate({ where: { dealId }, _sum: { amount: true } });
      const received = this.number(sum._sum.amount);
      const invoice = await tx.clientInvoice.findFirst({ where: { dealId, isCurrent: true }, select: { amount: true } });
      const target = invoice?.amount == null ? null : this.number(invoice.amount);
      const settled = target !== null && target > 0 && received + 0.005 >= target;
      if (dto.status === PaymentStatus.PAID && !settled) {
        throw new BadRequestException('Нельзя указать «Оплачен», пока поступления не покрывают текущий счёт');
      }
      if (dto.status === PaymentStatus.ADVANCE && received <= 0) {
        throw new BadRequestException('Для аванса сначала зарегистрируйте поступление');
      }
      const status = settled ? PaymentStatus.PAID : received > 0 && !deferred ? PaymentStatus.ADVANCE : dto.status;
      const keepDeferral = status === PaymentStatus.DEFERRED;
      const deal = await tx.deal.update({
        where: { id: dealId },
        data: {
          paymentStatus: status,
          deferralStartAt: keepDeferral && dto.deferralStartAt ? new Date(dto.deferralStartAt) : null,
          deferralEndAt: keepDeferral && dto.deferralEndAt ? new Date(dto.deferralEndAt) : null,
          deferralTerms: keepDeferral ? dto.deferralTerms || null : null,
        },
      });
      await tx.auditEvent.create({
        data: {
          dealId, actorId: dto.actorId, action: 'PAYMENT_STATUS_CHANGED',
          entityType: 'Deal', entityId: dealId,
          oldValue: {
            paymentStatus: current.paymentStatus,
            deferralStartAt: current.deferralStartAt?.toISOString() ?? null,
            deferralEndAt: current.deferralEndAt?.toISOString() ?? null,
            deferralTerms: current.deferralTerms ?? null,
          },
          newValue: {
            paymentStatus: status,
            deferralStartAt: keepDeferral ? dto.deferralStartAt ?? null : null,
            deferralEndAt: keepDeferral ? dto.deferralEndAt ?? null : null,
            deferralTerms: keepDeferral ? dto.deferralTerms ?? null : null,
          },
        },
      });
      return deal;
    });
  }
}
