/* MSM stage 31 — one accountant work-area presentation for invoice, supplier payment, POA and ETRN. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const files = {
  invoice: path.join(frontend, 'src/features/tasks/TasksView.tsx'),
  poa: path.join(frontend, 'src/PowerOfAttorneyBlock.tsx'),
  supplier: path.join(frontend, 'src/PurchasesBlock.tsx'),
  css: path.join(frontend, 'src/styles.css'),
  work: path.join(frontend, 'src/TaskWorkSection.tsx'),
  data: path.join(frontend, 'src/TaskDataSection.tsx'),
};
const marker = 'MSM_STEP31_ACCOUNTANT_WORK_FORMS';
const lf = x => x.replace(/\r\n?/g, '\n');
const restore = (next, old) => old.includes('\r\n') ? next.replace(/\n/g, '\r\n') : next;
function stop(message) { throw new Error('[MSM step31] ' + message); }
function read(file) {
  if (!fs.existsSync(file)) stop('Missing ' + path.relative(root, file));
  return fs.readFileSync(file, 'utf8');
}
function replaceOne(source, original, replacement, label) {
  const i = source.indexOf(original);
  if (i === -1 || source.indexOf(original, i + original.length) !== -1)
    stop('Cannot uniquely locate ' + label + '. No files have been modified.');
  return source.slice(0, i) + replacement + source.slice(i + original.length);
}

const workView = `/* ${marker} */
import type { ReactNode } from 'react';

