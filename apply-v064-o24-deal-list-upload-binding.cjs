const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesPath = path.join(root, 'frontend', 'src', 'styles.css');

const marker = 'PART_V064_O24_DEAL_LIST_UPLOAD_BINDING';

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
    source.crlf ? text.replace(/\n/g, '\r\n') : text,
    'utf8'
  );
}

function functionBlock(text, name, nextName) {
  const start = text.indexOf(`function ${name}(`);

  if (start < 0) {
    fail(`App.tsx: ${name} не найден.`);
  }

  let end;

  if (nextName) {
    end = text.indexOf(`\nfunction ${nextName}(`, start + 1);
  }

  if (!end || end < 0) {
    end = text.indexOf('\nfunction ', start + 20);
  }

  if (end < 0) {
    end = text.length;
  }

  return {
    start,
    end,
    text: text.slice(start, end),
  };
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
  console.log('v064-O2.4 уже установлен.');
  process.exit(0);
}

/* ==========================================================
   1. HOME / СПИСОК СДЕЛОК
   Привязываем карточку ЗК к DEAL-upload по dealId.
   ========================================================== */

let homeInfo = functionBlock(
  app,
  'Home',
  'DealCard'
);

let home = homeInfo.text;

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
    '<DealCard'
  )
) {
  fail(
    'Home: DealCard не найден.'
  );
}

/* Убираем общую верхнюю панель загрузок из списка сделок:
   progress должен жить НА карточке сделки. */
home = home.replace(
  /\n\s*<BackgroundUploadList\s*\n?\s*jobs=\{backgroundUploads\}\s*\/>\s*/g,
  '\n'
);

/* Единый selector. */
if (
  !home.includes(
    'const dealUploadJobFor ='
  )
) {
  const uploadAnchor =
    /(\s*const backgroundUploads =\s*\n\s*useBackgroundUploads\(\);\s*)/m;

  if (!uploadAnchor.test(home)) {
    fail(
      'Home: не удалось найти конец backgroundUploads.'
    );
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
            !job.scope ||
            job.scope === 'DEAL'
          )
      );
`
  );
}

/* Если uploadJob уже передаётся, заменяем его selector на единый. */
if (
  /uploadJob=\{/.test(home)
) {
  home = home.replace(
    /uploadJob=\{\s*backgroundUploads\.find\([\s\S]*?\)\s*\}/m,
`uploadJob={
                  dealUploadJobFor(
                    deal.id
                  )
                }`
  );
}

/* Если uploadJob вообще не передаётся — добавляем. */
if (
  !/uploadJob=\{/.test(home)
) {
  const dealProp =
`                deal={deal}
`;

  if (
    !home.includes(
      dealProp
    )
  ) {
    fail(
      'Home: prop deal={deal} в DealCard не найден.'
    );
  }

  home = home.replace(
    dealProp,
`${dealProp}                uploadJob={
                  dealUploadJobFor(
                    deal.id
                  )
                }
