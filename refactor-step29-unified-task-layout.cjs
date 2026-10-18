/* MSM stage 29 — shared accountant task layout: supplier payment and POA. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const files = {
  poa: path.join(frontend, 'src', 'PowerOfAttorneyBlock.tsx'),
  supplier: path.join(frontend, 'src', 'PurchasesBlock.tsx'),
  css: path.join(frontend, 'src', 'styles.css'),
  shared: path.join(frontend, 'src', 'TaskDataSection.tsx'),
  docs: path.join(frontend, 'src', 'TaskDocuments.tsx'),
};
const marker = 'MSM_STEP29_UNIFIED_TASK_LAYOUT';
const lf = (s) => s.replace(/\r\n?/g, '\n');
function fail(why) { throw new Error('[MSM step29] ' + why); }
function read(file) {
  if (!fs.existsSync(file)) fail('Missing ' + path.relative(root, file));
  return fs.readFileSync(file, 'utf8');
}
function once(source, anchor, replacement, label) {
  const p = source.indexOf(anchor);
  if (p < 0 || source.indexOf(anchor, p + anchor.length) !== -1)
    fail('Could not uniquely locate ' + label + '; nothing changed.');
  return source.slice(0, p) + replacement + source.slice(p + anchor.length);
}
function range(source, start, end, content, label) {
  const p = source.indexOf(start);
  if (p < 0 || source.indexOf(start, p + start.length) !== -1)
    fail('Could not uniquely locate start of ' + label + '; nothing changed.');
  const q = source.indexOf(end, p + start.length);
  if (q < 0 || source.indexOf(end, q + end.length) !== -1)
    fail('Could not uniquely locate end of ' + label + '; nothing changed.');
  return source.slice(0, p) + content + source.slice(q);
}
function restoreNewlines(text, original) {
  return original.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text;
}
const poaData = `      <TaskDataSection
        title="Данные для доверенности"
        subtitle="Кому выдаём, откуда получаем и какие документы используем"
        items={[
          { label: 'Поставщик / завод', value: supplierName || '—' },
          { label: 'На кого доверенность', value: recipientName || '—' },
          { label: 'Что получаем', value: goodsDescription || '—', wide: true },
          ...(currentCustomerInvoiceNumber
            ? [{ label: 'Счёт заказчику', value: currentCustomerInvoiceNumber }]
            : []),
          ...(incomingInvoiceNumber
            ? [{ label: 'Входящий счёт', value: incomingInvoiceNumber }]
            : []),
          ...(task.description
            ? [{ label: 'Комментарий для бухгалтерии', value: task.description, wide: true }]
            : []),
        ]}
      />

`;
const sharedBody = `/* MSM_STEP29_UNIFIED_TASK_DATA_COMPONENT */
import type { ReactNode } from 'react';

type TaskDataItem = {
  label: string;
  value: ReactNode;
  wide?: boolean;
};

