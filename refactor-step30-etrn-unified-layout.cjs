/* MSM stage 30 — consistent ETRN task layout without changing workflow APIs. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const targets = {
  task: path.join(frontend, 'src', 'features', 'tasks', 'TasksView.tsx'),
  etrn: path.join(frontend, 'src', 'EtrnSourceDocuments.tsx'),
  sharedData: path.join(frontend, 'src', 'TaskDataSection.tsx'),
  sharedDocs: path.join(frontend, 'src', 'TaskDocuments.tsx'),
  css: path.join(frontend, 'src', 'styles.css'),
};
const marker = 'MSM_STEP30_ETRN_UNIFIED_LAYOUT';
const nl = x => x.replace(/\r\n?/g, '\n');
function fail(message) { throw new Error('[MSM step30] ' + message); }
function read(p) {
  if (!fs.existsSync(p)) fail('Missing ' + path.relative(root, p));
  return fs.readFileSync(p, 'utf8');
}
function fnv(text) {
  let h = 2166136261;
  for (let i=0; i<text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}
function once(src, original, replacement, label) {
  const i = src.indexOf(original);
  if (i < 0 || src.indexOf(original, i + original.length) !== -1)
    fail('Cannot uniquely locate ' + label + '; nothing changed.');
  return src.slice(0,i) + replacement + src.slice(i + original.length);
}
function range(src, start, end, replacement, label) {
  const i=src.indexOf(start);
  if (i < 0 || src.indexOf(start,i+start.length) !== -1)
    fail('Cannot uniquely locate start of ' + label + '; nothing changed.');
  const j=src.indexOf(end,i+start.length);
  if (j < 0 || src.indexOf(end,j+end.length) !== -1)
    fail('Cannot uniquely locate end of ' + label + '; nothing changed.');
  return src.slice(0,i) + replacement + src.slice(j);
}
function originalNewlines(next, original) {
  return original.includes('\r\n') ? next.replace(/\n/g,'\r\n') : next;
}

const etrnView = `/* PART_V064_N2_ETRN_SOURCE_DOCUMENTS */
import type { Task } from './api';
import { TaskDocuments } from './TaskDocuments';
/* MSM_STEP27_POA_ETRN_SHARED_DOCUMENTS */
/* ${marker} */

/** A single document list. Specific file IDs always come from this ETRN task. */
export function EtrnSourceDocuments({ task }: { task: Task }) {
  if (task.type !== 'ETRN') return null;
  const files = task.deal.files || [];
  const payload = task.payload || {};
  const poaId = String(payload.poaFileId || '');
  const invoiceId = String(payload.invoiceFileId || '');
  const poaFile = files.find(file => poaId && file.id === poaId);
  const invoiceFile = files.find(file => invoiceId && file.id === invoiceId);
  const extraFiles = files.filter(file => file.category === 'TASK_ATTACHMENT_' + task.id);

  return (
    <div className="etrnTaskDocs">
      {(!poaFile || !invoiceFile) && (
        <div className="infoBox" role="status">
          <strong>Проверьте документы для ЭТрН</strong>
          {!poaFile && <p>Доверенность: файл не найден</p>}
          {!invoiceFile && <p>Актуальный счёт: файл не найден</p>}
        </div>
      )}
      <TaskDocuments
        title="Документы ЭТрН"
        subtitle="Доверенность, счёт и дополнительные вложения"
        current={[
          ...(poaFile ? [{ file: poaFile, description: 'Доверенность' }] : []),
          ...(invoiceFile ? [{ file: invoiceFile, description: 'Актуальный счёт' }] : []),
          ...extraFiles.map(file => ({ file, description: 'Приложено при исправлении' })),
        ]}
      />
    </div>
  );
}
/* END_PART_V064_N2_ETRN_SOURCE_DOCUMENTS */
`;

const etrnWorkspace = `      {/* ${marker}: structured details and documents after the task header. */}
      {task.type === 'ETRN' && (
        <>
          <TaskDataSection
            title="Данные для ЭТрН"
            subtitle="Маршрут, перевозчик и контактные лица"
            items={[
              {label: '№ доверенности', value: etrnValue('poaNumber')},
              {label: 'Актуальный счёт', value: etrnInvoiceLabel},
              {label: 'Адрес погрузки', value: etrnValue('loadingAddress'), wide: true},
              {label: 'Адрес выгрузки', value: etrnValue('unloadingAddress'), wide: true},
              {label: 'Контакт на объекте', value: etrnValue('objectContactName')},
              {label: 'Телефон на объекте', value: etrnValue('objectContactPhone')},
              {label: 'Перевозчик / ООО', value: etrnValue('carrierCompany')},
              {label: 'Контакт перевозчика', value: etrnValue('carrierContactName')},
              {label: 'Телефон перевозчика', value: etrnValue('carrierPhone')},
              ...(task.description
                ? [{label: 'Комментарий менеджера', value: task.description, wide: true}]
                : []),
            ]}
          />
          <EtrnSourceDocuments task={task} />
          {status === 'NEED_DATA' && user.role !== 'ACCOUNTANT' && (
            <>
              {String((task as any).returnComment || '').trim() && (
                <div className="taskReturnCommentDetail">
                  <strong>Комментарий бухгалтера</strong>
                  <p>{String((task as any).returnComment)}</p>
                </div>
              )}
              <ManagerResubmitPanel
                taskId={task.id}
                dealId={task.deal.id}
                taskType={task.type}
                actorId={user.id}
                initialDescription={task.description}
                initialUrgent={task.urgent}
                initialDetails={task.details}
                onResubmitted={onBack}
              />
            </>
          )}
          {status === 'NEW' && user.role === 'ACCOUNTANT' && (
            <div className="taskUnifiedStartActions">
              <ReturnToManagerPanel
                taskId={task.id}
                actorId={user.id}
                disabled={saving}
                onReturned={onBack}
              />
              <button type="button" className="primary wide" disabled={saving} onClick={take}>
                {saving ? 'Сохраняем…' : 'В работу'}
              </button>
            </div>
          )}
          {status === 'IN_PROGRESS' && user.role === 'ACCOUNTANT' && (
            <>
              <div className="taskUnifiedSingleAction">
                <ReturnToManagerPanel
                  taskId={task.id}
                  actorId={user.id}
                  disabled={saving}
                  onReturned={onBack}
                />
              </div>
              <div className="infoBox">
                <strong>Задача в работе</strong>
                <p>Данные маршрута и документы приведены выше.</p>
              </div>
            </>
          )}
        </>
      )}

