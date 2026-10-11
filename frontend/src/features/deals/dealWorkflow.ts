import type { Deal } from '../../types';
import { statusLabel } from '../../shared/formatters';

export function dealInvoiceWorkflowLabel(
  deal: Deal,
) {

  const invoice =
    deal.invoices.find(
      (item) => item.isCurrent
    ) ??
    deal.invoices[0];


  if (invoice) {

    const labels:
      Record<string, string> = {

      WAITING_MANAGER_REVIEW:
        'Счёт ожидает проверку',

      CONFIRMED:
        'Счёт готов',

      AGREED:
        'Счёт готов',

      CORRECTION_REQUESTED:
        'Счёт на корректировке',

      WAITING_ACCOUNTING:
        'Счёт на создании',
    };


    return (
      labels[invoice.status] ||
      statusLabel(invoice.status)
    );
  }


  const requestTask =
    deal.tasks.find(
      (task) =>
        task.type ===
          'ISSUE_CLIENT_INVOICE' &&
        ![
          'DONE',
          'CANCELLED',
        ].includes(
          task.status
        )
    );


  if (!requestTask) {
    return 'Запрос на счёт не активен';
  }


  if (
    requestTask.status ===
      'IN_PROGRESS'
  ) {
    return 'Счёт в работе у бухгалтерии';
  }


  if (
    requestTask.status ===
      'NEED_DATA'
  ) {
    return 'Нужны данные';
  }


  return 'Счёт на создании';
}


export function dealInvoiceWorkflowTone(
  deal: Deal,
) {

  const invoice =
    deal.invoices.find(
      (item) => item.isCurrent
    ) ??
    deal.invoices[0];


  if (invoice) {
    if (
      invoice.status === 'AGREED' ||
      invoice.status === 'CONFIRMED'
    ) {
      return 'agreed';
    }

    if (
      invoice.status ===
        'CORRECTION_REQUESTED'
    ) {
      return 'correction';
    }

    if (
      invoice.status ===
        'WAITING_MANAGER_REVIEW'
    ) {
      return 'review';
    }
  }


  const requestTask =
    deal.tasks.find(
      (task) =>
        task.type ===
          'ISSUE_CLIENT_INVOICE' &&
        ![
          'DONE',
          'CANCELLED',
        ].includes(
          task.status
        )
    );


  if (requestTask?.status === 'IN_PROGRESS') {
    return 'working';
  }

  if (requestTask?.status === 'NEED_DATA') {
    return 'needs-data';
  }

  return 'creating';
}


export function supplierIncomingWorkflowLabel(
  deal: Deal,
) {

  const purchases =
    deal.supplierPurchases || [];


  const files =
    deal.files || [];


  const hasDealIncoming =
    files.some(
      (file) =>
        file.category ===
          'CUSTOMER_INVOICE_PRIMARY' ||
        file.category
          ?.startsWith(
            'CORRECTION_PRIMARY_'
          )
    );


  const hasSupplierIncoming =
    purchases.some(
      (purchase) =>
        files.some(
          (file) =>
            file.category ===
              'SUPPLIER_INVOICE_' +
              purchase.id
        )
    );


  if (
    !hasDealIncoming &&
    !hasSupplierIncoming
  ) {
    return 'Нет входящего';
  }


  if (purchases.length === 0) {
    return 'Входящий не оплачен';
  }


  if (
    purchases.every(
      (purchase) =>
        purchase.status === 'PAID'
    )
  ) {
    return 'Входящий оплачен';
  }


  if (
    purchases.some(
      (purchase) =>
        purchase.status ===
          'PAYMENT_REQUESTED' ||
        purchase.status ===
          'PARTIALLY_PAID'
    )
  ) {
    return 'Входящий на оплате';
  }


  return 'Входящий не оплачен';
}