export function TaskDataSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: TaskDataItem[];
}) {
  return (
    <section className="taskUnifiedData" aria-label={title}>
      <div className="taskUnifiedDataHead">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="taskUnifiedDataGrid">
        {items.map((item, index) => (
          <div
            key={item.label + ':' + index}
            className={item.wide ? 'taskUnifiedDataField taskUnifiedDataField--wide' : 'taskUnifiedDataField'}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
`;
const cssAddon = `
/* ${marker} */
/* A shared visual language for invoice, supplier-payment and POA tasks. */
.boView-tasks section.taskWorkspace--unified {
  gap: 0;
}
.boView-tasks .taskWorkspace--unified .taskUnifiedData {
  width: 100%;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--bo-line);
  border-radius: 16px;
  background: var(--bo-panel);
  color: var(--bo-text);
  margin: 0 0 12px;
}
.boView-tasks .taskUnifiedDataHead {
  margin: 0 0 17px;
}
.boView-tasks .taskUnifiedDataHead h3 {
  margin: 0 0 4px;
  color: var(--bo-text);
  font-size: 17px;
  line-height: 1.35;
  font-weight: 800;
}
.boView-tasks .taskUnifiedDataHead p {
  margin: 0;
  color: var(--bo-muted);
  font-size: 12px;
  line-height: 1.4;
}
.boView-tasks .taskUnifiedDataGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.boView-tasks .taskUnifiedDataField {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 14px;
  border: 1px solid var(--bo-line);
  border-radius: 10px;
  background: var(--bo-panel-2);
}
.boView-tasks .taskUnifiedDataField--wide {
  grid-column: 1 / -1;
}
.boView-tasks .taskUnifiedDataField > span {
  color: var(--bo-muted);
  font-size: 11px;
  line-height: 1.35;
  font-weight: 750;
}
.boView-tasks .taskUnifiedDataField > strong {
  min-width: 0;
  color: var(--bo-text);
  font-size: 14px;
  font-weight: 750;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.boView-tasks .taskUnifiedStartActions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 10px;
  margin: 12px 0;
  padding: 14px;
  border: 1px solid var(--bo-line);
  border-left: 4px solid var(--bo-blue, var(--bo-accent));
  border-radius: 12px;
  background: var(--bo-panel);
}
.boView-tasks .taskUnifiedStartActions--single {
  grid-template-columns: 1fr;
}
.boView-tasks .taskUnifiedStartActions > button {
  min-width: 0;
  width: 100%;
  min-height: 54px;
  margin: 0;
  border-radius: 9px;
  text-align: center;
}
.boView-tasks .taskUnifiedSingleAction {
  margin: 12px 0;
}
.boView-tasks .taskUnifiedSingleAction > button {
  width: 100%;
}
@media (max-width: 720px) {
  .boView-tasks .taskUnifiedDataGrid {
    grid-template-columns: minmax(0, 1fr);
  }
  .boView-tasks .taskUnifiedDataField--wide {
    grid-column: 1;
  }
  .boView-tasks .taskWorkspace--unified .taskUnifiedData {
    padding: 12px;
  }
  .boView-tasks .taskUnifiedStartActions {
    grid-template-columns: minmax(0, 1fr);
    padding: 10px;
  }
}
/* END_${marker} */
`;

try {
  if (!fs.existsSync(path.join(frontend, 'package.json')))
    fail('Run from D:\\job\\it\\msm-app');
  const docs = lf(read(files.docs));
  if (!docs.includes('MSM_STEP25_SHARED_TASK_DOCUMENTS'))
    fail('The shared documents component from stage 25 is missing.');
  const original = { poa: read(files.poa), supplier: read(files.supplier), css: read(files.css) };
  let poa = lf(original.poa), supplier = lf(original.supplier), css = lf(original.css);
  if (poa.includes(marker) && supplier.includes(marker) && css.includes(marker)) {
    console.log('[MSM step29] Already applied; no changes.');
    process.exit(0);
  }
  if (poa.includes(marker) || supplier.includes(marker) || css.includes(marker))
    fail('Partial stage-29 markers found; no changes made.');
  if (fs.existsSync(files.shared))
    fail('TaskDataSection.tsx already exists; refusing to overwrite it.');
  if (!poa.includes('MSM_STEP27_POA_ETRN_SHARED_DOCUMENTS'))
    fail('Stage 27 (POA documents) is not applied. Run stage 27 first.');
  if (!supplier.includes('MSM_STEP28_SUPPLIER_PAYMENT_DOCUMENTS'))
    fail('Stage 28 (supplier documents) is not applied. Run stage 28 first.');
  if (!css.includes('MSM_TASK_DETAIL_REDESIGN_V21'))
    fail('Expected task style baseline not found; no changes made.');

  // ---- Power of attorney / accountant & manager ----
  poa = once(poa,
    "import { TaskContextStrip } from './TaskContextStrip';",
    "import { TaskContextStrip } from './TaskContextStrip';\nimport { TaskDataSection } from './TaskDataSection';\n/* " + marker + " */",
    'POA shared component import');
  poa = once(poa,
    'className="content form taskWorkspace"',
    'className="content form taskWorkspace taskWorkspace--unified"',
    'returned POA workspace class');
  poa = once(poa,
    '    <section className="content form">',
    '    <section className="content form taskWorkspace taskWorkspace--unified" data-task-status={status}>',
    'POA accountant workspace class');
  poa = once(poa,
    '      <TaskContextStrip task={task} />\n\n',
    '      <TaskContextStrip task={task} />\n\n' + poaData,
    'returned-manager POA data card');
  poa = range(poa,
    '      <div className="powerTaskGrid">',
    '      {(poaCurrentDocs.length > 0 || poaHistoryDocs.length > 0) && (',
    '      <TaskContextStrip task={task} />\n\n' + poaData,
    'POA separate data boxes');
  poa = range(poa,
    "      {user.role === 'ACCOUNTANT' &&\n        (\n          status === 'NEW' ||",
    "      {status === 'IN_PROGRESS' && (",
    `      {status === 'NEW' && (
        <div className="taskUnifiedStartActions">
          {user.role === 'ACCOUNTANT' && (
            <ReturnToManagerPanel
              taskId={task.id}
              actorId={user.id}
              disabled={saving}
              onReturned={onBack}
            />
          )}
          <button type="button" className="primary wide" disabled={saving} onClick={take}>
            {saving ? 'Сохраняем…' : 'В работу'}
          </button>
        </div>
      )}
      {user.role === 'ACCOUNTANT' && status === 'IN_PROGRESS' && (
        <div className="taskUnifiedSingleAction">
          <ReturnToManagerPanel
            taskId={task.id}
            actorId={user.id}
            disabled={saving}
            onReturned={onBack}
          />
        </div>
      )}

`,
    'POA actions');

  // ---- Supplier payment / accountant ----
  supplier = once(supplier,
    "import { TaskContextStrip } from './TaskContextStrip';",
    "import { TaskContextStrip } from './TaskContextStrip';\nimport { TaskDataSection } from './TaskDataSection';\n/* " + marker + " */",
    'supplier shared component import');
  supplier = once(supplier,
    '  return (\n\n    <section\n      className="content form taskWorkspace"',
    '  return (\n\n    <section\n      className="content form taskWorkspace taskWorkspace--unified"',
    'supplier accountant workspace class');
  supplier = range(supplier,
    '      <div className="infoBox">\n\n        <strong>\n          Данные закупки',
    '      <TaskDocuments\n        title="Документы оплаты поставщику"',
    `      <TaskDataSection
        title="Данные для оплаты поставщику"
        subtitle="Поставщик, входящий счёт и сумма к оплате"
        items={[
          { label: 'Поставщик', value: purchase.supplierName },
          { label: 'Входящий счёт', value: purchase.incomingInvoiceNumber || '—' },
          { label: stampOnlyTask ? 'Оплачено' : 'Нужно оплатить', value: stampOnlyTask ? money(paidAlready) : money(amountToPay) },
          { label: 'Уже оплачено', value: money(paidAlready) },
          { label: 'Документы', value: waitingStamp ? 'Ждём печать' : financiallyPaid ? 'Готово' : 'Оплата' },
          ...(task.description
            ? [{ label: 'Комментарий менеджера', value: task.description, wide: true }]
            : []),
        ]}
      />

`,
    'supplier data summary and duplicated manager comment');
  supplier = range(supplier,
    '            {/* PART_1M_A_SUPPLIER_RETURN */}',
    "{status ===\n        'IN_PROGRESS' &&\n        !financiallyPaid && (",
    `      {/* Unified actions: return first, take second. */}
      {status === 'NEW' && (
        <div className={financiallyPaid
          ? 'taskUnifiedStartActions taskUnifiedStartActions--single'
          : 'taskUnifiedStartActions'}>
          {!financiallyPaid && (
            <ReturnToManagerPanel
              taskId={task.id}
              actorId={user.id}
              disabled={saving}
              onReturned={onBack}
            />
          )}
          <button type="button" className="primary wide" disabled={saving} onClick={take}>
            {saving ? 'Сохраняем…' : 'В работу'}
          </button>
        </div>
      )}
      {status === 'IN_PROGRESS' && !financiallyPaid && (
        <div className="taskUnifiedSingleAction">
          <ReturnToManagerPanel
            taskId={task.id}
            actorId={user.id}
            disabled={saving}
            onReturned={onBack}
          />
        </div>
      )}

`,
    'supplier start and return actions');

  // Assert that the old UI wasn't left behind by accident.
  if (!poa.includes('title="Данные для доверенности"') ||
      !supplier.includes('title="Данные для оплаты поставщику"') ||
      !supplier.includes('title="Документы оплаты поставщику"') ||
      !poa.includes('title="Документы доверенности"') ||
      poa.includes('      <div className="powerTaskGrid">') ||
      supplier.includes('          Данные закупки'))
    fail('Post-patch validation failed; nothing changed.');
  css += cssAddon;

  const next = {poa, supplier, css};
  const wrote = [];
  try {
    fs.writeFileSync(files.shared, sharedBody, 'utf8');
    wrote.push('shared');
    for (const key of ['poa', 'supplier', 'css']) {
      fs.writeFileSync(files[key], restoreNewlines(next[key], original[key]), 'utf8');
      wrote.push(key);
    }
    console.log('[MSM step29] Shared task data cards and actions installed. Building frontend...');
    cp.execSync('npm run build', {cwd:frontend,stdio:'inherit'});
    cp.execSync('git diff --check', {cwd:root,stdio:'inherit'});
    console.log('SUCCESS: step 29 compiled. Test supplier payment and POA as accountant, including returned-manager POA.');
    console.log('Do not commit before checking the UI in browser.');
  } catch (error) {
    for (const key of wrote.reverse()) {
      if (key === 'shared') fs.rmSync(files.shared, {force:true});
      else fs.writeFileSync(files[key], original[key], 'utf8');
    }
    console.error('[MSM step29] Validation failed. Step-29 changes rolled back.');
    throw error;
  }
} catch (error) {
  console.error(error && error.message || String(error));
  process.exitCode = 1;
}
