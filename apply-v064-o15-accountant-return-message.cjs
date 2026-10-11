const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const files = {
  backend: path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  ),
  app: path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  ),
  repair: path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
  ),
  styles: path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  ),
};

const marker =
  'PART_V064_O15_ACCOUNTANT_RETURN_MESSAGE';

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден файл: ' +
      path.relative(root, file)
    );
  }

  const raw = fs.readFileSync(file, 'utf8');

  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const backendFile = read(files.backend);
const appFile = read(files.app);
const repairFile = read(files.repair);
const stylesFile = read(files.styles);

if (
  backendFile.text.includes(marker) ||
  appFile.text.includes(marker) ||
  repairFile.text.includes(marker) ||
  stylesFile.text.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.5 уже установлен.'
  );
  process.exit(0);
}

let backend = backendFile.text;
let app = appFile.text;
let repair = repairFile.text;
let styles = stylesFile.text;

/* =========================================================
   BACKEND
   Добавляем события возврата в task.deal.auditEvents.
   ========================================================= */

const listStart =
  backend.indexOf('  list() {');

if (listStart < 0) {
  fail(
    'backend: не найден TasksService.list().'
  );
}

let listEnd =
  backend.indexOf(
    '\n  async ',
    listStart + 1
  );

if (listEnd < 0) {
  fail(
    'backend: не найден конец TasksService.list().'
  );
}

let listBlock =
  backend.slice(listStart, listEnd);

if (
  !listBlock.includes('deal: {') ||
  !listBlock.includes('files: {') ||
  !listBlock.includes('createdAt:')
) {
  fail(
    'backend: структура списка задач отличается от ожидаемой.'
  );
}

const auditInsert =
`
          // ${marker}
          auditEvents: {
            where: {
              action:
                'INVOICE_REQUEST_RETURNED',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 20,
          },
`;

const filesBlockRegex =
  /(          files:\s*\{\s*orderBy:\s*\{\s*createdAt:\s*'asc',?\s*\},?\s*\},)/m;

const filesMatches =
  [...listBlock.matchAll(
    new RegExp(filesBlockRegex.source, 'gm')
  )];

if (filesMatches.length !== 1) {
  console.log(
    'backend: найдено files-блоков в list(): ' +
    filesMatches.length
  );
  fail(
    'backend: не удалось однозначно найти deal.files в списке задач.'
  );
}

listBlock =
  listBlock.replace(
    filesBlockRegex,
    `$1${auditInsert}`
  );

backend =
  backend.slice(0, listStart) +
  listBlock +
  backend.slice(listEnd);

/* =========================================================
   FRONTEND — список задач
   ========================================================= */

const renderTaskStart =
  app.indexOf(
    '  function renderTask('
  );

const renderTaskEnd =
  app.indexOf(
    '\n  function renderGroup(',
    renderTaskStart
  );

if (
  renderTaskStart < 0 ||
  renderTaskEnd < 0
) {
  fail(
    'frontend/App.tsx: не найден renderTask().'
  );
}

let renderTask =
  app.slice(
    renderTaskStart,
    renderTaskEnd
  );

const uploadAnchor =
  '    const isBackgroundUploading =';

if (
  count(
    renderTask,
    uploadAnchor
  ) !== 1
) {
  fail(
    'frontend/App.tsx: не найден точный якорь внутри renderTask().'
  );
}

const returnVars =
`    // ${marker}
    const taskReturnEvent =
      task.deal.auditEvents?.find(
        (event) =>
          event.action ===
            'INVOICE_REQUEST_RETURNED' &&
          event.entityId === task.id
      );

    const taskReturnReason =
      String(
        taskReturnEvent
          ?.newValue
          ?.reasonLabel ||
        'Бухгалтер вернул задачу на исправление'
      );

    const taskReturnComment =
      taskReturnEvent?.reason
        ? String(
            taskReturnEvent.reason
          )
        : '';


`;

renderTask =
  renderTask.replace(
    uploadAnchor,
    returnVars + uploadAnchor
  );

const oldNoticeRegex =
  /\s*\{\/\*\s*PART_1N_RETURN_NOTICE\s*\*\/\}\s*[\s\S]*?(?=\s*<div className="taskState">)/m;

const noticeMatches =
  [...renderTask.matchAll(
    new RegExp(
      oldNoticeRegex.source,
      'gm'
    )
  )];

if (noticeMatches.length !== 1) {
  console.log(
    'frontend/App.tsx: найдено старых return notice: ' +
    noticeMatches.length
  );
  fail(
    'frontend/App.tsx: не удалось однозначно заменить блок возврата в карточке.'
  );
}