`
  );
}

/* pendingDealUploads, если есть, должен содержать только DEAL origin. */
home = home.replace(
  /const pendingDealUploads =\s*backgroundUploads\.filter\(\s*\(job\) =>\s*Boolean\(job\.dealId\) &&/m,
`const pendingDealUploads =
    backgroundUploads.filter(
      (job) =>
        Boolean(job.dealId) &&
        (
          !job.scope ||
          job.scope === 'DEAL'
        ) &&`
);

app =
  app.slice(0, homeInfo.start) +
  home +
  app.slice(homeInfo.end);

/* ==========================================================
   2. DEAL CARD
   Проверяем, что карточка реально умеет показывать uploadJob.
   ========================================================== */

const cardInfo =
  functionBlock(
    app,
    'DealCard',
    'DealDetail'
  );

const card =
  cardInfo.text;

if (
  !card.includes(
    'uploadJob?: BackgroundUploadJob'
  )
) {
  fail(
    'DealCard: prop uploadJob отсутствует. Файлы не изменены.'
  );
}

if (
  !card.includes(
    'dealUploadState'
  ) ||
  !card.includes(
    'uploadJob.progress'
  )
) {
  fail(
    'DealCard: UI progress отсутствует. Файлы не изменены.'
  );
}

/* ==========================================================
   3. DEAL DETAIL
   Убираем ОБЩУЮ панель BackgroundUploadList.
   Inline progress O2.2 оставляем один.
   ========================================================== */

let detailInfo =
  functionBlock(
    app,
    'DealDetail',
    'InvoiceBlock'
  );

let detail =
  detailInfo.text;

detail = detail.replace(
  /\n\s*<BackgroundUploadList\s*\n?\s*jobs=\{backgroundUploads\}\s*\/>\s*/g,
  '\n'
);

/* Если O1.9 + O2.2 дали два inline блока,
   O2.2 dealGeneralUploadProgress оставляем.
   Старый dealPageUploadProgress визуально выключим CSS-ом,
   чтобы не рисковать JSX. */
if (
  !detail.includes(
    'dealGeneralUploadProgress'
  )
) {
  fail(
    'DealDetail: dealGeneralUploadProgress O2.2 не найден.'
  );
}

app =
  app.slice(0, detailInfo.start) +
  detail +
  app.slice(detailInfo.end);

/* ==========================================================
   4. CSS
   Скрываем старый дубликат O1.9 и любые generic upload cards,
   оказавшиеся прямыми детьми страницы сделки.
   ========================================================== */

styles =
  styles.replace(/\s*$/, '') +
`

/* ${marker}
   DEAL upload отображается:
   - внутри сделки: один O2.2 progress;
   - в списке: внутри конкретной DealCard.
*/

.dealWorkspaceCPage > .backgroundUploadList,
.dealWorkspaceCPage > .dealPageUploadProgress {
  display: none !important;
}

/* На странице списка сделок generic banner больше не нужен. */
.homeContent > .backgroundUploadList {
  display: none !important;
}
/* END_${marker} */
`;

/* ==========================================================
   CHECKS
   ========================================================== */

const finalHome =
  functionBlock(
    app,
    'Home',
    'DealCard'
  ).text;

const finalDetail =
  functionBlock(
    app,
    'DealDetail',
    'InvoiceBlock'
  ).text;

const finalCard =
  functionBlock(
    app,
    'DealCard',
    'DealDetail'
  ).text;

const checks = [
  [
    finalHome.includes(
      'const dealUploadJobFor ='
    ),
    'Home имеет единый selector DEAL-upload'
  ],
  [
    finalHome.includes(
      "job.scope === 'DEAL'"
    ),
    'список не подхватывает upload из задач'
  ],
  [
    finalHome.includes(
      'dealUploadJobFor('
    ) &&
    finalHome.includes(
      'uploadJob={'
    ),
    'uploadJob передаётся в DealCard'
  ],
  [
    finalCard.includes(
      'dealUploadState'
    ) &&
    finalCard.includes(
      'uploadJob.progress'
    ),
    'DealCard показывает progress'
  ],
  [
    !/<BackgroundUploadList[\s\S]*?jobs=\{backgroundUploads\}[\s\S]*?\/>/.test(
      finalHome
    ),
    'нет общей панели progress над списком сделок'
  ],
  [
    !/<BackgroundUploadList[\s\S]*?jobs=\{backgroundUploads\}[\s\S]*?\/>/.test(
      finalDetail
    ),
    'нет общей панели progress внутри сделки'
  ],
  [
    finalDetail.includes(
      'dealGeneralUploadProgress'
    ),
    'один основной inline progress сделки сохранён'
  ],
  [
    styles.includes(
      '.dealWorkspaceCPage > .dealPageUploadProgress'
    ),
    'старый дубль progress скрыт'
  ],
];

console.log('');
console.log(
  'v064-O2.4 — progress на карточке сделки'
);
console.log(
  '======================================='
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
  'Итог: внутри сделки 1 progress; в списке — progress на своей ЗК.'
);

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

/* ==========================================================
   BACKUPS + WRITE
   ========================================================== */

const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

for (
  const file
  of [
    appPath,
    stylesPath,
  ]
) {
  const backup =
    file +
    '.before-v064-o24-' +
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
  stylesPath,
  S,
  styles
);

console.log('');
console.log(
  'v064-O2.4 применён.'
);
