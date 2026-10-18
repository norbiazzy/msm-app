// MSM App — refactoring stage 2: extract TasksView/TaskDetail and Field.
// Prepared for frontend/src/App.tsx from GitHub main, blob 513bb7e4f5abe5ae0ed53a376d5e587f5d591e3c.
// No business logic is modified. On unsuccessful frontend build, automatically roll back changes.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const sourcePath = path.join(frontend, 'src', 'App.tsx');
const taskPath = path.join(frontend, 'src', 'features', 'tasks', 'TasksView.tsx');
const fieldPath = path.join(frontend, 'src', 'shared', 'Field.tsx');
const expectedGitBlob = '513bb7e4f5abe5ae0ed53a376d5e587f5d591e3c';

function fail(message) { throw new Error(message); }
function command(file, args, opts = {}) {
  const result = cp.spawnSync(file, args, {
    cwd: root, encoding: 'utf8', shell: false, ...opts,
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail((result.stderr || result.stdout || 'command failed').trim());
  return (result.stdout || '').trim();
}
function getTypescript() {
  try { return require(require.resolve('typescript', { paths: [frontend] })); }
  catch { fail('Не найден TypeScript: сначала выполните npm install в папке frontend.'); }
}
function getFunction(ts, sourceFile, name) {
  const found = sourceFile.statements.filter(
    (s) => ts.isFunctionDeclaration(s) && s.name?.text === name,
  );
  if (found.length !== 1) fail(`Ожидалась одна функция ${name}; найдено ${found.length}.`);
  return found[0];
}
function dropUnusedImports(ts, code, candidates) {
  const sf = ts.createSourceFile('App.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const covered = new Set();
  const replacements = [];
  for (const decl of imports) {
    const clause = decl.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    const elements = clause.namedBindings.elements;
    const removed = elements.filter((e) => candidates.has(e.name.text));
    if (!removed.length) continue;
    for (const e of removed) covered.add(e.name.text);
    const keep = elements.filter((e) => !candidates.has(e.name.text));
    if (keep.length === elements.length) continue;
    if (!keep.length && !clause.name) {
      replacements.push({ start: decl.getStart(sf), end: decl.end, text: '' });
    } else {
      const updatedBindings = ts.factory.updateNamedImports(clause.namedBindings, keep);
      const updatedClause = ts.factory.updateImportClause(clause, clause.isTypeOnly, clause.name, updatedBindings);
      const updatedDecl = ts.factory.updateImportDeclaration(
        decl, decl.modifiers, updatedClause, decl.moduleSpecifier, decl.assertClause,
      );
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
      replacements.push({
        start: decl.getStart(sf), end: decl.end,
        text: printer.printNode(ts.EmitHint.Unspecified, updatedDecl, sf),
      });
    }
  }
  for (const name of candidates) if (!covered.has(name)) fail(`Не найден ожидаемый импорт: ${name}`);
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) code = code.slice(0, r.start) + r.text + code.slice(r.end);
  return code;
}

function main() {
  if (!fs.existsSync(path.join(frontend, 'package.json')) || !fs.existsSync(sourcePath)) {
    fail('Запустите скрипт из корня D:\\job\\it\\msm-app, где находятся frontend и backend.');
  }
  if (fs.existsSync(taskPath) || fs.existsSync(fieldPath)) {
    fail('Целевые файлы уже существуют. Повторный запуск запрещён, чтобы не перезаписать изменения.');
  }
  const relevantStatus = command('git', [
    'status', '--porcelain', '--', 'frontend/src/App.tsx',
    'frontend/src/features/tasks/TasksView.tsx', 'frontend/src/shared/Field.tsx',
  ]);
  if (relevantStatus) fail('Есть несохранённые изменения в затрагиваемых файлах:\n' + relevantStatus);
  const actualBlob = command('git', ['rev-parse', 'HEAD:frontend/src/App.tsx']);
  if (actualBlob !== expectedGitBlob) {
    fail(`Версия App.tsx отличается от проверенной в GitHub (${actualBlob}). Нужен новый скрипт.`);
  }

  const ts = getTypescript();
  const original = fs.readFileSync(sourcePath, 'utf8');
  const sf = ts.createSourceFile('App.tsx', original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (sf.parseDiagnostics.length) fail('Исходный App.tsx содержит синтаксические ошибки.');
  const view = getFunction(ts, sf, 'TasksView');
  const detail = getFunction(ts, sf, 'TaskDetail');
  const theme = getFunction(ts, sf, 'ThemeToggle');
  const field = getFunction(ts, sf, 'Field');
  const a = view.getStart(sf), b = detail.end;
  if (!(a < detail.getStart(sf) && b < theme.getStart(sf) && theme.end < field.getStart(sf))) {
    fail('Расположение функций изменилось. Автоматическое извлечение отменено.');
  }
  const viewText = original.slice(a, b).replace(/^function TasksView\s*\(/, 'export function TasksView(');
  if (!viewText.startsWith('export function TasksView(') || !viewText.includes('function TaskDetail(')) {
    fail('Не удалось корректно выделить TasksView и TaskDetail.');
  }
  const fieldText = original.slice(field.getStart(sf), field.end)
    .replace(/^function Field\s*\(/, 'export function Field(');
  if (!fieldText.startsWith('export function Field(')) fail('Не удалось выделить Field.');

  const taskImports = `import { useEffect, useMemo, useState } from 'react';
import type { CurrentUser } from '../../types';
import { type Task, dealFileUrl, listTasks, returnInvoiceRequest, updateTaskStatus } from '../../api';
import { useBackgroundUploads } from '../../backgroundUploads';
import { clearInvoiceTaskDraft, loadInvoiceTaskDraftFiles, readInvoiceTaskDraftFields, saveInvoiceTaskDraftFields, saveInvoiceTaskDraftFiles } from '../../invoiceTaskDraft';
import { startInvoiceSubmission } from '../../invoiceSubmissionQueue';
import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';
import { TaskContextStrip } from '../../TaskContextStrip';
import { SupplierBalanceCorrectionTask, SupplierPaymentTask } from '../../PurchasesBlock';
import { PowerOfAttorneyTask } from '../../PowerOfAttorneyBlock';
import { ReturnToManagerPanel } from '../../ReturnToManagerPanel';
import { ManagerResubmitPanel } from '../../ManagerResubmitPanel';
import { TaskStructuredFields } from '../../TaskStructuredFields';
import { InvoiceRequestDataCard, InvoiceRequestManagerRepair } from '../../InvoiceRequestTaskPanel';
import { formatMoneyInput, parseMoneyInput, sellerLabels, taskStatus, todayLocalDate } from '../../shared/formatters';
import { Field } from '../../shared/Field';
`;
  const taskCode = taskImports + '\n' + viewText.trimEnd() + '\n';
  const fieldCode = "import type * as React from 'react';\n\n" + fieldText + '\n';

  let updated = original.slice(0, a) + original.slice(b);
  const fieldStartAfterRemoval = updated.indexOf('function Field(');
  // Existing Field function must occur precisely once, and be the same source span.
  if (fieldStartAfterRemoval < 0 || updated.indexOf('function Field(', fieldStartAfterRemoval + 1) !== -1) {
    fail('Не удалось однозначно найти Field в обновлённом App.tsx.');
  }
  updated = updated.slice(0, fieldStartAfterRemoval) + updated.slice(fieldStartAfterRemoval + fieldText.length - 'export '.length);

  updated = dropUnusedImports(ts, updated, new Set([
    'clearInvoiceTaskDraft', 'loadInvoiceTaskDraftFiles',
    'readInvoiceTaskDraftFields', 'saveInvoiceTaskDraftFields', 'saveInvoiceTaskDraftFiles',
    'startInvoiceSubmission', 'SupplierBalanceCorrectionTask', 'SupplierPaymentTask',
    'PowerOfAttorneyTask', 'listTasks', 'returnInvoiceRequest', 'updateTaskStatus',
    'Task', 'InvoiceRequestDataCard', 'InvoiceRequestManagerRepair', 'todayLocalDate',
  ]));
  updated = "import { TasksView } from './features/tasks/TasksView';\n" +
    "import { Field } from './shared/Field';\n" + updated;
  const updatedSf = ts.createSourceFile('App.tsx', updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const taskSf = ts.createSourceFile('TasksView.tsx', taskCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fieldSf = ts.createSourceFile('Field.tsx', fieldCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if ([updatedSf, taskSf, fieldSf].some(s => s.parseDiagnostics.length)) {
    fail('После извлечения обнаружены синтаксические ошибки. Ничего не записано.');
  }
  if (!updated.includes('export default App;') || !taskCode.includes('function TaskDetail(')) {
    fail('Потеряна одна из ожидаемых функций.');
  }

  fs.mkdirSync(path.dirname(taskPath), { recursive: true });
  fs.mkdirSync(path.dirname(fieldPath), { recursive: true });
  let created = false;
  try {
    fs.writeFileSync(taskPath, taskCode, 'utf8');
    fs.writeFileSync(fieldPath, fieldCode, 'utf8');
    created = true;
    fs.writeFileSync(sourcePath, updated, 'utf8');
    console.log(`Выделено строк задач: ${viewText.split('\n').length}`);
    console.log(`App.tsx: ${original.split('\n').length} -> ${updated.split('\n').length} строк`);
    console.log('Проверяем frontend: npm run build...');
    const build = process.platform === 'win32'
      ? cp.spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], { cwd: frontend, stdio: 'inherit' })
      : cp.spawnSync('npm', ['run', 'build'], { cwd: frontend, stdio: 'inherit' });
    if (build.error || build.status !== 0) {
      fail('Frontend-сборка завершилась с ошибкой.');
    }
    console.log('\nУСПЕХ: этап 2 выполнен. Проверьте git diff --stat и экраны задач.');
    console.log('Пока НЕ делайте git add -A: отдельно добавьте только 3 изменённых файла.');
  } catch (e) {
    fs.writeFileSync(sourcePath, original, 'utf8');
    if (created) {
      try { fs.rmSync(taskPath, { force: true }); } catch {}
      try { fs.rmSync(fieldPath, { force: true }); } catch {}
    }
    throw new Error(String(e.message || e) + ' Изменения автоматически отменены.');
  }
}

try { main(); }
catch (error) { console.error('\nОШИБКА: ' + (error.message || error)); process.exitCode = 1; }
