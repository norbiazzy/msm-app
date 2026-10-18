'use strict';

// MSM stage 18: deduplicate task-list progress and returned invoice fields.
// Changes only presentation. Does not change backend or file upload actions.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = __dirname;
const paths = [
  'frontend/src/features/tasks/TasksView.tsx',
  'frontend/src/InvoiceRequestTaskPanel.tsx',
];
const expected = ['0a6d9e93', '540e5571']; // reviewed GitHub commit be47056

function fnv32(s) {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash = Math.imul(hash ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
function oneReplace(s, from, to, label) {
  const first = s.indexOf(from);
  if (first < 0 || s.indexOf(from, first + from.length) !== -1) {
    throw new Error('Unexpected structure (' + label + '); files untouched.');
  }
  return s.slice(0, first) + to + s.slice(first + from.length);
}

function patchTasks(source) {
  const start = "        {taskUploadJob && (\n          <div\n            className={\n              'taskUploadProgressCard";
  const after = '        )}\n\n      </button>';
  const a = source.indexOf(start);
  if (a < 0 || source.indexOf(start, a + 1) !== -1) {
    throw new Error('Duplicate task progress markup not found uniquely; files untouched.');
  }
  const b = source.indexOf(after, a);
  if (b < 0) throw new Error('End marker for duplicate progress was not found.');
  const output = source.slice(0, a) + source.slice(b + '        )}\n\n'.length);
  if (!output.includes('taskUploadInline') || output.includes('taskUploadProgressCard')) {
    throw new Error('Task progress postcondition failed.');
  }
  return output;
}

function patchRepair(source) {
  let output = oneReplace(source,
`export function InvoiceRequestDataCard({
  task,
}: {
  task: Task;
}) {`,
`export function InvoiceRequestDataCard({
  task,
  documentsOnly = false,
}: {
  task: Task;
  documentsOnly?: boolean;
}) {`,
  'documentsOnly prop');

  output = oneReplace(output,
`    <div className="invoiceTaskData">

      <div className="invoiceTaskDataHead">`,
`    <div className="invoiceTaskData">

      {!documentsOnly && (
        <>
      <div className="invoiceTaskDataHead">`,
  'hide duplicated readonly fields');

  output = oneReplace(output,
`      <div className="invoiceTaskDocs">

        <span className="invoiceTaskDocsTitle">`,
`        </>
      )}

      <div className="invoiceTaskDocs">

        <span className="invoiceTaskDocsTitle">`,
  'documents section boundary');

  output = oneReplace(output,
`          Документы менеджера
`,
`          {documentsOnly ? 'Ранее отправленные документы' : 'Документы менеджера'}
`,
  'documents title');

  output = oneReplace(output,
`      <InvoiceRequestDataCard
        task={task}
      />`,
`      <InvoiceRequestDataCard
        task={task}
        documentsOnly
      />`,
  'manager repaired task existing documents');

  output = oneReplace(output,
`        <label className="field">

          <span>
            На кого выставлять
          </span>`,
`        <label className="field">
          <span>Формат запроса</span>
          <select value={requestMode} disabled={saving}
            onChange={(event) => setRequestMode(event.target.value)}>
            <option value="TEXT">Текстом / позициями</option>
            <option value="INCOMING_INVOICE">По входящему счёту</option>
          </select>
        </label>

        <label className="field">

          <span>
            На кого выставлять
          </span>`,
  'request mode editable field');

  output = oneReplace(output,
`        <label className="field">

          <span>
            Что выставляем / текст запроса
          </span>`,
`        <label className="field">
          <span>Контактное лицо</span>
          <input value={contactName} disabled={saving}
            onChange={(event) => setContactName(event.target.value)} />
        </label>

        <label className="field">
          <span>Телефон клиента</span>
          <input type="tel" value={clientPhone} disabled={saving}
            onChange={(event) => setClientPhone(event.target.value)} />
        </label>

        <label className="field">
          <span>Адреса доставки (каждый с новой строки)</span>
          <textarea rows={3} value={deliveryAddresses} disabled={saving}
            onChange={(event) => setDeliveryAddresses(event.target.value)} />
        </label>

        <label className="field">

          <span>
            Что выставляем / текст запроса
          </span>`,
  'contact phone addresses editable fields');

  output = oneReplace(output,
`        <label className="field">

          <span>
            Комментарий для бухгалтерии
          </span>`,
`        <label className="field">
          <span>Условие расчёта</span>
          <select value={marginMode} disabled={saving}
            onChange={(event) => setMarginMode(event.target.value)}>
            <option value="PERCENT">± %</option>
            <option value="TOTAL_PLUS">+ к сумме</option>
            <option value="UNIT_PLUS">+ за единицу</option>
            <option value="FINAL">Итоговая цена</option>
          </select>
        </label>

        <label className="field">
          <span>Значение условия</span>
          <input inputMode="decimal" value={marginValue} disabled={saving}
            onChange={(event) => setMarginValue(event.target.value)} />
        </label>

        <label className="field">

          <span>
            Комментарий для бухгалтерии
          </span>`,
  'margin fields');

  output = oneReplace(output,
`        <div className="field">

          <span>
            Новый входящий счёт,
            если изменился
          </span>`,
`        <label className="urgentToggle">
          <input type="checkbox" checked={urgent} disabled={saving}
            onChange={(event) => setUrgent(event.target.checked)} />
          <span>Срочно</span>
        </label>

        <div className="field">

          <span>
            Новый входящий счёт,
            если изменился
          </span>`,
  'urgent editable field');

  if (!output.includes('documentsOnly') || !output.includes('setDeliveryAddresses(event.target.value)')) {
    throw new Error('Manager form postcondition failed.');
  }
  return output;
}

function run(program, args, cwd) {
  const proc = spawnSync(program, args, {
    cwd, stdio: 'inherit', shell: process.platform === 'win32'
  });
  return !proc.error && proc.status === 0;
}

const filenames = paths.map(relative => path.join(root, relative));
let original;
let newline;
let output;
try {
  original = filenames.map(file => fs.readFileSync(file, 'utf8'));
  newline = original.map(s => s.includes('\r\n') ? '\r\n' : '\n');
  const normalized = original.map(s => s.replace(/\r\n/g, '\n'));
  normalized.forEach((s, i) => {
    const actual = fnv32(s);
    if (actual !== expected[i]) {
      throw new Error(paths[i] + ': expected reviewed version ' + expected[i] +
        ', got ' + actual + '. Do not overwrite local changes.');
    }
  });
  output = [patchTasks(normalized[0]), patchRepair(normalized[1])];
} catch (error) {
  console.error('[MSM step 18] ' + (error instanceof Error ? error.message : error));
  process.exit(1);
}

console.log('[MSM step 18] Applying the two UI changes...');
try {
  filenames.forEach((file, i) => {
    fs.writeFileSync(file, output[i].replace(/\n/g, newline[i]), 'utf8');
  });
  console.log('[MSM step 18] Checking TypeScript + Vite build...');
  if (!run('npm', ['run', 'build'], path.join(root, 'frontend'))) {
    throw new Error('Frontend build failed.');
  }
  console.log('[MSM step 18] Checking diff whitespace...');
  if (!run('git', ['diff', '--check', '--', ...paths], root)) {
    throw new Error('git diff --check failed.');
  }
  console.log('SUCCESS: stage 18 compiled. Please test returned invoice and one progress indicator per task in browser.');
} catch (error) {
  filenames.forEach((file, i) => fs.writeFileSync(file, original[i], 'utf8'));
  console.error('[MSM step 18] ' + (error instanceof Error ? error.message : error));
  console.error('[MSM step 18] Rolled back stage 18; prior work untouched.');
  process.exit(1);
}
