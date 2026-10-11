const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const uploadsPath =
  path.join(
    root,
    'frontend',
    'src',
    'backgroundUploads.tsx'
  );

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  );

const marker =
  'PART_V064_O23_TASK_UPLOAD_PROGRESS';

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

function load(file) {
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
      raw.replace(/\r\n/g, '\n'),
  };
}

function save(
  file,
  source,
  text,
) {
  fs.writeFileSync(
    file,
    source.crlf
      ? text.replace(/\n/g, '\r\n')
      : text,
    'utf8'
  );
}

const A =
  load(appPath);

const U =
  load(uploadsPath);

const S =
  load(stylesPath);

let app =
  A.text;

let uploads =
  U.text;

let styles =
  S.text;

if (
  app.includes(marker) ||
  styles.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O2.3 уже установлен.'
  );
  process.exit(0);
}

/* ==========================================================
   1. backgroundUploads:
   сохраняем ОТКУДА реально стартовал upload.
   Это важно: correction task может иметь taskId,
   но если его отправили из сделки — он DEAL, не TASK.
   ========================================================== */

if (
  !uploads.includes(
    "scope?: 'TASK' | 'DEAL';"
  )
) {
  const typeAnchor =
`  dealId?: string;`;

  const firstType =
    uploads.indexOf(typeAnchor);

  if (firstType < 0) {
    fail(
      'backgroundUploads: dealId в BackgroundUploadJob не найден.'
    );
  }

  uploads =
    uploads.slice(
      0,
      firstType +
      typeAnchor.length
    ) +
`

  // ${marker}
  scope?: 'TASK' | 'DEAL';` +
    uploads.slice(
      firstType +
      typeAnchor.length
    );
}

/* options startBackgroundUploadJob */
const fnStart =
  uploads.indexOf(
    'export function startBackgroundUploadJob('
  );

if (fnStart < 0) {
  fail(
    'backgroundUploads: startBackgroundUploadJob не найден.'
  );
}

const filesAnchor =
  uploads.indexOf(
    '    files: File[];',
    fnStart
  );

if (filesAnchor < 0) {
  fail(
    'backgroundUploads: options.files не найден.'
  );
}

const optionsHead =
  uploads.slice(
    fnStart,
    filesAnchor
  );

if (
  !optionsHead.includes(
    "scope?: 'TASK' | 'DEAL';"
  )
) {
  uploads =
    uploads.slice(
      0,
      filesAnchor
    ) +
`    // ${marker}
    scope?: 'TASK' | 'DEAL';

` +
    uploads.slice(
      filesAnchor
    );
}

/* Infer scope at the moment user clicks send. */
if (
  !uploads.includes(
    'const resolvedUploadScope ='
  ) &&
  !uploads.includes(
    'const inferredUploadScope ='
  )
) {
  const liveFnStart =
    uploads.indexOf(
      'export function startBackgroundUploadJob('
    );

  const totalFiles =
    uploads.indexOf(
      '  const totalFiles =',
      liveFnStart
    );

  if (totalFiles < 0) {
    fail(
      'backgroundUploads: totalFiles не найден.'
    );
  }

  const scopeCode =
`  // ${marker}
  const taskUploadRoute =
    window.location.hash
      .replace(/^#/, '');

  const resolvedUploadScope:
    'TASK' | 'DEAL' =
      options.scope ||
      (
        taskUploadRoute === 'tasks' ||
        taskUploadRoute.startsWith(
          'tasks/'
        )
          ? 'TASK'
          : 'DEAL'
      );


`;

  uploads =
    uploads.slice(
      0,
      totalFiles
    ) +
    scopeCode +
    uploads.slice(
      totalFiles
    );
}

/* Store scope in job object. */
const liveFnStart =
  uploads.indexOf(
    'export function startBackgroundUploadJob('
  );

const jobsStart =
  uploads.indexOf(
    '  jobs = [',
    liveFnStart
  );

const emitStart =
  uploads.indexOf(
    '  emit();',
    jobsStart
  );