const newNotice =
`

        {/* ${marker} — список задач */}
        {task.status === 'NEED_DATA' && (

          <div className="taskReturnNotice taskReturnNoticeV2">

            <div className="taskReturnNoticeTop">

              <span className="taskReturnNoticeIcon">
                !
              </span>

              <strong>
                Вернул бухгалтер
              </strong>

            </div>

            <b className="taskReturnNoticeReason">
              {taskReturnReason}
            </b>

            {taskReturnComment && (

              <p className="taskReturnNoticeComment">
                «{taskReturnComment}»
              </p>

            )}

            <em>
              Открыть и исправить →
            </em>

          </div>

        )}


`;

renderTask =
  renderTask.replace(
    oldNoticeRegex,
    newNotice
  );

app =
  app.slice(0, renderTaskStart) +
  renderTask +
  app.slice(renderTaskEnd);

/* =========================================================
   FRONTEND — экран менеджера после возврата
   ========================================================= */

const repairFnStart =
  repair.indexOf(
    'export function InvoiceRequestManagerRepair({'
  );

if (repairFnStart < 0) {
  fail(
    'InvoiceRequestTaskPanel.tsx: не найден InvoiceRequestManagerRepair.'
  );
}

const requestModeAnchor =
  `  const [
    requestMode,`;

const requestModeIndex =
  repair.indexOf(
    requestModeAnchor,
    repairFnStart
  );

if (requestModeIndex < 0) {
  fail(
    'InvoiceRequestTaskPanel.tsx: не найден requestMode в manager repair.'
  );
}

const repairVars =
`  // ${marker}
  const accountantReturnEvent =
    task.deal.auditEvents?.find(
      (event) =>
        event.action ===
          'INVOICE_REQUEST_RETURNED' &&
        event.entityId === task.id
    );

  const accountantReturnReason =
    String(
      accountantReturnEvent
        ?.newValue
        ?.reasonLabel ||
      'Бухгалтер вернул задачу на исправление'
    );

  const accountantReturnComment =
    accountantReturnEvent?.reason
      ? String(
          accountantReturnEvent.reason
        )
      : '';


`;

repair =
  repair.slice(0, requestModeIndex) +
  repairVars +
  repair.slice(requestModeIndex);

const oldRepairNoticeRegex =
  /      <div className="invoiceTaskRepairNotice">\s*Ниже тот же набор полей,\s*который получил бухгалтер\.\s*Исправьте нужное и повторно\s*отправьте эту же задачу\.\s*<\/div>/m;

const repairNoticeMatches =
  [...repair.matchAll(
    new RegExp(
      oldRepairNoticeRegex.source,
      'gm'
    )
  )];

if (
  repairNoticeMatches.length !== 1
) {
  console.log(
    'InvoiceRequestTaskPanel.tsx: найдено generic notice: ' +
    repairNoticeMatches.length
  );
  fail(
    'InvoiceRequestTaskPanel.tsx: не удалось однозначно заменить уведомление возврата.'
  );
}

const newRepairNotice =
`      {/* ${marker} — экран менеджера */}
      <div className="invoiceManagerReturnCard">

        <div className="invoiceManagerReturnHead">

          <span className="invoiceManagerReturnIcon">
            !
          </span>

          <div>

            <strong>
              Бухгалтер вернул задачу
            </strong>

            <small>
              Что нужно исправить
            </small>

          </div>

        </div>

        <div className="invoiceManagerReturnField">

          <span>
            Причина возврата
          </span>

          <b>
            {accountantReturnReason}
          </b>

        </div>

        {accountantReturnComment && (

          <div className="invoiceManagerReturnField invoiceManagerReturnComment">

            <span>
              Комментарий бухгалтера
            </span>

            <p>
              {accountantReturnComment}
            </p>

          </div>

        )}

      </div>`;

repair =
  repair.replace(
    oldRepairNoticeRegex,
    newRepairNotice
  );

/* =========================================================
   CSS
   ========================================================= */

styles =
  styles.replace(
    /\s*$/,
    ''
  ) +
