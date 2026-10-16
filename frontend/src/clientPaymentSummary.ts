import type { Deal, PaymentStatus } from './types';

export type ClientPaymentSummary = {
  target: number | null;
  received: number;
  remaining: number | null;
  excess: number;
  progress: number | null;
  label: string;
  tone: 'neutral' | 'warning' | 'success' | 'info';
  stalePaidStatus: boolean;
  overdue: boolean;
};

function normalizeMoney(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function clientPaymentSummary(deal: Deal, today = new Date()): ClientPaymentSummary {
  const invoice = deal.invoices?.find((item) => item.isCurrent) || deal.invoices?.[0];
  const rawTarget = normalizeMoney(invoice?.amount);
  const target = rawTarget !== null && rawTarget > 0 ? rawTarget : null;
  const received = Math.round((deal.clientPayments || []).reduce((sum, item) =>
    sum + (normalizeMoney(item.amount) || 0), 0) * 100) / 100;
  const remaining = target === null ? null : Math.max(0, Math.round((target - received) * 100) / 100);
  const excess = target === null ? 0 : Math.max(0, Math.round((received - target) * 100) / 100);
  const progress = target === null ? null : Math.min(100, Math.round(received / target * 100));
  const paid = target !== null && remaining !== null && remaining <= 0;
  const partial = received > 0 && !paid;
  const overdue = !!(
    deal.paymentStatus === 'DEFERRED' && !paid && deal.deferralEndAt &&
    deal.deferralEndAt.slice(0, 10) < [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')
  );
  const stalePaidStatus = deal.paymentStatus === 'PAID' && !paid;

  let label = 'Ожидаем оплату';
  let tone: ClientPaymentSummary['tone'] = 'neutral';
  if (paid) { label = 'Оплачено полностью'; tone = 'success'; }
  else if (overdue) { label = 'Отсрочка просрочена'; tone = 'warning'; }
  else if (partial && target !== null) { label = 'Частично оплачено'; tone = 'info'; }
  else if (partial) { label = 'Поступление без суммы счёта'; tone = 'info'; }
  else if (deal.paymentStatus === 'DEFERRED') { label = 'Отсрочка платежа'; tone = 'info'; }
  else if (deal.paymentStatus === 'NO_PREPAYMENT') label = 'Без предоплаты';
  else if (stalePaidStatus) { label = 'Оплата не подтверждена'; tone = 'warning'; }

  return { target, received, remaining, excess, progress, label, tone, stalePaidStatus, overdue };
}

export function paymentTermsStatus(status: PaymentStatus): 'WAITING' | 'NO_PREPAYMENT' | 'DEFERRED' {
  return status === 'DEFERRED' ? 'DEFERRED' : status === 'NO_PREPAYMENT' ? 'NO_PREPAYMENT' : 'WAITING';
}
