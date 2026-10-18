'use strict';

// MSM refactor stage 14: extract the invoice request action handlers.
// Expected local inputs: stages 12 and 13 applied to GitHub commit 0fd9f89.
// This is a mechanical extraction: API calls and file-upload behavior stay unchanged.

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = __dirname;
const dealDir = path.join(root, 'frontend', 'src', 'features', 'deals');
const detailPath = path.join(dealDir, 'DealDetail.tsx');
const actionsDir = path.join(dealDir, 'actions');
const targetPath = path.join(actionsDir, 'dealInvoiceRequestActions.ts');
const stage12Path = path.join(actionsDir, 'dealQuickActions.ts');
const stage13Path = path.join(actionsDir, 'dealClientActions.ts');

const expectedStage13Hash = 'f7615e53';
const expectedRequestActionsHash = 'e9341b9a';
const startMarker = '  async function saveInvoiceRequestSeller() {';
const endMarker = '  async function saveInvoiceData() {';
const importAnchor = "import { createDealClientActions } from './actions/dealClientActions';";
const oldApiImport = "import { updateDealInfo, updateShipmentDate, updateInvoiceAmount, confirmInvoice, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection } from '../../api';";
const newApiImport = "import { updateDealInfo, updateShipmentDate, updateInvoiceAmount, confirmInvoice, getDeal, requestInvoiceCorrection, withdrawInvoiceCorrection } from '../../api';";

