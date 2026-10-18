/* MSM stage 26 — prefill editable invoice number during correction. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const file = path.join(root, 'frontend', 'src', 'features', 'tasks', 'TasksView.tsx');
const frontendDir = path.join(root, 'frontend');
const marker = 'MSM_STEP26_PREFILL_CORRECTION_INVOICE_NUMBER';

function fail(message) {
  throw new Error('[MSM step26] ' + message);
}
function replaceOnce(source, original, replacement, label) {
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    fail('Cannot uniquely locate ' + label + '. No files were modified.');
  }
  return source.slice(0, first) + replacement + source.slice(first + original.length);
}

try {
  if (!fs.existsSync(file) || !fs.existsSync(path.join(frontendDir, 'package.json'))) {
    fail('Run this script from the msm-app project root (D:\\job\\it\\msm-app).');
  }

  const original = fs.readFileSync(file, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  let source = original.replace(/\r\n?/g, '\n');

  if (source.includes(marker)) {
    console.log('[MSM step26] Already applied. No files changed.');
    process.exit(0);
  }

  // Preserve the existing task-ID-scoped draft and upload workflow.
  // This new default must never overwrite a non-empty edited draft number.
  source = replaceOnce(
    source,
    'function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {\n\n',
    `function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {\n\n` +
    `  /* ${marker} */\n` +
    `  // Only a correction uses the existing invoice number as a default.\n` +
    `  // Draft edits have priority and the input stays fully editable.\n` +
    `  const correctionSourceNumber =\n` +
    `    task.type === 'CORRECT_CLIENT_INVOICE'\n` +
    `      ? String(\n` +
    `          (\n` +
    `            task.deal.invoices?.find((invoice) => invoice.isCurrent) ??\n` +
    `            task.deal.invoices?.[0]\n` +
    `          )?.number || ''\n` +
    `        )\n` +
    `      : '';\n\n`,
    'TaskDetail function header',
  );

  source = replaceOnce(
    source,
    '    setNumber(fields.number);\n    setAmount(fields.amount);',
    `    setNumber(\n` +
    `      fields.number.trim()\n` +
    `        ? fields.number\n` +
    `        : correctionSourceNumber\n` +
    `    );\n` +
    `    setAmount(fields.amount);`,
    'invoice draft number initialization',
  );

  source = replaceOnce(
    source,
    '  }, [task.id, task.type]);',
    '  }, [task.id, task.type, correctionSourceNumber]);',
    'invoice draft loading effect dependencies',
  );

  // Keep the displayed target invoice consistent with the prefill choice.
  source = replaceOnce(
    source,
    '  const currentTaskInvoice =\n    task.deal.invoices?.[0];',
    `  const currentTaskInvoice =\n` +
    `    task.deal.invoices?.find((invoice) => invoice.isCurrent) ??\n` +
    `    task.deal.invoices?.[0];`,
    'current correction invoice display',
  );

  // Sanity-check that the input remains controlled and manually editable.
  if (!source.includes('value={number}') || !source.includes('setNumber(\n                  e.target.value')) {
    fail('The editable invoice number input has changed. No files were modified.');
  }

  fs.writeFileSync(file, source.replace(/\n/g, newline), 'utf8');
  try {
    console.log('[MSM step26] Correction invoice number prefill installed. Building frontend...');
    cp.execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
    cp.execSync('git diff --check', { cwd: root, stdio: 'inherit' });
    console.log('SUCCESS: stage 26 compiled. Check correction with an existing invoice number and an edited draft in browser.');
    console.log('Do not commit until the browser check passes.');
  } catch (error) {
    fs.writeFileSync(file, original, 'utf8');
    console.error('[MSM step26] Build/check failed. Stage 26 changes rolled back.');
    throw error;
  }
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
}
