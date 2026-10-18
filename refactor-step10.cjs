'use strict';

// MSM refactor stage 10: extract client invoice request JSX into a dedicated component.
// Reviewed against main commit cb0db9b (stages 7-9 already committed).
// The JSX is copied verbatim. All data, callbacks, API operations and upload logic
// remain owned by DealDetail.tsx; a failed build restores the original source.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function fail(message) {
  console.error('\n[MSM step 10] ' + message);
  process.exitCode = 1;
}

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const folder = path.join(frontend, 'src', 'features', 'deals');
const sourceFile = path.join(folder, 'DealDetail.tsx');
const targetFile = path.join(folder, 'invoices', 'InvoiceRequestPanel.tsx');

if (!fs.existsSync(path.join(frontend, 'package.json')) || !fs.existsSync(sourceFile)) {
  fail('Run from repository root: D:\\job\\it\\msm-app. Nothing changed.');
} else if (!fs.existsSync(path.join(folder, 'DealOverview.tsx')) ||
           !fs.existsSync(path.join(folder, 'DealClientSection.tsx')) ||
           !fs.existsSync(path.join(folder, 'DealSidebar.tsx'))) {
  fail('Stages 7-9 must be applied first. Nothing changed.');
} else if (fs.existsSync(targetFile)) {
  fail('InvoiceRequestPanel.tsx already exists. Refusing to overwrite it. Nothing changed.');
} else {
  const original = fs.readFileSync(sourceFile, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let code = original.replace(/\r\n/g, '\n');
  let sourceWritten = false;
  let targetWritten = false;

  // The diff must start from a clean tracked DealDetail.tsx. Untracked
  // refactor-step*.cjs files are deliberately ignored.
  const check = cp.spawnSync('git', [
    'status', '--porcelain', '--', 'frontend/src/features/deals/DealDetail.tsx'
  ], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });

  if (check.error || check.status !== 0) {
    fail('Could not check git status of DealDetail.tsx. Nothing changed.');
  } else if (check.stdout.trim()) {
    fail('DealDetail.tsx has uncommitted changes. Save/review them before stage 10. Nothing changed.');
  } else {
    function indexOnce(needle, label) {
      const pos = code.indexOf(needle);
      if (pos < 0 || code.indexOf(needle, pos + needle.length) !== -1) {
        throw new Error('Expected exactly one ' + label + '; refusing to change files.');
      }
      return pos;
    }
    function fnv1a(value) {
      let h = 2166136261;
      for (let i = 0; i < value.length; i++) {
        h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    }

    try {
      const startMark = '      <div\n        id="dealCInvoice"';
      const endMark = '      {current &&\n        canManageInvoice';
      const start = indexOnce(startMark, 'invoice request section start');
      const end = indexOnce(endMark, 'invoice correction controls start');
      if (end <= start) throw new Error('Invoice sections appear in the wrong order.');
      const jsx = code.slice(start, end);
      if (fnv1a(jsx) !== '27de5523') {
        throw new Error('Invoice request JSX differs from reviewed commit cb0db9b. Nothing changed.');
      }

      const props = [
        ['deal', 'Deal'],
        ['current', 'Invoice | undefined'],
        ['canManageDeal', 'boolean'],
        ['invoiceRequestEditOpen', 'boolean'],
        ['setInvoiceRequestEditOpen', 'Setter<boolean>'],
        ['invoiceRequestTask', 'DealTask | undefined'],
        ['requestSellerType', 'SellerType'],
        ['setRequestSellerType', 'Setter<SellerType>'],
        ['saving', 'boolean'],
        ['saveInvoiceRequestSeller', '() => Promise<void>'],
        ['invoiceRequestUploadJob', 'BackgroundUploadJob | undefined'],
        ['invoiceRequestNeedsData', 'boolean'],
        ['latestInvoiceReturn', 'AuditEvent | undefined'],
        ['requestClientName', 'string'],
        ['setRequestClientName', 'Setter<string>'],
        ['requestRequestText', 'string'],
        ['setRequestRequestText', 'Setter<string>'],
        ['requestAccountingComment', 'string'],
        ['setRequestAccountingComment', 'Setter<string>'],
        ['currentCustomerInvoice', 'StoredFile | undefined'],
        ['requestIncomingInvoice', 'File | null'],
        ['setRequestIncomingInvoice', 'Setter<File | null>'],
        ['requestExistingExtraFiles', 'StoredFile[]'],
        ['requestExtraFiles', 'File[]'],
        ['setRequestExtraFiles', 'Setter<File[]>'],
        ['requestUrgent', 'boolean'],
        ['setRequestUrgent', 'Setter<boolean>'],
        ['sendInvoiceRequestAgain', '() => Promise<void>'],
        ['withdrawConfirmOpen', 'boolean'],
        ['setWithdrawConfirmOpen', 'Setter<boolean>'],
        ['withdrawRequest', '() => Promise<void>'],
      ];

      const needed = props.filter(([name]) => !new RegExp('\\b' + name + '\\b').test(jsx));
      if (needed.length) throw new Error('Missing expected references: ' + needed.map(x => x[0]).join(', '));

      const component = [
        "import type { Dispatch, SetStateAction } from 'react';",
        "import type { AuditEvent, Deal, DealTask, Invoice, SellerType, StoredFile } from '../../../types';",
        "import type { BackgroundUploadJob } from '../../../backgroundUploads';",
        "import { Field } from '../../../shared/Field';",
        "import { sellerLabels } from '../../../shared/formatters';",
        "import { dealFileUrl } from '../../../api';",
        "import { MultiFilePicker, SingleFilePicker } from '../../../MultiFilePicker';",
        "import { InvoiceBlock } from './InvoiceViews';",
        '',
        'type Setter<T> = Dispatch<SetStateAction<T>>;',
        'type InvoiceRequestPanelProps = {',
        ...props.map(([name, typ]) => `  ${name}: ${typ};`),
        '};',
        '',
        'export function InvoiceRequestPanel({',
        ...props.map(([name]) => `  ${name},`),
        '}: InvoiceRequestPanelProps) {',
        '  return (',
        '    <>',
        jsx.trimEnd(),
        '    </>',
        '  );',
        '}',
        '',
      ].join('\n');
      const replacement = [
        '      <InvoiceRequestPanel',
        ...props.map(([name]) => `        ${name}={${name}}`),
        '      />',
        '',
        '',
      ].join('\n');
      code = code.slice(0, start) + replacement + code.slice(end);

      const invoiceImport = "import { InvoiceBlock } from './invoices/InvoiceViews';";
      const anchorImport = "import { DealIncomingInvoices } from './DealIncomingInvoices';";
      indexOnce(invoiceImport, 'old InvoiceBlock import');
      indexOnce(anchorImport, 'DealIncomingInvoices import');
      code = code.replace(invoiceImport + '\n', '');
      code = code.replace(anchorImport, anchorImport + "\nimport { InvoiceRequestPanel } from './invoices/InvoiceRequestPanel';");

      // dealFileUrl is only needed in the extracted JSX now.
      const apiToken = ', dealFileUrl,';
      if (!code.includes(apiToken) || code.indexOf(apiToken) !== code.lastIndexOf(apiToken)) {
        throw new Error('Unexpected dealFileUrl import structure. Nothing changed.');
      }
      const withoutImport = code.replace(apiToken, ',');
      if (/\bdealFileUrl\b/.test(withoutImport)) {
        throw new Error('dealFileUrl remains used in DealDetail; preserve it manually before retrying.');
      }
      code = withoutImport;
      if (code.includes(startMark) || !code.includes('<InvoiceRequestPanel')) {
        throw new Error('Extraction left old invoice-request JSX in DealDetail.');
      }

      fs.writeFileSync(targetFile, component.replace(/\n/g, eol), 'utf8');
      targetWritten = true;
      fs.writeFileSync(sourceFile, code.replace(/\n/g, eol), 'utf8');
      sourceWritten = true;

      console.log('DealDetail.tsx: ' + original.replace(/\r\n/g, '\n').split('\n').length +
        ' -> ' + code.split('\n').length + ' lines');
      console.log('Created: frontend/src/features/deals/invoices/InvoiceRequestPanel.tsx');
      console.log('Building frontend...\n');
      const build = cp.spawnSync('npm', ['run', 'build'], {
        cwd: frontend,
        shell: process.platform === 'win32',
        stdio: 'inherit',
      });
      if (build.error || build.status !== 0) {
        throw new Error('Frontend build failed (exit: ' + build.status + ').');
      }
      console.log('\nSUCCESS: stage 10 compiled. Test invoice creation, return and resubmission in the browser.');
    } catch (error) {
      if (sourceWritten) fs.writeFileSync(sourceFile, original, 'utf8');
      if (targetWritten && fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
      fail((error?.message || String(error)) + '\nStage 10 rolled back. Existing commits are untouched.');
    }
  }
}