/** Visual wrapper only. The parent task owns saving, validation and completion. */
export function TaskWorkSection({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="taskAccountantWork" aria-label={title}>
      <header className="taskAccountantWorkHead">
        <span className="taskAccountantWorkEyebrow">Бухгалтерия · В работе</span>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="taskAccountantWorkBody">{children}</div>
    </section>
  );
}
/* END_${marker} */
`;

const cssAddon = `
/* ${marker} */
/* Shared work area; read-only task details and document cards above are unchanged. */
.boView-tasks .taskAccountantWork {
  min-width: 0;
  width: 100%;
  display: grid;
  gap: 0;
  margin: 12px 0;
  padding: 0;
  border: 1px solid var(--bo-line);
  border-radius: 16px;
  background: var(--bo-panel);
  color: var(--bo-text);
  overflow: clip;
}
.boView-tasks .taskAccountantWorkHead {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--bo-line);
}
.boView-tasks .taskAccountantWorkEyebrow {
  color: var(--bo-accent);
  font-size: 11px;
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: .025em;
}
.boView-tasks .taskAccountantWorkHead h3 {
  margin: 0;
  color: var(--bo-text);
  font-size: 18px;
  line-height: 1.3;
  font-weight: 800;
}
.boView-tasks .taskAccountantWorkHead p {
  margin: 0;
  color: var(--bo-muted);
  font-size: 12px;
  line-height: 1.5;
}
.boView-tasks .taskAccountantWorkBody {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
  padding: 18px;
}
.boView-tasks .taskAccountantWorkBody > .field,
.boView-tasks .taskAccountantWorkBody > label.field {
  min-width: 0;
  margin: 0;
}
.boView-tasks .taskAccountantWorkBody > .primary.wide,
.boView-tasks .taskAccountantWorkBody > button.primary {
  width: 100%;
  min-height: 54px;
  margin: 3px 0 0;
  border-radius: 9px;
}
.boView-tasks .taskAccountantWorkBody > .microcopy {
  margin: 0;
}
.boView-tasks .taskAccountantWorkHint {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--bo-line);
  border-radius: 10px;
  background: var(--bo-panel-2);
  color: var(--bo-muted);
  font-size: 13px;
  line-height: 1.55;
}
@media (max-width: 720px) {
  .boView-tasks .taskAccountantWorkHead,
  .boView-tasks .taskAccountantWorkBody {
    padding: 12px;
  }
  .boView-tasks .taskAccountantWorkHead h3 {
    font-size: 16px;
  }
}
/* END_${marker} */
`;

try {
  if (!fs.existsSync(path.join(frontend, 'package.json')))
    stop('Run this script from D:\\job\\it\\msm-app');

  const original = Object.fromEntries(
    ['invoice', 'poa', 'supplier', 'css'].map(k => [k, read(files[k])]),
  );
  const previousWork = fs.existsSync(files.work) ? read(files.work) : null;
  let invoice = lf(original.invoice);
  let poa = lf(original.poa);
  let supplier = lf(original.supplier);
  let css = lf(original.css);

  if (invoice.includes(marker) && poa.includes(marker) &&
      supplier.includes(marker) && css.includes(marker) &&
      previousWork && lf(previousWork).includes(marker)) {
    console.log('[MSM step31] Already applied. No files changed.');
    process.exit(0);
  }
  if ([invoice, poa, supplier, css, previousWork || ''].some(s => s.includes(marker)))
    stop('Partial stage-31 installation found. Nothing changed; send git status and the message for inspection.');
  if (previousWork !== null)
    stop('TaskWorkSection.tsx already exists. Refusing to overwrite it.');

  if (!lf(read(files.data)).includes('MSM_STEP29_UNIFIED_TASK_DATA_COMPONENT') ||
      !css.includes('MSM_STEP29_UNIFIED_TASK_LAYOUT') ||
      !invoice.includes('MSM_STEP30_ETRN_UNIFIED_LAYOUT') ||
      !poa.includes('MSM_STEP29_UNIFIED_TASK_LAYOUT') ||
      !supplier.includes('MSM_STEP29_UNIFIED_TASK_LAYOUT'))
    stop('Stages 29 and 30 are required. Confirm their successful build before running stage 31.');

  // Imports are added to already verified, single-use module imports.
  poa = replaceOne(poa,
    "import { TaskDataSection } from './TaskDataSection';",
    "import { TaskDataSection } from './TaskDataSection';\nimport { TaskWorkSection } from './TaskWorkSection';\n/* " + marker + " */",
    'PowerOfAttorneyBlock work-section import');
  supplier = replaceOne(supplier,
    "import { TaskDataSection } from './TaskDataSection';",
    "import { TaskDataSection } from './TaskDataSection';\nimport { TaskWorkSection } from './TaskWorkSection';\n/* " + marker + " */",
    'PurchasesBlock work-section import');
  invoice = replaceOne(invoice,
    "import { TaskDataSection } from '../../TaskDataSection';",
    "import { TaskDataSection } from '../../TaskDataSection';\nimport { TaskWorkSection } from '../../TaskWorkSection';\n/* " + marker + " */",
    'TasksView work-section import');

  // Power of attorney: keep all original controlled inputs and the finish handler intact.
  poa = replaceOne(poa,
    "      {status === 'IN_PROGRESS' && (\n        <>\n          <label className=\"field\">",
    `      {status === 'IN_PROGRESS' && (\n        <TaskWorkSection\n          title="Оформление доверенности"\n          description="Укажите номер, прикрепите готовую доверенность и при необходимости оставьте комментарий."\n        >\n          <label className="field">`,
    'POA accountant form opening');
  poa = replaceOne(poa,
    "        </>\n      )}\n\n\n      {error && (",
    "        </TaskWorkSection>\n      )}\n\n\n      {error && (",
    'POA accountant form closing');

  // Supplier payment: maintain bank stamp/balance conditions and savePayment unchanged.
  supplier = replaceOne(supplier,
    "{status ===\n        'IN_PROGRESS' &&\n        !financiallyPaid && (\n\n        <>",
    `{status ===\n        'IN_PROGRESS' &&\n        !financiallyPaid && (\n\n        <TaskWorkSection\n          title="Проведение оплаты поставщику"\n          description="Укажите сумму и способ оплаты, приложите платёжное поручение при необходимости."\n        >`,
    'supplier payment form opening');
  supplier = replaceOne(supplier,
    "        </>\n\n      )}\n\n\n      {payments.length > 0 && (",
    "        </TaskWorkSection>\n\n      )}\n\n\n      {payments.length > 0 && (",
    'supplier payment form closing');

  // Invoice issue/correction: the same work section, without changing draft fields or callbacks.
  invoice = replaceOne(invoice,
    "      {canAttachInvoice &&\n        status ===\n          'IN_PROGRESS' && (\n\n        <>",
    `      {canAttachInvoice &&\n        status ===\n          'IN_PROGRESS' && (\n\n        <TaskWorkSection\n          title={task.type === 'CORRECT_CLIENT_INVOICE' ? 'Исправление готового счёта' : 'Подготовка готового счёта'}\n          description="Проверьте номер и сумму, приложите PDF готового счёта."\n        >`,
    'invoice issue/correction work form opening');
  invoice = replaceOne(invoice,
    "        </>\n\n      )}\n\n\n      {error && (",
    "        </TaskWorkSection>\n\n      )}\n\n\n      {error && (",
    'invoice work form closing');

  // ETRN currently has no dedicated completion endpoint or final-file persistence workflow.
  // Only clarify its work state; do NOT invent a completion action.
  invoice = replaceOne(invoice,
    `              <div className="infoBox">\n                <strong>Задача в работе</strong>\n                <p>Данные маршрута и документы приведены выше.</p>\n              </div>`,
    `              <TaskWorkSection\n                title="Подготовка ЭТрН"\n                description="Данные маршрута, перевозчика и документы приведены выше."\n              >\n                <p className="taskAccountantWorkHint">В этом экране пока нет действия завершения ЭТрН. Для проверки и выпуска ЭТрН через оператора ЭПД потребуется отдельная интеграция.</p>\n              </TaskWorkSection>`,
    'ETRN in-progress explanation');

  // Verify that established business handlers, editable values and ETRN guard survive.
  if (!["onClick={finish}", "value={poaNumber}"].every(s => poa.includes(s)) ||
      !supplier.includes('onClick={savePayment}') ||
      !invoice.includes('onClick={take}') ||
      !invoice.includes('value={number}') ||
      !invoice.includes('MSM_STEP30_ETRN_UNIFIED_LAYOUT') ||
      !invoice.includes('В этом экране пока нет действия завершения ЭТрН'))
    stop('Post-patch safety check failed. No files changed.');

  css += cssAddon;
  const next = {invoice, poa, supplier, css};
  const written = [];
  try {
    fs.writeFileSync(files.work, workView, 'utf8');
    written.push('work');
    for (const key of ['invoice', 'poa', 'supplier', 'css']) {
      fs.writeFileSync(files[key], restore(next[key], original[key]), 'utf8');
      written.push(key);
    }
    console.log('[MSM step31] Unified accountant work forms installed. Building frontend...');
    cp.execSync('npm run build', {cwd:frontend, stdio:'inherit'});
    cp.execSync('git diff --check', {cwd:root, stdio:'inherit'});
    console.log('SUCCESS: step 31 compiled. Test invoice correction, POA, supplier payment and ETRN work state in browser.');
    console.log('Do not commit until you have verified the forms and actions.');
  } catch (error) {
    for (const key of written.reverse()) {
      if (key === 'work') fs.rmSync(files.work, {force:true});
      else fs.writeFileSync(files[key], original[key], 'utf8');
    }
    console.error('[MSM step31] Build/check failed; all stage-31 changes rolled back.');
    throw error;
  }
} catch (error) {
  console.error(error && error.message || String(error));
  process.exitCode = 1;
}
