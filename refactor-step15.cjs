'use strict';

// MSM refactor step 15. Expected input: stage 14 result based on commit 0fd9f89.
// Mechanical extraction: no changes to backend requests or React state ownership.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = __dirname;
const dealsDir = path.join(root, 'frontend', 'src', 'features', 'deals');
const detailPath = path.join(dealsDir, 'DealDetail.tsx');
const actionsDir = path.join(dealsDir, 'actions');
const targetPath = path.join(actionsDir, 'dealInvoiceApprovalActions.ts');
const previousActions = [
  'dealQuickActions.ts',
  'dealClientActions.ts',
  'dealInvoiceRequestActions.ts',
];
const sourceHash = 'ebededbc';
const blockHash = '80cd9faa';
const startMarker = '  async function saveInvoiceData() {';
const endMarker = '  async function withdrawCorrectionRequest() {';
const anchor = "import { createDealInvoiceRequestActions } from './actions/dealInvoiceRequestActions';";
const oldApi = "import { updateDealInfo, updateShipmentDate, updateInvoiceAmount, confirmInvoice, getDeal, requestInvoiceCorrection, withdrawInvoiceCorrection } from '../../api';";
const newApi = "import { updateDealInfo, getDeal, requestInvoiceCorrection, withdrawInvoiceCorrection } from '../../api';";

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function count(text, needle) {
  return text.split(needle).length - 1;
}
function run(program, args, cwd) {
  const r = cp.spawnSync(program, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.error || r.status !== 0) {
    throw new Error(`${program} ${args.join(' ')} failed (exit ${r.status}; ${r.error || 'see output'}).`);
  }
}

let originalBytes = null;
let wroteTarget = false;
let hadActionsDir = true;

try {
  console.log('[MSM step 15] Extracting invoice approval actions...');
  assert(fs.existsSync(detailPath), 'DealDetail.tsx not found. Place the script in the msm-app repository root.');
  for (const name of previousActions) {
    assert(fs.existsSync(path.join(actionsDir, name)), `Previous stage is missing: ${name}. No changes made.`);
  }
  assert(!fs.existsSync(targetPath), 'dealInvoiceApprovalActions.ts already exists. No files changed.');

  originalBytes = fs.readFileSync(detailPath);
  const raw = originalBytes.toString('utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const source = raw.replace(/\r\n/g, '\n');
  assert(hash(source) === sourceHash,
    `DealDetail.tsx differs from reviewed stage 14 (actual ${hash(source)}, expected ${sourceHash}). No changes made.`);
  assert(count(source, anchor) === 1 && count(source, oldApi) === 1,
    'Expected stage 14 imports were not found. No changes made.');
  assert(count(source, startMarker) === 1 && count(source, endMarker) === 1,
    'Cannot locate a unique invoice-approval handler block.');

  const first = source.indexOf(startMarker);
  const last = source.indexOf(endMarker, first + startMarker.length);
  assert(first >= 0 && last > first, 'Invoice-approval handlers are not in the expected order.');
  const extracted = source.slice(first, last);
  assert(hash(extracted) === blockHash,
    `Approval handlers differ from reviewed code (actual ${hash(extracted)}). No changes made.`);
  assert(extracted.includes('async function saveInvoiceData()') && extracted.includes('async function confirm()'),
    'Expected handler is missing.');

  const moduleHeader = `import type { Dispatch, SetStateAction } from 'react';
import { updateInvoiceAmount, updateShipmentDate, confirmInvoice } from '../../../api';
import type { CurrentUser, Deal, Invoice } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealInvoiceApprovalActionArgs = {
  dealId: string;
  user: CurrentUser;
  deal: Deal | null;
  current: Invoice | undefined;
  managerAmount: string;
  shipmentDate: string;
  parsedManagerAmount: () => number | undefined;
  setInvoiceMenuOpen: Set<boolean>;
  setSaving: Set<boolean>;
  setError: Set<string>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing invoice approval and save handlers, extracted without behavioral changes. */
export function createDealInvoiceApprovalActions({
  dealId, user, deal, current, managerAmount, shipmentDate,
  parsedManagerAmount, setInvoiceMenuOpen, setSaving, setError, reload,
}: DealInvoiceApprovalActionArgs) {
`;
  const moduleFooter = `  return { saveInvoiceData, confirm };
}
`;
  const replacement = `  const { saveInvoiceData, confirm } = createDealInvoiceApprovalActions({
    dealId, user, deal, current, managerAmount, shipmentDate,
    parsedManagerAmount, setInvoiceMenuOpen, setSaving, setError, reload,
  });


`;

  let next = source.slice(0, first) + replacement + source.slice(last);
  next = next.replace(anchor, anchor + "\nimport { createDealInvoiceApprovalActions } from './actions/dealInvoiceApprovalActions';");
  next = next.replace(oldApi, newApi);
  assert(next !== source && count(next, 'createDealInvoiceApprovalActions({') === 1,
    'Could not create approval action binding.');
  assert(!next.includes(startMarker) && next.includes(endMarker),
    'Other handlers were unexpectedly changed.');

  hadActionsDir = fs.existsSync(actionsDir);
  fs.mkdirSync(actionsDir, { recursive: true });
  fs.writeFileSync(targetPath, (moduleHeader + extracted + moduleFooter).replace(/\n/g, eol), 'utf8');
  wroteTarget = true;
  fs.writeFileSync(detailPath, next.replace(/\n/g, eol), 'utf8');

  console.log('[MSM step 15] Building frontend (TypeScript + Vite)...');
  run('npm', ['run', 'build'], path.join(root, 'frontend'));
  console.log('[MSM step 15] Checking diff whitespace...');
  run('git', ['diff', '--check', '--', 'frontend/src/features/deals/DealDetail.tsx'], root);
  console.log('SUCCESS: stage 15 compiled. Verify invoice confirmation and saving before committing.');
} catch (error) {
  console.error('[MSM step 15] ' + (error instanceof Error ? error.message : String(error)));
  if (wroteTarget) {
    fs.writeFileSync(detailPath, originalBytes);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    if (!hadActionsDir && fs.existsSync(actionsDir) && fs.readdirSync(actionsDir).length === 0) {
      fs.rmdirSync(actionsDir);
    }
    console.error('[MSM step 15] Rolled back stage 15 only. Existing work preserved.');
  }
  process.exitCode = 1;
}
