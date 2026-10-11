const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const paths = {
  app: path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  ),
  uploads: path.join(
    root,
    'frontend',
    'src',
    'backgroundUploads.tsx'
  ),
  poa: path.join(
    root,
    'frontend',
    'src',
    'PowerOfAttorneyBlock.tsx'
  ),
  styles: path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  ),
};

const marker =
  'PART_V064_O19_UNIFIED_UPLOAD_UX';

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

function replaceOnce(
  text,
  before,
  after,
  label,
) {
  const count =
    text.split(before).length - 1;

  if (count !== 1) {
    fail(
      label +
      ': ожидался 1 якорь, найдено ' +
      count
    );
  }

  return text.replace(
    before,
    after
  );
}

const appFile =
  readFile(paths.app);

const uploadsFile =
  readFile(paths.uploads);

const poaFile =
  readFile(paths.poa);

const stylesFile =
  readFile(paths.styles);

let app =
  appFile.text;

let uploads =
  uploadsFile.text;

let poa =
  poaFile.text;

let styles =
  stylesFile.text;

if (
  app.includes(marker) ||
  uploads.includes(marker) ||
  styles.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.9 уже установлен.'
  );
  process.exit(0);
}

/* ==========================================================
   1. backgroundUploads.tsx
   Автоматически понимаем, ОТКУДА отправлен файл:
   #tasks/... => TASK
   #deal/... / #new => DEAL

   Одновременно автоматически подхватываем taskId/dealId
   из route, если конкретный вызов их не передал.
   ========================================================== */

const typeTaskId =
`  taskId?: string;

  dealId?: string;`;

if (
  !uploads.includes(
    "scope?: 'TASK' | 'DEAL';"
  )
) {
  uploads =
    replaceOnce(
      uploads,
      typeTaskId,
`  taskId?: string;

  dealId?: string;

  // ${marker}
  scope?: 'TASK' | 'DEAL';`,
      'backgroundUploads type'
    );
}

/* В options startBackgroundUploadJob есть такой же taskId/dealId. */
const optionTaskIdMatches =
  uploads.match(
    /    taskId\?: string;\n(?:\n    dealId\?: string;)?/g
  ) || [];

if (
  !uploads.includes(
    "    scope?: 'TASK' | 'DEAL';"
  )
) {
  /* Ищем именно options внутри startBackgroundUploadJob. */
  const fnIndex =
    uploads.indexOf(
      'export function startBackgroundUploadJob('
    );

  if (fnIndex < 0) {
    fail(
      'backgroundUploads: startBackgroundUploadJob не найден.'
    );
  }

  const filesIndex =
    uploads.indexOf(
      '    files: File[];',
      fnIndex
    );

  if (filesIndex < 0) {
    fail(
      'backgroundUploads: options.files не найден.'
    );
  }

  uploads =
    uploads.slice(
      0,
      filesIndex
    ) +
`    // ${marker}
    scope?: 'TASK' | 'DEAL';

` +
    uploads.slice(
      filesIndex
    );
}

const fnIndex =
  uploads.indexOf(
    'export function startBackgroundUploadJob('
  );

const totalFilesIndex =
  uploads.indexOf(
    '  const totalFiles =',
    fnIndex
  );

if (
  fnIndex < 0 ||
  totalFilesIndex < 0
) {
  fail(
    'backgroundUploads: не найдено начало job.'
  );
}

