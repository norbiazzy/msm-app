/* MSM stage 28: shared supplier payment task documents (display only). */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const target = path.join(frontend, 'src', 'PurchasesBlock.tsx');
const shared = path.join(frontend, 'src', 'TaskDocuments.tsx');
const marker = 'MSM_STEP28_SUPPLIER_PAYMENT_DOCUMENTS';
const lf = (s) => s.replace(/\r\n?/g, '\n');

function digest(s) {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash = Math.imul(hash ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
function abort(message) { throw new Error('[MSM step28] ' + message); }
function exactlyOnce(src, needle, replacement, label) {
  const start = src.indexOf(needle);
  if (start < 0 || src.indexOf(needle, start + needle.length) >= 0) {
    abort('Cannot uniquely locate ' + label + '. No files changed.');
  }
  return src.slice(0, start) + replacement + src.slice(start + needle.length);
}
function replaceSection(src, startAnchor, endAnchor, replacement, label) {
  const start = src.indexOf(startAnchor);
  if (start < 0 || src.indexOf(startAnchor, start + startAnchor.length) >= 0) {
    abort('Cannot uniquely locate start of ' + label + '. No files changed.');
  }
  const end = src.indexOf(endAnchor, start + startAnchor.length);
  if (end < 0 || src.indexOf(endAnchor, end + endAnchor.length) >= 0) {
    abort('Cannot uniquely locate end of ' + label + '. No files changed.');
  }
  return src.slice(0, start) + replacement + src.slice(end);
}

try {
  if (!fs.existsSync(path.join(frontend, 'package.json')) || !fs.existsSync(target)) {
    abort('Start this script from D:\\job\\it\\msm-app');
  }
  if (!fs.existsSync(shared) || !lf(fs.readFileSync(shared, 'utf8')).includes('MSM_STEP25_SHARED_TASK_DOCUMENTS')) {
    abort('The shared TaskDocuments.tsx component from step 25 is missing. Apply step 25 before step 28.');
  }
  const original = fs.readFileSync(target, 'utf8');
  let source = lf(original);
  if (source.includes(marker)) {
    console.log('[MSM step28] Already applied. No changes.');
    process.exit(0);
  }
  const expected = 'ec26e318';
  const actual = digest(source);
  if (actual !== expected) {
    abort('Unexpected local frontend/src/PurchasesBlock.tsx (hash ' + actual +
      '). Refusing to overwrite changes. Send this output for a safe adaptation.');
  }

  source = exactlyOnce(
    source,
    "import { TaskContextStrip } from './TaskContextStrip';",
    "import { TaskContextStrip } from './TaskContextStrip';\nimport { TaskDocuments } from './TaskDocuments';\n/* " + marker + ' */',
    'shared document component import',
  );

  source = replaceSection(
    source,
    '  const incomingFiles =\n    currentPurchaseIncoming',
    '  const paidAlready =\n    payments.reduce(',
    `  // Only files belonging to this supplier purchase or to its payments.
  // SupplierPaymentManagerEdit writes corrected extras into SUPPLIER_DOCUMENT_.
  const purchaseFilesForTask = task.deal.files || [];
  const extraPurchaseDocuments = purchaseFilesForTask.filter(
    (file) =>
      file.category === 'SUPPLIER_ATTACHMENT_' + purchase.id ||
      file.category === 'SUPPLIER_DOCUMENT_' + purchase.id,
  );
  const paymentOrderFiles = purchaseFilesForTask.filter(
    (file) => file.category === 'SUPPLIER_PAYMENT_' + purchase.id,
  );
  const paymentIdSet = new Set((purchase.payments || []).map((payment) => payment.id));
  const stampedPaymentOrderFiles = purchaseFilesForTask.filter((file) => {
    const prefix = 'SUPPLIER_PAYMENT_STAMP_';
    return file.category?.startsWith(prefix) &&
      paymentIdSet.has(file.category.slice(prefix.length));
  });
  const originalDealAttachments = !currentPurchaseIncoming
    ? purchaseFilesForTask.filter((file) => file.category === 'MANAGER_ATTACHMENT')
    : [];

  const supplierCurrentDocuments = [
    ...(currentPurchaseIncoming
      ? [{ file: currentPurchaseIncoming, description: 'Актуальный входящий счёт поставщика' }]
      : originalDealAttachments.map((file) => ({
          file, description: 'Вложение к исходной заявке',
        }))),
    ...purchaseAdditionalFiles.map((file) => ({
      file, description: 'Дополнительный документ поставщика',
    })),
    ...extraPurchaseDocuments.map((file) => ({
      file, description: 'Дополнено по закупке или при исправлении',
    })),
    ...paymentOrderFiles.map((file) => ({
      file, description: 'Платёжное поручение',
    })),
    ...stampedPaymentOrderFiles.map((file) => ({
      file, description: 'Платёжное поручение с отметкой банка',
    })),
  ];
  const supplierHistoryDocuments = purchaseIncomingFiles
    .slice(0, -1)
    .reverse()
    .map((file) => ({
      file, description: 'Предыдущий входящий счёт поставщика',
    }));

`,
    'supplier task file grouping',
  );

  source = replaceSection(
    source,
    '      {incomingFiles.length > 0 && (',
    '            {/* PART_1M_A_SUPPLIER_RETURN */}',
    `      <TaskDocuments
        title="Документы оплаты поставщику"
        subtitle="Входящий счёт, платёжные поручения и документы с отметкой банка"
        current={supplierCurrentDocuments}
        history={supplierHistoryDocuments}
        emptyLabel="По этой закупке файлы пока не приложены"
      />

`,
    'supplier task separate attachment list',
  );

  if (!source.includes('<TaskDocuments') || !source.includes(marker) || source.includes('      {incomingFiles.length > 0 && (')) {
    abort('Internal validation failed; no files changed.');
  }

  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let wrote = false;
  try {
    fs.writeFileSync(target, source.replace(/\n/g, eol), 'utf8');
    wrote = true;
    console.log('[MSM step28] Supplier payment task document list updated. Building frontend...');
    cp.execSync('npm run build', { cwd: frontend, stdio: 'inherit' });
    cp.execSync('git diff --check', { cwd: root, stdio: 'inherit' });
    console.log('SUCCESS: step 28 compiled. Check supplier payment tasks and stamped orders in browser. Do not commit yet.');
  } catch (error) {
    if (wrote) fs.writeFileSync(target, original, 'utf8');
    console.error('[MSM step28] Build or validation failed. Changes to PurchasesBlock.tsx rolled back.');
    throw error;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
