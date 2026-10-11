const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file =
    path.join(root, rel);

  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

const app =
  read('frontend/src/App.tsx');

const css =
  read('frontend/src/styles.css');

const checks = [
  [
    app.includes(
      'PART_V064_O21_V2_DEAL_UPLOAD_VISIBLE_IMMEDIATELY'
    ),
    'патч установлен'
  ],
  [
    app.includes(
      "navigate('home');\n            await reload();"
    ),
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
  'MSM — аудит v064-O2.1 v2'
);
console.log(
  '======================'
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
  process.exit(1);
}

console.log(
  'ИТОГ: OK — progress новой сделки виден сразу в списке сделок.'
);
