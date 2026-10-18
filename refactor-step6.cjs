'use strict';

// MSM refactor stage 6. Presentation-only extraction; no business logic changes.
// Target: GitHub main blob f3476cb4727a4b1c6e945efe81ad4f0c86f6704d (commit 91fe261).
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function fail(message) {
  console.error('\n[MSM step 6] ' + message);
  process.exit(1);
}

const root = process.cwd();
const dealFolder = path.join(root, 'frontend', 'src', 'features', 'deals');
const sourceFile = path.join(dealFolder, 'DealDetail.tsx');
const newFiles = {
  workflow: path.join(dealFolder, 'dealWorkflow.ts'),
  summary: path.join(dealFolder, 'DealSummarySections.tsx'),
  uploads: path.join(dealFolder, 'DealUploadProgress.tsx'),
};

if (!fs.existsSync(path.join(root, 'frontend', 'package.json')) || !fs.existsSync(sourceFile)) {
  fail('Run this script from the msm-app repository root (D:\\job\\it\\msm-app).');
}
for (const dest of Object.values(newFiles)) {
  if (fs.existsSync(dest)) fail(path.basename(dest) + ' already exists. No files changed.');
}

try {
  const tracked = cp.execFileSync('git', ['status', '--porcelain', '--', 'frontend/src/features/deals/DealDetail.tsx'], { cwd: root, encoding: 'utf8' }).trim();
  if (tracked) fail('DealDetail.tsx has uncommitted changes. Commit or save them before running step 6.');
  const headBlob = cp.execFileSync('git', ['rev-parse', 'HEAD:frontend/src/features/deals/DealDetail.tsx'], { cwd: root, encoding: 'utf8' }).trim();
  if (headBlob !== 'f3476cb4727a4b1c6e945efe81ad4f0c86f6704d') {
    fail('DealDetail.tsx does not match the reviewed stage-5 source. No files changed.');
  }
} catch (error) {
  if (error?.status === 1 || error?.status === 128) fail('Could not verify the Git source version; no files changed.');
  throw error;
}