`;

try {
  if (!fs.existsSync(path.join(frontend,'package.json')))
    fail('Run from D:\\job\\it\\msm-app');
  const [dataComponent, docsComponent, css] = [read(targets.sharedData), read(targets.sharedDocs), read(targets.css)];
  if (!dataComponent.includes('MSM_STEP29_UNIFIED_TASK_DATA_COMPONENT') ||
      !css.includes('MSM_STEP29_UNIFIED_TASK_LAYOUT'))
    fail('Stage 29 is not installed. Run refactor-step29-unified-task-layout.cjs first.');
  if (!docsComponent.includes('MSM_STEP25_SHARED_TASK_DOCUMENTS'))
    fail('Stage 25 TaskDocuments is missing.');

  const original = { task: read(targets.task), etrn: read(targets.etrn) };
  let task=nl(original.task), etrn=nl(original.etrn);
  if (task.includes(marker) && etrn.includes(marker)) {
    console.log('[MSM step30] Already applied. No files changed.');
    process.exit(0);
  }
  if (task.includes(marker) || etrn.includes(marker))
    fail('Partial stage-30 markers found. No files changed.');
  if (fnv(etrn) !== '3c34d086')
    fail('ETRN document component differs from verified stage 27 (' + fnv(etrn) + '). No files changed.');
  if (!task.includes("import { TaskDocuments } from '../../TaskDocuments';"))
    fail('Stage 25 changes to TasksView are missing. Apply stage 25 first.');

  task=once(task,
    "import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';",
    "import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';\nimport { TaskDataSection } from '../../TaskDataSection';",
    'ETRN shared data import');
  task=once(task,
    "      className={'content form taskWorkspace' + (task.type === 'ISSUE_CLIENT_INVOICE' ? ' taskWorkspace--invoiceIssue' : '')}",
    "      className={'content form taskWorkspace' + (task.type === 'ISSUE_CLIENT_INVOICE' ? ' taskWorkspace--invoiceIssue' : '') + (task.type === 'ETRN' ? ' taskWorkspace--unified taskWorkspace--etrn' : '')}",
    'ETRN unified workspace class');
  task=once(task,
    "      {status === 'NEED_DATA' &&\n        String(\n          (task as any).returnComment || ''",
    "      {status === 'NEED_DATA' && task.type !== 'ETRN' &&\n        String(\n          (task as any).returnComment || ''",
    'avoid duplicate returned ETRN comment');
  task=once(task,
    "      {task.type !== 'ISSUE_CLIENT_INVOICE' && (",
    "      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.type !== 'ETRN' && (",
    'avoid ETRN deal link ahead of header');
  task=once(task,
    "      {/* PART_V064_N2_ETRN_SOURCE_DOCS_UI */}\n      {task.type === 'ETRN' && (\n        <EtrnSourceDocuments task={task} />\n      )}",
    "      {/* ETRN documents now follow its header and data. */}",
    'move ETRN documents');
  task=range(task,
    "      {[\n        'POWER_OF_ATTORNEY',\n        'ETRN',\n      ].includes(",
    '      {/* PART_1N_D1_V2_UNIVERSAL_MANAGER_RESUBMIT */}',
    `      {task.type === 'POWER_OF_ATTORNEY' &&
        task.details && Object.keys(task.details).length > 0 && (
          <TaskStructuredFields taskType={task.type} value={task.details} readOnly />
        )}

