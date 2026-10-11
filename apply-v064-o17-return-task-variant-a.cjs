const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const stylesPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

const marker =
  'PART_V064_O17_RETURN_TASK_VARIANT_A';

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
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
    fs.readFileSync(file, 'utf8');

  return {
    raw,
    crlf:
      raw.includes('\r\n'),
    text:
      raw.replace(/\r\n/g, '\n'),
  };
}

const appFile = readFile(appPath);
const stylesFile = readFile(stylesPath);

let app = appFile.text;
let styles = stylesFile.text;

if (
  app.includes(marker) ||
  styles.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.7 уже установлен.'
  );
  process.exit(0);
}

if (
  !app.includes(
    'PART_V064_O15_V3_ACCOUNTANT_RETURN_MESSAGE'
  )
) {
  fail(
    'App.tsx не содержит O1.5 v3. Ничего не изменено.'
  );
}

if (
  !styles.includes(
    'PART_V064_O16_RETURN_NOTICE_POLISH'
  )
) {
  fail(
    'styles.css не содержит O1.6. Ничего не изменено.'
  );
}

const oldBlock =
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

const oldCount =
  app.split(oldBlock).length - 1;

if (oldCount !== 1) {
  fail(
    'Ожидался 1 текущий блок возврата, найдено: ' +
    oldCount
  );
}

const newBlock =
`        {/* ${marker} */}
        {task.status === 'NEED_DATA' && (
          <div className="taskReturnNotice taskReturnNoticeV4">

            <div className="taskReturnNoticeTop">
              <span className="taskReturnNoticeIcon">
                ↩
              </span>

              <strong>
                Вернул бухгалтер
              </strong>
            </div>

            <b className="taskReturnReasonText">
              {accountantReturnReason}
            </b>

            {accountantReturnComment && (
              <p className="taskReturnCommentText">
                {accountantReturnComment}
              </p>
            )}

          </div>
        )}`;

app = app.replace(
  oldBlock,
  newBlock
);

styles =
  styles.replace(
    /\s*$/,
    ''
  ) +
`

/* ${marker}
   Вариант A:
   возврат — нижняя часть самой карточки задачи.
   Вся карточка уже кликабельна, отдельной ссылки нет.
*/

.boView-tasks
.taskCard.taskCardStatus-need-data {
  display: grid !important;
  grid-template-columns:
    minmax(0, 1fr)
    auto !important;
  align-items: start !important;
  column-gap: 14px !important;
  row-gap: 10px !important;
}

.boView-tasks
.taskCard.taskCardStatus-need-data
.taskCardMain {
  grid-column: 1 !important;
  grid-row: 1 !important;
  min-width: 0 !important;
}

.boView-tasks
.taskCard.taskCardStatus-need-data
.taskState {
  grid-column: 2 !important;
  grid-row: 1 !important;
  align-self: start !important;
  justify-self: end !important;
}

.boView-tasks
.taskCard.taskCardStatus-need-data
.taskReturnNoticeV4 {
  grid-column: 1 / -1 !important;
  grid-row: 2 !important;

  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 5px !important;

  width: 100% !important;
  min-width: 0 !important;

  margin: 2px 0 0 !important;
  padding: 11px 0 0 !important;

  border: 0 !important;
  border-top: 1px solid
    rgba(255, 255, 255, .09) !important;
  border-radius: 0 !important;

  background: transparent !important;
  box-shadow: none !important;

  text-align: left !important;
}

.boView-tasks
.taskCard.taskCardStatus-need-data
.taskReturnNoticeV4::before,
.boView-tasks
.taskCard.taskCardStatus-need-data
.taskReturnNoticeV4::after {
  content: none !important;
  display: none !important;
}

.boView-tasks
.taskReturnNoticeV4
.taskReturnNoticeTop {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;

  min-height: 22px !important;
  margin: 0 0 3px !important;
  padding: 0 !important;

  border: 0 !important;
}

.boView-tasks
.taskReturnNoticeV4
.taskReturnNoticeIcon {
  display: inline-grid !important;
  width: 20px !important;
  height: 20px !important;
  flex: 0 0 20px !important;
  place-items: center !important;

  margin: 0 !important;
  padding: 0 !important;

  border: 0 !important;
  border-radius: 5px !important;

  background:
    rgba(220, 120, 106, .12) !important;
  color: #ef8172 !important;

  font-size: 12px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}

.boView-tasks
.taskReturnNoticeV4
.taskReturnNoticeTop strong {
  margin: 0 !important;
  padding: 0 !important;

  color: #ef8172 !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  line-height: 1.25 !important;
}

.boView-tasks
.taskReturnNoticeV4
.taskReturnReasonText {
  display: block !important;
  margin: 0 !important;

  color: var(--bo-text, #f2f4f6) !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  line-height: 1.35 !important;
}

.boView-tasks
.taskReturnNoticeV4
.taskReturnCommentText {
  margin: 0 !important;

  color: #b6c0ca !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  line-height: 1.45 !important;

  white-space: pre-wrap !important;
}

@media (max-width: 640px) {
  .boView-tasks
  .taskCard.taskCardStatus-need-data {
    column-gap: 9px !important;
    row-gap: 9px !important;
  }

  .boView-tasks
  .taskCard.taskCardStatus-need-data
  .taskReturnNoticeV4 {
    padding-top: 10px !important;
  }

  .boView-tasks
  .taskReturnNoticeV4
  .taskReturnCommentText {
    font-size: 12px !important;
  }
}
/* END_${marker} */
`;

const checks = [
  [
    app.includes(marker),
    'вариант A добавлен'
  ],
  [
    app.includes(
      'taskReturnNoticeV4'
    ),
    'новый компактный блок'
  ],
  [
    app.includes('↩'),
    'иконка возврата'
  ],
  [
    !app.includes(
      'Открыть и исправить →'
    ),
    'лишняя ссылка убрана'
  ],
  [
    styles.includes(
      '.taskCard.taskCardStatus-need-data'
    ),
    'карточка NEED_DATA пересобрана'
  ],
  [
    styles.includes(
      'grid-column: 1 / -1 !important'
    ),
    'возврат занимает низ карточки'
  ],
];

console.log('');
console.log(
  'v064-O1.7 — возврат внутри карточки'
);
console.log(
  '================================='
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
  'Меняются только App.tsx и styles.css.'
);
console.log(
  'Backend и данные не меняются.'
);

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
    .replace(/[:.]/g, '-');

for (const file of [
  appPath,
  stylesPath,
]) {
  const backup =
    file +
    '.before-v064-o17-' +
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

fs.writeFileSync(
  appPath,
  appFile.crlf
    ? app.replace(/\n/g, '\r\n')
    : app,
  'utf8'
);

fs.writeFileSync(
  stylesPath,
  stylesFile.crlf
    ? styles.replace(/\n/g, '\r\n')
    : styles,
  'utf8'
);

console.log('');
console.log(
  'v064-O1.7 применён.'
);