if (
  !uploads.includes(
    'const inferredUploadScope ='
  )
) {
  const routeLogic =
`  // ${marker}
  const uploadRoute =
    window.location.hash
      .replace(/^#/, '');

  const inferredUploadScope:
    'TASK' | 'DEAL' =
      options.scope ||
      (
        uploadRoute.startsWith(
          'tasks'
        )
          ? 'TASK'
          : 'DEAL'
      );

  const inferredTaskId =
    options.taskId ||
    (
      inferredUploadScope === 'TASK' &&
      uploadRoute.startsWith(
        'tasks/'
      )
        ? decodeURIComponent(
            uploadRoute.slice(
              'tasks/'.length
            )
          )
        : undefined
    );

  const inferredDealId =
    options.dealId ||
    (
      inferredUploadScope === 'DEAL' &&
      uploadRoute.startsWith(
        'deal/'
      )
        ? decodeURIComponent(
            uploadRoute.slice(
              'deal/'.length
            )
          )
        : undefined
    );


`;

  uploads =
    uploads.slice(
      0,
      totalFilesIndex
    ) +
    routeLogic +
    uploads.slice(
      totalFilesIndex
    );
}

/* Job object: используем inferred ids и scope. */
uploads =
  uploads.replace(
    /      taskId:\s*\n\s*options\.taskId,/,
`      taskId:
        inferredTaskId,

      dealId:
        inferredDealId,

      scope:
        inferredUploadScope,`
  );

/* Если dealId уже был сразу после taskId, убираем дубль. */
uploads =
  uploads.replace(
    /\n\s*dealId:\s*\n\s*options\.dealId,\n(?=\s*\n\s*(?:successTitle|title):)/,
    '\n'
  );

/* Если taskId вообще отсутствовал в объекте (редкая версия) —
   вставляем перед title. */
const jobAreaStart =
  uploads.indexOf(
    '  jobs = [',
    fnIndex
  );

const jobAreaEnd =
  uploads.indexOf(
    '  emit();',
    jobAreaStart
  );

if (
  jobAreaStart < 0 ||
  jobAreaEnd < 0
) {
  fail(
    'backgroundUploads: не найден job object.'
  );
}

let jobArea =
  uploads.slice(
    jobAreaStart,
    jobAreaEnd
  );

if (
  !jobArea.includes(
    'scope:\n        inferredUploadScope'
  )
) {
  const titleAnchor =
`      title:
        options.title,`;

  if (
    !jobArea.includes(
      titleAnchor
    )
  ) {
    fail(
      'backgroundUploads: не удалось добавить scope в job.'
    );
  }

  jobArea =
    jobArea.replace(
      titleAnchor,
`      taskId:
        inferredTaskId,

      dealId:
        inferredDealId,

      scope:
        inferredUploadScope,

${titleAnchor}`
    );

  uploads =
    uploads.slice(
      0,
      jobAreaStart
    ) +
    jobArea +
    uploads.slice(
      jobAreaEnd
    );
}

/* После emit при старте task-upload сразу возвращаем в список задач. */
const startEmitIndex =
  uploads.indexOf(
    '  emit();',
    jobAreaStart
  );

if (startEmitIndex < 0) {
  fail(
    'backgroundUploads: emit старта не найден.'
  );
}

const afterEmit =
  startEmitIndex +
  '  emit();'.length;

if (
  !uploads.slice(
    afterEmit,
    afterEmit + 500
  ).includes(
    "window.location.hash = '#tasks';"
  )
) {
  uploads =
    uploads.slice(
      0,
      afterEmit
    ) +
`

  // ${marker}
  if (
    inferredUploadScope === 'TASK' &&
    uploadRoute.startsWith(
      'tasks/'
    )
  ) {
    window.location.hash =
      '#tasks';
  }
` +
    uploads.slice(
      afterEmit
    );
}

/* ==========================================================
   2. App.tsx — список сделок:
   на карточке показываем только upload, начатый ИЗ СДЕЛКИ.
   ========================================================== */

app =
  app.replace(
`                  backgroundUploads.find(
                    (job) =>
                      job.dealId === deal.id
                  )`,
`                  backgroundUploads.find(
                    (job) =>
                      job.dealId === deal.id &&
                      (
                        !job.scope ||
                        job.scope === 'DEAL'
                      )
                  )`
  );

