'use strict';

// MSM stage 17: de-duplicate renderings of the SAME invoice-request upload job.
// Based on unchanged components in main at 0fd9f89. Independent of steps 12-16.
// It changes only DealUploadProgress.tsx and InvoiceRequestPanel.tsx.
// Backend upload jobs, progress subscriptions, and submit/withdraw flows stay intact.

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = __dirname;
const dir = path.join(root, 'frontend', 'src', 'features', 'deals');
const progressPath = path.join(dir, 'DealUploadProgress.tsx');
const requestPath = path.join(dir, 'invoices', 'InvoiceRequestPanel.tsx');

const expected = new Map([
  [progressPath, 'd7c06249'],
  [requestPath, '427a04f1'],
]);
const originals = new Map();
let written = false;

function hash(s) {
  let v = 2166136261;
  for (let k = 0; k < s.length; k++) v = Math.imul(v ^ s.charCodeAt(k), 16777619) >>> 0;
  return v.toString(16).padStart(8, '0');
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function count(s, needle) { return s.split(needle).length - 1; }
function run(command, args, cwd) {
  const proc = cp.spawnSync(command, args, {
    cwd, stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (proc.error || proc.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (exit ${proc.status}; ${proc.error || 'see output'}).`);
  }
}

try {
  console.log('[MSM step 17] Checking source components...');
  const normalized = new Map();
  for (const [file, expectedHash] of expected.entries()) {
    assert(fs.existsSync(file), `Missing file ${file}. Put the script in msm-app root.`);
    const bytes = fs.readFileSync(file);
    const source = bytes.toString('utf8').replace(/\r\n/g, '\n');
    const actualHash = hash(source);
    assert(actualHash === expectedHash,
      `${path.basename(file)} differs from reviewed version (got ${actualHash}, expected ${expectedHash}). No files changed.`);
    originals.set(file, bytes);
    normalized.set(file, source);
  }

  const progressOriginal = normalized.get(progressPath);
  const requestOriginal = normalized.get(requestPath);

  // DealDetail currently aliases dealUploadJob = invoiceRequestUploadJob.
  // Show a second bar only when these are DIFFERENT jobs, not the same id.
  const oldProgressCondition = '      {invoiceRequestUploadJob && (';
  const newProgressCondition = '      {invoiceRequestUploadJob && invoiceRequestUploadJob.id !== dealUploadJob?.id && (';
  assert(count(progressOriginal, oldProgressCondition) === 1,
    'Could not uniquely identify second progress bar. Nothing changed.');
  const progressNext = progressOriginal.replace(oldProgressCondition, newProgressCondition);

  // InvoiceRequestPanel is always rendered within DealDetail, whose top-level
  // DealUploadProgress displays the job. Remove only the redundant visual bar;
  // retain invoiceRequestUploadJob prop for disabled buttons and ongoing-state logic.
  const inlineStart = '          {invoiceRequestUploadJob && (';
  const inlineEnd = '          {(\n            !invoiceRequestTask &&\n            invoiceRequestEditOpen';
  assert(count(requestOriginal, inlineStart) === 1 && count(requestOriginal, inlineEnd) === 1,
    'Could not uniquely identify redundant inline upload block. Nothing changed.');
  const start = requestOriginal.indexOf(inlineStart);
  const end = requestOriginal.indexOf(inlineEnd, start + inlineStart.length);
  assert(start >= 0 && end > start,
    'Unexpected inline progress section order. Nothing changed.');
  const extracted = requestOriginal.slice(start, end);
  assert(extracted.includes('invoiceRequestUploadState') &&
    extracted.includes('invoiceRequestUploadBar') &&
    extracted.trimEnd().endsWith(')}'),
    'Invoice request progress section does not match the expected JSX. Nothing changed.');

  const requestNext = requestOriginal.slice(0, start) +
    '          {/* Upload progress is displayed in DealUploadProgress above. */}\n\n' +
    requestOriginal.slice(end);
  assert(requestNext.includes("invoiceRequestUploadJob?.status === 'RUNNING'"),
    'Upload running-state guard unexpectedly lost. Nothing changed.');
  assert(progressNext !== progressOriginal && requestNext !== requestOriginal,
    'Expected changes were not generated.');

  for (const [file, next] of [[progressPath, progressNext], [requestPath, requestNext]]) {
    const before = originals.get(file).toString('utf8');
    const eol = before.includes('\r\n') ? '\r\n' : '\n';
    fs.writeFileSync(file, next.replace(/\n/g, eol), 'utf8');
    written = true;
  }

  console.log('[MSM step 17] Checking TypeScript + Vite build...');
  run('npm', ['run', 'build'], path.join(root, 'frontend'));
  console.log('[MSM step 17] Checking diff whitespace...');
  run('git', ['diff', '--check', '--',
    'frontend/src/features/deals/DealUploadProgress.tsx',
    'frontend/src/features/deals/invoices/InvoiceRequestPanel.tsx'], root);
  console.log('SUCCESS: stage 17 compiled. Verify one progress indicator per invoice-request job in the deal view.');
} catch (err) {
  console.error('[MSM step 17] ' + (err instanceof Error ? err.message : String(err)));
  if (written) {
    for (const [file, bytes] of originals.entries()) fs.writeFileSync(file, bytes);
    console.error('[MSM step 17] Rolled back stage 17 only. Earlier stages remain untouched.');
  }
  process.exitCode = 1;
}