function hash(source) {
  let value = 2166136261;
  for (let i = 0; i < source.length; i++) {
    value = Math.imul(value ^ source.charCodeAt(i), 16777619) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(program, args, cwd = root) {
  const result = cp.spawnSync(program, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${program} ${args.join(' ')} failed (exit code ${result.status}).`);
  }
}

let originalBytes;
let wroteFiles = false;
let hadActionsDir;

try {
  console.log('[MSM step 14] Extracting invoice request actions...');
  assert(fs.existsSync(detailPath), 'DealDetail.tsx not found. Put this script in the repository root.');
  assert(fs.existsSync(stage12Path), 'Stage 12 was not applied: dealQuickActions.ts is missing.');
  assert(fs.existsSync(stage13Path), 'Stage 13 was not applied: dealClientActions.ts is missing.');
  assert(!fs.existsSync(targetPath), 'dealInvoiceRequestActions.ts already exists. No files changed.');

  originalBytes = fs.readFileSync(detailPath);
  const raw = originalBytes.toString('utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const source = raw.replace(/\r\n/g, '\n');
  assert(hash(source) === expectedStage13Hash,
    `DealDetail.tsx differs from the reviewed stage 13 output (got ${hash(source)}, expected ${expectedStage13Hash}). No files changed.`);
  assert(source.includes(importAnchor) && source.includes(oldApiImport),
    'Expected stage 13 imports were not found. No files changed.');
  assert(fs.readFileSync(stage12Path, 'utf8').includes('export function createDealQuickActions'),
    'Stage 12 action module has unexpected content.');
  assert(fs.readFileSync(stage13Path, 'utf8').includes('export function createDealClientActions'),
    'Stage 13 action module has unexpected content.');

  const a = source.indexOf(startMarker);
  const b = source.indexOf(endMarker, a + startMarker.length);
  assert(a !== -1 && b > a && source.indexOf(startMarker, a + 1) === -1 && source.indexOf(endMarker, b + 1) === -1,
    'Could not locate unique invoice-request handler boundaries.');
  const extracted = source.slice(a, b);
  assert(hash(extracted) === expectedRequestActionsHash,
    'Invoice-request handlers differ from the reviewed code. No files changed.');
  for (const name of ['saveInvoiceRequestSeller', 'sendInvoiceRequestAgain', 'withdrawRequest']) {
    assert(extracted.includes(`async function ${name}()`), `Missing handler: ${name}`);
  }

  const moduleHeader = `import type { Dispatch, SetStateAction } from 'react';
import { updateDealInfo, resubmitInvoiceRequest, withdrawInvoiceRequest } from '../../../api';
import { startBackgroundUploadJob } from '../../../backgroundUploads';
import type { CurrentUser, Deal, SellerType } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealInvoiceRequestActionArgs = {
  dealId: string;
  user: CurrentUser;
  deal: Deal | null;
  requestSellerType: SellerType;
  requestUrgent: boolean;
  requestClientName: string;
  requestAccountingComment: string;
  requestRequestText: string;
  requestIncomingInvoice: File | null;
  requestExtraFiles: File[];
  setSaving: Set<boolean>;
  setError: Set<string>;
  setInvoiceRequestEditOpen: Set<boolean>;
  setRequestIncomingInvoice: Set<File | null>;
  setRequestExtraFiles: Set<File[]>;
  setRequestUrgent: Set<boolean>;
  setWithdrawConfirmOpen: Set<boolean>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing request/resubmission/withdraw handlers, moved without changing behavior. */
export function createDealInvoiceRequestActions({
  dealId, user, deal, requestSellerType, requestUrgent,
  requestClientName, requestAccountingComment, requestRequestText,
  requestIncomingInvoice, requestExtraFiles, setSaving, setError,
  setInvoiceRequestEditOpen, setRequestIncomingInvoice,
  setRequestExtraFiles, setRequestUrgent, setWithdrawConfirmOpen, reload,
}: DealInvoiceRequestActionArgs) {
`;
  const moduleFooter = `  return {
    saveInvoiceRequestSeller,
    sendInvoiceRequestAgain,
    withdrawRequest,
  };
}
`;
  const replacement = `  const {
    saveInvoiceRequestSeller,
    sendInvoiceRequestAgain,
    withdrawRequest,
  } = createDealInvoiceRequestActions({
    dealId, user, deal, requestSellerType, requestUrgent,
    requestClientName, requestAccountingComment, requestRequestText,
    requestIncomingInvoice, requestExtraFiles, setSaving, setError,
    setInvoiceRequestEditOpen, setRequestIncomingInvoice,
    setRequestExtraFiles, setRequestUrgent, setWithdrawConfirmOpen, reload,
  });


`;

  let next = source.slice(0, a) + replacement + source.slice(b);
  next = next.replace(oldApiImport, newApiImport);
  next = next.replace(importAnchor,
    importAnchor + "\nimport { createDealInvoiceRequestActions } from './actions/dealInvoiceRequestActions';");

  assert(next.includes('async function saveInvoiceData()'), 'Following handlers were unexpectedly changed.');
  assert(!next.includes(startMarker), 'Old request handler remains in DealDetail.');
  assert(next.includes('createDealInvoiceRequestActions({'), 'Request action binding is missing.');
  assert(next !== source, 'No changes generated.');

  hadActionsDir = fs.existsSync(actionsDir);
  fs.mkdirSync(actionsDir, { recursive: true });
  fs.writeFileSync(targetPath, (moduleHeader + extracted + moduleFooter).replace(/\n/g, eol), 'utf8');
  wroteFiles = true;
  fs.writeFileSync(detailPath, next.replace(/\n/g, eol), 'utf8');

  console.log('[MSM step 14] Building frontend (TypeScript + Vite)...');
  run('npm', ['run', 'build'], path.join(root, 'frontend'));
  console.log('[MSM step 14] Checking diff whitespace...');
  run('git', ['diff', '--check', '--', 'frontend/src/features/deals/DealDetail.tsx']);
  console.log('SUCCESS: stage 14 compiled. Check invoice resubmission and withdrawal before committing.');
} catch (error) {
  console.error('[MSM step 14] ' + (error instanceof Error ? error.message : String(error)));
  if (wroteFiles) {
    fs.writeFileSync(detailPath, originalBytes);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    if (!hadActionsDir && fs.existsSync(actionsDir) && fs.readdirSync(actionsDir).length === 0) {
      fs.rmdirSync(actionsDir);
    }
    console.error('[MSM step 14] Rolled back only stage 14. Existing work preserved.');
  }
  process.exitCode = 1;
}
