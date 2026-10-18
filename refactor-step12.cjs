'use strict';

// MSM refactor stage 12: extract quick-edit actions from DealDetail.
// Source verified against commit 0fd9f8950a05f167678965318b1ba2cb92370561.
// Does not change API request logic or existing React state.

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = __dirname;
const detailPath = path.join(root, 'frontend', 'src', 'features', 'deals', 'DealDetail.tsx');
const targetDir = path.join(root, 'frontend', 'src', 'features', 'deals', 'actions');
const targetPath = path.join(targetDir, 'dealQuickActions.ts');
const expectedCommit = '0fd9f8950a05f167678965318b1ba2cb92370561';
const expectedFileHash = '10567eb5';
const expectedBlockHash = 'c7b1de52';
const startMarker = '  function parsedManagerAmount() {';
const endMarker = '  function openCorrectionEditor() {';
const actionNames = [
  'parsedManagerAmount',
  'copyDealValue',
  'saveQuickInvoiceAmount',
  'saveQuickShipmentDate',
  'saveQuickIncomingAmount',
];

function hash(source) {
  let value = 2166136261;
  for (let i = 0; i < source.length; i++) {
    value = Math.imul(value ^ source.charCodeAt(i), 16777619) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

function command(program, args, cwd = root) {
  const r = cp.spawnSync(program, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.error || r.status !== 0) throw new Error(`${program} ${args.join(' ')} failed (exit ${r.status}).`);
}

function output(program, args, cwd = root) {
  const r = cp.spawnSync(program, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.error || r.status !== 0) throw new Error(`${program} ${args.join(' ')} failed.`);
  return r.stdout.trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let changed = false;
let originalBytes;
let hadTargetDir = false;

try {
  console.log('[MSM step 12] Extracting quick-edit action handlers...');
  assert(fs.existsSync(detailPath), 'DealDetail.tsx is missing. Run the script from the repository root.');
  assert(!fs.existsSync(targetPath), 'dealQuickActions.ts already exists. No files changed.');
  assert(output('git', ['rev-parse', 'HEAD']) === expectedCommit,
    'Git HEAD differs from reviewed 0fd9f89. No changes made.');
  assert(output('git', ['status', '--porcelain', '--', 'frontend/src/features/deals/DealDetail.tsx']) === '',
    'DealDetail.tsx has local changes. Commit or review them before running stage 12.');

  originalBytes = fs.readFileSync(detailPath);
  const raw = originalBytes.toString('utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const source = raw.replace(/\r\n/g, '\n');
  assert(hash(source) === expectedFileHash,
    `DealDetail.tsx differs from the reviewed version (${hash(source)}). No files changed.`);

  const a = source.indexOf(startMarker);
  const b = source.indexOf(endMarker, a + startMarker.length);
  assert(a !== -1 && b > a && source.indexOf(startMarker, a + 1) === -1,
    'Cannot identify a unique quick-edit action block.');
  const extracted = source.slice(a, b);
  assert(hash(extracted) === expectedBlockHash, 'Action handlers differ from reviewed code.');
  for (const name of actionNames) {
    assert(extracted.includes(`function ${name}(`), `Action ${name} was not found.`);
  }

  const argTypes = `import type { Dispatch, SetStateAction } from 'react';
import { parseMoneyInput } from '../../../shared/formatters';
import { updateInvoiceAmount, updateShipmentDate, updateSupplierPurchase } from '../../../api';
import type { CurrentUser, Deal, Invoice } from '../../../types';

type QuickEdit = 'invoiceAmount' | 'incomingAmount' | 'shipmentDate' | null;
type Set<T> = Dispatch<SetStateAction<T>>;

type DealQuickActionArgs = {
  dealId: string;
  user: CurrentUser;
  current: Invoice | undefined;
  managerAmount: string;
  shipmentDate: string;
  incomingAmountDraft: string;
  editableIncomingPurchase: NonNullable<Deal['supplierPurchases']>[number] | undefined;
  setQuickEdit: Set<QuickEdit>;
  setSaving: Set<boolean>;
  setError: Set<string>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Provides the existing quick-edit behavior without changing API requests. */
export function createDealQuickActions({
  dealId, user, current, managerAmount, shipmentDate,
  incomingAmountDraft, editableIncomingPurchase,
  setQuickEdit, setSaving, setError, reload,
}: DealQuickActionArgs) {
`;
  const moduleSource = argTypes + extracted + `  return {
    parsedManagerAmount,
    copyDealValue,
    saveQuickInvoiceAmount,
    saveQuickShipmentDate,
    saveQuickIncomingAmount,
  };
}
`;

  const replacement = `  const {
    parsedManagerAmount,
    copyDealValue,
    saveQuickInvoiceAmount,
    saveQuickShipmentDate,
    saveQuickIncomingAmount,
  } = createDealQuickActions({
    dealId, user, current, managerAmount, shipmentDate,
    incomingAmountDraft, editableIncomingPurchase,
    setQuickEdit, setSaving, setError, reload,
  });


`;

  const oldApiImport = "import { updateDealInfo, updateShipmentDate, updateSupplierPurchase, updateInvoiceAmount, confirmInvoice, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection } from '../../api';";
  const newApiImport = "import { updateDealInfo, updateShipmentDate, updateInvoiceAmount, confirmInvoice, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection } from '../../api';";
  const importAnchor = "import { InvoiceCorrectionPanel } from './invoices/InvoiceCorrectionPanel';";
  const oldFormatImport = "import { formatMoneyInput, parseMoneyInput } from '../../shared/formatters';";
  const newFormatImport = "import { formatMoneyInput } from '../../shared/formatters';";
  assert(source.includes(oldApiImport) && source.includes(importAnchor) && source.includes(oldFormatImport), 'Expected import lines are missing.');

  let next = source.slice(0, a) + replacement + source.slice(b);
  next = next.replace(oldApiImport, newApiImport);
  next = next.replace(oldFormatImport, newFormatImport);
  next = next.replace(importAnchor, importAnchor + "\nimport { createDealQuickActions } from './actions/dealQuickActions';");
  assert(next !== source, 'The generated DealDetail did not change.');
  assert(next.includes('function openCorrectionEditor() {'), 'Next action block was unexpectedly altered.');

  hadTargetDir = fs.existsSync(targetDir);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetPath, moduleSource.replace(/\n/g, eol), 'utf8');
  changed = true;
  fs.writeFileSync(detailPath, next.replace(/\n/g, eol), 'utf8');

  console.log('[MSM step 12] Building frontend (TypeScript + Vite)...');
  command('npm', ['run', 'build'], path.join(root, 'frontend'));

  console.log('[MSM step 12] Checking whitespace errors...');
  command('git', ['diff', '--check', '--', 'frontend/src/features/deals/DealDetail.tsx']);
  console.log('SUCCESS: stage 12 compiled. Verify behavior before committing.');
} catch (error) {
  console.error('[MSM step 12] ' + (error instanceof Error ? error.message : String(error)));
  if (changed) {
    fs.writeFileSync(detailPath, originalBytes);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    if (!hadTargetDir && fs.existsSync(targetDir) && fs.readdirSync(targetDir).length === 0) fs.rmdirSync(targetDir);
    console.error('[MSM step 12] Rolled back stage 12. Previous work preserved.');
  }
  process.exitCode = 1;
}
