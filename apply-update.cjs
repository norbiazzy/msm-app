'use strict';
// MSM: additive, idempotent patch. No GitHub operations, no destructive DB commands.
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const utf8 = p => fs.readFileSync(path.join(root, p), 'utf8');
const updates = new Map();
function replace(rel, from, to) {
  const current = updates.has(rel) ? updates.get(rel) : utf8(rel);
  if (current.includes(to)) return;
  if (!current.includes(from)) throw new Error(`Версия отличается: в ${rel} не найден ожидаемый участок. Изменения не применены.`);
  updates.set(rel, current.replace(from, to));
}
function insertAfter(rel, needle, addition) {
  const current = updates.has(rel) ? updates.get(rel) : utf8(rel);
  if (current.includes(addition.trim())) return;
  if (!current.includes(needle)) throw new Error(`Версия отличается: в ${rel} не найден ориентир. Изменения не применены.`);
  updates.set(rel, current.replace(needle, needle + addition));
}
try {
  if (!fs.existsSync(path.join(root, 'backend/prisma/schema.prisma')) || !fs.existsSync(path.join(root, 'frontend/src/App.tsx'))) {
    throw new Error('Запустите INSTALL_UPDATE.bat из корня msm-app (рядом с папками backend и frontend).');
  }
  const schema = 'backend/prisma/schema.prisma';
  insertAfter(schema, '  files             StoredFile[]', '\n  filePoolLinks     FilePoolLink[]');
  insertAfter(schema, '  details            Json?', '\n  filePoolLinks      FilePoolLink[]');
  insertAfter(schema, '  clientPayment     ClientPayment? @relation("ClientPaymentFile")', `
  sha256            String?
  poolSource        String         @default("APP")
  uploadedById      String?
  libraryLinks      FilePoolLink[]

  @@index([sha256])
  @@index([uploadedById])`);
  const tail = `
// Общий пул: один файл может использоваться в нескольких задачах и сделках.
model FilePoolLink {
  id          String     @id @default(cuid())
  fileId      String
  file        StoredFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  dealId      String?
  deal        Deal?      @relation(fields: [dealId], references: [id], onDelete: SetNull)
  taskId      String?
  task        Task?      @relation(fields: [taskId], references: [id], onDelete: SetNull)
  linkedById  String?
  createdAt   DateTime   @default(now())

  @@index([fileId])
  @@index([dealId])
  @@index([taskId])
}
`;
  const schemaCurrent = updates.has(schema) ? updates.get(schema) : utf8(schema);
  if (!schemaCurrent.includes('model FilePoolLink {')) updates.set(schema, schemaCurrent + tail);

  const modulePath = 'backend/src/app.module.ts';
  insertAfter(modulePath, "import { FilesModule } from './files/files.module';", "\nimport { FileLibraryModule } from './file-library/file-library.module';");
  const moduleText = updates.get(modulePath) || utf8(modulePath);
  if (!moduleText.includes('FilesModule, FileLibraryModule,')) {
    if (!moduleText.includes('FilesModule, InvoicesModule')) throw new Error('Структура app.module.ts изменена');
    updates.set(modulePath, moduleText.replace('FilesModule, InvoicesModule','FilesModule, FileLibraryModule, InvoicesModule'));
  }

  const app = 'frontend/src/App.tsx';
  insertAfter(app, "import { TasksView } from './features/tasks/TasksView';", "\nimport { FilesLibrary } from './FilesLibrary';");
  replace(app, "type View = 'home' | 'new' | 'tasks' | 'deal';", "type View = 'home' | 'new' | 'tasks' | 'deal' | 'files';");
  insertAfter(app, "  if (hash === 'new') {\n    return { view: 'new' };\n  }", "\n\n  if (hash === 'files') { return { view: 'files' }; }");
  replace(app, "view === 'deal' ? 'Сделка' : 'Мои сделки'", "view === 'deal' ? 'Сделка' : view === 'files' ? 'Файлы' : 'Мои сделки'");
  replace(app, "       ) : view === 'tasks' ? (\n         <TasksView user={user} onChanged={() => reload()} />\n       ) : view === 'deal' && selectedDealId ? (", "       ) : view === 'tasks' ? (\n         <TasksView user={user} onChanged={() => reload()} />\n       ) : view === 'files' ? (\n         <FilesLibrary user={user} deals={deals} />\n       ) : view === 'deal' && selectedDealId ? (");
  insertAfter(app, "        <button className={view === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>Задачи</button>", "\n        <button className={view === 'files' ? 'active' : ''} onClick={() => navigate('files')}>Файлы</button>");

  const nav = 'frontend/src/BlockOfficeMobileNav.tsx';
  replace(nav, `      <button
        type="button"
        className="boMobileEmpty"
        aria-label="Свободная кнопка 1"
        disabled
      >
        <b>·</b>
        <span>&nbsp;</span>
      </button>`, `      <a href="#files"><b>▤</b><span>Файлы</span></a>`);

  const tasks = 'frontend/src/features/tasks/TasksView.tsx';
  insertAfter(tasks, "import { TaskDocuments } from '../../TaskDocuments';", "\nimport { TaskPoolAttachments } from '../../FilesLibrary';");
  insertAfter(tasks, "       <TaskContextStrip task={task} />", "\n       <TaskPoolAttachments taskId={task.id} dealId={task.deal.id} />");

  // Complete the validation phase before writing any files.
  const assets = [
    'backend/src/file-library/file-library.controller.ts',
    'backend/src/file-library/file-library.module.ts',
    'backend/prisma/migrations/20261018213000_file_pool/migration.sql',
    'frontend/src/FilesLibrary.tsx',
    'frontend/src/FilesLibrary.css',
  ];
  for (const asset of assets) {
    if (!fs.existsSync(path.join(__dirname, 'patch', asset))) throw new Error(`Нет файла обновления ${asset}`);
  }
  const date = new Date().toISOString().replace(/[:.]/g,'-');
  const backup = path.join(root, '.msm_update_backups', 'file-library-' + date);
  const changed = [...updates].filter(([rel, value]) => utf8(rel) !== value);
  if (changed.length) {
    for (const [rel] of changed) {
      const backupFile = path.join(backup, rel);
      fs.mkdirSync(path.dirname(backupFile), { recursive: true });
      fs.copyFileSync(path.join(root, rel), backupFile);
    }
    for (const [rel, value] of changed) fs.writeFileSync(path.join(root, rel), value, 'utf8');
  }
  for (const asset of assets) {
    const target = path.join(root, asset);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const source = path.join(__dirname, 'patch', asset);
    fs.copyFileSync(source, target);
  }
  console.log('\nГотово: код общего пула файлов применён.');
  console.log('Обновлено существующих файлов: ' + changed.length);
  console.log('Резервная копия: ' + (changed.length ? backup : 'предыдущая установка уже была применена'));
  console.log('\nСледующий шаг: backend: npx prisma migrate deploy && npx prisma generate');
  console.log('Затем сборка: npm run build в backend и frontend.');
} catch (error) {
  console.error('\nОБНОВЛЕНИЕ НЕ ПРИМЕНЕНО: ' + error.message);
  process.exitCode = 1;
}
