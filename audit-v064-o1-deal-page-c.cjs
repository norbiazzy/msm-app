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

const purchases =
  read(
    'frontend/src/PurchasesBlock.tsx'
  );

const styles =
  read(
    'frontend/src/styles.css'
  );

const dealStart =
  app.indexOf(
    'function DealDetail('
  );

const dealEnd =
  app.indexOf(
    '\nfunction InvoiceBlock(',
    dealStart
  );

const deal =
  app.slice(
    dealStart,
    dealEnd
  );

const checks = [
  [
    deal.includes(
      'PART_V064_O1_DEAL_WORKSPACE_C'
    ),
    'вариант C'
  ],
  [
    deal.includes(
      'dealWorkspaceCSidebar'
    ),
    'левая карточка'
  ],
  [
    deal.includes(
      'Сейчас требует внимания'
    ),
    'требует внимания'
  ],
  [
    deal.includes(
      'Получено от клиента'
    ),
    'финансы без маржи'
  ],
  [
    deal.includes(
      'id="dealCIncoming"'
    ),
    'якорь входящих счетов'
  ],
  [
    deal.includes(
      'id="dealCDocuments"'
    ),
    'якорь документов'
  ],
  [
    deal.includes(
      'Лента сделки'
    ),
    'лента сделки'
  ],
  [
    purchases.includes(
      'Входящие счета'
    ),
    'закупка переименована'
  ],
  [
    !purchases.includes(
      '<span>\n            Закупка\n          </span>'
    ),
    'старый заголовок закупки убран'
  ],
  [
    styles.includes(
      'PART_V064_O1_DEAL_WORKSPACE_C'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O1'
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
  'ИТОГ: OK — страница сделки переведена на вариант C.'
);
