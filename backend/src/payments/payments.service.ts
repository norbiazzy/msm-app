import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientPaymentDto, UpdatePaymentStatusDto } from './dto';

@Injectable()
export class ClientPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dealId: string, dto: CreateClientPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.clientPayment.create({
        data: {
          dealId,
          amount: dto.amount,
          paidAt: new Date(dto.paidAt),
          method: dto.method,
          comment: dto.comment,
          actorId: dto.actorId,
          fileId: dto.fileId,
        },
        include: {
          file: true,
          actor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId: dto.actorId,
          action: 'CLIENT_PAYMENT_ADDED',
          entityType: 'ClientPayment',
          entityId: payment.id,
          newValue: {
            amount: String(dto.amount),
            paidAt: dto.paidAt,
            method: dto.method,
            comment: dto.comment ?? null,
          },
        },
      });

      return payment;
    });
  }

  updateStatus(dealId: string, dto: UpdatePaymentStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
      const deferred = dto.status === PaymentStatus.DEFERRED;

      const deal = await tx.deal.update({
        where: { id: dealId },
        data: {
          paymentStatus: dto.status,
          deferralStartAt: deferred && dto.deferralStartAt ? new Date(dto.deferralStartAt) : null,
          deferralEndAt: deferred && dto.deferralEndAt ? new Date(dto.deferralEndAt) : null,
          deferralTerms: deferred ? dto.deferralTerms : null,
        },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId: dto.actorId,
          action: 'PAYMENT_STATUS_CHANGED',
          entityType: 'Deal',
          entityId: dealId,
          oldValue: {
            paymentStatus: current.paymentStatus,
            deferralStartAt: current.deferralStartAt?.toISOString() ?? null,
            deferralEndAt: current.deferralEndAt?.toISOString() ?? null,
            deferralTerms: current.deferralTerms ?? null,
          },
          newValue: {
            paymentStatus: dto.status,
            deferralStartAt: deferred ? dto.deferralStartAt ?? null : null,
            deferralEndAt: deferred ? dto.deferralEndAt ?? null : null,
            deferralTerms: deferred ? dto.deferralTerms ?? null : null,
          },
        },
      });

      return deal;
    });
  }
}