if (
  jobsStart < 0 ||
  emitStart < 0
) {
  fail(
    'backgroundUploads: job object не найден.'
  );
}

let jobArea =
  uploads.slice(
    jobsStart,
    emitStart
  );

if (
  !jobArea.includes(
    'scope:'
  )
) {
  const dealIdRegex =
    /(dealId:\s*\n\s*[A-Za-z0-9_.]+,\s*)/;

  if (
    dealIdRegex.test(jobArea)
  ) {
    jobArea =
      jobArea.replace(
        dealIdRegex,
`$1
      scope:
        ${
          uploads.includes(
            'const inferredUploadScope ='
          )
            ? 'inferredUploadScope'
            : 'resolvedUploadScope'
        },
`
      );
  } else {
    const titleAnchor =
`      title:
        options.title,`;

    if (
      !jobArea.includes(
        titleAnchor
      )
    ) {
      fail(
        'backgroundUploads: не удалось вставить scope в job.'
      );
    }

    jobArea =
      jobArea.replace(
        titleAnchor,
`      scope:
        ${
          uploads.includes(
            'const inferredUploadScope ='
          )
            ? 'inferredUploadScope'
            : 'resolvedUploadScope'
        },

${titleAnchor}`
      );
  }

  uploads =
    uploads.slice(
      0,
      jobsStart
    ) +
    jobArea +
    uploads.slice(
      emitStart
    );
}

/* ==========================================================
   2. TasksView.renderTask:
   не скрываем задачу во время upload.
   Находим job этой задачи и рисуем progress в самой карточке.
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
    'App.tsx: renderTask/renderGroup не найдены.'
  );
}

let render =
  app.slice(
    renderStart,
    renderEnd
  );

/* Старый интерфейс мог скрывать карточку во время upload. */
render =
  render.replace(
    /\n\s*const isBackgroundUploading =[\s\S]*?\n\s*if\s*\(\s*isBackgroundUploading\s*\)\s*\{\s*return null;\s*\}\s*/m,
    '\n'
  );

