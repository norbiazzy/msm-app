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
  'PART_V064_O15_V3_ACCOUNTANT_RETURN_MESSAGE';

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

const backendFile =
  readFile(paths.backend);
const appFile =
  readFile(paths.app);
const repairFile =
  readFile(paths.repair);
const stylesFile =
  readFile(paths.styles);

let app = appFile.text;
let repair = repairFile.text;
let styles = stylesFile.text;

if (
  app.includes(marker) ||
  repair.includes(marker) ||
  styles.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.5 v3 уже установлен.'
  );
  process.exit(0);
}

/* ==========================================================
   BACKEND — НИЧЕГО НЕ МЕНЯЕМ.
   Живой аудит показал, что list() уже отдаёт auditEvents:
   TASK_RETURNED_TO_MANAGER + INVOICE_REQUEST_RETURNED.
   ========================================================== */

const backend = backendFile.text;

const backendReady =
  backend.includes(
    'PART_1N_RETURN_AUDIT_EVENTS'
  ) &&
  backend.includes(
    "'TASK_RETURNED_TO_MANAGER'"
  ) &&
  backend.includes(
    "'INVOICE_REQUEST_RETURNED'"
  ) &&
  backend.includes(
    'auditEvents:'
  );

if (!backendReady) {
  fail(
    'backend: ожидаемые auditEvents возврата не найдены. Ничего не изменено.'
  );
}

/* ==========================================================
   APP.TSX — точная текущая структура renderTask()
   ========================================================== */

const oldReturnText =
`    const returnText =
      task.status === 'NEED_DATA'
        ? String(
            task.payload?.returnComment ||
            task.payload?.returnReason ||
            task.description ||
            ''
          )
        : '';
`;

if (
  app.split(oldReturnText).length - 1 !== 1
) {
  fail(
    'frontend/App.tsx: текущий блок returnText не совпал. Ничего не изменено.'
  );
}

const newReturnData =
`    // ${marker}
    const accountantReturnEvent =
      task.deal.auditEvents?.find(
        (event) =>
          event.entityId === task.id &&
          (
            event.action ===
              'INVOICE_REQUEST_RETURNED' ||
            event.action ===
              'TASK_RETURNED_TO_MANAGER'
          )
      );

    const accountantReturnReason =
      task.status === 'NEED_DATA'
        ? String(
            accountantReturnEvent
              ?.newValue
              ?.reasonLabel ||
            task.payload?.returnReason ||
            'Бухгалтер вернул задачу на исправление'
          )
        : '';

    const accountantReturnComment =
      task.status === 'NEED_DATA'
        ? String(
            accountantReturnEvent?.reason ||
            task.payload?.returnComment ||
            ''
          )
        : '';
`;

app =
  app.replace(
    oldReturnText,
    newReturnData
  );

const oldListNotice =
`        {task.status === 'NEED_DATA' && (
          <div className="taskReturnNotice">
            <strong>
              Вернул бухгалтер
            </strong>

            {returnText && (
              <span>
                {returnText}
              </span>
            )}

            <em>
              Открыть и исправить →
            </em>
          </div>
        )}`;

if (
  app.split(oldListNotice).length - 1 !== 1
) {
  fail(
    'frontend/App.tsx: текущий taskReturnNotice не совпал. Ничего не изменено.'
  );
}

const newListNotice =
`        {task.status === 'NEED_DATA' && (
          <div className="taskReturnNotice taskReturnNoticeV3">

            <div className="taskReturnNoticeTop">
              <span className="taskReturnNoticeIcon">
                !
              </span>

              <strong>
                Вернул бухгалтер
              </strong>
            </div>

            <div className="taskReturnNoticeField">
              <span>
                Причина возврата
              </span>

              <b>
                {accountantReturnReason}
              </b>
            </div>

            {accountantReturnComment && (
              <div className="taskReturnNoticeField taskReturnNoticeCommentField">
                <span>
                  Комментарий бухгалтера
                </span>

                <p>
                  {accountantReturnComment}
                </p>
              </div>
            )}

            <em>
              Открыть и исправить →
            </em>
          </div>
        )}`;

app =
  app.replace(
    oldListNotice,
    newListNotice
  );

/* ==========================================================
   InvoiceRequestManagerRepair — точная текущая структура
   ========================================================== */

const repairAnchor =
`  const [
    requestMode,`;

if (
  repair.split(repairAnchor).length - 1 !== 1
) {
  fail(
    'InvoiceRequestTaskPanel.tsx: requestMode-якорь не найден однозначно.'
  );
}

