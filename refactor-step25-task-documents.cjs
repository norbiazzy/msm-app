/* MSM stage 25 — shared task document presentation, safe to rerun. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const files = {
  invoice: path.join(root, 'frontend/src/InvoiceRequestTaskPanel.tsx'),
  tasks: path.join(root, 'frontend/src/features/tasks/TasksView.tsx'),
  styles: path.join(root, 'frontend/src/styles.css'),
  shared: path.join(root, 'frontend/src/TaskDocuments.tsx'),
};

function stop(message) { throw new Error('[MSM step25] ' + message); }
function lf(s) { return s.replace(/\r\n?/g, '\n'); }
function hash(s) {
  let n = 2166136261;
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619) >>> 0;
  return n.toString(16).padStart(8, '0');
}
function read(file) {
  if (!fs.existsSync(file)) stop('File not found: ' + path.relative(root, file));
  return lf(fs.readFileSync(file, 'utf8'));
}
function once(source, needle, replacement, label) {
  const a = source.indexOf(needle);
  if (a < 0 || source.indexOf(needle, a + needle.length) >= 0) stop('Cannot uniquely locate: ' + label);
  return source.slice(0, a) + replacement + source.slice(a + needle.length);
}
function range(source, first, last, replacement, label) {
  const a = source.indexOf(first);
  if (a < 0 || source.indexOf(first, a + first.length) >= 0) stop('Cannot uniquely locate start: ' + label);
  const b = source.indexOf(last, a + first.length);
  if (b < 0) stop('Cannot locate end: ' + label);
  return source.slice(0, a) + replacement + source.slice(b);
}

if (fs.existsSync(files.shared)) {
  const old = read(files.shared);
  if (old.includes('MSM_STEP25_SHARED_TASK_DOCUMENTS')) {
    console.log('[MSM step25] Already applied. No changes.');
    process.exit(0);
  }
  stop('TaskDocuments.tsx already exists; refusing to overwrite it.');
}
const before = {
  invoice: read(files.invoice),
  tasks: read(files.tasks),
  styles: read(files.styles),
};
const expected = { invoice: '4e7a9e53', tasks: '7c04252f', styles: 'fcf44864' };
for (const k of ['invoice', 'tasks', 'styles']) {
  const actual = hash(before[k]);
  if (actual !== expected[k]) {
    stop('Unexpected local ' + path.relative(root, files[k]) + ' (hash ' + actual + '). Do not overwrite unsaved changes; send this message for adaptation.');
  }
}

const shared = `/* MSM_STEP25_SHARED_TASK_DOCUMENTS */
import type { StoredFile } from './types';
import { dealFileUrl } from './api';

export type TaskDocument = {
  file: StoredFile;
  description: string;
};

type TaskDocumentsProps = {
  title: string;
  subtitle?: string;
  current?: TaskDocument[];
  history?: TaskDocument[];
  emptyLabel?: string;
};