`

/* ${marker}
   Возврат бухгалтером: причина + комментарий.
*/
.taskReturnNoticeV2 {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  padding: 11px 13px;
  border: 1px solid
    rgba(235, 125, 108, .34);
  border-left: 4px solid
    #dc786a;
  border-radius: 10px;
  background:
    rgba(220, 120, 106, .07);
  text-align: left;
}

.taskReturnNoticeTop {
  display: flex;
  align-items: center;
  gap: 8px;
}

.taskReturnNoticeIcon,
.invoiceManagerReturnIcon {
  display: inline-grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border-radius: 7px;
  background:
    rgba(220, 120, 106, .16);
  color: #ef8a7b;
  font-weight: 900;
}

.taskReturnNoticeTop strong {
  color: #ef8a7b;
}

.taskReturnNoticeReason {
  color: var(--bo-text, #f3f5f7);
  font-size: 14px;
  line-height: 1.35;
}

.taskReturnNoticeComment {
  margin: 0;
  color: var(--bo-muted, #aab5c0);
  font-size: 13px;
  line-height: 1.45;
}

.taskReturnNoticeV2 em {
  margin-top: 2px;
  color: var(--bo-muted, #aab5c0);
  font-size: 12px;
  font-style: normal;
}

.invoiceManagerReturnCard {
  display: grid;
  gap: 14px;
  margin:
    0 0 14px;
  padding: 15px 16px;
  border: 1px solid
    rgba(235, 125, 108, .34);
  border-left: 4px solid
    #dc786a;
  border-radius: 11px;
  background:
    rgba(220, 120, 106, .07);
}

.invoiceManagerReturnHead {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invoiceManagerReturnHead > div {
  display: grid;
  gap: 2px;
}

.invoiceManagerReturnHead strong {
  color: #ef8a7b;
  font-size: 15px;
}

.invoiceManagerReturnHead small {
  color: var(--bo-muted, #9da9b5);
  font-size: 12px;
}

.invoiceManagerReturnField {
  display: grid;
  gap: 4px;
}

.invoiceManagerReturnField > span {
  color: var(--bo-muted, #9da9b5);
  font-size: 11px;
  font-weight: 700;
}

.invoiceManagerReturnField > b {
  color: var(--bo-text, #f3f5f7);
  font-size: 15px;
  line-height: 1.4;
}

.invoiceManagerReturnComment {
  padding-top: 11px;
  border-top: 1px solid
    rgba(255, 255, 255, .08);
}

.invoiceManagerReturnComment p {
  margin: 0;
  color: var(--bo-text, #f3f5f7);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .invoiceManagerReturnCard {
    padding: 13px;
  }

  .taskReturnNoticeV2 {
    padding: 10px 11px;
  }
}
/* END_${marker} */
`;

/* =========================================================
   FINAL CHECKS BEFORE WRITE
   ========================================================= */

const checks = [
  [
    backend.includes(marker),
    'backend отдаёт возвраты'
  ],
  [
    backend.includes(
      "'INVOICE_REQUEST_RETURNED'"
    ),
    'backend action'
  ],
  [
    app.includes(
      'taskReturnEvent'
    ),
    'список: событие возврата'
  ],
  [
    app.includes(
      'Вернул бухгалтер'
    ),
    'список: заголовок'
  ],
  [
    app.includes(
      'taskReturnNoticeComment'
    ),
    'список: комментарий'
  ],
  [
    repair.includes(
      'accountantReturnEvent'
    ),
    'задача: событие возврата'
  ],
  [
    repair.includes(
      'Причина возврата'
    ),
    'задача: причина'
  ],
  [
    repair.includes(
      'Комментарий бухгалтера'
    ),
    'задача: комментарий'
  ],
  [
    styles.includes(
      '.invoiceManagerReturnCard'
    ),
    'CSS блока'
  ],
];

console.log('');
console.log(
  'v064-O1.5 — причина и комментарий бухгалтера'
);
console.log(
  '==========================================='
);

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    fail(
      'Проверка не пройдена: ' +
      label
    );
  }
}

console.log('');
console.log(
  'Будет показано:'
);
console.log(
  ' - в списке: Вернул бухгалтер + причина + комментарий'
);
console.log(
  ' - внутри задачи: отдельный блок «Что нужно исправить»'
);

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

/* =========================================================
   BACKUPS + WRITE
   ========================================================= */

const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

const writes = [
  [
    files.backend,
    backendFile,
    backend,
  ],
  [
    files.app,
    appFile,
    app,
  ],
  [
    files.repair,
    repairFile,
    repair,
  ],
  [
    files.styles,
    stylesFile,
    styles,
  ],
];

for (
  const [file, original]
  of writes
) {
  const backup =
    file +
    '.before-v064-o15-' +
    stamp;

  fs.copyFileSync(
    file,
    backup
  );

  console.log(
    'Backup: ' +
    path.relative(root, backup)
  );
}

for (
  const [file, original, next]
  of writes
) {
  fs.writeFileSync(
    file,
    original.crlf
      ? next.replace(/\n/g, '\r\n')
      : next,
    'utf8'
  );
}

console.log('');
console.log(
  'v064-O1.5 применён.'
);
console.log(
  'Изменены 4 файла: backend task list, App, InvoiceRequestTaskPanel, styles.'
);
