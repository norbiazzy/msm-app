const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const poaPath = path.join(root, 'frontend', 'src', 'PowerOfAttorneyBlock.tsx');
const uploadsPath = path.join(root, 'frontend', 'src', 'backgroundUploads.tsx');
const stylesPath = path.join(root, 'frontend', 'src', 'styles.css');

const marker = 'PART_V064_O18_V2_TASK_UPLOAD_PROGRESS';

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function readFile(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден: ' + path.relative(root, file));
  }

  const raw = fs.readFileSync(file, 'utf8');
  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

const appFile = readFile(appPath);
const poaFile = readFile(poaPath);
const uploadsFile = readFile(uploadsPath);
const stylesFile = readFile(stylesPath);

let app = appFile.text;
let poa = poaFile.text;
let styles = stylesFile.text;

if (app.includes(marker) || poa.includes(marker) || styles.includes(marker)) {
  console.log('');
  console.log('v064-O1.8 v2 уже установлен.');
  process.exit(0);
}

const requiredApp = [
  'function TasksView(',
  'useBackgroundUploads();',
  'function renderTask(',
  'function renderGroup(',
  'PART_V064_M2_CLEAN_RENDER_TASK',
];

for (const item of requiredApp) {
  if (!app.includes(item)) {
    fail('App.tsx: не найден ожидаемый фрагмент: ' + item);
  }
}

const requiredUploads = [
  'export type BackgroundUploadJob',
  'taskId?: string;',
  'dealId?: string;',
  'progress: number;',
  'currentFile?: string;',
  'completedFiles: number;',
  'totalFiles: number;',
];

for (const item of requiredUploads) {
  if (!uploadsFile.text.includes(item)) {
    fail('backgroundUploads.tsx: не найдено поле: ' + item);
  }
}

if (!poa.includes('Отправляем запрос на доверенность')) {
  fail('PowerOfAttorneyBlock.tsx: не найден запуск загрузки новой доверенности.');
}

const tasksStart = app.indexOf('function TasksView(');
const nextFnCandidates = [
  app.indexOf('\nfunction TaskDetail(', tasksStart + 1),
  app.indexOf('\nfunction ThemeToggle(', tasksStart + 1),
].filter((value) => value > tasksStart);
const tasksEnd = nextFnCandidates.length > 0 ? Math.min(...nextFnCandidates) : app.length;
let tasksBlock = app.slice(tasksStart, tasksEnd);

const renderStart = tasksBlock.indexOf('  function renderTask(');
const renderEnd = tasksBlock.indexOf('\n  function renderGroup(', renderStart);
if (renderStart < 0 || renderEnd < 0) {
  fail('App.tsx: не удалось выделить renderTask().');
}

let renderBlock = tasksBlock.slice(renderStart, renderEnd);
const mainReturn = renderBlock.lastIndexOf('\n    return (');
if (mainReturn < 0) {
  fail('App.tsx: не найден основной return renderTask().');
}

const taskJobCode = `
    // ${marker}
    const taskUploadJob =
      backgroundUploads.find(
        (job) =>
          job.taskId === task.id
      );

`;

renderBlock =
  renderBlock.slice(0, mainReturn) +
  taskJobCode +
  renderBlock.slice(mainReturn);

const buttonClose = renderBlock.lastIndexOf('\n      </button>');
if (buttonClose < 0) {
  fail('App.tsx: не найден конец карточки renderTask().');
}

const inlineProgress = `

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

renderBlock =
  renderBlock.slice(0, buttonClose) +
  inlineProgress +
  renderBlock.slice(buttonClose);

tasksBlock =
  tasksBlock.slice(0, renderStart) +
  renderBlock +
  tasksBlock.slice(renderEnd);

const approvedMarker = '{/* PART_V064_J_APPROVED_TASK_LIST */}';
const approvedIndex = tasksBlock.indexOf(approvedMarker);
if (approvedIndex < 0) {
  fail('App.tsx: не найден PART_V064_J_APPROVED_TASK_LIST.');
}

const afterApproved = approvedIndex + approvedMarker.length;
const detachedJobs = `

      {/* ${marker} — новая задача ещё не создана */}
      {backgroundUploads
        .filter(
          (job) =>
            !job.taskId &&
            Boolean(job.dealId)
        )
        .map(
          (job) => {
            const relatedTask =
              tasks.find(
                (item) =>
                  item.deal.id ===
                  job.dealId
              );

            return (
              <div
                className={
                  'taskCard taskUploadGhost taskUpload-' +
                  job.status.toLowerCase()
                }
                key={job.id}
              >
                <div className="taskUploadGhostHead">
                  <div>
                    <strong>
                      {
                        job.status === 'SUCCESS'
                          ? '✓ ' +
                            (
                              job.successTitle ||
                              job.title
                            )
                          : job.status === 'ERROR'
                            ? 'Ошибка загрузки'
                            : '↑ ' + job.title
                      }
                    </strong>

                    <span>
                      {
                        relatedTask
                          ? (
                              relatedTask.deal.clientName +
                              ' · ЗК-' +
                              relatedTask.deal.internalNumber
                            )
                          : (
                              job.subtitle ||
                              'Создаём задачу'
                            )
                      }
                    </span>
                  </div>

                  <b>
                    {job.progress}%
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
                            job.progress
                          )
                        ) + '%',
                    }}
                  />
                </div>

                <div className="taskUploadMeta">
                  {
                    job.status === 'RUNNING'
                      ? (
                          job.totalFiles > 0
                            ? (
                                job.completedFiles +
                                ' из ' +
                                job.totalFiles +
                                ' файлов'
                              )
                            : 'Сохраняем данные…'
                        )
                      : job.status === 'SUCCESS'
                        ? 'Задача создана'
                        : (
                            job.error ||
                            'Не удалось загрузить файлы'
                          )
                  }

                  {
                    job.currentFile
                      ? ' · ' + job.currentFile
                      : ''
                  }
                </div>
              </div>
            );
          }
        )}
