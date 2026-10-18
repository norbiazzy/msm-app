'use strict';

// MSM refactor stage 13: extract client action handlers from DealDetail.
// Based on stage 12 output from GitHub commit 0fd9f8950a05f167678965318b1ba2cb92370561.
// Does not change requests to the backend or the React state ownership.

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = __dirname;
const dealDir = path.join(root, 'frontend', 'src', 'features', 'deals');
const detailPath = path.join(dealDir, 'DealDetail.tsx');
const actionsDir = path.join(dealDir, 'actions');
const quickPath = path.join(actionsDir, 'dealQuickActions.ts');
const targetPath = path.join(actionsDir, 'dealClientActions.ts');

// Exact normalized DealDetail.tsx produced by refactor-step12.cjs.
// Changing local content beyond that reviewed stage will stop the script.
const expectedStage12Hash = 'd4841889';
const expectedClientBlockHash = '57146e11';
const startMarker = '  function normalizedPhone() {';
const endMarker = '  async function saveInvoiceRequestSeller() {';
const importAnchor = "import { createDealQuickActions } from './actions/dealQuickActions';";

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

function assert(condition, description) {
  if (!condition) throw new Error(description);
}

function run(cmd, args, cwd = root) {
  const r = cp.spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.error || r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (exit code ${r.status}).`);
  }
}

let originalBytes;
let wroteFiles = false;
let hadActionsDir;

try {
  console.log('[MSM step 13] Extracting client actions...');
  assert(fs.existsSync(detailPath), 'DealDetail.tsx is missing. Run from the msm-app repository root.');
  assert(fs.existsSync(quickPath), 'Stage 12 is not complete: actions/dealQuickActions.ts is missing.');
  assert(!fs.existsSync(targetPath), 'dealClientActions.ts already exists. No files changed.');
  originalBytes = fs.readFileSync(detailPath);
  const raw = originalBytes.toString('utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const source = raw.replace(/\r\n/g, '\n');
  assert(hash(source) === expectedStage12Hash,
    `DealDetail.tsx differs from the verified stage 12 output (got ${hash(source)}, expected ${expectedStage12Hash}). No changes made.`);
  assert(source.includes(importAnchor), 'Stage 12 import is missing. No files changed.');
  assert(fs.readFileSync(quickPath, 'utf8').includes('export function createDealQuickActions'),
    'Stage 12 action module is not recognized.');

  const a = source.indexOf(startMarker);
  const b = source.indexOf(endMarker, a + startMarker.length);
  assert(a >= 0 && b > a && source.indexOf(startMarker, a + 1) === -1 && source.indexOf(endMarker, b + 1) === -1,
    'Could not locate unique client action handlers.');
  const extracted = source.slice(a, b);
  assert(hash(extracted) === expectedClientBlockHash, 'Client handler block differs from reviewed code.');
  const actionNames = [
    'normalizedPhone', 'saveDealInfo', 'addDeliveryAddress',
    'removeDeliveryAddress', 'openMax',
  ];
  for (const name of actionNames) {
    assert(extracted.includes(`function ${name}(`), `Missing action ${name}.`);
  }

  const moduleHeader = `import type { Dispatch, SetStateAction } from 'react';
import { updateDealInfo } from '../../../api';
import type { CurrentUser } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealClientActionArgs = {
  dealId: string;
  user: CurrentUser;
  editClientPhone: string;
  editClientName: string;
  editContactName: string;
  editManagerComment: string;
  editAddresses: string[];
  setEditAddresses: Set<string[]>;
  setDealInfoOpen: Set<boolean>;
  setPhoneMenuOpen: Set<boolean>;
  setSaving: Set<boolean>;
  setError: Set<string>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing client handlers, moved without changing their behavior. */
export function createDealClientActions({
  dealId, user, editClientPhone, editClientName,
  editContactName, editManagerComment, editAddresses,
  setEditAddresses, setDealInfoOpen, setPhoneMenuOpen,
  setSaving, setError, reload,
}: DealClientActionArgs) {
`;
  const moduleFooter = `  return {
    normalizedPhone,
    saveDealInfo,
    addDeliveryAddress,
    removeDeliveryAddress,
    openMax,
  };
}
`;

  const replacement = `  const {
    normalizedPhone,
    saveDealInfo,
    addDeliveryAddress,
    removeDeliveryAddress,
    openMax,
  } = createDealClientActions({
    dealId, user, editClientPhone, editClientName,
    editContactName, editManagerComment, editAddresses,
    setEditAddresses, setDealInfoOpen, setPhoneMenuOpen,
    setSaving, setError, reload,
  });


`;
  let next = source.slice(0, a) + replacement + source.slice(b);
  next = next.replace(importAnchor, importAnchor + "\nimport { createDealClientActions } from './actions/dealClientActions';");
  assert(next.includes('async function saveInvoiceRequestSeller()'), 'Invoice request logic was unexpectedly changed.');
  assert(!next.includes(startMarker), 'Original client handler remains in DealDetail.');
  assert(next.includes('const {\n    normalizedPhone,\n    saveDealInfo,'), 'Client action binding is missing.');

  hadActionsDir = fs.existsSync(actionsDir);
  fs.mkdirSync(actionsDir, { recursive: true });
  fs.writeFileSync(targetPath, (moduleHeader + extracted + moduleFooter).replace(/\n/g, eol), 'utf8');
  wroteFiles = true;
  fs.writeFileSync(detailPath, next.replace(/\n/g, eol), 'utf8');

  console.log('[MSM step 13] Building frontend (TypeScript + Vite)...');
  run('npm', ['run', 'build'], path.join(root, 'frontend'));
  console.log('[MSM step 13] Checking diff formatting...');
  run('git', ['diff', '--check', '--', 'frontend/src/features/deals/DealDetail.tsx']);
  console.log('SUCCESS: stage 13 compiled. Test client editing before committing.');
} catch (error) {
  console.error('[MSM step 13] ' + (error instanceof Error ? error.message : String(error)));
  if (wroteFiles) {
    fs.writeFileSync(detailPath, originalBytes);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    if (!hadActionsDir && fs.existsSync(actionsDir) && fs.readdirSync(actionsDir).length === 0) {
      fs.rmdirSync(actionsDir);
    }
    console.error('[MSM step 13] Rolled back stage 13. Existing work preserved.');
  }
  process.exitCode = 1;
}
