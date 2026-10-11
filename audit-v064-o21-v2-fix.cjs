const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file =
    path.join(root, rel);

  if (!fs.existsSync(file)) {
    return '';
  }

  return fs
    .readFileSync(
      file,
      'utf8'
    )
    .replace(/\r\n/g, '\n');
}

const app =
  read('frontend/src/App.tsx');

const css =
  read('frontend/src/styles.css');

const marker =
  'PART_V064_O21_V2_DEAL_UPLOAD_VISIBLE_IMMEDIATELY';

const markerIndex =
  app.indexOf(marker);

const onCreatedStart =
  markerIndex >= 0
    ? app.lastIndexOf(
        'onCreated={async () => {',
        markerIndex
      )
    : -1;

const onCreatedEnd =
  onCreatedStart >= 0
    ? app.indexOf(
        '}}',
        onCreatedStart
      )
    : -1;

const onCreatedBlock =
  onCreatedStart >= 0 &&
  onCreatedEnd > onCreatedStart
    ? app.slice(
        onCreatedStart,
        onCreatedEnd
      )
    : '';

const navigateIndex =
  onCreatedBlock.indexOf(
    "navigate('home');"
  );

const reloadIndex =
  onCreatedBlock.indexOf(
    'await reload();'
  );

const checks = [
  [
    markerIndex >= 0,
    'патч установлен'
  ],
  [
    navigateIndex >= 0 &&
    reloadIndex >= 0 &&
    navigateIndex < reloadIndex,
    'home открывается до reload'
  ],
  [
    app.includes(
      'const pendingDealUploads ='
    ),
    'pending upload jobs'
  ],
  [
    app.includes(
      'dealUploadGhostCard'
    ),
    'временная карточка'
  ],
  [
    app.includes(
      'uploadJob.progress'
    ),
    'реальная карточка показывает progress'
  ],
  [
    css.includes(
      '.dealUploadGhostCard'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O2.1 v2 fix'
);
console.log(
  '==========================='
);

let failed = false;

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    failed = true;
  }
}

console.log('');

if (failed) {
  console.log(
    'ИТОГ: есть ошибки.'
  );

  if (
    onCreatedBlock
  ) {
    console.log('');
    console.log(
      'Найденный onCreated:'
    );
    console.log(
      onCreatedBlock
    );
  }

  process.exit(1);
}

console.log(
  'ИТОГ: OK — progress новой сделки виден сразу в списке сделок.'
);
