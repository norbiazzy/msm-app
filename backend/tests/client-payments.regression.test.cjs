'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PaymentStatus } = require('@prisma/client');
const { ClientPaymentsService } = require('../dist/payments/payments.service.js');

function setup({ target = 200, status = PaymentStatus.WAITING, existing = 0 } = {}) {
  const deal = { id: 'deal-test', paymentStatus: status, deferralStartAt: null, deferralEndAt: null, deferralTerms: null };
  const payments = existing ? [{ id: 'old', amount: existing }] : [];
  const audits = [];
  const tx = {
    deal: {
      findUniqueOrThrow: async () => ({ ...deal }),
      update: async ({ data }) => Object.assign(deal, data),
    },
    clientPayment: {
      create: async ({ data }) => {
        const entry = { id: 'new-' + (payments.length + 1), ...data };
        payments.push(entry);
        return entry;
      },
      aggregate: async () => ({ _sum: { amount: payments.reduce((a, p) => a + Number(p.amount), 0) } }),
    },
    clientInvoice: { findFirst: async () => target === null ? null : { amount: target } },
    auditEvent: { create: async ({ data }) => { audits.push(data); return data; } },
  };
  const prisma = { $transaction: async (fn) => fn(tx) };
  const service = new ClientPaymentsService(prisma);
  const receipt = (amount) => service.create('deal-test', { amount, paidAt: '2026-10-12', method: 'NONCASH', actorId: 'accountant' });
  const change = (status, more = {}) => service.updateStatus('deal-test', { status, actorId: 'accountant', ...more });
  return { deal, payments, audits, service, receipt, change };
}

test('Частичная оплата меняет статус на ADVANCE и сохраняет поступление', async () => {
  const x = setup(); await x.receipt(50);
  assert.equal(x.deal.paymentStatus, PaymentStatus.ADVANCE);
  assert.equal(x.payments.length, 1);
  assert.equal(x.audits.some(e => e.action === 'CLIENT_PAYMENT_STATUS_AUTO'), true);
});

test('После достижения суммы счёта статус становится PAID', async () => {
  const x = setup({ existing: 50 }); await x.receipt(150);
  assert.equal(x.deal.paymentStatus, PaymentStatus.PAID);
});

test('Отсрочка сохраняется при частичной оплате', async () => {
  const x = setup({ status: PaymentStatus.DEFERRED }); await x.receipt(100);
  assert.equal(x.deal.paymentStatus, PaymentStatus.DEFERRED);
});

test('Без известной суммы счёта статус не может автоматически стать PAID', async () => {
  const x = setup({ target: null }); await x.receipt(300);
  assert.equal(x.deal.paymentStatus, PaymentStatus.ADVANCE);
});

test('Нельзя установить PAID без подтверждённой полной суммы', async () => {
  const x = setup(); await assert.rejects(x.change(PaymentStatus.PAID));
  assert.equal(x.deal.paymentStatus, PaymentStatus.WAITING);
});

test('Ручная смена на WAITING не стирает учтённую частичную оплату', async () => {
  const x = setup({ existing: 60 }); await x.change(PaymentStatus.WAITING);
  assert.equal(x.deal.paymentStatus, PaymentStatus.ADVANCE);
});

test('Отсрочка требует дату окончания и правильный диапазон', async () => {
  const x = setup();
  await assert.rejects(x.change(PaymentStatus.DEFERRED));
  await assert.rejects(x.change(PaymentStatus.DEFERRED, {deferralStartAt:'2026-10-20',deferralEndAt:'2026-10-12'}));
  await x.change(PaymentStatus.DEFERRED, {deferralStartAt:'2026-10-12',deferralEndAt:'2026-10-20'});
  assert.equal(x.deal.paymentStatus, PaymentStatus.DEFERRED);
});

test('Нельзя записать нулевое или отрицательное поступление', async () => {
  const x = setup();
  await assert.rejects(x.receipt(0));
  await assert.rejects(x.receipt(-10));
  assert.equal(x.payments.length, 0);
});