`,
    'remove duplicate ETRN structured fields');
  task=once(task,
    "      {status === 'NEED_DATA' &&\n        user.role !== 'ACCOUNTANT' &&\n        (",
    "      {status === 'NEED_DATA' && task.type !== 'ETRN' &&\n        user.role !== 'ACCOUNTANT' &&\n        (",
    'move ETRN manager repair under documents');
  task=once(task,
    "      {/* PART_V064_L_GENERIC_TASK_CONTEXT */}\n      <TaskContextStrip task={task} />",
    "      {/* PART_V064_L_GENERIC_TASK_CONTEXT */}\n      <TaskContextStrip task={task} />\n\n" + etrnWorkspace +
    "      {/* END_" + marker + " */}",
    'ETRN post-header layout');
  task=once(task,
    "      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.deal.requestText && (",
    "      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.type !== 'ETRN' && task.deal.requestText && (",
    'avoid duplicate ETRN request text');
  task=once(task,
    "      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.description && (",
    "      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.type !== 'ETRN' && task.description && (",
    'avoid duplicate ETRN manager comment');
  task=once(task,
    "      {task.type !== 'CORRECT_CLIENT_INVOICE' &&\n        task.type !== 'ISSUE_CLIENT_INVOICE' &&\n        issueExtraFiles.length > 0 && (",
    "      {task.type !== 'CORRECT_CLIENT_INVOICE' &&\n        task.type !== 'ISSUE_CLIENT_INVOICE' &&\n        task.type !== 'ETRN' &&\n        issueExtraFiles.length > 0 && (",
    'avoid duplicate unrelated deal documents in ETRN');
  task=once(task,
    "      task.type !== 'ISSUE_CLIENT_INVOICE' &&\n      task.type !== 'PAY_SUPPLIER'",
    "      task.type !== 'ISSUE_CLIENT_INVOICE' &&\n      task.type !== 'PAY_SUPPLIER' &&\n      task.type !== 'ETRN'",
    'avoid duplicate ETRN return button');
  task=once(task,
    "{status === 'NEW' && (\n\n        task.type ===",
    "{status === 'NEW' && task.type !== 'ETRN' && (\n\n        task.type ===",
    'avoid hidden ETRN take button');
  task=once(task,
    "      {status === 'IN_PROGRESS' && (\n\n        <div className=\"infoBox invoiceTaskInWorkBox\">",
    "      {status === 'IN_PROGRESS' && task.type !== 'ETRN' && (\n\n        <div className=\"infoBox invoiceTaskInWorkBox\">",
    'avoid wrong invoice work text in ETRN');

  // Helpers read the existing ETRN payload and details without changing them.
  task=once(task,
    "  const currentTaskInvoice =\n",
    `  // ${marker}: only for the ETRN display, never written back to the task.
  const etrnDetails = task.details || {};
  const etrnPayload = task.payload || {};
  const etrnValue = (key: string) => String(etrnDetails[key] || etrnPayload[key] || '—');
  const etrnInvoiceNumber = String(etrnDetails.invoiceNumber || etrnPayload.invoiceNumber || '');
  const etrnInvoiceSellerType = String(etrnDetails.invoiceSellerType || etrnPayload.invoiceSellerType || '');
  const etrnSellerLabel = ({MSM: 'МСМ', ST: 'СТ', IP: 'ИП'} as Record<string, string>)[etrnInvoiceSellerType] || etrnInvoiceSellerType;
  const etrnInvoiceLabel = etrnInvoiceNumber
    ? [etrnSellerLabel, etrnInvoiceNumber].filter(Boolean).join(' - ')
    : '—';

  const currentTaskInvoice =
`,
    'ETRN values for shared data card');

  if (!task.includes('taskWorkspace--etrn') ||
      !task.includes('<TaskDataSection') ||
      !task.includes('<EtrnSourceDocuments task={task} />') ||
      !task.includes('taskUnifiedStartActions') ||
      !task.includes('task.type !== \'ETRN\' && task.description'))
    fail('Post-patch structural validation failed. No files changed.');

  const changed = [];
  try {
    fs.writeFileSync(targets.task, originalNewlines(task,original.task),'utf8');
    changed.push('task');
    fs.writeFileSync(targets.etrn, originalNewlines(etrnView,original.etrn),'utf8');
    changed.push('etrn');
    console.log('[MSM step30] ETRN unified layout installed. Building frontend...');
    cp.execSync('npm run build',{cwd:frontend,stdio:'inherit'});
    cp.execSync('git diff --check',{cwd:root,stdio:'inherit'});
    console.log('SUCCESS: step 30 compiled. Test NEW, IN_PROGRESS and NEED_DATA ETRN in browser.');
    console.log('Do not commit until browser checks pass.');
  } catch(error) {
    for(const key of changed.reverse()) fs.writeFileSync(targets[key],original[key],'utf8');
    console.error('[MSM step30] Build/check failed; stage-30 changes rolled back.');
    throw error;
  }
} catch(error) {
  console.error(error && error.message || String(error));
  process.exitCode=1;
}