/* Внутри сделки — тот же job, что и на карточке сделки. */
app =
  app.replace(
`    backgroundUploads.find(
      (job) =>
        job.dealId === dealId
    );`,
`    backgroundUploads.find(
      (job) =>
        job.dealId === dealId &&
        (
          !job.scope ||
          job.scope === 'DEAL'
        )
    );`
  );

/* ==========================================================
   3. App.tsx — задачи:
   progress только job, начатого ИЗ ЗАДАЧИ.
   Если O1.8 уже стоит — уточняем фильтр.
   Если не стоит — добавляем inline progress.
   ========================================================== */

const tasksStart =
  app.indexOf(
    'function TasksView('
  );

if (tasksStart < 0) {
  fail(
    'App.tsx: TasksView не найден.'
  );
}

const renderStart =
  app.indexOf(
    '  function renderTask(',
    tasksStart
  );

const renderEnd =
  app.indexOf(
    '\n  function renderGroup(',
    renderStart
  );

if (
  renderStart < 0 ||
  renderEnd < 0
) {
  fail(
    'App.tsx: renderTask не найден.'
  );
}

let renderTask =
  app.slice(
    renderStart,
    renderEnd
  );

if (
  renderTask.includes(
    'const taskUploadJob ='
  )
) {
  renderTask =
    renderTask.replace(
      /const taskUploadJob =\s*backgroundUploads\.find\(\s*\(job\) =>\s*job\.taskId === task\.id\s*\);/m,
`const taskUploadJob =
      backgroundUploads.find(
        (job) =>
          job.taskId === task.id &&
          (
            !job.scope ||
            job.scope === 'TASK'
          )
      );`
    );
} else {
  const mainReturn =
    renderTask.lastIndexOf(
      '\n    return ('
    );

  if (mainReturn < 0) {
    fail(
      'App.tsx: основной return renderTask не найден.'
    );
  }

  const taskJob =
`
    // ${marker}
    const taskUploadJob =
      backgroundUploads.find(
        (job) =>
          job.taskId === task.id &&
          (
            !job.scope ||
            job.scope === 'TASK'
          )
      );

`;

  renderTask =
    renderTask.slice(
      0,
      mainReturn
    ) +
    taskJob +
    renderTask.slice(
      mainReturn
    );
}

if (
  !renderTask.includes(
    'taskUploadInline'
  )
) {
  const buttonClose =
    renderTask.lastIndexOf(
      '\n      </button>'
    );

  if (buttonClose < 0) {
    fail(
      'App.tsx: конец taskCard не найден.'
    );
  }

  const taskProgress =
`

        {taskUploadJob && (
          <div
            className={
              'taskUploadInline taskUpload-' +
              taskUploadJob.status.toLowerCase()
            }
          >
            <div className="taskUploadTop">
              <strong>
                {
                  taskUploadJob.status === 'SUCCESS'
                    ? '✓ ' +
                      (
                        taskUploadJob.successTitle ||
                        taskUploadJob.title
                      )
                    : taskUploadJob.status === 'ERROR'
                      ? 'Ошибка загрузки'
                      : '↑ ' + taskUploadJob.title
                }
              </strong>

              <b>
                {taskUploadJob.progress}%
              </b>
            </div>

            <div className="taskUploadBar">
              <div
                style={{
                  width:
                    Math.max(
                      0,
                      Math.min(
                        100,
                        taskUploadJob.progress
                      )
                    ) + '%',
                }}
              />
            </div>

            <div className="taskUploadMeta">
              {
                taskUploadJob.status === 'RUNNING'
                  ? (
                      taskUploadJob.totalFiles > 0
                        ? (
                            taskUploadJob.completedFiles +
                            ' из ' +
                            taskUploadJob.totalFiles +
                            ' файлов'
                          )
                        : 'Сохраняем данные…'
                    )
                  : taskUploadJob.status === 'SUCCESS'
                    ? 'Готово'
                    : (
                        taskUploadJob.error ||
                        'Не удалось загрузить файлы'
                      )
              }

              {
                taskUploadJob.currentFile
                  ? ' · ' +
                    taskUploadJob.currentFile
                  : ''
              }
            </div>
          </div>
        )}
`;

  renderTask =
    renderTask.slice(
      0,
      buttonClose
    ) +
    taskProgress +
    renderTask.slice(
      buttonClose
    );
}

