/**
 * MSM frontend refactor, stage 4: extract NewDealForm into features/deals.
 * Target: after stage 3 (DealDetail extracted), based on commit d75af3e.
 * No API, business rules, styles, or JSX semantics are changed.
 * Builds frontend and automatically rolls back this stage on failure.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const appPath = path.join(root, 'frontend/src/App.tsx');
const dealPath = path.join(root, 'frontend/src/features/deals/DealDetail.tsx');
const nextPath = path.join(root, 'frontend/src/features/deals/NewDealForm.tsx');
const tsPath = path.join(root, 'frontend/node_modules/typescript');
const reviewedHead = 'd75af3e6c27aa7547201209b2625cd8fb9ed5c6b';

function fail(message) {
  console.error('\n[MSM step 4] ' + message);
  process.exit(1);
}
function git(args) {
  const result = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) fail(`Git error: ${result.stderr || result.error}`);
  return result.stdout.trim();
}
function count(text, fragment) {
  return text.split(fragment).length - 1;
}

if (!fs.existsSync(appPath)) fail('Launch from D:\\job\\it\\msm-app (repository root).');
if (!fs.existsSync(tsPath)) fail('Install frontend dependencies first (npm install from frontend folder).');
if (!fs.existsSync(dealPath)) fail('Stage 3 DealDetail.tsx not found; do not run this step yet.');
if (fs.existsSync(nextPath)) fail('NewDealForm.tsx already exists; no files changed.');
if (git(['rev-parse', 'HEAD']) !== reviewedHead)
  fail('Unexpected Git HEAD. Request updated step-4 script rather than overwriting newer code.');

const original = fs.readFileSync(appPath, 'utf8');
const nl = original.includes('\r\n') ? '\r\n' : '\n';
const importStart = "import { TasksView } from './features/tasks/TasksView';";
const dealImport = "import { DealDetail } from './features/deals/DealDetail';";
const from = 'function NewDealForm(';
const until = 'function ThemeToggle(';
const bodyStart = 'type View = ';
if (!original.startsWith(importStart) || !original.includes(dealImport))
  fail('App.tsx does not match stage 3; no files changed.');
if (count(original, from) !== 1 || count(original, until) !== 1 || count(original, bodyStart) !== 1)
  fail('Unexpected component boundaries; no files changed.');
if (original.includes("import { NewDealForm }"))
  fail('NewDealForm already imported; stage 4 may already be applied.');
const left = original.indexOf(from);
const right = original.indexOf(until);
const startOfBody = original.indexOf(bodyStart);
if (!(startOfBody > 0 && left > startOfBody && right > left))
  fail('Unexpected App.tsx layout; no files changed.');
const section = original.slice(left, right);
if (section.split(/\r?\n/).length < 650 || section.split(/\r?\n/).length > 760)
  fail('NewDealForm section has unexpected size; no files changed.');
if (!section.includes('submitInvoiceRequest(') || !section.includes('createDeal(') || !section.includes('onCreated()'))
  fail('NewDealForm is missing reviewed operations; no files changed.');
const remainingBody = original.slice(startOfBody, left) + original.slice(right);
if (count(remainingBody, 'NewDealForm') !== 1)
  fail('NewDealForm has unexpected references outside its definition; no files changed.');

const appImports = [
  "import { TasksView } from './features/tasks/TasksView';",
  "import { DealDetail } from './features/deals/DealDetail';",
  "import { NewDealForm } from './features/deals/NewDealForm';",
  "import { paymentStatusLabel, roleName, sellerLabels, statusLabel, taskStatus } from './shared/formatters';",
  "import { BlockOfficeHome } from './BlockOfficeHome';",
  "import { BlockOfficeMobileNav } from './BlockOfficeMobileNav';",
  "import { RecentActivityPanel } from './RecentActivityPanel';",
  "import { type BackgroundUploadJob, useBackgroundUploads } from './backgroundUploads';",
  "import { resumePendingInvoiceSubmissions } from './invoiceSubmissionQueue';",
  "import { useEffect, useMemo, useState } from 'react';",
  "import { listDeals, login } from './api';",
  "import type { CurrentUser, Deal } from './types';",
].join(nl);
const newImports = [
  "import { type FormEvent, useState } from 'react';",
  "import { Field } from '../../shared/Field';",
  "import { sellerLabels } from '../../shared/formatters';",
  "import { SingleFilePicker } from '../../MultiFilePicker';",
  "import { startBackgroundUploadJob } from '../../backgroundUploads';",
  "import { createDeal, submitInvoiceRequest } from '../../api';",
  "import type { CurrentUser, SellerType } from '../../types';",
].join(nl);
const nextApp = appImports + nl + nl + remainingBody;
const nextNewDeal = newImports + nl + nl + section.trim().replace(/^function NewDealForm\(/, 'export function NewDealForm(') + nl;

const ts = require(tsPath);
for (const [target, code] of [[appPath, nextApp], [nextPath, nextNewDeal]]) {
  const source = ts.createSourceFile(target, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (source.parseDiagnostics.length) {
    console.error(source.parseDiagnostics.slice(0, 4).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
    fail('TypeScript syntax validation failed before writing files.');
  }
}

let success = false;
try {
  fs.mkdirSync(path.dirname(nextPath), { recursive: true });
  fs.writeFileSync(appPath, nextApp, 'utf8');
  fs.writeFileSync(nextPath, nextNewDeal, 'utf8');
  console.log(`App.tsx: ${original.split(/\r?\n/).length} -> ${nextApp.split(/\r?\n/).length} lines`);
  console.log(`Extracted NewDealForm.tsx: ${nextNewDeal.split(/\r?\n/).length} lines`);
  console.log('Running frontend build with TypeScript checks...');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const build = cp.spawnSync(npm, ['run', 'build'], {
    cwd: path.join(root, 'frontend'), stdio: 'inherit', shell: process.platform === 'win32'
  });
  if (build.error || build.status !== 0) throw new Error('Frontend build failed');
  success = true;
  console.log('\nSUCCESS: step 4 compiled. Validate creating a new deal in the UI before committing.');
} catch (error) {
  console.error('ERROR: ' + (error.message || error));
} finally {
  if (!success) {
    fs.writeFileSync(appPath, original, 'utf8');
    try { fs.rmSync(nextPath, { force: true }); } catch {}
    console.error('Rolled back only step 4; your stage-3 changes remain intact.');
    process.exitCode = 1;
  }
}
