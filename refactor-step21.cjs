/*
  MSM stage 21: Redesign accountant's ISSUE_CLIENT_INVOICE task page.

  Base: GitHub main c3bc872 + local stage 19 applied, stage 20 fixed committed.
  Visual-only change: invoice task layout, no data mutations or API calls.
  Does NOT change forms for corrections, payments, POA, ETRN.
*/
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = __dirname;
const targets = [
  { path: 'frontend/src/InvoiceRequestTaskPanel.tsx', hash: '68da3a8f' },
  { path: 'frontend/src/features/tasks/TasksView.tsx', hash: 'a4f585be' },
  { path: 'frontend/src/styles.css', hash: '17806a2c' },
];

function hashFnv1a(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}
function assertOnce(text, needle, context) {
  const i = text.indexOf(needle);
  if (i < 0 || text.indexOf(needle, i + 1) >= 0) {
    throw new Error(`Cannot uniquely locate ${context}; nothing changed.`);
  }
  return i;
}
function replaceOnce(text, before, after, context) {
  const start = assertOnce(text, before, context);
  return text.slice(0, start) + after + text.slice(start + before.length);
}
function replaceRange(text, start, end, replacement, context) {
  const a = assertOnce(text, start, context + ' start');
  const b = assertOnce(text, end, context + ' end');
  if (b <= a) throw new Error(`Invalid boundaries: ${context}; nothing changed.`);
  return text.slice(0, a) + replacement + text.slice(b);
}

function reviseInvoicePanel(text) {
  const selection = `  const { documents } = useMemo(
    () => invoiceRequestFiles(task),
    [task.id, task.deal.files],
  );`;
  const selectionWithGrouping = `  const { documents } = useMemo(
    () => invoiceRequestFiles(task),
    [task.id, task.deal.files],
  );

  // A re-submission keeps initial documents in the history, but they
  // remain current on a task that has not yet been corrected.
  const hasCorrections = documents.some(
    ({ description }) =>
      description === 'Приложено при исправлении' ||
      description === 'Предыдущая версия входящего счёта',
  );
  const currentDocuments = documents.filter(({ description }) =>
    description === 'Актуальный входящий счёт' ||
    description === 'Приложено при исправлении' ||
    description === 'Входящий счёт поставщика' ||
    (!hasCorrections && description === 'Ранее приложенный документ'),
  );
  const currentIds = new Set(currentDocuments.map(({ file }) => file.id));
  const historyDocuments = documents.filter(({ file }) => !currentIds.has(file.id));`;
  text = replaceOnce(text, selection, selectionWithGrouping, 'invoice document selection');

  text = replaceOnce(
    text,
    `            Запрос менеджера
`,
    `            Данные для выставления счёта
`,
    'request heading',
  );
  text = replaceOnce(
    text,
    `            Эти же поля вернутся
            менеджеру при возврате`,
    `            Данные менеджера и приложенные документы`,
    'request heading explanation',
  );

  const docsMarkup = `      <section className="invoiceTaskDocs" aria-label="Документы менеджера">
        <div className="invoiceTaskDocsHeader">
          <div>
            <h3>Документы менеджера</h3>
            <p>Актуальные документы и история исправлений</p>
          </div>
          <span className="invoiceTaskDocsCount">Файлов: {documents.length}</span>
        </div>

        {documents.length === 0 && (
          <div className="invoiceTaskDocsEmpty">Документы не прикреплены</div>
        )}

        {currentDocuments.length > 0 && (
          <div className="invoiceTaskDocsSection">
            <div className="invoiceTaskDocsSectionTitle">
              <strong>Актуальные</strong>
              <span>{currentDocuments.length}</span>
            </div>
            <div className="invoiceTaskDocsGrid">
              {currentDocuments.map(({ file, description }) => (
                <a
                  key={file.id}
                  className="invoiceTaskDoc invoiceTaskDoc--current"
                  href={dealFileUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="invoiceTaskDocIcon" aria-hidden="true">▤</span>
                  <div>
                    <strong>{file.originalName}</strong>
                    <span>{description}</span>
                  </div>
                  <b>Открыть ↗</b>
                </a>
              ))}
            </div>
          </div>
        )}

        {historyDocuments.length > 0 && (
          <details className="invoiceTaskHistory" open>
            <summary>
              <span>История документов</span>
              <span>{historyDocuments.length} ранее приложено</span>
            </summary>
            <div className="invoiceTaskDocsGrid">
              {historyDocuments.map(({ file, description }) => (
                <a
                  key={file.id}
                  className="invoiceTaskDoc invoiceTaskDoc--history"
                  href={dealFileUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="invoiceTaskDocIcon" aria-hidden="true">▤</span>
                  <div>
                    <strong>{file.originalName}</strong>
                    <span>{description}</span>
                  </div>
                  <b>Открыть ↗</b>
                </a>
              ))}
            </div>
          </details>
        )}
      </section>
`;
  text = replaceRange(
    text,
    '      <div className="invoiceTaskDocs">',
    '\n    </div>\n  );\n}\n\n\nexport function InvoiceRequestManagerRepair',
    docsMarkup,
    'invoice documents interface',
  );
  if (!text.includes('invoiceTaskDoc--history') || !text.includes('Данные для выставления счёта')) {
    throw new Error('Updated invoice view integrity check failed.');
  }
  return text;
}