app =
  app.slice(
    0,
    renderStart
  ) +
  renderTask +
  app.slice(
    renderEnd
  );

/* Если O1.8 добавил временную taskUploadGhost для deal-job —
   удаляем: теперь новая доверенность, созданная ИЗ СДЕЛКИ,
   должна показываться в сделке/списке сделок, а не в задачах. */
app =
  app.replace(
    /\n\s*\{\/\*\s*PART_V064_O18(?:_V2)?_TASK_UPLOAD_PROGRESS\s*— новая задача ещё не создана\s*\*\/\}[\s\S]*?\n\s*\)\}\n(?=\s*\n)/m,
    '\n'
  );

/* Старую отдельную общую панель загрузок в TasksView не используем. */
const taskViewSegmentEnd =
  app.indexOf(
    '\nfunction ',
    tasksStart + 20
  );

const actualTaskEnd =
  taskViewSegmentEnd > tasksStart
    ? taskViewSegmentEnd
    : app.length;

let tasksSegment =
  app.slice(
    tasksStart,
    actualTaskEnd
  );

tasksSegment =
  tasksSegment.replace(
    /\n\s*<BackgroundUploadList\s*\n?\s*jobs=\{backgroundUploads\}\s*\/>\n/m,
    '\n'
  );

app =
  app.slice(
    0,
    tasksStart
  ) +
  tasksSegment +
  app.slice(
    actualTaskEnd
  );

/* ==========================================================
   4. Подтверждение оплаты клиента:
   единственная найденная прямая uploadDealFile без progress.
   Переводим на общий background job DEAL.
   ========================================================== */

const paymentFnStart =
  app.indexOf(
    '  async function addPayment() {'
  );

if (paymentFnStart < 0) {
  fail(
    'App.tsx: PaymentBlock.addPayment не найден.'
  );
}

const paymentFnEnd =
  app.indexOf(
    '\n  return <div className="paymentBox">',
    paymentFnStart
  );

if (paymentFnEnd < 0) {
  fail(
    'App.tsx: конец PaymentBlock.addPayment не найден.'
  );
}

const oldPaymentFn =
  app.slice(
    paymentFnStart,
    paymentFnEnd
  );

if (
  !oldPaymentFn.includes(
    "uploadDealFile(deal.id, file, 'CLIENT_PAYMENT')"
  ) &&
  !oldPaymentFn.includes(
    "startBackgroundUploadJob({"
  )
) {
  fail(
    'App.tsx: текущая логика подтверждения оплаты неизвестна.'
  );
}

if (
  oldPaymentFn.includes(
    "uploadDealFile(deal.id, file, 'CLIENT_PAYMENT')"
  )
) {
  const newPaymentFn =
`  async function addPayment() {
    setError('');

    const amountToSave =
      parseMoneyInput(amount) || 0;

    const paidAtToSave =
      paidAt;

    const methodToSave =
      method;

    const commentToSave =
      comment.trim() ||
      undefined;

    const fileToUpload =
      file;

    if (fileToUpload) {
      startBackgroundUploadJob({
        dealId: deal.id,
        scope: 'DEAL',
        title:
          'Загружаем подтверждение оплаты',
        successTitle:
          'Оплата клиента сохранена',
        subtitle:
          deal.clientName,
        files: [fileToUpload],

        run: async ({
          upload,
          setProgress,
        }) => {
          const uploaded =
            await upload(
              deal.id,
              fileToUpload,
              'CLIENT_PAYMENT',
              0,
              1,
            );

          setProgress(94);

          await addClientPayment(
            deal.id,
            {
              amount:
                amountToSave,
              paidAt:
                paidAtToSave,
              method:
                methodToSave,
              comment:
                commentToSave,
              actorId:
                user.id,
              fileId:
                uploaded.id,
            }
          );

          setProgress(99);
          await onChanged();
        },
      });

      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      return;
    }

    setSaving(true);

    try {
      await addClientPayment(
        deal.id,
        {
          amount:
            amountToSave,
          paidAt:
            paidAtToSave,
          method:
            methodToSave,
          comment:
            commentToSave,
          actorId:
            user.id,
        }
      );

      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      await onChanged();

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {
      setSaving(false);
    }
  }
`;

  app =
    app.slice(
      0,
      paymentFnStart
    ) +
    newPaymentFn +
    app.slice(
      paymentFnEnd
    );
}

