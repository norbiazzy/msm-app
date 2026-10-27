import type { Deal, SupplierPurchase, StoredFile } from './types';

export type DocumentCheckState = 'ready' | 'review' | 'waiting' | 'missing' | 'not-needed';
export type DocumentCheck = { title: string; state: DocumentCheckState; description: string };
export type PurchaseTaskCheck = { state: 'waiting' | 'review' | 'ready'; description: string; count: number };
export type PurchaseDocumentChecks = {
  checks: [DocumentCheck, DocumentCheck, DocumentCheck];
  task: PurchaseTaskCheck;
  sourceFiles: StoredFile[];
  paymentFiles: StoredFile[];
  activeTaskIds: string[];
  allTaskIds: string[];
  attentionCount: number;
};

type PurchaseTaskRow = NonNullable<SupplierPurchase['tasks']>[number];
type DealTaskRow = NonNullable<Deal['tasks']>[number] & { supplierPurchaseId?: string | null };
const active = (status: string) => !['DONE', 'CANCELLED'].includes(status);
const isPaymentTask = (task: PurchaseTaskRow | DealTaskRow) => task.type === 'PAY_SUPPLIER';

/** Read-only status from existing deal files, payments and tasks. Never marks a bank payment as executed. */
export function assessPurchaseDocuments(
  deal: Deal,
  purchase: SupplierPurchase,
  libraryFileCount: number | null = null,
): PurchaseDocumentChecks {
  const files = deal.files || [];
  const sourceFiles = files.filter(file =>
    file.category === 'SUPPLIER_INVOICE_' + purchase.id ||
    file.category === 'SUPPLIER_DOCUMENT_' + purchase.id,
  );
  const paymentIds = new Set((purchase.payments || []).map(p => p.id));
  const paymentFiles = files.filter(file =>
    file.category === 'SUPPLIER_PAYMENT_' + purchase.id ||
    (file.category?.startsWith('SUPPLIER_PAYMENT_STAMP_') &&
      paymentIds.has(file.category.slice('SUPPLIER_PAYMENT_STAMP_'.length))),
  );

  // Deal tasks keep history; purchase.tasks usually contains only unfinished ones.
  // Take only tasks linked by supplierPurchaseId; supplier name alone is not a safe link.
  const associated = [
    ...((deal.tasks || []) as DealTaskRow[]).filter(task => task.supplierPurchaseId === purchase.id && isPaymentTask(task)),
    ...(purchase.tasks || []).filter(isPaymentTask),
  ];
  const tasks = [...new Map(associated.map(task => [task.id, task])).values()];
  const activeTasks = tasks.filter(task => active(task.status));
  const waitingForAccounting = activeTasks.some(task => task.status === 'NEW' || task.status === 'IN_PROGRESS');
  const returnedToManager = activeTasks.some(task => task.status === 'NEED_DATA');
  const hasPayments = (purchase.payments || []).some(p => !p.paidFromBalance);
  const hasOnlyBalancePayments = (purchase.payments || []).length > 0 &&
    (purchase.payments || []).every(p => p.paidFromBalance);
  const paymentRequested = purchase.status === 'PAYMENT_REQUESTED' || activeTasks.length > 0;

  const invoice: DocumentCheck = sourceFiles.length
    ? { title: 'Входящий счёт', state: 'ready', description: 'Файл прикреплён к закупке' }
    : (purchase.incomingInvoiceNumber || purchase.incomingInvoiceAmount)
      ? { title: 'Входящий счёт', state: 'review', description: 'Реквизиты есть; файл в закупке не подтверждён' }
      : { title: 'Входящий счёт', state: 'missing', description: 'Файл не найден в документах этой закупки' };

  let order: DocumentCheck;
  if (hasOnlyBalancePayments) {
    order = { title: 'Платёжное поручение', state: 'not-needed', description: 'Оплата с остатка: платёжка не требуется' };
  } else if (paymentFiles.length) {
    order = { title: 'Платёжное поручение', state: 'ready', description: 'Файл прикреплён; исполнение проверяется отдельно' };
  } else if (libraryFileCount !== null && libraryFileCount > 0) {
    order = { title: 'Платёжное поручение', state: 'review', description: 'Есть файлы из библиотеки: проверьте их тип и получателя' };
  } else if (libraryFileCount === null && tasks.length) {
    order = { title: 'Платёжное поручение', state: 'waiting', description: 'Наличие файлов из библиотеки ещё проверяется' };
  } else if (hasPayments) {
    order = { title: 'Платёжное поручение', state: 'missing', description: 'Поступление в учёте есть, файла платёжки не найдено' };
  } else if (paymentRequested) {
    order = { title: 'Платёжное поручение', state: 'waiting', description: 'Ожидаем документ от бухгалтерии' };
  } else {
    order = { title: 'Платёжное поручение', state: 'not-needed', description: 'Платёж пока не оформлялся' };
  }

  const nonbalance = (purchase.payments || []).filter(p => !p.paidFromBalance);
  const bankMark: DocumentCheck = hasOnlyBalancePayments
    ? { title: 'Отметка банка', state: 'not-needed', description: 'Для оплаты с остатка не требуется' }
    : nonbalance.length === 0
      ? { title: 'Отметка банка', state: 'not-needed', description: 'Проверим после оформления платежа' }
      : nonbalance.every(p => p.paymentOrderStamped)
        ? { title: 'Отметка банка', state: 'review', description: 'Бухгалтер указал отметку. Подлинность проверяют по оригиналу или выписке' }
        : { title: 'Отметка банка', state: 'missing', description: 'Подтверждение исполнения ещё не отмечено' };

  let task: PurchaseTaskCheck;
  if (returnedToManager) {
    task = { state: 'review', description: 'Нужно уточнение от менеджера', count: activeTasks.length };
  } else if (waitingForAccounting) {
    task = { state: 'waiting', description: activeTasks.some(t => t.status === 'IN_PROGRESS') ? 'Бухгалтерия работает над задачей' : 'Задача ожидает бухгалтерию', count: activeTasks.length };
  } else if (purchase.status === 'PAYMENT_REQUESTED') {
    task = { state: 'waiting', description: 'Запрос оплаты передан; проверьте задачи', count: 0 };
  } else {
    task = { state: 'ready', description: 'Активных задач на оплату нет', count: 0 };
  }
  const checks: [DocumentCheck, DocumentCheck, DocumentCheck] = [invoice, order, bankMark];
  return {
    checks, task, sourceFiles, paymentFiles,
    activeTaskIds: activeTasks.map(t => t.id),
    allTaskIds: tasks.map(t => t.id),
    attentionCount: checks.filter(c => c.state === 'review' || c.state === 'missing').length + (task.state === 'review' ? 1 : 0),
  };
}