if (
  !render.includes(
    'const taskUploadJob ='
  )
) {
  const mainReturn =
    render.lastIndexOf(
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

  render =
    render.slice(
      0,
      mainReturn
    ) +
    taskJob +
    render.slice(
      mainReturn
    );
} else {
  /* Если job уже добавлялся O1.8 — уточняем origin. */
  render =
    render.replace(
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
}

if (
  !render.includes(
    'taskUploadProgressCard'
  )
) {
  const buttonClose =
    render.lastIndexOf(
      '\n      </button>'
    );

  if (buttonClose < 0) {
    fail(
      'App.tsx: закрытие taskCard не найдено.'
    );
  }

  const progress =
`

        {taskUploadJob && (
          <div
            className={
              'taskUploadProgressCard taskUpload-' +
              taskUploadJob.status.toLowerCase()
            }
          >
            <div className="taskUploadProgressTop">
              <strong>
                {
                  taskUploadJob.status === 'SUCCESS'
                    ? '✓ ' +
                      (
                        taskUploadJob.successTitle ||
                        taskUploadJob.title
                      )
                    : taskUploadJob.status === 'ERROR'
                      ? 'Ошибка отправки'
                      : '↑ ' +
                        taskUploadJob.title
                }
              </strong>

              <b>
                {taskUploadJob.progress}%
              </b>
            </div>

            <div className="taskUploadProgressBar">
              <span
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

            <div className="taskUploadProgressMeta">
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
                        : 'Выполняем отправку…'
                    )
                  : taskUploadJob.status === 'SUCCESS'
                    ? 'Готово'
                    : (
                        taskUploadJob.error ||
                        'Не удалось отправить'
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

  render =
    render.slice(
      0,
      buttonClose
    ) +
    progress +
    render.slice(
      buttonClose
    );
}

app =
  app.slice(
    0,
    renderStart
  ) +
  render +
  app.slice(
    renderEnd
  );

/* Старую общую панель upload в TasksView убираем:
   пользователь должен видеть progress на конкретной задаче. */
const tasksEndCandidate =
  app.indexOf(
    '\nfunction ',
    tasksStart + 20
  );

const tasksEnd =
  tasksEndCandidate > tasksStart
    ? tasksEndCandidate
    : app.length;

let tasksBlock =
  app.slice(
    tasksStart,
    tasksEnd
  );

tasksBlock =
  tasksBlock.replace(
    /\n\s*<BackgroundUploadList\s*[\s\S]*?\/>\s*/m,
    '\n'
  );

app =
  app.slice(
    0,
    tasksStart
  ) +
  tasksBlock +
  app.slice(
    tasksEnd
  );

/* ==========================================================
   3. CSS
   ========================================================== */

styles =
  styles.replace(
    /\s*$/,
    ''
  ) +
`

/* ${marker} */
.taskUploadProgressCard {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  width: 100%;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid
    rgba(255, 255, 255, .08);
  text-align: left;
}

.taskUploadProgressTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.taskUploadProgressTop strong {
  min-width: 0;
  color: var(--bo-text, #f3f5f7);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.taskUploadProgressTop b {
  flex: 0 0 auto;
  color: #9db5cc;
  font-size: 12px;
}

.taskUploadProgressBar {
  overflow: hidden;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, .08);
}

.taskUploadProgressBar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #84a8c8;
  transition: width .18s ease;
}

.taskUploadProgressMeta {
  color: var(--bo-muted, #9ca8b4);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.taskUpload-success
.taskUploadProgressBar > span {
  background: #78a987;
}

.taskUpload-error
.taskUploadProgressBar > span {
  background: #d87e70;
}

.taskUpload-error
.taskUploadProgressTop strong {
  color: #ef8b7c;
}
/* END_${marker} */
`;

/* ==========================================================
   Final checks
   ========================================================== */

const finalTasksStart =
  app.indexOf(
    'function TasksView('
  );

const finalRenderStart =
  app.indexOf(
    '  function renderTask(',
    finalTasksStart
  );

const finalRenderEnd =
  app.indexOf(
    '\n  function renderGroup(',
    finalRenderStart
  );

const finalRender =
  app.slice(
    finalRenderStart,
    finalRenderEnd
  );

const checks = [
  [
    uploads.includes(
      "scope?: 'TASK' | 'DEAL';"
    ),
    'upload job хранит origin TASK/DEAL'
  ],
  [
    uploads.includes(
      'resolvedUploadScope'
    ) ||
    uploads.includes(
      'inferredUploadScope'
    ),
    'origin определяется при старте upload'
  ],
  [
    finalRender.includes(
      'const taskUploadJob ='
    ),
    'карточка задачи находит свой upload'
  ],
  [
    finalRender.includes(
      "job.scope === 'TASK'"
    ),
    'DEAL upload не показывается в задачах'
  ],
  [
    finalRender.includes(
      'taskUploadProgressCard'
    ),
    'progress встроен в карточку задачи'
  ],
  [
    !finalRender.includes(
      'isBackgroundUploading'
    ),
    'задача не скрывается при загрузке'
  ],
  [
    styles.includes(
      '.taskUploadProgressCard'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'v064-O2.3 — upload из задачи'
);
console.log(
  '============================='
);

for (
  const [ok, label]
  of checks
) {
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
  'Правило: из задачи → назад в Задачи → progress на этой задаче.'
);

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

/* ==========================================================
   Backups + write
   ========================================================== */

const stamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    );

for (
  const file
  of [
    appPath,
    uploadsPath,
    stylesPath,
  ]
) {
  const backup =
    file +
    '.before-v064-o23-' +
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

save(
  appPath,
  A,
  app
);

save(
  uploadsPath,
  U,
  uploads
);

save(
  stylesPath,
  S,
  styles
);

console.log('');
console.log(
  'v064-O2.3 применён.'
);
