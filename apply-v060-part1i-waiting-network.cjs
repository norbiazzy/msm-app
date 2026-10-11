const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const backgroundPath = path.join(root, 'frontend', 'src', 'backgroundUploads.tsx');
const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesPath = path.join(root, 'frontend', 'src', 'styles.css');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function replaceOnce(text, before, after, label) {
  if (text.includes(after)) {
    return text;
  }

  const first = text.indexOf(before);

  if (first < 0) {
    fail('Не найден блок: ' + label);
  }

  const second = text.indexOf(before, first + before.length);

  if (second >= 0) {
    fail('Блок найден несколько раз, автоматическая замена отменена: ' + label);
  }

  return text.slice(0, first) + after + text.slice(first + before.length);
}

let background = read(backgroundPath);
let app = read(appPath);
let styles = read(stylesPath);

if (!background.includes('retryOnReconnect')) {
  fail('Part 1G не найден: в backgroundUploads.tsx нет retryOnReconnect.');
}

if (!app.includes('taskCardUploadState')) {
  fail('Part 1B не найден: в App.tsx нет taskCardUploadState.');
}

if (!styles.includes('.taskCardUpload-error')) {
  fail('Part 1B не найден: в styles.css нет стилей ошибки отправки.');
}

const statusBefore = `  status:
    | 'RUNNING'
    | 'SUCCESS'
    | 'ERROR';`;

const statusAfter = `  status:
    | 'RUNNING'
    | 'WAITING_NETWORK'
    | 'SUCCESS'
    | 'ERROR';`;

background = replaceOnce(
  background,
  statusBefore,
  statusAfter,
  'BackgroundUploadJob.status'
);

const retryFilterBefore = `            job.status === 'ERROR' &&
            job.retryOnReconnect`;

const retryFilterAfter = `            job.status === 'WAITING_NETWORK' &&
            job.retryOnReconnect`;

background = replaceOnce(
  background,
  retryFilterBefore,
  retryFilterAfter,
  'retryOfflineJobs'
);

if (!background.includes("? 'WAITING_NETWORK'")) {
  const catchRegex =
    /status:\s*\n\s*'ERROR',\s*\n\s*\n\s*error:\s*\n\s*waitingForNetwork/;

  if (!catchRegex.test(background)) {
    fail('Не найден блок offline catch status.');
  }

  background = background.replace(
    catchRegex,
    `status:
              waitingForNetwork
                ? 'WAITING_NETWORK'
                : 'ERROR',

            error:
              waitingForNetwork`
  );
}

const titleBefore = `                  uploadJob.status === 'SUCCESS'
                    ? '✓ Отправлено'
                    : uploadJob.status === 'ERROR'
                      ? 'Ошибка отправки'
                      : uploadJob.title`;

const titleAfter = `                  uploadJob.status === 'SUCCESS'
                    ? '✓ Отправлено'
                    : uploadJob.status === 'WAITING_NETWORK'
                      ? 'Ждём сеть…'
                      : uploadJob.status === 'ERROR'
                        ? 'Ошибка отправки'
                        : uploadJob.title`;

app = replaceOnce(
  app,
  titleBefore,
  titleAfter,
  'заголовок состояния отправки'
);

const errorBlockMarker = `            {uploadJob.status === 'ERROR' && (

              <div className="taskCardUploadError">`;

const waitingBlock = `            {uploadJob.status === 'WAITING_NETWORK' && (

              <div className="taskCardUploadWaiting">

                <span
                  className="taskCardUploadSpinner"
                  aria-hidden="true"
                />

                <span className="taskCardUploadMeta">
                  Нет подключения · отправка продолжится автоматически
                </span>

              </div>

            )}


`;

if (!app.includes('taskCardUploadWaiting')) {
  const markerIndex = app.indexOf(errorBlockMarker);

  if (markerIndex < 0) {
    fail('Не найден блок обычной ошибки отправки в карточке задачи.');
  }

  app =
    app.slice(0, markerIndex) +
    waitingBlock +
    app.slice(markerIndex);
}

const cssAddon = `
/* MSM task card waiting-for-network v0.6.0 part 1I */

.taskCardUpload-waiting_network .taskCardUploadBar > span {
  background: #f59e0b;
}

.taskCardUpload-waiting_network .taskCardUploadTop b {
  color: #b45309;
}

.taskCardUploadWaiting {
  display: flex;
  align-items: center;
  gap: 8px;
}

.taskCardUploadSpinner {
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
  box-sizing: border-box;
  border: 2px solid rgba(245, 158, 11, 0.28);
  border-top-color: #f59e0b;
  border-radius: 999px;
  animation: taskCardUploadSpin 0.8s linear infinite;
}

@keyframes taskCardUploadSpin {
  to {
    transform: rotate(360deg);
  }
}

html[data-theme='dark'] .taskCardUpload-waiting_network .taskCardUploadTop b {
  color: #fbbf24;
}

html[data-theme='dark'] .taskCardUploadSpinner {
  border-color: rgba(251, 191, 36, 0.28);
  border-top-color: #fbbf24;
}
`;

if (!styles.includes('MSM task card waiting-for-network v0.6.0 part 1I')) {
  styles = styles.trimEnd() + '\n\n' + cssAddon.trim() + '\n';
}

console.log('');
console.log('Проверка Part 1I:');
console.log('  Part 1B progress UI: OK');
console.log('  Part 1G auto-retry: OK');
console.log('  WAITING_NETWORK status: готово');
console.log('  UI "Ждём сеть": готово');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

for (const file of [backgroundPath, appPath, stylesPath]) {
  fs.copyFileSync(
    file,
    file + '.before-part1i-' + stamp
  );
}

write(backgroundPath, background);
write(appPath, app);
write(stylesPath, styles);

console.log('');
console.log('Part 1I применён.');
console.log('');
console.log('Дальше:');
console.log('  git diff --check');
console.log('  cd frontend');
console.log('  npm run build');
