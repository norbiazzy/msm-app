import { ClientPaymentMethod, PaymentStatus } from '@prisma/client';

export class CreateClientPaymentDto {
  amount!: number;
  paidAt!: string;
  method!: ClientPaymentMethod;
  comment?: string;
  actorId!: string;
  fileId?: string;
}

export class UpdatePaymentStatusDto {
  status!: PaymentStatus;
  actorId!: string;
  deferralStartAt?: string;
  deferralEndAt?: string;
  deferralTerms?: string;
}