/* ==========================================================
   5. Если O1.8 принудительно уводил новую доверенность
   из сделки в задачи — убираем.
   Теперь scope определяется по экрану, откуда отправили.
   ========================================================== */

poa =
  poa.replace(
    /\n\s*\/\/ PART_V064_O18(?:_V2)?_TASK_UPLOAD_PROGRESS\s*\n\s*window\.location\.hash\s*=\s*\n?\s*'#tasks';\s*\n/m,
    '\n'
  );

/* ==========================================================
   6. Внутри сделки показываем progress заметно сверху.
   Существующий invoiceRequestUploadJob уже является job DEAL.
   ========================================================== */

const dealReturnAnchor =
`    <section className="content form">

      <button
        className="backLink"
        onClick={onBack}
      >
        ← К сделкам
      </button>`;

if (
  app.includes(
    dealReturnAnchor
  ) &&
  !app.includes(
    'dealPageUploadProgress'
  )
) {
  app =
    replaceOnce(
      app,
      dealReturnAnchor,
`${dealReturnAnchor}

      {invoiceRequestUploadJob && (
        <div
          className={
            'dealPageUploadProgress taskUpload-' +
            invoiceRequestUploadJob.status.toLowerCase()
          }
        >
          <div className="taskUploadTop">
            <strong>
              {
                invoiceRequestUploadJob.status === 'SUCCESS'
                  ? '✓ ' +
                    (
                      invoiceRequestUploadJob.successTitle ||
                      invoiceRequestUploadJob.title
                    )
                  : invoiceRequestUploadJob.status === 'ERROR'
                    ? 'Ошибка загрузки'
                    : '↑ ' +
                      invoiceRequestUploadJob.title
              }
            </strong>

            <b>
              {invoiceRequestUploadJob.progress}%
            </b>
          </div>

          <div className="taskUploadBar">
            <div
              style={{
                width:
                  Math.max(
                    0,
                    Math.min(
                      100,
                      invoiceRequestUploadJob.progress
                    )
                  ) + '%',
              }}
            />
          </div>

          <div className="taskUploadMeta">
            {
              invoiceRequestUploadJob.status === 'RUNNING'
                ? (
                    invoiceRequestUploadJob.totalFiles > 0
                      ? (
                          invoiceRequestUploadJob.completedFiles +
                          ' из ' +
                          invoiceRequestUploadJob.totalFiles +
                          ' файлов'
                        )
                      : 'Сохраняем данные…'
                  )
                : invoiceRequestUploadJob.status === 'SUCCESS'
                  ? 'Готово'
                  : (
                      invoiceRequestUploadJob.error ||
                      'Не удалось загрузить файлы'
                    )
            }

            {
              invoiceRequestUploadJob.currentFile
                ? ' · ' +
                  invoiceRequestUploadJob.currentFile
                : ''
            }
          </div>
        </div>
      )}`,
      'App.tsx deal page progress'
    );
}

/* ==========================================================
   7. CSS
   ========================================================== */

styles =
  styles.replace(
    /\s*$/,
    ''
  ) +