const original = fs.readFileSync(sourceFile, 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
let code = original.replace(/\r\n/g, '\n');
const beforeLines = code.split('\n').length;
const ensureOne = (text, label) => {
  const first = code.indexOf(text);
  if (first < 0 || code.indexOf(text, first + text.length) >= 0) throw new Error('Cannot uniquely identify ' + label);
  return first;
};
const useReplace = (oldText, newText, label) => {
  ensureOne(oldText, label);
  code = code.replace(oldText, newText);
};

const created = [];
let changed = false;
try {
  // 1. Pure workflow status helpers (kept byte-for-byte apart from exports).
  const workflowStart = ensureOne('function dealInvoiceWorkflowLabel(', 'deal workflow start');
  const detailStart = ensureOne('export function DealDetail({', 'DealDetail start');
  if (detailStart <= workflowStart) throw new Error('Unexpected workflow function order.');
  const workflow = code.slice(workflowStart, detailStart).trimEnd();
  for (const name of ['dealInvoiceWorkflowLabel', 'dealInvoiceWorkflowTone', 'supplierIncomingWorkflowLabel']) {
    if (!workflow.includes('function ' + name + '(')) throw new Error('Missing workflow helper ' + name);
  }
  const workflowSource = [
    "import type { Deal } from '../../types';",
    "import { statusLabel } from '../../shared/formatters';",
    '',
    workflow.replace(/^function (dealInvoiceWorkflowLabel|dealInvoiceWorkflowTone|supplierIncomingWorkflowLabel)\(/gm, 'export function $1('),
    '',
  ].join('\n');
  code = code.slice(0, workflowStart) + code.slice(detailStart);

  // 2. Bottom of deal page: incoming request, versions, audit history.
  const summaryAnchor = '      <div className="infoBox">\n\n        <strong>\n          Исходный запрос';
  const summaryStart = ensureOne(summaryAnchor, 'deal summary start');
  const summaryEndMarker = '\n\n      {error && (';
  const summaryEnd = code.indexOf(summaryEndMarker, summaryStart + summaryAnchor.length);
  if (summaryEnd < summaryStart) throw new Error('Could not locate end of deal summary.');
  const summaryJSX = code.slice(summaryStart, summaryEnd).trimEnd();
  for (const expected of ['Лента сделки', 'Версии счёта', 'Исходный запрос']) {
    if (!summaryJSX.includes(expected)) throw new Error('Deal summary incomplete: ' + expected);
  }
  const summarySource = [
    "import type { Deal } from '../../types';",
    "import { auditLabel } from '../../shared/formatters';",
    "import { InvoiceVersion } from './invoices/InvoiceViews';",
    '',
    'export function DealSummarySections({ deal }: { deal: Deal }) {',
    '  return (',
    '    <>',
    summaryJSX,
    '    </>',
    '  );',
    '}',
    '',
  ].join('\n');
  code = code.slice(0, summaryStart) + '      <DealSummarySections deal={deal} />' + code.slice(summaryEnd);

  // 3. Extract existing upload progress markup, without changing rendering or jobs.
  const uploadAnchor = '      {/* PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS */}';
  const uploadStart = ensureOne(uploadAnchor, 'upload display start');
  const backButton = '      <button\n        className="backLink"';
  const uploadEnd = code.indexOf(backButton, uploadStart + uploadAnchor.length);
  if (uploadEnd <= uploadStart) throw new Error('Could not locate upload display end.');
  const uploadJSX = code.slice(uploadStart, uploadEnd).trimEnd();
  if (!uploadJSX.includes('invoiceRequestUploadJob') || !uploadJSX.includes('dealUploadJob')) {
    throw new Error('Upload display does not contain both existing progress blocks.');
  }
  const uploadSource = [
    "import type { BackgroundUploadJob } from '../../backgroundUploads';",
    '',
    'export function DealUploadProgress({',
    '  dealUploadJob,',
    '  invoiceRequestUploadJob,',
    '}: {',
    '  dealUploadJob?: BackgroundUploadJob;',
    '  invoiceRequestUploadJob?: BackgroundUploadJob;',
    '}) {',
    '  return (',
    '    <>',
    uploadJSX,
    '    </>',
    '  );',
    '}',
    '',
  ].join('\n');
  code = code.slice(0, uploadStart) +
    '      <DealUploadProgress\n        dealUploadJob={dealUploadJob}\n        invoiceRequestUploadJob={invoiceRequestUploadJob}\n      />\n\n' +
    code.slice(uploadEnd);

  // Imports: the moved helpers and components own their original dependencies.
  useReplace(
    "import { auditLabel, formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels, statusLabel, taskStatus } from '../../shared/formatters';",
    "import { formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels, taskStatus } from '../../shared/formatters';",
    'formatter imports'
  );
  useReplace(
    "import { InvoiceBlock, InvoiceVersion } from './invoices/InvoiceViews';",
    "import { InvoiceBlock } from './invoices/InvoiceViews';",
    'invoice view imports'
  );
  const existingImport = "import { PaymentBlock } from './payments/PaymentBlock';";
  useReplace(existingImport, existingImport + '\n' + [
    "import { dealInvoiceWorkflowLabel, dealInvoiceWorkflowTone, supplierIncomingWorkflowLabel } from './dealWorkflow';",
    "import { DealSummarySections } from './DealSummarySections';",
    "import { DealUploadProgress } from './DealUploadProgress';",
  ].join('\n'), 'payment block import');

  if (code.includes('function dealInvoiceWorkflowLabel(') ||
      code.includes('<InvoiceVersion') ||
      code.includes('auditLabel(')) {
    throw new Error('One or more moved functions are still present in DealDetail.tsx.');
  }

  fs.writeFileSync(newFiles.workflow, workflowSource.replace(/\n/g, eol), 'utf8'); created.push(newFiles.workflow);
  fs.writeFileSync(newFiles.summary, summarySource.replace(/\n/g, eol), 'utf8'); created.push(newFiles.summary);
  fs.writeFileSync(newFiles.uploads, uploadSource.replace(/\n/g, eol), 'utf8'); created.push(newFiles.uploads);
  changed = true;
  fs.writeFileSync(sourceFile, code.replace(/\n/g, eol), 'utf8');
  console.log('DealDetail.tsx: ' + beforeLines + ' -> ' + code.split('\n').length + ' lines');
  console.log('Created: dealWorkflow.ts, DealSummarySections.tsx, DealUploadProgress.tsx');
  console.log('Building frontend...\n');

  const build = cp.spawnSync('npm', ['run', 'build'], {
    cwd: path.join(root, 'frontend'),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (build.error || build.status !== 0) {
    throw new Error('Frontend build failed (exit code ' + build.status + ').');
  }
  console.log('\nSUCCESS: stage 6 compiled. Please test the deal page before committing.');
} catch (error) {
  if (changed) fs.writeFileSync(sourceFile, original, 'utf8');
  for (const file of created) if (fs.existsSync(file)) fs.unlinkSync(file);
  fail(error.message + '\nStage-6 changes were rolled back; prior changes were preserved.');
}