/** Shared, display-only list. Never uploads, deletes, or changes document categories. */
export function TaskDocuments({
  title,
  subtitle,
  current = [],
  history = [],
  emptyLabel = 'Документы не прикреплены',
}: TaskDocumentsProps) {
  // One file ID can appear in several business categories. Show it once,
  // prioritizing the current list, without hiding older distinct file IDs.
  const seen = new Set<string>();
  const unique = (items: TaskDocument[]) => items.filter(({ file }) => {
    if (!file?.id || seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });
  const currentDocs = unique(current);
  const historyDocs = unique(history);
  const total = currentDocs.length + historyDocs.length;

  const row = ({ file, description }: TaskDocument, mode: 'current' | 'history') => (
    <a
      key={file.id}
      className={'taskDocsRow taskDocsRow--' + mode}
      href={dealFileUrl(file.id)}
      target="_blank"
      rel="noreferrer"
      title={file.originalName}
    >
      <span className="taskDocsFileIcon" aria-hidden="true">▤</span>
      <span className="taskDocsFileInfo">
        <strong>{file.originalName}</strong>
        <span>{description}</span>
      </span>
      <span className="taskDocsOpen" aria-hidden="true">Открыть ↗</span>
    </a>
  );

  return (
    <section className="taskDocsShared" aria-label={title}>
      <div className="taskDocsHeader">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="taskDocsCount">Файлов: {total}</span>
      </div>

      {total === 0 && <p className="taskDocsEmpty">{emptyLabel}</p>}

      {currentDocs.length > 0 && (
        <div className="taskDocsSection">
          <div className="taskDocsSectionHeading">
            <strong>Актуальные документы</strong>
            <span>{currentDocs.length}</span>
          </div>
          <div className="taskDocsGrid">
            {currentDocs.map((doc) => row(doc, 'current'))}
          </div>
        </div>
      )}

      {historyDocs.length > 0 && (
        <details className="taskDocsHistory">
          <summary>
            <span>История документов</span>
            <span>{historyDocs.length} ранее приложено</span>
          </summary>
          <div className="taskDocsGrid">
            {historyDocs.map((doc) => row(doc, 'history'))}
          </div>
        </details>
      )}
    </section>
  );
}
/* END_MSM_STEP25_SHARED_TASK_DOCUMENTS */
`;

let invoice = before.invoice;
invoice = once(invoice,
  "import {\n  dealFileUrl,\n  submitInvoiceRequest,",
  "import {\n  submitInvoiceRequest,",
  'invoice imports'
);
invoice = once(invoice,
  "import {\n  startBackgroundUploadJob,\n} from './backgroundUploads';",
  "import {\n  startBackgroundUploadJob,\n} from './backgroundUploads';\nimport { TaskDocuments } from './TaskDocuments';",
  'shared invoice import'
);
invoice = range(invoice,
  '      <section className="invoiceTaskDocs" aria-label="Документы менеджера">',
  '      </section>\n\n    </div>',
  `      <TaskDocuments
        title="Документы менеджера"
        subtitle="Актуальные документы и история исправлений"
        current={currentDocuments}
        history={historyDocuments}
      />
`,
  'invoice document list'
);
invoice = once(invoice,
  '      </section>\n\n    </div>',
  '    </div>',
  'remove legacy invoice document container footer'
);

let tasks = before.tasks;
tasks = once(tasks,
  "import { InvoiceRequestDataCard, InvoiceRequestManagerRepair } from '../../InvoiceRequestTaskPanel';",
  "import { InvoiceRequestDataCard, InvoiceRequestManagerRepair } from '../../InvoiceRequestTaskPanel';\nimport { TaskDocuments } from '../../TaskDocuments';",
  'shared tasks import'
);
tasks = once(tasks,
  "  const currentTaskInvoice =\n    task.deal.invoices?.[0];",
  `  // Sort versions without changing their stored order or categories.
  const orderedCorrectionPrimaryFiles = [...correctionPrimaryFiles].sort(
    (a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0),
  );
  const latestCorrectionPrimary = orderedCorrectionPrimaryFiles[0];
  const correctionCurrentDocuments = [
    ...(latestCorrectionPrimary
      ? [{ file: latestCorrectionPrimary, description: 'Основной входящий счёт' }]
      : []),
    ...correctionExtraFiles.map((file) => ({ file, description: 'Дополнительный документ' })),
    ...(!latestCorrectionPrimary
      ? legacyCorrectionFiles.map((file) => ({ file, description: 'Документ корректировки (старый формат)' }))
      : []),
  ];
  const initialCorrectionDocs = managerIncomingFiles.map((file) => ({
    file,
    description: 'Исходное вложение сделки',
  }));
  const correctionHistoryDocuments = [
    ...orderedCorrectionPrimaryFiles.slice(1).map((file) => ({
      file,
      description: 'Предыдущая версия основного счёта',
    })),
    ...(latestCorrectionPrimary
      ? legacyCorrectionFiles.map((file) => ({
          file,
          description: 'Ранее приложенный документ корректировки',
        }))
      : []),
    ...(correctionCurrentDocuments.length > 0 ? initialCorrectionDocs : []),
  ];
  if (correctionCurrentDocuments.length === 0) {
    correctionCurrentDocuments.push(...initialCorrectionDocs);
  }

  const currentTaskInvoice =
    task.deal.invoices?.[0];`,
  'correction document groups'
);
tasks = range(tasks,
  "      {task.type ===\n        'CORRECT_CLIENT_INVOICE' &&\n        correctionPrimaryFiles.length >",
  '            {/* PART_1N_D1_V2_UNIVERSAL_ACCOUNTANT_RETURN */}',
  `      {task.type === 'CORRECT_CLIENT_INVOICE' && (
        <TaskDocuments
          title="Документы корректировки"
          subtitle={correctionPrimaryFiles.length === 0 && legacyCorrectionFiles.length > 0
            ? 'Старый формат: проверьте документы вместе с комментарием менеджера'
            : 'Основной счёт, дополнительные материалы и предыдущие вложения'}
          current={correctionCurrentDocuments}
          history={correctionHistoryDocuments}
        />
      )}

      {task.type !== 'CORRECT_CLIENT_INVOICE' &&
        task.type !== 'ISSUE_CLIENT_INVOICE' &&
        issueExtraFiles.length > 0 && (
          <TaskDocuments
            title="Дополнительные вложения"
            current={issueExtraFiles.map((file) => ({
              file,
              description: 'Вложение к заявке',
            }))}
          />
        )}

`,
  'correction and generic document panels'
);

const cssAddon = `
/* MSM_STEP25_SHARED_TASK_DOCUMENTS_STYLES */
/* Invoice request is a two-column grid: documents must span both columns. */
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskData > .taskDocsShared {
  grid-column: 1 / -1;
}
.boView-tasks .taskDocsShared {
  width: 100%;
  min-width: 0;
  margin: 12px 0;
  padding: 15px;
  border: 1px solid var(--bo-line);
  border-radius: 12px;
  background: var(--bo-panel);
  color: var(--bo-text);
}
.boView-tasks .taskDocsHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}
.boView-tasks .taskDocsHeader h3 {
  margin: 0 0 4px;
  font-size: 16px;
  line-height: 1.3;
  color: var(--bo-text);
}
.boView-tasks .taskDocsHeader p {
  margin: 0;
  font-size: 12px;
  color: var(--bo-muted);
}
.boView-tasks .taskDocsCount {
  flex: none;
  padding: 5px 9px;
  border: 1px solid var(--bo-line);
  border-radius: 999px;
  color: var(--bo-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.boView-tasks .taskDocsEmpty {
  padding: 12px;
  border: 1px dashed var(--bo-line);
  border-radius: 9px;
  color: var(--bo-muted);
  text-align: center;
}
.boView-tasks .taskDocsSectionHeading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  font-size: 12px;
}
.boView-tasks .taskDocsSectionHeading span {
  padding: 2px 7px;
  border-radius: 12px;
  background: var(--bo-panel-2);
  color: var(--bo-muted);
}
.boView-tasks .taskDocsGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.boView-tasks .taskDocsRow {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 64px;
  padding: 10px;
  border: 1px solid var(--bo-line);
  border-radius: 9px;
  background: var(--bo-panel-2);
  color: var(--bo-text);
  text-decoration: none;
  transition: border-color .15s ease;
}
.boView-tasks .taskDocsRow:hover,
.boView-tasks .taskDocsRow:focus-visible { border-color: var(--bo-accent); }
.boView-tasks .taskDocsRow:focus-visible { outline: 2px solid var(--bo-accent); outline-offset: 1px; }
.boView-tasks .taskDocsRow--current { border-left: 3px solid var(--bo-accent); }
.boView-tasks .taskDocsRow--history { opacity: .86; }
.boView-tasks .taskDocsFileIcon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 34px;
  border-radius: 7px;
  background: var(--bo-panel);
  color: var(--bo-accent);
  font-size: 19px;
}
.boView-tasks .taskDocsFileInfo { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.boView-tasks .taskDocsFileInfo strong {
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  color: var(--bo-text);
}
.boView-tasks .taskDocsFileInfo > span { font-size: 11px; color: var(--bo-muted); }
.boView-tasks .taskDocsOpen { font-size: 11px; font-weight: 800; color: var(--bo-accent); white-space: nowrap; }
.boView-tasks .taskDocsHistory { margin-top: 16px; border-top: 1px solid var(--bo-line); padding-top: 12px; }
.boView-tasks .taskDocsHistory summary {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  cursor: pointer;
  color: var(--bo-muted);
  font-size: 12px;
  font-weight: 750;
}
.boView-tasks .taskDocsHistory summary::before { content: '▸'; color: var(--bo-accent); }
.boView-tasks .taskDocsHistory[open] summary::before { content: '▾'; }
.boView-tasks .taskDocsHistory summary > span:last-child { margin-left: auto; font-weight: 550; }
@media (max-width: 720px) {
  .boView-tasks .taskDocsGrid { grid-template-columns: minmax(0, 1fr); }
  .boView-tasks .taskDocsHeader { flex-wrap: wrap; }
  .boView-tasks .taskDocsRow { grid-template-columns: 28px minmax(0, 1fr) auto; }
}
/* END_MSM_STEP25_SHARED_TASK_DOCUMENTS_STYLES */
`;
const styles = before.styles + cssAddon;

// No filesystem mutation before every replacement has been validated.
const patches = { invoice, tasks, styles };
const written = [];
try {
  fs.writeFileSync(files.shared, shared, 'utf8');
  written.push('shared');
  for (const k of ['invoice','tasks','styles']) {
    fs.writeFileSync(files[k], patches[k], 'utf8');
    written.push(k);
  }
  console.log('[MSM step25] Shared task document UI installed. Building frontend...');
  cp.execSync('npm run build', {cwd: path.join(root,'frontend'), stdio:'inherit'});
  cp.execSync('git diff --check', {cwd:root, stdio:'inherit'});
  console.log('SUCCESS: stage 25 compiled. Check invoice issuance and correction documents in browser. Do not commit yet.');
} catch (error) {
  for (const k of ['invoice', 'tasks', 'styles']) {
    if (written.includes(k)) fs.writeFileSync(files[k], before[k], 'utf8');
  }
  if (written.includes('shared')) fs.rmSync(files.shared, {force:true});
  console.error('[MSM step25] Build failed. Stage 25 changes rolled back.');
  console.error(error?.message || error);
  process.exitCode = 1;
}