function reviseTaskView(text) {
  text = replaceOnce(
    text,
    '      className="content form taskWorkspace"\n      data-task-status={status}',
    `      className={'content form taskWorkspace' + (task.type === 'ISSUE_CLIENT_INVOICE' ? ' taskWorkspace--invoiceIssue' : '')}
      data-task-status={status}`,
    'task-specific layout class',
  );

  // Previously shown before the navigation and task title. Move it beneath
  // the task header and context, where the accountant expects to find it.
  const card = `      {/* PART_1N_I1_INVOICE_DATA_CARD */}

      {task.type ===
        'ISSUE_CLIENT_INVOICE' && (

        <InvoiceRequestDataCard
          task={task}
        />

      )}`;
  text = replaceOnce(text, card, '', 'remove misplaced request card');
  const context = `      {/* PART_V064_L_GENERIC_TASK_CONTEXT */}
      <TaskContextStrip task={task} />`;
  text = replaceOnce(text, context, context + `

      ${card.trimStart()}`, 'place request details after header');

  // TaskContextStrip already opens the deal, so avoid a second deal link.
  text = replaceOnce(text,
    '      {/* PART_1N_H1_TASK_DETAIL_DEAL_LINK */}\n\n      <a',
    `      {/* PART_1N_H1_TASK_DETAIL_DEAL_LINK */}

      {task.type !== 'ISSUE_CLIENT_INVOICE' && (
      <a`,
    'hide duplicate deal link for invoice task',
  );
  text = replaceOnce(text,
    '      </a>\n\n\n      {/* PART_V064_N2_ETRN_SOURCE_DOCS_UI */}',
    `      </a>
      )}


      {/* PART_V064_N2_ETRN_SOURCE_DOCS_UI */}`,
    'close conditional deal link',
  );

  // Other task types retain their existing summary cards.
  text = replaceOnce(text,
    '      {canAttachInvoice && (\n\n        <div className="invoiceTaskBrief">',
    `      {canAttachInvoice && task.type !== 'ISSUE_CLIENT_INVOICE' && (

        <div className="invoiceTaskBrief">`,
    'remove duplicate seller/client summary',
  );
  text = replaceOnce(text,
    '      {task.deal.requestText && (\n\n        <div className="infoBox">',
    `      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.deal.requestText && (

        <div className="infoBox">`,
    'remove duplicate request text',
  );
  text = replaceOnce(text,
    '      {task.description && (\n\n        <div className="infoBox">',
    `      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.description && (

        <div className="infoBox">`,
    'remove duplicate task comment',
  );

  const cardCount = text.split('        <InvoiceRequestDataCard\n').length - 1;
  if (cardCount !== 1) throw new Error(`Expected exactly one request card, got ${cardCount}`);
  return text;
}

