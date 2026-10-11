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
  'PART_V064_O21_V2_DEAL_UPLOAD_VISIBLE_IMMEDIATELY';

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
    fs.readFileSync(
      file,
      'utf8'
    );

  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
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
    'v064-O2.1 v2 уже установлен.'
  );
  process.exit(0);
}

/* ==========================================================
   1. После создания сделки сначала показываем список Сделки,
      а reload выполняем уже после навигации.
   ========================================================== */

const oldCallbackRegex =
  /onCreated=\{async \(\) => \{\s*await reload\(\);\s*navigate\('home'\);\s*\}\}/m;

const callbackMatches =
  app.match(
    new RegExp(
      oldCallbackRegex.source,
      'gm'
    )
  ) || [];

if (
  callbackMatches.length !== 1
) {
  fail(
    'App.tsx: ожидался 1 onCreated новой сделки с await reload() перед navigate(home), найдено ' +
    callbackMatches.length
  );
}

app = app.replace(
  oldCallbackRegex,
`onCreated={async () => {
            // ${marker}
            // Сначала открываем список сделок:
            // progress становится виден сразу.
            navigate('home');
            await reload();
          }}`
);

/* ==========================================================
   2. Home: временная карточка upload job, пока reload ещё
      не успел добавить новую ЗК в массив deals.
   ========================================================== */

const homeStart =
  app.indexOf(
    'function Home('
  );

const dealCardStart =
  app.indexOf(
    '\nfunction DealCard(',
    homeStart
  );

if (
  homeStart < 0 ||
  dealCardStart < 0
) {
  fail(
    'App.tsx: Home / DealCard не найдены.'
  );
}

let home =
  app.slice(
    homeStart,
    dealCardStart
  );

if (
  !home.includes(
    'const backgroundUploads ='
  )
) {
  fail(
    'Home: useBackgroundUploads не найден.'
  );
}

if (
  !home.includes(
    '<div className="dealList">'
  )
) {
  fail(
    'Home: dealList не найден.'
  );
}

if (
  !home.includes(
    '{active.map('
  )
) {
  fail(
    'Home: active.map не найден.'
  );
}

const activeEndAnchor =
`      [deals]
    );`;

if (
  !home.includes(
    activeEndAnchor
  )
) {
  fail(
    'Home: конец active useMemo не найден.'
  );
}

home = home.replace(
  activeEndAnchor,
`${activeEndAnchor}


  // ${marker}
  // Пока серверный reload ещё не вернул новую ЗК,
  // показываем её upload job как временную карточку.
  const pendingDealUploads =
    backgroundUploads.filter(
      (job) =>
        Boolean(job.dealId) &&
        !deals.some(
          (deal) =>
            deal.id === job.dealId
        )
    );`
);

const dealListAnchor =
`          <div className="dealList">`;

home = home.replace(
  dealListAnchor,
`${dealListAnchor}

            {pendingDealUploads.map(
              (job) => (
                <div
                  className="dealCard dealUploadGhostCard"
                  key={job.id}
                >
                  <div className="dealTop">
                    <div>
                      <strong>
                        Новая сделка
                      </strong>
                      <span>
                        {
                          job.subtitle ||
                          'Создаём сделку'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="dealMeta">
                    <span>
                      Счёт на создании
                    </span>
                  </div>

                  <div
                    className={
                      'dealUploadState dealUpload-' +
                      job.status.toLowerCase()
                    }
                  >
                    <div className="dealUploadStateTop">
                      <strong>
                        {
                          job.status === 'SUCCESS'
                            ? '✓ ' +
                              (
                                job.successTitle ||
                                job.title
                              )
                            : job.status === 'ERROR'
                              ? 'Не удалось отправить документы'
                              : job.title
                        }
                      </strong>

                      <b>
                        {job.progress}%
                      </b>
                    </div>

                    <div className="dealUploadMiniBar">
                      <span
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

                    <span>
                      {
                        job.status === 'RUNNING'
                          ? (
                              job.currentFile
                                ? (
                                    job.completedFiles +
                                    ' из ' +
                                    job.totalFiles +
                                    ' · ' +
                                    job.currentFile
                                  )
                                : 'Подготавливаем отправку…'
                            )
                          : job.status === 'SUCCESS'
                            ? 'Готово'
                            : (
                                job.error ||
                                'Ошибка загрузки'
                              )
                      }
                    </span>
                  </div>
                </div>
              )
            )}`
);

app =
  app.slice(0, homeStart) +
  home +
  app.slice(dealCardStart);

/* ==========================================================
   3. На реальной DealCard показываем upload job.
      Этот код уже должен существовать — проверяем, не переписываем.
   ========================================================== */

// После вставки временной карточки длина Home изменилась,
   // поэтому индексы DealCard нужно вычислить заново.
const liveDealCardStart =
  app.indexOf(
    '\nfunction DealCard('
  );

if (liveDealCardStart < 0) {
  fail(
    'App.tsx: DealCard после изменения Home не найден.'
  );
}

const dealCardEndCandidates = [
  app.indexOf(
    '\nfunction DealDetail(',
    liveDealCardStart + 1
  ),
  app.indexOf(
    '\nfunction ',
    liveDealCardStart + 20
  ),
].filter(
  (value) =>
    value > liveDealCardStart
);

const dealCardEnd =
  dealCardEndCandidates.length
    ? Math.min(...dealCardEndCandidates)
    : app.length;

const dealCard =
  app.slice(
    liveDealCardStart,
    dealCardEnd
  );

if (
  !dealCard.includes(
    'uploadJob?: BackgroundUploadJob'
  ) ||
  !dealCard.includes(
    'dealUploadState'
  ) ||
  !dealCard.includes(
    'uploadJob.progress'
  )
) {
  fail(
    'DealCard: текущий progress UI не найден; файлы не изменены.'
  );
}

/* ==========================================================
   4. CSS только для временной карточки.
   ========================================================== */

styles =
  styles.replace(/\s*$/, '') +
`

/* ${marker} */
.dealUploadGhostCard {
  cursor: default;
  opacity: .98;
}

.dealUploadGhostCard .dealTop {
  margin-bottom: 4px;
}

.dealUploadGhostCard .dealMeta {
  margin-bottom: 8px;
}

.dealUploadGhostCard .dealUploadState {
  margin-top: 0;
}
/* END_${marker} */
`;

/* ==========================================================
   FINAL CHECKS
   ========================================================== */

const checks = [
  [
    app.includes(marker),
    'маркер O2.1'
  ],
  [
    app.includes(
      "navigate('home');\n            await reload();"
    ),
    'сначала показываем Сделки, потом reload'
  ],
  [
    app.includes(
      'const pendingDealUploads ='
    ),
    'временная карточка новой сделки'
  ],
  [
    app.includes(
      'dealUploadGhostCard'
    ),
    'ghost card в dealList'
  ],
  [
    app.includes(
      'uploadJob.progress'
    ),
    'progress на реальной карточке сделки'
  ],
  [
    styles.includes(
      '.dealUploadGhostCard'
    ),
    'CSS временной карточки'
  ],
];

console.log('');
console.log(
  'v064-O2.1 v2 — progress новой сделки виден сразу'
);
console.log(
  '============================================='
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
  'Схема: Отправить → Сделки сразу → временная карточка → реальная ЗК.'
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
    .replace(/[:.]/g, '-');

for (
  const [file]
  of [
    [appPath],
    [stylesPath],
  ]
) {
  const backup =
    file +
    '.before-v064-o21-v2-' +
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
  'v064-O2.1 v2 применён.'
);
