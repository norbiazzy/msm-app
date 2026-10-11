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

let background = read(backgroundPath);
let app = read(appPath);
let styles = read(stylesPath);

if (!background.includes('retryOnReconnect')) {
  fail('Part 1G не найден: в backgroundUploads.tsx нет retryOnReconnect.');
}

if (!app.includes('taskCardUploadState')) {
  fail('Part 1B не найден: в App.tsx нет taskCardUploadState.');
}

if (!styles.includes('taskCardUpload')) {
  fail('Part 1B не найден: в styles.css нет taskCardUpload стилей.');
}


/* 1. Добавляем WAITING_NETWORK в union status, независимо от форматирования. */

if (!background.includes("'WAITING_NETWORK'")) {
  const statusUnionRegex =
    /status\s*:\s*([\s\S]{0,180}?'RUNNING'[\s\S]{0,180}?'SUCCESS'[\s\S]{0,180}?'ERROR'[\s\S]{0,40}?;)/;

  const match = background.match(statusUnionRegex);

  if (!match) {
    fail('Не удалось определить union BackgroundUploadJob.status.');
  }

  const oldBlock = match[0];

  const errorIndex = oldBlock.indexOf("'ERROR'");

  if (errorIndex < 0) {
    fail('В BackgroundUploadJob.status не найден ERROR.');
  }

  const newBlock =
    oldBlock.slice(0, errorIndex) +
    "'WAITING_NETWORK'\n    | " +
    oldBlock.slice(errorIndex);

  background = background.replace(
    oldBlock,
    newBlock
  );
}


/* 2. Auto retry должен выбирать WAITING_NETWORK, а не обычную ERROR. */

const retryRegex =
  /job\.status\s*===\s*['"]ERROR['"](\s*&&\s*job\.retryOnReconnect)/;

if (retryRegex.test(background)) {
  background = background.replace(
    retryRegex,
    "job.status === 'WAITING_NETWORK'$1"
  );
} else if (
  !/job\.status\s*===\s*['"]WAITING_NETWORK['"]\s*&&\s*job\.retryOnReconnect/.test(background)
) {
  fail('Не найден фильтр auto-retry для retryOnReconnect.');
}


/* 3. Ошибка при offline получает отдельный статус WAITING_NETWORK. */

if (!/waitingForNetwork\s*\?\s*['"]WAITING_NETWORK['"]\s*:\s*['"]ERROR['"]/.test(background)) {
  const offlineStatusRegex =
    /status\s*:\s*['"]ERROR['"]\s*,(\s*error\s*:\s*waitingForNetwork)/;

  if (!offlineStatusRegex.test(background)) {
    fail('Не найден status ERROR в offline catch.');
  }

  background = background.replace(
    offlineStatusRegex,
    `status:
              waitingForNetwork
                ? 'WAITING_NETWORK'
                : 'ERROR',$1`
  );
}


/* 4. В карточке задачи добавляем заголовок "Ждём сеть…". */

if (!app.includes("'Ждём сеть…'")) {
  const titleRegex =
    /uploadJob\.status\s*===\s*['"]SUCCESS['"]\s*\?\s*['"][^'"]*['"]\s*:\s*uploadJob\.status\s*===\s*['"]ERROR['"]\s*\?\s*['"]Ошибка отправки['"]\s*:\s*uploadJob\.title/;

  const titleMatch = app.match(titleRegex);

  if (!titleMatch) {
    fail('Не найден заголовок статуса отправки в карточке задачи.');
  }

  app = app.replace(
    titleMatch[0],
    `uploadJob.status === 'SUCCESS'
                    ? '✓ Отправлено'
                    : uploadJob.status === 'WAITING_NETWORK'
                      ? 'Ждём сеть…'
                      : uploadJob.status === 'ERROR'
                        ? 'Ошибка отправки'
                        : uploadJob.title`
  );
}


/* 5. Перед обычным ERROR блоком показываем пояснение ожидания сети. */

if (!app.includes('taskCardUploadWaiting')) {
  const errorBlockRegex =
    /\{uploadJob\.status\s*===\s*['"]ERROR['"]\s*&&\s*\(\s*\n/;

  const errorMatch = app.match(errorBlockRegex);

  if (!errorMatch || errorMatch.index === undefined) {
    fail('Не найден UI-блок uploadJob.status === ERROR.');
  }

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

  app =
    app.slice(0, errorMatch.index) +
    waitingBlock +
    app.slice(errorMatch.index);
}


/* 6. Стили. */

const cssMarker =
  'MSM task card waiting-for-network v0.6.0 part 1I';

if (!styles.includes(cssMarker)) {
  styles = styles.trimEnd() + `

/* ${cssMarker} */

.taskCardUpload-waiting_network .taskCardUploadBar > div,
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
  margin-top: 8px;
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
}


console.log('');
console.log('Проверка Part 1I v2:');
console.log('  Part 1B progress UI: OK');
console.log('  Part 1G auto-retry: OK');
console.log('  BackgroundUploadJob.status: OK');
console.log('  WAITING_NETWORK logic: OK');
console.log('  UI "Ждём сеть…": OK');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}


const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

for (const file of [
  backgroundPath,
  appPath,
  stylesPath,
]) {
  fs.copyFileSync(
    file,
    file + '.before-part1i-' + stamp
  );
}

write(backgroundPath, background);
write(appPath, app);
write(stylesPath, styles);

console.log('');
console.log('Part 1I v2 применён.');
console.log('');
console.log('Дальше:');
console.log('  git diff --check');
console.log('  cd frontend');
console.log('  npm run build');
