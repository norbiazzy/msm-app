const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const paths = {
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
  'PART_V064_O15_V2_ACCOUNTANT_RETURN_MESSAGE';

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

function readFile(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден: ' +
      path.relative(root, file)
    );
  }

  const raw =
    fs.readFileSync(
      file,
      'utf8'
    );

  return {
    raw,
    crlf:
      raw.includes('\r\n'),
    text:
      raw.replace(
        /\r\n/g,
        '\n'
      ),
  };
}

const original = {
  backend:
    readFile(paths.backend),
  app:
    readFile(paths.app),
  repair:
    readFile(paths.repair),
  styles:
    readFile(paths.styles),
};

let backend =
  original.backend.text;

let app =
  original.app.text;

let repair =
  original.repair.text;

let styles =
  original.styles.text;

if (
  backend.includes(marker) ||
  app.includes(marker) ||
  repair.includes(marker) ||
  styles.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.5 v2 уже установлен.'
  );
  process.exit(0);
}

/* ==========================================================
   1. BACKEND
   В списке задач task.deal должен содержать события возврата.
   ========================================================== */

const listStart =
  backend.indexOf(
    '  list() {'
  );

if (listStart < 0) {
  fail(
    'backend: не найден TasksService.list().'
  );
}

const listEnd =
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
  backend.slice(
    listStart,
    listEnd
  );

const hasReturnEvents =
  listBlock.includes(
    'auditEvents:'
  ) &&
  listBlock.includes(
    'INVOICE_REQUEST_RETURNED'
  );

if (!hasReturnEvents) {
  const filesRegex =
    /(          files:\s*\{\s*orderBy:\s*\{\s*createdAt:\s*'asc',?\s*\},?\s*\},)/m;

  const matches =
    [...listBlock.matchAll(
      new RegExp(
        filesRegex.source,
        'gm'
      )
    )];

  if (matches.length !== 1) {
    console.log(
      'backend: deal.files найдено: ' +
      matches.length
    );

    fail(
      'backend: не удалось безопасно добавить auditEvents.'
    );
  }

  const addition =
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
            take: 30,
          },
`;

  listBlock =
    listBlock.replace(
      filesRegex,
      `$1${addition}`
    );

  backend =
    backend.slice(
      0,
      listStart
    ) +
    listBlock +
    backend.slice(
      listEnd
    );
} else {
  /* Только marker для аудита установки,
     существующую рабочую include-структуру не меняем. */
  backend =
    backend.slice(
      0,
      listStart
    ) +
    `  // ${marker}\n` +
    backend.slice(
      listStart
    );
}

/* ==========================================================
   2. APP.TSX — КАРТОЧКА В СПИСКЕ ЗАДАЧ
   В v1 якорь был слишком жёстким.
   v2 привязывается к реально существующему
   PART_1N_RETURN_NOTICE.
   ========================================================== */

const fnStart =
  app.indexOf(
    '  function renderTask('
  );

const fnEnd =
  app.indexOf(
    '\n  function renderGroup(',
    fnStart
  );

if (
  fnStart < 0 ||
  fnEnd < 0
) {
  fail(
    'frontend/App.tsx: не найден renderTask().'
  );
}

let renderTask =
  app.slice(
    fnStart,
    fnEnd
  );

const oldMarker =
  'PART_1N_RETURN_NOTICE';

const oldMarkerIndex =
  renderTask.indexOf(
    oldMarker
  );

if (oldMarkerIndex < 0) {
  fail(
    'frontend/App.tsx: не найден PART_1N_RETURN_NOTICE.'
  );
}

/* Вставляем вычисление причины перед основным JSX return.
   Ищем ближайший return ( перед return notice,
   а не внутренние background-upload конструкции. */
const jsxReturnIndex =
  renderTask.lastIndexOf(
    '\n    return (',
    oldMarkerIndex
  );

if (jsxReturnIndex < 0) {
  fail(
    'frontend/App.tsx: не найден основной return renderTask().'
  );
}

