'use strict';

// MSM stage 7: extract the deal sidebar and attention list without changing business actions.
// Reviewed against main commit 3c5c645cde14b654c6b2cb74afcee3a9d079dbda.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

function stop(message) {
  console.error('\n[MSM step 7] ' + message);
  process.exit(1);
}

const root = process.cwd();
const folder = path.join(root, 'frontend', 'src', 'features', 'deals');
const sourcePath = path.join(folder, 'DealDetail.tsx');
const sidebarPath = path.join(folder, 'DealSidebar.tsx');
const attentionPath = path.join(folder, 'DealAttention.tsx');
const gitSource = 'frontend/src/features/deals/DealDetail.tsx';
const expectedBlob = '3c694037762d909590e0dfaba1b5e698a267518a';

if (!fs.existsSync(path.join(root, 'frontend', 'package.json')) || !fs.existsSync(sourcePath)) {
  stop('Run the script from D:\\job\\it\\msm-app (the repository root).');
}
if (fs.existsSync(sidebarPath) || fs.existsSync(attentionPath)) {
  stop('DealSidebar.tsx or DealAttention.tsx already exists. No files changed.');
}

try {
  const blob = cp.execFileSync('git', ['rev-parse', `HEAD:${gitSource}`], { cwd: root, encoding: 'utf8' }).trim();
  if (blob !== expectedBlob) stop('DealDetail.tsx has a different committed version. No files changed.');
  const dirty = cp.execFileSync('git', ['status', '--porcelain', '--', gitSource], { cwd: root, encoding: 'utf8' }).trim();
  if (dirty) stop('DealDetail.tsx has uncommitted changes. Save them before starting step 7.');
} catch (err) {
  if (err?.status || err?.code === 'ENOENT') stop('Could not verify Git state. No files changed.');
  throw err;
}

const original = fs.readFileSync(sourcePath, 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
let code = original.replace(/\r\n/g, '\n');
const before = code.split('\n').length;
const created = [];
let sourceChanged = false;

function exactlyOne(needle, label) {
  const first = code.indexOf(needle);
  if (first === -1 || code.indexOf(needle, first + needle.length) !== -1) {
    throw new Error('Expected exactly one ' + label + '; refusing to change source.');
  }
  return first;
}
function replaceOnce(needle, replacement, label) {
  exactlyOne(needle, label);
  code = code.replace(needle, replacement);
}

try {
  // The left sidebar is a standalone UI area. Retain its existing scroll-to-section handlers.
  const sidebarStart = exactlyOne('        <aside className="dealWorkspaceCSidebar">', 'deal sidebar opening');
  const sidebarCloseMarker = '        </aside>';
  const sidebarEnd = code.indexOf(sidebarCloseMarker, sidebarStart);
  if (sidebarEnd < 0) throw new Error('Sidebar closing tag not found.');
  const sidebarMarkup = code.slice(sidebarStart, sidebarEnd + sidebarCloseMarker.length);
  for (const marker of ['ЗК-', 'Контакт на объекте', 'Входящие счета', 'Редактировать сделку']) {
    if (!sidebarMarkup.includes(marker)) throw new Error('Sidebar section missing: ' + marker);
  }
  if ((sidebarMarkup.match(/setDealInfoOpen\(true\);/g) || []).length !== 1) {
    throw new Error('Unexpected edit button callback; no changes applied.');
  }
  const sidebarSource = [
    "import type { Deal, Invoice } from '../../types';",
    "import { money, paymentStatusLabel, sellerLabels } from '../../shared/formatters';",
    '',
    'type DealSidebarProps = {',
    '  deal: Deal;',
    '  current: Invoice | undefined;',
    '  incomingTotal: number;',
    '  canManageDeal: boolean;',
    '  onEditDeal: () => void;',
    '};',
    '',
    'export function DealSidebar({ deal, current, incomingTotal, canManageDeal, onEditDeal }: DealSidebarProps) {',
    '  return (',
    sidebarMarkup.replace('setDealInfoOpen(true);', 'onEditDeal();'),
    '  );',
    '}',
    '',
  ].join('\n');
  code = code.slice(0, sidebarStart) + [
    '        <DealSidebar',
    '          deal={deal}',
    '          current={current}',
    '          incomingTotal={incomingTotal}',
    '          canManageDeal={canManageDeal}',
    '          onEditDeal={() => setDealInfoOpen(true)}',
    '        />',
  ].join('\n') + code.slice(sidebarEnd + sidebarCloseMarker.length);

  // The task-attention strip only reads the deal and formats task status.
  const attentionStart = exactlyOne('          <div className="dealWorkspaceCAttention">', 'attention panel');
  const nextSection = exactlyOne('      <div className="dealOverview">', 'deal overview');
  if (nextSection <= attentionStart) throw new Error('Unexpected attention panel boundaries.');
  const attentionMarkup = code.slice(attentionStart, nextSection).trimEnd();
  if (!attentionMarkup.includes('Активных задач нет') || !attentionMarkup.includes('Сейчас требует внимания')) {
    throw new Error('Attention list is incomplete.');
  }
  const attentionSource = [
    "import type { Deal } from '../../types';",
    "import { taskStatus } from '../../shared/formatters';",
    '',
    'export function DealAttention({ deal }: { deal: Deal }) {',
    '  return (',
    attentionMarkup,
    '  );',
    '}',
    '',
  ].join('\n');
  code = code.slice(0, attentionStart) + '          <DealAttention deal={deal} />\n\n' + code.slice(nextSection);

  replaceOnce(
    "import { formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels, taskStatus } from '../../shared/formatters';",
    "import { formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels } from '../../shared/formatters';",
    'formatter imports',
  );
  const importAnchor = "import { DealUploadProgress } from './DealUploadProgress';";
  replaceOnce(importAnchor, importAnchor + "\nimport { DealSidebar } from './DealSidebar';\nimport { DealAttention } from './DealAttention';", 'new component imports');
  if (code.includes('className="dealWorkspaceCSidebar"') || code.includes('className="dealWorkspaceCAttention"')) {
    throw new Error('Some original UI markup was not extracted.');
  }

  fs.writeFileSync(sidebarPath, sidebarSource.replace(/\n/g, eol), 'utf8');
  created.push(sidebarPath);
  fs.writeFileSync(attentionPath, attentionSource.replace(/\n/g, eol), 'utf8');
  created.push(attentionPath);
  fs.writeFileSync(sourcePath, code.replace(/\n/g, eol), 'utf8');
  sourceChanged = true;
  console.log('DealDetail.tsx: ' + before + ' -> ' + code.split('\n').length + ' lines');
  console.log('Created: DealSidebar.tsx and DealAttention.tsx');
  console.log('Running frontend build...\n');
  const result = cp.spawnSync('npm', ['run', 'build'], {
    cwd: path.join(root, 'frontend'),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) throw new Error('Frontend build failed; exit code ' + result.status);
  console.log('\nSUCCESS: stage 7 compiled. Check the sidebar and task list in the browser before committing.');
} catch (err) {
  if (sourceChanged) fs.writeFileSync(sourcePath, original, 'utf8');
  for (const dest of created) if (fs.existsSync(dest)) fs.unlinkSync(dest);
  stop(err.message + '\nStage 7 rolled back. Previous changes were preserved.');
}
