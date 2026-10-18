/* MSM stage 27 — shared documents in POA and ETRN tasks. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const target = {
  poa: path.join(frontend, 'src', 'PowerOfAttorneyBlock.tsx'),
  etrn: path.join(frontend, 'src', 'EtrnSourceDocuments.tsx'),
  shared: path.join(frontend, 'src', 'TaskDocuments.tsx'),
};
const marker = 'MSM_STEP27_POA_ETRN_SHARED_DOCUMENTS';
const normalize = (s) => s.replace(/\r\n?/g, '\n');
function digest(s) {
  let n = 2166136261;
  for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619) >>> 0;
  return n.toString(16).padStart(8, '0');
}
function abort(message) { throw new Error('[MSM step27] ' + message); }
function read(file) {
  if (!fs.existsSync(file)) abort('Missing ' + path.relative(root, file));
  return fs.readFileSync(file, 'utf8');
}
function once(src, needle, replacement, label) {
  const first = src.indexOf(needle);
  if (first === -1 || src.indexOf(needle, first + needle.length) !== -1)
    abort('Cannot uniquely locate ' + label + '; no files changed.');
  return src.slice(0, first) + replacement + src.slice(first + needle.length);
}
function section(src, start, end, replacement, label) {
  const first = src.indexOf(start);
  if (first < 0 || src.indexOf(start, first + start.length) !== -1)
    abort('Cannot uniquely locate start of ' + label + '; no files changed.');
  const last = src.indexOf(end, first + start.length);
  if (last < 0 || src.indexOf(end, last + end.length) !== -1)
    abort('Cannot uniquely locate end of ' + label + '; no files changed.');
  return src.slice(0, first) + replacement + src.slice(last);
}

try {
  if (!fs.existsSync(path.join(frontend, 'package.json')))
    abort('Run from D:\\job\\it\\msm-app');
  const existingShared = normalize(read(target.shared));
  if (!existingShared.includes('MSM_STEP25_SHARED_TASK_DOCUMENTS'))
    abort('Step 25 shared TaskDocuments component is missing; apply step 25 first.');

  const original = { poa: read(target.poa), etrn: read(target.etrn) };
  const before = { poa: normalize(original.poa), etrn: normalize(original.etrn) };
  if (before.poa.includes(marker) && before.etrn.includes(marker)) {
    console.log('[MSM step27] Already applied. No changes.');
    process.exit(0);
  }
  if (before.poa.includes(marker) || before.etrn.includes(marker))
    abort('Partially applied marker found; refusing to overwrite.');
  const expected = { poa: '850a6758', etrn: 'd67a5aad' };
  for (const key of ['poa', 'etrn']) {
    const actual = digest(before[key]);
    if (actual !== expected[key])
      abort('Unexpected local ' + path.relative(root, target[key]) +
        ' (' + actual + '). Send this message for a safe adaptation.');
  }

  let poa = before.poa;
  poa = once(poa,
    "import { TaskContextStrip } from './TaskContextStrip';",
    "import { TaskContextStrip } from './TaskContextStrip';\nimport { TaskDocuments } from './TaskDocuments';\n/* " + marker + " */",
    'PowerOfAttorneyBlock import');

  poa = once(poa,
    "  const sourceFiles =\n    (task.deal.files || [])\n      .filter(\n        (file) =>\n          (\n            requestKey &&\n            file.category ===\n              'POWER_OF_ATTORNEY_SOURCE_' +\n              requestKey\n          ) ||\n          file.category ===\n            'TASK_ATTACHMENT_' +\n            task.id\n      );",
    `  const sourceFiles =
    (task.deal.files || [])
      .filter(
        (file) =>
          (
            requestKey &&
            file.category ===
              'POWER_OF_ATTORNEY_SOURCE_' +
              requestKey
          ) ||
          file.category ===
            'TASK_ATTACHMENT_' +
            task.id
      );

  // New files after a return are current; originals remain available in history.
  const revisedSourceFiles = sourceFiles.filter(
    (file) => file.category === 'TASK_ATTACHMENT_' + task.id,
  );
  const originalSourceFiles = sourceFiles.filter(
    (file) => file.category !== 'TASK_ATTACHMENT_' + task.id,
  );
  const poaCurrentDocs = [
    ...(currentCustomerInvoiceFile
      ? [{ file: currentCustomerInvoiceFile, description: 'Актуальный счёт заказчику' }]
      : []),
    ...(incomingInvoiceFile
      ? [{ file: incomingInvoiceFile, description: 'Входящий счёт поставщика' }]
      : []),
    ...(revisedSourceFiles.length ? revisedSourceFiles : originalSourceFiles).map(
      (file) => ({ file, description: revisedSourceFiles.length ? 'Приложено при исправлении' : 'Документ к доверенности' }),
    ),
  ];
  const poaHistoryDocs = revisedSourceFiles.length
    ? originalSourceFiles.map((file) => ({ file, description: 'Исходное вложение' }))
    : [];`,
    'POA document categories');

  poa = section(poa,
    '        {sourceFiles.length > 0 && (',
    '        <ManagerResubmitPanel',
    `        {(poaCurrentDocs.length > 0 || poaHistoryDocs.length > 0) && (
          <TaskDocuments
            title="Документы доверенности"
            subtitle="Актуальные файлы и вложения до исправления"
            current={poaCurrentDocs}
            history={poaHistoryDocs}
          />
        )}

`,
    'POA returned-manager attachment list');

  poa = section(poa,
    '      {(currentCustomerInvoiceFile ||\n        currentCustomerInvoiceNumber) && (',
    "      {user.role === 'ACCOUNTANT' &&",
    `      {(currentCustomerInvoiceNumber || incomingInvoiceNumber) && (
        <div className="infoBox">
          <strong>Номера документов</strong>
          {currentCustomerInvoiceNumber && (
            <p>Счёт заказчику: {currentCustomerInvoiceNumber}</p>
          )}
          {incomingInvoiceNumber && (
            <p>Входящий счёт: {incomingInvoiceNumber}</p>
          )}
        </div>
      )}

      {(poaCurrentDocs.length > 0 || poaHistoryDocs.length > 0) && (
        <TaskDocuments
          title="Документы доверенности"
          subtitle="Счета и приложенные документы"
          current={poaCurrentDocs}
          history={poaHistoryDocs}
        />
      )}

`,
    'POA accountant document panels');

  let etrn = before.etrn;
  etrn = once(etrn,
    "import {\n  dealFileUrl,\n  type Task,\n} from './api';",
    "import { type Task } from './api';\nimport { TaskDocuments } from './TaskDocuments';\n/* " + marker + " */",
    'ETRN imports');

  etrn = section(etrn,
    '  return (\n    <div className="etrnTaskDocs">',
    '  );\n}\n\n/* END_PART_V064_N2_ETRN_SOURCE_DOCUMENTS */',
    `  // The ETRN task may receive additional files after a manager correction.
  // Only this task's attachments are included; unrelated deal files are excluded.
  const extraFiles = files.filter(
    (file) => file.category === 'TASK_ATTACHMENT_' + task.id,
  );

  return (
    <div className="etrnTaskDocs">
      <div className="taskStructuredTitle">Реквизиты документов ЭТрН</div>
      <div className="etrnAutoDocRow">
        <div>
          <span>Доверенность</span>
          <strong>№ {poaNumber || '—'}</strong>
        </div>
        {poaFile
          ? <span>Файл приложен</span>
          : <b className="etrnDocMissing">Файл не найден</b>}
      </div>
      <div className="etrnAutoDocRow">
        <div>
          <span>Актуальный счёт</span>
          <strong>
            {invoiceNumber
              ? sellerLabel(invoiceSellerType) + ' - ' + invoiceNumber
              : '—'}
          </strong>
        </div>
        {invoiceFile
          ? <span>Файл приложен</span>
          : <b className="etrnDocMissing">Файл не найден</b>}
      </div>
      <TaskDocuments
        title="Документы ЭТрН"
        subtitle="Доверенность, счёт и дополнительные вложения"
        current={[
          ...(poaFile ? [{ file: poaFile, description: 'Доверенность' }] : []),
          ...(invoiceFile ? [{ file: invoiceFile, description: 'Актуальный счёт' }] : []),
          ...extraFiles.map((file) => ({ file, description: 'Приложено при исправлении' })),
        ]}
      />
    </div>
`,
    'ETRN source documents layout');

  if (!poa.includes('<TaskDocuments') || !etrn.includes('<TaskDocuments'))
    abort('Document component integration was not applied correctly.');

  const next = { poa, etrn };
  const written = [];
  try {
    for (const k of ['poa', 'etrn']) {
      const nl = original[k].includes('\r\n') ? '\r\n' : '\n';
      fs.writeFileSync(target[k], next[k].replace(/\n/g, nl), 'utf8');
      written.push(k);
    }
    console.log('[MSM step27] POA and ETRN shared document views installed. Building frontend...');
    cp.execSync('npm run build', {cwd: frontend, stdio: 'inherit'});
    cp.execSync('git diff --check', {cwd: root, stdio: 'inherit'});
    console.log('SUCCESS: step 27 compiled. Test POA/ETRN documents and returned-manager flows in browser.');
    console.log('Do not commit until the browser test passes.');
  } catch (error) {
    for (const k of written) fs.writeFileSync(target[k], original[k], 'utf8');
    console.error('[MSM step27] Validation failed; stage 27 changes rolled back.');
    throw error;
  }
} catch (error) {
  console.error(error && error.message || error);
  process.exitCode = 1;
}
