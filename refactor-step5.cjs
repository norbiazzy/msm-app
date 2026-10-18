/**
 * MSM refactor, step 5: extract invoice display and client payment UI from DealDetail.
 * Reviewed against GitHub main commit 08007669cbc9331b2796fd94eac7f56836fe2b07.
 * Does not change business logic, handlers, or JSX inside extracted components.
 * Requires a clean, committed DealDetail.tsx; validates with npm run build.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const srcRoot = path.join(root, 'frontend', 'src');
const source = path.join(srcRoot, 'features', 'deals', 'DealDetail.tsx');
const invoiceFile = path.join(srcRoot, 'features', 'deals', 'invoices', 'InvoiceViews.tsx');
const paymentFile = path.join(srcRoot, 'features', 'deals', 'payments', 'PaymentBlock.tsx');
const EXPECTED_HEAD = '08007669cbc9331b2796fd94eac7f56836fe2b07';
const sourceName = 'frontend/src/features/deals/DealDetail.tsx';

function fail(message) {
  console.error('\n[MSM refactor step 5] ' + message);
  process.exit(1);
}
function git(args) {
  const run = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (run.error || run.status !== 0) fail('Git command failed: ' + args.join(' ') + '\n' + (run.stderr || run.error || ''));
  return run.stdout.trim();
}
function countDeclarations(text, name) {
  const matches = text.match(new RegExp('^function ' + name + '\\(', 'gm'));
  return matches ? matches.length : 0;
}
function assertNoUnexpectedReferences(body, names) {
  for (const name of names) {
    if (new RegExp('\\b' + name + '\\b').test(body))
      fail('Unexpected reference to ' + name + ' in DealDetail. Nothing changed.');
  }
}

if (!fs.existsSync(source)) fail('Run from the msm-app repository root. DealDetail.tsx not found.');
if (fs.existsSync(invoiceFile) || fs.existsSync(paymentFile))
  fail('At least one destination file already exists; nothing changed.');
if (git(['rev-parse', 'HEAD']) !== EXPECTED_HEAD)
  fail('Unexpected HEAD. The script was prepared for commit ' + EXPECTED_HEAD.slice(0, 7) + '. Nothing changed.');
if (git(['status', '--porcelain', '--', sourceName]))
  fail('DealDetail.tsx has uncommitted changes; nothing changed.');

const original = fs.readFileSync(source, 'utf8');
const nl = original.includes('\r\n') ? '\r\n' : '\n';
const lines = original.split(/\r?\n/).length;
if (lines !== 5018)
  fail('Expected 5,018 lines in DealDetail.tsx; got ' + lines + '. Nothing changed.');
const bodyStart = original.indexOf('function dealInvoiceWorkflowLabel(');
const invoiceStart = original.indexOf('function InvoiceBlock(');
const versionStart = original.indexOf('function InvoiceVersion(');
const paymentStart = original.indexOf('function PaymentBlock(');
if (!(bodyStart > 0 && bodyStart < invoiceStart && invoiceStart < versionStart && versionStart < paymentStart))
  fail('Component boundaries differ from the reviewed version. Nothing changed.');

const invoiceContent = original.slice(invoiceStart, paymentStart).trim();
const paymentContent = original.slice(paymentStart).trim();
const keepBody = original.slice(bodyStart, invoiceStart).trimEnd();
for (const name of ['InvoiceBlock', 'InvoiceVersion']) {
  if (countDeclarations(invoiceContent, name) !== 1)
    fail('Invoice content does not contain exactly one ' + name + '. Nothing changed.');
}
if (countDeclarations(paymentContent, 'PaymentBlock') !== 1)
  fail('Payment content does not contain exactly one PaymentBlock. Nothing changed.');
if (invoiceContent.split(/\r?\n/).length < 225 || paymentContent.split(/\r?\n/).length < 190)
  fail('Extracted component sections are unexpectedly short. Nothing changed.');
if (!keepBody.includes('<InvoiceBlock') || !keepBody.includes('<InvoiceVersion') || !keepBody.includes('<PaymentBlock'))
  fail('Expected component usage not found in DealDetail. Nothing changed.');
assertNoUnexpectedReferences(keepBody, ['addClientPayment', 'updatePaymentStatus', 'paymentMethodLabel', 'ClientPaymentMethod', 'PaymentStatus', 'Invoice']);

const remainingImports = [
  "import { useEffect, useState } from 'react';",
  "import { Field } from '../../shared/Field';",
  "import { auditLabel, formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels, statusLabel, taskStatus } from '../../shared/formatters';",
  "import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';",
  "import { TaskContextStrip } from '../../TaskContextStrip';",
  "import { MultiFilePicker, SingleFilePicker } from '../../MultiFilePicker';",
  "import { startBackgroundUploadJob, useBackgroundUploads } from '../../backgroundUploads';",
  "import { PurchasesBlock } from '../../PurchasesBlock';",
  "import { PowerOfAttorneyBlock } from '../../PowerOfAttorneyBlock';",
  "import { updateDealInfo, updateShipmentDate, updateSupplierPurchase, updateInvoiceAmount, confirmInvoice, dealFileUrl, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection } from '../../api';",
  "import type { CurrentUser, Deal, SellerType } from '../../types';",
  "import { InvoiceBlock, InvoiceVersion } from './invoices/InvoiceViews';",
  "import { PaymentBlock } from './payments/PaymentBlock';",
].join(nl);
const invoiceImports = [
  "import { money, sellerLabels } from '../../../shared/formatters';",
  "import { dealFileUrl } from '../../../api';",
  "import type { Invoice, SellerType } from '../../../types';",
].join(nl);
const paymentImports = [
  "import { useEffect, useState } from 'react';",
  "import { Field } from '../../../shared/Field';",
  "import { formatMoneyInput, money, parseMoneyInput, paymentMethodLabel, paymentStatusLabel } from '../../../shared/formatters';",
  "import { SingleFilePicker } from '../../../MultiFilePicker';",
  "import { startBackgroundUploadJob } from '../../../backgroundUploads';",
  "import { addClientPayment, dealFileUrl, updatePaymentStatus } from '../../../api';",
  "import type { ClientPaymentMethod, CurrentUser, Deal, PaymentStatus } from '../../../types';",
].join(nl);

const nextSource = remainingImports + nl + nl + keepBody + nl;
const nextInvoice = invoiceImports + nl + nl + invoiceContent
  .replace(/^function InvoiceBlock\(/m, 'export function InvoiceBlock(')
  .replace(/^function InvoiceVersion\(/m, 'export function InvoiceVersion(') + nl;
const nextPayment = paymentImports + nl + nl + paymentContent
  .replace(/^function PaymentBlock\(/m, 'export function PaymentBlock(') + nl;

// Optional TypeScript parser; npm run build is the mandatory authoritative check.
let ts = null;
for (const base of [path.join(root, 'frontend'), root]) {
  try { ts = require(require.resolve('typescript', { paths: [base] })); break; }
  catch (e) { if (e && e.code !== 'MODULE_NOT_FOUND') fail(String(e)); }
}
if (ts) {
  for (const [filename, text] of [[source, nextSource], [invoiceFile, nextInvoice], [paymentFile, nextPayment]]) {
    const parsed = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (parsed.parseDiagnostics.length) {
      const errors = parsed.parseDiagnostics.slice(0, 3).map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n'));
      fail('TypeScript syntax check failed for ' + path.basename(filename) + ': ' + errors.join('; '));
    }
  }
}

let saved = false;
try {
  fs.mkdirSync(path.dirname(invoiceFile), { recursive: true });
  fs.mkdirSync(path.dirname(paymentFile), { recursive: true });
  fs.writeFileSync(invoiceFile, nextInvoice, 'utf8');
  fs.writeFileSync(paymentFile, nextPayment, 'utf8');
  fs.writeFileSync(source, nextSource, 'utf8');
  console.log('DealDetail.tsx: ' + lines + ' -> ' + nextSource.split(/\r?\n/).length + ' lines');
  console.log('Created InvoiceViews.tsx: ' + nextInvoice.split(/\r?\n/).length + ' lines');
  console.log('Created PaymentBlock.tsx: ' + nextPayment.split(/\r?\n/).length + ' lines');
  console.log('Building frontend...');
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const build = cp.spawnSync(cmd, ['run', 'build'], {
    cwd: path.join(root, 'frontend'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (build.error || build.status !== 0) throw new Error('Frontend build failed');
  saved = true;
  console.log('\nSUCCESS: stage 5 compiled. Test invoice/payment workflows in browser before committing.');
} catch (e) {
  console.error('\n[MSM refactor step 5] ' + String(e.message || e));
} finally {
  if (!saved) {
    fs.writeFileSync(source, original, 'utf8');
    try { fs.rmSync(invoiceFile, { force: true }); } catch {}
    try { fs.rmSync(paymentFile, { force: true }); } catch {}
    console.error('Rollback complete: restored DealDetail.tsx and removed the new component files.');
    process.exitCode = 1;
  }
}
