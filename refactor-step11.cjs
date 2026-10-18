'use strict';

// MSM refactor stage 11: move invoice decision/correction UI out of DealDetail.
// Based on cb0db9b + the unchanged output of refactor-step10.cjs.
// State, API functions, file-upload jobs and callbacks stay in DealDetail.
// Does not modify git, and rolls back only its own changes after a failed build.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function fail(message) {
  console.error('\n[MSM step 11] ' + message);
  process.exitCode = 1;
}
function fnv1a(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function exactlyOnce(text, needle, label) {
  const at = text.indexOf(needle);
  if (at < 0 || text.indexOf(needle, at + needle.length) !== -1) {
    throw new Error('Expected exactly one ' + label + '. No files changed.');
  }
  return at;
}

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const folder = path.join(frontend, 'src', 'features', 'deals');
const sourceFile = path.join(folder, 'DealDetail.tsx');
const previousFile = path.join(folder, 'invoices', 'InvoiceRequestPanel.tsx');
const targetFile = path.join(folder, 'invoices', 'InvoiceCorrectionPanel.tsx');

if (!fs.existsSync(path.join(frontend, 'package.json')) || !fs.existsSync(sourceFile)) {
  fail('Run from repository root: D:\\job\\it\\msm-app.');
} else if (!fs.existsSync(previousFile)) {
  fail('Stage 10 is not applied. Run refactor-step10.cjs first. Nothing changed.');
} else if (fs.existsSync(targetFile)) {
  fail('InvoiceCorrectionPanel.tsx already exists. Refusing to overwrite. Nothing changed.');
} else {
  const original = fs.readFileSync(sourceFile, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let code = original.replace(/\r\n/g, '\n');
  let targetWritten = false;
  let sourceWritten = false;
  try {
    // Accept only the exact local DealDetail.tsx from stage 10. Stages 7-9
    // are already on main, but stage 10 may still be uncommitted locally.
    if (fnv1a(code) !== 'b247ffd2') {
      throw new Error('DealDetail.tsx does not match reviewed stage 10 output. ' +
        'Do not overwrite local edits; send git status and build output.');
    }

    const startMark = '      {current &&\n        canManageInvoice';
    const endMark = '      <div\n        id="dealCPayments"';
    const start = exactlyOnce(code, startMark, 'invoice correction section start');
    const end = exactlyOnce(code, endMark, 'payment section start');
    if (end <= start) throw new Error('Incorrect section ordering.');
    const jsx = code.slice(start, end);
    if (fnv1a(jsx) !== '509206de') {
      throw new Error('Invoice correction section differs from reviewed code. Nothing changed.');
    }

    const props = [
      ['deal', 'Deal'],
      ['current', 'Invoice | undefined'],
      ['canManageInvoice', 'boolean'],
      ['canConfirm', 'boolean'],
      ['saving', 'boolean'],
      ['openCorrectionEditor', '() => void'],
      ['confirm', '() => Promise<void>'],
      ['correctionUploadRunning', 'boolean'],
      ['correctionWithdrawOpen', 'boolean'],
      ['setCorrectionWithdrawOpen', 'Setter<boolean>'],
      ['withdrawCorrectionRequest', '() => Promise<void>'],
      ['correctionOpen', 'boolean'],
      ['setCorrectionOpen', 'Setter<boolean>'],
      ['correctionSellerType', 'SellerType'],
      ['setCorrectionSellerType', 'Setter<SellerType>'],
      ['correction', 'string'],
      ['setCorrection', 'Setter<string>'],
      ['correctionPrimaryFile', 'File | null'],
      ['setCorrectionPrimaryFile', 'Setter<File | null>'],
      ['correctionFiles', 'File[]'],
      ['setCorrectionFiles', 'Setter<File[]>'],
      ['urgent', 'boolean'],
      ['setUrgent', 'Setter<boolean>'],
      ['sendCorrection', '() => Promise<void>'],
    ];
    for (const [name] of props) {
      if (!new RegExp('\\b' + name + '\\b').test(jsx)) {
        throw new Error('Reference ' + name + ' missing from correction JSX.');
      }
    }

    const component = [
      "import type { Dispatch, SetStateAction } from 'react';",
      "import type { Deal, Invoice, SellerType } from '../../../types';",
      "import { Field } from '../../../shared/Field';",
      "import { sellerLabels } from '../../../shared/formatters';",
      "import { MultiFilePicker, SingleFilePicker } from '../../../MultiFilePicker';",
      '',
      'type Setter<T> = Dispatch<SetStateAction<T>>;',
      'type InvoiceCorrectionPanelProps = {',
      ...props.map(([name, type]) => `  ${name}: ${type};`),
      '};',
      '',
      'export function InvoiceCorrectionPanel({',
      ...props.map(([name]) => `  ${name},`),
      '}: InvoiceCorrectionPanelProps) {',
      '  return (',
      '    <>',
      jsx.trimEnd(),
      '    </>',
      '  );',
      '}',
      '',
    ].join('\n');
    const replacement = [
      '      <InvoiceCorrectionPanel',
      ...props.map(([name]) => `        ${name}={${name}}`),
      '      />',
      '',
      '',
    ].join('\n');
    code = code.slice(0, start) + replacement + code.slice(end);

    const requestImport = "import { InvoiceRequestPanel } from './invoices/InvoiceRequestPanel';";
    exactlyOnce(code, requestImport, 'InvoiceRequestPanel import');
    code = code.replace(requestImport, requestImport +
      "\nimport { InvoiceCorrectionPanel } from './invoices/InvoiceCorrectionPanel';");

    // These JSX-only imports became unused after stages 10 and 11.
    const oldField = "import { Field } from '../../shared/Field';\n";
    const oldPickers = "import { MultiFilePicker, SingleFilePicker } from '../../MultiFilePicker';\n";
    const oldFormatters = "import { formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels } from '../../shared/formatters';";
    const oldWorkflow = "import { dealInvoiceWorkflowLabel, dealInvoiceWorkflowTone, supplierIncomingWorkflowLabel } from './dealWorkflow';";
    for (const [str, label] of [
      [oldField, 'Field import'], [oldPickers, 'Picker import'],
      [oldFormatters, 'formatter import'], [oldWorkflow, 'workflow import'],
    ]) exactlyOnce(code, str, label);
    code = code.replace(oldField, '').replace(oldPickers, '');
    code = code.replace(oldFormatters,
      "import { formatMoneyInput, parseMoneyInput } from '../../shared/formatters';");
    code = code.replace(oldWorkflow,
      "import { supplierIncomingWorkflowLabel } from './dealWorkflow';");

    // These identifiers must no longer be used outside the new component.
    const withoutImports = code.split('\n').filter((line) => !line.startsWith('import ')).join('\n');
    for (const identifier of ['Field', 'MultiFilePicker', 'SingleFilePicker',
      'sellerLabels', 'paymentStatusLabel', 'money',
      'dealInvoiceWorkflowLabel', 'dealInvoiceWorkflowTone']) {
      if (new RegExp('\\b' + identifier + '\\b').test(withoutImports)) {
        throw new Error('Unexpected remaining reference to ' + identifier + '. No files changed.');
      }
    }
    if (!code.includes('<InvoiceCorrectionPanel') || code.includes(startMark)) {
      throw new Error('Invoice correction JSX extraction was incomplete.');
    }
    // Keep the local stage 10 file and all pre-existing work untouched.
    fs.writeFileSync(targetFile, component.replace(/\n/g, eol), 'utf8');
    targetWritten = true;
    fs.writeFileSync(sourceFile, code.replace(/\n/g, eol), 'utf8');
    sourceWritten = true;

    console.log('[MSM step 11] DealDetail.tsx: ' + original.replace(/\r\n/g, '\n').split('\n').length +
      ' -> ' + code.split('\n').length + ' lines');
    console.log('[MSM step 11] Created: frontend/src/features/deals/invoices/InvoiceCorrectionPanel.tsx');
    console.log('[MSM step 11] Building frontend...\n');
    const build = cp.spawnSync('npm', ['run', 'build'], {
      cwd: frontend, shell: process.platform === 'win32', stdio: 'inherit',
    });
    if (build.error || build.status !== 0) {
      throw new Error('Frontend build failed (exit: ' + build.status + ').');
    }
    console.log('\nSUCCESS: stage 11 compiled. Check correction, approval, withdrawal and upload flows in browser.');
  } catch (e) {
    if (sourceWritten) fs.writeFileSync(sourceFile, original, 'utf8');
    if (targetWritten && fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    fail((e?.message || String(e)) + '\nStage 11 rolled back. Existing work is untouched.');
  }
}
