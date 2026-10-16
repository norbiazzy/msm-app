import type { Deal } from '../../types';
export type DealStage = NonNullable<Deal['workflowStage']>;
export const dealStageOptions: { value: DealStage; label: string }[] = [
  { value: 'PREPARING_QUOTE', label: 'Готовим КП' },
  { value: 'REVIEW', label: 'На согласовании' },
  { value: 'AGREED', label: 'Согласован' },
  { value: 'CANCELLED', label: 'Отменён' },
  { value: 'PREPARING_SHIPMENT', label: 'Оформляется' },
  { value: 'DELIVERY', label: 'Доставка' },
  { value: 'SHIPPED', label: 'Отгружен' },
];
export function automaticDealStage(deal: Deal): DealStage {
  const invoice = deal.invoices.find(i => i.isCurrent) || deal.invoices[0];
  const activeCorrection = deal.tasks.some(t => t.type === 'CORRECT_CLIENT_INVOICE' && !['DONE','CANCELLED'].includes(t.status));
  const started = deal.tasks.some(t => ['PAY_SUPPLIER','POWER_OF_ATTORNEY','ETRN'].includes(t.type || '') && t.status !== 'CANCELLED');
  if (!invoice || activeCorrection || invoice.status === 'CORRECTION_REQUESTED' || invoice.status === 'WAITING_ACCOUNTING') {
    // Once logistics has begun, a correction does not roll the deal back.
    if (started) return 'PREPARING_SHIPMENT';
    return 'PREPARING_QUOTE';
  }
  if (started) return 'PREPARING_SHIPMENT';
  if (invoice.status === 'WAITING_MANAGER_REVIEW') return 'REVIEW';
  if (invoice.status === 'CONFIRMED' || invoice.status === 'AGREED') return 'AGREED';
  return 'PREPARING_QUOTE';
}
export function visibleDealStage(deal: Deal): DealStage {
  if (deal.workflowStage === 'SHIPPED' || deal.workflowStage === 'CANCELLED') return deal.workflowStage;
  if (deal.workflowMode === 'MANUAL' && deal.workflowStage) return deal.workflowStage;
  return automaticDealStage(deal);
}
