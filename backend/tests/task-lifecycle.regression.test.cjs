'use strict';
/**
 * MSM lifecycle regression tests. No real database, network, file upload, or payments.
 * Uses the real compiled TasksService with an in-memory Prisma stand-in.
 * Run from repository root after backend build:
 *   node --test backend/tests/task-lifecycle.regression.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TaskStatus, TaskType } = require('@prisma/client');
const { TasksService } = require('../dist/tasks/tasks.service.js');

function fixture(type = TaskType.POWER_OF_ATTORNEY, initialStatus = TaskStatus.NEW) {
  const records = {
    task: {
      id: 'task-1', dealId: 'deal-1', supplierPurchaseId: 'purchase-1',
      type, status: initialStatus, title: 'Тестовая задача',
      assigneeId: 'accountant-1', completedAt: null,
      description: 'Первоначальные данные', urgent: false,
      details: { supplierOrFactory: 'Завод', items: 'Блоки' },
    },
    deal: { id: 'deal-1', managerId: 'manager-1' },
    purchase: {
      id: 'purchase-1', supplierName: 'Завод',
      incomingInvoiceNumber: 'A-1', incomingInvoiceAmount: 100,
      requestedAmount: 100, comment: 'Оплата', status: 'PAYMENT_REQUESTED',
    },
    files: [
      { id: 'file-old', dealId: 'deal-1', category: 'TASK_ATTACHMENT_task-1' },
      { id: 'file-ready', dealId: 'deal-1', category: 'POWER_OF_ATTORNEY_RESULT_task-1' },
    ],
    audits: [],
    creations: 0,
  };
  const ensureTaskId = (where) => assert.equal(where.id, 'task-1');
  const prisma = {
    async $transaction(fn) { return fn(prisma); },
    task: {
      async findUniqueOrThrow({ where }) {
        ensureTaskId(where);
        return {
          ...records.task,
          deal: { ...records.deal },
          supplierPurchase: { ...records.purchase },
        };
      },
      async findUnique({ where }) {
        ensureTaskId(where);
        return { ...records.task };
      },
      async update({ where, data }) {
        ensureTaskId(where);
        records.task = { ...records.task, ...data };
        return { ...records.task };
      },
      async create() { records.creations++; throw new Error('Unexpected task.create'); },
    },
    deal: {
      async findUniqueOrThrow({ where }) {
        assert.equal(where.id, 'deal-1');
        return { ...records.deal };
      },
    },
    supplierPurchase: {
      async update({ where, data }) {
        assert.equal(where.id, 'purchase-1');
        records.purchase = { ...records.purchase, ...data };
        return { ...records.purchase };
      },
    },
    auditEvent: {
      async create({ data }) {
        records.audits.push(data);
        return { id: 'audit-' + records.audits.length, ...data };
      },
    },
    storedFile: {
      async findFirst({ where }) {
        return records.files.find(f => f.dealId === where.dealId && f.category === where.category) || null;
      },
    },
  };
  return { service: new TasksService(prisma), records };
}

function assertSameTaskAndFiles(records, expectedFiles) {
  assert.equal(records.task.id, 'task-1', 'Task ID must stay constant');
  assert.deepEqual(records.files, expectedFiles, 'Previous files must remain attached');
  assert.equal(records.creations, 0, 'No new task can be created by the lifecycle');
}

test('Доверенность: взять → вернуть → исправить → повторно отправить → завершить с тем же ID', async () => {
  const { service, records } = fixture();
  const originalFiles = structuredClone(records.files);
  const take = await service.updateStatus('task-1', TaskStatus.IN_PROGRESS, 'accountant-1');
  assert.equal(take.status, TaskStatus.IN_PROGRESS);
  const returned = await service.returnToManager('task-1', {
    actorId: 'accountant-1', reasonCode: 'MISSING_DATA', comment: 'Нужен список товаров',
  });
  assert.equal(returned.status, TaskStatus.NEED_DATA);
  assert.equal(returned.assigneeId, 'manager-1');
  assert.equal(records.audits.at(-1).action, 'TASK_RETURNED_TO_MANAGER');
  const resent = await service.resubmitToAccounting('task-1', {
    actorId: 'manager-1', description: 'Исправленные данные', urgent: true,
    details: { supplierOrFactory: 'Завод', items: 'Блоки и клей' },
  });
  assert.equal(resent.status, TaskStatus.NEW);
  assert.equal(resent.assigneeId, null);
  assert.equal(resent.description, 'Исправленные данные');
  assert.equal(resent.details.items, 'Блоки и клей');
  assert.equal(records.audits.at(-1).action, 'TASK_RESUBMITTED_TO_ACCOUNTING');
  await service.updateStatus('task-1', TaskStatus.IN_PROGRESS, 'accountant-1');
  const completed = await service.completePowerOfAttorney('task-1', 'accountant-1', 'Д-125', 'Готово');
  assert.equal(completed.status, TaskStatus.DONE);
  assert.equal(records.task.details.poaNumber, 'Д-125');
  assert.ok(records.task.completedAt instanceof Date);
  assert.equal(records.audits.at(-1).action, 'POWER_OF_ATTORNEY_READY');
  assertSameTaskAndFiles(records, originalFiles);
});

test('ЭТрН: возвращается и повторно отправляется без создания второй задачи', async () => {
  const { service, records } = fixture(TaskType.ETRN);
  const oldFiles = structuredClone(records.files);
  await service.returnToManager('task-1', {
    actorId: 'accountant-1', reasonCode: 'INCORRECT_DATA', comment: 'Уточните адрес',
  });
  assert.equal(records.task.status, TaskStatus.NEED_DATA);
  const result = await service.resubmitToAccounting('task-1', {
    actorId: 'manager-1', details: { loadingAddress: 'Электросталь', carrierCompany: 'Логист' },
  });
  assert.equal(result.status, TaskStatus.NEW);
  assert.equal(result.details.loadingAddress, 'Электросталь');
  assertSameTaskAndFiles(records, oldFiles);
});

test('Выставление счёта: возврат ставит NEED_DATA и сохраняет прежний ID и файлы', async () => {
  const { service, records } = fixture(TaskType.ISSUE_CLIENT_INVOICE);
  const oldFiles = structuredClone(records.files);
  const result = await service.returnInvoiceRequest('task-1', {
    actorId: 'accountant-1', reasonCode: 'NO_DETAILS', comment: 'Нужны реквизиты',
  });
  assert.equal(result.status, TaskStatus.NEED_DATA);
  assert.equal(result.assigneeId, 'manager-1');
  assert.equal(records.audits.at(-1).action, 'INVOICE_REQUEST_RETURNED');
  assertSameTaskAndFiles(records, oldFiles);
});

test('Оплата поставщику: повторная отправка меняет закупку и ту же задачу', async () => {
  const { service, records } = fixture(TaskType.PAY_SUPPLIER);
  const oldFiles = structuredClone(records.files);
  await service.returnToManager('task-1', {
    actorId: 'accountant-1', reasonCode: 'MISSING_DATA', comment: 'Обновите счёт',
  });
  const result = await service.resubmitSupplierPayment('task-1', {
    actorId: 'manager-1', supplierName: 'Новый завод',
    incomingInvoiceNumber: 'A-2', amount: 150, comment: 'Уточнено', urgent: true,
  });
  assert.equal(result.status, TaskStatus.NEW);
  assert.equal(result.assigneeId, null);
  assert.equal(result.title, 'Оплатить поставщику: Новый завод');
  assert.equal(records.purchase.incomingInvoiceNumber, 'A-2');
  assert.equal(Number(records.purchase.requestedAmount), 150);
  assert.equal(records.audits.at(-1).action, 'SUPPLIER_PAYMENT_TASK_RESUBMITTED');
  assertSameTaskAndFiles(records, oldFiles);
});

test('Нельзя отправить повторно задачу, которая не возвращена', async () => {
  const { service, records } = fixture(TaskType.ETRN);
  await assert.rejects(
    () => service.resubmitToAccounting('task-1', {
      actorId: 'manager-1', details: { loadingAddress: 'Калуга' },
    }),
    /Повторно отправить можно только возвращённую задачу/,
  );
  assert.equal(records.task.status, TaskStatus.NEW);
  assert.equal(records.audits.length, 0);
});

test('Нельзя вернуть завершённую задачу; причина «Другое» требует комментарий', async () => {
  const done = fixture(TaskType.ETRN, TaskStatus.DONE);
  await assert.rejects(
    () => done.service.returnToManager('task-1', {
      actorId: 'accountant-1', reasonCode: 'MISSING_DATA',
    }),
    /Вернуть менеджеру можно только активную задачу/,
  );
  const open = fixture(TaskType.ETRN);
  await assert.rejects(
    () => open.service.returnToManager('task-1', {
      actorId: 'accountant-1', reasonCode: 'OTHER', comment: '  ',
    }),
    /Для причины «Другое» добавьте комментарий/,
  );
  assert.equal(open.records.task.status, TaskStatus.NEW);
  assert.equal(open.records.audits.length, 0);
});
