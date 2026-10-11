const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const backgroundPath = path.join(
  root,
  'frontend',
  'src',
  'backgroundUploads.tsx'
);

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

const serverStatusPath = path.join(
  root,
  'frontend',
  'src',
  'ServerStatusBanner.tsx'
);

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден файл: ' +
        file
    );
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

function write(file, text) {
  fs.writeFileSync(
    file,
    text,
    'utf8'
  );
}

let background =
  read(backgroundPath);

let app =
  read(appPath);

let styles =
  read(stylesPath);

let serverStatus =
  read(serverStatusPath);


/*
 * Preconditions: Part 1I + Part 1J.
 */

if (
  !background.includes(
    "'WAITING_NETWORK'"
  )
) {
  fail(
    'Part 1I не найден: нет WAITING_NETWORK.'
  );
}

if (
  !app.includes(
    "'Ждём сеть…'"
  )
) {
  fail(
    'Part 1I не найден: нет UI «Ждём сеть…».'
  );
}

if (
  !serverStatus.includes(
    'Сервер временно недоступен'
  )
) {
  fail(
    'Part 1J не найден: нет ServerStatusBanner.'
  );
}


/*
 * 1. BackgroundUploadJob.status:
 * add WAITING_SERVER next to WAITING_NETWORK.
 */

if (
  !background.includes(
    "'WAITING_SERVER'"
  )
) {

  const waitingNetworkToken =
    "'WAITING_NETWORK'";

  const tokenIndex =
    background.indexOf(
      waitingNetworkToken
    );

  if (
    tokenIndex < 0
  ) {
    fail(
      'Не найден WAITING_NETWORK в status union.'
    );
  }


  const unionStart =
    Math.max(
      0,
      background.lastIndexOf(
        'status:',
        tokenIndex
      )
    );

  const unionEnd =
    background.indexOf(
      ';',
      tokenIndex
    );


  if (
    unionEnd < 0 ||
    unionEnd - unionStart > 400
  ) {
    fail(
      'Не удалось определить конец status union.'
    );
  }


  const block =
    background.slice(
      unionStart,
      unionEnd
    );


  if (
    !block.includes(
      "'RUNNING'"
    ) ||
    !block.includes(
      "'ERROR'"
    )
  ) {
    fail(
      'WAITING_NETWORK найден не в BackgroundUploadJob.status.'
    );
  }


  const insertAt =
    tokenIndex +
    waitingNetworkToken.length;


  background =
    background.slice(
      0,
      insertAt
    ) +
    "\n    | 'WAITING_SERVER'" +
    background.slice(
      insertAt
    );
}


/*
 * 2. Server recovery retries WAITING_SERVER jobs.
 */