`

/* ${marker}
   Единый UX загрузок:
   TASK -> карточка задачи
   DEAL -> внутри сделки + карточка сделки
*/

.taskUploadInline,
.dealPageUploadProgress {
  display: grid;
  gap: 7px;
  width: 100%;
  text-align: left;
}

.taskUploadInline {
  grid-column: 1 / -1;
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid
    rgba(255, 255, 255, .08);
}

.dealPageUploadProgress {
  margin: 0 0 13px;
  padding: 12px 14px;
  border: 1px solid
    rgba(118, 154, 188, .26);
  border-radius: 10px;
  background:
    rgba(118, 154, 188, .07);
}

.taskUploadTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.taskUploadTop strong {
  color: var(--bo-text, #f3f5f7);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.taskUploadTop > b {
  flex: 0 0 auto;
  color: #9db5cc;
  font-size: 12px;
  font-weight: 800;
}

.taskUploadBar {
  overflow: hidden;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, .08);
}

.taskUploadBar > div {
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  color: #84a8c8;
  transition:
    width .18s ease;
}

.taskUploadMeta {
  overflow: hidden;
  color: var(--bo-muted, #9ca8b4);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskUpload-success
.taskUploadBar > div {
  color: #78a987;
}

.taskUpload-success
.taskUploadTop strong {
  color: #8fbd9b;
}

.taskUpload-error
.taskUploadBar > div {
  color: #d87e70;
}

.taskUpload-error
.taskUploadTop strong {
  color: #ef8b7c;
}

@media (max-width: 640px) {
  .dealPageUploadProgress {
    padding: 11px 12px;
  }

  .taskUploadMeta {
    white-space: normal;
  }
}
/* END_${marker} */
`;

/* ==========================================================
   FINAL CHECKS
   ========================================================== */

const checks = [
  [
    uploads.includes(
      "scope?: 'TASK' | 'DEAL';"
    ),
    'background job знает TASK/DEAL'
  ],
  [
    uploads.includes(
      'const inferredUploadScope'
    ),
    'scope определяется по route'
  ],
  [
    uploads.includes(
      'const inferredTaskId'
    ),
    'taskId определяется автоматически'
  ],
  [
    uploads.includes(
      'const inferredDealId'
    ),
    'dealId определяется автоматически'
  ],
  [
    uploads.includes(
      "window.location.hash =\n      '#tasks';"
    ),
    'task upload возвращает в список задач'
  ],
  [
    app.includes(
      'taskUploadInline'
    ),
    'progress на карточке задачи'
  ],
  [
    app.includes(
      'dealPageUploadProgress'
    ),
    'progress внутри сделки'
  ],
  [
    app.includes(
      'dealUploadState'
    ),
    'progress на карточке сделки'
  ],
  [
    !app.includes(
      "uploadDealFile(deal.id, file, 'CLIENT_PAYMENT')"
    ),
    'оплата клиента переведена на progress'
  ],
  [
    app.includes(
      "scope: 'DEAL'"
    ),
    'подтверждение оплаты = DEAL upload'
  ],
  [
    !poa.includes(
      'PART_V064_O18_V2_TASK_UPLOAD_PROGRESS'
    ) ||
    !poa.includes(
      "window.location.hash =\n        '#tasks';"
    ),
    'доверенность из сделки не уводит в задачи'
  ],
];

console.log('');
console.log(
  'v064-O1.9 — единый прогресс документов'
);
console.log(
  '======================================'
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
  'Правило: TASK → Задачи; DEAL → Сделка + список сделок.'
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
  [paths.app, appFile, app],
  [paths.uploads, uploadsFile, uploads],
  [paths.poa, poaFile, poa],
  [paths.styles, stylesFile, styles],
];

for (
  const [file]
  of writes
) {
  const backup =
    file +
    '.before-v064-o19-' +
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
  'v064-O1.9 применён.'
);