const returnData =
`
    // ${marker}
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

renderTask =
  renderTask.slice(
    0,
    jsxReturnIndex
  ) +
  returnData +
  renderTask.slice(
    jsxReturnIndex
  );

/* Заменяем только блок между return-marker и taskState.
   Это не зависит от прежнего текста внутри уведомления. */
const markerNow =
  renderTask.indexOf(
    oldMarker
  );

const noticeCommentStart =
  renderTask.lastIndexOf(
    '{/*',
    markerNow
  );

const taskStateIndex =
  renderTask.indexOf(
    '<div className="taskState">',
    markerNow
  );

if (
  noticeCommentStart < 0 ||
  taskStateIndex < 0 ||
  taskStateIndex <= noticeCommentStart
) {
  fail(
    'frontend/App.tsx: не удалось определить границы return notice.'
  );
}

const newNotice =
`{/* ${marker} — список задач */}

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
              {accountantReturnReason}
            </b>

            {accountantReturnComment && (

              <p className="taskReturnNoticeComment">
                «{accountantReturnComment}»
              </p>

            )}

            <em>
              Открыть и исправить →
            </em>

          </div>

        )}


        `;

renderTask =
  renderTask.slice(
    0,
    noticeCommentStart
  ) +
  newNotice +
  renderTask.slice(
    taskStateIndex
  );

app =
  app.slice(
    0,
    fnStart
  ) +
  renderTask +
  app.slice(
    fnEnd
  );

/* ==========================================================
   3. MANAGER REPAIR — ОТДЕЛЬНЫЙ БЛОК ПРИЧИНЫ И КОММЕНТАРИЯ
   ========================================================== */

const repairStart =
  repair.indexOf(
    'export function InvoiceRequestManagerRepair({'
  );

if (repairStart < 0) {
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
    repairStart
  );

if (requestModeIndex < 0) {
  fail(
    'InvoiceRequestTaskPanel.tsx: не найден requestMode.'
  );
}

const repairData =
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
  repair.slice(
    0,
    requestModeIndex
  ) +
  repairData +
  repair.slice(
    requestModeIndex
  );

const genericNoticeRegex =
  /      <div className="invoiceTaskRepairNotice">\s*Ниже тот же набор полей,\s*который получил бухгалтер\.\s*Исправьте нужное и повторно\s*отправьте эту же задачу\.\s*<\/div>/m;

const genericMatches =
  [...repair.matchAll(
    new RegExp(
      genericNoticeRegex.source,
      'gm'
    )
  )];

if (
  genericMatches.length !== 1
) {
  console.log(
    'InvoiceRequestTaskPanel: generic notice найдено: ' +
    genericMatches.length
  );

  fail(
    'InvoiceRequestTaskPanel.tsx: не удалось безопасно заменить старое уведомление.'
  );
}

const managerCard =
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
    genericNoticeRegex,
    managerCard
  );

/* ==========================================================
   4. CSS
   ========================================================== */

styles =
  styles.replace(
    /\s*$/,
    ''
  ) +
`

/* ${marker} */
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
  margin: 0 0 14px;
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

/* ==========================================================
   FINAL CHECK
   ========================================================== */

const checks = [
  [
    backend.includes(
      'INVOICE_REQUEST_RETURNED'
    ) &&
    backend.includes(
      'auditEvents:'
    ),
    'backend auditEvents'
  ],
  [
    app.includes(
      'accountantReturnReason'
    ),
    'список: причина'
  ],
  [
    app.includes(
      'accountantReturnComment'
    ),
    'список: комментарий'
  ],
  [
    app.includes(
      'Вернул бухгалтер'
    ),
    'список: заголовок'
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
    'CSS'
  ],
];

console.log('');
console.log(
  'v064-O1.5 v2 — причина и комментарий бухгалтера'
);
console.log(
  '=============================================='
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

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

const stamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    );

const writes = [
  [
    paths.backend,
    original.backend,
    backend,
  ],
  [
    paths.app,
    original.app,
    app,
  ],
  [
    paths.repair,
    original.repair,
    repair,
  ],
  [
    paths.styles,
    original.styles,
    styles,
  ],
];

for (
  const [file]
  of writes
) {
  const backup =
    file +
    '.before-v064-o15-v2-' +
    stamp;

  fs.copyFileSync(
    file,
    backup
  );

  console.log(
    'Backup: ' +
    path.relative(
      root,
      backup
    )
  );
}

for (
  const [
    file,
    oldFile,
    next,
  ]
  of writes
) {
  fs.writeFileSync(
    file,
    oldFile.crlf
      ? next.replace(
          /\n/g,
          '\r\n'
        )
      : next,
    'utf8'
  );
}

console.log('');
console.log(
  'v064-O1.5 v2 применён.'
);
