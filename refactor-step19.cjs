/*
  MSM step 19: One consistent document history for ISSUE_CLIENT_INVOICE tasks.
  Source baseline: GitHub main c3bc87230266cc53126f7a4083189653404f4571.
  This patch changes the display only. No API, DB, or upload code is changed.
*/
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = __dirname;
const targets = [
  {
    path: 'frontend/src/InvoiceRequestTaskPanel.tsx',
    expectedHash: 'cc79926c',
  },
  {
    path: 'frontend/src/features/tasks/TasksView.tsx',
    expectedHash: '9530f133',
  },
];

function fnv1a(input) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i++) {
    value = Math.imul(value ^ input.charCodeAt(i), 16777619) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

function exactlyOnce(source, anchor, description) {
  const first = source.indexOf(anchor);
  if (first === -1 || source.indexOf(anchor, first + 1) !== -1) {
    throw new Error(`Missing or ambiguous ${description}. No files changed.`);
  }
  return first;
}

function replaceRange(source, start, end, replacement, description) {
  const begin = exactlyOnce(source, start, `${description} start`);
  const finish = exactlyOnce(source, end, `${description} end`);
  if (finish <= begin) {
    throw new Error(`Incorrect ${description} boundaries. No files changed.`);
  }
  return source.slice(0, begin) + replacement + source.slice(finish);
}

function replaceOnce(source, from, to, description) {
  exactlyOnce(source, from, description);
  return source.replace(from, to);
}

function changeInvoiceRequestPanel(source) {
  // Include every historical primary invoice and attachments from both
  // initial submission and resubmissions. Deduplicate by stored file ID.
  const filesSelector = `function invoiceRequestFiles(
  task: Task,
) {
  const files = task.deal.files || [];
  const newestFirst = (
    a: (typeof files)[number],
    b: (typeof files)[number],
  ) =>
    new Date(b.createdAt || 0).getTime() -
    new Date(a.createdAt || 0).getTime();

  const primaryHistory = files
    .filter((file) => file.category === 'CUSTOMER_INVOICE_PRIMARY')
    .sort(newestFirst);

  const currentPrimary = primaryHistory[0];
  const revisedAttachments = files
    .filter((file) => file.category === 'TASK_ATTACHMENT_' + task.id)
    .sort(newestFirst);
  const previousPrimary = primaryHistory.slice(1);
  const initialAttachments = files
    .filter((file) => file.category === 'MANAGER_ATTACHMENT')
    .sort(newestFirst);
  const otherIncoming = files
    .filter((file) => file.category === 'INCOMING_SUPPLIER_INVOICE')
    .sort(newestFirst);

  const candidates = [
    ...(currentPrimary
      ? [{ file: currentPrimary, description: 'Актуальный входящий счёт' }]
      : []),
    ...revisedAttachments.map((file) => ({
      file,
      description: 'Приложено при исправлении',
    })),
    ...previousPrimary.map((file) => ({
      file,
      description: 'Предыдущая версия входящего счёта',
    })),
    ...initialAttachments.map((file) => ({
      file,
      description: 'Ранее приложенный документ',
    })),
    ...otherIncoming.map((file) => ({
      file,
      description: 'Входящий счёт поставщика',
    })),
  ];

  const seenIds = new Set<string>();
  const documents = candidates.filter(({ file }) => {
    if (seenIds.has(file.id)) return false;
    seenIds.add(file.id);
    return true;
  });

  return { documents };
}


`;
  source = replaceRange(
    source,
    'function invoiceRequestFiles(\n  task: Task,\n) {',
    'function RequestField({',
    filesSelector,
    'invoiceRequestFiles()',
  );

  const selectedDocuments = `  const { documents } = useMemo(
    () => invoiceRequestFiles(task),
    [task.id, task.deal.files],
  );`;
  source = replaceRange(
    source,
    '  const {\n    primary,\n    attachments,\n  } = useMemo(',
    '\n\n\n  return (\n\n    <div className="invoiceTaskData">',
    selectedDocuments,
    'document selection in InvoiceRequestDataCard',
  );

  const docsView = `      <div className="invoiceTaskDocs">
        <span className="invoiceTaskDocsTitle">Документы менеджера</span>

        {documents.length === 0 && (
          <div className="invoiceTaskDocsEmpty">
            Документы не прикреплены
          </div>
        )}

        {documents.map(({ file, description }) => (
          <a
            key={file.id}
            className="invoiceTaskDoc"
            href={dealFileUrl(file.id)}
            target="_blank"
            rel="noreferrer"
          >
            <div>
              <strong>{file.originalName}</strong>
              <span>{description}</span>
            </div>
            <b>Открыть</b>
          </a>
        ))}
      </div>
`;
  source = replaceRange(
    source,
    '      <div className="invoiceTaskDocs">',
    '\n    </div>\n  );\n}\n\n\nexport function InvoiceRequestManagerRepair',
    docsView,
    'single task document list',
  );

  if (!source.includes('Приложено при исправлении') ||
      !source.includes('Предыдущая версия входящего счёта')) {
    throw new Error('Document labels missing. No files changed.');
  }
  return source;
}

function changeTaskView(source) {
  // Remove only the redundant displays for ISSUE_CLIENT_INVOICE.
  // Correction-task (CORRECT_CLIENT_INVOICE) documents remain untouched.
  source = replaceRange(
    source,
    '  const customerInvoiceFiles =',
    '  const correctionPrimaryFiles =',
    '',
    'redundant currentCustomerIncoming selection',
  );

  source = replaceRange(
    source,
    "      {task.type ===\n        'ISSUE_CLIENT_INVOICE' &&\n        currentCustomerIncoming && (",
    '      {/* PART_V064_O14_V2_CORRECTION_TAKE_BUTTON */}',
    '',
    'redundant incoming invoice display',
  );

  source = replaceOnce(
    source,
    "      {task.type !==\n        'CORRECT_CLIENT_INVOICE' &&\n        issueExtraFiles.length >\n          0 && (",
    "      {task.type !==\n        'CORRECT_CLIENT_INVOICE' &&\n        task.type !== 'ISSUE_CLIENT_INVOICE' &&\n        issueExtraFiles.length >\n          0 && (",
    'exclude duplicate issue invoice attachments',
  );

  if (source.includes('currentCustomerIncoming') ||
      source.includes('customerInvoiceFiles')) {
    throw new Error('Redundant invoice variables remain. No files changed.');
  }
  return source;
}

function run() {
  console.log('[MSM step 19] Checking repository sources...');
  const content = targets.map((target) => {
    const abs = path.join(root, target.path);
    if (!fs.existsSync(abs)) {
      throw new Error(`File not found: ${target.path}. Place script in repository root.`);
    }
    const raw = fs.readFileSync(abs);
    const literal = raw.toString('utf8');
    const source = literal.replace(/\r\n/g, '\n');
    const hash = fnv1a(source);
    if (hash !== target.expectedHash) {
      throw new Error(
        `${target.path}: expected ${target.expectedHash}, got ${hash}. ` +
        'Your file differs from the reviewed GitHub version. Nothing has changed; send git status --short.'
      );
    }
    return { ...target, abs, raw, crlf: /\r\n/.test(literal), source };
  });

  // Calculate both changes in memory before writing either file.
  const edits = [
    changeInvoiceRequestPanel(content[0].source),
    changeTaskView(content[1].source),
  ];
  const filesWritten = [];
  try {
    for (let i = 0; i < content.length; i++) {
      const entry = content[i];
      const updated = entry.crlf ? edits[i].replace(/\n/g, '\r\n') : edits[i];
      fs.writeFileSync(entry.abs, updated, 'utf8');
      filesWritten.push(entry);
    }

    console.log('[MSM step 19] Checking frontend build...');
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: path.join(root, 'frontend'),
      stdio: 'inherit',
      shell: true,
    });
    if (build.error || build.status !== 0) {
      throw new Error('Build failed. The step 19 changes will be rolled back.');
    }

    console.log('[MSM step 19] Checking git diff whitespace...');
    const check = spawnSync('git', ['diff', '--check', '--', ...targets.map(x=>x.path)], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    if (check.error || check.status !== 0) {
      throw new Error('git diff --check failed. The step 19 changes will be rolled back.');
    }
    console.log('SUCCESS: stage 19 compiled. Check the returned invoice task in the browser before committing.');
  } catch (error) {
    for (const entry of filesWritten) {
      fs.writeFileSync(entry.abs, entry.raw);
    }
    console.error('[MSM step 19] Rolled back changes. Original files restored.');
    throw error;
  }
}

try {
  run();
} catch (error) {
  console.error('[MSM step 19]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
