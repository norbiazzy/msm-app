/**
 * MSM refactoring stage 3: extract DealDetail and its invoice/payment components.
 * Target baseline: norbiazzy/msm-app commit d75af3e6c27aa7547201209b2625cd8fb9ed5c6b.
 * Only edits frontend/src/App.tsx and creates frontend/src/features/deals/DealDetail.tsx.
 * Compiles frontend and automatically restores the original files if validation fails.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const appPath = path.join(root, 'frontend/src/App.tsx');
const dealPath = path.join(root, 'frontend/src/features/deals/DealDetail.tsx');
// TypeScript may be installed in frontend/node_modules, hoisted to the repository
// root, or provided by the environment. The real frontend build validates TS.
function loadTypeScriptIfAvailable() {
  for (const base of [path.join(root, 'frontend'), root]) {
    try {
      const resolved = require.resolve('typescript', { paths: [base] });
      return require(resolved);
    } catch (error) {
      if (error && error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  console.log('Local TypeScript module not found; syntax will be validated by npm run build.');
  return null;
}
const EXPECTED_COMMIT = 'd75af3e6c27aa7547201209b2625cd8fb9ed5c6b';

function fail(message) {
  console.error('\n[MSM refactor stage 3] ' + message);
  process.exit(1);
}
function runGit(args) {
  const p = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (p.status !== 0) fail(`Git failed: git ${args.join(' ')}\n${p.stderr}`);
  return p.stdout.trim();
}
function spliceSection(src, firstMarker, nextMarker, name) {
  const left = src.indexOf(firstMarker);
  const right = src.indexOf(nextMarker);
  if (left < 0 || right < left) throw new Error(`Cannot find the boundaries of ${name}`);
  if (src.indexOf(firstMarker, left + firstMarker.length) !== -1)
    throw new Error(`Duplicated start marker of ${name}`);
  if (src.indexOf(nextMarker, right + nextMarker.length) !== -1)
    throw new Error(`Duplicated end marker of ${name}`);
  return { section: src.slice(left, right), without: src.slice(0, left) + src.slice(right) };
}

if (!fs.existsSync(appPath)) fail('Run this script from the msm-app repository root.');
if (fs.existsSync(dealPath)) fail('DealDetail.tsx already exists. Nothing changed.');
if (runGit(['rev-parse', 'HEAD']) !== EXPECTED_COMMIT)
  fail('Unexpected git commit. Stop and request a refreshed refactor script; do not overwrite current work.');
if (runGit(['status', '--porcelain', '--', 'frontend/src/App.tsx']) !== '')
  fail('App.tsx has uncommitted changes. Save them before running this script.');

const ts = loadTypeScriptIfAvailable();
const original = fs.readFileSync(appPath, 'utf8');
if (original.split(/\r?\n/).length !== 6729)
  fail('App.tsx no longer matches the reviewed 6,729-line version. Nothing changed.');
const nl = original.includes('\r\n') ? '\r\n' : '\n';
const headerEnd = original.indexOf('type View = ');
if (headerEnd < 0 || !original.includes("import { TasksView } from './features/tasks/TasksView';"))
  fail('Unrecognized App.tsx imports. Nothing changed.');

let helper, content;
try {
  // Preserve exact component text and behavior, including JSX and event handlers.
  const h = spliceSection(original,
    'function dealInvoiceWorkflowLabel(', 'function Home(', 'invoice workflow helpers');
  const d = spliceSection(h.without,
    'function DealDetail(', 'function NewDealForm(', 'deal details/invoice/payment');
  helper = h.section;
  content = d.section;
} catch (error) {
  fail(String(error.message || error));
}

// Confirm all declarations we are moving, and avoid leaving accidental copies.
const movedNames = [
  'dealInvoiceWorkflowLabel', 'dealInvoiceWorkflowTone', 'supplierIncomingWorkflowLabel',
  'DealDetail', 'InvoiceBlock', 'InvoiceVersion', 'PaymentBlock'
];
const combined = helper + '\n' + content;
for (const name of movedNames) {
  const declarations = [...combined.matchAll(new RegExp('^function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) fail(`Expected exactly one declaration of ${name}. Nothing changed.`);
}
if (!content.includes('function PaymentBlock(') || content.split(/\r?\n/).length < 4700)
  fail('Incomplete extraction boundaries. Nothing changed.');

// The remaining App exports the same root component and imports the moved DealDetail.
const appImports = [
  "import { TasksView } from './features/tasks/TasksView';",
  "import { DealDetail } from './features/deals/DealDetail';",
  "import { Field } from './shared/Field';",
  "import { paymentStatusLabel, roleName, sellerLabels, statusLabel, taskStatus } from './shared/formatters';",
  "import { BlockOfficeHome } from './BlockOfficeHome';",
  "import { BlockOfficeMobileNav } from './BlockOfficeMobileNav';",
  "import { SingleFilePicker } from './MultiFilePicker';",
  "import { RecentActivityPanel } from './RecentActivityPanel';",
  "import { type BackgroundUploadJob, startBackgroundUploadJob, useBackgroundUploads } from './backgroundUploads';",
  "import { resumePendingInvoiceSubmissions } from './invoiceSubmissionQueue';",
  "import { FormEvent, useEffect, useMemo, useState } from 'react';",
  "import { createDeal, listDeals, login, submitInvoiceRequest } from './api';",
  "import type { CurrentUser, Deal, SellerType } from './types';",
].join(nl);
const dealImports = [
  "import { useEffect, useState } from 'react';",
  "import { Field } from '../../shared/Field';",
  "import { auditLabel, formatMoneyInput, money, parseMoneyInput, paymentMethodLabel, paymentStatusLabel, sellerLabels, statusLabel, taskStatus } from '../../shared/formatters';",
  "import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';",
  "import { TaskContextStrip } from '../../TaskContextStrip';",
  "import { MultiFilePicker, SingleFilePicker } from '../../MultiFilePicker';",
  "import { startBackgroundUploadJob, useBackgroundUploads } from '../../backgroundUploads';",
  "import { PurchasesBlock } from '../../PurchasesBlock';",
  "import { PowerOfAttorneyBlock } from '../../PowerOfAttorneyBlock';",
  "import { updateDealInfo, updateShipmentDate, updateSupplierPurchase, updateInvoiceAmount, addClientPayment, confirmInvoice, dealFileUrl, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection, updatePaymentStatus } from '../../api';",
  "import type { ClientPaymentMethod, CurrentUser, Deal, Invoice, PaymentStatus, SellerType } from '../../types';",
].join(nl);

let remaining = original.replace(helper, '').replace(content, '');
// Check nobody else is referencing the moved private helpers/components except DealDetail.
const bodyBeforeImports = remaining.slice(remaining.indexOf('type View = '));
for (const privateName of movedNames.filter(x => x !== 'DealDetail')) {
  if (new RegExp('\\b' + privateName + '\\b').test(bodyBeforeImports))
    fail(`${privateName} is still used by App.tsx. Nothing changed.`);
}
const retainedBody = remaining.slice(remaining.indexOf('type View = '));
const nextApp = appImports + nl + nl + retainedBody;
const nextDeal = dealImports + nl + nl + helper.replace(/^\s+|\s+$/g, '') + nl + nl +
  content.replace(/^\s+|\s+$/g, '').replace(/^function DealDetail\(/, 'export function DealDetail(') + nl;

if (ts) {
for (const [filename, code] of [[appPath, nextApp], [dealPath, nextDeal]]) {
  const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (source.parseDiagnostics.length) {
    for (const err of source.parseDiagnostics.slice(0, 4))
      console.error(ts.flattenDiagnosticMessageText(err.messageText, '\n'));
    fail(`TypeScript parse failed for ${path.basename(filename)}. Nothing changed.`);
  }
}
}

let success = false;
try {
  fs.mkdirSync(path.dirname(dealPath), { recursive: true });
  fs.writeFileSync(appPath, nextApp, 'utf8');
  fs.writeFileSync(dealPath, nextDeal, 'utf8');
  console.log(`App.tsx: ${original.split(/\r?\n/).length} -> ${nextApp.split(/\r?\n/).length} lines`);
  console.log(`Created: frontend/src/features/deals/DealDetail.tsx (${nextDeal.split(/\r?\n/).length} lines)`);
  console.log('Building frontend...');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const built = cp.spawnSync(npmCommand, ['run', 'build'], {
    cwd: path.join(root, 'frontend'), stdio: 'inherit', shell: process.platform === 'win32'
  });
  if (built.error || built.status !== 0) throw new Error('Frontend build failed.');
  success = true;
  console.log('\nSUCCESS: stage 3 compiled. Review git diff and test UI before committing.');
} catch (error) {
  console.error('\nERROR: ' + String(error.message || error));
} finally {
  if (!success) {
    fs.writeFileSync(appPath, original, 'utf8');
    try { fs.rmSync(dealPath, { force: true }); } catch {}
    console.error('Rollback complete: restored App.tsx and removed generated DealDetail.tsx.');
    process.exitCode = 1;
  }
}
