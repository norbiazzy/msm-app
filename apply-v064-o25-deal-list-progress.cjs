const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesPath = path.join(root, 'frontend', 'src', 'styles.css');

const marker = 'PART_V064_O25_DEAL_LIST_PROGRESS_FORCE_VISIBLE';

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function load(file) {
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

function save(file, source, text) {
  fs.writeFileSync(
    file,
    source.crlf
      ? text.replace(/\n/g, '\r\n')
      : text,
    'utf8'
  );
}

const A = load(appPath);
const S = load(stylesPath);

let app = A.text;
let styles = S.text;

if (
  app.includes(marker) ||
  styles.includes(marker)
) {
  console.log('');
  console.log('v064-O2.5 уже установлен.');
  process.exit(0);
}

/* ==========================================================
   1. Home: selector сделки.
   O2.4 фильтровал только scope DEAL.
   Добавляем безопасный fallback:
   job с dealId и БЕЗ taskId — это документ сделки,
   даже если старый патч ошибочно записал scope.
   ========================================================== */

const homeStart = app.indexOf('function Home(');
const cardStart = app.indexOf('\nfunction DealCard(', homeStart);

if (homeStart < 0 || cardStart < 0) {
  fail('App.tsx: Home / DealCard не найдены.');
}

let home = app.slice(homeStart, cardStart);

if (!home.includes('const backgroundUploads =')) {
  fail('Home: backgroundUploads не найден.');
}

if (home.includes('const dealUploadJobFor =')) {
  const selectorRegex =
    /const dealUploadJobFor =[\s\S]*?;\n(?=\s*\n|\s*const active|\s*return \()/m;

  const match = home.match(selectorRegex);

  if (!match) {
    fail('Home: не удалось выделить dealUploadJobFor.');
  }

  home = home.replace(
    selectorRegex,
`const dealUploadJobFor =
    (dealId: string) =>
      backgroundUploads.find(
        (job) =>
          job.dealId === dealId &&
          (
            job.scope === 'DEAL' ||
            (
              !job.taskId &&
              (
                !job.scope ||
                job.scope === 'TASK'
              )
            )
          )
      );

  // ${marker}
`
  );
} else {
  const uploadAnchor =
    /(\s*const backgroundUploads =\s*\n\s*useBackgroundUploads\(\);\s*)/m;

  if (!uploadAnchor.test(home)) {
    fail('Home: не найден useBackgroundUploads().');
  }

  home = home.replace(
    uploadAnchor,
`$1

  // ${marker}
  const dealUploadJobFor =
    (dealId: string) =>
      backgroundUploads.find(
        (job) =>
          job.dealId === dealId &&
          (
            job.scope === 'DEAL' ||
            !job.taskId
          )
      );
`
  );

  /* Подменяем прямой backgroundUploads.find у DealCard,
     если он ещё старый. */
  home = home.replace(
    /uploadJob=\{\s*backgroundUploads\.find\([\s\S]*?\)\s*\}/m,
`uploadJob={
                  dealUploadJobFor(
                    deal.id
                  )
                }`
  );
}

if (!home.includes('dealUploadJobFor(')) {
  fail('Home: DealCard не использует dealUploadJobFor.');
}

app =
  app.slice(0, homeStart) +
  home +
  app.slice(cardStart);

/* ==========================================================
   2. DealCard: убеждаемся, что progress реально есть в DOM.
   ========================================================== */

const liveCardStart = app.indexOf('\nfunction DealCard(');
const detailStart = app.indexOf('\nfunction DealDetail(', liveCardStart);

if (liveCardStart < 0 || detailStart < 0) {
  fail('App.tsx: DealCard / DealDetail не найдены.');
}

const card = app.slice(liveCardStart, detailStart);

if (
  !card.includes('uploadJob?: BackgroundUploadJob') ||
  !card.includes('{uploadJob && (') ||
  !card.includes('dealUploadState') ||
  !card.includes('uploadJob.progress')
) {
  fail(
    'DealCard: progress-блок не найден в DOM. ' +
    'Файлы не изменены.'
  );
}

/* ==========================================================
   3. CSS: текущий список на desktop выглядит как таблица.
   Старый dealUploadState есть в DOM, но может попадать
   за пределы фиксированной grid-строки.
   Принудительно делаем его второй полной строкой DealCard.
   ========================================================== */

styles =
  styles.replace(/\s*$/, '') +
`

/* ${marker}
   В табличном/компактном режиме progress всегда виден
   второй строкой именно своей сделки.
*/

.homeContent .dealCard:has(> .dealUploadState) {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow: visible !important;
  grid-auto-rows: auto !important;
  align-items: center;
}

.homeContent .dealCard > .dealUploadState {
  display: grid !important;
  visibility: visible !important;
  opacity: 1 !important;

  position: static !important;
  inset: auto !important;

  grid-column: 1 / -1 !important;
  grid-row: auto !important;

  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;

  margin: 8px 0 2px !important;
  padding: 8px 10px !important;

  border-radius: 8px !important;
  text-align: left !important;
}

.homeContent .dealCard > .dealUploadState .dealUploadStateTop {
  display: flex !important;
}

.homeContent .dealCard > .dealUploadState .dealUploadMiniBar {
  display: block !important;
  width: 100% !important;
  height: 4px !important;
}

.homeContent .dealCard > .dealUploadState > span {
  display: block !important;
}

/* Если табличный режим задаёт overflow на контейнер списка. */
.homeContent .dealList,
.homeContent .homeDeals {
  overflow: visible !important;
}
/* END_${marker} */
`;

/* ==========================================================
   CHECKS
   ========================================================== */

const finalHomeStart = app.indexOf('function Home(');
const finalCardStart = app.indexOf('\nfunction DealCard(', finalHomeStart);
const finalHome = app.slice(finalHomeStart, finalCardStart);

const checks = [
  [
    finalHome.includes('const dealUploadJobFor ='),
    'selector upload сделки есть'
  ],
  [
    finalHome.includes("job.scope === 'DEAL'"),
    'основной DEAL scope сохранён'
  ],
  [
    finalHome.includes('!job.taskId'),
    'fallback для deal upload без taskId'
  ],
  [
    finalHome.includes('dealUploadJobFor('),
    'DealCard получает найденный job'
  ],
  [
    card.includes('dealUploadState') &&
    card.includes('uploadJob.progress'),
    'progress присутствует в DealCard DOM'
  ],
  [
    styles.includes(
      '.homeContent .dealCard:has(> .dealUploadState)'
    ),
    'табличная строка расширяется под progress'
  ],
  [
    styles.includes(
      'grid-column: 1 / -1 !important;'
    ),
    'progress занимает всю ширину строки'
  ],
];

console.log('');
console.log(
  'v064-O2.5 — progress в списке сделок'
);
console.log(
  '===================================='
);

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

console.log('');
console.log(
  'Исправляем 2 причины: selector job + табличная CSS-строка.'
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

for (const file of [appPath, stylesPath]) {
  const backup =
    file +
    '.before-v064-o25-' +
    stamp;

  fs.copyFileSync(file, backup);

  console.log(
    'Backup: ' +
    path.relative(root, backup)
  );
}

save(appPath, A, app);
save(stylesPath, S, styles);

console.log('');
console.log('v064-O2.5 применён.');