const cssAddition = `
/* MSM_TASK_DETAIL_REDESIGN_V21
   Scoped to the accountant's ISSUE_CLIENT_INVOICE workspace; keep other
   task types and all workflow actions unchanged. */
.boView-tasks .taskWorkspace--invoiceIssue {
  --msm-doc-accent: var(--bo-blue, #4b7d95);
}
.boView-tasks .taskWorkspace--invoiceIssue .detailHero {
  margin-bottom: 10px;
  border-radius: 14px;
  padding: 16px 20px;
}
.boView-tasks .taskWorkspace--invoiceIssue .taskContextStrip {
  margin-bottom: 12px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskData {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  border: 1px solid var(--bo-line);
  border-radius: 16px;
  background: var(--bo-panel);
  color: var(--bo-text);
  padding: 18px;
  margin-bottom: 12px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataHead,
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataGrid,
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocs {
  grid-column: 1 / -1;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataHead strong {
  font-size: 17px;
  line-height: 1.35;
  font-weight: 800;
  color: var(--bo-text);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataHead span {
  font-size: 12px;
  line-height: 1.4;
  color: var(--bo-muted);
  opacity: 1;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataGrid {
  margin-top: 0;
  gap: 10px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataGrid > div,
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskTextBlock {
  background: var(--bo-panel-2);
  border: 1px solid var(--bo-line);
  border-radius: 10px;
  padding: 12px 14px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskTextBlock {
  min-width: 0;
  margin-top: 0;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskTextBlock p {
  font-size: 14px;
  line-height: 1.5;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocs {
  display: block;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--bo-line);
  border-radius: 0;
  padding: 16px 0 0;
  margin: 4px 0 0;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsHeader h3 {
  margin: 0 0 3px;
  font-size: 16px;
  font-weight: 800;
  color: var(--bo-text);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsHeader p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--bo-muted);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsCount {
  flex: none;
  border: 1px solid var(--bo-line);
  border-radius: 20px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  color: var(--bo-muted);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsSectionTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  font-size: 12px;
  color: var(--bo-text);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsSectionTitle span {
  border-radius: 12px;
  padding: 2px 7px;
  background: var(--bo-panel-2);
  color: var(--bo-muted);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 9px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc {
  display: grid !important;
  grid-template-columns: 30px minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 10px !important;
  min-width: 0;
  min-height: 66px !important;
  padding: 10px 12px !important;
  margin-top: 0 !important;
  background: var(--bo-panel-2);
  border: 1px solid var(--bo-line);
  border-radius: 11px;
  transition: border-color 140ms ease, background 140ms ease;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc:hover {
  border-color: var(--msm-doc-accent);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc--current {
  border-left: 3px solid var(--msm-doc-accent);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc--history {
  opacity: 0.84;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocIcon {
  display: grid !important;
  place-items: center;
  width: 30px;
  height: 34px;
  border-radius: 8px;
  background: var(--bo-panel);
  color: var(--msm-doc-accent) !important;
  font-size: 19px !important;
  opacity: 1 !important;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc > div > strong {
  font-size: 12px !important;
  line-height: 1.35 !important;
  font-weight: 760 !important;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc > div > span {
  font-size: 11px !important;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc > b {
  font-size: 11px !important;
  white-space: nowrap;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskHistory {
  margin-top: 16px;
  border-top: 1px solid var(--bo-line);
  padding-top: 12px;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskHistory summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  color: var(--bo-muted);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskHistory summary::before {
  content: '▾';
  margin-right: 4px;
  color: var(--msm-doc-accent);
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskHistory:not([open]) summary::before {
  content: '▸';
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskHistory summary > span:first-child {
  margin-right: auto;
}
.boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskHistory summary > span:last-child {
  font-weight: 600;
}
@media (max-width: 720px) {
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskData,
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataGrid,
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsGrid {
    grid-template-columns: minmax(0, 1fr);
  }
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskData {
    padding: 12px;
    gap: 9px;
  }
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataHead,
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDataGrid,
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocs {
    grid-column: 1;
  }
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDocsHeader {
    flex-wrap: wrap;
  }
  .boView-tasks .taskWorkspace--invoiceIssue .invoiceTaskDoc {
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    padding: 9px !important;
  }
}
/* END_MSM_TASK_DETAIL_REDESIGN_V21 */
`;

function reviseStyles(text) {
  if (text.includes('MSM_TASK_DETAIL_REDESIGN_V21')) {
    throw new Error('Stage 21 CSS already exists. No changes applied.');
  }
  return text + cssAddition;
}

function run() {
  console.log('[MSM stage 21] Validating stage 19 document history and source versions...');
  const entries = targets.map((target) => {
    const absolute = path.join(root, target.path);
    if (!fs.existsSync(absolute)) throw new Error(`${target.path} not found. Place this script in D:\\job\\it\\msm-app.`);
    const backup = fs.readFileSync(absolute);
    const literal = backup.toString('utf8');
    const normalized = literal.replace(/\r\n/g, '\n');
    const h = hashFnv1a(normalized);
    if (h !== target.hash) {
      throw new Error(`${target.path}: expected ${target.hash}, found ${h}. Stop: avoid overwriting local modifications. Send git status --short.`);
    }
    return { ...target, absolute, backup, crlf: /\r\n/.test(literal), normalized };
  });

  const changes = [
    reviseInvoicePanel(entries[0].normalized),
    reviseTaskView(entries[1].normalized),
    reviseStyles(entries[2].normalized),
  ];
  for (let i = 0; i < entries.length; i++) {
    if (changes[i] === entries[i].normalized) throw new Error(`No changes in ${entries[i].path}`);
  }

  const written = [];
  try {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const revised = e.crlf ? changes[i].replace(/\n/g, '\r\n') : changes[i];
      fs.writeFileSync(e.absolute, revised, 'utf8');
      written.push(e);
    }
    console.log('[MSM stage 21] Validating TypeScript and production build...');
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: path.join(root, 'frontend'),
      shell: process.platform === 'win32',
      encoding: 'utf8',
      stdio: 'inherit',
      timeout: 180000,
    });
    if (build.error || build.status !== 0) {
      throw new Error(`Frontend build failed: ${build.error?.message || build.status}`);
    }
    const diff = spawnSync('git', ['diff', '--check'], {
      cwd: root,
      shell: process.platform === 'win32',
      encoding: 'utf8',
      stdio: 'inherit',
      timeout: 30000,
    });
    if (diff.error || diff.status !== 0) throw new Error('git diff --check failed');
    console.log('SUCCESS: stage 21 compiled. Check the invoice task view in browser. Commit only after visual verification.');
  } catch (error) {
    for (const e of written) fs.writeFileSync(e.absolute, e.backup);
    console.error('[MSM stage 21] Rolled back stage 21 changes:', error.message);
    process.exitCode = 1;
  }
}

try { run(); } catch (error) {
  console.error('[MSM stage 21]', error.message);
  process.exitCode = 1;
}
