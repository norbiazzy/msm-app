'use strict';

// MSM refactor step 16. Mechanical extraction of invoice correction actions.
// Expected input: stages 12–15 applied to commit 0fd9f89, without other edits.
// Does not change the sequence of backend requests, uploads, or React state ownership.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = __dirname;
const dealsDir = path.join(root, 'frontend', 'src', 'features', 'deals');
const detailPath = path.join(dealsDir, 'DealDetail.tsx');
const actionsDir = path.join(dealsDir, 'actions');
const targetPath = path.join(actionsDir, 'dealInvoiceCorrectionActions.ts');
const requiredModules = [
  'dealQuickActions.ts',
  'dealClientActions.ts',
  'dealInvoiceRequestActions.ts',
  'dealInvoiceApprovalActions.ts',
];
const expectedSourceHash = '0390c526';
const expectedBlockHash = 'fde5f8ae';
const startMarker = '  async function withdrawCorrectionRequest() {';
const endMarker = '  return (\n\n    <section className="content form dealWorkspaceCPage">';
const anchor = "import { createDealInvoiceApprovalActions } from './actions/dealInvoiceApprovalActions';";
const oldBackgroundImport = "import { startBackgroundUploadJob, useBackgroundUploads } from '../../backgroundUploads';";
const newBackgroundImport = "import { useBackgroundUploads } from '../../backgroundUploads';";
const oldApiImport = "import { updateDealInfo, getDeal, requestInvoiceCorrection, withdrawInvoiceCorrection } from '../../api';";
const newApiImport = "import { updateDealInfo, getDeal } from '../../api';";

function hash(value) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result = Math.imul(result ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return result.toString(16).padStart(8, '0');
}
function assert(value, message) {
  if (!value) throw new Error(message);
}
function count(value, needle) {
  return value.split(needle).length - 1;
}
function run(command, args, cwd) {
  const result = cp.spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}; ${result.error || 'see output'}).`);
  }
}

let originalBytes;
let wroteFiles = false;
let hadActionsDir = true;
try {
  console.log('[MSM step 16] Extracting invoice correction actions...');
  assert(fs.existsSync(detailPath), 'DealDetail.tsx not found. Put this script in the msm-app root.');
  for (const moduleName of requiredModules) {
    assert(fs.existsSync(path.join(actionsDir, moduleName)), `Required earlier stage missing: ${moduleName}. Nothing changed.`);
  }
  assert(!fs.existsSync(targetPath), 'dealInvoiceCorrectionActions.ts already exists. Nothing changed.');

  originalBytes = fs.readFileSync(detailPath);
  const raw = originalBytes.toString('utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const source = raw.replace(/\r\n/g, '\n');
  assert(hash(source) === expectedSourceHash,
    `DealDetail.tsx differs from reviewed stage 15 (got ${hash(source)}, expected ${expectedSourceHash}). No changes made.`);
  assert([anchor, oldApiImport, oldBackgroundImport].every(value => count(source, value) === 1),
    'Expected stage 15 imports not found exactly once. Nothing changed.');
  assert(count(source, startMarker) === 1 && count(source, endMarker) === 1,
    'Correction handler boundaries not uniquely found. Nothing changed.');

  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, 'Unexpected correction handler order. Nothing changed.');
  const extracted = source.slice(start, end);
  assert(hash(extracted) === expectedBlockHash,
    `Correction handlers differ from reviewed code (got ${hash(extracted)}). Nothing changed.`);
  for (const name of ['withdrawCorrectionRequest', 'sendCorrection']) {
    assert(extracted.includes(`async function ${name}()`), `Missing expected handler: ${name}.`);
  }

  const moduleHeader = `import type { Dispatch, SetStateAction } from 'react';
import { requestInvoiceCorrection, withdrawInvoiceCorrection } from '../../../api';
import { startBackgroundUploadJob } from '../../../backgroundUploads';
import type { CurrentUser, Deal, Invoice, SellerType } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealInvoiceCorrectionActionArgs = {
  dealId: string;
  user: CurrentUser;
  deal: Deal | null;
  current: Invoice | undefined;
  correction: string;
  correctionPrimaryFile: File | null;
  correctionFiles: File[];
  urgent: boolean;
  correctionSellerType: SellerType;
  setSaving: Set<boolean>;
  setError: Set<string>;
  setCorrectionWithdrawOpen: Set<boolean>;
  setCorrection: Set<string>;
  setCorrectionPrimaryFile: Set<File | null>;
  setCorrectionFiles: Set<File[]>;
  setUrgent: Set<boolean>;
  setCorrectionOpen: Set<boolean>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing correction/withdraw handlers extracted without behavioral changes. */
export function createDealInvoiceCorrectionActions({
  dealId, user, deal, current, correction, correctionPrimaryFile,
  correctionFiles, urgent, correctionSellerType, setSaving, setError,
  setCorrectionWithdrawOpen, setCorrection, setCorrectionPrimaryFile,
  setCorrectionFiles, setUrgent, setCorrectionOpen, reload,
}: DealInvoiceCorrectionActionArgs) {
`;
  const moduleFooter = `  return { withdrawCorrectionRequest, sendCorrection };
}
`;
  const replacement = `  const { withdrawCorrectionRequest, sendCorrection } = createDealInvoiceCorrectionActions({
    dealId, user, deal, current, correction, correctionPrimaryFile,
    correctionFiles, urgent, correctionSellerType, setSaving, setError,
    setCorrectionWithdrawOpen, setCorrection, setCorrectionPrimaryFile,
    setCorrectionFiles, setUrgent, setCorrectionOpen, reload,
  });


`;

  let next = source.slice(0, start) + replacement + source.slice(end);
  next = next.replace(anchor, anchor + "\nimport { createDealInvoiceCorrectionActions } from './actions/dealInvoiceCorrectionActions';");
  next = next.replace(oldBackgroundImport, newBackgroundImport);
  next = next.replace(oldApiImport, newApiImport);
  assert(next !== source && count(next, 'createDealInvoiceCorrectionActions({') === 1,
    'Correction actions were not connected correctly. Nothing changed.');
  assert(!next.includes(startMarker) && next.includes(endMarker),
    'Unexpected change to DealDetail render. Nothing changed.');

  hadActionsDir = fs.existsSync(actionsDir);
  fs.mkdirSync(actionsDir, { recursive: true });
  fs.writeFileSync(targetPath, (moduleHeader + extracted + moduleFooter).replace(/\n/g, eol), 'utf8');
  wroteFiles = true;
  fs.writeFileSync(detailPath, next.replace(/\n/g, eol), 'utf8');

  console.log('[MSM step 16] Building frontend (TypeScript + Vite)...');
  run('npm', ['run', 'build'], path.join(root, 'frontend'));
  console.log('[MSM step 16] Checking diff whitespace...');
  run('git', ['diff', '--check', '--', 'frontend/src/features/deals/DealDetail.tsx'], root);
  console.log('SUCCESS: stage 16 compiled. Test correction and withdrawal flows before committing.');
} catch (error) {
  console.error('[MSM step 16] ' + (error instanceof Error ? error.message : String(error)));
  if (wroteFiles) {
    fs.writeFileSync(detailPath, originalBytes);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    if (!hadActionsDir && fs.existsSync(actionsDir) && fs.readdirSync(actionsDir).length === 0) {
      fs.rmdirSync(actionsDir);
    }
    console.error('[MSM step 16] Rolled back stage 16 only. Earlier work preserved.');
  }
  process.exitCode = 1;
}