const repairData =
`  // ${marker}
  const accountantReturnEvent =
    task.deal.auditEvents?.find(
      (event) =>
        event.entityId === task.id &&
        (
          event.action ===
            'INVOICE_REQUEST_RETURNED' ||
          event.action ===
            'TASK_RETURNED_TO_MANAGER'
        )
    );

  const accountantReturnReason =
    String(
      accountantReturnEvent
        ?.newValue
        ?.reasonLabel ||
      task.payload?.returnReason ||
      'Бухгалтер вернул задачу на исправление'
    );

  const accountantReturnComment =
    String(
      accountantReturnEvent?.reason ||
      task.payload?.returnComment ||
      ''
    );


`;

repair =
  repair.replace(
    repairAnchor,
    repairData + repairAnchor
  );

const oldRepairNotice =
`      <div className="invoiceTaskRepairNotice">
        Ниже тот же набор полей,
        который получил бухгалтер.
        Исправьте нужное и повторно
        отправьте эту же задачу.
      </div>`;

if (
  repair.split(oldRepairNotice).length - 1 !== 1
) {
  fail(
    'InvoiceRequestTaskPanel.tsx: текущий invoiceTaskRepairNotice не совпал.'
  );
}

const newRepairNotice =
`      <div className="invoiceManagerReturnCard">

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
    oldRepairNotice,
    newRepairNotice
  );

/* ==========================================================
   CSS
   ========================================================== */

styles =
  styles.replace(
    /\s*$/,
    ''
  ) +
`

/* ${marker}
   Возврат от бухгалтерии:
   отдельно причина и комментарий.
*/
.taskReturnNoticeV3 {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 12px 13px;
  border: 1px solid
    rgba(220, 120, 106, .30);
  border-left: 4px solid
    #dc786a;
  border-radius: 10px;
  background:
    rgba(220, 120, 106, .07);
  text-align: left;
}

.taskReturnNoticeTop,
.invoiceManagerReturnHead {
  display: flex;
  align-items: center;
  gap: 9px;
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

.taskReturnNoticeTop strong,
.invoiceManagerReturnHead strong {
  color: #ef8a7b;
}

.taskReturnNoticeField,
.invoiceManagerReturnField {
  display: grid;
  gap: 4px;
}

.taskReturnNoticeField > span,
.invoiceManagerReturnField > span {
  color: var(--bo-muted, #9da9b5);
  font-size: 11px;
  font-weight: 700;
}

.taskReturnNoticeField > b,
.invoiceManagerReturnField > b {
  color: var(--bo-text, #f3f5f7);
  font-size: 14px;
  line-height: 1.4;
}

.taskReturnNoticeCommentField,
.invoiceManagerReturnComment {
  padding-top: 9px;
  border-top: 1px solid
    rgba(255, 255, 255, .08);
}

.taskReturnNoticeCommentField p,
.invoiceManagerReturnComment p {
  margin: 0;
  color: var(--bo-text, #f3f5f7);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.taskReturnNoticeV3 em {
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
    rgba(220, 120, 106, .30);
  border-left: 4px solid
    #dc786a;
  border-radius: 11px;
  background:
    rgba(220, 120, 106, .07);
}

.invoiceManagerReturnHead > div {
  display: grid;
  gap: 2px;
}

.invoiceManagerReturnHead strong {
  font-size: 15px;
}

.invoiceManagerReturnHead small {
  color: var(--bo-muted, #9da9b5);
  font-size: 12px;
}

.invoiceManagerReturnField > b {
  font-size: 15px;
}

.invoiceManagerReturnComment p {
  font-size: 14px;
}

@media (max-width: 640px) {
  .taskReturnNoticeV3 {
    padding: 11px;
  }

  .invoiceManagerReturnCard {
    padding: 13px;
  }
}
/* END_${marker} */
`;

/* ==========================================================
   PRE-WRITE CHECKS
   ========================================================== */

const checks = [
  [
    backendReady,
    'backend уже отдаёт auditEvents'
  ],
  [
    app.includes(
      'accountantReturnEvent'
    ),
    'список: найден возврат задачи'
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
    repair.includes(
      'Бухгалтер вернул задачу'
    ),
    'задача: заголовок'
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
  'v064-O1.5 v3 — причина и комментарий бухгалтера'
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

console.log('');
console.log(
  'Backend уже готов — его не меняем.'
);
console.log(
  'Меняются только 3 frontend-файла.'
);

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

/* ==========================================================
   BACKUP + WRITE
   ========================================================== */

const stamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    );

const writes = [
  [
    paths.app,
    appFile,
    app,
  ],
  [
    paths.repair,
    repairFile,
    repair,
  ],
  [
    paths.styles,
    stylesFile,
    styles,
  ],
];

for (
  const [file]
  of writes
) {
  const backup =
    file +
    '.before-v064-o15-v3-' +
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
    original,
    next,
  ]
  of writes
) {
  fs.writeFileSync(
    file,
    original.crlf
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
  'v064-O1.5 v3 применён.'
);
console.log(
  'Backend не изменён.'
);