if (
  !background.includes(
    'retryWaitingServerJobs'
  )
) {

  const onlineListenerRegex =
    /window\.addEventListener\(\s*['"]online['"]\s*,\s*retryOfflineJobs\s*\);/;


  const onlineMatch =
    background.match(
      onlineListenerRegex
    );


  if (!onlineMatch) {
    fail(
      'Не найден listener online из Part 1G.'
    );
  }


  const retryServerCode = `

function retryWaitingServerJobs() {

  window.setTimeout(
    () => {

      const pending =
        jobs.filter(
          (job) =>
            job.status ===
              'WAITING_SERVER' &&
            job.retry
        );


      for (
        const job
        of pending
      ) {

        job.retry?.();
      }
    },

    250,
  );
}

`;


  const listenerEnd =
    onlineMatch.index +
    onlineMatch[0].length;


  background =
    background.slice(
      0,
      onlineMatch.index
    ) +
    retryServerCode +
    background.slice(
      onlineMatch.index,
      listenerEnd
    ) +
    `

  window.addEventListener(
    'msm:server-available',
    retryWaitingServerJobs
  );` +
    background.slice(
      listenerEnd
    );
}


/*
 * 3. Catch:
 * connection errors while navigator.onLine=true
 * become WAITING_SERVER.
 */

if (
  !background.includes(
    'waitingForServer'
  )
) {

  const waitingNetworkRegex =
    /const\s+waitingForNetwork\s*=\s*typeof\s+navigator\s*!==\s*['"]undefined['"]\s*&&\s*!navigator\.onLine\s*;/;


  const waitingMatch =
    background.match(
      waitingNetworkRegex
    );


  if (
    !waitingMatch ||
    waitingMatch.index === undefined
  ) {
    fail(
      'Не найден waitingForNetwork в catch.'
    );
  }


  const insertAt =
    waitingMatch.index +
    waitingMatch[0].length;


  const serverClassifier = `


        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);


        const waitingForServer =
          !waitingForNetwork &&
          (
            /failed to fetch/i.test(
              errorMessage
            ) ||
            /networkerror/i.test(
              errorMessage
            ) ||
            /network request failed/i.test(
              errorMessage
            ) ||
            /load failed/i.test(
              errorMessage
            ) ||
            /ошибка соединения при загрузке файла/i.test(
              errorMessage
            )
          );`;


  background =
    background.slice(
      0,
      insertAt
    ) +
    serverClassifier +
    background.slice(
      insertAt
    );


  const statusRegex =
    /status\s*:\s*waitingForNetwork\s*\?\s*['"]WAITING_NETWORK['"]\s*:\s*['"]ERROR['"]/;


  if (
    !statusRegex.test(
      background
    )
  ) {
    fail(
      'Не найден status WAITING_NETWORK/ERROR в catch.'
    );
  }


  background =
    background.replace(
      statusRegex,
      `status:
              waitingForNetwork
                ? 'WAITING_NETWORK'
                : waitingForServer
                  ? 'WAITING_SERVER'
                  : 'ERROR'`
    );


  const offlineErrorRegex =
    /error\s*:\s*waitingForNetwork\s*\?\s*(['"][\s\S]*?['"])\s*:\s*error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*String\(error\)/;


  const errorMatch =
    background.match(
      offlineErrorRegex
    );


  if (!errorMatch) {
    fail(
      'Не найден error-текст offline catch.'
    );
  }


  background =
    background.replace(
      offlineErrorRegex,
      `error:
              waitingForNetwork
                ? ${errorMatch[1]}
                : waitingForServer
                  ? 'Сервер недоступен · отправка продолжится автоматически'
                  : errorMessage`
    );


  const retryFlagRegex =
    /retryOnReconnect\s*:\s*waitingForNetwork/;


  if (
    !retryFlagRegex.test(
      background
    )
  ) {
    fail(
      'Не найден retryOnReconnect в catch.'
    );
  }


  background =
    background.replace(
      retryFlagRegex,
      `retryOnReconnect:
              waitingForNetwork ||
              waitingForServer`
    );
}


/*
 * 4. ServerStatusBanner:
 * each successful health check signals background queue.
 */

if (
  !serverStatus.includes(
    "'msm:server-available'"
  )
) {

  const healthSuccessRegex =
    /(if\s*\(\s*!payload\s*\|\|\s*payload\.ok\s*!==\s*true\s*\)\s*\{[\s\S]{0,300}?Invalid health response[\s\S]{0,300}?\}\s*)(failureCount\s*=\s*0\s*;)/;


  const successMatch =
    serverStatus.match(
      healthSuccessRegex
    );


  if (
    !successMatch ||
    successMatch.index === undefined
  ) {
    fail(
      'Не найден успешный health-check в ServerStatusBanner.'
    );
  }


  const replacement =
    successMatch[1] +
    successMatch[2] +
    `


          window.dispatchEvent(
            new Event(
              'msm:server-available'
            )
          );`;


  serverStatus =
    serverStatus.slice(
      0,
      successMatch.index
    ) +
    replacement +
    serverStatus.slice(
      successMatch.index +
      successMatch[0].length
    );
}


/*
 * 5. Task-card title: Ждём сервер…
 */

if (
  !app.includes(
    "'Ждём сервер…'"
  )
) {

  const networkTitleRegex =
    /uploadJob\.status\s*===\s*['"]WAITING_NETWORK['"]\s*\?\s*['"]Ждём сеть…['"]/;


  const titleMatch =
    app.match(
      networkTitleRegex
    );


  if (
    !titleMatch ||
    titleMatch.index === undefined
  ) {
    fail(
      'Не найден заголовок WAITING_NETWORK в карточке.'
    );
  }


  const insertAt =
    titleMatch.index +
    titleMatch[0].length;


  app =
    app.slice(
      0,
      insertAt
    ) +
    `
                      : uploadJob.status === 'WAITING_SERVER'
                        ? 'Ждём сервер…'` +
    app.slice(
      insertAt
    );
}


/*
 * 6. Task-card detail for WAITING_SERVER.
 */

if (
  !app.includes(
    'taskCardUploadWaitingServer'
  )
) {

  const waitingNetworkBlockRegex =
    /\{uploadJob\.status\s*===\s*['"]WAITING_NETWORK['"]\s*&&\s*\([\s\S]*?taskCardUploadWaiting[\s\S]*?\)\}/;


  const waitingBlock =
    app.match(
      waitingNetworkBlockRegex
    );


  if (
    !waitingBlock ||
    waitingBlock.index === undefined
  ) {
    fail(
      'Не найден UI-блок WAITING_NETWORK.'
    );
  }


  const insertAt =
    waitingBlock.index +
    waitingBlock[0].length;


  const serverBlock = `


            {uploadJob.status === 'WAITING_SERVER' && (

              <div className="taskCardUploadWaiting taskCardUploadWaitingServer">

                <span
                  className="taskCardUploadSpinner"
                  aria-hidden="true"
                />

                <span className="taskCardUploadMeta">
                  Сервер недоступен · отправка продолжится автоматически
                </span>

              </div>

            )}`;


  app =
    app.slice(
      0,
      insertAt
    ) +
    serverBlock +
    app.slice(
      insertAt
    );
}


/*
 * 7. Styles.
 */

const cssMarker =
  'MSM task card waiting-for-server v0.6.0 part 1K';


if (
  !styles.includes(
    cssMarker
  )
) {

  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.taskCardUpload-waiting_server .taskCardUploadBar > div,
.taskCardUpload-waiting_server .taskCardUploadBar > span {
  background: #d97706;
}

.taskCardUpload-waiting_server .taskCardUploadTop b {
  color: #b45309;
}

.taskCardUploadWaitingServer .taskCardUploadSpinner {
  border-color:
    rgba(217, 119, 6, 0.28);
  border-top-color:
    #d97706;
}

html[data-theme='dark'] .taskCardUpload-waiting_server .taskCardUploadTop b {
  color: #fbbf24;
}

html[data-theme='dark'] .taskCardUploadWaitingServer .taskCardUploadSpinner {
  border-color:
    rgba(251, 191, 36, 0.28);
  border-top-color:
    #fbbf24;
}
`;
}


console.log('');

console.log(
  'Проверка Part 1K:'
);

console.log(
  '  Part 1I WAITING_NETWORK: OK'
);

console.log(
  '  Part 1J server health: OK'
);

console.log(
  '  WAITING_SERVER logic: OK'
);

console.log(
  '  Auto-retry after server recovery: OK'
);

console.log(
  '  UI «Ждём сервер…»: OK'
);


if (
  checkOnly
) {

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


for (
  const file
  of [
    backgroundPath,
    appPath,
    stylesPath,
    serverStatusPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1k-' +
      stamp
  );
}


write(
  backgroundPath,
  background
);

write(
  appPath,
  app
);

write(
  stylesPath,
  styles
);

write(
  serverStatusPath,
  serverStatus
);


console.log('');

console.log(
  'Part 1K применён.'
);

console.log('');

console.log(
  'Дальше:'
);

console.log(
  '  git diff --check'
);

console.log(
  '  cd frontend'
);

console.log(
  '  npm run build'
);
