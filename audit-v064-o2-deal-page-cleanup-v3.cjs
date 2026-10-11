const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file =
    path.join(
      root,
      rel
    );

  if (!fs.existsSync(file)) {
    console.error(
      'FAIL отсутствует: ' +
      file
    );
    process.exit(1);
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

const app =
  read(
    'frontend/src/App.tsx'
  );

const styles =
  read(
    'frontend/src/styles.css'
  );

const checks = [
  [
    app.includes(
      'PART_V064_O2_COMPACT_OVERVIEW'
    ),
    'Параметры сделки'
  ],
  [
    app.includes(
      '<details className="dealWorkspaceCOverviewFold">'
    ),
    'сводка сворачиваемая'
  ],
  [
    app.includes(
      'Редактирование сделки'
    ),
    'редактор сделки'
  ],
  [
    app.includes(
      'Счёт клиенту'
    ),
    'раздел счёта'
  ],
  [
    app.includes(
      'Оплата клиента'
    ),
    'раздел оплаты'
  ],
  [
    app.includes(
      'Документы сделки'
    ),
    'раздел документов'
  ],
  [
    styles.includes(
      '#dealCClient:not(:has(.dealInfoForm))'
    ),
    'дубль клиента скрывается'
  ],
  [
    styles.includes(
      'PART_V064_O2_DEAL_C_CLEANUP'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O2'
);
console.log(
  '===================='
);

let failed = false;

for (
  const [ok, label]
  of checks
) {
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
  'ИТОГ: OK — дубль сводки и клиента убран, рабочие блоки оформлены.'
);