`;

tasksBlock =
  tasksBlock.slice(0, afterApproved) +
  detachedJobs +
  tasksBlock.slice(afterApproved);

app =
  app.slice(0, tasksStart) +
  tasksBlock +
  app.slice(tasksEnd);

const uploadTitleIndex = poa.indexOf('Отправляем запрос на доверенность');
if (uploadTitleIndex < 0) {
  fail('PowerOfAttorneyBlock.tsx: заголовок загрузки не найден.');
}

/* startBackgroundUploadJob находится ВЫШЕ title.
   В v1 проверка ошибочно искала его после title. */
const jobStartIndex =
  poa.lastIndexOf(
    'startBackgroundUploadJob({',
    uploadTitleIndex
  );

if (jobStartIndex < 0) {
  fail(
    'PowerOfAttorneyBlock.tsx: не найден startBackgroundUploadJob для доверенности.'
  );
}

const resetIndex =
  poa.indexOf(
    '      resetForm();',
    uploadTitleIndex
  );

if (resetIndex < 0) {
  fail(
    'PowerOfAttorneyBlock.tsx: resetForm после фоновой загрузки не найден.'
  );
}

/* Проверяем, что resetForm принадлежит именно этому if-блоку:
   между стартом job и resetForm должны быть title и files. */
const uploadBlock =
  poa.slice(
    jobStartIndex,
    resetIndex
  );

if (
  !uploadBlock.includes(
    'Отправляем запрос на доверенность'
  ) ||
  !uploadBlock.includes(
    'files: filesToUpload'
  )
) {
  fail(
    'PowerOfAttorneyBlock.tsx: найденный resetForm не относится к загрузке доверенности.'
  );
}

const navigateCode = `      // ${marker}
      window.location.hash =
        '#tasks';

`;

poa =
  poa.slice(0, resetIndex) +
  navigateCode +
  poa.slice(resetIndex);

styles = styles.replace(/\s*$/, '') + `

/* ${marker} */
.taskUploadInline {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  width: 100%;
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid rgba(255,255,255,.08);
  text-align: left;
}

.taskUploadTop,
.taskUploadGhostHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.taskUploadTop strong,
.taskUploadGhostHead strong {
  color: var(--bo-text, #f3f5f7);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.taskUploadTop > b,
.taskUploadGhostHead > b {
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
  background: rgba(255,255,255,.08);
}

.taskUploadBar > div {
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  color: #84a8c8;
  transition: width .18s ease;
}

.taskUploadMeta {
  overflow: hidden;
  color: var(--bo-muted, #9ca8b4);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskUploadGhost {
  display: grid !important;
  gap: 9px !important;
  width: 100% !important;
  margin: 0 0 10px !important;
  padding: 14px 15px !important;
  cursor: default !important;
  text-align: left !important;
}

.taskUploadGhostHead > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.taskUploadGhostHead span {
  overflow: hidden;
  color: var(--bo-muted, #9ca8b4);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskUpload-success .taskUploadBar > div { color: #78a987; }
.taskUpload-success .taskUploadTop strong,
.taskUpload-success .taskUploadGhostHead strong { color: #8fbd9b; }
.taskUpload-error .taskUploadBar > div { color: #d87e70; }
.taskUpload-error .taskUploadTop strong,
.taskUpload-error .taskUploadGhostHead strong { color: #ef8b7c; }

@media (max-width: 640px) {
  .taskUploadGhost { padding: 12px !important; }
  .taskUploadMeta { white-space: normal; }
}
/* END_${marker} */
`;

const checks = [
  [app.includes(marker), 'App: прогресс добавлен'],
  [app.includes('const taskUploadJob ='), 'существующая задача связана с job'],
  [app.includes('taskUploadGhost'), 'временная карточка новой задачи'],
  [app.includes('taskUploadJob.progress'), 'процент внутри карточки'],
  [poa.includes(marker), 'доверенность возвращает в Задачи'],
  [poa.includes("window.location.hash =\n        '#tasks';"), 'переход #tasks'],
  [styles.includes('.taskUploadInline'), 'CSS прогресса'],
  [styles.includes('.taskUploadGhost'), 'CSS временной карточки'],
];

console.log('');
console.log('v064-O1.8 v2 — прогресс загрузки в задачах');
console.log('======================================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

console.log('');
console.log('Меняются 3 frontend-файла.');
console.log('backgroundUploads.tsx только проверяется, не меняется.');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const writes = [
  [appPath, appFile, app],
  [poaPath, poaFile, poa],
  [stylesPath, stylesFile, styles],
];

for (const [file] of writes) {
  const backup = file + '.before-v064-o18-v2-' + stamp;
  fs.copyFileSync(file, backup);
  console.log('Backup: ' + path.relative(root, backup));
}

for (const [file, original, next] of writes) {
  fs.writeFileSync(
    file,
    original.crlf ? next.replace(/\n/g, '\r\n') : next,
    'utf8'
  );
}

console.log('');
console.log('v064-O1.8 v2 применён.');
