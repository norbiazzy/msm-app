'use strict';

// MSM refactor stage 9: extract deal overview and incoming-invoice card.
// Source sections checked against main at commit 3c5c645. Requires stages 7 and 8 locally.
// Copies JSX exactly; state, callbacks, API calls, and uploading stay in DealDetail.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function abort(message) {
  console.error('\n[MSM step 9] ' + message);
  process.exitCode = 1;
}
const root = process.cwd();
const frontend = path.join(root, 'frontend');
const folder = path.join(frontend, 'src', 'features', 'deals');
const sourceFile = path.join(folder, 'DealDetail.tsx');
const overviewFile = path.join(folder, 'DealOverview.tsx');
const incomingFile = path.join(folder, 'DealIncomingInvoices.tsx');

if (!fs.existsSync(path.join(frontend, 'package.json')) || !fs.existsSync(sourceFile)) {
  abort('Open D:\\job\\it\\msm-app and run the script from the repository root.');
} else if (!fs.existsSync(path.join(folder, 'DealClientSection.tsx')) ||
           !fs.existsSync(path.join(folder, 'DealSidebar.tsx')) ||
           !fs.existsSync(path.join(folder, 'DealAttention.tsx'))) {
  abort('Stages 7 and 8 must be applied first. Nothing changed.');
} else if (fs.existsSync(overviewFile) || fs.existsSync(incomingFile)) {
  abort('DealOverview.tsx or DealIncomingInvoices.tsx already exists; not overwriting it. Nothing changed.');
} else {
  const original = fs.readFileSync(sourceFile, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let code = original.replace(/\r\n/g, '\n');
  const created = [];
  let sourceWritten = false;

  function findOnce(needle, label) {
    const p = code.indexOf(needle);
    if (p < 0 || code.indexOf(needle, p + needle.length) >= 0) {
      throw new Error('Expected exactly one ' + label + '; refusing to modify files.');
    }
    return p;
  }
  // Deterministic checksum of UTF-16 character codes. Protects sections from unintended edits.
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  try {
    findOnce("import { DealClientSection } from './DealClientSection';", 'stage 8 import');
    findOnce("import { DealSidebar } from './DealSidebar';", 'stage 7 import');
    findOnce("import { DealAttention } from './DealAttention';", 'stage 7 attention import');

    const overviewMark = '      <div className="dealOverview">';
    const incomingMark = '      {showDealIncomingInvoices && (';
    const nextMark = '      <DealClientSection';
    const start = findOnce(overviewMark, 'deal overview section');
    const mid = findOnce(incomingMark, 'incoming-invoice section');
    const end = findOnce(nextMark, 'client section (stage 8)');
    if (!(start < mid && mid < end)) throw new Error('Sections are not in the expected order.');
    const overview = code.slice(start, mid);
    const incoming = code.slice(mid, end);
    if (hash(overview) !== '0031aa26' || hash(incoming) !== '0991dd49') {
      throw new Error('Overview/incoming-invoice JSX differs from the reviewed version. No files changed.');
    }
    if (!overview.includes('saveQuickInvoiceAmount') || !overview.includes('saveQuickShipmentDate') ||
        !incoming.includes('previousCustomerInvoices')) {
      throw new Error('Expected controls are missing. No files changed.');
    }

    const overviewProps = [
      ['deal', 'Deal'],
      ['current', 'Invoice | undefined'],
      ['invoiceRequestUploadJob', 'BackgroundUploadJob | undefined'],
      ['canManageDeal', 'boolean'],
      ['quickEdit', 'QuickEdit'],
      ['setQuickEdit', 'Setter<QuickEdit>'],
      ['supplierPurchases', 'NonNullable<Deal[\'supplierPurchases\']>'],
      ['incomingTotal', 'number'],
      ['supplierNames', 'string[]'],
      ['incomingWorkflowTone', 'string'],
      ['incomingWorkflowStatus', 'string'],
      ['managerAmount', 'string'],
      ['setManagerAmount', 'Setter<string>'],
      ['copyDealValue', '(value: string) => void'],
      ['saving', 'boolean'],
      ['saveQuickInvoiceAmount', '() => Promise<void>'],
      ['editableIncomingPurchase', 'NonNullable<Deal[\'supplierPurchases\']>[number] | undefined'],
      ['incomingAmountDraft', 'string'],
      ['setIncomingAmountDraft', 'Setter<string>'],
      ['saveQuickIncomingAmount', '() => Promise<void>'],
      ['shipmentDate', 'string'],
      ['setShipmentDate', 'Setter<string>'],
      ['saveQuickShipmentDate', '() => Promise<void>'],
    ];
    const overviewSource = [
      "import type { Dispatch, SetStateAction } from 'react';",
      "import type { Deal, Invoice } from '../../types';",
      "import type { BackgroundUploadJob } from '../../backgroundUploads';",
      "import { Field } from '../../shared/Field';",
      "import { formatMoneyInput, money, paymentStatusLabel, sellerLabels } from '../../shared/formatters';",
      "import { dealFileUrl } from '../../api';",
      "import { dealInvoiceWorkflowLabel, dealInvoiceWorkflowTone } from './dealWorkflow';",
      '',
      "type QuickEdit = 'invoiceAmount' | 'incomingAmount' | 'shipmentDate' | null;",
      'type Setter<T> = Dispatch<SetStateAction<T>>;',
      'type DealOverviewProps = {',
      ...overviewProps.map(([name, type]) => `  ${name}: ${type};`),
      '};',
      '',
      'export function DealOverview({',
      ...overviewProps.map(([name]) => `  ${name},`),
      '}: DealOverviewProps) {',
      '  return (',
      overview.trimEnd(),
      '  );',
      '}',
      '',
    ].join('\n');
    const overviewCall = [
      '      <DealOverview',
      ...overviewProps.map(([name]) => `        ${name}={${name}}`),
      '      />',
    ].join('\n');

    const incomingProps = [
      ['showDealIncomingInvoices', 'boolean'],
      ['supplierIncomingRows', "Array<{ purchase: SupplierPurchase; file: StoredFile }>"],
      ['currentCustomerInvoice', 'StoredFile | undefined'],
      ['previousCustomerInvoices', 'StoredFile[]'],
      ['incomingHistoryOpen', 'boolean'],
      ['setIncomingHistoryOpen', 'Setter<boolean>'],
    ];
    const incomingSource = [
      "import type { Dispatch, SetStateAction } from 'react';",
      "import type { StoredFile, SupplierPurchase } from '../../types';",
      "import { dealFileUrl } from '../../api';",
      '',
      'type Setter<T> = Dispatch<SetStateAction<T>>;',
      'type DealIncomingInvoicesProps = {',
      ...incomingProps.map(([name, type]) => `  ${name}: ${type};`),
      '};',
      '',
      'export function DealIncomingInvoices({',
      ...incomingProps.map(([name]) => `  ${name},`),
      '}: DealIncomingInvoicesProps) {',
      '  return (',
      '    <>',
      incoming.trimEnd(),
      '    </>',
      '  );',
      '}',
      '',
    ].join('\n');
    const incomingCall = [
      '      <DealIncomingInvoices',
      ...incomingProps.map(([name]) => `        ${name}={${name}}`),
      '      />',
    ].join('\n');

    // Both sections are consecutive. Keep surrounding layout and state unchanged.
    code = code.slice(0, start) + overviewCall + '\n\n' + incomingCall + '\n\n' + code.slice(end);
    const importMarker = "import { DealClientSection } from './DealClientSection';";
    code = code.replace(importMarker, importMarker +
      "\nimport { DealOverview } from './DealOverview';" +
      "\nimport { DealIncomingInvoices } from './DealIncomingInvoices';");
    if (code.includes(overviewMark) || code.includes(incomingMark) || code.includes('className="dealOverview"')) {
      throw new Error('Old markup is still present after extraction.');
    }

    fs.writeFileSync(overviewFile, overviewSource.replace(/\n/g, eol), 'utf8');
    created.push(overviewFile);
    fs.writeFileSync(incomingFile, incomingSource.replace(/\n/g, eol), 'utf8');
    created.push(incomingFile);
    fs.writeFileSync(sourceFile, code.replace(/\n/g, eol), 'utf8');
    sourceWritten = true;
    console.log('DealDetail.tsx: ' + original.replace(/\r\n/g, '\n').split('\n').length + ' -> ' + code.split('\n').length + ' lines');
    console.log('Created: DealOverview.tsx and DealIncomingInvoices.tsx');
    console.log('Running frontend build...\n');
    const run = cp.spawnSync('npm', ['run', 'build'], {
      cwd: frontend,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    if (run.error || run.status !== 0) {
      throw new Error('Frontend build failed (exit ' + run.status + ').');
    }
    console.log('\nSUCCESS: stage 9 compiled. Verify quick edits and incoming documents in browser.');
  } catch (err) {
    if (sourceWritten) fs.writeFileSync(sourceFile, original, 'utf8');
    for (const file of created) if (fs.existsSync(file)) fs.unlinkSync(file);
    abort((err && err.message ? err.message : String(err)) + '\nStage 9 rolled back; stages 7 and 8 are preserved.');
  }
}
